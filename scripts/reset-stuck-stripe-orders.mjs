/**
 * scripts/reset-stuck-stripe-orders.mjs
 *
 * Resets stuck Stripe orders — sessions where paymentMethod was written
 * optimistically before Stripe checkout but the payment was never completed.
 *
 * Target docs (confirmed by audit-stuck-stripe-orders.mjs on 2026-06-16):
 *   - JJWf7TBGwNsjPyKkeBnm  EY — Navigating Recruiting with Intention…
 *   - p6YC1caIDgRzOWcgJQ9J  EY — Everyday AI Use to Enhance Your Work
 *   - qxOPxvxC5C6Y49C38EjH  EY — Get to Know EY
 *
 * Fields cleared: paymentMethod, paymentStatus, paymentComplete, orderFinalizedAt
 * Fields preserved: avSelected, avSelection, status, and all other submission data
 *
 * ─── DRY_RUN flag ────────────────────────────────────────────────────────────
 * Set DRY_RUN = false to commit changes. Defaults to true (safe).
 *
 * Run: node scripts/reset-stuck-stripe-orders.mjs
 */

const DRY_RUN = true; // ← set to false to commit changes

const PROJECT_ID     = 'studio-244954263-1293f';
const API_KEY        = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL    = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Target document IDs confirmed by Phase 1 audit ───────────────────────────

const TARGET_DOC_IDS = [
  'JJWf7TBGwNsjPyKkeBnm', // EY — Navigating Recruiting with Intention, Relationships, and Resilience
  'p6YC1caIDgRzOWcgJQ9J', // EY — Everyday AI Use to Enhance Your Work
  'qxOPxvxC5C6Y49C38EjH', // EY — Get to Know EY
];

// ── Auth ──────────────────────────────────────────────────────────────────────

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
  console.log(`✅ Signed in as ${ADMIN_EMAIL}\n`);
  return data.idToken;
}

// ── Firestore decode helpers ──────────────────────────────────────────────────

function decodeValue(val) {
  if (val.stringValue  !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue  !== undefined) return val.doubleValue;
  if (val.nullValue    !== undefined) return null;
  if (val.mapValue?.fields)           return fromFirestore(val.mapValue.fields);
  if (val.arrayValue?.values)         return val.arrayValue.values.map(decodeValue);
  return undefined;
}

function fromFirestore(fields) {
  if (!fields) return {};
  const out = {};
  for (const [key, val] of Object.entries(fields)) {
    out[key] = decodeValue(val);
  }
  return out;
}

// ── Fetch a single doc ────────────────────────────────────────────────────────

async function fetchDoc(idToken, docId) {
  const url = `${FIRESTORE_BASE}/submissions/${docId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GET ${docId} failed: ${err}`);
  }
  const raw = await res.json();
  return { id: docId, ...fromFirestore(raw.fields) };
}

// ── Patch a single doc ────────────────────────────────────────────────────────
// Clears paymentMethod, paymentStatus, paymentComplete, orderFinalizedAt.
// All other fields (avSelected, avSelection, status, etc.) are untouched.

async function resetDoc(idToken, docId) {
  const url =
    `${FIRESTORE_BASE}/submissions/${docId}` +
    `?updateMask.fieldPaths=paymentMethod` +
    `&updateMask.fieldPaths=paymentStatus` +
    `&updateMask.fieldPaths=paymentComplete` +
    `&updateMask.fieldPaths=orderFinalizedAt`;

  const body = {
    fields: {
      paymentMethod:    { nullValue: null },
      paymentStatus:    { nullValue: null },
      paymentComplete:  { booleanValue: false },
      orderFinalizedAt: { nullValue: null },
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
    throw new Error(`PATCH ${docId} failed: ${err}`);
  }

  return await res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═'.repeat(64));
  console.log(`  Reset Stuck Stripe Orders${DRY_RUN ? ' [DRY RUN — no writes]' : ' ⚠️  LIVE MODE'}`);
  console.log('═'.repeat(64));
  console.log();

  if (DRY_RUN) {
    console.log('  ℹ️  DRY_RUN is true. Set DRY_RUN = false to commit changes.\n');
  } else {
    console.log('  ⚠️  LIVE MODE — Firestore documents will be modified.\n');
  }

  const idToken = await signIn();

  let resetCount  = 0;
  let skipCount   = 0;
  let failCount   = 0;

  for (const docId of TARGET_DOC_IDS) {
    console.log('─'.repeat(64));

    let doc;
    try {
      doc = await fetchDoc(idToken, docId);
    } catch (err) {
      console.error(`❌ Could not fetch ${docId}: ${err.message}`);
      failCount++;
      continue;
    }

    const partnerName =
      doc.companyName ||
      doc.presenterPocName ||
      doc.pocName ||
      doc.presenterName ||
      '(no name)';

    const partnerEmail =
      doc.pocEmail ||
      doc.presenterPocEmail ||
      doc.presenterEmail ||
      '(no email)';

    console.log(`  Doc ID          : ${docId}`);
    console.log(`  Title           : ${doc.title ?? '(no title)'}`);
    console.log(`  Partner         : ${partnerName} <${partnerEmail}>`);
    console.log(`  paymentMethod   : ${doc.paymentMethod ?? '(absent)'} → null`);
    console.log(`  paymentStatus   : ${doc.paymentStatus ?? '(absent)'} → null`);
    console.log(`  paymentComplete : ${String(doc.paymentComplete ?? '(absent)')} → false`);
    console.log(`  orderFinalizedAt: ${doc.orderFinalizedAt ?? '(absent)'} → null`);

    // Safety: skip if already clean (no paymentMethod and paymentComplete !== true)
    if (!doc.paymentMethod && doc.paymentComplete !== true && !doc.orderFinalizedAt) {
      console.log(`  ⏭️  Already clean — skipping.`);
      skipCount++;
      continue;
    }

    // Safety: never reset a document that has been genuinely paid
    if (doc.paymentComplete === true) {
      console.log(`  🛑 paymentComplete === true — this session is genuinely paid. SKIPPING to protect data integrity.`);
      skipCount++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would reset paymentMethod, paymentStatus, paymentComplete, orderFinalizedAt.`);
      resetCount++;
    } else {
      try {
        await resetDoc(idToken, docId);
        console.log(`  ✅ Reset complete.`);
        resetCount++;
      } catch (err) {
        console.error(`  ❌ Reset failed: ${err.message}`);
        failCount++;
      }
    }
  }

  console.log();
  console.log('═'.repeat(64));
  console.log(`  Summary${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log(`  ✅ Reset  : ${resetCount} doc(s)`);
  console.log(`  ⏭️  Skipped: ${skipCount} doc(s)`);
  console.log(`  ❌ Failed : ${failCount} doc(s)`);
  if (DRY_RUN) {
    console.log(`\n  Run with DRY_RUN = false to commit changes.`);
  }
  console.log('═'.repeat(64));
}

run().catch(err => {
  console.error('\n❌ Script aborted:', err.message);
  process.exit(1);
});
