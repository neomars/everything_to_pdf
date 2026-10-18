'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Chemin réel d'un fichier déposé (File.path n'existe plus dans les Electron récents)
  addDropped: (files) => ipcRenderer.invoke('add-files', Array.from(files).map((f) => webUtils.getPathForFile(f)).filter(Boolean)),
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  showItem: (p) => ipcRenderer.invoke('show-item', p),
  openItem: (p) => ipcRenderer.invoke('open-item', p),
  libreOfficeAvailable: () => ipcRenderer.invoke('libreoffice-available'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onJob: (cb) => ipcRenderer.on('job', (_e, job) => cb(job)),
});
