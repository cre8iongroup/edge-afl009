'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendEmail } from './email';
import SignInEmail from '@/emails/SignInEmail';
import StatusUpdateEmail from '@/emails/StatusUpdateEmail';
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
    const link = await auth.generateSignInWithEmailLink(email, actionCodeSettings);

    await sendEmail({
      to: email,
      subject: 'Sign in to ALPFA 2026 Convention Portal',
      react: SignInEmail({ signInLink: link }),
      replyTo: 'edge@cre8iongroup.com'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending custom sign-in link:', error);
    return { success: false, error: 'Could not send sign-in link. Please try again later.' };
  }
}

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
    await sendEmail({
        to: recipientEmail,
        subject: `Update on your ALPFA submission: "${submission.title}"`,
        react: StatusUpdateEmail({
            submissionTitle: submission.title,
            newStatus: submission.status,
            submissionType: submission.sessionType,
        }),
        replyTo: 'edge@cre8iongroup.com'
    });
}
