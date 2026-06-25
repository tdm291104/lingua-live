// src/ipc.js
const { ipcMain } = require('electron');
const audio = require('./audio');
const { connect } = require('./deepgram');
const { translate, translateStreaming, analyze, qa } = require('./gpt');

const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;

const MIN_WORDS = 2; // don't stream-translate single mora/word fragments

let ws              = null;
let transcriptLines = [];
let currentLang     = 'en';
let currentSources  = { system: true, mic: true };
let shouldReconnect = false;
let connectionId    = 0;
let streamAbort     = null;

function isPunctOnly(text) {
  return text.replace(/[。、！？\.!?,\s]/g, '').length === 0;
}

function cleanJapanese(text) {
  return text.replace(/(?<=[　-鿿＀-￯])\s+(?=[　-鿿＀-￯])/g, '');
}

function cleanText(text, lang) {
  return lang === 'ja' ? cleanJapanese(text) : text;
}

function setup(mainWindow) {
  const send = (ch, data) => mainWindow.webContents.send(ch, data);

  function cancelStreaming() {
    if (streamAbort) { streamAbort.abort(); streamAbort = null; }
  }

  function startStreaming(text, lang) {
    cancelStreaming();
    streamAbort = new AbortController();
    const { signal } = streamAbort;
    send('subtitle:stream:start', {});
    translateStreaming(
      OPENAI_KEY, text, lang, transcriptLines.slice(-3),
      (token) => { if (!signal.aborted) send('subtitle:token', { token }); },
      signal
    ).catch(() => {});
  }

  function openDeepgram(lang) {
    if (ws) { try { ws.close(); } catch {} ws = null; }
    const myId = ++connectionId;
    ws = connect(lang, DEEPGRAM_KEY, {
      onOpen: () => send('status:connection', { state: 'connected' }),
      onInterim: (d) => {
        send('transcript:interim', d);
        const words = d.text.trim().split(/\s+/);
        if (words.length >= MIN_WORDS && !isPunctOnly(d.text)) {
          startStreaming(cleanText(d.text, lang), lang);
        }
      },
      onFinal: async (d) => {
        cancelStreaming();
        if (isPunctOnly(d.text)) return;
        const text = cleanText(d.text, lang);
        try {
          const translation = await translate(OPENAI_KEY, text, lang, transcriptLines.slice(-5));
          const line = { ...d, text, translation };
          transcriptLines.push(line);
          send('transcript:final', line);
        } catch {
          const line = { ...d, text, translation: '' };
          transcriptLines.push(line);
          send('transcript:final', line);
        }
      },
      onClose: () => {
        if (shouldReconnect && connectionId === myId) {
          send('status:connection', { state: 'reconnecting' });
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
    transcriptLines = [];
    currentLang     = lang;
    currentSources  = sources;
    shouldReconnect = true;
    cancelStreaming();
    openDeepgram(lang);
    restartAudio(sources);
    send('status:changed', { listening: true });
  });

  ipcMain.on('listen:stop', () => {
    shouldReconnect = false;
    cancelStreaming();
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
