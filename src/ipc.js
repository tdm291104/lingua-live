// src/ipc.js
const { ipcMain } = require('electron');
const audio = require('./audio');
const { connect } = require('./deepgram');
const { translate, analyze, qa } = require('./gpt');

const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;

let ws               = null;
let transcriptLines  = [];
let currentLang      = 'en';
let currentSources   = { system: true, mic: true };
let shouldReconnect  = false;
let connectionId     = 0;

function setup(mainWindow) {
  const send = (ch, data) => mainWindow.webContents.send(ch, data);

  function openDeepgram(lang) {
    if (ws) { try { ws.close(); } catch {} ws = null; }
    const myId = ++connectionId;
    ws = connect(lang, DEEPGRAM_KEY, {
      onInterim: (d) => send('transcript:interim', d),
      onFinal: async (d) => {
        try {
          const translation = await translate(OPENAI_KEY, d.text, lang);
          const line = { ...d, translation };
          transcriptLines.push(line);
          send('transcript:final', line);
        } catch {
          const line = { ...d, translation: '' };
          transcriptLines.push(line);
          send('transcript:final', line);
        }
      },
      onClose: () => {
        if (shouldReconnect && connectionId === myId) {
          setTimeout(() => openDeepgram(currentLang), 1500);
        }
      },
    });
  }

  function restartAudio(sources) {
    audio.stop();
    audio.start(
      sources,
      (chunk) => { if (ws?.readyState === 1) ws.send(chunk); },
      () => {}
    );
  }

  ipcMain.on('listen:start', (_, { sources, lang }) => {
    transcriptLines  = [];
    currentLang      = lang;
    currentSources   = sources;
    shouldReconnect  = true;
    openDeepgram(lang);
    restartAudio(sources);
    send('status:changed', { listening: true });
  });

  ipcMain.on('listen:stop', () => {
    shouldReconnect = false;
    audio.stop();
    if (ws) { try { ws.close(); } catch {} ws = null; }
    send('status:changed', { listening: false });
  });

  ipcMain.on('lang:change', (_, { lang }) => {
    currentLang = lang;
    if (ws) openDeepgram(lang);
  });

  ipcMain.on('sources:change', (_, { sources }) => {
    currentSources = sources;
    if (ws) restartAudio(sources);
  });

  ipcMain.on('analyze:request', async () => {
    try {
      const result = await analyze(OPENAI_KEY, transcriptLines);
      send('analysis:result', result);
    } catch {
      send('analysis:result', { summary: '', actions: [], replies: [] });
    }
  });

  ipcMain.on('qa:ask', async (_, { question }) => {
    try {
      const answer = await qa(OPENAI_KEY, question, transcriptLines);
      send('qa:answer', { answer });
    } catch {
      send('qa:answer', { answer: 'Lỗi kết nối — thử lại.' });
    }
  });
}

module.exports = setup;
