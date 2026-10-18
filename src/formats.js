'use strict';

const path = require('path');

// Formats rendus directement par le moteur Chromium intégré (aucune dépendance externe).
const TEXT_EXT = new Set(['txt', 'log', 'md', 'csv', 'tsv', 'ini', 'cfg', 'conf', 'json', 'xml', 'yml', 'yaml']);
const HTML_EXT = new Set(['html', 'htm', 'xhtml']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']);

// Formats Microsoft Office (Word, Excel, PowerPoint, Publisher, Visio), anciens et récents,
// avec macros (m) et modèles (t) : convertis par LibreOffice.
const OFFICE_EXT = new Set([
  'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm',        // Word
  'rtf', 'wps', 'wpd', 'mht', 'mhtml',                 // texte enrichi / Works / WordPerfect / page web archivée
  'xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm', // Excel
  'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'ppsm', 'pot', 'potx', 'potm', // PowerPoint
  'pub', 'vsd', 'vsdx',                                // Publisher, Visio
]);
// Formats OpenDocument / LibreOffice.
const ODF_EXT = new Set(['odt', 'ott', 'fodt', 'ods', 'ots', 'fods', 'odp', 'otp', 'fodp', 'odg', 'odf', 'sxw', 'sxc', 'sxi']);

function extOf(file) {
  return path.extname(file).slice(1).toLowerCase();
}

/**
 * Choisit le moteur de conversion d'un fichier :
 *  - 'chromium'    : texte, HTML, images
 *  - 'skip'        : déjà un PDF
 *  - 'libreoffice' : Office, OpenDocument et tout le reste (formats inconnus compris)
 */
function engineFor(file) {
  const ext = extOf(file);
  if (ext === 'pdf') return 'skip';
  if (TEXT_EXT.has(ext) || HTML_EXT.has(ext) || IMAGE_EXT.has(ext)) return 'chromium';
  return 'libreoffice';
}

module.exports = { OFFICE_EXT, ODF_EXT, TEXT_EXT, HTML_EXT, IMAGE_EXT, extOf, engineFor };
