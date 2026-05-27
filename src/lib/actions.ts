'use server';

import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';
import type { Submission } from './types';
import { sendEmail } from './email';
import { formatPrice } from '@/lib/av-packages';

if (!adminApp) {
  console.warn("Firebase Admin SDK is not initialized. Server-side actions may fail.");
}

const auth = adminApp ? getAuth(adminApp) : null;

// Internal notification recipients (read from env)
const INTERNAL_SUBMISSIONS_EMAIL = process.env.INTERNAL_SUBMISSIONS_EMAIL;
const INTERNAL_NOTIFY_EMAIL = process.env.INTERNAL_NOTIFY_EMAIL;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ─── POC helper ──────────────────────────────────────────────────────────────

function getPocInfo(submission: Submission) {
  const isWorkshop = submission.sessionType === 'workshop';
  return {
    name: isWorkshop
      ? (submission.presenterPocName ?? submission.pocName ?? '')
      : (submission.pocName ?? ''),
    email: isWorkshop
      ? (submission.presenterPocEmail ?? submission.pocEmail ?? '')
      : (submission.pocEmail ?? ''),
  };
}

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
  const emailBody = `<p>Hello,</p><p>The status of your submission, "${submission.title}," has been updated to: <strong>${statusLabel}</strong>.</p><p>You can view your submission dashboard for more details.</p><p><a href="https://alpfa26.cre8ionedge.com/dashboard">Go to your dashboard &rarr;</a></p>`;
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
    <p>Hi there,</p>
    <p>Thank you for submitting <strong>${title}</strong> for the ALPFA 2026 National Convention. Our team will review your submission and you'll hear back once it's been approved.</p>
    <p>If you have any questions in the meantime, reach out to us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a>.</p>
    <p><a href="https://alpfa26.cre8ionedge.com/dashboard">Go to your dashboard &rarr;</a></p>
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
  const partnerSubject = "Your ALPFA session is approved! Here's what to do next \u2726";
  const partnerBody = `
    <p>Hi there,</p>
    <p>Great news — your session has been approved by the ALPFA programs team! We're so excited to have you at the 2026 Convention.</p>
    <p>Here's what's next: you'll need to complete two things by <strong>June 26th</strong>:</p>
    <ul>
      <li>Add your presenter information</li>
      <li>Select your AV package and complete payment</li>
    </ul>
    <p>Both are waiting for you in your dashboard. The sooner you complete them, the better your room placement options — AV pricing also increases after May 15, so it's worth jumping on it!</p>
    <p><a href="https://alpfa26.cre8ionedge.com/dashboard">Go to your dashboard &rarr;</a></p>
    <p>Need help or have a question? Reply directly to this email or reach us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a> — we're always happy to help.</p>
    <p>— The cre8ion Team</p>
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

// ─── Payment Confirmed (PN-03) ────────────────────────────────────────────────

export async function sendPaymentConfirmedEmail(submission: Submission) {
  const poc = getPocInfo(submission);
  const adminUrl = `https://alpfa26.cre8ionedge.com/submit/${submission.sessionType}/${submission.id}?from=all-sessions`;

  // Email A — partner confirmation
  const partnerSubject = 'Payment received — you\u2019re all set! \u2726';
  const partnerBody = `
    <p>Hi there,</p>
    <p>Your AV order for <strong>${submission.title}</strong> has been confirmed and everything looks great.</p>
    <p>Here's where things stand: as long as your presenter information is complete, you're done with the hard part! Our team will finalize room assignments between June 20 and June 30, and you'll receive your full session details — date, time, and room — by July 1.</p>
    <p>Sit tight, and we'll be in touch soon.</p>
    <p><a href="https://alpfa26.cre8ionedge.com/dashboard">Go to your dashboard &rarr;</a></p>
    <p>Need help or have a question? Reply directly to this email or reach us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a> — we're always happy to help.</p>
    <p>— The cre8ion Team</p>
  `;

  // Email B — internal alert
  const internalSubject = `AV order confirmed \u2014 ${submission.title}`;
  const orderTotal = submission.avSelection?.orderTotal
    ? formatPrice(submission.avSelection.orderTotal)
    : '\u2014';
  const paymentRef = submission.paymentReference ?? submission.invoiceNumber ?? '\u2014';
  const internalBody = `
    <p>An AV order has been confirmed.</p>
    <ul>
      <li><strong>Session:</strong> ${submission.title}</li>
      <li><strong>Partner:</strong> ${poc.name || '\u2014'}</li>
      <li><strong>Email:</strong> ${poc.email || '\u2014'}</li>
      <li><strong>Payment method:</strong> ${submission.paymentMethod ?? '\u2014'}</li>
      <li><strong>Payment reference:</strong> ${paymentRef}</li>
      <li><strong>Order total:</strong> ${orderTotal}</li>
    </ul>
    <p><a href="${adminUrl}">View session in admin panel &rarr;</a></p>
  `;

  const sends: Promise<{ success: boolean; error?: string }>[] = [];
  if (poc.email) sends.push(sendEmail(poc.email, partnerSubject, partnerBody));
  if (INTERNAL_NOTIFY_EMAIL) sends.push(sendEmail(INTERNAL_NOTIFY_EMAIL, internalSubject, internalBody));

  try {
    await Promise.all(sends);
    console.log(`sendPaymentConfirmedEmail: emails sent for "${submission.title}"`);
    return { success: true };
  } catch (error) {
    console.error('sendPaymentConfirmedEmail: error', error);
    return { success: false, error: 'Could not send payment confirmation emails.' };
  }
}

// ─── Room Assigned (PN-04) ────────────────────────────────────────────────────

export async function sendRoomAssignedEmail(submission: Submission) {
  const poc = getPocInfo(submission);
  if (!poc.email) {
    console.warn(`sendRoomAssignedEmail: no POC email for "${submission.title}" — skipping`);
    return { success: false, error: 'No POC email found.' };
  }

  const partnerSubject = 'Your ALPFA session room has been assigned \u2014 here are your details! \u2726';
  const partnerBody = `
    <p>Hi there,</p>
    <p>The moment you've been waiting for has arrived — your room has been assigned and your session is officially locked in. Here's everything you need:</p>
    <p><strong>${submission.title}</strong></p>
    <p style="border-left: 3px solid #cccccc; padding-left: 12px; margin: 16px 0; color: #333333; font-size: 14px;">${submission.roomAssignment ?? 'Details coming soon'}</p>
    <p>You're all set! Your full session details are also saved in your dashboard any time you want to reference them. We cannot wait to see you at the ALPFA 2026 Convention.</p>
    <p><a href="https://alpfa26.cre8ionedge.com/dashboard">Go to your dashboard &rarr;</a></p>
    <p>Need help or have a question? Reply directly to this email or reach us at <a href="mailto:connect@cre8iongroup.com">connect@cre8iongroup.com</a> — we're always happy to help.</p>
    <p>— The cre8ion Team</p>
  `;

  try {
    await sendEmail(poc.email, partnerSubject, partnerBody);
    console.log(`sendRoomAssignedEmail: sent to ${poc.email} for "${submission.title}"`);
    return { success: true };
  } catch (error) {
    console.error('sendRoomAssignedEmail: error', error);
    return { success: false, error: 'Could not send room assignment email.' };
  }
}

// ─── Presenter Update (IN-02) ─────────────────────────────────────────────────

export async function sendPresenterUpdateEmail(
  submission: Submission,
  action: 'added' | 'removed'
) {
  if (!INTERNAL_NOTIFY_EMAIL) return { success: true };

  const poc = getPocInfo(submission);
  const adminUrl = `https://alpfa26.cre8ionedge.com/submit/${submission.sessionType}/${submission.id}?from=all-sessions`;
  const subject = `Presenter ${action} \u2014 ${submission.title}`;
  const body = `
    <p>A presenter has been ${action}.</p>
    <ul>
      <li><strong>Session:</strong> ${submission.title}</li>
      <li><strong>Action:</strong> Presenter ${action}</li>
      <li><strong>POC Email:</strong> ${poc.email || '\u2014'}</li>
      <li><strong>Current presenter count:</strong> ${submission.presenters?.length ?? 0}</li>
    </ul>
    <p><a href="${adminUrl}">View session in admin panel &rarr;</a></p>
  `;

  try {
    await sendEmail(INTERNAL_NOTIFY_EMAIL, subject, body);
    console.log(`sendPresenterUpdateEmail: sent for "${submission.title}" — ${action}`);
    return { success: true };
  } catch (error) {
    console.error('sendPresenterUpdateEmail: error', error);
    return { success: false, error: 'Could not send presenter update email.' };
  }
}

// ─── Zoho Campaigns Subscribe ─────────────────────────────────────────────────

export async function addToZohoCampaigns(params: {
  email: string;
  firstName?: string;
  company?: string;
}) {
  const { email, firstName, company } = params;

  if (!email) {
    console.warn('addToZohoCampaigns: email is required — skipping');
    return { success: false };
  }

  const listkey = process.env.ZOHO_CAMPAIGNS_LIST_KEY;
  if (!listkey) {
    console.warn('addToZohoCampaigns: ZOHO_CAMPAIGNS_LIST_KEY is not set — skipping');
    return { success: false };
  }

  const contactinfo = JSON.stringify({
    'Contact Email': email,
    'First Name': firstName ?? '',
    'Company': company ?? '',
  });

  const url = new URL('https://campaigns.zoho.com/api/v1.1/json/listsubscribe');
  url.searchParams.set('resfmt', 'JSON');
  url.searchParams.set('listkey', listkey);
  url.searchParams.set('contactinfo', contactinfo);

  try {
    const res = await fetch(url.toString(), { method: 'POST' });
    console.log(`addToZohoCampaigns: subscribed ${email} — HTTP ${res.status}`);
    return { success: true };
  } catch (error) {
    console.warn('addToZohoCampaigns failed:', error);
    return { success: false };
  }
}
