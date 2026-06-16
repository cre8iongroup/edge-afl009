/**
 * scripts/seed-dev-scenic.mjs
 *
 * Seeds a test scenic submission for dev-user@cre8iongroup.com so they can
 * access the Scenic Assets page in the local dev environment.
 *
 * Phase 1 (always): looks up the uid and reports existing submissions — no writes.
 * Phase 2 (DRY_RUN=false): creates or updates the submission document.
 *
 * ─── DRY_RUN flag ────────────────────────────────────────────────────────────
 * Set DRY_RUN = false to commit the write. Defaults to true (safe).
 *
 * Run: node scripts/seed-dev-scenic.mjs
 */

const DRY_RUN = false; // ← set to false to commit write

const PROJECT_ID    = 'studio-244954263-1293f';
const API_KEY       = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL   = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';
const TARGET_EMAIL  = 'dev-user@cre8iongroup.com';

const FIRESTORE_BASE  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const IDENTITY_BASE   = `https://identitytoolkit.googleapis.com/v1`;

// ── Auth ───────────────────────────────────────────────────────────────────────

async function signIn() {
  const res = await fetch(
    `${IDENTITY_BASE}/accounts:signInWithPassword?key=${API_KEY}`,
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

// ── Look up uid by email — query users collection ─────────────────────────────
// The users collection is keyed by uid. We query it with a field filter on email.
// Admin/internal role has list access per firestore.rules.

async function lookupUidByEmail(idToken, email) {
  const url = `${FIRESTORE_BASE}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email },
        },
      },
      limit: 1,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Users query failed: ${await res.text()}`);

  const results = await res.json();
  const userDocs = results.filter(r => r.document?.fields);

  if (userDocs.length === 0) {
    throw new Error(
      `No user document found for email ${email}. ` +
      `Make sure the account exists and has a /users/{uid} document in Firestore.`
    );
  }

  // The document name ends with the uid: .../users/{uid}
  return userDocs[0].document.name.split('/').pop();
}


// ── Firestore decode helpers ───────────────────────────────────────────────────

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

// ── Firestore encode helpers ───────────────────────────────────────────────────

function encodeValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean')  return { booleanValue: val };
  if (typeof val === 'number')   return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string')   return { stringValue: val };
  if (Array.isArray(val))        return { arrayValue: { values: val.map(encodeValue) } };
  if (typeof val === 'object')   return { mapValue: { fields: toFirestore(val) } };
  throw new Error(`Cannot encode value: ${JSON.stringify(val)}`);
}

function toFirestore(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) fields[key] = encodeValue(val);
  }
  return fields;
}

// ── Query submissions for a userId ────────────────────────────────────────────

async function querySubmissionsForUser(idToken, userId) {
  const url = `${FIRESTORE_BASE}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'userId' },
          op: 'EQUAL',
          value: { stringValue: userId },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Submissions query failed: ${await res.text()}`);

  const results = await res.json();
  return results
    .filter(r => r.document?.fields)
    .map(r => ({
      id: r.document.name.split('/').pop(),
      ...fromFirestore(r.document.fields),
    }));
}

// ── Create a new submission document ─────────────────────────────────────────

async function createSubmission(idToken, data) {
  // POST to the collection — Firestore auto-generates the doc ID
  const url = `${FIRESTORE_BASE}/submissions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestore(data) }),
  });
  if (!res.ok) throw new Error(`Create submission failed: ${await res.text()}`);
  const raw = await res.json();
  return raw.name.split('/').pop(); // auto-generated doc ID
}

// ── Patch an existing submission document ─────────────────────────────────────

async function patchSubmission(idToken, docId, data) {
  const fieldPaths = Object.keys(data)
    .flatMap(key => key === 'avSelection'
      ? Object.keys(data.avSelection).map(k => `avSelection.${k}`)
      : [key])
    .map(fp => `updateMask.fieldPaths=${encodeURIComponent(fp)}`)
    .join('&');

  const url = `${FIRESTORE_BASE}/submissions/${docId}?${fieldPaths}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestore(data) }),
  });
  if (!res.ok) throw new Error(`Patch submission failed: ${await res.text()}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═'.repeat(64));
  console.log(`  Seed Dev Scenic Test Data${DRY_RUN ? ' [DRY RUN — no writes]' : ' ⚠️  LIVE MODE'}`);
  console.log('═'.repeat(64));
  console.log();

  const idToken = await signIn();

  // ── Step 1: Resolve uid ──────────────────────────────────────────────────
  console.log(`Looking up uid for ${TARGET_EMAIL}…`);
  const uid = await lookupUidByEmail(idToken, TARGET_EMAIL);
  console.log(`  uid: ${uid}\n`);

  // ── Step 2: Check existing submissions ───────────────────────────────────
  console.log(`Querying existing submissions for uid ${uid}…`);
  const existing = await querySubmissionsForUser(idToken, uid);

  if (existing.length === 0) {
    console.log('  No existing submissions found.\n');
  } else {
    console.log(`  Found ${existing.length} existing submission(s):`);
    for (const sub of existing) {
      console.log(`\n  Doc ID     : ${sub.id}`);
      console.log(`  Title      : ${sub.title ?? '(no title)'}`);
      console.log(`  Status     : ${sub.status ?? '(absent)'}`);
      console.log(`  avSelected : ${sub.avSelected ?? '(absent)'}`);
      console.log(`  packageId  : ${sub.avSelection?.packageId ?? '(absent)'}`);
    }
    console.log();
  }

  // ── Step 3: Determine action ─────────────────────────────────────────────
  // If the user already has a scenic session, no write needed.
  const alreadyScenic = existing.some(
    s =>
      s.avSelected === true &&
      s.avSelection?.packageId &&
      [
        'workshop-pro', 'workshop-elite',
        'info-pro', 'info-elite',
        'reception-pro', 'reception-elite', 'reception-lux',
      ].includes(s.avSelection.packageId)
  );

  if (alreadyScenic) {
    console.log('ℹ️  User already has at least one scenic submission. No write needed.');
    console.log('═'.repeat(64));
    return;
  }

  // Build the payload to write
  const submissionPayload = {
    userId: uid,
    partnerEmail: TARGET_EMAIL,
    title: 'Test Scenic Session',
    description: '[Test] Created by seed-dev-scenic.mjs for local dev.',
    sessionType: 'workshop',
    status: 'phase_2',
    pillar: 'Test',
    format: 'Workshop',
    audience: 'Students',
    objectives: ['Test scenic assets panel'],
    cpe: false,
    createdAt: new Date().toISOString(),
    presentersAdded: false,
    avSelected: true,
    avSelection: {
      packageId: 'workshop-elite',
      packageName: 'Edge Elite',
      sessionType: 'workshop',
      pricingTier: 'Standard',
      multiplier: 1,
      basePrice: 200000,
      finalPrice: 200000,
      addOns: [],
      addOnsTotal: 0,
      orderTotal: 200000,
      lockedAt: new Date().toISOString(),
    },
  };

  console.log('─'.repeat(64));
  console.log(`  Action: CREATE new submission\n`);
  console.log('  Payload to write:');
  console.log(JSON.stringify(submissionPayload, null, 4));
  console.log();

  if (DRY_RUN) {
    console.log('  [DRY RUN] No document written. Set DRY_RUN = false to commit.');
  } else {
    console.log('  Writing to Firestore…');
    const newDocId = await createSubmission(idToken, submissionPayload);
    console.log(`\n  ✅ Created submission document: ${newDocId}`);
    console.log(`  Path: submissions/${newDocId}`);
  }

  console.log();
  console.log('═'.repeat(64));
}

run().catch(err => {
  console.error('\n❌ Script aborted:', err.message);
  process.exit(1);
});
