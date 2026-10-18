'use strict';

const fs = require('fs');
const path = require('path');

function canWrite(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Détermine où enregistrer le PDF d'un fichier source, sans jamais écraser un fichier existant :
 * même dossier que la source (« rapport.docx » -> « rapport.pdf »), puis « rapport (1).pdf », etc.
 * Si le dossier source n'est pas inscriptible, repli sur `fallbackDir`.
 */
function resolveOutputPath(source, fallbackDir) {
  let dir = path.dirname(source);
  if (!canWrite(dir)) {
    dir = fallbackDir;
    fs.mkdirSync(dir, { recursive: true });
  }
  const base = path.basename(source, path.extname(source));
  let candidate = path.join(dir, `${base}.pdf`);
  for (let i = 1; fs.existsSync(candidate); i++) {
    candidate = path.join(dir, `${base} (${i}).pdf`);
  }
  return candidate;
}

module.exports = { resolveOutputPath };
