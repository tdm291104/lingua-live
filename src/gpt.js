// src/gpt.js
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function callGPT(apiKey, messages, temperature) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature, messages }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

const REFUSAL_PHRASES = ['không thể dịch', 'không có ngữ cảnh', 'cung cấp thêm', 'xin lỗi,', 'không đủ ngữ cảnh'];

function isRefusal(translation, original) {
  if (!translation) return false;
  const lower = translation.toLowerCase();
  if (REFUSAL_PHRASES.some((p) => lower.includes(p))) return true;
  // response much longer than original and doesn't look like a translation
  if (translation.length > original.length * 5 && translation.length > 80) return true;
  return false;
}

async function translate(apiKey, text, lang, contextLines = []) {
  const langLabel = lang === 'ja' ? 'Japanese' : 'English';
  const ctx = contextLines.length
    ? '\n\nContext (recent lines):\n' +
      contextLines
        .filter((l) => l.translation)
        .map((l) => `- ${l.text} → ${l.translation}`)
        .join('\n')
    : '';
  const result = await callGPT(
    apiKey,
    [
      { role: 'system', content: `Translate ${langLabel} to Vietnamese naturally. Return only the translation.${ctx}` },
      { role: 'user', content: text },
    ],
    0.2
  );
  return isRefusal(result, text) ? '' : result;
}

async function analyze(apiKey, transcriptLines) {
  const history = transcriptLines
    .map((l) => `Speaker ${l.speakerId} [${l.timestamp}]: ${l.text}`)
    .join('\n');
  const raw = await callGPT(
    apiKey,
    [
      {
        role: 'system',
        content:
          'Bạn là trợ lý phân tích cuộc họp. Dựa vào transcript sau, hãy trả về JSON hợp lệ (không markdown): {"summary": string, "actions": string[], "replies": [{"q": string, "a": string}]}. Trả lời bằng tiếng Việt.',
      },
      { role: 'user', content: history },
    ],
    0.3
  );
  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return { summary: raw, actions: [], replies: [] };
  } catch {
    return { summary: raw, actions: [], replies: [] };
  }
}

async function qa(apiKey, question, transcriptLines) {
  const history = transcriptLines
    .map((l) => `Speaker ${l.speakerId} [${l.timestamp}]: ${l.text}`)
    .join('\n');
  return callGPT(
    apiKey,
    [
      { role: 'system', content: `Trợ lý họp. Dựa vào transcript sau:\n${history}\nTrả lời ngắn gọn bằng tiếng Việt.` },
      { role: 'user', content: question },
    ],
    0.5
  );
}

async function translateStreaming(apiKey, text, lang, contextLines = [], onToken, signal) {
  const langLabel = lang === 'ja' ? 'Japanese' : 'English';
  const ctx = contextLines
    .filter((l) => l.translation)
    .map((l) => `- ${l.text} → ${l.translation}`)
    .join('\n');
  const systemContent =
    `Translate ${langLabel} to Vietnamese naturally. Return only the translation.` +
    (ctx ? `\n\nContext:\n${ctx}` : '');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      stream: true,
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || signal?.aborted) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return full;
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content;
          if (token) { full += token; onToken(token); }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
  return full;
}

module.exports = { translate, translateStreaming, analyze, qa, isRefusal };
