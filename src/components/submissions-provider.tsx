'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Submission } from '@/lib/types';
import { submissions as initialSubmissions } from '@/lib/data';

interface SubmissionsContextType {
  submissions: Submission[];
  addSubmission: (submission: Omit<Submission, 'id' | 'createdAt' | 'status'>) => void;
  updateSubmission: (submission: Submission) => void;
  getSubmission: (id: string) => Submission | undefined;
  loading: boolean;
}

const SubmissionsContext = createContext<SubmissionsContextType | undefined>(undefined);

export function SubmissionsProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedSubmissions = localStorage.getItem('alpfa-submissions');
      if (storedSubmissions) {
        const parsed = JSON.parse(storedSubmissions, (key, value) => {
            if (key === 'createdAt' || key === 'preferredDate') {
                return value ? new Date(value) : undefined;
            }
            return value;
        });
        setSubmissions(parsed);
      } else {
        localStorage.setItem('alpfa-submissions', JSON.stringify(initialSubmissions));
        setSubmissions(initialSubmissions);
      }
    } catch (error) {
        console.error("Failed to parse submissions from localStorage", error);
        setSubmissions(initialSubmissions);
    }
    setLoading(false);
  }, []);

  const persistSubmissions = (updatedSubmissions: Submission[]) => {
    setSubmissions(updatedSubmissions);
    localStorage.setItem('alpfa-submissions', JSON.stringify(updatedSubmissions));
  };

  const addSubmission = (submissionData: Omit<Submission, 'id' | 'createdAt' | 'status'>) => {
    const newSubmission: Submission = {
      ...submissionData,
      id: `sub${Date.now()}`,
      createdAt: new Date(),
      status: 'Awaiting Approval',
    };
    const updatedSubmissions = [...submissions, newSubmission];
    persistSubmissions(updatedSubmissions);
  };

  const updateSubmission = (updatedSubmission: Submission) => {
    const updatedSubmissions = submissions.map(sub =>
      sub.id === updatedSubmission.id ? { ...updatedSubmission } : sub
    );
    persistSubmissions(updatedSubmissions);
  };

  const getSubmission = (id: string) => {
    return submissions.find(sub => sub.id === id);
  };

  return (
    <SubmissionsContext.Provider value={{ submissions, addSubmission, updateSubmission, getSubmission, loading }}>
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
