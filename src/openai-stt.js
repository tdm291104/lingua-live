// src/openai-stt.js
const WebSocket = require('ws');

const WS_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';

const SPEECH_THRESHOLD = 500; // RMS amplitude (0–32767): above = speech
const SILENCE_MS = 600; // ms of quiet before committing audio buffer

// Sentence-ending punctuation for Japanese and English
const SENT_END = /[。！？!?]/;

// audio.js outputs 16 kHz; OpenAI Realtime requires ≥ 24 kHz.
function resample16to24(buf) {
  const inSamples  = buf.length / 2;
  const outSamples = Math.floor(inSamples * 3 / 2);
  const out        = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const pos  = (i * 2) / 3;
    const lo   = Math.floor(pos);
    const hi   = Math.min(lo + 1, inSamples - 1);
    const frac = pos - lo;
    const slo  = buf.readInt16LE(lo * 2);
    const shi  = buf.readInt16LE(hi * 2);
    const s    = Math.round(slo + frac * (shi - slo));
    out.writeInt16LE(Math.max(-32768, Math.min(32767, s)), i * 2);
  }
  return out;
}

function rmsEnergy(buf) {
  let sum = 0;
  const n = buf.length / 2;
  for (let i = 0; i < buf.length; i += 2) {
    const s = buf.readInt16LE(i);
    sum += s * s;
  }
  return Math.sqrt(sum / n);
}

function connect(lang, apiKey, { onInterim, onFinal, onClose, onOpen }) {
  const ws = new WebSocket(WS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const timestamp = () =>
    new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const langCode = lang === 'ja' ? 'ja' : 'en';
  const sep      = langCode === 'ja' ? '' : ' '; // Japanese has no word spaces
  const partials = new Map(); // item_id → accumulated delta text

  // Sentence buffer: accumulate completed fragments until sentence boundary
  let sentBuf = '';

  function emitSentence(text) {
    const t = text.trim();
    if (t) onFinal({ speakerId: 0, text: t, timestamp: timestamp() });
  }

  // Split sentBuf at the last sentence-ending punct and emit the complete part.
  // Keeps any trailing incomplete fragment in sentBuf for the next turn.
  function trySplit() {
    const match = sentBuf.match(/^([\s\S]+[。！？!?])\s*([\s\S]*)$/);
    if (!match) return;
    sentBuf = match[2].trim();
    emitSentence(match[1]);
  }

  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            // gpt-realtime-whisper: no server_vad — audio committed via client VAD below
            transcription: { model: 'gpt-realtime-whisper', language: langCode, delay: 'low' },
            turn_detection: null,
          },
        },
      },
    }));
    if (onOpen) onOpen();
  });

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg.toString()); } catch { return; }

    const ts = timestamp();

    if (data.type === 'error') {
      console.error('[openai-stt] server error:', JSON.stringify(data.error));
      return;
    }
    if (data.type === 'session.updated') {
      console.log('[openai-stt] session ready, model:', data.session?.audio?.input?.transcription?.model);
      return;
    }

    if (data.type === 'conversation.item.input_audio_transcription.delta') {
      const id      = data.item_id;
      const partial = (partials.get(id) || '') + (data.delta || '');
      partials.set(id, partial);
      // Live line = sentence buffer so far + current partial
      const liveText = sentBuf ? sentBuf + sep + partial : partial;
      if (liveText) onInterim({ speakerId: 0, text: liveText, timestamp: ts });
      return;
    }

    if (data.type === 'conversation.item.input_audio_transcription.completed') {
      const id       = data.item_id;
      partials.delete(id);
      const fragment = (data.transcript || '').trim();
      if (!fragment) return;

      // Append fragment to sentence buffer
      sentBuf = sentBuf ? sentBuf + sep + fragment : fragment;
      if (SENT_END.test(sentBuf)) trySplit();
    }
  });

  ws.on('close', (code, reason) => {
    sentBuf = '';
    console.log('[openai-stt] closed code=' + code, reason?.toString());
    onClose();
  });

  ws.on('error', (err) => {
    console.error('[openai-stt] ws error:', err.message);
    try { ws.terminate(); } catch {}
  });

  // Client-side VAD state
  let silenceTimer    = null;
  let bufferHasSpeech = false;

  const _send = ws.send.bind(ws);

  function commitBuffer() {
    if (!bufferHasSpeech || ws.readyState !== 1) return;
    bufferHasSpeech = false;
    silenceTimer    = null;
    _send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
  }

  ws.send = (data, ...rest) => {
    if (Buffer.isBuffer(data)) {
      if (ws.readyState !== 1) return;
      const resampled = resample16to24(data);
      _send(JSON.stringify({
        type:  'input_audio_buffer.append',
        audio: resampled.toString('base64'),
      }));
      if (rmsEnergy(resampled) > SPEECH_THRESHOLD) {
        bufferHasSpeech = true;
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(commitBuffer, SILENCE_MS);
      }
    } else {
      _send(data, ...rest);
    }
  };

  return ws;
}

module.exports = { connect };
