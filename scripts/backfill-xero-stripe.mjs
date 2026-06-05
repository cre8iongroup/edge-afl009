/**
 * Backfill: create AUTHORISED Xero invoices + record payments for all Stripe-paid
 * sessions that pre-date the webhook Xero integration (i.e. paymentMethod === 'stripe'
 * && paymentComplete === true but invoiceId is absent).
 *
 * Safe to re-run: any group where ALL session docs already have invoiceId set is skipped.
 *
 * Uses:
 *  - Firestore REST API (same pattern as existing migration scripts)
 *  - createXeroInvoice + getAuthenticatedXeroClient imported from src/lib
 *
 * Run: node scripts/backfill-xero-stripe.mjs
 *
 * NOTE: Must be run from the project root so that the tsconfig path aliases
 * resolve correctly via the tsx/ts-node loader, OR run via:
 *   npx tsx scripts/backfill-xero-stripe.mjs
 * which handles the @/ aliases automatically via tsconfig paths.
 */

// ─── Node / env bootstrap ────────────────────────────────────────────────────

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

// ─── Firebase Admin explicit init ────────────────────────────────────────────
// Required when running outside the Next.js server context (e.g. CLI scripts).
// The service account JSON is loaded directly from disk; it is NOT committed to git.

const require = createRequire(import.meta.url);
const serviceAccount = require(
  '/Users/alexsawyer/Library/CloudStorage/GoogleDrive-alex@cre8iongroup.com/Shared drives/01 Operations/1.5 Development/PRIVATE Keys/ALPFA 2026 Firebase Service Account (1).json'
);
initializeApp({ credential: cert(serviceAccount) });

// ─── Firebase REST config (same values as existing scripts) ──────────────────

const PROJECT_ID     = 'studio-244954263-1293f';
const API_KEY        = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL    = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Xero / app imports (require tsx loader for @/ aliases) ──────────────────

import { createXeroInvoice } from '../src/lib/xero-actions.js';
import { getAuthenticatedXeroClient } from '../src/lib/xero.js';
import { Invoice, Payment } from 'xero-node';

// ─── Firestore helpers ────────────────────────────────────────────────────────

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

/**
 * Query submissions where paymentComplete == true AND paymentMethod == 'stripe'.
 * Firestore REST does not support "field does not exist" — we post-filter for
 * missing invoiceId in JS after fetching.
 */
async function queryStripePaidDocs(idToken) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'submissions' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'paymentComplete' },
                op: 'EQUAL',
                value: { booleanValue: true },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'paymentMethod' },
                op: 'EQUAL',
                value: { stringValue: 'stripe' },
              },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(
    `${FIRESTORE_BASE}:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  const results = await res.json();
  return results.filter(r => r.document);
}

/**
 * Convert a Firestore REST document fields object into a plain JS object.
 * Handles: stringValue, booleanValue, integerValue, doubleValue, mapValue, arrayValue.
 */
function fromFirestore(fields) {
  if (!fields) return {};
  const out = {};
  for (const [key, val] of Object.entries(fields)) {
    out[key] = decodeValue(val);
  }
  return out;
}

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

// ─── Main backfill logic ──────────────────────────────────────────────────────

async function run() {
  console.log('═'.repeat(60));
  console.log('  Xero Backfill — Stripe-paid sessions without invoiceId');
  console.log('═'.repeat(60));
  console.log();

  const idToken = await signIn();

  // ── 1. Fetch all stripe-paid docs ──────────────────────────────────────────
  console.log('🔍 Querying Firestore for stripe-paid sessions …');
  const rawDocs = await queryStripePaidDocs(idToken);
  console.log(`   Total stripe-paid docs found: ${rawDocs.length}`);

  // ── 2. Decode and post-filter: keep only docs WITHOUT invoiceId ─────────────
  const decoded = rawDocs.map(({ document }) => {
    const docId = document.name.split('/').pop();
    const data  = fromFirestore(document.fields);
    return { id: docId, ...data };
  });

  const needsInvoice = decoded.filter(doc => !doc.invoiceId);
  console.log(`   Docs missing invoiceId (need backfill): ${needsInvoice.length}`);
  console.log();

  if (needsInvoice.length === 0) {
    console.log('✅ Nothing to backfill — all stripe-paid sessions already have an invoiceId.');
    return;
  }

  // ── 3. Group by stripePaymentIntentId ───────────────────────────────────────
  const groups = new Map();
  for (const doc of needsInvoice) {
    const pi = doc.avSelection?.stripePaymentIntentId;
    if (!pi) {
      console.warn(`⚠️  Doc ${doc.id} has no stripePaymentIntentId — skipping`);
      continue;
    }
    if (!groups.has(pi)) groups.set(pi, []);
    groups.get(pi).push(doc);
  }

  console.log(`📦 Grouped into ${groups.size} Stripe checkout group(s):\n`);

  // ── INTENTIONAL FILTER: process Moody's checkout only ─────────────────────
  // The BNY group (pi_3TdVrG29EPrLrBMe1BZvEIza) has a data integrity issue:
  // finalPrice is 0 despite a non-zero addOnsTotal. It requires separate
  // investigation before a Xero invoice can be created accurately.
  const ALLOWED_PI = new Set(['pi_3Tf0h929EPrLrBMe0xGM4Uyb']);

  // ── 4. Process each group ───────────────────────────────────────────────────
  let successCount = 0;
  let skipCount    = 0;
  let failCount    = 0;

  for (const [paymentIntentId, sessions] of groups) {
    const sessionIds = sessions.map(s => s.id);

    console.log('─'.repeat(60));
    console.log(`Payment Intent : ${paymentIntentId}`);
    console.log(`Session docs   : ${sessionIds.join(', ')}`);

    // Exclude groups not in the allowlist for this run
    if (!ALLOWED_PI.has(paymentIntentId)) {
      console.log('⏭️  Excluded from this run (see INTENTIONAL FILTER comment above) — skipping.');
      skipCount++;
      continue;
    }

    // Re-run safety: skip if ALL docs in the group already have invoiceId.
    // (Could happen if a partial run completed some docs but not others.)
    if (sessions.every(s => !!s.invoiceId)) {
      console.log('⏭️  All docs already have invoiceId — skipping group.');
      skipCount++;
      continue;
    }

    // Resolve contact info from the first session doc
    const firstSession = sessions[0];
    const partnerName  = firstSession.companyName ?? '';
    const isWorkshop   = firstSession.sessionType === 'workshop';
    const partnerEmail = isWorkshop
      ? (firstSession.presenterPocEmail ?? firstSession.presenterEmail ?? '')
      : (firstSession.pocEmail ?? '');

    // Total amount in dollars (sum of finalPrice cents / 100)
    const totalCents = sessions.reduce(
      (sum, s) => sum + (s.avSelection?.finalPrice ?? 0), 0
    );
    const totalDollars = totalCents / 100;

    console.log(`Partner name   : ${partnerName || '(empty)'}`);
    console.log(`Partner email  : ${partnerEmail || '(empty)'}`);
    console.log(`Total amount   : $${totalDollars.toFixed(2)}`);

    try {
      // ── 4a. Create AUTHORISED Xero invoice ───────────────────────────────
      const xeroResult = await createXeroInvoice(
        sessions,              // Submission[] — already decoded from Firestore
        partnerEmail,
        partnerName,
        paymentIntentId,       // orderId → Xero Reference field
        sessionIds,
        'stripe',
        Invoice.StatusEnum.AUTHORISED,
      );

      if (!xeroResult.success || !xeroResult.invoiceId) {
        throw new Error(xeroResult.error ?? 'createXeroInvoice returned no invoiceId');
      }

      console.log(`✅ Xero invoice created : ${xeroResult.invoiceId} (${xeroResult.invoiceNumber ?? 'no number'})`);

      // ── 4b. Record payment against the invoice ────────────────────────────
      const { xero, tenantId } = await getAuthenticatedXeroClient();
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      await xero.accountingApi.createPayment(tenantId, {
        invoice:   { invoiceID: xeroResult.invoiceId },
        account:   { code: '022' },
        amount:    totalDollars,
        date:      today,
        reference: paymentIntentId,
        type:      Payment.PaymentTypeEnum.ACCRECPAYMENT,
      });

      console.log(`✅ Xero payment recorded : $${totalDollars.toFixed(2)} against ${xeroResult.invoiceId}`);
      successCount++;

    } catch (err) {
      console.error(`❌ Failed for group ${paymentIntentId}:`);
      console.error(`   ${err?.message ?? String(err)}`);
      if (err?.response?.body) {
        console.error(`   Xero response: ${JSON.stringify(err.response.body)}`);
      }
      failCount++;
    }

    console.log();
  }

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('  Backfill complete');
  console.log(`  ✅ Succeeded : ${successCount} group(s)`);
  console.log(`  ⏭️  Skipped   : ${skipCount} group(s) (already had invoiceId)`);
  console.log(`  ❌ Failed    : ${failCount} group(s)`);
  console.log('═'.repeat(60));
}

run().catch(err => {
  console.error('\n❌ Script aborted:', err.message);
  process.exit(1);
});
