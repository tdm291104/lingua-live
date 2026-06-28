const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  start:           (opts)     => ipcRenderer.send('listen:start', opts),
  stop:            ()         => ipcRenderer.send('listen:stop'),
  changeLang:      (lang)     => ipcRenderer.send('lang:change', { lang }),
  changeSources:   (sources)  => ipcRenderer.send('sources:change', { sources }),
  chat:            (message)  => ipcRenderer.send('ai:chat', { message }),

  onInterim:  (cb) => { ipcRenderer.removeAllListeners('transcript:interim');  ipcRenderer.on('transcript:interim',  (_, d) => cb(d)); },
  onFinal:    (cb) => { ipcRenderer.removeAllListeners('transcript:final');    ipcRenderer.on('transcript:final',    (_, d) => cb(d)); },
  onStatus:   (cb) => { ipcRenderer.removeAllListeners('status:changed');      ipcRenderer.on('status:changed',      (_, d) => cb(d)); },
  onChatToken: (cb) => { ipcRenderer.removeAllListeners('ai:token'); ipcRenderer.on('ai:token', (_, d) => cb(d)); },
  onChatDone:  (cb) => { ipcRenderer.removeAllListeners('ai:done');  ipcRenderer.on('ai:done',  ()     => cb());  },
  onChatError: (cb) => { ipcRenderer.removeAllListeners('ai:error'); ipcRenderer.on('ai:error', ()     => cb());  },
  onConnectionStatus: (cb) => { ipcRenderer.removeAllListeners('status:connection');   ipcRenderer.on('status:connection',   (_, d) => cb(d)); },
  onSubtitleStreamStart: (cb) => { ipcRenderer.removeAllListeners('subtitle:stream:start'); ipcRenderer.on('subtitle:stream:start', (_, d) => cb(d)); },
  onSubtitleStreamClear: (cb) => { ipcRenderer.removeAllListeners('subtitle:stream:clear'); ipcRenderer.on('subtitle:stream:clear', (_, d) => cb(d)); },
  onSubtitleCorrect:     (cb) => { ipcRenderer.removeAllListeners('subtitle:correct');      ipcRenderer.on('subtitle:correct',      (_, d) => cb(d)); },
  onSubtitleToken:       (cb) => { ipcRenderer.removeAllListeners('subtitle:token');        ipcRenderer.on('subtitle:token',        (_, d) => cb(d)); },
});
