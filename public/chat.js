/* BayWorks Live Chat Widget — vanilla JS, no external deps */
(function () {
  'use strict';

  var _config = { tenantId: '' };

  /* ── Styles ─────────────────────────────────────────────────── */
  var CSS = `
    @keyframes bw-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
      70%  { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
      100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
    }
    @keyframes bw-fadein {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #bw-chat-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #6366f1;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      animation: bw-pulse 2.2s ease-out 0.4s 3;
      box-shadow: 0 4px 18px rgba(99,102,241,0.45);
      transition: background 0.2s, transform 0.15s;
    }
    #bw-chat-btn:hover {
      background: #4f46e5;
      transform: scale(1.07);
    }
    #bw-chat-btn svg { pointer-events: none; }
    #bw-chat-window {
      position: fixed;
      bottom: 96px;
      right: 28px;
      width: 320px;
      height: 400px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(15,23,42,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      animation: bw-fadein 0.22s ease;
      font-family: 'Outfit', system-ui, sans-serif;
    }
    #bw-chat-header {
      background: #6366f1;
      color: #fff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    #bw-chat-header .bw-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #bw-chat-header .bw-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
    }
    #bw-chat-header .bw-title {
      font-weight: 600;
      font-size: 14px;
      line-height: 1.3;
    }
    #bw-chat-header .bw-subtitle {
      font-size: 11px;
      opacity: 0.85;
    }
    #bw-chat-close {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: 6px;
      transition: background 0.15s;
      opacity: 0.85;
    }
    #bw-chat-close:hover { background: rgba(255,255,255,0.18); opacity: 1; }
    #bw-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bw-intro-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .bw-intro-msg {
      background: #f1f5f9;
      border-radius: 4px 12px 12px 12px;
      padding: 10px 13px;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.5;
    }
    .bw-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 4px;
    }
    .bw-input {
      width: 100%;
      padding: 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      font-family: inherit;
      color: #0f172a;
      background: #f8fafc;
      box-sizing: border-box;
      transition: border-color 0.15s;
      outline: none;
    }
    .bw-input:focus { border-color: #6366f1; background: #fff; }
    .bw-start-btn {
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.18s;
      margin-top: 4px;
    }
    .bw-start-btn:hover { background: #4f46e5; }
    .bw-msg-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bw-msg-row.bw-msg-user {
      align-items: flex-end;
    }
    .bw-bubble {
      max-width: 80%;
      padding: 9px 13px;
      border-radius: 4px 12px 12px 12px;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      background: #f1f5f9;
    }
    .bw-msg-user .bw-bubble {
      background: #6366f1;
      color: #fff;
      border-radius: 12px 4px 12px 12px;
    }
    .bw-msg-time {
      font-size: 10px;
      color: #94a3b8;
      padding: 0 2px;
    }
    .bw-typing {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 10px 13px;
      background: #f1f5f9;
      border-radius: 4px 12px 12px 12px;
      width: fit-content;
    }
    .bw-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
      animation: bw-bounce 1.2s infinite;
    }
    .bw-typing span:nth-child(2) { animation-delay: 0.2s; }
    .bw-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bw-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%            { transform: translateY(-5px); }
    }
    #bw-chat-footer {
      flex-shrink: 0;
      padding: 12px 12px 14px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 8px;
    }
    #bw-chat-input {
      flex: 1;
      padding: 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      font-family: inherit;
      color: #0f172a;
      background: #f8fafc;
      outline: none;
      transition: border-color 0.15s;
    }
    #bw-chat-input:focus { border-color: #6366f1; background: #fff; }
    #bw-chat-send {
      background: #6366f1;
      border: none;
      border-radius: 8px;
      padding: 0 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background 0.18s;
    }
    #bw-chat-send:hover { background: #4f46e5; }
  `;

  /* ── Helpers ─────────────────────────────────────────────────── */
  function now() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function injectCSS(css) {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildButton() {
    var btn = document.createElement('button');
    btn.id = 'bw-chat-btn';
    btn.setAttribute('aria-label', 'Open chat');
    btn.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    return btn;
  }

  function buildWindow() {
    var win = document.createElement('div');
    win.id = 'bw-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'BayWorks Chat');
    win.innerHTML = `
      <div id="bw-chat-header">
        <div class="bw-header-left">
          <div class="bw-avatar">P</div>
          <div>
            <div class="bw-title">Chat with BayWorks</div>
            <div class="bw-subtitle">Typically replies in minutes</div>
          </div>
        </div>
        <button id="bw-chat-close" aria-label="Close chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="bw-chat-body"></div>
      <div id="bw-chat-footer" style="display:none;">
        <input id="bw-chat-input" type="text" placeholder="Type a message…" autocomplete="off" />
        <button id="bw-chat-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;
    return win;
  }

  /* ── State machine ───────────────────────────────────────────── */
  var _phone = '';
  var _name  = '';
  var _chatState = 'INTRO'; // INTRO | CHAT

  function renderIntro(body) {
    body.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'bw-intro-wrap';
    wrap.innerHTML = `
      <div class="bw-intro-msg">
        Hi there! I'm Priya from BayWorks.<br/>
        Drop your details and I'll help you find the perfect office space right away.
      </div>
      <div class="bw-label">Your Name</div>
      <input class="bw-input" id="bw-intro-name" type="text" placeholder="Rahul Sharma" autocomplete="name" />
      <div class="bw-label">WhatsApp / Phone</div>
      <input class="bw-input" id="bw-intro-phone" type="tel" placeholder="+91 98765 43210" autocomplete="tel" />
      <button class="bw-start-btn" id="bw-start-chat">Start Chat</button>
    `;
    body.appendChild(wrap);

    document.getElementById('bw-start-chat').addEventListener('click', function () {
      var nameEl  = document.getElementById('bw-intro-name');
      var phoneEl = document.getElementById('bw-intro-phone');
      var n = (nameEl.value || '').trim();
      var p = (phoneEl.value || '').trim();
      if (!n) { nameEl.focus(); return; }
      if (!p) { phoneEl.focus(); return; }
      _name  = n;
      _phone = p;
      submitLead(n, p);
      renderChat(body);
    });

    // Allow Enter key on phone field to submit
    document.getElementById('bw-intro-phone').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('bw-start-chat').click();
    });
  }

  function appendMessage(body, text, isUser) {
    var row = document.createElement('div');
    row.className = 'bw-msg-row' + (isUser ? ' bw-msg-user' : '');
    row.innerHTML = `
      <div class="bw-bubble">${text}</div>
      <div class="bw-msg-time">${now()}</div>
    `;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function appendTyping(body) {
    var row = document.createElement('div');
    row.className = 'bw-msg-row';
    row.innerHTML = `<div class="bw-typing"><span></span><span></span><span></span></div>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function renderChat(body) {
    _chatState = 'CHAT';
    body.innerHTML = '';
    document.getElementById('bw-chat-footer').style.display = 'flex';

    // Agent greeting
    appendMessage(body, 'Hi! I\'m Priya from BayWorks. How can I help you find the perfect office space today?', false);

    var input = document.getElementById('bw-chat-input');
    var send  = document.getElementById('bw-chat-send');

    function doSend() {
      var msg = (input.value || '').trim();
      if (!msg) return;
      input.value = '';
      appendMessage(body, msg, true);
      var typing = appendTyping(body);
      setTimeout(function () {
        typing.remove();
        appendMessage(body,
          'Thanks for reaching out! Our team will contact you at ' + _phone + ' within 15 minutes.',
          false
        );
      }, 1500);
    }

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSend();
    });
    input.focus();
  }

  /* ── Lead capture ────────────────────────────────────────────── */
  function submitLead(name, phone) {
    var payload = { name: name, phone: phone, tenantId: _config.tenantId || '', source: 'live-chat' };
    fetch('/api/public/visit-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () { /* silent fail */ });
  }

  /* ── Main init ───────────────────────────────────────────────── */
  function init(config) {
    _config = Object.assign({ tenantId: '' }, config || {}, window.BW_CHAT_CONFIG || {});

    injectCSS(CSS);

    var btn = buildButton();
    var win = buildWindow();
    var visible = false;

    document.body.appendChild(btn);
    document.body.appendChild(win);
    win.style.display = 'none';

    btn.addEventListener('click', function () {
      visible = !visible;
      if (visible) {
        win.style.display = 'flex';
        var body = document.getElementById('bw-chat-body');
        if (_chatState === 'INTRO') renderIntro(body);
      } else {
        win.style.display = 'none';
      }
    });

    document.getElementById('bw-chat-close').addEventListener('click', function () {
      visible = false;
      win.style.display = 'none';
    });
  }

  /* ── Public API ──────────────────────────────────────────────── */
  window.BayWorksChat = { init: init };

  // Self-init on load — every page embeds this script with the same default config,
  // so there's no need for a separate inline `<script>BayWorksChat.init(...)</script>`
  // per page (keeps CSP script-src to 'self', no unsafe-inline needed). A page can still
  // override before this script loads via `window.BW_CHAT_CONFIG = { tenantId: '...' }`.
  init();
})();
