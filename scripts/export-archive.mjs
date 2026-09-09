/**
 * Full Firestore archival export for Edge (ALPFA 2026 National Convention).
 *
 * Reads every document the admin REST identity can list, then writes:
 *   - all-fields.csv          long format: one row per field (the "massive CSV")
 *   - {collection}.csv        wide flattened table per collection
 *   - presenters.csv          one row per presenter, joined to submission id
 *   - archive.jsonl           lossless JSON (one document per line)
 *   - MANIFEST.txt            counts, timestamp, exclusions
 *
 * Auth matches existing scripts: Firebase email/password REST, not Admin SDK.
 * Run from project root:  node scripts/export-archive.mjs
 *
 * Output: exports/archive-<ISO-timestamp>/  (gitignored)
 *
 * Exclusions:
 *   - xero_config tokens are redacted (OAuth credentials, not event data)
 *   - Firebase Storage binaries (headshots, scenic files) are not downloaded;
 *     their download URLs are included where stored on documents
 *   - Award remarks live in Google Sheets, not Firestore
 */

const PROJECT_ID = 'studio-244954263-1293f';
const API_KEY = 'AIzaSyDnlbOBYrLU28hGOTYNfwHM3e9nIUKhYDM';
const ADMIN_EMAIL = 'dev-admin@cre8iongroup.com';
const ADMIN_PASSWORD = 'cre8ionadmin';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const PAGE_SIZE = 300;

const KNOWN_COLLECTIONS = [
  'submissions',
  'users',
  'rooms',
  'scenic_assets',
  'feature_flags',
  'page_allowlists',
  'config',
  'client_errors',
  'xero_config',
];

const REDACT_COLLECTION_PREFIXES = ['xero_config'];
const REDACT_FIELD_NAMES = new Set([
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'id_token',
  'idToken',
]);

import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Auth ──────────────────────────────────────────────────────────────────────

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Sign-in failed: ${JSON.stringify(data)}`);
  console.log(`Signed in as ${ADMIN_EMAIL}`);
  return data.idToken;
}

async function firestoreFetch(idToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

// ── Firestore REST decode ─────────────────────────────────────────────────────

function decodeValue(val) {
  if (val == null) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.bytesValue !== undefined) return val.bytesValue;
  if (val.referenceValue !== undefined) return val.referenceValue;
  if (val.geoPointValue !== undefined) {
    return `${val.geoPointValue.latitude},${val.geoPointValue.longitude}`;
  }
  if (val.mapValue?.fields) return fromFirestore(val.mapValue.fields);
  if (val.arrayValue?.values) return val.arrayValue.values.map(decodeValue);
  if (val.arrayValue && !val.arrayValue.values) return [];
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

function redactDocument(collectionPath, data) {
  const shouldRedactCollection = REDACT_COLLECTION_PREFIXES.some(
    (prefix) => collectionPath === prefix || collectionPath.startsWith(`${prefix}/`)
  );
  const walk = (value, key) => {
    if (shouldRedactCollection && key && REDACT_FIELD_NAMES.has(key)) {
      return '[REDACTED]';
    }
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, k);
      return out;
    }
    return value;
  };
  return walk(data, null);
}

// ── Listing ───────────────────────────────────────────────────────────────────

async function listCollectionIds(idToken, parentPath) {
  const url = parentPath
    ? `${FIRESTORE_BASE}/${parentPath}:listCollectionIds`
    : `${FIRESTORE_BASE}:listCollectionIds`;

  const ids = [];
  let pageToken = undefined;
  do {
    const body = { pageSize: PAGE_SIZE };
    if (pageToken) body.pageToken = pageToken;
    const { ok, status, json } = await firestoreFetch(idToken, url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!ok) {
      return { ids, error: `listCollectionIds ${status}: ${JSON.stringify(json)}` };
    }
    ids.push(...(json.collectionIds || []));
    pageToken = json.nextPageToken;
  } while (pageToken);

  return { ids };
}

async function listDocuments(idToken, collectionPath) {
  const documents = [];
  let pageToken = undefined;

  do {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${FIRESTORE_BASE}/${collectionPath}?${params.toString()}`;
    const { ok, status, json } = await firestoreFetch(idToken, url);
    if (!ok) {
      return { documents, error: `list ${collectionPath} ${status}: ${JSON.stringify(json)}` };
    }
    documents.push(...(json.documents || []));
    pageToken = json.nextPageToken;
  } while (pageToken);

  return { documents };
}

function collectionPathFromDocumentName(name) {
  // projects/.../documents/submissions/abc → submissions
  // projects/.../documents/users/uid/widgets/id → users/uid/widgets
  const marker = '/documents/';
  const idx = name.indexOf(marker);
  if (idx === -1) return '';
  const relative = name.slice(idx + marker.length);
  const parts = relative.split('/');
  parts.pop();
  return parts.join('/');
}

function documentIdFromName(name) {
  return name.split('/').pop();
}

function relativeDocumentPath(name) {
  const marker = '/documents/';
  const idx = name.indexOf(marker);
  return idx === -1 ? name : name.slice(idx + marker.length);
}

// ── Flatten / CSV ─────────────────────────────────────────────────────────────

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function flattenValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v))) {
      return value.map((v) => (v === null ? '' : String(v))).join(' | ');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function flattenObject(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    out[prefix] = flattenValue(obj);
    return out;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    if (prefix) out[prefix] = '';
    return out;
  }
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, path, out);
    } else {
      out[path] = flattenValue(value);
    }
  }
  return out;
}

function walkFields(obj, prefix = '', rows = []) {
  if (obj === null || obj === undefined) {
    if (prefix) rows.push({ field: prefix, value: '' });
    return rows;
  }
  if (typeof obj !== 'object') {
    rows.push({ field: prefix, value: flattenValue(obj) });
    return rows;
  }
  if (Array.isArray(obj)) {
    if (
      obj.length === 0 ||
      obj.every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    ) {
      rows.push({ field: prefix, value: flattenValue(obj) });
      return rows;
    }
    obj.forEach((item, i) => walkFields(item, `${prefix}[${i}]`, rows));
    return rows;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    if (prefix) rows.push({ field: prefix, value: '' });
    return rows;
  }
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    walkFields(obj[key], path, rows);
  }
  return rows;
}

function safeFilePart(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

// ── Walk ──────────────────────────────────────────────────────────────────────

async function exportCollection(idToken, collectionPath, allDocs, errors) {
  console.log(`Listing ${collectionPath} …`);
  const { documents, error } = await listDocuments(idToken, collectionPath);
  if (error) {
    console.warn(`  ! ${error}`);
    errors.push({ collection: collectionPath, error });
    return;
  }
  console.log(`  ${documents.length} document(s)`);

  for (const raw of documents) {
    const data = redactDocument(collectionPath, fromFirestore(raw.fields));
    const record = {
      collection: collectionPath,
      id: documentIdFromName(raw.name),
      path: relativeDocumentPath(raw.name),
      createTime: raw.createTime || '',
      updateTime: raw.updateTime || '',
      data,
    };
    allDocs.push(record);

    const rel = relativeDocumentPath(raw.name);
    const nested = await listCollectionIds(idToken, rel);
    if (nested.error) continue;
    for (const child of nested.ids) {
      await exportCollection(idToken, `${rel}/${child}`, allDocs, errors);
    }
  }
}

async function discoverRootCollections(idToken) {
  const discovered = await listCollectionIds(idToken, null);
  const set = new Set(KNOWN_COLLECTIONS);
  if (discovered.error) {
    console.warn(`Could not list root collections (${discovered.error.split(':')[0]}). Using known collections.`);
  } else {
    for (const id of discovered.ids) set.add(id);
    console.log(`Discovered root collections: ${discovered.ids.join(', ') || '(none)'}`);
  }
  return [...set];
}

// ── Presenters child table ────────────────────────────────────────────────────

function extractPresenters(allDocs) {
  const rows = [];
  for (const doc of allDocs) {
    if (doc.collection !== 'submissions') continue;
    const presenters = Array.isArray(doc.data.presenters) ? doc.data.presenters : [];
    presenters.forEach((p, index) => {
      const presenter = p && typeof p === 'object' ? p : { value: p };
      rows.push({
        submissionId: doc.id,
        submissionTitle: flattenValue(doc.data.title),
        companyName: flattenValue(doc.data.companyName),
        sessionType: flattenValue(doc.data.sessionType),
        presenterIndex: String(index),
        ...flattenObject(presenter),
      });
    });
  }
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const outDir = resolve(ROOT, 'exports', `archive-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log('Edge archival export');
  console.log(`Output: ${outDir}\n`);

  const idToken = await signIn();
  const roots = await discoverRootCollections(idToken);

  const allDocs = [];
  const errors = [];

  for (const collectionId of roots.sort()) {
    await exportCollection(idToken, collectionId, allDocs, errors);
  }

  const byCollection = new Map();
  for (const doc of allDocs) {
    if (!byCollection.has(doc.collection)) byCollection.set(doc.collection, []);
    byCollection.get(doc.collection).push(doc);
  }

  // Long-format: every field of every document
  const longRows = [];
  for (const doc of allDocs) {
    const fields = walkFields(doc.data);
    if (fields.length === 0) {
      longRows.push({
        collection: doc.collection,
        document_id: doc.id,
        document_path: doc.path,
        createTime: doc.createTime,
        updateTime: doc.updateTime,
        field: '',
        value: '',
      });
      continue;
    }
    for (const { field, value } of fields) {
      longRows.push({
        collection: doc.collection,
        document_id: doc.id,
        document_path: doc.path,
        createTime: doc.createTime,
        updateTime: doc.updateTime,
        field,
        value,
      });
    }
  }
  const longHeaders = [
    'collection',
    'document_id',
    'document_path',
    'createTime',
    'updateTime',
    'field',
    'value',
  ];
  writeFileSync(resolve(outDir, 'all-fields.csv'), toCsv(longRows, longHeaders));

  // Wide CSV per collection
  for (const [collection, docs] of byCollection) {
    const flattened = docs.map((doc) => ({
      id: doc.id,
      path: doc.path,
      createTime: doc.createTime,
      updateTime: doc.updateTime,
      ...flattenObject(doc.data),
    }));
    const headerSet = new Set(['id', 'path', 'createTime', 'updateTime']);
    for (const row of flattened) {
      for (const key of Object.keys(row)) headerSet.add(key);
    }
    const headers = [...headerSet];
    const filename = `${safeFilePart(collection)}.csv`;
    writeFileSync(resolve(outDir, filename), toCsv(flattened, headers));
  }

  const presenterRows = extractPresenters(allDocs);
  if (presenterRows.length > 0) {
    const headerSet = new Set([
      'submissionId',
      'submissionTitle',
      'companyName',
      'sessionType',
      'presenterIndex',
    ]);
    for (const row of presenterRows) {
      for (const key of Object.keys(row)) headerSet.add(key);
    }
    writeFileSync(resolve(outDir, 'presenters.csv'), toCsv(presenterRows, [...headerSet]));
  }

  const jsonl = allDocs
    .map((doc) =>
      JSON.stringify({
        collection: doc.collection,
        id: doc.id,
        path: doc.path,
        createTime: doc.createTime,
        updateTime: doc.updateTime,
        ...doc.data,
      })
    )
    .join('\n') + (allDocs.length ? '\n' : '');
  writeFileSync(resolve(outDir, 'archive.jsonl'), jsonl);

  const collectionCounts = [...byCollection.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, docs]) => `  ${name}: ${docs.length} document(s)`);

  const manifest = [
    'Edge (ALF009) Firestore archival export',
    `Generated: ${startedAt.toISOString()}`,
    `Project: ${PROJECT_ID}`,
    `Identity: ${ADMIN_EMAIL}`,
    '',
    `Documents: ${allDocs.length}`,
    `Field rows (all-fields.csv): ${longRows.length}`,
    `Presenter rows: ${presenterRows.length}`,
    '',
    'Collections:',
    ...(collectionCounts.length ? collectionCounts : ['  (none)']),
    '',
    'Files:',
    '  all-fields.csv     one row per field across every document',
    '  {collection}.csv   wide flattened table per collection',
    '  presenters.csv     presenters exploded from submissions (if any)',
    '  archive.jsonl      lossless JSON, one document per line',
    '',
    'Exclusions / notes:',
    '  - xero_config OAuth token fields are redacted',
    '  - Firebase Storage binaries are not downloaded; URLs on documents are included',
    '  - Award remarks are stored in Google Sheets, not Firestore',
    '',
    errors.length ? 'Read errors:' : 'Read errors: none',
    ...errors.map((e) => `  ${e.collection}: ${e.error}`),
    '',
  ].join('\n');
  writeFileSync(resolve(outDir, 'MANIFEST.txt'), manifest);

  console.log('\n' + manifest);
  console.log(`Wrote ${outDir}`);
}

run().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
