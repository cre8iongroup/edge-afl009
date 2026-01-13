'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import type { Submission } from './types';
import { render } from 'react-email';
import { sendEmail } from './email';
import SignInEmail from '@/emails/SignInEmail';
import StatusUpdateEmail from '@/emails/StatusUpdateEmail';

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;
const fromEmail = process.env.SMTP_FROM_EMAIL;

export async function sendCustomSignInLink(email: string) {
  if (!auth || !fromEmail) {
    throw new Error('Firebase Admin SDK or From Email is not configured.');
  }

  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/finish-signin`,
    handleCodeInApp: true,
  };

  try {
    const link = await auth.generateSignInWithEmailLink(email, actionCodeSettings);
    
    const emailHtml = render(SignInEmail({ url: link }));

    await sendEmail({
      to: email,
      subject: 'Sign in to ALPFA 2026 Convention Portal',
      html: emailHtml,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending sign-in link:', error);
    // Let the client know something went wrong without exposing details
    return { success: false, error: 'Could not send sign-in link.' };
  }
}

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
    if (!fromEmail) {
        throw new Error('From Email is not configured.');
    }
    
    const emailHtml = render(StatusUpdateEmail({ submission }));

    try {
        await sendEmail({
            to: recipientEmail,
            subject: `Update on your ALPFA submission: "${submission.title}"`,
            html: emailHtml,
        });
        return { success: true };
    } catch (error) {
        console.error(`Failed to send status update email for submission ${submission.id}:`, error);
        return { success: false, error: 'Could not send notification email.' };
    }
}