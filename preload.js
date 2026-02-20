const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storage', {
  get: (key, shared) => ipcRenderer.invoke('storage-get', key, shared),
  set: (key, value, shared) => ipcRenderer.invoke('storage-set', key, value, shared),
  delete: (key, shared) => ipcRenderer.invoke('storage-delete', key, shared),
  list: (prefix, shared) => ipcRenderer.invoke('storage-list', prefix, shared),
});
