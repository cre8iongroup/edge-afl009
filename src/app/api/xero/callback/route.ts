import { NextRequest, NextResponse } from 'next/server';
import { getXeroClient, storeTokens } from '@/lib/xero';

/**
 * GET /api/xero/callback
 * Handles the redirect from Xero after the user authorizes the app.
 * Exchanges the authorization code for access + refresh tokens, stores them
 * in Firestore at xero_config/tokens, and returns the Tenant ID.
 *
 * After a successful connection, copy the tenantId from the response JSON
 * and store it in Firebase secrets as XERO_TENANT_ID.
 */
export async function GET(request: NextRequest) {
  const xero = getXeroClient();
  const url = request.url;

  try {
    const tokenSet = await xero.apiCallback(url);
    await xero.updateTenants();

    const tenants = xero.tenants;
    const tenantId = tenants[0]?.tenantId;
    const tenantName = tenants[0]?.tenantName;

    await storeTokens(tokenSet, tenantId);

    console.log('✅ Xero connected successfully');
    console.log('Tenant ID:', tenantId);
    console.log('Tenant Name:', tenantName);

    return NextResponse.json({
      success: true,
      tenantId,
      tenantName,
      message:
        'Xero connected successfully. Copy the tenantId above into your Firebase secrets as XERO_TENANT_ID.',
    });
  } catch (error) {
    console.error('Xero OAuth error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
