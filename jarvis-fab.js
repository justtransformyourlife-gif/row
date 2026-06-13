/*!
 * jarvis-fab.js — Global Jarvis AI interface
 * Self-injects on every page via topbar.js.
 * Exposes window.jarvis for jarvis.html to hook into.
 */
(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  // CONFIG  ← set your Gemini key here (one place for all pages)
  // ══════════════════════════════════════════════════════════════════════
  const GEMINI_KEY   = '';          // aistudio.google.com/apikey
  const GEMINI_MODEL = 'gemini-2.0-flash';
  window.JARVIS_KEY  = GEMINI_KEY;  // shared with jarvis.html

  // ── storage keys ──────────────────────────────────────────────────────
  const K_SETTER = 'jarvis_setter';
  const K_CF     = 'jarvis_cf';
  const K_KPIS   = 'jarvis_kpis';
  const K_WATER  = 'po_water_v1';

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  const isJarvisPage = location.pathname.replace(/\\/g, '/').endsWith('jarvis.html');

  // ══════════════════════════════════════════════════════════════════════
  // CSS
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
#jg-root { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; }

/* ── FAB anchor ── */
#jg-fab-wrap {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 20px));
  right: 20px;
  width: 58px; height: 58px;
  z-index: 890;
}

/* Ripple rings */
.jg-ring {
  position: absolute; inset: 0; border-radius: 50%;
  opacity: 0; pointer-events: none;
}
.jg-ring:nth-child(1) { border: 1.5px solid rgba(0,229,255,0.75); }
.jg-ring:nth-child(2) { border: 1.5px solid rgba(242,192,99,0.65); }
.jg-ring:nth-child(3) { border: 1.5px solid rgba(0,229,255,0.45); }
@keyframes jg-ripple {
  0%   { transform: scale(1);   opacity: 0.9; }
  70%  { opacity: 0.15; }
  100% { transform: scale(4.2); opacity: 0; }
}
#jg-fab-wrap.listening .jg-ring:nth-child(1) { animation: jg-ripple 2.2s ease-out infinite 0.00s; }
#jg-fab-wrap.listening .jg-ring:nth-child(2) { animation: jg-ripple 2.2s ease-out infinite 0.60s; }
#jg-fab-wrap.listening .jg-ring:nth-child(3) { animation: jg-ripple 2.2s ease-out infinite 1.20s; }

/* The FAB button */
#jg-fab {
  position: relative; z-index: 2;
  width: 58px; height: 58px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #141424 0%, #09090f 100%);
  border: 2px solid rgba(0,229,255,0.30);
  color: #00E5FF; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  animation: jg-breathe 3.5s ease-in-out infinite;
  transition: border-color 0.25s;
}
@keyframes jg-breathe {
  0%,100% { box-shadow: 0 0 14px rgba(0,229,255,0.22), 0 0 28px rgba(0,229,255,0.07), 0 0 5px rgba(242,192,99,0.05), 0 8px 24px rgba(0,0,0,0.55); }
  50%      { box-shadow: 0 0 26px rgba(0,229,255,0.40), 0 0 52px rgba(0,229,255,0.13), 0 0 16px rgba(242,192,99,0.10), 0 8px 24px rgba(0,0,0,0.55); }
}
#jg-fab:hover {
  border-color: rgba(0,229,255,0.65);
  animation-play-state: paused;
  box-shadow: 0 0 30px rgba(0,229,255,0.48), 0 0 60px rgba(0,229,255,0.15), 0 8px 24px rgba(0,0,0,0.55);
}
#jg-fab-wrap.overlay-open #jg-fab { border-color: rgba(0,229,255,0.8); animation: jg-glow-open 2s ease-in-out infinite; }
@keyframes jg-glow-open {
  0%,100% { box-shadow: 0 0 20px rgba(0,229,255,0.50), 0 0 40px rgba(0,229,255,0.18), 0 8px 24px rgba(0,0,0,0.55); }
  50%      { box-shadow: 0 0 36px rgba(0,229,255,0.70), 0 0 72px rgba(0,229,255,0.25), 0 8px 24px rgba(0,0,0,0.55); }
}
#jg-fab-wrap.listening #jg-fab { border-color: #00E5FF; animation: jg-listen-glow 1.5s ease-in-out infinite; }
@keyframes jg-listen-glow {
  0%,100% { box-shadow: 0 0 22px rgba(0,229,255,0.60), 0 0 50px rgba(0,229,255,0.22), 0 8px 24px rgba(0,0,0,0.6); }
  50%      { box-shadow: 0 0 40px rgba(0,229,255,0.85), 0 0 90px rgba(0,229,255,0.35), 0 0 24px rgba(242,192,99,0.18), 0 8px 24px rgba(0,0,0,0.6); }
}
#jg-fab-wrap.processing #jg-fab { border-color: rgba(242,192,99,0.55); animation: jg-process-glow 2s ease-in-out infinite; }
@keyframes jg-process-glow {
  0%,100% { box-shadow: 0 0 16px rgba(242,192,99,0.30), 0 0 36px rgba(242,192,99,0.10), 0 8px 24px rgba(0,0,0,0.55); }
  50%      { box-shadow: 0 0 30px rgba(242,192,99,0.50), 0 0 66px rgba(242,192,99,0.18), 0 8px 24px rgba(0,0,0,0.55); }
}
.jg-fab-spinner {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid rgba(242,192,99,0.22); border-top-color: #F2C063;
  animation: jg-spin 0.8s linear infinite; display: none;
}
.jg-fab-wrap-processing .jg-fab-spinner { display: block; }
@keyframes jg-spin { to { transform: rotate(360deg); } }

/* ── Overlay ── */
#jg-overlay {
  position: fixed;
  bottom: max(88px, calc(58px + 20px + 10px + env(safe-area-inset-bottom, 0px)));
  right: 16px;
  width: min(380px, calc(100vw - 28px));
  max-height: calc(100vh - 120px);
  background: rgba(5,5,10,0.97);
  border: 1px solid rgba(0,229,255,0.20);
  border-radius: 22px;
  overflow: hidden;
  z-index: 889;
  opacity: 0; transform: translateY(18px) scale(0.97);
  pointer-events: none;
  transition: opacity 0.3s cubic-bezier(.4,0,.2,1), transform 0.3s cubic-bezier(.4,0,.2,1);
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.06);
}
#jg-overlay.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
/* top glow line */
#jg-overlay::before {
  content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,0.55), transparent);
}

/* Overlay header */
.jg-hd {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.jg-hd-label {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  color: #00E5FF; flex: 1;
}
.jg-mode-toggle { display: flex; gap: 3px; padding: 3px; background: rgba(255,255,255,0.05); border-radius: 9px; }
.jg-mode-btn {
  padding: 5px 12px; border-radius: 7px; border: none;
  background: transparent; color: rgba(255,255,255,0.45);
  font-family: inherit; font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; cursor: pointer; transition: all 0.18s;
  -webkit-tap-highlight-color: transparent;
}
.jg-mode-btn.active { background: rgba(0,229,255,0.18); color: #00E5FF; }
.jg-mode-btn.active.call { background: rgba(242,192,99,0.16); color: #F2C063; }
.jg-hd-actions { display: flex; gap: 2px; }
.jg-icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: transparent; color: rgba(255,255,255,0.4);
  font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; transition: all 0.15s;
  text-decoration: none;
}
.jg-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

/* ── CHAT PANE ── */
#jg-chat-pane { display: flex; flex-direction: column; height: 360px; }
#jg-convo {
  flex: 1; overflow-y: auto; padding: 12px 14px 8px;
  display: flex; flex-direction: column; gap: 8px;
  scrollbar-width: none;
}
#jg-convo::-webkit-scrollbar { display: none; }
.jg-msg {
  max-width: 90%; padding: 9px 13px;
  border-radius: 13px; font-size: 13px; line-height: 1.58;
}
.jg-msg.user {
  align-self: flex-end;
  background: rgba(0,229,255,0.10); border: 1px solid rgba(0,229,255,0.20);
  color: #FAFAFA; border-bottom-right-radius: 4px;
}
.jg-msg.jarvis {
  align-self: flex-start;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  color: #B8B6B0; border-bottom-left-radius: 4px;
}
.jg-msg-label {
  display: block; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em;
  color: #00E5FF; margin-bottom: 4px; text-transform: uppercase;
}
.jg-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.22); font-size: 12px; text-align: center;
  padding: 0 24px; line-height: 1.7; font-style: italic;
}
.jg-dots { display: flex; gap: 5px; align-items: center; }
.jg-dots span {
  width: 5px; height: 5px; border-radius: 50%;
  background: #00E5FF; opacity: 0.2;
  animation: jg-dot 1.4s ease-in-out infinite;
}
.jg-dots span:nth-child(2) { animation-delay: 0.22s; }
.jg-dots span:nth-child(3) { animation-delay: 0.44s; }
@keyframes jg-dot {
  0%,80%,100% { opacity: 0.18; transform: scale(0.8); }
  40%          { opacity: 1;    transform: scale(1); }
}
#jg-input-row {
  display: flex; gap: 7px; padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
#jg-input {
  flex: 1; background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.10); border-radius: 11px;
  color: #FAFAFA; font-family: inherit; font-size: 13px;
  padding: 9px 13px; outline: none; transition: border-color 0.2s;
}
#jg-input:focus { border-color: rgba(0,229,255,0.40); }
#jg-input::placeholder { color: rgba(255,255,255,0.22); }
.jg-send-btn {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: rgba(0,229,255,0.14); border: 1px solid rgba(0,229,255,0.28);
  color: #00E5FF; font-size: 17px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; transition: all 0.18s;
}
.jg-send-btn:hover   { background: rgba(0,229,255,0.24); }
.jg-send-btn:disabled{ opacity: 0.3; cursor: not-allowed; }

/* ── CALL PANE ── */
#jg-call-pane {
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 16px 22px; gap: 16px;
}
/* Wave bars container */
#jg-wave-wrap {
  width: 100%; height: 80px;
  display: flex; align-items: center; justify-content: center;
  gap: 3px; position: relative;
}
/* center line */
#jg-wave-wrap::after {
  content: ''; position: absolute; left: 0; right: 0;
  top: 50%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,0.18), rgba(242,192,99,0.12), transparent);
  pointer-events: none;
}
.jg-wbar {
  flex: 1; max-width: 7px; border-radius: 3px;
  transform-origin: center; opacity: 0.22;
  transition: opacity 0.4s;
}
/* odd bars cyan, even bars gold */
.jg-wbar:nth-child(odd)  { background: linear-gradient(to top, #00E5FF, rgba(0,229,255,0.3)); }
.jg-wbar:nth-child(even) { background: linear-gradient(to top, #F2C063, rgba(242,192,99,0.3)); }
@keyframes jg-wbar-pulse {
  0%,100% { transform: scaleY(0.08); }
  50%      { transform: scaleY(1); }
}
/* Heights set by JS. Animated when .wave-active on wrap */
#jg-wave-wrap.wave-active .jg-wbar {
  opacity: 0.88;
  animation: jg-wbar-pulse var(--dur, 1s) ease-in-out infinite var(--delay, 0s);
}
/* Processing state: slow gold-tinted idle */
#jg-wave-wrap.wave-processing .jg-wbar {
  opacity: 0.55;
  animation: jg-wbar-pulse 2.4s ease-in-out infinite var(--delay, 0s);
  filter: hue-rotate(25deg) brightness(1.1);
}
/* Jarvis speaking: faster gold */
#jg-wave-wrap.wave-jarvis .jg-wbar {
  opacity: 0.80;
  animation: jg-wbar-pulse 0.7s ease-in-out infinite var(--delay, 0s);
  filter: hue-rotate(180deg) saturate(1.2) brightness(1.1);
}

.jg-call-status {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; letter-spacing: 0.10em;
  color: rgba(255,255,255,0.45); text-align: center;
}
.jg-call-status.listening { color: #00E5FF; }
.jg-call-status.processing{ color: #F2C063; }
.jg-call-status.speaking  { color: #6BE3A4; }

#jg-call-mic {
  width: 66px; height: 66px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #141424 0%, #09090f 100%);
  border: 2px solid rgba(0,229,255,0.35);
  color: #00E5FF; font-size: 22px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s;
  box-shadow: 0 0 16px rgba(0,229,255,0.20), 0 6px 20px rgba(0,0,0,0.5);
}
#jg-call-mic:hover { border-color: rgba(0,229,255,0.65); box-shadow: 0 0 28px rgba(0,229,255,0.38), 0 6px 20px rgba(0,0,0,0.5); }
#jg-call-mic.active { border-color: #00E5FF; box-shadow: 0 0 32px rgba(0,229,255,0.60), 0 0 64px rgba(0,229,255,0.20), 0 6px 20px rgba(0,0,0,0.5); }

.jg-last-response {
  width: 100%; padding: 10px 12px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 11px; font-size: 12px; color: #76746E; line-height: 1.6;
  max-height: 80px; overflow-y: auto; scrollbar-width: none;
}
.jg-last-response::-webkit-scrollbar { display: none; }
.jg-last-response:empty { display: none; }
`;

  // ══════════════════════════════════════════════════════════════════════
  // HTML
  // ══════════════════════════════════════════════════════════════════════
  // Wave bars: 24 bars with height values following a bell curve
  const BAR_HEIGHTS = [12,22,36,50,63,74,84,92,97,100,100,98,94,88,80,70,58,44,30,34,48,62,74,58];
  const barDurations = [1.10,0.95,1.05,0.90,1.15,0.98,1.08,0.92,1.02,0.96,1.12,0.88,1.06,1.00,0.94,1.18,0.86,1.04,0.92,1.08,0.97,1.14,0.89,1.01];

  const waveBars = BAR_HEIGHTS.map((h, i) => {
    const delay = (i * 0.055).toFixed(2);
    return `<div class="jg-wbar" style="height:${h}%;--delay:${delay}s;--dur:${barDurations[i] || 1}s"></div>`;
  }).join('');

  const HTML = `
<div id="jg-root">
  <!-- FAB -->
  <div id="jg-fab-wrap">
    <div class="jg-ring"></div>
    <div class="jg-ring"></div>
    <div class="jg-ring"></div>
    <button id="jg-fab" aria-label="Open Jarvis">
      <svg id="jg-fab-mic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
      <div class="jg-fab-spinner" id="jg-fab-spinner"></div>
    </button>
  </div>

  <!-- Overlay -->
  <div id="jg-overlay" role="dialog" aria-label="Jarvis AI">
    <div class="jg-hd">
      <span class="jg-hd-label">◈ JARVIS</span>
      <div class="jg-mode-toggle">
        <button class="jg-mode-btn active" id="jg-btn-chat">💬 Chat</button>
        <button class="jg-mode-btn" id="jg-btn-call">📞 Call</button>
      </div>
      <div class="jg-hd-actions">
        <a class="jg-icon-btn" href="jarvis.html" title="Open full Jarvis">↗</a>
        <button class="jg-icon-btn" id="jg-close" aria-label="Close">✕</button>
      </div>
    </div>

    <!-- Chat pane -->
    <div id="jg-chat-pane">
      <div id="jg-convo">
        <div class="jg-empty" id="jg-empty">
          Say something like:<br>
          "Mantilla finished alignment call, drank 2 bottles, got a $3k client"
        </div>
      </div>
      <div id="jg-input-row">
        <input id="jg-input" type="text" placeholder="Tell Jarvis anything…" autocomplete="off" autocorrect="off">
        <button class="jg-send-btn" id="jg-voice-btn" title="Voice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
          </svg>
        </button>
        <button class="jg-send-btn" id="jg-send" aria-label="Send">↑</button>
      </div>
    </div>

    <!-- Call pane (hidden by default) -->
    <div id="jg-call-pane" style="display:none">
      <div id="jg-wave-wrap">${waveBars}</div>
      <div class="jg-call-status" id="jg-call-status">Tap the mic to start</div>
      <button id="jg-call-mic" aria-label="Speak to Jarvis">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8"  y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <div class="jg-last-response" id="jg-last-response"></div>
    </div>
  </div>
</div>`;

  // ══════════════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════════════
  let overlayOpen  = false;
  let currentMode  = 'chat';   // 'chat' | 'call'
  let callState    = 'idle';   // 'idle' | 'listening' | 'processing' | 'speaking'
  let conversation = [];
  let isProcessing = false;
  let recognition  = null;
  let voiceActive  = false;

  // callbacks for jarvis.html to hook in
  const _onResponse    = [];
  const _onStateChange = [];
  function emit(type, data) {
    (type === 'response' ? _onResponse : _onStateChange).forEach(fn => { try { fn(data); } catch (e) {} });
  }

  // ══════════════════════════════════════════════════════════════════════
  // FUNCTION EXECUTION (updates localStorage + fires storage event)
  // ══════════════════════════════════════════════════════════════════════
  function runFn(name, args) {
    let result = 'OK';
    try {
      if (name === 'log_water') {
        const liters = parseFloat(args.liters) || 0;
        if (liters > 0) {
          let ws = {}; try { ws = JSON.parse(localStorage.getItem(K_WATER) || '{}'); } catch(e) {}
          ws.logs = ws.logs || {};
          const bottleMl = ws.bottleMl || 1000;
          const units = Math.max(1, Math.round((liters * 1000) / bottleMl));
          ws.logs[todayStr()] = (ws.logs[todayStr()] || 0) + units;
          localStorage.setItem(K_WATER, JSON.stringify(ws));
          result = `Logged ${liters}L.`;
        }
      } else if (name === 'log_setter') {
        let s = {}; try { s = JSON.parse(localStorage.getItem(K_SETTER) || '{}'); } catch(e) {}
        if (!s.date || s.date !== todayStr()) s = { date: todayStr(), checklist: {}, feedback: '', kpis: { dms: 0, replies: 0, calls: 0 } };
        if (args.alignment_call) s.checklist.alignment_call = true;
        if (args.lead_list)      s.checklist.lead_list      = true;
        if (args.scripts)        s.checklist.scripts        = true;
        if (args.outreach_sent)  s.checklist.outreach_sent  = true;
        if (args.dms)     s.kpis.dms     = (s.kpis.dms     || 0) + parseInt(args.dms);
        if (args.replies) s.kpis.replies = (s.kpis.replies  || 0) + parseInt(args.replies);
        if (args.calls)   s.kpis.calls   = (s.kpis.calls    || 0) + parseInt(args.calls);
        if (args.feedback) s.feedback = args.feedback;
        localStorage.setItem(K_SETTER, JSON.stringify(s));
        result = 'Setter updated.';
      } else if (name === 'log_cashflow') {
        const amt = parseFloat(args.amount);
        if (amt > 0) {
          let cf = { transactions: [] }; try { cf = JSON.parse(localStorage.getItem(K_CF) || '{}'); cf.transactions = cf.transactions || []; } catch(e) {}
          cf.transactions.push({ id: Date.now(), type: args.type, amount: amt, desc: args.desc || '', date: todayStr() });
          localStorage.setItem(K_CF, JSON.stringify(cf));
          result = `$${amt.toLocaleString()} ${args.type === 'in' ? 'income' : 'expense'} logged.`;
        }
      } else if (name === 'log_outreach') {
        let k = { date: todayStr(), dms: 0, calls: 0, streak: 0, lastPostDate: '' };
        try { const r = JSON.parse(localStorage.getItem(K_KPIS) || '{}'); k = r.date === todayStr() ? r : Object.assign(k, { streak: r.streak || 0, lastPostDate: r.lastPostDate || '' }); } catch(e) {}
        if (args.dms)   k.dms   = (k.dms   || 0) + parseInt(args.dms);
        if (args.calls) k.calls = (k.calls  || 0) + parseInt(args.calls);
        localStorage.setItem(K_KPIS, JSON.stringify(k));
        result = 'KPIs updated.';
      } else if (name === 'log_content') {
        let k = { date: todayStr(), dms: 0, calls: 0, streak: 0, lastPostDate: '' };
        try { const r = JSON.parse(localStorage.getItem(K_KPIS) || '{}'); k = r.date === todayStr() ? r : Object.assign(k, { streak: r.streak || 0, lastPostDate: r.lastPostDate || '' }); } catch(e) {}
        if (k.lastPostDate !== todayStr()) {
          const prev = new Date(); prev.setDate(prev.getDate() - 1);
          const yStr = prev.getFullYear() + '-' + String(prev.getMonth()+1).padStart(2,'0') + '-' + String(prev.getDate()).padStart(2,'0');
          k.streak = (k.lastPostDate === yStr) ? (k.streak || 0) + 1 : 1;
          k.lastPostDate = todayStr();
          localStorage.setItem(K_KPIS, JSON.stringify(k));
          result = `Content posted. Streak: ${k.streak} days.`;
        } else { result = 'Post already logged today.'; }
      }
      // Notify other scripts on this page of data change
      window.dispatchEvent(new CustomEvent('jarvis-data-update', { detail: { fn: name, args, result } }));
    } catch (e) { result = 'Error: ' + e.message; }
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════
  // GEMINI API
  // ══════════════════════════════════════════════════════════════════════
  const SYSTEM_PROMPT = `You are JARVIS — the personal AI command system for Nicolas.

Nicolas is a men's transformational coach (over-40 niche), entrepreneur, high-performer. His setter is Mantilla: handles outreach DMs, lead list auditing, script reviews, and call booking.

PERSONALITY: Elite performance coach meets precision AI. Direct, sharp, brief. Results language only. No hollow affirmations. Speak with authority.

COACHING STYLE: When not triggering functions, deliver elite-level personal development and productivity coaching. Be provocative and direct. Ask powerful questions. Hold Nicolas accountable.

FUNCTION PROTOCOL: Extract ALL data points from natural speech and call the appropriate functions simultaneously. After executing, deliver a 2-4 line debrief:
Line 1 — What was logged (facts, numbers)
Line 2 — Current status snapshot
Line 3 — One sharp next action or accountability challenge

TONE:
✓ "2L in. You're at 67%. Third bottle before your next session — non-negotiable."
✗ "Great job staying hydrated! That's so important for your performance!"`;

  const TOOLS = [{
    functionDeclarations: [
      { name: 'log_water', description: 'Log water intake. Call when user mentions drinking water, bottles, or liters.',
        parameters: { type: 'OBJECT', properties: { liters: { type: 'NUMBER' } }, required: ['liters'] } },
      { name: 'log_setter', description: 'Log Mantilla setter activity.',
        parameters: { type: 'OBJECT', properties: {
          alignment_call: { type: 'BOOLEAN' }, lead_list: { type: 'BOOLEAN' },
          scripts: { type: 'BOOLEAN' }, outreach_sent: { type: 'BOOLEAN' },
          dms: { type: 'NUMBER' }, replies: { type: 'NUMBER' }, calls: { type: 'NUMBER' },
          feedback: { type: 'STRING' }
        }}},
      { name: 'log_cashflow', description: 'Log business income or expense.',
        parameters: { type: 'OBJECT', properties: {
          type: { type: 'STRING', enum: ['in','out'] }, amount: { type: 'NUMBER' }, desc: { type: 'STRING' }
        }, required: ['type','amount'] }},
      { name: 'log_outreach', description: 'Log personal DM outreach or calls by Nicolas.',
        parameters: { type: 'OBJECT', properties: { dms: { type: 'NUMBER' }, calls: { type: 'NUMBER' } } }},
      { name: 'log_content', description: 'Log a content post, update streak.',
        parameters: { type: 'OBJECT', properties: { type: { type: 'STRING' } } }}
    ]
  }];

  async function geminiCall() {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: TOOLS,
          tool_config: { function_calling_config: { mode: 'AUTO' } },
          contents: conversation,
          generation_config: { temperature: 0.65, max_output_tokens: 512 }
        })
      }
    );
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    return res.json();
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || isProcessing) return;

    if (!GEMINI_KEY) {
      const msg = 'Set GEMINI_KEY in jarvis-fab.js to enable AI. Get one free at aistudio.google.com/apikey';
      appendMsg('jarvis', msg);
      emit('response', { text: msg });
      return;
    }

    isProcessing = true;
    emit('state', 'processing');
    setFabState('processing');
    if (currentMode === 'call') setCallState('processing');

    appendMsg('user', text);
    conversation.push({ role: 'user', parts: [{ text }] });
    appendThinking();

    try {
      let resp = await geminiCall();
      removeThinking();

      for (let i = 0; i < 6; i++) {
        const parts   = resp.candidates?.[0]?.content?.parts || [];
        const fnCalls = parts.filter(p => p.functionCall);
        const txtPts  = parts.filter(p => p.text);

        if (!fnCalls.length) {
          const finalTxt = txtPts.map(p => p.text).join('');
          if (finalTxt) {
            appendMsg('jarvis', finalTxt);
            emit('response', { text: finalTxt });
            if (currentMode === 'call') {
              setCallState('speaking');
              showLastResponse(finalTxt);
              speakJarvis(finalTxt);
            }
          }
          conversation.push({ role: 'model', parts });
          break;
        }

        conversation.push({ role: 'model', parts });
        const fnResps = fnCalls.map(p => ({
          functionResponse: { name: p.functionCall.name, response: { result: runFn(p.functionCall.name, p.functionCall.args || {}) } }
        }));
        conversation.push({ role: 'user', parts: fnResps });

        if (i < 5) { appendThinking(); resp = await geminiCall(); removeThinking(); }
      }
    } catch (err) {
      removeThinking();
      const msg = '⚠ ' + (err.message || 'Could not reach Gemini.');
      appendMsg('jarvis', msg);
      emit('response', { text: msg, error: true });
    }

    isProcessing = false;
    emit('state', 'idle');
    setFabState(overlayOpen ? 'overlay-open' : 'idle');
    if (currentMode === 'call' && callState !== 'speaking') setCallState('idle');
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEXT-TO-SPEECH
  // ══════════════════════════════════════════════════════════════════════
  function speakJarvis(text) {
    if (!window.speechSynthesis) { setCallState('idle'); return; }
    speechSynthesis.cancel();

    // Strip markdown for clean speech
    const clean = text.replace(/\*\*|__|\*|_|`|#{1,6}\s/g, '').replace(/<br>/g, ' ');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.93; utterance.pitch = 0.88; utterance.volume = 1;

    // Prefer a lower-pitched English male voice
    function trySpeak() {
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v => /daniel|alex|david|james|mark/i.test(v.name) && /en/i.test(v.lang))
        || voices.find(v => /en-US/i.test(v.lang) && !v.name.includes('Google'))
        || voices.find(v => /en/i.test(v.lang));
      if (preferred) utterance.voice = preferred;
      utterance.onstart = () => setCallState('speaking');
      utterance.onend   = () => { if (callState === 'speaking') setCallState('idle'); };
      utterance.onerror = () => setCallState('idle');
      speechSynthesis.speak(utterance);
    }

    // Voices may not be loaded yet on first use
    if (speechSynthesis.getVoices().length) { trySpeak(); }
    else { speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true }); }
  }

  // ══════════════════════════════════════════════════════════════════════
  // VOICE RECOGNITION
  // ══════════════════════════════════════════════════════════════════════
  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';

    rec.onstart = () => {
      voiceActive = true;
      setFabState('listening');
      if (currentMode === 'call') setCallState('listening');
    };
    rec.onresult = e => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      const inp = document.getElementById('jg-input');
      if (inp) inp.value = t;
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop();
        if (inp) inp.value = '';
        send(t);
      }
    };
    rec.onend = () => {
      voiceActive = false;
      if (!isProcessing) {
        setFabState(overlayOpen ? 'overlay-open' : 'idle');
        if (currentMode === 'call') setCallState('idle');
      }
      const micBtn = document.getElementById('jg-call-mic');
      if (micBtn) micBtn.classList.remove('active');
    };
    rec.onerror = () => { rec.stop(); };
    return rec;
  }

  function startListening() {
    if (!recognition) recognition = initRecognition();
    if (!recognition) { alert('Voice input requires Chrome or Edge.'); return; }
    if (voiceActive) { recognition.stop(); return; }
    speechSynthesis.cancel();
    try { recognition.start(); } catch (e) {}
  }
  function stopListening() { if (voiceActive && recognition) recognition.stop(); }

  // ══════════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ══════════════════════════════════════════════════════════════════════
  function setFabState(state) {
    const wrap = document.getElementById('jg-fab-wrap');
    if (!wrap) return;
    wrap.className = '';
    if (state === 'listening')    wrap.classList.add('listening');
    if (state === 'processing')   wrap.classList.add('processing');
    if (state === 'overlay-open') wrap.classList.add('overlay-open');
    // Show/hide spinner
    const spinner = document.getElementById('jg-fab-spinner');
    const mic     = document.getElementById('jg-fab-mic');
    if (spinner && mic) {
      spinner.style.display = state === 'processing' ? 'block' : 'none';
      mic.style.display     = state === 'processing' ? 'none'  : 'block';
    }
  }

  function setCallState(state) {
    callState = state;
    const wrap   = document.getElementById('jg-wave-wrap');
    const status = document.getElementById('jg-call-status');
    const micBtn = document.getElementById('jg-call-mic');
    if (!wrap) return;
    wrap.classList.remove('wave-active', 'wave-processing', 'wave-jarvis');
    if (state === 'listening')   { wrap.classList.add('wave-active');      if (status) { status.textContent = 'Listening to Nicolas…'; status.className = 'jg-call-status listening'; } }
    if (state === 'processing')  { wrap.classList.add('wave-processing');  if (status) { status.textContent = 'Jarvis is thinking…';   status.className = 'jg-call-status processing'; } }
    if (state === 'speaking')    { wrap.classList.add('wave-jarvis');       if (status) { status.textContent = 'Jarvis is speaking…';   status.className = 'jg-call-status speaking'; } }
    if (state === 'idle')        { if (status) { status.textContent = 'Tap the mic to speak'; status.className = 'jg-call-status'; } }
    if (micBtn) micBtn.classList.toggle('active', state === 'listening');
    emit('callState', state);
  }

  function showLastResponse(text) {
    const el = document.getElementById('jg-last-response');
    if (el) el.textContent = text;
  }

  function appendMsg(role, html) {
    const convo = document.getElementById('jg-convo');
    if (!convo) return;
    document.getElementById('jg-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'jg-msg ' + role;
    if (role === 'jarvis') {
      el.innerHTML = `<span class="jg-msg-label">JARVIS</span>${html.replace(/\n/g, '<br>')}`;
    } else {
      el.textContent = html;
    }
    convo.appendChild(el);
    convo.scrollTop = convo.scrollHeight;
  }

  function appendThinking() {
    const convo = document.getElementById('jg-convo');
    if (!convo) return;
    const el = document.createElement('div');
    el.className = 'jg-msg jarvis'; el.id = 'jg-thinking';
    el.innerHTML = `<span class="jg-msg-label">JARVIS</span><div class="jg-dots"><span></span><span></span><span></span></div>`;
    convo.appendChild(el);
    convo.scrollTop = convo.scrollHeight;
  }

  function removeThinking() { document.getElementById('jg-thinking')?.remove(); }

  function switchMode(mode) {
    currentMode = mode;
    const chatPane = document.getElementById('jg-chat-pane');
    const callPane = document.getElementById('jg-call-pane');
    const chatBtn  = document.getElementById('jg-btn-chat');
    const callBtn  = document.getElementById('jg-btn-call');
    if (!chatPane || !callPane) return;
    if (mode === 'chat') {
      chatPane.style.display = 'flex'; callPane.style.display = 'none';
      chatBtn.classList.add('active'); chatBtn.classList.remove('call');
      callBtn.classList.remove('active','call');
    } else {
      chatPane.style.display = 'none'; callPane.style.display = 'flex';
      callBtn.classList.add('active','call'); chatBtn.classList.remove('active');
      setCallState('idle');
    }
  }

  function openOverlay() {
    const ov = document.getElementById('jg-overlay');
    if (!ov) return;
    overlayOpen = true;
    ov.classList.add('open');
    setFabState('overlay-open');
  }
  function closeOverlay() {
    const ov = document.getElementById('jg-overlay');
    if (!ov) return;
    overlayOpen = false;
    stopListening();
    speechSynthesis.cancel?.();
    ov.classList.remove('open');
    setFabState('idle');
    setCallState('idle');
  }

  // ══════════════════════════════════════════════════════════════════════
  // WIRE UP EVENTS
  // ══════════════════════════════════════════════════════════════════════
  function wire() {
    document.getElementById('jg-fab').addEventListener('click', () => {
      if (isJarvisPage && window.jarvis?._activateCard) {
        window.jarvis._activateCard();
      } else {
        overlayOpen ? closeOverlay() : openOverlay();
      }
    });

    document.getElementById('jg-close').addEventListener('click', closeOverlay);

    document.getElementById('jg-send').addEventListener('click', () => {
      const inp = document.getElementById('jg-input');
      const txt = inp.value.trim();
      inp.value = '';
      if (txt) send(txt);
    });
    document.getElementById('jg-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('jg-send').click(); }
    });

    document.getElementById('jg-voice-btn').addEventListener('click', startListening);

    document.getElementById('jg-btn-chat').addEventListener('click', () => switchMode('chat'));
    document.getElementById('jg-btn-call').addEventListener('click', () => {
      switchMode('call');
      if (!overlayOpen) openOverlay();
    });

    document.getElementById('jg-call-mic').addEventListener('click', () => {
      if (callState === 'listening') { stopListening(); }
      else if (callState === 'idle')  { startListening(); }
      else if (callState === 'speaking') { speechSynthesis.cancel(); setCallState('idle'); }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlayOpen) closeOverlay();
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PUBLIC API  (window.jarvis)
  // ══════════════════════════════════════════════════════════════════════
  window.jarvis = {
    send,
    startListening,
    stopListening,
    openOverlay,
    closeOverlay,
    switchMode,
    setCallState,
    onResponse:    cb => _onResponse.push(cb),
    onStateChange: cb => _onStateChange.push(cb),
    getConversation: () => conversation,
  };

  // ══════════════════════════════════════════════════════════════════════
  // MOUNT
  // ══════════════════════════════════════════════════════════════════════
  function mount() {
    if (document.getElementById('jg-root')) return;
    const style = document.createElement('style'); style.id = 'jg-style';
    style.textContent = CSS; document.head.appendChild(style);
    const tmp = document.createElement('div');
    tmp.innerHTML = HTML.trim();
    document.body.appendChild(tmp.firstElementChild);
    wire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
