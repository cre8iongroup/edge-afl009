import { NextRequest, NextResponse } from 'next/server';
import { getXeroClient, storeTokens } from '@/lib/xero';

/**
 * GET /api/xero/callback
 * Handles the redirect from Xero after the user authorizes the app.
 * Exchanges the authorization code for access + refresh tokens and stores
 * them in Firestore at xero_config/tokens.
 *
 * Tenant ID is read from the XERO_TENANT_ID environment variable (set in
 * Firebase secrets) rather than being discovered dynamically via updateTenants().
 */
export async function GET(request: NextRequest) {
  const xero = getXeroClient();
  const url = request.url;

  try {
    const tokenSet = await xero.apiCallback(url);
    const tenantId = process.env.XERO_TENANT_ID;

    await storeTokens(tokenSet, tenantId);

    console.log('✅ Xero tokens stored successfully');

    return NextResponse.json({
      success: true,
      tenantId,
      message: 'Xero connected successfully. Tokens stored in Firestore.',
    });
  } catch (error) {
    console.error('Xero OAuth error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
