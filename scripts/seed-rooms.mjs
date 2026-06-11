/**
 * Seed: writes the room inventory to the `rooms` Firestore collection.
 * Each document uses the roomId as the document ID.
 *
 * Uses Firestore REST API authenticated via email/password sign-in.
 * Run: node scripts/seed-rooms.mjs
 */

const PROJECT_ID     = 'studio-244954263-1293f';
const API_KEY        = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL    = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';

// ── Room inventory ────────────────────────────────────────────────────────────

const ROOMS = [
  // ── Workshop rooms (sessionTypes: workshop + info-session) ─────────────────
  { roomId: 'W208',   label: 'Student Workshop #1',      wing: 'West', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 218, banquet: 112, classroom: 126 } },
  { roomId: 'W207BC', label: 'Student Workshop #2',      wing: 'West', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 140, banquet:  56, classroom:  68 } },
  { roomId: 'W207A',  label: 'Student Workshop #3',      wing: 'West', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 140, banquet:  56, classroom:  68 } },
  { roomId: 'W206B',  label: 'Student Workshop #4',      wing: 'West', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 175, banquet:  72, classroom:  75 } },
  { roomId: 'W206A',  label: 'Student Workshop #5',      wing: 'West', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 175, banquet:  72, classroom:  75 } },
  { roomId: 'E219D',  label: 'Professional Workshop #1', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 294, banquet: 100, classroom: 112 } },
  { roomId: 'E219BC', label: 'Professional Workshop #2', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 245, banquet: 100, classroom: 112 } },
  { roomId: 'E219A',  label: 'Professional Workshop #3', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 294, banquet: 100, classroom: 112 } },
  { roomId: 'E218',   label: 'Professional Workshop #4', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 147, banquet:  67, classroom:  50 } },
  { roomId: 'E217',   label: 'Professional Workshop #5', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater: 210, banquet: 100, classroom: 109 } },
  { roomId: 'E221B',  label: 'Professional Workshop #6', wing: 'East', sessionTypes: ['workshop', 'info-session'], capacity: { theater:  81, banquet:  33, classroom:  44 } },

  // ── Reception rooms (sessionTypes: reception only) ─────────────────────────
  { roomId: 'E220F',  label: 'Reception 01', wing: 'East', sessionTypes: ['reception'], capacity: { theater: 151, banquet:  56, classroom:  84 } },
  { roomId: 'E220E',  label: 'Reception 02', wing: 'East', sessionTypes: ['reception'], capacity: { theater: 170, banquet:  84, classroom: 105 } },
  { roomId: 'E220D',  label: 'Reception 04', wing: 'East', sessionTypes: ['reception'], capacity: { theater: 117, banquet:  56, classroom:  63 } },
  { roomId: 'E220BC', label: 'Reception 05', wing: 'East', sessionTypes: ['reception'], capacity: { theater: 117, banquet:  56, classroom:  63 } },
  { roomId: 'E220A',   label: 'Reception 06',           wing: 'East', sessionTypes: ['reception', 'info-session'], capacity: { theater: 117, banquet:  56, classroom:  63 } },
  // E220BCD — B+C+D combined for Wells Fargo Tuesday reception; capacity is sum of E220BC + E220D
  { roomId: 'E220BCD', label: 'Reception BCD (Combined)', wing: 'East', sessionTypes: ['reception'],               capacity: { theater: 234, banquet: 112, classroom: 126 } },
];

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

// ── Step 2: Build Firestore REST field representation ─────────────────────────

function toFirestoreFields(room) {
  return {
    fields: {
      roomId: { stringValue: room.roomId },
      label:  { stringValue: room.label },
      wing:   { stringValue: room.wing },
      sessionTypes: {
        arrayValue: {
          values: room.sessionTypes.map(s => ({ stringValue: s })),
        },
      },
      capacity: {
        mapValue: {
          fields: {
            theater:   { integerValue: String(room.capacity.theater) },
            banquet:   { integerValue: String(room.capacity.banquet) },
            classroom: { integerValue: String(room.capacity.classroom) },
          },
        },
      },
    },
  };
}

// ── Step 3: Write a single room document ─────────────────────────────────────

async function writeRoom(idToken, room) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/rooms/${room.roomId}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toFirestoreFields(room)),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed for ${room.roomId}: ${err}`);
  }

  console.log(`   ✅ Wrote room: ${room.roomId} — ${room.label}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`🏨 Seeding ${ROOMS.length} rooms to Firestore …\n`);
  const idToken = await signIn();
  console.log('');

  for (const room of ROOMS) {
    await writeRoom(idToken, room);
  }

  console.log(`\n✅ Done. ${ROOMS.length} rooms written to the \`rooms\` collection.`);
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
