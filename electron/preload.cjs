const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deviceHardware', {
  getSnapshot: () => ipcRenderer.invoke('device:get-hardware-snapshot'),
  getOverview: () => ipcRenderer.invoke('device:get-overview'),
  getCompute: () => ipcRenderer.invoke('device:get-compute'),
  getApplications: () => ipcRenderer.invoke('device:get-applications'),
  getMemory: () => ipcRenderer.invoke('device:get-memory'),
  getBoard: () => ipcRenderer.invoke('device:get-board'),
  getDisplay: () => ipcRenderer.invoke('device:get-display'),
  getStorage: () => ipcRenderer.invoke('device:get-storage'),
  getConnectivity: () => ipcRenderer.invoke('device:get-connectivity'),
  getDevices: () => ipcRenderer.invoke('device:get-devices'),
});
