'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { BrowserWindow } = require('electron');
const { extOf, HTML_EXT, IMAGE_EXT } = require('./formats');

function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf); // anciens fichiers .txt Windows
  }
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function textPage(text) {
  return `<!doctype html><meta charset="utf-8"><style>
    @page { size: A4; margin: 18mm; }
    body { margin: 0; font: 10.5pt/1.45 "DejaVu Sans Mono", Consolas, "Courier New", monospace;
           white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 4; }
  </style><body>${escapeHtml(text)}</body>`;
}

function imagePage(fileUrl) {
  return `<!doctype html><meta charset="utf-8"><style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; }
    img { display: block; margin: 0 auto; max-width: 190mm; max-height: 275mm; object-fit: contain; }
  </style><body><img src="${fileUrl}"></body>`;
}

/** Convertit un fichier texte / HTML / image en PDF avec le moteur Chromium d'Electron. */
async function convertWithChromium(source, outFile) {
  const ext = extOf(source);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e2pdf-'));
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false, contextIsolation: true },
  });

  try {
    let url;
    if (HTML_EXT.has(ext)) {
      url = pathToFileURL(source).href;
    } else {
      const html = IMAGE_EXT.has(ext)
        ? imagePage(pathToFileURL(source).href)
        : textPage(decodeText(fs.readFileSync(source)));
      const page = path.join(tmp, 'page.html');
      fs.writeFileSync(page, html, 'utf8');
      url = pathToFileURL(page).href;
    }
    await win.loadURL(url);
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: !HTML_EXT.has(ext),
    });
    fs.writeFileSync(outFile, pdf);
    return outFile;
  } finally {
    win.destroy();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { convertWithChromium };
