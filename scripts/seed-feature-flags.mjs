/**
 * Seeds the feature_flags collection with the initial ai_notes_visible flag.
 *
 * Uses Firebase Admin SDK (bypasses Firestore security rules).
 * Run: node scripts/seed-feature-flags.mjs
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

const FLAGS_TO_SEED = [
  { id: 'ai_notes_visible', enabled: false },
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
  console.log(`\n🚀 Seeding ${FLAGS_TO_SEED.length} flag(s) to feature_flags collection…\n`);

  for (const flag of FLAGS_TO_SEED) {
    await db.doc(`feature_flags/${flag.id}`).set({ enabled: flag.enabled });
    console.log(`   ✅ ${flag.id} = ${flag.enabled}`);
  }

  console.log(`\n✅ Done. ${FLAGS_TO_SEED.length} flag(s) seeded.`);
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
