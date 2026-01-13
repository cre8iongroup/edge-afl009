import { Resend } from 'resend';
import type { ReactElement } from 'react';

// --- README ---
// This file is pre-configured to use Resend for sending emails.
// To complete the setup:
//
// 1. Sign up for a free account at https://resend.com
// 2. Add and verify your domain (e.g., cre8iongroup.com).
// 3. Create an API Key in the Resend dashboard.
// 4. Open the .env file in your project.
// 5. Add a new line: RESEND_API_KEY='YOUR_API_KEY_HERE'
//    (replace YOUR_API_KEY_HERE with the key from Resend).
//
// That's it! Your app will now send emails through Resend.

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export async function sendEmail({ to, subject, react, replyTo }: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email sending. See src/lib/email.ts for setup instructions.');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'ALPFA 2026 Portal <edge@cre8iongroup.com>',
      to,
      subject,
      react,
      reply_to: replyTo,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email.');
  }
}
