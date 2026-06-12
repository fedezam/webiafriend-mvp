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
