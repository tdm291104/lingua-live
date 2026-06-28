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
  if (translation.length > original.length * 5 && translation.length > 80) return true;
  return false;
}

const LANG_LABEL_EN = { ja: 'Japanese', ko: 'Korean', zh: 'Chinese', fr: 'French', es: 'Spanish', de: 'German', vi: 'Vietnamese' };
const LANG_LABEL_VI = { ja: 'tiếng Nhật', ko: 'tiếng Hàn', zh: 'tiếng Trung', fr: 'tiếng Pháp', es: 'tiếng Tây Ban Nha', de: 'tiếng Đức', vi: 'tiếng Việt' };

async function translate(apiKey, text, lang, contextLines = []) {
  const langLabel = LANG_LABEL_EN[lang] ?? 'English';
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

// ── Language-specific style guides (used in chat prompt) ──
const STYLE_GUIDE = {
  ja: `
## Tiếng Nhật — Tư duy giao tiếp

**Triết lý:** Ưu tiên hài hòa (和) — câu nói phải giữ thể diện cho cả hai phía. Ý thực được truyền qua cách nói vòng, bỏ lửng, và những gì không nói thẳng.

**Keigo — chọn mức theo quan hệ và bối cảnh:**
- Teineigo (です/ます): mặc định cho hầu hết tình huống
- Sonkeigo (お〜になる, いらっしゃる…): nâng hành động của người kia
- Kenjougo (お〜する, いたす, ております…): hạ bản thân để tôn trọng

**Điều chỉnh theo ngữ cảnh:** Casual với đồng nghiệp thân → teineigo đơn giản. Họp chính thức với khách hàng/cấp trên → sonkeigo/kenjougo đầy đủ.

**Kỹ năng cốt lõi:**
- Lắng nghe chủ động (あいづち): phát tín hiệu liên tục khi người kia nói
- Từ chối: không bao giờ "no" trực tiếp — bỏ lửng, dùng câu điều kiện, hoặc ám chỉ
- Ngắt lời: luôn xin phép trước
- Xác nhận: paraphrase ý người kia rồi mới hỏi

**終助詞 — particle cuối câu:**
- ね: tìm đồng thuận, kết nối — dùng thoải mái
- よ: thông báo thông tin mới — cẩn thận, tránh dùng với điều người kia đã biết
- よね: xác nhận điều mình khá chắc — an toàn nhất trong business
- な/ぞ/ぜ/わ: quá thô/masculine — không dùng trong môi trường công sở
Thêm particle phù hợp vào cuối câu để tự nhiên hơn.

**Mẫu ngữ pháp — chọn đúng theo ý định:**

*Hành động* (mô tả việc làm, yêu cầu, nghĩa vụ, kinh nghiệm):
- ～てください → yêu cầu lịch sự
- ～てもいい → xin phép / cho phép
- ～なければならない → bắt buộc, phải làm
- ～ている → đang diễn ra / trạng thái kéo dài
- ～たことがある → từng có kinh nghiệm

*Cảm xúc / ý kiến* (mong muốn, suy đoán, cảm nhận, quan điểm):
- ～たい → muốn làm (ngôi 1)
- ～ほしい → muốn có / muốn người khác làm
- ～そう → trông có vẻ (cảm quan trực tiếp)
- ～ようだ → có vẻ (suy luận khách quan)
- ～かもしれない → có thể (~50% chắc)
- ～らしい → nghe nói / có vẻ (thông tin từ ngoài)
- ～と思う → tôi nghĩ (ý kiến cá nhân)
- ～気がする → tôi có cảm giác (linh cảm)

**Số và thời gian:** Khi câu có số, luôn thêm hiragana đọc trong ngoặc đơn ngay sau.

**Format:** • 「câu」（hiragana toàn câu） — nghĩa VN ngắn`,

  en: `
## Tiếng Anh — Tư duy giao tiếp

**Triết lý:** Trực tiếp nhưng có đệm — nói rõ ý nhưng luôn giảm áp lực cho người nghe. Tự tin mà không áp đặt.

**Điều chỉnh tone theo ngữ cảnh:**
- Casual: câu ngắn, contractions (I'd, we'll), gần gũi
- Professional: câu đầy đủ, dùng would/could/might để soften
- Assertive khi cần: nói thẳng, không hedge quá nhiều

**Kỹ năng cốt lõi:**
- Bày tỏ ý kiến: dùng hedging (I think/believe/feel) để tránh áp đặt
- Yêu cầu: dùng conditional để soften (Would it be possible to…)
- Ngắt lời: xin phép trước
- Phản biện: ghi nhận quan điểm người kia trước, rồi mới đưa góc nhìn khác
- Xây dựng ý: kết nối với người nói trước thay vì nói độc lập

**Format:** • "câu" — nghĩa VN ngắn`,
};

function buildChatSystem(lang, langLabel, history) {
  const styleGuide = STYLE_GUIDE[lang] ?? `
## Ngôn ngữ khác
Gợi ý đúng ngôn ngữ cuộc họp (${langLabel}), kèm nghĩa tiếng Việt.`;

  return `Bạn là trợ lý hỗ trợ hội thoại thời gian thực. Ngôn ngữ: ${langLabel}.

Transcript gần đây:
${history || '(Chưa có — trả lời theo tình huống chung)'}

━━━ XỬ LÝ ━━━

**Mode A — Xin câu** (tin nhắn bắt đầu bằng > hoặc là ý định ngắn không dấu ?):
Hiểu ý định thực sự, tạo 1 câu duy nhất để NGƯỜI DÙNG NÓI — diễn đạt đúng ý đó từ góc nhìn của họ, mức lịch sự phù hợp ngữ cảnh mô tả. Không giải thích, không dẫn nhập.

**Mode B — Hỏi / phân tích** (có dấu ? hoặc yêu cầu giải thích/tóm tắt/phân tích):
Phân tích transcript và trả lời câu hỏi bằng tiếng Việt. Không tự động dịch câu hỏi sang ngôn ngữ cuộc họp — chỉ thêm 1 câu gợi ý nếu câu hỏi rõ ràng yêu cầu.

Giải thích luôn bằng tiếng Việt. Câu gợi ý dùng ngôn ngữ cuộc họp.

${styleGuide}`;
}

async function chat(apiKey, message, transcriptLines, lang, onToken, signal) {
  const history = transcriptLines
    .slice(-10)
    .map((l) => `[${l.timestamp}] ${l.text}`)
    .join('\n');

  const langLabel = LANG_LABEL_VI[lang] ?? 'tiếng Anh';
  const system = buildChatSystem(lang, langLabel, history);

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
