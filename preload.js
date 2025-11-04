const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onGlobalKeydown: (cb) => ipcRenderer.on('global-keydown', (event, data) => cb(data)),
  debugSend: (msg) => ipcRenderer.send('renderer-log', msg)
})
