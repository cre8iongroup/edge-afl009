'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import type { Submission } from './types';

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;

export async function sendCustomSignInLink(email: string) {
  if (!auth) {
    throw new Error('Firebase Admin SDK is not configured.');
  }

  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/finish-signin`,
    handleCodeInApp: true,
  };

  try {
    // This will generate the link, but we are not sending it via email for now.
    const link = await auth.generateSignInWithEmailLink(email, actionCodeSettings);
    console.log(`Sign-in link for ${email}: ${link}`); // Log for debugging
    // In a real scenario, you would send this link.
    // For now, we simulate success.
    return { success: true, link }; // Returning link for potential manual use in dev
  } catch (error) {
    console.error('Error generating sign-in link:', error);
    return { success: false, error: 'Could not generate sign-in link.' };
  }
}

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
    console.log(`Simulating status update email to ${recipientEmail} for submission "${submission.title}" to status ${submission.status}`);
    // Simulate success
    return { success: true };
}
