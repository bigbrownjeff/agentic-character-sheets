/* ============================================================
   THE PRACTITIONERS' TABLE: PRACTITIONERS.JS
   Standalone. Reuses the site's CSS classes for an identical look,
   but its own render so it never touches the CI-gated public deck.
   Stats Jeff's real working agent-personas as character sheets, with
   beats drawn from real arcs of work. Loads ./data/practitioners.json.
   ============================================================ */

'use strict';

/* --- ABILITY MECHANICS (mirrors app.js) ------------------ */

function pMod(score) { return Math.floor((score - 10) / 2); }
function pFmtMod(m) { return m >= 0 ? '+' + m : '−' + Math.abs(m); } // − U+2212
function pModClass(m) { return m > 0 ? 'pos' : (m < 0 ? 'neg' : 'zero'); }

const P_ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const P_ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const P_ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function pEsc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function pAbilityGrid(abilities, cls) {
  if (!abilities) return '';
  return `<div class="${cls}">
    ${P_ABILITY_ORDER.map(key => {
      const score = abilities[key] ?? 10;
      const m = pMod(score);
      return `<div class="ability-cell">
        <span class="ability-label">${P_ABILITY_LABELS[key]}</span>
        <span class="ability-score">${score}</span>
        <span class="ability-mod ${pModClass(m)}">${pFmtMod(m)}</span>
      </div>`;
    }).join('')}
  </div>`;
}

/* --- CARD ------------------------------------------------- */

let _practitioners = [];

function renderPractitionerCard(p) {
  const el = document.createElement('div');
  el.className = 'char-card practitioner-card';
  el.dataset.id = p.id;
  el.dataset.role = p.role || 'party';

  const eyebrow = [p.class, p.subclass, p.lineage].filter(Boolean).join(' · ');

  const statItems = [];
  if (p.ac != null) statItems.push({ label: 'AC', value: p.ac });
  if (p.hp != null) statItems.push({ label: 'HP', value: p.hp });
  if (p.temperature != null) statItems.push({ label: 'Temp', value: p.temperature });
  const statBar = statItems.length
    ? `<div class="stat-bar">${statItems.map(s => `<div class="stat-item">
        <span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>`).join('')}</div>`
    : '';

  const badges = [];
  badges.push(`<span class="badge badge-role-party">${pEsc(p.role || 'party')}</span>`);
  if (p.home_project) badges.push(`<span class="badge">${pEsc(p.home_project)}</span>`);
  if (p.beats && p.beats.length) badges.push(`<span class="badge badge-viral">${p.beats.length} beats</span>`);

  const imgId = `p-sheet-img-${p.id}`;
  const fbId = `p-stat-fallback-${p.id}`;

  el.innerHTML = `
    <div>
      <div class="card-eyebrow">${pEsc(eyebrow)}</div>
      <div class="card-name">${pEsc(p.name)}</div>
      <div class="card-title">${pEsc(p.title || '')}</div>
      ${p.invoke ? `<div class="card-inspired">Live persona <code class="invoke-pill">${pEsc(p.invoke)}</code></div>` : ''}
    </div>
    <img id="${imgId}" class="card-sheet-img"
      src="${window.MEDIA_BASE || '.'}/cards/practitioners/${pEsc(p.id)}.png"
      loading="lazy" alt="${pEsc(p.name)} character sheet">
    <div id="${fbId}" class="card-stat-fallback" style="display:none;">
      ${pAbilityGrid(p.abilities, 'ability-grid-card')}
      ${statBar}
    </div>
    <div class="card-badges">${badges.join('')}</div>
  `;

  const img = el.querySelector('.card-sheet-img');
  const fb = el.querySelector('.card-stat-fallback');
  img.addEventListener('error', () => { img.style.display = 'none'; if (fb) fb.style.display = ''; });

  el.addEventListener('click', () => openPractitionerModal(p.id));
  return el;
}

/* --- MODAL ------------------------------------------------ */

function renderPractitionerModal(p) {
  const container = document.getElementById('modal-container');
  if (!container) return;
  container.style.borderTopColor = 'var(--role-party, var(--ink))';

  const eyebrow = [p.class, p.subclass, p.lineage, p.level ? `Level ${p.level}` : null].filter(Boolean).join(' · ');
  const meta = [p.alignment, p.background].filter(Boolean).join(' · ');

  const statDefs = [
    { label: 'AC', value: p.ac },
    { label: 'HP', value: p.hp },
    { label: 'Prof', value: p.prof != null ? '+' + p.prof : null },
    { label: 'Initiative', value: p.initiative != null ? pFmtMod(p.initiative) : null },
    { label: 'Temperature', value: p.temperature },
    { label: 'Retrieval Index', value: p.retrieval_index },
  ];
  const statsHtml = `<div class="modal-stats">${statDefs.map(s => `<div class="modal-stat">
      <span class="modal-stat-label">${pEsc(s.label)}</span>
      <span class="modal-stat-value"${s.value == null ? ' style="color:var(--ruleSoft)"' : ''}>${s.value == null ? '·' : pEsc(String(s.value))}</span>
    </div>`).join('')}</div>`;

  const savesHtml = (p.saves && p.saves.length)
    ? `<div class="modal-section"><div class="modal-section-label">Saving Throws</div>
        <div class="saves-list">${p.saves.map(s => `<div class="save-item"><span class="save-check">✓</span> ${pEsc(P_ABILITY_NAMES[s] || s)}</div>`).join('')}</div></div>`
    : '';

  const skillsHtml = (p.skills && p.skills.length)
    ? `<div class="modal-section"><div class="modal-section-label">Skills</div>
        <ul class="skills-list">${p.skills.map(s => `<li>${pEsc(s)}</li>`).join('')}</ul></div>`
    : '';

  const featureParts = [];
  if (p.weapon) featureParts.push({ label: 'Weapon', text: p.weapon });
  if (p.feature) featureParts.push({ label: 'Feature', text: p.feature });
  const featuresHtml = featureParts.length
    ? `<div class="modal-section"><div class="modal-section-label">Equipment & Features</div>
        <div class="feature-block">${featureParts.map(f => `<div class="feature-item">
          <span class="feature-item-label">${pEsc(f.label)}</span>${pEsc(f.text)}</div>`).join('')}</div></div>`
    : '';

  const logHtml = (p.log && p.log.length)
    ? `<div class="modal-section"><div class="modal-section-label">Adventure Log</div>
        <div class="log-entries">${p.log.map(e => `<div class="log-entry">
          <span class="log-v">${pEsc(e.v || '')}</span>
          <div class="log-change">${pEsc(e.change || '')}</div>
          ${e.why ? `<div class="log-why">${pEsc(e.why)}</div>` : ''}</div>`).join('')}</div></div>`
    : '';

  // BEATS: the arcs of work. Text-first; each carries archetype/moral/event and a
  // collapsible dm_note ("why this happened"), mirroring the /api/dm beat contract.
  const beatsHtml = (p.beats && p.beats.length)
    ? `<div class="modal-section practitioner-beats">
        <div class="modal-section-label">Beats: arcs of work</div>
        ${p.beats.map((b, i) => `<div class="p-beat">
          <div class="p-beat-head"><span class="p-beat-n">${b.n != null ? b.n : (i + 1)}</span>
            <span class="p-beat-caption">${pEsc(b.caption || '')}</span></div>
          ${b.archetype || b.event ? `<div class="p-beat-tags">
            ${b.archetype ? `<span class="p-beat-tag">${pEsc(b.archetype)}</span>` : ''}
            ${b.event ? `<span class="p-beat-tag p-beat-event">${pEsc(b.event)}</span>` : ''}</div>` : ''}
          ${b.decision ? `<div class="p-beat-decision">${pEsc(b.decision)}</div>` : ''}
          ${b.scene ? `<div class="p-beat-scene">${pEsc(b.scene)}</div>` : ''}
          ${b.dm_note ? `<details class="p-beat-why"><summary>Why this happened</summary><div>${pEsc(b.dm_note)}</div></details>` : ''}
          ${b.moral ? `<div class="p-beat-moral">${pEsc(b.moral)}</div>` : ''}
        </div>`).join('')}
      </div>`
    : '';

  const taglineHtml = p.tagline ? `<div class="modal-tagline">&ldquo;${pEsc(p.tagline)}&rdquo;</div>` : '';
  const reprHtml = p.represents
    ? `<div class="modal-source"><span class="modal-source-label">Stats</span> <span class="modal-source-rep">${pEsc(p.represents)}</span></div>`
    : '';

  container.innerHTML = `
    <button class="modal-close" id="modal-close-btn" aria-label="Close practitioner sheet">[ESC] CLOSE</button>
    <img class="modal-sheet-img"
      src="${window.MEDIA_BASE || '.'}/cards/practitioners/${pEsc(p.id)}.png"
      alt="${pEsc(p.name)} character sheet" onerror="this.style.display='none';">
    <div class="modal-body">
      <div class="modal-eyebrow">${pEsc(eyebrow)}</div>
      <div class="modal-name">${pEsc(p.name)}</div>
      <div class="modal-title">${pEsc(p.title || '')}</div>
      ${meta ? `<div class="modal-meta">${pEsc(meta)}</div>` : ''}
      ${p.invoke ? `<div class="modal-invoke">Invoke this persona: <code class="invoke-pill">${pEsc(p.invoke)}</code></div>` : ''}
      ${statsHtml}
      ${pAbilityGrid(p.abilities, 'ability-grid-modal')}
      ${savesHtml}
      ${skillsHtml}
      ${featuresHtml}
      ${logHtml}
      ${taglineHtml}
      ${beatsHtml}
      ${reprHtml}
    </div>
  `;
  document.getElementById('modal-close-btn').addEventListener('click', closePractitionerModal);
}

let _pFocusReturn = null;

function openPractitionerModal(id) {
  const p = _practitioners.find(x => x.id === id);
  if (!p) return;
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  _pFocusReturn = document.activeElement;
  renderPractitionerModal(p);
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.focus();
  if (decodeURIComponent(location.hash.slice(1)) !== id) {
    history.replaceState(null, '', '#' + encodeURIComponent(id));
  }
}

function closePractitionerModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (_pFocusReturn && _pFocusReturn.focus) _pFocusReturn.focus();
}

function pSyncFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && _practitioners.find(x => x.id === id)) openPractitionerModal(id);
  else closePractitionerModal();
}
window.addEventListener('hashchange', pSyncFromHash);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePractitionerModal(); });
document.addEventListener('click', e => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay && overlay.classList.contains('open') && e.target === overlay) closePractitionerModal();
});

/* --- NAV (mirrors app.js) -------------------------------- */

function pSetNavActive() {
  const current = (location.pathname.split('/').pop().split('?')[0]) || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.split('/').pop().split('?')[0] === current) link.classList.add('active');
  });
}
function pInitHamburger() {
  const toggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  if (!toggle || !navList) return;
  toggle.addEventListener('click', () => {
    navList.classList.toggle('open');
    toggle.setAttribute('aria-expanded', navList.classList.contains('open'));
  });
}

/* --- BOOTSTRAP ------------------------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  pSetNavActive();
  pInitHamburger();
  try {
    const res = await fetch('./data/practitioners.json');
    if (!res.ok) throw new Error('Failed to load practitioners.json');
    const data = await res.json();
    _practitioners = data.practitioners || [];

    const eyebrow = document.getElementById('practitioner-eyebrow');
    if (eyebrow) eyebrow.textContent = `${_practitioners.length} Practitioners`;
    const dek = document.getElementById('practitioner-dek');
    if (dek && data.dek) dek.textContent = data.dek;

    const grid = document.getElementById('practitioner-grid');
    if (grid) {
      grid.innerHTML = '';
      _practitioners.forEach(p => grid.appendChild(renderPractitionerCard(p)));
    }
    pSyncFromHash();
  } catch (err) {
    console.error('Practitioners boot error:', err);
    const errEl = document.createElement('div');
    errEl.style.cssText = 'padding:24px;font-family:monospace;color:#C84B31;';
    errEl.textContent = 'Error loading data: ' + err.message;
    document.body.appendChild(errEl);
  }
});
