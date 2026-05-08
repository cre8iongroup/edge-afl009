/**
 * One-time reset: "Alex's Test Reception DNP" → clean Phase 2 state
 * Sets status: phase_2, avSelected: false, paymentComplete: false, deletes avSelection.
 *
 * Uses Firestore REST API authenticated via email/password sign-in.
 * Run: node scripts/reset-test-reception.mjs
 */

const PROJECT_ID  = 'studio-244954263-1293f';
const API_KEY     = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';

// Document ID confirmed from server logs
const DOC_ID = 'Ozr3yogWf39blK2rZhlz';
const DOC_NAME = `projects/${PROJECT_ID}/databases/(default)/documents/submissions/${DOC_ID}`;

// ── Step 1: Sign in ───────────────────────────────────────────────────────────
async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Sign-in failed: ${JSON.stringify(data)}`);
  console.log(`✅ Signed in as ${ADMIN_EMAIL}`);
  return data.idToken;
}

// ── Step 2: Patch the document ────────────────────────────────────────────────
async function resetDoc(idToken) {
  // updateMask.fieldPaths lists every field we are writing.
  // Including avSelection in the mask with a nullValue deletes/nullifies it.
  const url =
    `https://firestore.googleapis.com/v1/${DOC_NAME}` +
    `?updateMask.fieldPaths=status` +
    `&updateMask.fieldPaths=avSelected` +
    `&updateMask.fieldPaths=paymentComplete` +
    `&updateMask.fieldPaths=avSelection` +
    `&updateMask.fieldPaths=paymentMethod` +
    `&updateMask.fieldPaths=paymentStatus` +
    `&updateMask.fieldPaths=paymentReference` +
    `&updateMask.fieldPaths=orderFinalizedAt` +
    `&updateMask.fieldPaths=invoiceId` +
    `&updateMask.fieldPaths=invoiceNumber` +
    `&updateMask.fieldPaths=paymentMarkedBy` +
    `&updateMask.fieldPaths=paymentMarkedAt`;

  const body = {
    fields: {
      status:          { stringValue: 'phase_2' },
      avSelected:      { booleanValue: false },
      paymentComplete: { booleanValue: false },
      avSelection:     { nullValue: null },
      paymentMethod:     { nullValue: null },
      paymentStatus:     { nullValue: null },
      paymentReference:  { nullValue: null },
      orderFinalizedAt:  { nullValue: null },
      invoiceId:         { nullValue: null },
      invoiceNumber:     { nullValue: null },
      paymentMarkedBy:   { nullValue: null },
      paymentMarkedAt:   { nullValue: null },
    },
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed: ${err}`);
  }

  const updated = await res.json();
  console.log(`✅ Document reset: ${DOC_ID}`);
  console.log(`   status:          ${updated.fields?.status?.stringValue}`);
  console.log(`   avSelected:      ${updated.fields?.avSelected?.booleanValue}`);
  console.log(`   paymentComplete: ${updated.fields?.paymentComplete?.booleanValue}`);
  console.log(`   avSelection:     ${JSON.stringify(updated.fields?.avSelection)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('🔄 Resetting "Alex\'s Test Reception DNP" to Phase 2 …');
  const idToken = await signIn();
  await resetDoc(idToken);
  console.log('\n✅ Done. Document is now in a clean Phase 2 state.');
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
