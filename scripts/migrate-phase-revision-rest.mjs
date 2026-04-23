/**
 * Migration: Reset all documents with status 'phase_1_revision' → 'phase_1'
 * Uses Firebase REST API authenticated via email/password sign-in.
 * Run: node scripts/migrate-phase-revision-rest.mjs
 */

const PROJECT_ID = 'studio-244954263-1293f';
const API_KEY = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Step 1: Sign in to get an ID token ────────────────────────────────────────
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

// ── Step 2: Query for documents with status == 'phase_1_revision' ─────────────
async function queryRevisionDocs(idToken) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'phase_1_revision' },
        },
      },
    },
  };
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const results = await res.json();
  // Filter out empty results (runQuery returns [{} ] when no matches)
  return results.filter(r => r.document);
}

// ── Step 3: Patch each document ───────────────────────────────────────────────
async function patchDoc(idToken, docName, title) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=status`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { status: { stringValue: 'phase_1' } } }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to patch ${docName}: ${err}`);
  }
  console.log(`  → Reset "${title}" (${docName.split('/').pop()})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function migrate() {
  console.log('🔍 Starting phase_1_revision migration via REST API …');
  const idToken = await signIn();

  console.log('🔍 Querying for documents with status: phase_1_revision …');
  const results = await queryRevisionDocs(idToken);

  if (results.length === 0) {
    console.log('✅ No documents found with status: phase_1_revision. Nothing to migrate.');
    return;
  }

  console.log(`📋 Found ${results.length} document(s) to migrate:`);
  for (const { document } of results) {
    const title = document.fields?.title?.stringValue ?? 'untitled';
    await patchDoc(idToken, document.name, title);
  }

  console.log(`\n✅ Migration complete. ${results.length} document(s) reset to phase_1.`);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
