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

async function translate(apiKey, text, lang, contextLines = []) {
  const langLabel = lang === 'ja' ? 'Japanese' : 'English';
  const ctx = contextLines.length
    ? '\n\nContext (recent lines):\n' +
      contextLines
        .filter((l) => l.translation)
        .map((l) => `- ${l.text} → ${l.translation}`)
        .join('\n')
    : '';
  return callGPT(
    apiKey,
    [
      { role: 'system', content: `Translate ${langLabel} to Vietnamese naturally. Return only the translation.${ctx}` },
      { role: 'user', content: text },
    ],
    0.2
  );
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

module.exports = { translate, analyze, qa };
