const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.0.0',
});
