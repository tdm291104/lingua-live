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
## Phong cách tiếng Nhật

**Triết lý:** Ưu tiên hài hòa (和) — giữ thể diện cho cả hai phía. Ý thực truyền qua cách nói vòng, bỏ lửng, và những gì không nói thẳng.

**Keigo — chọn mức theo quan hệ:**
- Teineigo (です/ます): mặc định cho hầu hết tình huống
- Sonkeigo (お〜になる, いらっしゃる…): nâng hành động của người kia
- Kenjougo (お〜する, いたす, ております…): hạ bản thân để tôn trọng
- Casual với đồng nghiệp thân → teineigo đơn giản; họp chính thức với khách/cấp trên → sonkeigo/kenjougo

**Kỹ năng cốt lõi:**
- Lắng nghe (あいづち): phát tín hiệu liên tục khi người kia nói
- Từ chối: không bao giờ nói "no" thẳng — bỏ lửng, dùng câu điều kiện, hoặc ám chỉ
- Ngắt lời: luôn xin phép trước
- Xác nhận: paraphrase ý người kia rồi mới hỏi

**Particle cuối câu (終助詞):**
- ね: tìm đồng thuận, tạo kết nối → dùng thoải mái
- よ: thông báo thông tin mới → cẩn thận, không dùng với điều người kia đã biết
- よね: xác nhận điều mình khá chắc → an toàn nhất trong business
- な/ぞ/ぜ/わ: quá thô/masculine → không dùng trong môi trường công sở

**Mẫu ngữ pháp theo ý định:**

Hành động (yêu cầu, nghĩa vụ, kinh nghiệm):
- ～てください → yêu cầu lịch sự
- ～てもいい → xin phép / cho phép
- ～なければならない → bắt buộc
- ～ている → đang diễn ra / trạng thái kéo dài
- ～たことがある → từng có kinh nghiệm

Cảm xúc / ý kiến (mong muốn, suy đoán, quan điểm):
- ～たい → muốn làm (ngôi 1)
- ～ほしい → muốn có / muốn người khác làm
- ～そう → trông có vẻ (quan sát trực tiếp)
- ～ようだ → có vẻ (suy luận khách quan)
- ～かもしれない → có thể (~50% chắc)
- ～らしい → nghe nói (thông tin từ ngoài)
- ～と思う → tôi nghĩ (ý kiến cá nhân)
- ～気がする → tôi có cảm giác (linh cảm)`,

  en: `
## Phong cách tiếng Anh

**Triết lý:** Trực tiếp nhưng có đệm — nói rõ ý nhưng giảm áp lực cho người nghe.

**Tone theo ngữ cảnh:**
- Casual: câu ngắn, dùng contractions (I'd, we'll)
- Professional: câu đầy đủ, dùng would/could/might để soften
- Assertive khi cần: nói thẳng, không hedge quá nhiều

**Kỹ năng cốt lõi:**
- Bày tỏ ý kiến: dùng hedging (I think/believe/feel)
- Yêu cầu: dùng conditional (Would it be possible to…)
- Ngắt lời: xin phép trước
- Phản biện: ghi nhận quan điểm người kia trước, rồi mới đưa góc nhìn khác`,
};

function buildChatSystem(lang, langLabel, history) {
  const styleGuide = STYLE_GUIDE[lang] ?? `Gợi ý bằng ${langLabel}, kèm nghĩa tiếng Việt ngắn.`;
  const furiganaRules = lang === 'ja' ? `
### Furigana — bắt buộc cho mọi output tiếng Nhật
Viết tất cả kanji và số+counter dạng {kanji|hiragana}. KHÔNG annotate hiragana, katakana, romaji.
❌ Sai: 7月しちがつ / チャットボットちゃっとぼっと
✅ Đúng: {7月|しちがつ} / チャットボット (giữ nguyên)
` : '';

  return `Bạn là trợ lý hội thoại thời gian thực. Ngôn ngữ cuộc họp: ${langLabel}.

Transcript gần đây:
${history || '(Chưa có — phản hồi theo tình huống chung)'}

---

## Phân loại tin nhắn

- Bắt đầu bằng ">" → Mode A
- Câu hỏi hoặc yêu cầu phân tích → Mode B

---

## Mode A — Tạo câu để nói

Nhiệm vụ: hiểu ý định thực sự của người dùng, tạo câu hoàn chỉnh để họ nói — đúng góc nhìn ngôi 1, mức lịch sự phù hợp ngữ cảnh.

Tư duy 5W1H: KHÔNG bao giờ chỉ dịch thẳng input — luôn mở rộng bằng cách thêm chi tiết cụ thể (What cụ thể, How thực hiện, kết quả đạt được). Nếu input đã dài, vẫn phải làm giàu nội dung, không rút gọn. Loại bỏ các cụm thừa như "trong cuộc họp này", "hôm nay" nếu ngữ cảnh đã hiển nhiên.
${furiganaRules}
Output — đúng 1 dòng, không thêm câu hỏi hay giải thích:
• 「câu」 — nghĩa tiếng Việt ngắn

Ví dụ:
Input: >vừa thi JLPT xong
Output: • 「{昨日|きのう}JLPTを{受|う}けたばかりです。」 — Hôm qua vừa thi xong JLPT.

Input: >mới bảo vệ luận văn ngày 2/7
Output: • 「{7月|しちがつ}{2日|ふつか}に{卒業論文|そつぎょうろんぶん}の{発表|はっぴょう}を{無事|ぶじ}に{終|お}えることができました。」 — Ngày 2/7 vừa bảo vệ luận văn thành công.

Input: >tôi có kinh nghiệm làm chatbot
Output: • 「{実際|じっさい}のサービスで{動|うご}くチャットボットの{開発|かいはつ}に{携|たずさ}わった{経験|けいけん}があり、{主|おも}に{会話設計|かいわせっけい}と{応答品質|おうとうひんしつ}の{改善|かいぜん}を{担当|たんとう}しました。」 — Tôi từng phát triển chatbot thực tế, phụ trách thiết kế hội thoại và cải thiện chất lượng phản hồi.

Input: >tôi muốn chia sẻ kinh nghiệm về AI trong cuộc họp
Output: • 「{実際|じっさい}のプロジェクトでAIを{活用|かつよう}した{経験|けいけん}があり、{特|とく}にRAGや{自律|じりつ}エージェントを{業務|ぎょうむ}に{組|く}み{込|こ}んだ{知見|ちけん}をお{伝|つた}えできればと{思|おも}います。」 — Tôi có kinh nghiệm ứng dụng AI vào dự án thực tế, đặc biệt là tích hợp RAG và autonomous agent vào công việc, và muốn chia sẻ những insights đó.

Input: >tôi khoẻ
Output: • 「{元気|げんき}です。」 — Tôi khoẻ.

---

## Mode B — Phân tích / hỏi đáp

Phân tích transcript và trả lời bằng tiếng Việt. Chỉ thêm câu gợi ý bằng ${langLabel} nếu người dùng rõ ràng yêu cầu — không tự động thêm.

---

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
      model: 'gpt-4o',
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

async function predictIntent(apiKey, partial, transcriptLines) {
  const ctx = transcriptLines
    .slice(-3)
    .map((l) => l.text)
    .filter(Boolean)
    .join('\n');
  const result = await callGPT(
    apiKey,
    [
      {
        role: 'system',
        content: `Bạn dự đoán ý định người dùng muốn nói trong cuộc họp dựa trên đoạn text họ đang gõ. Trả về DUY NHẤT 1 cụm từ tiếng Việt hoàn chỉnh (tối đa 12 từ), không giải thích, không dấu ngoặc kép.${ctx ? `\nNgữ cảnh cuộc họp gần đây:\n${ctx}` : ''}`,
      },
      { role: 'user', content: partial },
    ],
    0.2
  );
  return result?.trim() ?? '';
}

module.exports = { translate, translateStreaming, chat, predictIntent, isRefusal };
