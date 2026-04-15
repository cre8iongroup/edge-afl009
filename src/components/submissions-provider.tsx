'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { Submission } from '@/lib/types';
import { collection, addDoc, updateDoc, doc, query, where, Timestamp, CollectionReference } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';

interface SubmissionsContextType {
  submissions: Submission[];
  addSubmission: (submission: Omit<Submission, 'id' | 'createdAt' | 'status'>) => void;
  updateSubmission: (submission: Submission) => void;
  getSubmission: (id: string) => Submission | undefined;
  loading: boolean;
}

const SubmissionsContext = createContext<SubmissionsContextType | undefined>(undefined);

export function SubmissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { profile } = useUserProfile(user?.uid);
  const firestore = useFirestore();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !profile) return null;
    
    const submissionsCol = collection(firestore, 'submissions') as CollectionReference<Submission>;
    
    if (['admin', 'internal'].includes(profile.role)) {
      return submissionsCol;
    } else {
      return query(submissionsCol, where('userId', '==', user.uid));
    }
  }, [firestore, user, profile]);

  const { data: rawSubmissions, isLoading } = useCollection<Submission>(submissionsQuery);

  // Transform Firestore Timestamps to JS Dates
  const submissions = useMemo(() => {
    if (!rawSubmissions) return [] as Submission[];
    
    return rawSubmissions.map(sub => {
        const transformed = { ...sub };
        
        // Handle createdAt
        if (transformed.createdAt && (transformed.createdAt as any).toDate) {
            transformed.createdAt = (transformed.createdAt as any).toDate();
        } else if (typeof transformed.createdAt === 'string' || typeof transformed.createdAt === 'number') {
            transformed.createdAt = new Date(transformed.createdAt);
        }
        
        // Handle preferredDate
        if (transformed.preferredDate && (transformed.preferredDate as any).toDate) {
            transformed.preferredDate = (transformed.preferredDate as any).toDate();
        } else if (typeof transformed.preferredDate === 'string' || typeof transformed.preferredDate === 'number') {
            transformed.preferredDate = new Date(transformed.preferredDate);
        }

        return transformed as Submission;
    });
  }, [rawSubmissions]);

  const addSubmission = async (submissionData: Omit<Submission, 'id' | 'createdAt' | 'status'>) => {
    if (!firestore || !user) return;

    const newSubmission = {
      ...submissionData,
      userId: user.uid, // Ensure userId is set
      createdAt: Timestamp.now(),
      status: 'Awaiting Approval',
    };

    try {
      await addDoc(collection(firestore, 'submissions'), newSubmission);
    } catch (error) {
      console.error("Failed to add submission to Firestore", error);
      throw error;
    }
  };

  const updateSubmission = async (updatedSubmission: Submission) => {
    if (!firestore || !updatedSubmission.id) return;

    const { id, ...data } = updatedSubmission;
    
    // Ensure we don't accidentally write a Date back as a Date if Firestore expects Timestamp, 
    // but Firestore usually handles JS Dates fine. However, let's be safe with createdAt if it's already a Date.
    const submissionToUpdate = {
        ...data,
        // If it's already a Date from our transformation, Firestore will convert it to Timestamp
        createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt
    };

    try {
      const docRef = doc(firestore, 'submissions', id);
      await updateDoc(docRef, submissionToUpdate);
    } catch (error) {
      console.error("Failed to update submission in Firestore", error);
      throw error;
    }
  };

  const getSubmission = (id: string) => {
    return submissions.find(sub => sub.id === id);
  };

  return (
    <SubmissionsContext.Provider value={{ submissions, addSubmission, updateSubmission, getSubmission, loading: isLoading }}>
      {children}
    </SubmissionsContext.Provider>
  );
}

export function useSubmissions() {
  const context = useContext(SubmissionsContext);
  if (context === undefined) {
    throw new Error('useSubmissions must be used within a SubmissionsProvider');
  }
  return context;
}
