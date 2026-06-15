// ═══════════════════════════════════════════════
// ACTION REGISTRY
// ═══════════════════════════════════════════════

const ACTIONS = {

  create_appointment: {
    title: "📅 Agendar turno",
    color: "panel-blue",
    btnColor: "blue",
    btnLabel: "Confirmar y agendar en Google Calendar",
    fields: [
      { key: "name",    label: "Cliente"  },
      { key: "service", label: "Servicio" },
      { key: "date",    label: "Fecha"    },
      { key: "time",    label: "Hora"     },
      { key: "notes",   label: "Notas"    },
    ],
    execute: p => `/api/portalk?action=calendar&${qs(p)}`
  },

  create_payment: {
    title: "💳 Confirmar pago",
    color: "panel-amber",
    btnColor: "amber",
    btnLabel: "Pagar con Mercado Pago",
    fields: [
      { key: "description", label: "Servicio" },
      { key: "amount",      label: "Importe", prefix: "$" },
      { key: "name",        label: "Cliente"  },
      { key: "payer_email", label: "Email"    },
    ],
    execute: p => `/api/portalk?action=payment&${qs(p)}`
  },

  create_issue: {
    title: "🐛 Crear issue en GitHub",
    color: "panel-neutral",
    btnColor: "",
    btnLabel: "Crear issue",
    fields: [
      { key: "repo",  label: "Repo"        },
      { key: "title", label: "Título"      },
      { key: "body",  label: "Descripción" },
      { key: "label", label: "Label"       },
    ],
    execute: p => `/api/portalk?action=github_issue&${qs(p)}`
  },


  memory_write: {
    title: "💾 Guardar en memoria",
    color: "panel-green",
    btnColor: "",
    btnLabel: "Guardar",
    fields: [
      { key: "entity", label: "Entidad" },
      { key: "key",    label: "Clave"   },
    ],
    hasTextarea: true,
    execute: null
  },

  blogger_post: {
    title: "📝 Publicar en Blogger",
    color: "panel-green",
    btnColor: "",
    btnLabel: "Publicar",
    fields: [
      { key: "title",   label: "Título"  },
      { key: "labels",  label: "Labels"  },
      { key: "page_id", label: "Post ID" },
    ],
    hasTextarea: true,
    execute: null
  },

};

// ═══════════════════════════════════════════════
// CONNECTORS REGISTRY
// ═══════════════════════════════════════════════

const CONNECTORS = [
  { id: "calendar",     label: "G-Cal",   implemented: true  },
  { id: "blogger_post", label: "Blogger", implemented: true  },
  { id: "github_write", label: "GitHub",  implemented: true  },
  { id: "payment",      label: "MPago",   implemented: true  },
  { id: "memory_write", label: "Redis",   implemented: true  },
  { id: "sheets_read",  label: "Sheets",  implemented: false },
];

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

const STORAGE_KEY = "portalk_state";

let state = (() => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (!parsed.connectorModes) parsed.connectorModes = {};
      return parsed;
    }
  } catch(e) {}
  return { entity: "demo", actions: [], memory: {}, logs: [], connectorModes: {} };
})();

function getMode(connectorId) {
  return state.connectorModes?.[connectorId] === "auto" ? "auto" : "manual";
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  render();
}

function log(msg) {
  state.logs.unshift({ ts: new Date().toISOString(), message: msg });
  state.logs = state.logs.slice(0, 100);
  saveState();
}

// ═══════════════════════════════════════════════
// INCOMING ACTION HANDLER
// ═══════════════════════════════════════════════

function receiveAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  const status = params.get("status");
  const mode   = params.get("mode");
  const el     = document.getElementById("incomingAction");

  // ── Evitar doble ejecución ──────────────────
  const urlKey = window.location.search;
  if (urlKey && sessionStorage.getItem("portalk_last_url") === urlKey) {
    history.replaceState({}, '', '/portal.html');
    return;
  }
  if (urlKey) sessionStorage.setItem("portalk_last_url", urlKey);

  // ── Setup OAuth ──────────────────────────────
  if (mode === "setup") {
    el.innerHTML = panel("panel-blue", "Conectar Google",
      `<p class="panel-row">Conectá tu cuenta para habilitar Calendar y Blogger.</p>
       <button class="btn-primary blue" onclick="window.location.href='/api/auth/google?mode=setup'">
         Conectar Google
       </button>`);
    return;
  }

  // ── GitHub write GRANDE: pantalla para pegar contenido ─────────
  if (status === "github_write_large_pending") {
    const code = params.get("code");
    log(`STATUS: github_write_large_pending`);
    history.replaceState({}, '', '/portal.html');
    el.innerHTML = panel("panel-neutral", "⏳ Cargando...", "");

    fetch(`/api/portalk?action=github_write_large_preview&code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          el.innerHTML = panel("panel-red", "❌ Error", `<p class="panel-row">${esc(data.error)}</p>`);
          return;
        }
        el.innerHTML = panel("panel-neutral", "📋 Pegar contenido para escribir",
          `<p class="panel-row"><b>Repo:</b> ${esc(data.repo)}</p>
           <p class="panel-row"><b>Path:</b> ${esc(data.path)}</p>
           <p class="panel-row"><b>Branch:</b> ${esc(data.branch)}</p>
           <p class="panel-row"><b>Mensaje:</b> ${esc(data.message)}</p>
           <p class="panel-row"><b>Código:</b> <code>${esc(code)}</code></p>
           <textarea class="memory-textarea" id="largeContent" placeholder="Pegá aquí el contenido a escribir..." style="min-height:300px;"></textarea>
           <div class="countdown-wrap">
             <button class="btn-cancel" id="lwCancelBtn">Cancelar</button>
             <button class="btn-primary" id="lwWriteBtn">Escribir</button>
           </div>`);

        document.getElementById("lwWriteBtn").onclick = () => {
          const content = document.getElementById("largeContent").value;
          if (!content) { alert("Pegá el contenido primero."); return; }
          document.getElementById("lwWriteBtn").disabled = true;
          document.getElementById("lwWriteBtn").textContent = "Escribiendo...";

          fetch(`/api/portalk?action=github_write_large_confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, content })
          })
            .then(r => r.json())
            .then(result => {
              if (result.ok) {
                log(`STATUS: github_write_large_ok`);
                el.innerHTML = panel("panel-green", "✅ Archivo escrito en GitHub",
                  `<p class="panel-row"><b>${esc(result.repo)}/${esc(result.path)}</b></p><p class="panel-row"><b>SHA:</b> ${esc(result.sha)}</p>` + link(result.url, "Ver en GitHub →"));
                saveState();
              } else {
                el.innerHTML = panel("panel-red", "❌ Error al escribir", `<p class="panel-row">${esc(result.error || "Error desconocido")}</p>`);
              }
            })
            .catch(() => {
              el.innerHTML = panel("panel-red", "❌ Error", `<p class="panel-row">No se pudo completar la escritura.</p>`);
            });
        };

        document.getElementById("lwCancelBtn").onclick = () => {
          window.location.href = `/api/portalk?action=github_write_large_cancel&code=${encodeURIComponent(code)}`;
        };
      })
      .catch(() => {
        el.innerHTML = panel("panel-red", "❌ Error", `<p class="panel-row">No se pudo cargar la propuesta.</p>`);
      });

    return;
  }

  // ── GitHub write pending: pedir preview y mostrar confirmación ──
  if (status === "github_write_pending") {
    const code = params.get("code");
    log(`STATUS: github_write_pending`);
    history.replaceState({}, '', '/portal.html');
    el.innerHTML = panel("panel-neutral", "⏳ Cargando propuesta de escritura...", "");

    fetch(`/api/portalk?action=github_write_preview&code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          el.innerHTML = panel("panel-red", "❌ Error", `<p class="panel-row">${esc(data.error)}</p>`);
          return;
        }
        el.innerHTML = panel("panel-neutral", "📝 Confirmar escritura en GitHub",
          `<p class="panel-row"><b>Repo:</b> ${esc(data.repo)}</p>
           <p class="panel-row"><b>Path:</b> ${esc(data.path)}</p>
           <p class="panel-row"><b>Branch:</b> ${esc(data.branch)}</p>
           <p class="panel-row"><b>Mensaje:</b> ${esc(data.message)}</p>
           ${data.sha ? `<p class="panel-row"><b>SHA actual:</b> ${esc(data.sha)}</p>` : ""}
           <pre class="memory-textarea" style="max-height:300px;overflow:auto;">${esc(data.content)}</pre>
           <div class="countdown-wrap">
             <button class="btn-cancel" id="ghCancelBtn">Cancelar</button>
             <button class="btn-primary" id="ghConfirmBtn">Confirmar escritura</button>
           </div>`);

        document.getElementById("ghConfirmBtn").onclick = () => {
          window.location.href = `/api/portalk?action=github_write_confirm&code=${encodeURIComponent(code)}`;
        };
        document.getElementById("ghCancelBtn").onclick = () => {
          window.location.href = `/api/portalk?action=github_write_cancel&code=${encodeURIComponent(code)}`;
        };
      })
      .catch(() => {
        el.innerHTML = panel("panel-red", "❌ Error", `<p class="panel-row">No se pudo cargar la propuesta.</p>`);
      });

    return;
  }

  // ── Status returns ───────────────────────────
  const STATUS_MAP = {
    ok:              { color: "panel-green", icon: "✅", title: "Turno agendado",
      body: p => link(p.get("event"), "Ver en Google Calendar →") },
    github_ok:       { color: "panel-green", icon: "✅", title: "Issue creado",
      body: p => `<p class="panel-row"><b>${esc(p.get("title"))}</b></p>` + link(p.get("issue_url"), `Ver issue #${p.get("issue_number")} →`) },
    memory_ok:       { color: "panel-green", icon: "💾", title: "Guardado en memoria",
      body: p => `<p class="panel-row"><b>Entidad:</b> ${esc(p.get("entity"))}</p><p class="panel-row"><b>Clave:</b> ${esc(p.get("key"))}</p>` },
    payment_ok:      { color: "panel-green", icon: "✅", title: "Pago confirmado",
      body: p => rows({ Cliente: p.get("name"), Servicio: p.get("description"), Importe: "$" + p.get("amount") }) },
    payment_fail:    { color: "panel-red",   icon: "❌", title: "Pago no completado",
      body: () => `<p class="panel-row">Podés reintentar desde el enlace original.</p>` },
    payment_pending: { color: "panel-amber", icon: "⏳", title: "Pago pendiente",
      body: () => `<p class="panel-row">El pago está siendo procesado.</p>` },
    blogger_ok:      { color: "panel-green", icon: "✅", title: "Publicado en Blogger",
      body: p => `<p class="panel-row"><b>${esc(p.get("title") || "Post")}</b></p>` + link(p.get("post_url"), "Ver post →") },
    sheets_ok:       { color: "panel-green", icon: "✅", title: "Guardado en Sheets",
      body: p => `<p class="panel-row"><b>Key:</b> ${esc(p.get("key"))}</p>` },
    github_write_ok: { color: "panel-green", icon: "✅", title: "Archivo escrito en GitHub",
      body: p => `<p class="panel-row"><b>${esc(p.get("repo"))}/${esc(p.get("path"))}</b></p><p class="panel-row"><b>SHA:</b> ${esc(p.get("sha"))}</p>` + link(p.get("url"), "Ver en GitHub →") },
    github_write_fail: { color: "panel-red", icon: "❌", title: "Error al escribir archivo",
      body: p => `<p class="panel-row">No se pudo escribir <b>${esc(p.get("path"))}</b>.</p>` },
    github_write_cancelled: { color: "panel-neutral", icon: "🚫", title: "Escritura cancelada",
      body: () => `<p class="panel-row">La propuesta de escritura fue cancelada.</p>` },
  };

  if (status && STATUS_MAP[status]) {
    const s = STATUS_MAP[status];
    log(`STATUS: ${status}`);
    history.replaceState({}, '', '/portal.html');
    el.innerHTML = panel(s.color, `${s.icon} ${s.title}`, s.body(params));
    saveState();
    return;
  }

  if (!action) return;

  // ── Pending action ───────────────────────────
  const payload = {};
  for (const [k, v] of params.entries()) {
    if (k !== "action") payload[k] = v;
  }

  log(`ACTION_RECEIVED: ${action}`);
  history.replaceState({}, '', '/portal.html');

  const def = ACTIONS[action];
  const isAuto = getMode(action) === "auto";
  const secs   = isAuto ? 3 : 10;

  if (!def) {
    el.innerHTML = panel("panel-neutral", `⚙️ ${esc(action)}`,
      `<pre>${JSON.stringify(payload, null, 2)}</pre>`);
    renderCountdown(el, action, payload, null, isAuto, secs);
    return;
  }

  const fieldRows = (def.fields || [])
    .filter(f => payload[f.key])
    .map(f => `<p class="panel-row"><b>${f.label}:</b> ${f.prefix || ""}${esc(payload[f.key])}</p>`)
    .join("");

  const extraHtml = def.hasTextarea
    ? `<textarea class="memory-textarea" id="memoryContent"
         placeholder="Contenido...">${esc(payload.content || payload.value || "")}</textarea>`
    : "";

  const modeBadge = `<span class="mode-badge ${isAuto ? 'auto' : ''}">${isAuto ? `AUTO ${secs}s` : `MAN ${secs}s`}</span>`;

  el.innerHTML = panel(def.color,
    `<span>${def.title}</span>${modeBadge}`,
    `${fieldRows}${extraHtml}`
  );

  renderCountdown(el, action, payload, def, isAuto, secs);
}

// ═══════════════════════════════════════════════
// COUNTDOWN
// ═══════════════════════════════════════════════

function renderCountdown(el, action, payload, def, isAuto, secs) {
  const wrap = document.createElement("div");
  wrap.className = "countdown-wrap";
  wrap.innerHTML = `
    <div class="countdown-bar-bg"><div class="countdown-bar" id="cbar" style="width:100%"></div></div>
    <span class="countdown-label" id="clabel">${secs}s</span>
    <button class="btn-cancel" id="cancelBtn">Cancelar</button>
    <button class="btn-primary ${def?.btnColor || ""}" id="executeBtn">${def?.btnLabel || "Ejecutar"}</button>
  `;

  el.querySelector(".panel").appendChild(wrap);

  let remaining = secs;
  let cancelled = false;

  const interval = setInterval(() => {
    remaining -= 0.1;
    const pct = Math.max(0, (remaining / secs) * 100);
    const barEl = document.getElementById("cbar");
    const lblEl = document.getElementById("clabel");
    if (barEl) barEl.style.width = pct + "%";
    if (lblEl) lblEl.textContent = Math.ceil(remaining) + "s";

    if (remaining <= 0 && !cancelled) {
      clearInterval(interval);
      if (isAuto) {
        doExecute();
      } else {
        if (barEl) barEl.style.background = "var(--text-muted)";
        if (lblEl) lblEl.textContent = "—";
      }
    }
  }, 100);

  document.getElementById("cancelBtn").onclick = () => {
    cancelled = true;
    clearInterval(interval);
    document.getElementById("cbar").style.width = "0%";
    document.getElementById("clabel").textContent = "✕";
    document.getElementById("cancelBtn").style.display = "none";
    document.getElementById("executeBtn").style.display = "none";
    el.querySelector(".panel").insertAdjacentHTML("beforeend",
      `<p class="panel-row" style="margin-top:6px; color:var(--accent-red)">Cancelado.</p>`);
    log(`ACTION_CANCELLED: ${action}`);
    saveState();
  };

  document.getElementById("executeBtn").onclick = () => {
    cancelled = true;
    clearInterval(interval);
    doExecute();
  };

  function doExecute() {
    log(`ACTION_EXECUTED: ${action}`);
    saveState();

    if (!def) {
      executeGeneric(action, payload);
      return;
    }

    if (def.hasTextarea) {
      const ta = document.getElementById("memoryContent");
      const textVal = ta ? ta.value : "";
      const key = action === "memory_write" ? "value" : "content";
      const p = new URLSearchParams({ ...payload, [key]: textVal });
      window.location.href = `/api/portalk?action=${action}&${p.toString()}`;
    } else {
      window.location.href = def.execute(payload);
    }
  }
}

// ═══════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════

function render() {
  const entityEl = document.getElementById("entityBadge");
  if (entityEl) entityEl.textContent = state.entity;

  const countEl = document.getElementById("actionCount");
  if (countEl) countEl.textContent = state.actions.length;

  const stateEl = document.getElementById("stateView");
  if (stateEl) stateEl.textContent = JSON.stringify({
    entity:   state.entity,
    acciones: state.actions.length,
    logs:     state.logs.length,
  }, null, 2);

  const memEl = document.getElementById("memoryView");
  if (memEl) memEl.textContent =
    Object.keys(state.memory).length
      ? JSON.stringify(state.memory, null, 2)
      : "// vacío";

  const logsEl = document.getElementById("logsView");
  if (logsEl) logsEl.innerHTML =
    state.logs.length === 0
      ? '<div class="empty">Sin actividad</div>'
      : state.logs.map(l => `
          <div class="log-line">
            <span>${esc(l.message)}</span>
            <span class="ts">${l.ts.slice(11,16)}</span>
          </div>`).join("");

  renderConnectors();
}

// ═══════════════════════════════════════════════
// CONNECTORS
// ═══════════════════════════════════════════════

function renderConnectors() {
  const body = document.getElementById("connectorsBody");
  if (!body) return;

  body.innerHTML = CONNECTORS.map(c => {
    const isAuto = getMode(c.id) === "auto";
    const dotClass = c.implemented ? "on" : "off";
    const disabledAttr = c.implemented ? "" : "disabled style='opacity:0.3;cursor:default'";

    return `<div class="conn-item">
      <div class="conn-dot ${dotClass}"></div>
      <span class="conn-name">${c.label}</span>
      <span class="conn-toggle ${isAuto ? 'auto' : ''}"
            onclick="toggleConn('${c.id}')" ${disabledAttr}>
        ${isAuto ? "AUTO" : "MAN"}
      </span>
    </div>`;
  }).join("");
}

function toggleConn(id) {
  const connector = CONNECTORS.find(c => c.id === id);
  if (!connector?.implemented) return;
  if (!state.connectorModes) state.connectorModes = {};
  state.connectorModes[id] = state.connectorModes[id] === "auto" ? "manual" : "auto";
  saveState();
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function panel(color, title, body) {
  return `<div class="panel ${color}">
    <div class="panel-title">${title}</div>
    ${body}
  </div>`;
}

function rows(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v]) => `<p class="panel-row"><b>${k}:</b> ${esc(v)}</p>`)
    .join("");
}

function link(url, label) {
  if (!url) return "";
  return `<p class="panel-row"><a href="${esc(url)}" target="_blank">${label}</a></p>`;
}

function qs(obj) {
  return new URLSearchParams(obj).toString();
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function executeGeneric(action, payload) {
  const record = {
    id: crypto.randomUUID(),
    action, payload,
    status: "completed",
    timestamp: new Date().toISOString()
  };
  state.actions.unshift(record);
  Object.assign(state.memory, payload);
  log(`ACTION_EXECUTED: ${action}`);
  saveState();
  document.getElementById("incomingAction").innerHTML =
    panel("panel-green", "✅ Ejecutado", `<pre>${JSON.stringify(record, null, 2)}</pre>`);
}

function exportMemory() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "portalk_memory.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearMemory() {
  if (!confirm("¿Eliminar toda la memoria local?")) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  location.reload();
}

// ── Init ──────────────────────────────────────
render();
receiveAction();
