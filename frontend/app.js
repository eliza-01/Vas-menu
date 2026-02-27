// frontend/app.js
/**
 * Frontend: sections + cards + add forms + settings + fullscreen image.
 */
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "rmt_settings_v1";

const state = {
  sections: [],
  active: null,
  reveal: new Set(), // dish id (used only when hideName enabled)
  settings: {
    hideName: true,
    hideDesc: true,
  },
  priorityItems: [],
  prioDrag: null, // pointer-sort state
};

const API_BASE = new URL("api/", document.baseURI); // => https://host/vas-menu/api/

function toApiUrl(p) {
  const s = String(p || "").trim();

  // allow full URLs if ever needed
  if (/^https?:\/\//i.test(s)) return s;

  // "/api/sections" | "api/sections" | "/sections" | "sections"
  let x = s.replace(/^\/+/, "");
  if (x.startsWith("api/")) x = x.slice(4);
  if (!x) x = "";

  return new URL(x, API_BASE).toString();
}

function errMsg(data) {
  if (data == null) return "Request failed";
  if (typeof data === "string") return data.trim() || "Request failed";
  if (typeof data === "object") {
    if (data.error) return String(data.error);
    try {
      return JSON.stringify(data);
    } catch (_) {
      return String(data);
    }
  }
  return String(data);
}

async function api(path, opts = {}) {
  const url = toApiUrl(path);
  const res = await fetch(url, opts);

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw new Error(errMsg(data));
  return data;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.settings.hideName = !!s.hideName;
    state.settings.hideDesc = !!s.hideDesc;
  } catch (_) {}
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function starName(name) {
  const n = Math.max(8, String(name || "").length);
  return "*".repeat(n);
}

function renderSections() {
  const box = $("sections");
  box.innerHTML = "";

  state.sections.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "sectionBtn" + (state.active?.slug === s.slug ? " sectionBtn--active" : "");
    btn.textContent = s.title;
    btn.onclick = () => setActiveSection(s.slug);
    box.appendChild(btn);
  });

  const sel = $("dishSection");
  sel.innerHTML = "";
  state.sections.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.slug;
    opt.textContent = s.title;
    sel.appendChild(opt);
  });

  if (!state.active && state.sections.length) setActiveSection(state.sections[0].slug);
}

function renderCards(cards) {
  const box = $("cards");
  box.innerHTML = "";

  if (!state.active || cards.length === 0) {
    $("empty").classList.remove("hidden");
    return;
  }
  $("empty").classList.add("hidden");

  cards.forEach((d) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.className = "card__img";
    img.src = d.imageUrl;
    img.alt = "";
    img.onclick = () => openFullscreen(d.imageUrl);

    const body = document.createElement("div");
    body.className = "card__body";

    const nameRow = document.createElement("div");
    nameRow.className = "card__nameRow";

    const name = document.createElement("div");
    name.className = "card__name";

    const showName = !state.settings.hideName || state.reveal.has(d.id);
    name.textContent = showName ? d.name : starName(d.name);

    nameRow.appendChild(name);

    if (state.settings.hideName) {
      const toggle = document.createElement("button");
      toggle.className = "btn btn--ghost";
      toggle.type = "button";
      toggle.textContent = state.reveal.has(d.id) ? "Скрыть" : "Показать";
      toggle.onclick = () => {
        if (state.reveal.has(d.id)) state.reveal.delete(d.id);
        else state.reveal.add(d.id);
        loadCards();
      };
      nameRow.appendChild(toggle);
    }

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `#${d.id}`;

    body.appendChild(nameRow);
    body.appendChild(meta);

    if (state.settings.hideDesc) {
      const details = document.createElement("details");
      details.className = "details";

      const summary = document.createElement("summary");
      summary.textContent = "Состав";

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <div class="card__meta" style="margin-top:8px;">Ингредиенты</div>
        ${renderUl(d.ingredients)}
        <div class="card__meta" style="margin-top:8px;">На выбор</div>
        ${renderUl(d.choices)}
      `;

      details.appendChild(summary);
      details.appendChild(wrap);
      body.appendChild(details);
    } else {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <div class="card__meta" style="margin-top:8px;">Ингредиенты</div>
        ${renderUl(d.ingredients)}
        <div class="card__meta" style="margin-top:8px;">На выбор</div>
        ${renderUl(d.choices)}
      `;
      body.appendChild(wrap);
    }

    const notes = String(d.notes || "").trim();
    if (notes) {
      const n = document.createElement("div");
      n.className = "card__notes";
      n.innerHTML = `
        <div class="card__notesTitle">Заметки</div>
        <div class="card__notesText">${escapeHtml(notes)}</div>
      `;
      body.appendChild(n);
    }

    card.appendChild(img);
    card.appendChild(body);
    box.appendChild(card);
  });
}

function renderUl(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return `<div class="card__meta">—</div>`;
  return `<ul class="card__list">${list.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/** allow closing modal by clicking backdrop */
function enableBackdropClose(dlg) {
  dlg.addEventListener("click", (ev) => {
    if (ev.target === dlg) dlg.close();
  });
}

/** detect “cancel/close” submit buttons inside forms */
function isCancelSubmitter(btn) {
  if (!btn) return false;

  const ds = btn.dataset || {};
  if (ds.close === "1" || ds.action === "close") return true;

  const v = String(btn.value || "").trim().toLowerCase();
  if (v === "cancel" || v === "close") return true;

  const n = String(btn.name || "").trim().toLowerCase();
  if (n === "cancel" || n === "close") return true;

  const t = String(btn.textContent || "").trim().toLowerCase();
  return t === "закрыть" || t === "отмена" || t === "cancel" || t === "close";
}

async function loadSections() {
  state.sections = await api("/api/sections");
  renderSections();
}

async function setActiveSection(slug) {
  state.active = state.sections.find((s) => s.slug === slug) || null;
  $("activeSectionTitle").textContent = state.active ? `${state.active.title}` : "Карточки";
  renderSections();
  await loadCards();
}

async function loadCards() {
  if (!state.active) return renderCards([]);
  const cards = await api(`/api/dishes?section=${encodeURIComponent(state.active.slug)}`);
  renderCards(cards);
}

function openAddDish() {
  if (!state.sections.length) return;
  const dlg = $("dlgAddDish");
  $("dishMsg").textContent = "";
  $("formAddDish").reset();
  $("dishSection").value = state.active?.slug || state.sections[0].slug;
  dlg.showModal();
}

async function onAddDish(ev) {
  ev.preventDefault();

  // IMPORTANT: if “close/cancel” button was clicked, just close (no validation / no API call)
  if (isCancelSubmitter(ev.submitter)) {
    $("dishMsg").textContent = "";
    $("dlgAddDish").close();
    return;
  }

  $("dishMsg").textContent = "Сохраняю...";

  const form = ev.target;
  const fd = new FormData(form);

  try {
    await api("/api/dishes", { method: "POST", body: fd });
    $("dishMsg").textContent = "Готово.";
    $("dlgAddDish").close();
    await loadCards();
  } catch (e) {
    $("dishMsg").textContent = e.message;
  }
}

async function onAddSection(ev) {
  ev.preventDefault();
  $("sectionMsg").textContent = "Создаю...";

  const fd = new FormData(ev.target);
  const body = Object.fromEntries(fd.entries());

  try {
    await api("/api/sections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    $("sectionMsg").textContent = "Готово.";
    ev.target.reset();
    await loadSections();
  } catch (e) {
    $("sectionMsg").textContent = e.message;
  }
}

function openSettings() {
  $("setHideName").checked = state.settings.hideName;
  $("setHideDesc").checked = state.settings.hideDesc;
  $("dlgSettings").showModal();
}

function applySettings() {
  state.settings.hideName = $("setHideName").checked;
  state.settings.hideDesc = $("setHideDesc").checked;

  if (!state.settings.hideName) state.reveal.clear();

  saveSettings();
  loadCards();
}

function openFullscreen(url) {
  $("fsImg").src = url;
  $("dlgImage").showModal();
}

function closeFullscreen() {
  $("dlgImage").close();
  $("fsImg").src = "";
}

async function boot() {
  loadSettings();

  $("btnReload").onclick = async () => {
    await loadSections();
    await loadCards();
  };
  $("btnAddDish").onclick = openAddDish;
  $("btnSettings").onclick = openSettings;

  // make add-dish dialog always closable
  enableBackdropClose($("dlgAddDish"));
  $("dlgAddDish").addEventListener("close", () => {
    $("dishMsg").textContent = "";
  });

  $("formAddDish").addEventListener("submit", onAddDish);
  $("formAddSection").addEventListener("submit", onAddSection);

  $("formSettings").addEventListener("submit", (ev) => {
    ev.preventDefault();
    applySettings();
    $("dlgSettings").close();
  });

  $("fsClose").onclick = closeFullscreen;
  $("dlgImage").addEventListener("click", (ev) => {
    if (ev.target === $("dlgImage")) closeFullscreen();
  });

  $("btnPriority").onclick = openPriority;
  $("btnPriorityClose").onclick = closePriority;
  $("btnPrioritySave").onclick = savePriority;

  await loadSections();
}

async function openPriority() {
  if (!state.active) return;
  $("priorityMsg").textContent = "Загружаю...";
  $("dlgPriority").showModal();

  try {
    const items = await api(`/api/priority?section=${encodeURIComponent(state.active.slug)}`);
    if (!Array.isArray(items)) throw new Error("API вернул не список (проверь маршрут /api/priority)");
    state.priorityItems = items.map((x) => ({ id: Number(x.id), name: String(x.name || "") }));
    renderPriority();
    $("priorityMsg").textContent = "";
  } catch (e) {
    $("priorityMsg").textContent = e.message;
  }
}

function closePriority() {
  $("dlgPriority").close();
}

/* ===== priority drag (pointer + ghost + placeholder + FLIP) ===== */

function prioFlip(ul, mutate) {
  const els = Array.from(ul.children).filter(
    (x) => x?.classList?.contains("prio__item") || x?.classList?.contains("prio__placeholder")
  );
  const first = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  const last = new Map(els.map((el) => [el, el.getBoundingClientRect()]));

  for (const el of els) {
    const f = first.get(el);
    const l = last.get(el);
    if (!f || !l) continue;

    const dx = f.left - l.left;
    const dy = f.top - l.top;
    if (!dx && !dy) continue;

    el.style.transition = "transform 0s";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      el.style.transition = "";
      el.style.transform = "";
    });
  }
}

function prioBeforeElByPointer(ul, yClient) {
  const items = Array.from(ul.querySelectorAll(".prio__item:not(.prio__item--dragging)"));
  for (const it of items) {
    const r = it.getBoundingClientRect();
    if (yClient < r.top + r.height / 2) return it;
  }
  return null;
}

function prioIndexFromPlaceholder(ul, ph) {
  let idx = 0;
  for (const ch of Array.from(ul.children)) {
    if (ch === ph) break;
    if (ch?.classList?.contains("prio__item") && !ch.classList.contains("prio__item--dragging")) idx++;
  }
  return idx;
}

function prioAutoScroll(ul, ulRect, yClient) {
  const pad = 28;
  const top = ulRect.top + pad;
  const bottom = ulRect.bottom - pad;
  if (yClient < top) ul.scrollTop -= Math.min(24, top - yClient);
  else if (yClient > bottom) ul.scrollTop += Math.min(24, yClient - bottom);
}

function renderPriority() {
  const ul = $("priorityList");
  ul.innerHTML = "";

  state.priorityItems.forEach((it) => {
    const li = document.createElement("li");
    li.className = "prio__item";
    li.dataset.id = String(it.id);

    li.innerHTML = `
      <div class="prio__row">
        <div class="prio__left">
          <button type="button" class="prio__handle" aria-label="Перетащить" title="Перетащить"></button>
          <div class="prio__name">${escapeHtml(it.name)}</div>
        </div>
        <div class="prio__id">#${it.id}</div>
      </div>
    `;

    li.querySelector(".prio__handle")?.addEventListener("pointerdown", onPrioPointerDown);

    ul.appendChild(li);
  });
}

function onPrioPointerDown(ev) {
  if (ev.button != null && ev.button !== 0) return;

  const handle = ev.currentTarget;
  if (!handle?.classList?.contains("prio__handle")) return;

  const li = handle.closest(".prio__item");
  const ul = li?.parentElement;
  if (!li || !ul || state.prioDrag) return;

  ev.preventDefault();
  ev.stopPropagation();

  const id = Number(li.dataset.id);
  const fromIndex = state.priorityItems.findIndex((x) => x.id === id);
  if (fromIndex < 0) return;

  const ulRect = ul.getBoundingClientRect();
  const r = li.getBoundingClientRect();
  const offsetY = ev.clientY - r.top;
  const offsetX = ev.clientX - r.left;

  const ph = document.createElement("li");
  ph.className = "prio__placeholder";
  ph.style.height = `${r.height}px`;

  ul.insertBefore(ph, li.nextSibling);

  const ghost = li.cloneNode(true);
  ghost.classList.add("prio__drag");
  ghost.style.width = `${r.width}px`;
  ghost.style.height = `${r.height}px`;
  ghost.style.left = `${r.left - ulRect.left + ul.scrollLeft}px`;
  ghost.style.top = `${r.top - ulRect.top + ul.scrollTop}px`;

  ul.appendChild(ghost);

  li.classList.add("prio__item--dragging");
  document.body.classList.add("noSel");

  state.prioDrag = {
    ul,
    li,
    ph,
    ghost,
    fromIndex,
    offsetY,
    offsetX,
    ulRect,
  };

  window.addEventListener("pointermove", onPrioPointerMove, { passive: false });
  window.addEventListener("pointerup", onPrioPointerUp, { once: true });
  window.addEventListener("pointercancel", onPrioPointerUp, { once: true });
}

function onPrioPointerMove(ev) {
  const d = state.prioDrag;
  if (!d) return;

  ev.preventDefault();

  d.ulRect = d.ul.getBoundingClientRect();
  prioAutoScroll(d.ul, d.ulRect, ev.clientY);

  const left = ev.clientX - d.ulRect.left + d.ul.scrollLeft - d.offsetX;
  const top = ev.clientY - d.ulRect.top + d.ul.scrollTop - d.offsetY;

  d.ghost.style.left = `${left}px`;
  d.ghost.style.top = `${top}px`;

  const before = prioBeforeElByPointer(d.ul, ev.clientY);

  const curNext = d.ph.nextElementSibling;
  if (before === d.ph) return;
  if (before === curNext) return;
  if (!before && d.ph === d.ul.lastElementChild) return;

  prioFlip(d.ul, () => {
    if (before) d.ul.insertBefore(d.ph, before);
    else d.ul.appendChild(d.ph);
  });
}

function onPrioPointerUp() {
  const d = state.prioDrag;
  if (!d) return;

  window.removeEventListener("pointermove", onPrioPointerMove);

  const toIndex = prioIndexFromPlaceholder(d.ul, d.ph);
  const fromIndex = d.fromIndex;

  d.ghost.remove();
  d.ph.remove();
  document.body.classList.remove("noSel");

  if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
    const arr = state.priorityItems;
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
  }

  state.prioDrag = null;
  renderPriority();
}

/* ===== /priority drag ===== */

async function savePriority() {
  if (!state.active) return;
  $("priorityMsg").textContent = "Сохраняю...";

  try {
    await api("/api/priority", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        section: state.active.slug,
        order: state.priorityItems.map((x) => x.id),
      }),
    });

    $("priorityMsg").textContent = "Готово.";
    $("dlgPriority").close();
    await loadCards(); // перечитать карточки (id поменялись)
  } catch (e) {
    $("priorityMsg").textContent = e.message;
  }
}

boot().catch((e) => {
  console.error(e);
  $("empty").classList.remove("hidden");
  $("empty").textContent = e.message || String(e);
});