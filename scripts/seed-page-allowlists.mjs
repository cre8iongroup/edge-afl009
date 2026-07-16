/**
 * Seeds page_allowlists docs (creates if missing; does not overwrite existing lists).
 *
 * Uses Firebase Admin SDK (bypasses Firestore security rules).
 * Run: node scripts/seed-page-allowlists.mjs
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'studio-244954263-1293f';

const DOCS_TO_SEED = [
  { id: 'ai_notes_status', emails: [] },
  // Verified against Firestore users: alex@cre8iongroup.com (superadmin).
  { id: 'audit', emails: ['alex@cre8iongroup.com'] },
];

// ── Initialize Firebase Admin SDK ─────────────────────────────────────────────

let appOptions = { projectId: PROJECT_ID };

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (sa.type === 'service_account') {
      appOptions = { credential: cert(sa), projectId: PROJECT_ID };
      console.log('✅ Using service account credentials');
    }
  } catch {
    console.error('❌ Could not parse FIREBASE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
  }
} else {
  console.error('❌ Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  console.error('   Ensure it is set in your .env file or exported in your shell.');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp(appOptions);
}

const db = getFirestore();

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🚀 Seeding ${DOCS_TO_SEED.length} doc(s) to page_allowlists…\n`);

  for (const item of DOCS_TO_SEED) {
    const ref = db.doc(`page_allowlists/${item.id}`);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`   ⏭  ${item.id} already exists — leaving emails untouched`);
      continue;
    }
    await ref.set({ emails: item.emails });
    console.log(`   ✅ ${item.id} = { emails: ${JSON.stringify(item.emails)} }`);
  }

  console.log(`\n✅ Done.`);
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
