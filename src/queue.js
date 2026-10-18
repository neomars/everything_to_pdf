'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { engineFor } = require('./formats');
const { resolveOutputPath } = require('./outputPath');
const { convertWithLibreOffice } = require('./libreoffice');

/** Développe les dossiers en fichiers (récursif) et ignore les fichiers cachés. */
function expandPaths(inputs) {
  const files = [];
  const walk = (p) => {
    let st;
    try { st = fs.statSync(p); } catch { return; }
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(p).sort()) {
        if (!name.startsWith('.')) walk(path.join(p, name));
      }
    } else if (st.isFile() && !path.basename(p).startsWith('.') && !path.basename(p).startsWith('~$')) {
      files.push(p);
    }
  };
  inputs.forEach(walk);
  return files;
}

/**
 * File d'attente séquentielle : chaque fichier ajouté est converti automatiquement,
 * sans aucune action de l'utilisateur. `emit(job)` notifie l'interface de chaque changement d'état.
 */
class ConversionQueue {
  constructor({ emit, fallbackDir, chromium }) {
    this.emit = emit;
    this.fallbackDir = fallbackDir;
    this.chromium = chromium; // injecté : dépend d'Electron (absent des tests)
    this.pending = [];
    this.running = false;
    this.nextId = 1;
    this.tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e2pdf-lo-'));
  }

  add(inputs) {
    const files = expandPaths(inputs);
    for (const file of files) {
      const job = { id: this.nextId++, source: file, name: path.basename(file), status: 'pending' };
      this.pending.push(job);
      this.emit({ ...job });
    }
    this._run();
    return files.length;
  }

  async _run() {
    if (this.running) return;
    this.running = true;
    while (this.pending.length) {
      const job = this.pending.shift();
      job.status = 'running';
      this.emit({ ...job });
      try {
        job.output = await this._convert(job.source);
        if (job.output) job.status = 'done';
        else { job.status = 'skipped'; job.message = 'Déjà un PDF : ignoré.'; }
      } catch (e) {
        job.status = 'error';
        job.message = e.message;
      }
      this.emit({ ...job });
    }
    this.running = false;
    this.emit({ idle: true });
  }

  async _convert(source) {
    const engine = engineFor(source);
    if (engine === 'skip') return null;

    const finalPath = resolveOutputPath(source, this.fallbackDir);
    if (engine === 'chromium') return this.chromium(source, finalPath);

    // LibreOffice écrit dans un dossier temporaire, puis on place le PDF sous son nom final
    // (évite d'écraser un PDF existant et d'exposer un fichier à moitié écrit).
    const work = fs.mkdtempSync(path.join(this.tmpRoot, 'job-'));
    try {
      const produced = await convertWithLibreOffice(source, work, { profileDir: path.join(this.tmpRoot, 'profile') });
      try {
        fs.renameSync(produced, finalPath);
      } catch {
        fs.copyFileSync(produced, finalPath); // rename impossible entre disques
      }
      return finalPath;
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }

  dispose() {
    fs.rmSync(this.tmpRoot, { recursive: true, force: true });
  }
}

module.exports = { ConversionQueue, expandPaths };
