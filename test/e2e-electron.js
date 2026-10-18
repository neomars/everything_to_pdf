'use strict';
// Lance la vraie application (Electron) avec des fichiers en argument et vérifie les PDF produits.
// Usage : xvfb-run -a node test/e2e-electron.js   (ajoute --no-sandbox automatiquement en root)

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const electron = require('electron');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2pdf-e2e-'));
fs.writeFileSync(path.join(dir, 'texte é.txt'), 'Bonjour\nCeci est un test accentué : éàü €\n');
fs.writeFileSync(path.join(dir, 'page.html'), '<h1>Titre</h1><p>Paragraphe</p>');
// PNG 1x1
fs.writeFileSync(path.join(dir, 'image.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
fs.writeFileSync(path.join(dir, 'lettre.rtf'), '{\\rtf1\\ansi Bonjour}');
if (process.env.SAMPLE_ODT) fs.copyFileSync(process.env.SAMPLE_ODT, path.join(dir, 'rapport.odt'));

const expected = ['texte é.pdf', 'page.pdf', 'image.pdf', 'lettre.pdf', ...(process.env.SAMPLE_ODT ? ['rapport.pdf'] : [])];
const inputs = fs.readdirSync(dir).map((f) => path.join(dir, f));
const flags = process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [];
const app = spawn(electron, [path.join(__dirname, '..'), ...flags, ...inputs], { stdio: 'inherit' });

const isPdf = (f) => fs.existsSync(f) && fs.statSync(f).size > 100 && fs.readFileSync(f).subarray(0, 5).toString() === '%PDF-';
const t0 = Date.now();
const timer = setInterval(() => {
  const ok = expected.every((n) => isPdf(path.join(dir, n)));
  if (ok || Date.now() - t0 > 90000) {
    clearInterval(timer);
    app.kill();
    for (const n of expected) console.log(isPdf(path.join(dir, n)) ? 'OK  ' : 'FAIL', n);
    assert.ok(ok, 'tous les PDF doivent être générés');
    console.log('E2E OK');
    process.exit(0);
  }
}, 500);
