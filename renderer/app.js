// renderer/app.js

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const state = {
  listening: false,
  sidebarOpen: true,
  lang: 'en',
  sources: { system: true, mic: true },
  lines: [],
  liveText: '',
  analysisLoading: false,
  qaLoading: false,
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
  body.classList.toggle('state-idle',       !listening);
  body.classList.toggle('state-listening',   listening);

  const btn = $('btn-start-stop');
  btn.style.background  = listening ? 'oklch(0.96 0.04 25)'  : 'linear-gradient(135deg,oklch(0.66 0.16 295),oklch(0.58 0.18 290))';
  btn.style.color       = listening ? 'oklch(0.55 0.16 25)'  : '#fff';
  btn.style.boxShadow   = listening ? 'none' : '0 6px 16px -4px oklch(0.6 0.16 295/0.5)';
  $('btn-label').textContent       = listening ? 'Dừng' : 'Bắt đầu';
  $('btn-icon').style.borderRadius = listening ? '2px'  : '50%';
  $('btn-icon').style.width        = listening ? '10px' : '9px';
  $('btn-icon').style.height       = listening ? '10px' : '9px';

  const pill  = $('status-pill');
  const dot   = $('status-dot');
  const label = $('status-label');
  const bars  = $('status-bars');
  pill.style.background = listening ? 'oklch(0.97 0.025 295)' : 'oklch(0.96 0.004 270)';
  dot.style.background  = listening ? 'oklch(0.62 0.18 295)'  : 'oklch(0.75 0.01 270)';
  dot.style.animation   = listening ? 'pulseDot 1.4s ease-in-out infinite' : '';
  label.style.color     = listening ? 'oklch(0.5 0.12 295)'   : 'oklch(0.58 0.015 280)';
  label.textContent     = listening ? 'Đang nghe' : 'Đã dừng';
  bars.style.display    = listening ? 'flex' : 'none';

  $('sidebar-sub').textContent = listening ? 'Cập nhật theo thời gian thực' : 'Tạm dừng';
}

// ── Source buttons ──
function applySourceStyles() {
  ['system', 'mic'].forEach((k) => {
    const btn = document.querySelector(`[data-source="${k}"]`);
    const on  = state.sources[k];
    btn.style.border     = `1px solid ${on ? 'oklch(0.85 0.05 295)' : 'oklch(0.91 0.006 270)'}`;
    btn.style.background = on ? 'oklch(0.96 0.03 295)' : 'oklch(0.99 0.002 270)';
    btn.style.color      = on ? 'oklch(0.45 0.12 295)' : 'oklch(0.62 0.015 280)';
  });
}

// ── Language buttons ──
function applyLangStyles() {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const active = btn.dataset.lang === state.lang;
    btn.style.background = active ? 'oklch(0.96 0.03 295)' : 'oklch(0.99 0.002 270)';
    btn.style.color      = active ? 'oklch(0.45 0.12 295)' : 'oklch(0.5 0.02 280)';
    btn.style.fontWeight = active ? '600' : '500';
  });
}

// ── Transcript rendering (incremental — no full rebuilds on interim) ──
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


function renderAnalysis(a) {
  $('summary-text').textContent = a.summary || 'Chưa có tóm tắt.';
  $('actions-list').innerHTML = (a.actions || []).map((t) => `
    <div style="display:flex;gap:9px;align-items:flex-start;background:oklch(0.995 0.002 270);border:1px solid oklch(0.93 0.005 270);border-radius:9px;padding:10px 11px;">
      <span style="width:15px;height:15px;border-radius:4px;border:1.5px solid oklch(0.8 0.01 270);flex-shrink:0;margin-top:1px;"></span>
      <span style="font-size:12.5px;line-height:1.45;color:oklch(0.38 0.02 280);">${escapeHTML(t)}</span>
    </div>`).join('');
  $('replies-list').innerHTML = (a.replies || []).map((r) => `
    <div style="background:oklch(0.985 0.012 295);border:1px solid oklch(0.91 0.03 295);border-radius:9px;padding:10px 12px;">
      <div style="font-size:11px;color:oklch(0.58 0.06 295);font-weight:600;margin-bottom:4px;">${escapeHTML(r.q)}</div>
      <div style="font-size:12.5px;line-height:1.5;color:oklch(0.4 0.04 290);">${escapeHTML(r.a)}</div>
    </div>`).join('');
}

function appendQaMessage(q, a) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="margin-bottom:6px;font-size:12.5px;color:oklch(0.42 0.1 295);font-weight:600;">❓ ${escapeHTML(q)}</div>
    <div style="font-size:12.5px;line-height:1.5;color:oklch(0.38 0.02 280);background:oklch(0.995 0.002 270);border:1px solid oklch(0.93 0.005 270);border-radius:9px;padding:10px 12px;">${escapeHTML(a)}</div>`;
  $('qa-history').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
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
  const label = $('status-label');
  const pill  = $('status-pill');
  const dot   = $('status-dot');
  if (connState === 'reconnecting') {
    label.textContent     = 'Đang kết nối lại…';
    pill.style.background = 'oklch(0.97 0.03 50)';
    dot.style.background  = 'oklch(0.75 0.14 50)';
    dot.style.animation   = 'pulseDot 0.7s ease-in-out infinite';
  } else if (connState === 'connected') {
    label.textContent     = 'Đang nghe';
    pill.style.background = 'oklch(0.97 0.025 295)';
    dot.style.background  = 'oklch(0.62 0.18 295)';
    dot.style.animation   = 'pulseDot 1.4s ease-in-out infinite';
  }
});

window.api.onAnalysis((result) => {
  state.analysisLoading = false;
  $('btn-analyze').textContent = '✦ Cập nhật phân tích';
  $('btn-analyze').disabled    = false;
  renderAnalysis(result);
});

window.api.onQaAnswer(({ answer }) => {
  state.qaLoading = false;
  const q = $('qa-input').dataset.lastQ || '';
  $('qa-input').value           = '';
  $('qa-input').dataset.lastQ   = '';
  $('qa-submit').textContent    = '↑';
  $('qa-submit').disabled       = false;
  appendQaMessage(q, answer);
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

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.lang = btn.dataset.lang;
    applyLangStyles();
    window.api.changeLang(state.lang);
  });
});

$('btn-analyze').addEventListener('click', () => {
  if (state.analysisLoading) return;
  state.analysisLoading = true;
  $('btn-analyze').textContent = '⏳ Đang phân tích…';
  $('btn-analyze').disabled    = true;
  window.api.requestAnalysis();
});

function submitQa() {
  const q = $('qa-input').value.trim();
  if (!q || state.qaLoading) return;
  state.qaLoading              = true;
  $('qa-input').dataset.lastQ  = q;
  $('qa-submit').textContent   = '⏳';
  $('qa-submit').disabled      = true;
  window.api.ask(q);
}
$('qa-submit').addEventListener('click', submitQa);
$('qa-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitQa(); });

// ── Initial render ──
applyListeningState();
applySourceStyles();
applyLangStyles();
applySidebarState();
