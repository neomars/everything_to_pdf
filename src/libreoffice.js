'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const TIMEOUT_MS = 3 * 60 * 1000;

function candidates() {
  const list = [];
  if (process.env.LIBREOFFICE_PATH) list.push(process.env.LIBREOFFICE_PATH);

  if (process.platform === 'win32') {
    for (const root of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]) {
      if (root) list.push(path.join(root, 'LibreOffice', 'program', 'soffice.exe'));
    }
  } else if (process.platform === 'darwin') {
    list.push('/Applications/LibreOffice.app/Contents/MacOS/soffice');
  } else {
    list.push(
      '/usr/bin/soffice',
      '/usr/bin/libreoffice',
      '/usr/local/bin/soffice',
      '/usr/lib/libreoffice/program/soffice',
      '/snap/bin/libreoffice',
    );
    // /opt/libreoffice7.6/program/soffice, /opt/libreofficeX.Y/...
    try {
      for (const d of fs.readdirSync('/opt')) {
        if (/^libreoffice/i.test(d)) list.push(path.join('/opt', d, 'program', 'soffice'));
      }
    } catch { /* pas de /opt */ }
  }

  // Dernier recours : le PATH
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const name of process.platform === 'win32' ? ['soffice.exe'] : ['soffice', 'libreoffice']) {
      if (dir) list.push(path.join(dir, name));
    }
  }
  return list;
}

let cached;
function findLibreOffice() {
  if (cached && fs.existsSync(cached)) return cached;
  cached = candidates().find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  return cached || null;
}

/**
 * Convertit `source` en PDF dans `outDir` avec LibreOffice (mode headless).
 * Retourne le chemin du PDF produit. Les appels doivent être séquentiels :
 * une instance LibreOffice ne partage pas son profil avec une autre.
 */
function convertWithLibreOffice(source, outDir, { profileDir } = {}) {
  const soffice = findLibreOffice();
  if (!soffice) {
    const err = new Error('LibreOffice est introuvable. Installez-le (https://www.libreoffice.org/download/) pour convertir ce type de fichier.');
    err.code = 'NO_LIBREOFFICE';
    return Promise.reject(err);
  }

  const profile = profileDir || path.join(os.tmpdir(), 'everything-to-pdf-lo-profile');
  const profileUrl = 'file://' + (process.platform === 'win32' ? '/' : '') + profile.replace(/\\/g, '/');
  const args = [
    '--headless', '--invisible', '--norestore', '--nolockcheck', '--nodefault', '--nologo',
    `-env:UserInstallation=${profileUrl}`,
    '--convert-to', 'pdf',
    '--outdir', outDir,
    source,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(soffice, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdout.on('data', () => {});

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Délai dépassé (3 min) : la conversion a été interrompue.'));
    }, TIMEOUT_MS);

    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const produced = path.join(outDir, path.basename(source, path.extname(source)) + '.pdf');
      if (fs.existsSync(produced)) return resolve(produced);
      reject(new Error(`Échec de la conversion (code ${code}). ${stderr.trim() || 'Fichier illisible ou format non pris en charge.'}`));
    });
  });
}

module.exports = { findLibreOffice, convertWithLibreOffice };
