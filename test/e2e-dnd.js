'use strict';
// Test de bout en bout du glisser-déposer : lance la vraie application et y dépose de vrais fichiers
// et un dossier avec des événements de glisser-déposer natifs (protocole de débogage de Chromium,
// Input.dispatchDragEvent), comme le ferait un gestionnaire de fichiers.
// Usage : xvfb-run -a node test/e2e-dnd.js

if (!process.versions.electron) {
  // Côté Node : relance ce même fichier dans Electron. Les options passent APRÈS le script, sinon
  // main.js les prendrait pour des fichiers à convertir.
  const { spawn } = require('child_process');
  // Locale UTF-8 comme sur un vrai bureau : en locale « C », Chromium convertit mal les noms de
  // fichiers non ASCII (nom vide) et le dépôt de « texte é.txt » échouerait pour cette seule raison.
  const env = { ...process.env, LC_ALL: 'C.UTF-8' };
  const child = spawn(require('electron'), [__filename, '--no-sandbox'], { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code === null ? 1 : code));
} else {
  runInElectron();
}

function runInElectron() {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { app, BrowserWindow } = require('electron');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2pdf-dnd-'));
  app.setPath('userData', path.join(dir, 'userData'));

  const files = [path.join(dir, 'texte é.txt'), path.join(dir, 'note.txt')];
  const folder = path.join(dir, 'dossier');
  const nested = path.join(folder, 'sous dossier', 'dedans.txt');
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  [...files, nested].forEach((f) => fs.writeFileSync(f, `Bonjour ${path.basename(f)} é à ü\n`));
  const expected = [files[0], files[1], nested].map((f) => f.replace(/\.txt$/, '.pdf'));

  const finish = (code, message) => {
    console.log(message);
    app.exit(code);
  };
  const isPdf = (f) => fs.existsSync(f) && fs.readFileSync(f).subarray(0, 5).toString() === '%PDF-';

  require('../src/main.js');

  app.whenReady().then(async () => {
    const win = BrowserWindow.getAllWindows()[0];
    const wc = win.webContents;
    wc.on('console-message', (_e, _level, text) => console.log('[renderer]', text));
    wc.on('preload-error', (_e, file, error) => console.log('[preload-error]', file, error));
    if (wc.isLoading()) await new Promise((r) => wc.once('did-finish-load', r));

    const rect = JSON.parse(await wc.executeJavaScript(
      'JSON.stringify(document.getElementById("drop").getBoundingClientRect())'));
    const x = Math.round(rect.x + rect.width / 2);
    const y = Math.round(rect.y + rect.height / 2);

    // Deux dépôts successifs : deux fichiers, puis un dossier.
    wc.debugger.attach('1.3');
    const drop = async (paths) => {
      const data = { items: [], files: paths, dragOperationsMask: 1 };
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        await wc.debugger.sendCommand('Input.dispatchDragEvent', { type, x, y, data });
      }
    };
    await drop(files);
    await drop([folder]);

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (expected.every(isPdf)) return finish(0, 'E2E DND OK : fichiers et dossier déposés convertis');
      await new Promise((r) => setTimeout(r, 500));
    }
    for (const f of expected) console.log(isPdf(f) ? 'OK  ' : 'FAIL', f);
    finish(1, 'E2E DND ÉCHEC : aucun PDF produit après le dépôt');
  });
}
