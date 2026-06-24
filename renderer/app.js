// renderer/app.js

const SPEAKERS = [
  { bar: 'oklch(0.7 0.18 50)',  text: 'oklch(0.52 0.15 50)'  },
  { bar: 'oklch(0.6 0.18 230)', text: 'oklch(0.42 0.15 230)' },
  { bar: 'oklch(0.6 0.18 145)', text: 'oklch(0.42 0.15 145)' },
  { bar: 'oklch(0.6 0.18 10)',  text: 'oklch(0.42 0.15 10)'  },
  { bar: 'oklch(0.6 0.18 295)', text: 'oklch(0.42 0.15 295)' },
];
function speakerColor(id) { return SPEAKERS[id % SPEAKERS.length]; }
function speakerLabel(id) { return `Speaker ${id}`; }

const state = {
  view: 'expanded',
  listening: false,
  lang: 'en',
  sources: { system: true, mic: true },
  lines: [],
  liveText: '',
  liveSpeakerId: 0,
  analysisLoading: false,
  qaLoading: false,
};

const $ = (id) => document.getElementById(id);
const body = document.body;

// ── View toggle ──
function setView(v) {
  state.view = v;
  body.classList.toggle('view-floating', v === 'floating');
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

  const fb = $('btn-float-start-stop');
  fb.style.background = listening ? 'oklch(0.96 0.04 25)'  : 'linear-gradient(135deg,oklch(0.66 0.16 295),oklch(0.58 0.18 290))';
  fb.style.color      = listening ? 'oklch(0.55 0.16 25)'  : '#fff';
  $('float-btn-label').textContent      = listening ? 'Dừng' : 'Bắt đầu';
  $('float-btn-icon').style.borderRadius = listening ? '2px' : '50%';
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
  $('float-lang-label').textContent = state.lang === 'en' ? 'EN → VI' : 'JA → VI';
}

// ── Render transcript line HTML ──
function lineHTML(line, live) {
  const c = speakerColor(line.speakerId);
  const caret = live
    ? `<span style="display:inline-block;width:2px;height:15px;background:oklch(0.62 0.18 295);margin-left:2px;vertical-align:-2px;" class="anim-caret"></span>`
    : '';
  return `
    <div class="anim-bubble" style="display:flex;gap:14px;margin-bottom:18px;">
      <div style="flex-shrink:0;width:96px;text-align:right;padding-top:2px;">
        <div style="font-size:12.5px;font-weight:600;color:${c.text};">${speakerLabel(line.speakerId)}</div>
        <div style="font-family:'Geist Mono',monospace;font-size:10.5px;color:oklch(0.72 0.01 270);margin-top:2px;">${line.timestamp}</div>
      </div>
      <div style="flex:1;border-left:2px solid ${live ? 'oklch(0.62 0.18 295)' : c.bar};padding-left:14px;">
        <div style="font-size:14.5px;line-height:1.5;color:oklch(0.28 0.015 280);">${line.text}${caret}</div>
        ${line.translation ? `<div style="font-size:14px;line-height:1.5;color:oklch(0.52 0.04 290);margin-top:4px;">${line.translation}</div>` : ''}
      </div>
    </div>`;
}

function renderLines() {
  const container = $('lines-container');
  const committed = state.lines.map((l) => lineHTML(l, false)).join('');
  const live = state.liveText
    ? lineHTML({ speakerId: state.liveSpeakerId, text: state.liveText, translation: '', timestamp: '' }, true)
    : '';
  container.innerHTML = committed + live;
  container.scrollTop = container.scrollHeight;

  $('float-lines').innerHTML = state.lines.slice(-3).map((l) => {
    const c = speakerColor(l.speakerId);
    return `<div style="border-left:2px solid ${c.bar};padding-left:11px;margin-bottom:13px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:11.5px;font-weight:600;color:${c.text};">${speakerLabel(l.speakerId)}</span>
        <span style="font-family:'Geist Mono',monospace;font-size:10px;color:oklch(0.72 0.01 270);">${l.timestamp}</span>
      </div>
      <div style="font-size:13px;line-height:1.45;color:oklch(0.3 0.015 280);">${l.text}</div>
      <div style="font-size:12.5px;line-height:1.45;color:oklch(0.54 0.04 290);margin-top:2px;">${l.translation}</div>
    </div>`;
  }).join('');
}

function renderAnalysis(a) {
  $('summary-text').textContent = a.summary || 'Chưa có tóm tắt.';
  $('actions-list').innerHTML = (a.actions || []).map((t) => `
    <div style="display:flex;gap:9px;align-items:flex-start;background:oklch(0.995 0.002 270);border:1px solid oklch(0.93 0.005 270);border-radius:9px;padding:10px 11px;">
      <span style="width:15px;height:15px;border-radius:4px;border:1.5px solid oklch(0.8 0.01 270);flex-shrink:0;margin-top:1px;"></span>
      <span style="font-size:12.5px;line-height:1.45;color:oklch(0.38 0.02 280);">${t}</span>
    </div>`).join('');
  $('replies-list').innerHTML = (a.replies || []).map((r) => `
    <div style="background:oklch(0.985 0.012 295);border:1px solid oklch(0.91 0.03 295);border-radius:9px;padding:10px 12px;">
      <div style="font-size:11px;color:oklch(0.58 0.06 295);font-weight:600;margin-bottom:4px;">${r.q}</div>
      <div style="font-size:12.5px;line-height:1.5;color:oklch(0.4 0.04 290);">${r.a}</div>
    </div>`).join('');
}

function appendQaMessage(q, a) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="margin-bottom:6px;font-size:12.5px;color:oklch(0.42 0.1 295);font-weight:600;">❓ ${q}</div>
    <div style="font-size:12.5px;line-height:1.5;color:oklch(0.38 0.02 280);background:oklch(0.995 0.002 270);border:1px solid oklch(0.93 0.005 270);border-radius:9px;padding:10px 12px;">${a}</div>`;
  $('qa-history').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
}

// ── IPC subscriptions ──
window.api.onStatus(({ listening }) => {
  state.listening = listening;
  if (!listening) { state.liveText = ''; renderLines(); }
  applyListeningState();
});

window.api.onInterim(({ speakerId, text }) => {
  state.liveText      = text;
  state.liveSpeakerId = speakerId;
  renderLines();
});

window.api.onFinal((line) => {
  state.lines.push(line);
  state.liveText = '';
  renderLines();
  $('session-date').textContent = line.timestamp;
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
$('btn-float-start-stop').addEventListener('click', toggleListen);

$('btn-collapse').addEventListener('click', () => setView('floating'));
$('btn-expand').addEventListener('click',   () => setView('expanded'));

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

document.querySelectorAll('.float-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    setView('expanded');
    $('qa-input').value = btn.dataset.q;
    $('qa-input').focus();
  });
});

// ── Initial render ──
applyListeningState();
applySourceStyles();
applyLangStyles();
