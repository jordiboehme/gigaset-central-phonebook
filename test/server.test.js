const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Point storage at a temp directory BEFORE the app modules are loaded,
// so tests never touch the real data/ directory
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phonebook-test-'));
process.env.DATA_DIR = dataDir;

const { createApp } = require('../src/app');

// Runs an app on an ephemeral port and returns its base URL
function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

let server;
let base;

before(async () => {
  ({ server, base } = await listen(createApp()));
});

after(() => {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('serves an empty phonebook as valid Gigaset XML', async () => {
  const res = await fetch(`${base}/phonebook.xml`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/xml/);
  const body = await res.text();
  assert.ok(body.includes('<!DOCTYPE LocalDirectory>'));
  assert.ok(body.includes('<list>'));
});

test('entry CRUD round-trip appears in the XML', async () => {
  const created = await fetch(`${base}/api/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ surname: 'Müller', name: 'H&M "Test"', home1: '030123' })
  }).then(r => r.json());
  assert.ok(created.id);

  const xmlBody = await fetch(`${base}/phonebook.xml`).then(r => r.text());
  assert.ok(xmlBody.includes('surname="Müller"'));
  assert.ok(xmlBody.includes('name="H&amp;M &quot;Test&quot;"'));

  const updated = await fetch(`${base}/api/entries/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ home1: '030999' })
  }).then(r => r.json());
  assert.strictEqual(updated.home1, '030999');
  assert.strictEqual(updated.surname, 'Müller');

  const del = await fetch(`${base}/api/entries/${created.id}`, { method: 'DELETE' });
  assert.strictEqual(del.status, 204);

  const entries = await fetch(`${base}/api/entries`).then(r => r.json());
  assert.strictEqual(entries.length, 0);
});

test('phonebook.xml supports ETag revalidation', async () => {
  const first = await fetch(`${base}/phonebook.xml`);
  const etag = first.headers.get('etag');
  assert.ok(etag);

  const second = await fetch(`${base}/phonebook.xml`, {
    headers: { 'If-None-Match': etag }
  });
  assert.strictEqual(second.status, 304);
});

test('vCard import creates entries', async () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Doe;Jane;;;',
    'TEL;TYPE=CELL:+4917612345678', 'END:VCARD'
  ].join('\r\n');
  const form = new FormData();
  form.append('file', new Blob([vcf]), 'contacts.vcf');

  const result = await fetch(`${base}/api/import`, { method: 'POST', body: form })
    .then(r => r.json());
  assert.strictEqual(result.imported, 1);

  const entries = await fetch(`${base}/api/entries?search=Doe`).then(r => r.json());
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].mobile1, '+4917612345678');
});

test('rejects uploads without a file and invalid JSON imports', async () => {
  const empty = await fetch(`${base}/api/import`, { method: 'POST', body: new FormData() });
  assert.strictEqual(empty.status, 400);

  const form = new FormData();
  form.append('file', new Blob(['{not json']), 'phonebook.json');
  const bad = await fetch(`${base}/api/import-json`, { method: 'POST', body: form });
  assert.strictEqual(bad.status, 400);
});

test('basic auth protects the API but never the phonebook XML', async () => {
  const auth = await listen(createApp({ authUser: 'admin', authPass: 'se:cr:et' }));
  try {
    const denied = await fetch(`${auth.base}/api/entries`);
    assert.strictEqual(denied.status, 401);

    const wrong = await fetch(`${auth.base}/api/entries`, {
      headers: { Authorization: 'Basic ' + Buffer.from('admin:wrong').toString('base64') }
    });
    assert.strictEqual(wrong.status, 401);

    // Password containing colons must survive the credential split
    const ok = await fetch(`${auth.base}/api/entries`, {
      headers: { Authorization: 'Basic ' + Buffer.from('admin:se:cr:et').toString('base64') }
    });
    assert.strictEqual(ok.status, 200);

    const device = await fetch(`${auth.base}/phonebook.xml`);
    assert.strictEqual(device.status, 200);
  } finally {
    auth.server.close();
  }
});
