const { ipcMain } = require('electron');
const audio = require('./audio');
const { connect } = require('./openai-stt');
const { translate, translateStreaming, chat, predictIntent, isRefusal } = require('./gpt');

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const MIN_FINAL_WORDS     = 2;
const MIN_STREAMING_WORDS = 3;
const STREAM_DEBOUNCE_MS  = 200; // wait for interim to stabilise before starting GPT
const CORRECTION_THRESHOLD = 0.7; // Dice coefficient — replace if < 70% word overlap

let ws                   = null;
let transcriptLines      = [];
let currentLang          = 'ja';
let currentSources       = { system: true, mic: true };
let shouldReconnect      = false;
let connectionId         = 0;
let streamAbort          = null;
let streamingForText     = '';  // text the current GPT stream was started for
let interimDebounce      = null;
let lastStreamedTranslation = '';

function isPunctOnly(text) {
  return text.replace(/[。、！？\.!?,\s]/g, '').length === 0;
}

function cleanJapanese(text) {
  return text.replace(/(?<=[　-鿿＀-￯])\s+(?=[　-鿿＀-￯])/g, '');
}

function cleanText(text, lang) {
  return lang === 'ja' ? cleanJapanese(text) : text;
}

function detectLang(text, fallback) {
  if (/[぀-ヿ一-鿿]/.test(text)) return 'ja';
  if (/[a-zA-Z]{3,}/.test(text)) return 'en';
  return fallback;
}

function diceSimilarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const wa = new Set(a.split(/\s+/));
  const wb = new Set(b.split(/\s+/));
  const common = [...wa].filter((w) => wb.has(w)).length;
  return (2 * common) / (wa.size + wb.size);
}

function setup(mainWindow) {
  const send = (ch, data) => mainWindow.webContents.send(ch, data);

  function cancelStreaming() {
    clearTimeout(interimDebounce);
    interimDebounce = null;
    if (streamAbort) { streamAbort.abort(); streamAbort = null; }
    streamingForText = '';
  }

  function startStreaming(text, lang) {
    cancelStreaming();
    streamingForText = text;
    streamAbort = new AbortController();
    const { signal } = streamAbort;
    send('subtitle:stream:start', {});
    lastStreamedTranslation = '';
    translateStreaming(
      OPENAI_KEY, text, lang, transcriptLines.slice(-3),
      (token) => {
        if (!signal.aborted) {
          lastStreamedTranslation += token;
          send('subtitle:token', { token });
        }
      },
      signal
    ).then((full) => {
      if (full && !signal.aborted && isRefusal(full, text)) {
        send('subtitle:stream:clear', {});
        lastStreamedTranslation = '';
      }
    }).catch(() => {});
  }

  function scheduleStreaming(text, lang) {
    const detectedLang = detectLang(text, lang);
    const cleaned      = cleanText(text, detectedLang);

    // If already streaming and new text only grew slightly — let stream continue
    if (streamAbort && streamingForText) {
      const prevWords = streamingForText.trim().split(/\s+/).length;
      const newWords  = cleaned.trim().split(/\s+/).length;
      if (newWords <= prevWords + 2) return;
    }

    clearTimeout(interimDebounce);
    interimDebounce = setTimeout(() => startStreaming(cleaned, detectedLang), STREAM_DEBOUNCE_MS);
  }

  function openDeepgram(lang) {
    if (ws) { try { ws.close(); } catch {} ws = null; }
    const myId = ++connectionId;
    ws = connect(lang, OPENAI_KEY, {
      onOpen: () => send('status:connection', { state: 'connected' }),
      onInterim: (d) => {
        send('transcript:interim', d);
        const detectedLang = detectLang(d.text, lang);
        const contentLen = detectedLang === 'ja'
          ? d.text.trim().replace(/[\s。、！？\.!?,]/g, '').length
          : d.text.trim().split(/\s+/).length;
        if (contentLen >= MIN_STREAMING_WORDS && !isPunctOnly(d.text)) {
          scheduleStreaming(d.text, lang);
        }
      },
      onFinal: async (d) => {
        cancelStreaming();
        if (isPunctOnly(d.text)) return;

        const detectedLang = detectLang(d.text, lang);
        // Japanese has no word spaces — count non-punct chars; English counts words
        const contentLen = detectedLang === 'ja'
          ? d.text.trim().replace(/[\s。、！？\.!?,]/g, '').length
          : d.text.trim().split(/\s+/).length;
        if (contentLen < MIN_FINAL_WORDS) return;

        const text = cleanText(d.text, detectedLang);

        const lineIndex = transcriptLines.length;
        const line = { ...d, text, translation: '' };
        transcriptLines.push(line);
        send('transcript:final', line);
        lastStreamedTranslation = '';

        try {
          const context = transcriptLines.slice(Math.max(0, lineIndex - 5), lineIndex);
          const translation = await translate(OPENAI_KEY, text, detectedLang, context);
          if (translation) {
            transcriptLines[lineIndex].translation = translation;
            send('subtitle:correct', { translation, lineIndex });
          }
        } catch {}
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
    transcriptLines      = [];
    currentLang          = lang;
    currentSources       = sources;
    shouldReconnect      = true;
    lastStreamedTranslation = '';
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

  ipcMain.on('ai:predict', async (_, { partial }) => {
    try {
      const result = await predictIntent(OPENAI_KEY, partial, transcriptLines.slice(-3));
      send('ai:predict:result', { partial, result });
    } catch {
      send('ai:predict:result', { partial, result: '' });
    }
  });

  ipcMain.on('ai:chat', async (_, { message }) => {
    const abort = new AbortController();
    try {
      await chat(
        OPENAI_KEY,
        message,
        transcriptLines,
        currentLang,
        (token) => send('ai:token', { token }),
        abort.signal,
      );
    } catch {
      send('ai:error', {});
    }
    send('ai:done', {});
  });
}

module.exports = setup;
