/**
 * Verify: query the most recently created submission and print its objectives field
 */
const PROJECT_ID = 'studio-244954263-1293f';
const API_KEY = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Sign-in failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

async function verify() {
  const idToken = await signIn();

  // Query all submissions ordered by createdAt desc, limit 3
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'sessionType' },
          op: 'EQUAL',
          value: { stringValue: 'workshop' },
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 3,
    },
  };

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    { method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body) }
  );

  const results = await res.json();
  const docs = results.filter(r => r.document);

  if (docs.length === 0) {
    console.log('No workshop submissions found.');
    return;
  }

  for (const { document } of docs) {
    const title = document.fields?.title?.stringValue ?? '(no title)';
    const objectivesField = document.fields?.objectives;
    
    let objectives = '(not present)';
    if (objectivesField?.arrayValue?.values) {
      objectives = objectivesField.arrayValue.values
        .map(v => v.stringValue ?? JSON.stringify(v))
        .join('\n  - ');
      objectives = '[\n  - ' + objectives + '\n]';
    }

    console.log(`\nTitle: ${title}`);
    console.log(`Objectives: ${objectives}`);
    console.log(`Doc: ${document.name.split('/').pop()}`);
  }
}

verify().catch(err => { console.error('Error:', err.message); process.exit(1); });
