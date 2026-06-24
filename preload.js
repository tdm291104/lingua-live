const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  start:           (opts)     => ipcRenderer.send('listen:start', opts),
  stop:            ()         => ipcRenderer.send('listen:stop'),
  changeLang:      (lang)     => ipcRenderer.send('lang:change', { lang }),
  changeSources:   (sources)  => ipcRenderer.send('sources:change', { sources }),
  requestAnalysis: ()         => ipcRenderer.send('analyze:request'),
  ask:             (question) => ipcRenderer.send('qa:ask', { question }),

  onInterim:  (cb) => { ipcRenderer.removeAllListeners('transcript:interim');  ipcRenderer.on('transcript:interim',  (_, d) => cb(d)); },
  onFinal:    (cb) => { ipcRenderer.removeAllListeners('transcript:final');    ipcRenderer.on('transcript:final',    (_, d) => cb(d)); },
  onStatus:   (cb) => { ipcRenderer.removeAllListeners('status:changed');      ipcRenderer.on('status:changed',      (_, d) => cb(d)); },
  onAnalysis: (cb) => { ipcRenderer.removeAllListeners('analysis:result');     ipcRenderer.on('analysis:result',     (_, d) => cb(d)); },
  onQaAnswer: (cb) => { ipcRenderer.removeAllListeners('qa:answer');           ipcRenderer.on('qa:answer',           (_, d) => cb(d)); },
});
