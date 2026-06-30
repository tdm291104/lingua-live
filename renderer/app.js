function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LANGS = {
  en: { name: 'English',    flag: '🇬🇧' },
  ja: { name: 'Japanese',   flag: '🇯🇵' },
  ko: { name: 'Korean',     flag: '🇰🇷' },
  zh: { name: 'Chinese',    flag: '🇨🇳' },
  vi: { name: 'Vietnamese', flag: '🇻🇳' },
  fr: { name: 'French',     flag: '🇫🇷' },
  es: { name: 'Spanish',    flag: '🇪🇸' },
  de: { name: 'German',     flag: '🇩🇪' },
};
const SRC_LANGS = ['en', 'ja', 'ko', 'zh', 'fr', 'es', 'de'];
const TGT_LANGS = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'es', 'de'];

const state = {
  listening: false,
  sidebarOpen: true,
  lang: 'ja',
  targetLang: 'vi',
  sources: { system: true, mic: false },
  lines: [],
  liveText: '',
  liveTranslation: '',
};

const $ = (id) => document.getElementById(id);
const body = document.body;

// ── Utilities ──
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => el.remove(), 200);
  }, 1800);
}

const COPY_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.1"/><path d="M1 8V2a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>`;

// ── Sidebar toggle ──
function applySidebarState() {
  body.classList.toggle('sidebar-hidden', !state.sidebarOpen);
  const btn = $('btn-sidebar-toggle');
  btn.style.background = state.sidebarOpen ? 'oklch(0.96 0.03 295)' : 'oklch(0.99 0.002 270)';
  btn.style.border     = state.sidebarOpen ? '1px solid oklch(0.88 0.04 295)' : '1px solid oklch(0.9 0.006 270)';
  btn.style.color      = state.sidebarOpen ? 'oklch(0.45 0.12 295)' : 'oklch(0.45 0.02 280)';
}

// ── Listening state ──
function applyListeningState() {
  const listening = state.listening;
  body.classList.toggle('state-idle',      !listening);
  body.classList.toggle('state-listening',  listening);

  const btn = $('btn-start-stop');
  btn.style.background = listening ? 'oklch(0.96 0.04 25)' : 'linear-gradient(135deg,oklch(0.66 0.16 295),oklch(0.58 0.18 290))';
  btn.style.color      = listening ? 'oklch(0.55 0.16 25)' : '#fff';
  btn.style.boxShadow  = listening ? 'none' : '0 6px 16px -4px oklch(0.6 0.16 295/0.5)';
  $('btn-label').textContent       = listening ? 'Stop' : 'Start';
  $('btn-icon').style.borderRadius = listening ? '2px'  : '50%';
  $('btn-icon').style.width        = listening ? '10px' : '9px';
  $('btn-icon').style.height       = listening ? '10px' : '9px';
  $('btn-eq-section').style.display = listening ? 'flex' : 'none';

  $('sidebar-sub').textContent = listening ? 'Live' : 'Paused';
  $('status-dot').classList.toggle('live', listening);
}

// ── Source buttons (segmented group) ──
function applySourceStyles() {
  ['system', 'mic'].forEach((k) => {
    const btn = document.querySelector(`[data-source="${k}"]`);
    const on  = state.sources[k];
    btn.style.background = on ? 'oklch(0.96 0.03 295)' : 'oklch(0.99 0.002 270)';
    btn.style.color      = on ? 'oklch(0.45 0.12 295)' : 'oklch(0.66 0.015 280)';
    btn.style.opacity    = on ? '1' : '0.55';
  });
}

// ── Language picker ──
let langPopoverOpen = false;

function applyLangPickerButton() {
  $('lang-src-flag').textContent = LANGS[state.lang]?.flag ?? '🌐';
  $('lang-src-code').textContent = state.lang.toUpperCase();
  $('lang-tgt-flag').textContent = LANGS[state.targetLang]?.flag ?? '🌐';
  $('lang-tgt-code').textContent = state.targetLang.toUpperCase();
}

function renderLangLists() {
  function buildList(containerId, codes, currentCode, onChange) {
    const container = $(containerId);
    container.innerHTML = '';
    codes.forEach((c) => {
      const on  = c === currentCode;
      const btn = document.createElement('button');
      btn.style.cssText = `display:flex;align-items:center;gap:9px;height:34px;padding:0 9px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;text-align:left;width:100%;background:${on ? 'oklch(0.96 0.025 295)' : 'transparent'};`;
      btn.innerHTML = `
        <span style="font-size:15px;line-height:1;">${LANGS[c].flag}</span>
        <span style="flex:1;font-size:12.5px;font-weight:${on ? 600 : 500};color:${on ? 'oklch(0.4 0.1 295)' : 'oklch(0.35 0.02 280)'};">${LANGS[c].name}</span>
        ${on ? '<span style="font-size:11px;color:oklch(0.55 0.12 295);">✓</span>' : ''}`;
      btn.addEventListener('mouseenter', () => { if (!on) btn.style.background = 'oklch(0.95 0.008 290)'; });
      btn.addEventListener('mouseleave', () => { if (!on) btn.style.background = 'transparent'; });
      btn.addEventListener('click', () => { onChange(c); closeLangPopover(); });
      container.appendChild(btn);
    });
  }
  buildList('lang-src-list', SRC_LANGS, state.lang, (c) => {
    state.lang = c;
    applyLangPickerButton();
    window.api.changeLang(state.lang);
    if (activeTab === 'phrases') renderPhrases();
    if (state.listening) showToast(`Source switched to ${LANGS[c].name} — stream restarted`);
  });
  buildList('lang-tgt-list', TGT_LANGS, state.targetLang, (c) => {
    state.targetLang = c;
    applyLangPickerButton();
  });
}

function openLangPopover() {
  renderLangLists();
  $('lang-popover').style.display  = 'flex';
  $('lang-chevron').style.transform = 'rotate(180deg)';
  $('btn-lang-picker').style.background   = 'oklch(0.97 0.012 290)';
  $('btn-lang-picker').style.borderColor  = 'oklch(0.85 0.04 295)';
  langPopoverOpen = true;
}

function closeLangPopover() {
  $('lang-popover').style.display  = 'none';
  $('lang-chevron').style.transform = 'rotate(0deg)';
  $('btn-lang-picker').style.background   = 'oklch(0.99 0.002 270)';
  $('btn-lang-picker').style.borderColor  = 'oklch(0.91 0.006 270)';
  langPopoverOpen = false;
}

function committedLineHTML(line) {
  return `
    <div class="transcript-line anim-bubble" style="position:relative;border-left:2px solid oklch(0.88 0.006 270);padding:0 28px 0 14px;margin-bottom:18px;">
      <div style="font-family:'Geist Mono',monospace;font-size:10.5px;color:oklch(0.72 0.01 270);margin-bottom:4px;">${escapeHTML(line.timestamp)}</div>
      <div style="font-size:14.5px;line-height:1.5;color:oklch(0.28 0.015 280);word-break:break-word;overflow-wrap:anywhere;">${escapeHTML(line.text)}</div>
      <div data-translation style="font-size:14px;line-height:1.5;color:oklch(0.52 0.04 290);margin-top:4px;">${line.translation ? escapeHTML(line.translation) : ''}</div>
      <button class="copy-btn transcript-copy" title="Copy">${COPY_SVG}</button>
    </div>`;
}

function liveLineHTML(text, translation) {
  const caret = `<span style="display:inline-block;width:2px;height:15px;background:oklch(0.62 0.18 295);margin-left:2px;vertical-align:-2px;" class="anim-caret"></span>`;
  return `
    <div style="border-left:2px solid oklch(0.62 0.18 295);padding-left:14px;margin-bottom:18px;">
      <div style="font-size:14.5px;line-height:1.5;color:oklch(0.28 0.015 280);">${escapeHTML(text)}${caret}</div>
      ${translation ? `<div style="font-size:14px;line-height:1.5;color:oklch(0.52 0.04 290);margin-top:4px;">${escapeHTML(translation)}</div>` : ''}
    </div>`;
}

let transcriptScrollLocked = false;
let chatScrollLocked = false;

function scrollToBottom() {
  if (transcriptScrollLocked) return;
  const c = $('transcript-scroll');
  c.scrollTop = c.scrollHeight;
}

function appendFinalLine(line, lineIndex) {
  const wrapper = document.createElement('div');
  wrapper.dataset.lineIndex = lineIndex;
  wrapper.innerHTML = committedLineHTML(line);
  wrapper.querySelector('.transcript-copy')?.addEventListener('click', () => copyToClipboard(line.text));
  $('committed-lines').appendChild(wrapper);
  $('live-line').innerHTML = '';
  transcriptScrollLocked = false;
  scrollToBottom();
}

function updateLiveLine(text) {
  $('live-line').innerHTML = text ? liveLineHTML(text, state.liveTranslation) : '';
  scrollToBottom();
}


// ── Chat UI ──
let chatTyping = null;
let chatHadError = false;

function normalizeInlineFurigana(text) {
  // Convert old-style 漢字かんじ → {漢字|かんじ} as fallback
  // Pattern: one or more kanji/numbers+counter followed immediately by hiragana reading
  return text.replace(/([一-鿿㐀-䶿0-9０-９]+)([ぁ-ゖ]+)/g, (_, kanji, reading) => {
    return `{${kanji}|${reading}}`;
  });
}

function parseJaFurigana(text) {
  const normalized = normalizeInlineFurigana(text);
  return normalized.split(/(\{[^|{}]+\|[^|{}]+\})/).map((part) => {
    const m = part.match(/^\{([^|]+)\|([^}]+)\}$/);
    if (m) return `<ruby>${escapeHTML(m[1])}<rt>${escapeHTML(m[2])}</rt></ruby>`;
    return escapeHTML(part);
  }).join('');
}

function postProcessChatBubble(el) {
  const raw = el.textContent;
  const lines = raw.split('\n');
  const processed = lines.map((line) => {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('•')) return escapeHTML(line);
    const m = trimmed.match(/^•\s*「([^」]*)」\s*[—–-]\s*(.+)$/s);
    if (!m) return escapeHTML(line);
    const phraseHTML = parseJaFurigana(m[1]);
    // Strip {kanji|reading} → kanji only for clean copy text
    const phraseClean = m[1].replace(/\{([^|]+)\|[^}]+\}/g, '$1');
    el.dataset.copyText = `「${phraseClean}」 — ${m[2]}`;
    return `• 「${phraseHTML}」\n<span class="chat-translation">↳ ${escapeHTML(m[2])}</span>`;
  });
  el.innerHTML = processed.join('\n');
}

function chatScrollToBottom() {
  if (chatScrollLocked) return;
  const c = $('chat-history');
  c.scrollTop = c.scrollHeight;
}

function renderChatEmptyState() {
  if ($('chat-empty-state')) return;
  const el = document.createElement('div');
  el.id = 'chat-empty-state';
  el.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:24px;';
  el.innerHTML = `
    <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,oklch(0.72 0.14 295),oklch(0.62 0.17 290));color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">✦</div>
    <div style="font-size:13px;font-weight:600;color:oklch(0.4 0.02 280);">AI Assistant</div>
    <div style="font-size:12px;line-height:1.6;color:oklch(0.6 0.015 280);max-width:210px;">Gõ ý muốn nói → AI tạo câu. Dùng <span style="font-family:'Geist Mono',monospace;background:oklch(0.93 0.005 270);padding:1px 5px;border-radius:4px;font-size:11px;">/ask</span> để phân tích.</div>`;
  $('chat-history').appendChild(el);
}

function removeEmptyChatState() {
  $('chat-empty-state')?.remove();
}

function appendUserBubble(text) {
  removeEmptyChatState();
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;justify-content:flex-end;';
  el.innerHTML = `<div style="background:oklch(0.96 0.03 295);border:1px solid oklch(0.88 0.05 295);border-radius:12px 12px 2px 12px;padding:9px 12px;max-width:85%;font-size:13px;color:oklch(0.38 0.1 295);line-height:1.45;">${escapeHTML(text)}</div>`;
  $('chat-history').appendChild(el);
  chatScrollLocked = false;
  chatScrollToBottom();
}

function appendAiBubble() {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
  el.innerHTML = `
    <div style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,oklch(0.72 0.14 295),oklch(0.62 0.17 290));color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">✦</div>
    <div class="ai-bubble-wrap" style="position:relative;flex:1;min-width:0;">
      <div class="ai-bubble-text" style="background:oklch(0.995 0.002 270);border:1px solid oklch(0.91 0.005 270);border-radius:2px 12px 12px 12px;padding:9px 12px;font-size:13px;line-height:1.55;color:oklch(0.35 0.015 280);white-space:pre-wrap;word-break:break-word;"></div>
      <button class="copy-btn" title="Copy">${COPY_SVG}</button>
    </div>`;
  const textEl = el.querySelector('.ai-bubble-text');
  el.querySelector('.copy-btn').addEventListener('click', () => copyToClipboard(textEl.dataset.copyText ?? textEl.textContent));
  $('chat-history').appendChild(el);
  chatScrollToBottom();
  return textEl;
}

// ── IPC subscriptions ──
window.api.onStatus(({ listening }) => {
  state.listening = listening;
  if (listening) {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('session-date').textContent = now;
    transcriptScrollLocked = false;
  } else {
    state.liveText = '';
    updateLiveLine('');
  }
  applyListeningState();
});

window.api.onInterim(({ text }) => {
  state.liveText = text;
  updateLiveLine(text);
});

window.api.onFinal((line) => {
  const lineIndex = state.lines.length;
  state.lines.push(line);
  state.liveText = '';
  state.liveTranslation = '';
  appendFinalLine(line, lineIndex);
});

window.api.onSubtitleStreamStart(() => {
  state.liveTranslation = '';
  updateLiveLine(state.liveText);
});

window.api.onSubtitleStreamClear(() => {
  state.liveTranslation = '';
  updateLiveLine(state.liveText);
});

window.api.onSubtitleCorrect(({ translation, lineIndex }) => {
  let target;
  if (lineIndex !== undefined) {
    const wrapper = $('committed-lines').querySelector(`[data-line-index="${lineIndex}"]`);
    target = wrapper?.querySelector('[data-translation]');
  } else {
    const all = $('committed-lines').querySelectorAll('[data-translation]');
    target = all[all.length - 1];
  }
  if (!target) return;
  target.style.transition = 'opacity 0.15s';
  target.style.opacity = '0';
  setTimeout(() => {
    target.textContent = translation;
    target.style.opacity = '1';
  }, 150);
});

window.api.onSubtitleToken(({ token }) => {
  state.liveTranslation += token;
  updateLiveLine(state.liveText);
});

window.api.onConnectionStatus(({ state: connState }) => {
  if (!state.listening) return;
  if (connState === 'reconnecting') {
    $('btn-label').textContent = 'Reconnecting…';
  } else if (connState === 'connected') {
    $('btn-label').textContent = 'Stop';
  }
});

window.api.onChatToken(({ token }) => {
  if (!chatTyping) chatTyping = appendAiBubble();
  chatTyping.textContent += token;
  chatScrollToBottom();
});

function setChipsLoading(loading) {
  document.querySelectorAll('.ai-chip').forEach((btn) => {
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.45' : '1';
    btn.style.pointerEvents = loading ? 'none' : '';
  });
}

window.api.onChatError(() => {
  chatHadError = true;
  const el = chatTyping || appendAiBubble();
  if (!el.textContent.trim()) {
    el.textContent = 'Something went wrong. Please try again.';
    el.style.color = 'oklch(0.55 0.15 25)';
  }
  chatTyping = null;
});

window.api.onChatDone(() => {
  if (chatTyping && state.lang === 'ja') postProcessChatBubble(chatTyping);
  chatTyping = null;
  chatHadError = false;
  $('chat-submit').innerHTML = '↑';
  $('chat-submit').disabled  = false;
  setChipsLoading(false);
});

// ── Controls ──
function toggleListen() {
  if (!state.listening) {
    window.api.start({ sources: state.sources, lang: state.lang });
  } else {
    window.api.stop();
  }
}
$('btn-start-stop').addEventListener('click', toggleListen);

$('btn-sidebar-toggle').addEventListener('click', () => {
  state.sidebarOpen = !state.sidebarOpen;
  applySidebarState();
});

document.querySelectorAll('[data-source]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.source;
    state.sources[k] = !state.sources[k];
    applySourceStyles();
    if (state.listening) window.api.changeSources(state.sources);
  });
});

$('btn-lang-picker').addEventListener('click', (e) => {
  e.stopPropagation();
  if (langPopoverOpen) closeLangPopover(); else openLangPopover();
});

document.addEventListener('click', (e) => {
  if (langPopoverOpen && !$('lang-picker-wrap').contains(e.target)) closeLangPopover();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (langPopoverOpen) { closeLangPopover(); return; }
    if (slashOpen) { closeSlash(); return; }
  }
  // Space to toggle listen (when not typing)
  if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const tag = document.activeElement?.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      toggleListen();
    }
  }
});

$('slash-hint-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('chat-input').value = '/';
  $('chat-input').focus();
  openSlash();
});

// ── Slash command picker ──
const SLASH_MODES = [
  { key: 'say',  label: 'Quick phrase', desc: 'Get a phrase to say right now', icon: '⚡', transform: (m) => '>' + m },
  { key: 'ask',  label: 'Ask AI',       desc: 'Analyze context or ask a question', icon: '✦', transform: (m) => m      },
];

let slashOpen    = false;
let slashIdx     = 0;
let selectedMode = null;

function renderSlashPopover() {
  $('slash-popover').innerHTML = SLASH_MODES.map((m, i) => `
    <button class="slash-item" data-idx="${i}" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;background:transparent;text-align:left;">
      <span style="width:26px;height:26px;border-radius:7px;background:oklch(0.94 0.025 295);color:oklch(0.48 0.12 295);font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${m.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:600;color:oklch(0.3 0.02 280);">${m.label}</div>
        <div style="font-size:11.5px;color:oklch(0.6 0.015 280);margin-top:1px;">${m.desc}</div>
      </div>
      <span style="font-size:11px;color:oklch(0.72 0.02 280);font-family:'Geist Mono',monospace;">/${m.key}</span>
    </button>`).join('');
  $('slash-popover').querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => { slashIdx = i; highlightSlash(); });
    btn.addEventListener('click',      () => selectSlash(i));
  });
}

function highlightSlash() {
  $('slash-popover').querySelectorAll('.slash-item').forEach((btn, i) => {
    btn.style.background = i === slashIdx ? 'oklch(0.96 0.025 295)' : 'transparent';
    btn.querySelector('div > div').style.color = i === slashIdx ? 'oklch(0.42 0.1 295)' : 'oklch(0.3 0.02 280)';
  });
}

function openSlash() {
  renderSlashPopover();
  $('slash-popover').style.display = 'block';
  slashOpen = true;
  slashIdx  = 0;
  highlightSlash();
}

function closeSlash() {
  $('slash-popover').style.display = 'none';
  slashOpen = false;
}

function selectSlash(idx) {
  selectedMode = SLASH_MODES[idx];
  $('mode-chip-icon').textContent  = selectedMode.icon;
  $('mode-chip-label').textContent = selectedMode.label;
  $('mode-chip').style.display     = 'flex';
  $('chat-input').value = '';
  $('chat-input').placeholder = 'Type your message…';
  closeSlash();
  $('chat-input').focus();
}

function clearMode() {
  selectedMode = null;
  $('mode-chip').style.display = 'none';
  $('chat-input').placeholder  = 'Ý muốn nói… (/ để hỏi AI)';
}

$('mode-chip-clear').addEventListener('click', () => { clearMode(); $('chat-input').focus(); });

function autoResizeInput() {
  const el = $('chat-input');
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ── Autocomplete ──
let predictDebounce  = null;
let activeSuggestion = '';

function showSuggestion(text) {
  activeSuggestion = text;
  const el = $('autocomplete-hint');
  el.innerHTML = `<span class="hint-tab">Tab</span>${escapeHTML(text)}`;
  el.style.display = 'block';
}

function clearSuggestion() {
  activeSuggestion = '';
  const el = $('autocomplete-hint');
  el.style.display = 'none';
  el.innerHTML = '';
}

$('autocomplete-hint').addEventListener('click', () => {
  if (!activeSuggestion) return;
  $('chat-input').value = activeSuggestion;
  autoResizeInput();
  clearSuggestion();
  $('chat-input').focus();
});

function triggerPredict(val) {
  window.api.predict(val);
}

window.api.onPredictResult(({ result }) => {
  const current = $('chat-input').value.trim();
  if (!result || !current) return;
  if (result.trim().toLowerCase() !== current.toLowerCase()) {
    showSuggestion(result.trim());
  }
});

$('chat-input').addEventListener('input', () => {
  const val = $('chat-input').value;
  if (!selectedMode && (val === '/' || (val.startsWith('/') && !val.slice(1).includes(' ')))) {
    openSlash();
  } else if (!val.startsWith('/')) {
    closeSlash();
  }
  autoResizeInput();

  clearSuggestion();
  clearTimeout(predictDebounce);
  const trimmed = val.trim();
  if (trimmed.length >= 3 && !trimmed.startsWith('/')) {
    predictDebounce = setTimeout(() => triggerPredict(trimmed), 800);
  }
});

document.addEventListener('click', (e) => {
  if (slashOpen && !$('slash-popover').contains(e.target) && e.target !== $('chat-input')) closeSlash();
});

const ANALYSIS_STARTS = /^(tóm tắt|phân tích|giải thích|họ (vừa |đang )?nói|transcript|nãy (họ |người ta )?nói)/i;

function isQuestion(text) {
  return ANALYSIS_STARTS.test(text);
}

function submitChat(message) {
  let q = (message ?? $('chat-input').value).trim();
  if (!q || $('chat-submit').disabled) return;
  closeSlash();

  const display = q;
  if (selectedMode) {
    q = selectedMode.transform(q);
  } else if (!isQuestion(q)) {
    q = '>' + q;
  }
  clearMode();

  $('chat-input').value        = '';
  $('chat-input').style.height = '';
  clearSuggestion();
  clearTimeout(predictDebounce);
  $('chat-submit').innerHTML  = '<span class="btn-spinner"></span>';
  $('chat-submit').disabled   = true;
  setChipsLoading(true);
  appendUserBubble(display);
  window.api.chat(q);
}
$('chat-submit').addEventListener('click', () => submitChat());
let isComposing = false;
$('chat-input').addEventListener('compositionstart', () => { isComposing = true; });
$('chat-input').addEventListener('compositionend', () => {
  isComposing = false;
  const trimmed = $('chat-input').value.trim();
  clearTimeout(predictDebounce);
  if (trimmed.length >= 3 && !trimmed.startsWith('/')) {
    predictDebounce = setTimeout(() => triggerPredict(trimmed), 800);
  }
});

$('chat-input').addEventListener('keydown', (e) => {
  if (slashOpen) {
    if (e.key === 'Escape')   { closeSlash(); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { slashIdx = (slashIdx + 1) % SLASH_MODES.length; highlightSlash(); e.preventDefault(); return; }
    if (e.key === 'ArrowUp')   { slashIdx = (slashIdx - 1 + SLASH_MODES.length) % SLASH_MODES.length; highlightSlash(); e.preventDefault(); return; }
    if (e.key === 'Tab' || e.key === 'Enter') { selectSlash(slashIdx); e.preventDefault(); return; }
  }
  if (e.key === 'Tab' && activeSuggestion) {
    e.preventDefault();
    $('chat-input').value = activeSuggestion;
    autoResizeInput();
    clearSuggestion();
    clearTimeout(predictDebounce);
    return;
  }
  if (e.key === 'Escape' && activeSuggestion) {
    clearSuggestion();
    clearTimeout(predictDebounce);
    e.preventDefault();
    return;
  }
  if (e.key === 'Backspace' && !$('chat-input').value && selectedMode) {
    clearMode();
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !isComposing) { e.preventDefault(); submitChat(); }
});

document.querySelectorAll('.ai-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedMode = SLASH_MODES.find((m) => m.key === 'ask');
    submitChat(btn.dataset.q);
  });
});

// ── Phrases panel ──
function renderPhrases() {
  const container = $('panel-phrases');
  const list = PHRASES[state.lang];
  if (!list) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 16px;">
        <div style="font-size:22px;margin-bottom:10px;">🌐</div>
        <div style="font-size:13px;font-weight:600;color:oklch(0.4 0.02 280);margin-bottom:6px;">No phrases yet for this language</div>
        <div style="font-size:12px;color:oklch(0.6 0.015 280);line-height:1.6;">Switch to <strong>English</strong> or <strong>Japanese</strong> to browse sample phrases.</div>
      </div>`;
    return;
  }
  container.innerHTML = list.map((group) => `
    <div style="margin-bottom:18px;">
      <div style="font-size:10.5px;font-weight:700;color:oklch(0.6 0.015 280);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid oklch(0.93 0.005 270);">${group.category}</div>
      ${group.items.map((item, i) => {
        const isJa = state.lang === 'ja';
        const cleanPhrase = item.phrase.replace(/\{([^|]+)\|[^}]+\}/g, '$1');
        const phraseHTML  = isJa ? parseJaFurigana(item.phrase)  : escapeHTML(item.phrase);
        const meaningHTML = isJa ? parseJaFurigana(item.meaning) : escapeHTML(item.meaning);
        return `
        <div class="phrase-item" data-phrase="${escapeHTML(cleanPhrase)}" style="${i < group.items.length - 1 ? 'border-bottom:1px solid oklch(0.95 0.003 270);' : ''}">
          <div style="font-size:13px;font-weight:500;color:oklch(0.28 0.015 280);line-height:1.6;">${phraseHTML}</div>
          <div style="font-size:11.5px;color:oklch(0.55 0.04 290);margin-top:1px;line-height:1.5;">${meaningHTML}</div>
        </div>`;
      }).join('')}
    </div>`).join('');

  container.querySelectorAll('.phrase-item').forEach((el) => {
    el.addEventListener('click', () => {
      copyToClipboard(el.dataset.phrase);
    });
  });
}

// ── Clear actions (confirm on second click within 2s) ──
function makeClearable(btn, action) {
  let pending = false;
  let timer   = null;
  const origBg    = btn.style.background ?? '';
  const origColor = btn.style.color ?? '';

  btn.addEventListener('click', () => {
    if (pending) {
      clearTimeout(timer);
      pending = false;
      btn.style.background = origBg;
      btn.style.color      = origColor;
      action();
    } else {
      pending = true;
      btn.style.background = 'oklch(0.93 0.1 25)';
      btn.style.color      = 'oklch(0.45 0.18 25)';
      timer = setTimeout(() => {
        pending = false;
        btn.style.background = origBg;
        btn.style.color      = origColor;
      }, 2000);
    }
  });
}

makeClearable($('btn-clear-chat'), () => {
  $('chat-history').innerHTML = '';
  chatTyping = null;
  renderChatEmptyState();
});

makeClearable($('btn-clear-transcript'), () => {
  $('committed-lines').innerHTML = '';
  $('live-line').innerHTML = '';
  state.lines = [];
  state.liveText = '';
  state.liveTranslation = '';
});

// ── Scroll-lock detection ──
$('transcript-scroll').addEventListener('scroll', () => {
  const el = $('transcript-scroll');
  transcriptScrollLocked = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
});

$('chat-history').addEventListener('scroll', () => {
  const el = $('chat-history');
  chatScrollLocked = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
});

// ── Sidebar tabs ──
let activeTab = 'chat';
let savedChatScroll = null;

function switchTab(tab) {
  if (activeTab === 'chat') savedChatScroll = $('chat-history').scrollTop;
  activeTab = tab;
  $('panel-chat').style.display    = tab === 'chat'    ? 'flex'   : 'none';
  $('panel-phrases').style.display = tab === 'phrases' ? 'block'  : 'none';
  $('tab-chat').classList.toggle('sidebar-tab-active',    tab === 'chat');
  $('tab-phrases').classList.toggle('sidebar-tab-active', tab === 'phrases');
  if (tab === 'phrases') renderPhrases();
  if (tab === 'chat' && savedChatScroll !== null) {
    requestAnimationFrame(() => { $('chat-history').scrollTop = savedChatScroll; });
  }
}

$('tab-chat').addEventListener('click',    () => switchTab('chat'));
$('tab-phrases').addEventListener('click', () => switchTab('phrases'));

// ── Sidebar resize ──
(function () {
  const resizer = $('sidebar-resizer');
  const sidebar = $('sidebar');
  let active = false;
  let startX = 0;
  let startW = 0;

  resizer.addEventListener('mousedown', (e) => {
    active  = true;
    startX  = e.clientX;
    startW  = sidebar.offsetWidth;
    resizer.classList.add('dragging');
    body.style.cursor     = 'col-resize';
    body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    const w = Math.max(220, Math.min(560, startW + (startX - e.clientX)));
    sidebar.style.width = w + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!active) return;
    active = false;
    resizer.classList.remove('dragging');
    body.style.cursor     = '';
    body.style.userSelect = '';
  });
})();

// ── Initial render ──
applyListeningState();
applySourceStyles();
applyLangPickerButton();
applySidebarState();
switchTab('chat');
renderChatEmptyState();
