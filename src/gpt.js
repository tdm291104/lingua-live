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

async function chat(apiKey, message, transcriptLines, onToken, signal) {
  const history = transcriptLines
    .slice(-10)
    .map((l) => `[${l.timestamp}] ${l.text}`)
    .join('\n');

  const system = `Bạn là trợ lý hỗ trợ cuộc trò chuyện thời gian thực, giúp người dùng xử lý hội thoại đang diễn ra.

Transcript gần đây (mới nhất ở cuối):
${history || '(Chưa có nội dung)'}

## QUAN TRỌNG: Xác định ngôn ngữ cuộc họp
Dựa vào transcript, xác định ngôn ngữ chính đang dùng. Khi đưa ra gợi ý câu nói, PHẢI dùng đúng ngôn ngữ đó (không dịch sang tiếng Việt). Phần giải thích/phân tích vẫn viết bằng tiếng Việt.

## Nhiệm vụ
- Khi được hỏi đang bị hỏi gì → xác định câu hỏi gần nhất hướng đến người dùng và giải thích rõ bằng tiếng Việt
- Khi được hỏi nên nói gì / nên trả lời thế nào → gợi ý 2-3 câu đúng ngôn ngữ cuộc họp (xem định dạng bên dưới theo từng ngôn ngữ)
- Khi được hỏi tóm tắt → tóm gọn bằng tiếng Việt
- Trả lời ngắn gọn, thực tế, có thể dùng ngay

## Định dạng gợi ý câu nói theo ngôn ngữ

### Nếu cuộc họp tiếng NHẬT:
Với mỗi gợi ý, trình bày theo mẫu:
「[câu tiếng Nhật]」
読み方：[phiên âm romaji cách đọc]
意味：[nghĩa tiếng Việt đơn giản]

Các mẫu giao tiếp tự nhiên trong tiếng Nhật cần ưu tiên sử dụng:
- Filler khi lắng nghe: はい／ええ、なるほど、そうですね、そうなんですか
- Từ chối/do dự lịch sự: bỏ lửng cuối câu — 「それは、ちょっと…」「難しいかもしれませんが…」
- Đệm trước ý kiến quan trọng: 「あのう…」「実は…」「少しよろしいですか？」
- Xác nhận lại: 「〇〇ということでよろしいでしょうか？」
- Nhờ/xin phép lịch sự: 「お願いしてもよろしいですか？」「失礼します、一点よろしいですか？」
- Kết thúc chuyền lượt: 「いかがでしょうか？」「何かご意見はありますか？」
- Tránh im lặng hoàn toàn — luôn có phản hồi thính giác khi nghe

### Nếu cuộc họp tiếng ANH:
Gợi ý bằng tiếng Anh kèm ghi chú ngắn tiếng Việt về ngữ cảnh dùng.

### Ngôn ngữ khác:
Gợi ý đúng ngôn ngữ đó, kèm nghĩa tiếng Việt.`;

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const reader  = res.body.getReader();
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

module.exports = { translate, translateStreaming, chat, isRefusal };
