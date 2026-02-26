/**
 * Frontend: sections + cards + add forms.
 */
const $ = (id) => document.getElementById(id);

const state = {
  sections: [],
  active: null,
  reveal: new Set(), // dish id
};

async function api(path, opts) {
  const res = await fetch(path, opts);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || String(data));
  return data;
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
    btn.className = "sectionBtn" + (state.active?.slug === s.slug ? " sectionBtn--active" : "");
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

    const body = document.createElement("div");
    body.className = "card__body";

    const nameRow = document.createElement("div");
    nameRow.className = "card__nameRow";

    const name = document.createElement("div");
    name.className = "card__name";

    const isRevealed = state.reveal.has(d.id);
    name.textContent = isRevealed ? d.name : starName(d.name);

    const toggle = document.createElement("button");
    toggle.className = "btn btn--ghost";
    toggle.type = "button";
    toggle.textContent = isRevealed ? "Скрыть" : "Показать";
    toggle.onclick = () => {
      if (state.reveal.has(d.id)) state.reveal.delete(d.id);
      else state.reveal.add(d.id);
      loadCards();
    };

    nameRow.appendChild(name);
    nameRow.appendChild(toggle);

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `#${d.id}`;

    const details = document.createElement("details");
    details.className = "details";

    const summary = document.createElement("summary");
    summary.textContent = "Описание";

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="card__meta" style="margin-top:8px;">Ингредиенты</div>
      ${renderUl(d.ingredients)}
      <div class="card__meta" style="margin-top:8px;">На выбор</div>
      ${renderUl(d.choices)}
    `;

    details.appendChild(summary);
    details.appendChild(wrap);

    body.appendChild(nameRow);
    body.appendChild(meta);
    body.appendChild(details);

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

async function loadSections() {
  state.sections = await api("/api/sections");
  renderSections();
}

async function setActiveSection(slug) {
  state.active = state.sections.find((s) => s.slug === slug) || null;
  $("activeSectionTitle").textContent = state.active ? `Карточки — ${state.active.title}` : "Карточки";
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

async function boot() {
  $("btnReload").onclick = async () => {
    await loadSections();
    await loadCards();
  };
  $("btnAddDish").onclick = openAddDish;

  $("formAddDish").addEventListener("submit", onAddDish);
  $("formAddSection").addEventListener("submit", onAddSection);

  await loadSections();
}

boot().catch((e) => {
  console.error(e);
  $("empty").classList.remove("hidden");
  $("empty").textContent = e.message || String(e);
});
