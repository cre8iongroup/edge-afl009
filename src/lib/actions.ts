'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import type { Submission } from './types';
import { sendEmail } from './email';

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;

// Internal notification recipients (read from env)
const INTERNAL_SUBMISSIONS_EMAIL = process.env.INTERNAL_SUBMISSIONS_EMAIL;
const INTERNAL_NOTIFY_EMAIL = process.env.INTERNAL_NOTIFY_EMAIL;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ─── Sign-In Link ─────────────────────────────────────────────────────────────

export async function sendCustomSignInLink(email: string) {
  if (!auth) {
    console.error('Firebase Admin SDK is not configured. Simulating link generation.');
  }

  const actionCodeSettings = {
    url: `${baseUrl}/finish-signin`,
    handleCodeInApp: true,
  };

  try {
    const link = auth
      ? await auth.generateSignInWithEmailLink(email, actionCodeSettings)
      : `#mock-link-for-${encodeURIComponent(email)}`;

    console.log(`Generated sign-in link for ${email}: ${link}`);

    const emailSubject = "Your sign-in link for the ALPFA Convention Portal";
    const emailBody = `
      <p>Hello!</p>
      <p>We received a request to sign in to the ALPFA 2026 Convention Portal. If you want to sign in with your <strong>${email}</strong> account, click the link below:</p>
      <p><a href="${link}">Sign In to the Portal</a></p>
      <p>If you did not request this link, you can safely ignore this email.</p>
      <p>Thanks,<br>the cre8ion Edge team</p>
      <p>Need support? Simply reply to this message!</p>
    `;
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

// ─── Status Update (generic — fires for every phase change) ──────────────────

export async function sendStatusUpdateEmail(submission: Submission, recipientEmail: string) {
  const phaseLabels: Record<Submission['status'], string> = {
    phase_1: 'Awaiting Approval',
    phase_2: 'Needs Information',
    phase_3: 'Submitted - Awaiting Room Assignment',
    phase_4: 'Session Confirmed',
  };
  const statusLabel = phaseLabels[submission.status] ?? submission.status;

  console.log(`Preparing status update email to ${recipientEmail} for "${submission.title}" — status: ${statusLabel}`);

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

// ─── New Submission (fires when partner first submits any session type) ───────

export async function sendSessionSubmittedEmail(params: {
  title: string;
  sessionType: string;
  partnerEmail: string;
}) {
  const { title, sessionType, partnerEmail } = params;
  const submittedAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Email A — partner confirmation
  const partnerSubject = 'We received your session submission — ALPFA 2026';
  const partnerBody = `
    <p>Hi ${partnerEmail},</p>
    <p>Thank you for submitting your session for the ALPFA 2026 National Convention. Our team will review your submission and you'll hear back once it's been approved.</p>
    <p>If you have any questions in the meantime, reach out to us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a>.</p>
    <p>— The cre8ion Edge Team</p>
  `;

  // Email B — internal alert to both submissions@ and connect@
  const internalSubject = `New session submission: ${title}`;
  const internalBody = `
    <p>A new session has been submitted.</p>
    <ul>
      <li><strong>Title:</strong> ${title}</li>
      <li><strong>Type:</strong> ${sessionType}</li>
      <li><strong>Submitted by:</strong> ${partnerEmail}</li>
      <li><strong>Submitted at:</strong> ${submittedAt} ET</li>
    </ul>
    <p>Log in to review: <a href="${baseUrl}/all-sessions">${baseUrl}/all-sessions</a></p>
  `;

  const sends: Promise<{ success: boolean; error?: string }>[] = [
    sendEmail(partnerEmail, partnerSubject, partnerBody),
  ];
  if (INTERNAL_SUBMISSIONS_EMAIL) {
    sends.push(sendEmail(INTERNAL_SUBMISSIONS_EMAIL, internalSubject, internalBody));
  }
  if (INTERNAL_NOTIFY_EMAIL) {
    sends.push(sendEmail(INTERNAL_NOTIFY_EMAIL, internalSubject, internalBody));
  }

  try {
    await Promise.all(sends);
    console.log(`sendSessionSubmittedEmail: all emails sent for "${title}"`);
    return { success: true };
  } catch (error) {
    console.error('sendSessionSubmittedEmail: error sending emails', error);
    return { success: false, error: 'Could not send submission emails.' };
  }
}

// ─── Session Approved (fires additionally when status moves to phase_2) ───────

export async function sendSessionApprovedEmail(submission: Submission, partnerEmail: string) {
  // Email A — partner notification
  const partnerSubject = 'Your session has been approved — action required';
  const partnerBody = `
    <p>Hi ${partnerEmail},</p>
    <p>Great news — your session submission has been approved!</p>
    <p>Log in to complete the next steps: add your presenter information and select your AV package. The AV package selection opens April 29.</p>
    <p><a href="${baseUrl}/dashboard">Log in to the Portal</a></p>
    <p>Questions? Contact us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a>.</p>
    <p>— The cre8ion Edge Team</p>
  `;

  // Email B — internal notify only (not submissions@)
  const internalSubject = `Session approved: ${submission.title}`;
  const internalBody = `
    <p>A session has been approved and moved to Phase 2.</p>
    <ul>
      <li><strong>Title:</strong> ${submission.title}</li>
      <li><strong>Partner:</strong> ${partnerEmail}</li>
    </ul>
    <p>Log in to view: <a href="${baseUrl}/all-sessions">${baseUrl}/all-sessions</a></p>
  `;

  const sends: Promise<{ success: boolean; error?: string }>[] = [
    sendEmail(partnerEmail, partnerSubject, partnerBody),
  ];
  if (INTERNAL_NOTIFY_EMAIL) {
    sends.push(sendEmail(INTERNAL_NOTIFY_EMAIL, internalSubject, internalBody));
  }

  try {
    await Promise.all(sends);
    console.log(`sendSessionApprovedEmail: all emails sent for "${submission.title}"`);
    return { success: true };
  } catch (error) {
    console.error('sendSessionApprovedEmail: error sending emails', error);
    return { success: false, error: 'Could not send approval emails.' };
  }
}
