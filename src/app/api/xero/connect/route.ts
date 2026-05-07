import { NextResponse } from 'next/server';
import { getXeroClient } from '@/lib/xero';

/**
 * GET /api/xero/connect
 * Initiates the Xero OAuth flow. Visit this URL in a browser (logged in as
 * an admin) to start the authorization. Xero will redirect to /api/xero/callback.
 */
export async function GET() {
  const xero = getXeroClient();
  const consentUrl = await xero.buildConsentUrl();
  return NextResponse.redirect(consentUrl);
}
