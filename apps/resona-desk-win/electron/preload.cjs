const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Engine & Transcribe
  checkHealth: () => ipcRenderer.invoke('engine:health'),
  getModels: () => ipcRenderer.invoke('engine:get_models'),
  startTranscription: (payload) => ipcRenderer.invoke('engine:transcribe', payload),
  getJobStatus: (jobId) => ipcRenderer.invoke('engine:job_status', jobId),
  openFileDialog: () => ipcRenderer.invoke('dialog:open_file'),
});
