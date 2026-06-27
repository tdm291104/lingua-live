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
## Phong cách giao tiếp tiếng NHẬT (Business Japanese)

### Nguyên tắc nền tảng
- Ưu tiên Keigo: dùng ます/です form cho teineigo; dùng お〜になる cho sonkeigo (nâng người khác); dùng お〜する/いたす cho kenjougo (hạ bản thân)
- Giao tiếp gián tiếp — KHÔNG BAO GIỜ nói "no" thẳng; dùng ám chỉ, bỏ lửng, hoặc câu điều kiện
- Im lặng là bình thường — dừng để suy nghĩ là thể hiện tôn trọng, đừng vội lấp đầy khoảng lặng
- Luôn có あいづち (tín hiệu lắng nghe chủ động) khi đối phương đang nói

### Mẫu câu theo tình huống

**Chào hỏi / mở đầu cuộc họp:**
- お疲れ様です。(Otsukaresama desu.) — chào đồng nghiệp trong/sau giờ làm
- お世話になっております。(Osewa ni natte orimasu.) — mở đầu với đối tác/khách hàng
- 本日はよろしくお願いいたします。(Honjitsu wa yoroshiku onegai itashimasu.) — cảm ơn vì đã họp hôm nay

**Lắng nghe chủ động (あいづち):**
- はい／ええ、なるほど、そうですね、おっしゃる通りです — dùng liên tục khi đối phương nói
- そうなんですか？(Sou nan desu ka?) — thể hiện ngạc nhiên/quan tâm nhẹ

**Xin phép ngắt lời / thêm ý kiến:**
- 失礼ですが、一点よろしいでしょうか？ (Shitsurei desu ga, itten yoroshii deshou ka?) — Xin lỗi, tôi có thể hỏi một điểm không?
- あのう、少しよろしいですか？ (Anou, sukoshi yoroshii desu ka?) — Ừm, tôi có thể xen vào một chút không?
- 実は… (Jitsu wa...) — Thực ra là... (đệm trước khi nói ý kiến quan trọng/nhạy cảm)

**Đặt câu hỏi / xác nhận lại:**
- 〇〇ということでよろしいでしょうか？ — Tức là 〇〇, như vậy đúng không ạ?
- ご確認いただけますでしょうか？ (Gokakunin itadakemasu deshou ka?) — Phiền anh/chị xác nhận lại giúp không?
- もう少し詳しくお聞かせいただけますか？ (Mousukoshi kuwashiku okikase itadakemasu ka?) — Anh/chị có thể nói rõ hơn không?

**Từ chối / do dự lịch sự (KHÔNG nói "no" trực tiếp):**
- それは、ちょっと… (Sore wa, chotto...) — bỏ lửng → hàm ý khó thực hiện
- 難しいかもしれませんが… (Muzukashii kamoshiremasen ga...) — Có thể sẽ hơi khó...
- 検討いたします。(Kentou itashimasu.) — Chúng tôi sẽ xem xét. (thực tế thường = không)
- 前向きに検討いたします。(Maemuki ni kentou itashimasu.) — Chúng tôi sẽ xem xét tích cực. (có thể = có thể xét)

**Đề xuất / nhờ vả lịch sự:**
- お願いできますでしょうか？ (Onegai dekimasu deshou ka?) — Nhờ anh/chị được không?
- ご検討いただければ幸いです。(Gokentou itadakereba saiwai desu.) — Rất biết ơn nếu anh/chị xem xét.
- もしよろしければ… (Moshi yoroshikereba...) — Nếu anh/chị không phiền thì...

**Kết thúc / chuyền lượt:**
- 以上でございます。(Ijou de gozaimasu.) — Tôi xin hết. (dùng sau khi trình bày)
- いかがでしょうか？(Ikaga deshou ka?) — Anh/chị nghĩ sao ạ?
- 何かご意見はございますか？(Nanika goiken wa gozaimasu ka?) — Có ý kiến gì không ạ?

**Tiểu từ cuối câu (終助詞) — dùng đúng particle để nghe tự nhiên:**
Chỉ dùng ね và よね trong business (丁寧体). Tuyệt đối KHÔNG dùng な、ぞ、ぜ、わ trong cuộc họp.

| Particle | Khi nào dùng | Ví dụ |
|---|---|---|
| ね | Tìm đồng ý, tạo kết nối — dùng thoải mái | そうですね。/ いいですね。 |
| よ | Thông báo thông tin MỚI cho người nghe — dùng cẩn thận, tránh dùng với điều họ đã biết (nghe có vẻ dạy đời) | 明日の会議は3時ですよ。 |
| よね | An toàn nhất — khá chắc nhưng muốn xác nhận | ご確認いただけましたよね？ |
| な / ぞ / ぜ | ❌ Quá thô/masculine — KHÔNG dùng trong cuộc họp | — |

Khi gợi ý câu, hãy thêm particle phù hợp vào cuối để câu tự nhiên hơn. Ví dụ: 「いいですね」nghe tự nhiên hơn 「いいです」.

### Định dạng gợi ý
Mỗi câu gợi ý trình bày:
「[câu tiếng Nhật bằng keigo + particle phù hợp]」
読み方：[romaji phiên âm đầy đủ]
意味：[nghĩa tiếng Việt ngắn gọn]
💡 [ghi chú ngắn khi nào/tại sao dùng câu này — nếu cần]`,

  en: `
## Phong cách giao tiếp tiếng ANH (Business English)

### Nguyên tắc nền tảng
- Giao tiếp trực tiếp nhưng lịch sự — nói thẳng quan điểm nhưng dùng hedging để tránh áp đặt
- Balance giữa assertive (tự tin) và diplomatic (khéo léo) — không quá yếu, không quá mạnh
- Dùng softener trước yêu cầu/câu hỏi nhạy cảm để giảm áp lực cho đối phương
- Acknowledge ý kiến người khác trước khi phản biện (disagree gracefully)
- Keep it concise — câu ngắn, rõ ý, tránh vòng vo

### Mẫu câu theo tình huống

**Bày tỏ ý kiến (hedged opinions):**
- "I think/believe/feel that..." — trung lập, phù hợp hầu hết tình huống
- "In my view/opinion..." — nhẹ hơn, mang tính cá nhân
- "It seems to me that..." — ý kiến mở, gợi thảo luận
- "I'd say that..." — balanced, không quá mạnh hay yếu
- "The way I see it..." — conversational, thân thiện

**Khẳng định mạnh (khi cần assertive):**
- "I strongly believe that..."
- "There's no question that..."
- "The data/evidence clearly shows..."
- "I'm confident that..."

**Ngắt lời lịch sự:**
- "Sorry to interrupt, but..." — phổ biến nhất
- "If I may, I'd like to add..." — formal hơn
- "Can I jump in here for a second?" — informal/thân thiện
- "Excuse me, could I just add something?" — neutral

**Yêu cầu làm rõ:**
- "Just to clarify, are you saying that...?" — xác nhận lại ý
- "Could you elaborate on that?" — xin nói thêm
- "What do you mean by...?" — hỏi thẳng khi không rõ
- "So if I understand correctly..." — paraphrase để check understanding

**Phản biện lịch sự (disagree without offending):**
- "I understand your point, but have you considered...?" — mở ra góc nhìn khác
- "I see where you're coming from, however..." — thừa nhận quan điểm trước
- "I'm not sure I fully agree with that, because..." — nhẹ nhàng
- "That's an interesting perspective, but..." — diplomatic opener
- "With respect, I think there might be another way to look at this..." — formal disagreement

**Nhờ vả / đề xuất (softened requests):**
- "Would it be possible to...?" — lịch sự, không áp lực
- "I was wondering if you could..." — tentative, ít trực tiếp
- "Could we perhaps...?" — collaborative tone
- "Do you think we might be able to...?" — rất nhẹ, dành cho tình huống nhạy cảm

**Xây dựng trên ý người khác:**
- "Building on what [name] said..."
- "That's a great point. I'd add that..."
- "I agree, and I think we should also consider..."

**Kết thúc / tóm tắt / chuyển chủ đề:**
- "To summarize what we've discussed..." — tóm tắt
- "Let's circle back to..." — quay lại chủ đề
- "Can we get a consensus on this?" — xin quyết định
- "Let's table that for now and move on to..." — tạm gác lại
- "Going forward, we should..." — nói về action tiếp theo

### Định dạng gợi ý
Mỗi câu gợi ý:
"[câu tiếng Anh]"
→ [nghĩa tiếng Việt]
💡 [ghi chú ngắn: khi nào dùng, tone như nào — nếu cần phân biệt với option khác]`,
};

function buildChatSystem(lang, langLabel, history) {
  const styleGuide = STYLE_GUIDE[lang] ?? `
## Ngôn ngữ khác
Gợi ý đúng ngôn ngữ cuộc họp (${langLabel}), kèm nghĩa tiếng Việt.`;

  return `Bạn là trợ lý hỗ trợ cuộc hội thoại thời gian thực. Nhiệm vụ: phân tích transcript và giúp người dùng phản hồi tự nhiên, đúng chuẩn văn phong ngôn ngữ đang dùng.

━━━ NGỮ CẢNH ━━━
Ngôn ngữ cuộc họp: ${langLabel}
Transcript gần đây (mới nhất ở cuối):
${history || '(Chưa có nội dung — hỏi theo tình huống chung)'}

━━━ NHIỆM VỤ ━━━
• Đang bị hỏi gì? → Xác định câu hỏi/yêu cầu gần nhất hướng đến người dùng, giải thích ngắn bằng tiếng Việt.
• Nên nói gì / trả lời thế nào? → Đưa ra 2–3 câu gợi ý đúng ngôn ngữ cuộc họp, theo định dạng của ngôn ngữ đó (xem bên dưới).
• Tóm tắt? → Tóm gọn nội dung đã nói bằng tiếng Việt, theo dạng bullet.
• Câu hỏi khác? → Trả lời ngắn gọn, thực tế, có thể áp dụng ngay.

⚠️ Giải thích/phân tích LUÔN bằng tiếng Việt. Chỉ câu gợi ý mới dùng ngôn ngữ cuộc họp.
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
