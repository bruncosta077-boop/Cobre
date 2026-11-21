const { contextBridge, ipcRenderer, webFrame } = require('electron');
try {
  const saved = ipcRenderer.sendSync('preferences:bootstrap');
  for (const [key, value] of Object.entries(saved || {})) {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }
} catch {}
contextBridge.exposeInMainWorld('api', {
  version: () => ipcRenderer.invoke('app:version'),
  pick: () => ipcRenderer.invoke('pick'),
  cached: (dir) => ipcRenderer.invoke('cached', dir),
  scan: (dir) => ipcRenderer.invoke('scan', dir),
  lyrics: (p, m, n) => ipcRenderer.invoke('lyrics', p, m, n),
  cover: (p, a, b, net) => ipcRenderer.invoke('albumCover', p, a, b, net),
  revLoad: () => ipcRenderer.invoke('revLoad'),
  revSave: (all) => ipcRenderer.send('revSave', all),
  zoom: (f) => webFrame.setZoomFactor(f),
  plays: () => ipcRenderer.invoke('plays'),
  playAdd: (r) => ipcRenderer.send('playAdd', r),
  artistPhoto: (a, n) => ipcRenderer.invoke('artistPhoto', a, n),
  palette: (u) => ipcRenderer.invoke('palette', u),
  setBg: (v) => ipcRenderer.send('bg', v),
  quit: () => ipcRenderer.send('quit'),
  plLoad: () => ipcRenderer.invoke('plLoad'),
  plSave: (a) => ipcRenderer.send('plSave', a),
  hide: (p) => ipcRenderer.invoke('hide', p),
  unhide: () => ipcRenderer.invoke('unhide'),
  trash: (p) => ipcRenderer.invoke('trash', p),
  readFile: (p) => ipcRenderer.invoke('readFile', p),
  preferencesSave: (items) => ipcRenderer.invoke('preferences:save', items),
  preferencesExport: (items) => ipcRenderer.invoke('preferences:export', items),
  preferencesImport: () => ipcRenderer.invoke('preferences:import'),
  health: () => ipcRenderer.invoke('health'),
  coverMeta: (p, a, b) => ipcRenderer.invoke('coverMeta', p, a, b),
  coverUpgrade: (p, a, b) => ipcRenderer.invoke('coverUpgrade', p, a, b),
  coverUpscale: (p, a, b) => ipcRenderer.invoke('coverUpscale', p, a, b),
  coverPick: (p, a, b) => ipcRenderer.invoke('coverPick', p, a, b),
  coverReset: (p, a, b) => ipcRenderer.invoke('coverReset', p, a, b),
  ipc: {
    invoke: (c, ...a) => ipcRenderer.invoke(c, ...a),
    send: (c, ...a) => ipcRenderer.send(c, ...a),
    on: (c, cb) => ipcRenderer.on(c, (_e, ...a) => cb(...a))
  },
  devtools: () => ipcRenderer.send('devtools'),
  fullscreen: (v) => ipcRenderer.send('fs', v),
  open: (u) => ipcRenderer.send('open', u),
  onFs: (cb) => ipcRenderer.on('fs', (_e, v) => cb(v)),
  onKey: (cb) => ipcRenderer.on('key', (_e, k) => cb(k))
});
