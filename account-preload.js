const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cobreAccount', {
  status: () => ipcRenderer.invoke('cid:status'),
  login: (d) => ipcRenderer.invoke('cid:login', d),
  logout: () => ipcRenderer.invoke('cid:logout'),
  devices: () => ipcRenderer.invoke('cid:devices'),
  authorizeDevice: (code) => ipcRenderer.invoke('cid:authorizeDevice', code),
  remove: (id) => ipcRenderer.invoke('cid:remove', id),
  close: () => ipcRenderer.invoke('cid:close'),
  never: () => ipcRenderer.invoke('cid:never'),
  onLink: (cb) => ipcRenderer.on('cid:link', (_e, v) => cb(v)),
});
