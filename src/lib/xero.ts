import { XeroClient } from 'xero-node';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';

const XERO_TOKEN_DOC = 'xero_config/tokens';

export function getXeroClient() {
  return new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.invoices',
      'accounting.contacts',
      'accounting.payments',
      'offline_access',
    ],
  });
}

export async function getStoredTokens() {
  const db = getFirestore(adminApp);
  const doc = await db.doc(XERO_TOKEN_DOC).get();
  return doc.exists ? doc.data() : null;
}

export async function storeTokens(tokenSet: object, tenantId?: string) {
  const db = getFirestore(adminApp);
  await db.doc(XERO_TOKEN_DOC).set(
    {
      ...tokenSet,
      tenantId: tenantId ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getAuthenticatedXeroClient() {
  const xero = getXeroClient();
  const tokens = await getStoredTokens();
  if (!tokens) throw new Error('Xero not connected — run OAuth flow first');
  await xero.setTokenSet(tokens as any);
  // Refresh if expired
  const validTokens = await xero.refreshWithRefreshToken(
    process.env.XERO_CLIENT_ID!,
    process.env.XERO_CLIENT_SECRET!,
    (tokens as any).refresh_token
  );
  await storeTokens(validTokens);
  const tenantId = (tokens as any).tenantId ?? process.env.XERO_TENANT_ID;
  if (!tenantId) throw new Error('Xero tenant ID not found — check XERO_TENANT_ID secret or re-run OAuth flow');
  return { xero, tenantId: tenantId as string };
}
