'use strict';
// Test de la file de conversion (moteur LibreOffice réel). Nécessite LibreOffice installé.
// Le moteur Chromium est simulé : il dépend d'Electron (couvert par test/e2e-electron.js).

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ConversionQueue } = require('../src/queue');
const { engineFor, OFFICE_EXT } = require('../src/formats');
const { resolveOutputPath } = require('../src/outputPath');
const { findLibreOffice } = require('../src/libreoffice');

assert.strictEqual(engineFor('a.docx'), 'libreoffice');
assert.strictEqual(engineFor('a.ODT'), 'libreoffice');
assert.strictEqual(engineFor('a.txt'), 'chromium');
assert.strictEqual(engineFor('a.PNG'), 'chromium');
assert.strictEqual(engineFor('a.pdf'), 'skip');
for (const e of ['doc', 'docx', 'docm', 'dotx', 'rtf', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'ppsx', 'potx', 'pub', 'vsdx']) {
  assert.ok(OFFICE_EXT.has(e) && engineFor('a.' + e.toUpperCase()) === 'libreoffice', e);
}
assert.strictEqual(engineFor('a.weird'), 'libreoffice');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2pdf-test-'));
fs.writeFileSync(path.join(dir, 'x.pdf'), '');
assert.strictEqual(path.basename(resolveOutputPath(path.join(dir, 'x.docx'), dir)), 'x (1).pdf');
assert.strictEqual(path.basename(resolveOutputPath(path.join(dir, 'y.docx'), dir)), 'y.pdf');

(async () => {
  assert.ok(findLibreOffice(), 'LibreOffice introuvable');
  const src = path.join(dir, 'lot');
  fs.mkdirSync(path.join(src, 'sous dossier'), { recursive: true });
  fs.writeFileSync(path.join(src, 'note é accentuée.rtf'), '{\\rtf1\\ansi Bonjour \\b monde\\b0 !}');
  fs.writeFileSync(path.join(src, 'sous dossier', 'tab.csv'), 'a,b\n1,2\n'); // moteur chromium simulé
  fs.writeFileSync(path.join(src, 'déjà.pdf'), '%PDF-1.4');
  fs.writeFileSync(path.join(src, 'cassé.docx'), 'ceci n\'est pas un docx');
  fs.writeFileSync(path.join(src, 'lisez-moi.txt'), 'hello');
  // Un vrai .odt est optionnel : SAMPLE_ODT pointe vers un fichier à ajouter au lot.
  const odt = process.env.SAMPLE_ODT;
  if (odt) fs.writeFileSync(path.join(src, 'rapport.odt'), fs.readFileSync(odt));

  const events = new Map();
  const q = new ConversionQueue({
    emit: (j) => { if (!j.idle) events.set(j.name, j); else done(); },
    fallbackDir: path.join(dir, 'fallback'),
    chromium: async (s, out) => { fs.writeFileSync(out, '%PDF-fake'); return out; },
  });
  let done;
  const finished = new Promise((r) => { done = r; });
  assert.strictEqual(q.add([src]), odt ? 6 : 5);
  await finished;
  q.dispose();

  const st = (n) => events.get(n).status;
  assert.strictEqual(st('note é accentuée.rtf'), 'done');
  if (odt) assert.strictEqual(st('rapport.odt'), 'done');
  assert.strictEqual(st('tab.csv'), 'done');
  assert.strictEqual(st('lisez-moi.txt'), 'done');
  assert.strictEqual(st('déjà.pdf'), 'skipped');
  console.log('cassé.docx ->', events.get('cassé.docx').status, events.get('cassé.docx').message);
  for (const n of ['note é accentuée.rtf', ...(odt ? ['rapport.odt'] : [])]) {
    const out = events.get(n).output;
    assert.strictEqual(path.dirname(out), src, 'PDF à côté de la source');
    assert.ok(fs.readFileSync(out).subarray(0, 5).toString() === '%PDF-', 'vrai PDF');
  }
  assert.ok(fs.existsSync(path.join(src, 'sous dossier', 'tab.pdf')));
  console.log('OK');
})().catch((e) => { console.error(e); process.exit(1); });
