'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  showItem: (p) => ipcRenderer.invoke('show-item', p),
  openItem: (p) => ipcRenderer.invoke('open-item', p),
  libreOfficeAvailable: () => ipcRenderer.invoke('libreoffice-available'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onJob: (cb) => ipcRenderer.on('job', (_e, job) => cb(job)),
});

// Le dépôt de fichiers est traité ici, dans le monde isolé du preload, et non dans la page :
// contextBridge transforme un FileList en simple objet sans `length` (Array.from n'y trouve alors
// aucun fichier), alors que webUtils.getPathForFile veut l'objet File d'origine. Un dépôt n'importe
// où dans la fenêtre est pris en compte ; la page ne s'occupe que du retour visuel.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const paths = Array.from(e.dataTransfer.files, (f) => webUtils.getPathForFile(f)).filter(Boolean);
  if (paths.length) ipcRenderer.invoke('add-files', paths);
});
