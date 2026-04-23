/**
 * Migration: Reset all documents with status 'phase_1_revision' → 'phase_1'
 * Run: node scripts/migrate-phase-revision.mjs
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON,
 *           OR gcloud ADC configured via `gcloud auth application-default login`
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'studio-244954263-1293f';

// Try service account from env, fall back to ADC
let appOptions = { projectId: PROJECT_ID };
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (sa.type === 'service_account') {
      appOptions = { credential: cert(sa), projectId: PROJECT_ID };
    }
  } catch {
    console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY — falling back to ADC');
  }
}

if (getApps().length === 0) {
  initializeApp(appOptions);
}

const db = getFirestore();

async function migrate() {
  console.log('🔍 Querying for documents with status: phase_1_revision …');

  const snapshot = await db
    .collection('submissions')
    .where('status', '==', 'phase_1_revision')
    .get();

  if (snapshot.empty) {
    console.log('✅ No documents found with status: phase_1_revision. Nothing to migrate.');
    return;
  }

  console.log(`📋 Found ${snapshot.size} document(s) to migrate.`);

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    console.log(`  → Resetting ${doc.id} ("${doc.data().title ?? 'untitled'}")`);
    batch.update(doc.ref, { status: 'phase_1' });
  });

  await batch.commit();
  console.log(`✅ Migration complete. ${snapshot.size} document(s) reset to phase_1.`);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
