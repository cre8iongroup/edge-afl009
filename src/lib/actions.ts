'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import type { Submission } from './types';
import { sendEmail } from './email'; // Import the sendEmail function

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;

export async function sendCustomSignInLink(email: string) {
  if (!auth) {
    // In a real app, you'd want to handle this more gracefully.
    // For this simulation, we will proceed as if the link is generated.
    console.error('Firebase Admin SDK is not configured. Simulating link generation.');
  }

  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/finish-signin`,
    handleCodeInApp: true,
  };

  try {
    // We simulate the link generation if auth is not available.
    const link = auth 
      ? await auth.generateSignInWithEmailLink(email, actionCodeSettings)
      : `#mock-link-for-${encodeURIComponent(email)}`;
    
    console.log(`Generated sign-in link for ${email}: ${link}`);

    // Send the sign-in link via email
    const emailSubject = "Your sign-in link for the ALPFA Convention Portal";
    const emailBody = `<p>Click the link below to sign in to your account:</p><p><a href="${link}">Sign In</a></p><p>If you did not request this email, you can safely ignore it.</p>`;
    const emailResult = await sendEmail(email, emailSubject, emailBody);

    if (emailResult.success) {
      console.log(`Successfully sent sign-in email to ${email}.`);
      return { success: true, link };
    } else {
      console.error('Error sending sign-in email:', emailResult.error);
      return { success: false, error: 'Could not send sign-in email.' };
    }
  } catch (error) {
    console.error('Error in sendCustomSignInLink:', error);
    const errorMessage = error instanceof Error ? error.message : 'Could not generate sign-in link.';
    return { success: false, error: errorMessage };
  }
}

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
    const phaseLabels: Record<Submission['status'], string> = {
        phase_1: 'Awaiting Approval',
        phase_1_revision: 'Revision Requested — Please review the feedback and update your submission',
        phase_2: 'Needs Information',
        phase_3: 'Submitted - Awaiting Room Assignment',
        phase_4: 'Session Confirmed',
    };
    const statusLabel = phaseLabels[submission.status] ?? submission.status;

    console.log(`Preparing status update email to ${recipientEmail} for submission "${submission.title}" — status: ${statusLabel}`);

    const emailSubject = `Update on your ALPFA submission: ${submission.title}`;
    const emailBody = `<p>Hello,</p><p>The status of your submission, "${submission.title}," has been updated to: <strong>${statusLabel}</strong>.</p><p>You can view your submission dashboard for more details.</p>`;
    const emailResult = await sendEmail(recipientEmail, emailSubject, emailBody);

    if (emailResult.success) {
        console.log(`Successfully sent status update email to ${recipientEmail}.`);
        return { success: true };
    } else {
        console.error('Error sending status update email:', emailResult.error);
        return { success: false, error: 'Could not send status update email.' };
    }
}
