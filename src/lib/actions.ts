'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Submission } from './types';

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;

export async function sendCustomSignInLink(email: string) {
  if (!auth) {
    throw new Error('Firebase Admin SDK not initialized.');
  }

  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/finish-signin`,
    handleCodeInApp: true,
  };

  try {
    // This functionality is temporarily disabled until email configuration is complete.
    // In a real scenario, you would generate a link and send it.
    console.log(`[Action] Would send sign-in link to ${email}`);
    // const link = await auth.generateSignInWithEmailLink(email, actionCodeSettings);
    // console.log(`[Action] Generated Link: ${link}`);
    
    // For now, we'll simulate success without sending an email.
    // The user will need to manually navigate to the finish-signin page if testing.
    return { success: true };

  } catch (error: any) {
    console.error('Error generating sign-in link:', error);
    return { success: false, error: 'Could not generate sign-in link.' };
  }
}

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
    // This functionality is temporarily disabled.
    console.log(`[Action] Would send status update to ${recipientEmail} for submission "${submission.title}"`);
}
