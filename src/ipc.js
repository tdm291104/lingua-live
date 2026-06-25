// src/ipc.js
const { ipcMain } = require('electron');
const audio = require('./audio');
const { connect } = require('./deepgram');
const { translate, analyze, qa } = require('./gpt');

const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;

const MAX_WORDS = 20;

let ws               = null;
let transcriptLines  = [];
let currentLang      = 'en';
let currentSources   = { system: true, mic: true };
let shouldReconnect  = false;
let connectionId     = 0;
let pending          = {}; // speakerId -> { timer, text, timestamp }

function isPunctOnly(text) {
  return text.replace(/[。、！？\.!?,\s]/g, '').length === 0;
}

// Remove spaces between Japanese characters (Deepgram splits every mora with spaces)
function cleanJapanese(text) {
  return text.replace(/(?<=[　-鿿＀-￯])\s+(?=[　-鿿＀-￯])/g, '');
}

// Longer wait for very short segments — gives more time to accumulate context
function mergeDelay(text) {
  const words = text.trim().split(/\s+/).length;
  if (words < 3)  return 2000;
  if (words < 10) return 500;
  return 200;
}

function setup(mainWindow) {
  const send = (ch, data) => mainWindow.webContents.send(ch, data);

  async function emitLine(speakerId, rawText, timestamp) {
    const text = currentLang === 'ja' ? cleanJapanese(rawText) : rawText;
    const contextLines = transcriptLines.slice(-5);
    try {
      const translation = await translate(OPENAI_KEY, text, currentLang, contextLines);
      const line = { speakerId, text, translation, timestamp };
      transcriptLines.push(line);
      send('transcript:final', line);
    } catch {
      const line = { speakerId, text, translation: '', timestamp };
      transcriptLines.push(line);
      send('transcript:final', line);
    }
  }

  function flushSpeaker(speakerId) {
    const p = pending[speakerId];
    if (!p) return;
    clearTimeout(p.timer);
    delete pending[speakerId];
    emitLine(Number(speakerId), p.text, p.timestamp);
  }

  function flushAll() {
    Object.keys(pending).forEach(flushSpeaker);
  }

  function resetPending() {
    Object.values(pending).forEach((p) => clearTimeout(p.timer));
    pending = {};
  }

  function handleSegment(d) {
    if (isPunctOnly(d.text)) return;

    const id = d.speakerId;
    if (pending[id]) {
      clearTimeout(pending[id].timer);
      pending[id].text += ' ' + d.text;
      if (pending[id].text.trim().split(/\s+/).length >= MAX_WORDS) {
        flushSpeaker(id);
        return;
      }
    } else {
      pending[id] = { text: d.text, timestamp: d.timestamp };
    }
    pending[id].timer = setTimeout(() => flushSpeaker(id), mergeDelay(pending[id].text));
  }

  function openDeepgram(lang) {
    if (ws) { try { ws.close(); } catch {} ws = null; }
    const myId = ++connectionId;
    ws = connect(lang, DEEPGRAM_KEY, {
      onOpen:   () => send('status:connection', { state: 'connected' }),
      onInterim: (d) => send('transcript:interim', d),
      onFinal: (d) => handleSegment(d),
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
    transcriptLines  = [];
    currentLang      = lang;
    currentSources   = sources;
    shouldReconnect  = true;
    resetPending();
    openDeepgram(lang);
    restartAudio(sources);
    send('status:changed', { listening: true });
  });

  ipcMain.on('listen:stop', () => {
    shouldReconnect = false;
    flushAll();
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
