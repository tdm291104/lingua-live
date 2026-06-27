function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LANGS = {
  en: { name: 'Tiếng Anh',         flag: '🇬🇧' },
  ja: { name: 'Tiếng Nhật',        flag: '🇯🇵' },
  ko: { name: 'Tiếng Hàn',         flag: '🇰🇷' },
  zh: { name: 'Tiếng Trung',       flag: '🇨🇳' },
  vi: { name: 'Tiếng Việt',        flag: '🇻🇳' },
  fr: { name: 'Tiếng Pháp',        flag: '🇫🇷' },
  es: { name: 'Tiếng Tây Ban Nha', flag: '🇪🇸' },
  de: { name: 'Tiếng Đức',         flag: '🇩🇪' },
};
const SRC_LANGS = ['en', 'ja', 'ko', 'zh', 'fr', 'es', 'de'];
const TGT_LANGS = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'es', 'de'];

const state = {
  listening: false,
  sidebarOpen: true,
  lang: 'en',
  targetLang: 'vi',
  sources: { system: true, mic: false },
  lines: [],
  liveText: '',
  liveTranslation: '',
};

const $ = (id) => document.getElementById(id);
const body = document.body;

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
  $('btn-label').textContent       = listening ? 'Dừng' : 'Bắt đầu';
  $('btn-icon').style.borderRadius = listening ? '2px'  : '50%';
  $('btn-icon').style.width        = listening ? '10px' : '9px';
  $('btn-icon').style.height       = listening ? '10px' : '9px';
  $('btn-eq-section').style.display = listening ? 'flex' : 'none';

  $('sidebar-sub').textContent = listening ? 'Cập nhật theo thời gian thực' : 'Tạm dừng';
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
    <div class="anim-bubble" style="border-left:2px solid oklch(0.88 0.006 270);padding-left:14px;margin-bottom:18px;">
      <div style="font-family:'Geist Mono',monospace;font-size:10.5px;color:oklch(0.72 0.01 270);margin-bottom:4px;">${escapeHTML(line.timestamp)}</div>
      <div style="font-size:14.5px;line-height:1.5;color:oklch(0.28 0.015 280);">${escapeHTML(line.text)}</div>
      <div data-translation style="font-size:14px;line-height:1.5;color:oklch(0.52 0.04 290);margin-top:4px;">${line.translation ? escapeHTML(line.translation) : ''}</div>
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

function scrollToBottom() {
  const c = $('transcript-scroll');
  c.scrollTop = c.scrollHeight;
}

function appendFinalLine(line, lineIndex) {
  const wrapper = document.createElement('div');
  wrapper.dataset.lineIndex = lineIndex;
  wrapper.innerHTML = committedLineHTML(line);
  $('committed-lines').appendChild(wrapper);
  $('live-line').innerHTML = '';
  scrollToBottom();
}

function updateLiveLine(text) {
  $('live-line').innerHTML = text ? liveLineHTML(text, state.liveTranslation) : '';
  scrollToBottom();
}


// ── Chat UI ──
let chatTyping = null;

function chatScrollToBottom() {
  const c = $('chat-history');
  c.scrollTop = c.scrollHeight;
}

function appendUserBubble(text) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;justify-content:flex-end;';
  el.innerHTML = `<div style="background:oklch(0.96 0.03 295);border:1px solid oklch(0.88 0.05 295);border-radius:12px 12px 2px 12px;padding:9px 12px;max-width:85%;font-size:13px;color:oklch(0.38 0.1 295);line-height:1.45;">${escapeHTML(text)}</div>`;
  $('chat-history').appendChild(el);
  chatScrollToBottom();
}

function appendAiBubble() {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
  el.innerHTML = `
    <div style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,oklch(0.72 0.14 295),oklch(0.62 0.17 290));color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">✦</div>
    <div class="ai-bubble-text" style="background:oklch(0.995 0.002 270);border:1px solid oklch(0.91 0.005 270);border-radius:2px 12px 12px 12px;padding:9px 12px;font-size:13px;line-height:1.55;color:oklch(0.35 0.015 280);white-space:pre-wrap;"></div>`;
  $('chat-history').appendChild(el);
  chatScrollToBottom();
  return el.querySelector('.ai-bubble-text');
}

// ── IPC subscriptions ──
window.api.onStatus(({ listening }) => {
  state.listening = listening;
  if (!listening) { state.liveText = ''; updateLiveLine(''); }
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
  $('session-date').textContent = line.timestamp;
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
    $('btn-label').textContent = 'Kết nối lại…';
  } else if (connState === 'connected') {
    $('btn-label').textContent = 'Dừng';
  }
});

window.api.onChatToken(({ token }) => {
  if (!chatTyping) chatTyping = appendAiBubble();
  chatTyping.textContent += token;
  chatScrollToBottom();
});

window.api.onChatDone(() => {
  chatTyping = null;
  $('chat-submit').textContent = '↑';
  $('chat-submit').disabled    = false;
  $('chat-input').disabled     = false;
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

function submitChat(message) {
  const q = (message ?? $('chat-input').value).trim();
  if (!q || $('chat-submit').disabled) return;
  $('chat-input').value        = '';
  $('chat-submit').textContent = '⏳';
  $('chat-submit').disabled    = true;
  $('chat-input').disabled     = true;
  appendUserBubble(q);
  window.api.chat(q);
}
$('chat-submit').addEventListener('click', () => submitChat());
$('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitChat(); });

document.querySelectorAll('.ai-chip').forEach((btn) => {
  btn.addEventListener('click', () => submitChat(btn.dataset.q));
});

// ── Phrases panel ──
function renderPhrases() {
  const container = $('panel-phrases');
  const list = PHRASES[state.lang];
  if (!list) {
    container.innerHTML = `<div style="font-size:13px;color:oklch(0.6 0.015 280);padding:20px 4px;">Chưa có câu sẵn cho ngôn ngữ này.</div>`;
    return;
  }
  container.innerHTML = list.map((group) => `
    <div style="margin-bottom:18px;">
      <div style="font-size:10.5px;font-weight:700;color:oklch(0.6 0.015 280);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid oklch(0.93 0.005 270);">${group.category}</div>
      ${group.items.map((item, i) => `
        <div style="padding:6px 0;${i < group.items.length - 1 ? 'border-bottom:1px solid oklch(0.95 0.003 270);' : ''}">
          <div style="font-size:13px;font-weight:500;color:oklch(0.28 0.015 280);line-height:1.45;">${escapeHTML(item.phrase)}</div>
          <div style="font-size:11.5px;color:oklch(0.55 0.04 290);margin-top:1px;line-height:1.4;">${escapeHTML(item.meaning)}</div>
        </div>`).join('')}
    </div>`).join('');
}

// ── Sidebar tabs ──
let activeTab = 'chat';

function switchTab(tab) {
  activeTab = tab;
  $('panel-chat').style.display    = tab === 'chat'    ? 'flex'   : 'none';
  $('panel-phrases').style.display = tab === 'phrases' ? 'block'  : 'none';
  $('tab-chat').classList.toggle('sidebar-tab-active',    tab === 'chat');
  $('tab-phrases').classList.toggle('sidebar-tab-active', tab === 'phrases');
  if (tab === 'phrases') renderPhrases();
}

$('tab-chat').addEventListener('click',    () => switchTab('chat'));
$('tab-phrases').addEventListener('click', () => switchTab('phrases'));

// ── Initial render ──
applyListeningState();
applySourceStyles();
applyLangPickerButton();
applySidebarState();
switchTab('chat');
