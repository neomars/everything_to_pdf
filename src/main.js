'use strict';

const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { ConversionQueue } = require('./queue');
const { convertWithChromium } = require('./chromium');
const { findLibreOffice } = require('./libreoffice');
const { OFFICE_EXT, ODF_EXT, TEXT_EXT, HTML_EXT, IMAGE_EXT } = require('./formats');

let win;
let queue;
const startupFiles = [];

// Les fichiers passés en argument (« Ouvrir avec… », ligne de commande) sont convertis directement.
const argFiles = (argv) => argv.slice(app.isPackaged ? 1 : 2).filter((a) => !a.startsWith('-'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const files = argFiles(argv);
    if (files.length && queue) queue.add(files);
  });

  startupFiles.push(...argFiles(process.argv));

  app.whenReady().then(() => {
    queue = new ConversionQueue({
      emit: (job) => win && !win.isDestroyed() && win.webContents.send('job', job),
      fallbackDir: path.join(app.getPath('documents'), 'PDF'),
      chromium: convertWithChromium,
    });

    ipcMain.handle('add-files', (_e, paths) => queue.add(Array.isArray(paths) ? paths : []));
    ipcMain.handle('pick-files', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Choisir les fichiers à convertir en PDF',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Documents (Office, OpenDocument, texte, HTML, images)', extensions: [...OFFICE_EXT, ...ODF_EXT, ...TEXT_EXT, ...HTML_EXT, ...IMAGE_EXT] },
          { name: 'Tous les fichiers', extensions: ['*'] },
        ],
      });
      if (!canceled) queue.add(filePaths);
    });
    ipcMain.handle('pick-folder', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Choisir un dossier à convertir en PDF',
        properties: ['openDirectory'],
      });
      if (!canceled) queue.add(filePaths);
    });
    ipcMain.handle('show-item', (_e, p) => shell.showItemInFolder(p));
    ipcMain.handle('open-item', (_e, p) => shell.openPath(p));
    ipcMain.handle('libreoffice-available', () => Boolean(findLibreOffice()));
    ipcMain.handle('open-external', (_e, url) => {
      if (/^https:\/\/www\.libreoffice\.org\//.test(url)) shell.openExternal(url);
    });

    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => queue && queue.dispose());
}

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 620,
    minWidth: 520,
    minHeight: 420,
    title: 'Everything to PDF',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('will-navigate', (e) => e.preventDefault()); // un dépôt mal ciblé ne doit pas ouvrir le fichier
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.once('did-finish-load', () => {
    if (startupFiles.length) queue.add(startupFiles);
  });
}
