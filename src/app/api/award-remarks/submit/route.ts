// POST /api/award-remarks/submit
// Validates form data, appends a row to Google Sheets, and sends confirmation
// + producer notification emails via server actions.

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import {
  sendAwardRemarksConfirmation,
  sendAwardRemarksProducerNotification,
} from '@/lib/actions';

const SHEET_ID = '1gyOOhjwoV8FqTnBw6MPNKlA4RfDIwSfhMgpq7AGTjqE';
const TAB_NAME = 'Award Remarks';

console.log('GOOGLE_SHEETS_KEY present:', !!process.env.GOOGLE_SHEETS_KEY);

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      session,
      remarks,
    } = body as Record<string, string>;

    // ── Validation ────────────────────────────────────────────────────────────
    const requiredFields: [string, string | undefined][] = [
      ['First Name', firstName],
      ['Last Name', lastName],
      ['Email', email],
      ['Phone Number', phone],
      ['Company / ALPFA Chapter', company],
      ['Session', session],
      ['Remarks', remarks],
    ];

    for (const [label, value] of requiredFields) {
      if (!value || !value.trim()) {
        return NextResponse.json(
          { error: `${label} is required.` },
          { status: 400 },
        );
      }
    }

    const wc = wordCount(remarks);
    if (wc > 280) {
      return NextResponse.json(
        { error: `Remarks exceed the 280-word limit (${wc} words submitted).` },
        { status: 400 },
      );
    }

    // ── Google Sheets append ──────────────────────────────────────────────────
    const timestamp = new Date().toISOString();

    if (!process.env.GOOGLE_SHEETS_KEY) {
      console.error('GOOGLE_SHEETS_KEY is not configured — skipping Sheets write.');
    } else {
      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_KEY!);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A:I`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              timestamp,
              firstName.trim(),
              lastName.trim(),
              email.trim(),
              phone.trim(),
              company.trim(),
              session,
              remarks.trim(),
              wc,
            ],
          ],
        },
      });

      console.log(`Award remarks appended to Google Sheets for ${email.trim()}`);
    }

    // ── Emails ────────────────────────────────────────────────────────────────
    const emailParams = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      session,
      remarks: remarks.trim(),
    };

    await Promise.allSettled([
      sendAwardRemarksConfirmation(emailParams),
      sendAwardRemarksProducerNotification(emailParams),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Award remarks submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
