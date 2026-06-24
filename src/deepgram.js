// src/deepgram.js
const WebSocket = require('ws');

function buildUrl(lang) {
  return (
    'wss://api.deepgram.com/v1/listen' +
    '?model=nova-3' +
    `&language=${lang}` +
    '&encoding=linear16' +
    '&sample_rate=16000' +
    '&channels=1' +
    '&interim_results=true' +
    '&punctuate=true' +
    '&endpointing=50' +
    '&diarize_model=latest'
  );
}

function groupWordsBySpeaker(words) {
  if (!words || words.length === 0) return [];
  const segments = [];
  let current = { speakerId: words[0].speaker, words: [words[0].word] };
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w.speaker === current.speakerId) {
      current.words.push(w.word);
    } else {
      segments.push({ speakerId: current.speakerId, text: current.words.join(' ') });
      current = { speakerId: w.speaker, words: [w.word] };
    }
  }
  segments.push({ speakerId: current.speakerId, text: current.words.join(' ') });
  return segments;
}

function connect(lang, apiKey, { onInterim, onFinal, onClose }) {
  const url = buildUrl(lang);
  const ws = new WebSocket(url, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  let lastFinalHash = '';

  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    const alt = data?.channel?.alternatives?.[0];
    if (!alt || !alt.transcript) return;

    const timestamp = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!data.is_final) {
      onInterim({ speakerId: 0, text: alt.transcript, timestamp });
      return;
    }

    const h = alt.transcript.trim().toLowerCase();
    if (h === lastFinalHash) return;
    lastFinalHash = h;

    const segments = groupWordsBySpeaker(alt.words || []);
    if (segments.length === 0) {
      segments.push({ speakerId: 0, text: alt.transcript });
    }
    segments.forEach((seg) => onFinal({ ...seg, timestamp }));
  });

  ws.on('close', onClose);
  ws.on('error', () => { try { ws.terminate(); } catch {} });
  return ws;
}

module.exports = { buildUrl, groupWordsBySpeaker, connect };
