const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mini', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  cmd: (c) => ipcRenderer.send('miniCmd', c),
  close: () => ipcRenderer.send('miniClose'),
  show: () => ipcRenderer.send('miniShow')
});
