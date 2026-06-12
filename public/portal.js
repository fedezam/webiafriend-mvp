:root {
  --bg: #0a0a0c;
  --surface: #131316;
  --surface-raised: #1a1a1f;
  --border: #2a2a30;
  --accent: #00e676;
  --accent-dim: #00e67614;
  --accent-blue: #448aff;
  --accent-blue-dim: #448aff14;
  --accent-amber: #ffab40;
  --accent-amber-dim: #ffab4014;
  --accent-red: #ff5252;
  --accent-red-dim: #ff525214;
  --text: #e8e8ec;
  --text-muted: #6a6a75;
  --font-display: 'Space Grotesk', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --radius: 8px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  line-height: 1.4;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 15% 20%, #00e67606 0%, transparent 50%),
    radial-gradient(ellipse at 85% 80%, #448aff05 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ── Layout ──────────────────────────────────── */

.main-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

h1 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Badge ───────────────────────────────────── */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--accent-dim);
  border: 1px solid #00e67628;
  font-size: 10px;
  color: var(--accent);
  text-transform: uppercase;
}

.badge::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ── Connectors bar ──────────────────────────── */

.connectors-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.conn-label {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-right: 2px;
}

.conn-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 4px;
  background: #0d0d10;
  border: 1px solid var(--border);
  font-size: 10px;
}

.conn-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.conn-dot.on  { background: var(--accent); box-shadow: 0 0 4px var(--accent); }
.conn-dot.off { background: var(--text-muted); }

.conn-name { color: var(--text); }

.conn-toggle {
  cursor: pointer;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  transition: all 0.15s;
  margin-left: 2px;
}
.conn-toggle:hover { border-color: var(--text-muted); color: var(--text); background: transparent; transform: none; }
.conn-toggle.auto { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

/* ── Action panel ────────────────────────────── */

#incomingAction { flex-shrink: 0; }

.panel {
  border-radius: var(--radius);
  padding: 12px 16px;
  border: 1px solid transparent;
  animation: slideIn 0.2s ease;
}

.panel-green   { background: var(--accent-dim);       border-color: #00e67628; }
.panel-blue    { background: var(--accent-blue-dim);  border-color: #448aff28; }
.panel-amber   { background: var(--accent-amber-dim); border-color: #ffab4028; }
.panel-red     { background: var(--accent-red-dim);   border-color: #ff525228; }
.panel-neutral { background: var(--surface);          border-color: var(--border); }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.panel-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title .auto-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 400;
  color: var(--accent);
  border: 1px solid #00e67628;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--accent-dim);
}

.panel-row { font-size: 11px; color: var(--text-muted); padding: 2px 0; }
.panel-row b { color: var(--text); font-weight: 500; }
.panel-row a { color: var(--accent-blue); text-decoration: none; }
.panel-row a:hover { text-decoration: underline; }

/* ── Textarea ─────────────────────────────────── */

.memory-textarea {
  width: 100%;
  min-height: 60px;
  max-height: 100px;
  background: #0d0d10;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 8px;
  resize: vertical;
  margin: 8px 0 0;
  outline: none;
  line-height: 1.5;
}
.memory-textarea:focus { border-color: #00e67640; }

/* ── Countdown ────────────────────────────────── */

.countdown-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.countdown-bar-bg {
  flex: 1;
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  min-width: 60px;
}

.countdown-bar {
  height: 3px;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.countdown-label {
  font-size: 10px;
  color: var(--text-muted);
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Buttons ──────────────────────────────────── */

button {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 5px 11px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

button:hover {
  border-color: var(--text-muted);
  color: var(--text);
  background: var(--surface-raised);
  transform: none;
}

.btn-primary {
  background: var(--accent);
  color: #0a0a0c;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
}
.btn-primary:hover { background: #33eb91; transform: translateY(-1px); box-shadow: 0 4px 14px #00e67628; color: #0a0a0c; }
.btn-primary.blue  { background: var(--accent-blue); }
.btn-primary.blue:hover  { background: #6aa3ff; box-shadow: 0 4px 14px #448aff28; color: #0a0a0c; }
.btn-primary.amber { background: var(--accent-amber); }
.btn-primary.amber:hover { background: #ffc570; box-shadow: 0 4px 14px #ffab4028; color: #0a0a0c; }

.btn-cancel {
  background: var(--accent-red-dim);
  color: var(--accent-red);
  border-color: #ff525240;
}
.btn-cancel:hover { background: var(--accent-red-dim); color: var(--accent-red); border-color: var(--accent-red); }

/* ── Dashboard grid ───────────────────────────── */

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  overflow-y: auto;
}

pre {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.log-line {
  padding: 3px 0;
  border-bottom: 1px solid #1a1a1f;
  font-size: 10px;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.log-line:last-child { border-bottom: none; }
.log-line .ts { color: var(--text-muted); opacity: 0.6; flex-shrink: 0; }

.empty { color: var(--text-muted); font-size: 10px; font-style: italic; padding: 4px 0; }

/* ── Scrollbars ───────────────────────────────── */

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── Mobile ───────────────────────────────────── */

@media (max-width: 768px) {
  body { height: auto; overflow: auto; }
  .main-container { height: auto; }
  .dashboard-grid { grid-template-columns: 1fr; }
  .connectors-bar { flex-direction: column; align-items: flex-start; }
  .btn-primary { width: 100%; margin-top: 8px; }
  .countdown-wrap { flex-wrap: wrap; }
}
