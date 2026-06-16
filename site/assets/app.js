/* ============================================================
   CHARACTER SHEETS — APP.JS
   Self-contained. No external dependencies. No network calls
   except ./data/*.json (same origin, relative paths).
   ============================================================ */

'use strict';

/* --- ANCESTORS ------------------------------------------- */

const ANCESTOR_IDS = new Set(['eliza', 'vannevar', 'clippy', 'samantha']);

/* --- ABILITY MECHANICS ------------------------------------ */

function mod(score) {
  return Math.floor((score - 10) / 2);
}

function fmtMod(m) {
  if (m >= 0) return '+' + m;
  return '−' + Math.abs(m); // − U+2212 proper minus sign
}

function modClass(m) {
  if (m > 0) return 'pos';
  if (m < 0) return 'neg';
  return 'zero';
}

/* --- ABILITY NAME MAP ------------------------------------ */

const ABILITY_LABELS = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/* --- ROLE BADGE CLASS ------------------------------------ */

function roleBadgeClass(role) {
  if (role === 'party') return 'badge badge-role-party';
  if (role === 'npc') return 'badge badge-role-npc';
  if (role === 'monster') return 'badge badge-role-monster';
  return 'badge';
}

function viralityBadgeClass(virality) {
  if (!virality) return 'badge';
  if (virality === 'viral') return 'badge badge-viral';
  return 'badge'; // idiomatic / niche → muted default
}

// Shortened, clickable "where the inspo came from" pill
function srcLabel(c) {
  const u = c.source_url || '';
  const gh = u.match(/github\.com\/[^/]+\/([^/?#]+)/);
  if (gh) return gh[1];
  let s = (c.represents || '').split(/\s*[(/]/)[0].trim();
  if (!s) { try { s = new URL(u).hostname.replace(/^www\./, ''); } catch { s = c.source_kind || 'source'; } }
  return s.length > 22 ? s.slice(0, 20).trim() + '…' : s;
}
function sourcePill(c) {
  if (!c.source_url) return '';
  return `<a class="source-pill" href="${escAttr(c.source_url)}" target="_blank" rel="noopener noreferrer" title="${escAttr(c.represents || c.source_url)}" onclick="event.stopPropagation()">↗&nbsp;${escHtml(srcLabel(c))}</a>`;
}

/* --- ABILITY GRID (card size) ---------------------------- */

function renderAbilityGridCard(abilities) {
  if (!abilities) return '';
  return `<div class="ability-grid-card">
    ${ABILITY_ORDER.map(key => {
      const score = abilities[key] ?? 10;
      const m = mod(score);
      return `<div class="ability-cell">
        <span class="ability-label">${ABILITY_LABELS[key]}</span>
        <span class="ability-score">${score}</span>
        <span class="ability-mod ${modClass(m)}">${fmtMod(m)}</span>
      </div>`;
    }).join('')}
  </div>`;
}

/* --- ABILITY GRID (modal size) --------------------------- */

function renderAbilityGridModal(abilities) {
  if (!abilities) return '';
  return `<div class="ability-grid-modal">
    ${ABILITY_ORDER.map(key => {
      const score = abilities[key] ?? 10;
      const m = mod(score);
      return `<div class="ability-cell">
        <span class="ability-label">${ABILITY_LABELS[key]}</span>
        <span class="ability-score">${score}</span>
        <span class="ability-mod ${modClass(m)}">${fmtMod(m)}</span>
      </div>`;
    }).join('')}
  </div>`;
}

/* --- ABILITY INLINE (mini-card) -------------------------- */

function renderAbilityInline(abilities) {
  if (!abilities) return '';
  return ABILITY_ORDER.map(key => {
    const score = abilities[key] ?? 10;
    const m = mod(score);
    return `${ABILITY_LABELS[key]} ${score} (${fmtMod(m)})`;
  }).join(' · ');
}

/* --- CARD RENDERER --------------------------------------- */

// Prompt for a character portrait, optionally steered by an art-director note.
function charImagePrompt(char, note) {
  return window.CardRender.stylePrompt.painterly + 'Heroic D&D character portrait of ' + char.name +
    (char.title ? ', ' + char.title : '') + (char.role === 'monster' ? ' — a fearsome monster' : '') +
    '. Single dignified figure, dramatic lighting, no text, no words.' + (note ? ' Art-director note: ' + note : '');
}

function renderCard(char) {
  const el = document.createElement('div');
  el.className = 'char-card';
  el.dataset.role = char.role || 'npc';
  el.dataset.id = char.id;
  if (ANCESTOR_IDS.has(char.id)) el.dataset.ancestor = 'true';

  // Eyebrow: class/subclass or CR label
  let eyebrow = '';
  if (char.role === 'monster') {
    eyebrow = `CR ${char.cr || '?'} · ${char.lineage || 'Unknown Lineage'}`;
  } else {
    const parts = [char.class, char.subclass, char.lineage].filter(Boolean);
    eyebrow = parts.join(' · ');
    if (ANCESTOR_IDS.has(char.id)) eyebrow = 'Ancestor · ' + eyebrow;
  }

  // Stat bar items
  const statItems = [];
  if (char.ac != null) statItems.push({ label: 'AC', value: char.ac });
  if (char.hp != null) statItems.push({ label: 'HP', value: char.hp });
  if (char.temperature != null) statItems.push({ label: 'Temp', value: char.temperature });

  const statBarHtml = statItems.length > 0
    ? `<div class="stat-bar">
        ${statItems.map(s => `<div class="stat-item">
          <span class="stat-label">${s.label}</span>
          <span class="stat-value">${s.value}</span>
        </div>`).join('')}
      </div>`
    : '';

  // Badges
  const badges = [];
  badges.push(`<span class="${roleBadgeClass(char.role)}">${char.role || 'unknown'}</span>`);
  if (char.virality) {
    badges.push(`<span class="${viralityBadgeClass(char.virality)}">${char.virality}</span>`);
  }
  if (ANCESTOR_IDS.has(char.id)) {
    badges.push(`<span class="badge badge-ancestor">ancestor</span>`);
  }

  // Sheet image — shown as primary visual when available; on error, hide and reveal stat fallback
  const sheetImgId = `sheet-img-${char.id}`;
  const statFallbackId = `stat-fallback-${char.id}`;

  el.innerHTML = `
    <div>
      <div class="card-eyebrow">${escHtml(eyebrow)}</div>
      <div class="card-name">${escHtml(char.name)}</div>
      <div class="card-title">${escHtml(char.title || '')}</div>
      ${char.source_url ? `<div class="card-inspired">Inspired by ${sourcePill(char)}</div>` : ''}
    </div>
    <img
      id="${sheetImgId}"
      class="card-sheet-img"
      src="./cards/sheets/${escAttr(char.id)}.png"
      loading="lazy"
      alt="${escAttr(char.name)} character sheet"
    >
    <div id="${statFallbackId}" class="card-stat-fallback" style="display:none;">
      ${char.abilities ? renderAbilityGridCard(char.abilities) : ''}
      ${statBarHtml}
    </div>
    <div class="card-badges">${badges.join('')}</div>
  `;

  // Default visual = the committed PNG; on error, the stylized Canvas card.
  el._char = char;
  const _fb = el.querySelector('.card-stat-fallback');
  function attachDefaultErr(im) {
    im.addEventListener('error', () => {
      if (!im.isConnected || !window.CardRender) { if (_fb) { im.style.display = 'none'; _fb.style.display = ''; } return; }
      const cv = window.CardRender.characterCanvas(char, null);
      cv.className = 'card-sheet-img';
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', (char.name || '') + ' character card');
      im.replaceWith(cv);
      if (_fb) _fb.style.display = 'none';
    });
  }
  attachDefaultErr(el.querySelector('.card-sheet-img'));

  if (window.CardRender) {
    let currentImg = null;
    function show(img) {
      currentImg = img || null;
      const cur = el.querySelector('.card-sheet-img');
      let next;
      if (img) {
        next = window.CardRender.characterCanvas(char, img);
        next.className = 'card-sheet-img';
        next.setAttribute('role', 'img');
        next.setAttribute('aria-label', (char.name || '') + ' character art');
      } else {
        next = document.createElement('img');
        next.className = 'card-sheet-img'; next.setAttribute('loading', 'lazy');
        next.alt = (char.name || '') + ' character sheet';
        next.src = './cards/sheets/' + char.id + '.png';
        attachDefaultErr(next);
      }
      if (cur) cur.replaceWith(next);
      if (_fb) _fb.style.display = 'none';
    }
    el.appendChild(window.CardRender.versionedMaker({
      itemId: 'char-' + char.id,
      show: show,
      buildPrompt: (note) => charImagePrompt(char, note),
      placeholder: 'Note to steer this image (optional)…',
      makeSaveCanvas: () => window.CardRender.characterCanvas(char, currentImg),
    }));
  }

  el.addEventListener('click', () => openModal(char.id));
  return el;
}

/* --- MODAL ----------------------------------------------- */

let _characters = [];
let _focusTrapEl = null;

function renderModal(char) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  // Role color on modal top border
  const roleColors = { party: 'var(--role-party)', npc: 'var(--role-npc)', monster: 'var(--role-monster)' };
  container.style.borderTopColor = roleColors[char.role] || 'var(--ink)';

  // Eyebrow
  let eyebrowParts = [];
  if (char.class) eyebrowParts.push(char.class);
  if (char.subclass) eyebrowParts.push(char.subclass);
  if (char.lineage) eyebrowParts.push(char.lineage);
  if (char.role === 'monster') {
    eyebrowParts = [`CR ${char.cr || '?'}`, char.lineage].filter(Boolean);
  }
  if (char.level) eyebrowParts.push(`Level ${char.level}`);
  const eyebrow = eyebrowParts.join(' · ');

  // Meta line
  const metaParts = [char.alignment, char.background].filter(Boolean);
  const metaHtml = metaParts.length
    ? `<div class="modal-meta">${escHtml(metaParts.join(' · '))}</div>`
    : '';

  // Stat grid (6 cells: AC · HP · Prof · Initiative · Temperature · Retrieval Index)
  const statDefs = [
    { label: 'AC', value: char.ac },
    { label: 'HP', value: char.hp },
    { label: 'Prof', value: char.prof != null ? '+' + char.prof : null },
    { label: 'Initiative', value: char.initiative != null ? fmtMod(char.initiative) : null },
    { label: 'Temperature', value: char.temperature },
    { label: 'Retrieval Index', value: char.retrieval_index },
  ];

  const statsHtml = `<div class="modal-stats">
    ${statDefs.map(s => s.value != null
      ? `<div class="modal-stat">
          <span class="modal-stat-label">${escHtml(s.label)}</span>
          <span class="modal-stat-value">${escHtml(String(s.value))}</span>
        </div>`
      : `<div class="modal-stat">
          <span class="modal-stat-label">${escHtml(s.label)}</span>
          <span class="modal-stat-value" style="color:var(--ruleSoft)">—</span>
        </div>`
    ).join('')}
  </div>`;

  // Saves
  let savesHtml = '';
  if (char.saves && char.saves.length > 0) {
    const saveItems = char.saves.map(s =>
      `<div class="save-item"><span class="save-check">✓</span> ${escHtml(ABILITY_NAMES[s] || s)}</div>`
    );
    if (char.dumped_save) {
      saveItems.push(`<div class="save-item" style="color:var(--accent)">
        ${escHtml(ABILITY_NAMES[char.dumped_save] || char.dumped_save)}
        <span class="save-auto-fail">AUTO-FAILS ${escHtml((char.dumped_save).toUpperCase())}-SAVE</span>
      </div>`);
    }
    savesHtml = `<div class="modal-section">
      <div class="modal-section-label">Saving Throws</div>
      <div class="saves-list">${saveItems.join('')}</div>
    </div>`;
  } else if (char.dumped_save) {
    // Monster with only a dumped save
    savesHtml = `<div class="modal-section">
      <div class="modal-section-label">Saving Throws</div>
      <div class="saves-list">
        <div class="save-item" style="color:var(--accent)">
          ${escHtml(ABILITY_NAMES[char.dumped_save] || char.dumped_save)}
          <span class="save-auto-fail">AUTO-FAILS ${escHtml((char.dumped_save).toUpperCase())}-SAVE</span>
        </div>
      </div>
    </div>`;
  }

  // Dumped save warning banner (monsters)
  const dumpedWarning = (char.role === 'monster' && char.dumped_save)
    ? `<div class="dumped-save-warning">⚠ AUTO-FAILS ${escHtml(char.dumped_save.toUpperCase())}-SAVE — ${escHtml(ABILITY_NAMES[char.dumped_save] || char.dumped_save)}</div>`
    : '';

  // Skills
  const skillsHtml = (char.skills && char.skills.length > 0)
    ? `<div class="modal-section">
        <div class="modal-section-label">Skills</div>
        <ul class="skills-list">
          ${char.skills.map(s => `<li>${escHtml(s)}</li>`).join('')}
        </ul>
      </div>`
    : '';

  // Weapon / Armor / Feature
  const featureParts = [];
  if (char.weapon) featureParts.push({ label: 'Weapon', text: char.weapon });
  if (char.armor) featureParts.push({ label: 'Armor', text: char.armor });
  if (char.feature) featureParts.push({ label: 'Feature', text: char.feature });
  const featuresHtml = featureParts.length
    ? `<div class="modal-section">
        <div class="modal-section-label">Equipment & Features</div>
        <div class="feature-block">
          ${featureParts.map(f => `<div class="feature-item">
            <span class="feature-item-label">${escHtml(f.label)}</span>
            ${escHtml(f.text)}
          </div>`).join('')}
        </div>
      </div>`
    : '';

  // Adventure Log
  const logHtml = (char.log && char.log.length > 0)
    ? `<div class="modal-section">
        <div class="modal-section-label">Adventure Log</div>
        <div class="log-entries">
          ${char.log.map(entry => `<div class="log-entry">
            <span class="log-v">${escHtml(entry.v || '')}</span>
            <div class="log-change">${escHtml(entry.change || '')}</div>
            ${entry.why ? `<div class="log-why">${escHtml(entry.why)}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>`
    : '';

  // Tagline
  const taglineHtml = char.tagline
    ? `<div class="modal-tagline">&ldquo;${escHtml(char.tagline)}&rdquo;</div>`
    : '';

  // Source
  const sourceHtml = char.source_url
    ? `<div class="modal-source"><span class="modal-source-label">Inspired by</span> ${sourcePill(char)} <span class="modal-source-rep">${escHtml(char.represents || '')}</span></div>`
    : '';

  // Ancestor note
  const ancestorNote = ANCESTOR_IDS.has(char.id)
    ? `<div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;">Ancestor persona — reverently statted</div>`
    : '';

  container.innerHTML = `
    <button class="modal-close" id="modal-close-btn" aria-label="Close character sheet">[ESC] CLOSE</button>
    <img
      class="modal-sheet-img"
      src="./cards/sheets/${escAttr(char.id)}.png"
      alt="${escAttr(char.name)} character sheet"
      onerror="this.style.display='none';"
    >
    <div class="modal-body">
      ${ancestorNote}
      <div class="modal-eyebrow">${escHtml(eyebrow)}</div>
      <div class="modal-name">${escHtml(char.name)}</div>
      <div class="modal-title">${escHtml(char.title || '')}</div>
      ${metaHtml}
      ${dumpedWarning}
      ${statsHtml}
      ${char.abilities ? renderAbilityGridModal(char.abilities) : ''}
      ${savesHtml}
      ${skillsHtml}
      ${featuresHtml}
      ${logHtml}
      ${taglineHtml}
      ${sourceHtml}
    </div>
  `;

  // Wire close button
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  // Comment widget (after modal DOM is ready)
  if (window.CS && window.CS.mountCharComments) {
    window.CS.mountCharComments(char);
  }
}

function openModal(id) {
  const char = _characters.find(c => c.id === id);
  if (!char) return;

  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  renderModal(char);
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus close button
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.focus();

  _focusTrapEl = overlay;

  if (decodeURIComponent(location.hash.slice(1)) !== id) {
    history.replaceState(null, '', '#' + encodeURIComponent(id));
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  _focusTrapEl = null;

  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* Deep-link: open a card from the URL hash (#ponytail), and react to back/forward */
function syncFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && _characters.find(c => c.id === id)) openModal(id);
  else closeModal();
}
window.addEventListener('hashchange', syncFromHash);

/* Focus trap */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
    return;
  }

  if (!_focusTrapEl) return;
  if (e.key !== 'Tab') return;

  const focusable = _focusTrapEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/* Click outside modal inner container to close */
document.addEventListener('click', function(e) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (overlay && overlay.classList.contains('open')) {
    if (e.target === overlay) closeModal();
  }
});

/* --- HTML ESCAPING --------------------------------------- */

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escAttr(str) {
  return escHtml(str);
}

/* --- NAV ACTIVE STATE ------------------------------------ */

function setNavActive() {
  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Match by filename
    const linkFile = href.split('/').pop().split('?')[0];
    const currentFile = path.split('/').pop().split('?')[0] || 'index.html';
    if (linkFile === currentFile) {
      link.classList.add('active');
    } else if (currentFile === '' && linkFile === 'index.html') {
      link.classList.add('active');
    }
  });
}

/* --- HAMBURGER TOGGLE ------------------------------------ */

function initHamburger() {
  const toggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-list');
  if (!toggle || !navList) return;
  toggle.addEventListener('click', () => {
    navList.classList.toggle('open');
    const expanded = navList.classList.contains('open');
    toggle.setAttribute('aria-expanded', expanded);
  });
}

/* ============================================================
   CHARACTERS PAGE
   ============================================================ */

function initCharactersPage(characters, adventures) {
  _characters = characters;

  const grid = document.getElementById('char-grid');
  const countEl = document.getElementById('count-display');
  if (!grid) return;

  // Eyebrow total is data-driven so it can't drift as the deck grows.
  const eyebrowEl = document.querySelector('.page-eyebrow');
  if (eyebrowEl) eyebrowEl.textContent = `${characters.length} Sheets`;

  // Filter state
  const state = {
    role: 'all',
    adventure: 'all',
    virality: 'all',
    search: '',
  };

  // Render all cards
  function getFiltered() {
    return characters.filter(c => {
      if (state.role !== 'all' && c.role !== state.role) return false;
      if (state.adventure !== 'all') {
        if (!c.adventures || !c.adventures.includes(state.adventure)) return false;
      }
      if (state.virality !== 'all' && c.virality !== state.virality) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        const haystack = [c.name, c.title, c.represents, c.class, c.subclass, c.lineage]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const filtered = getFiltered();
    grid.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = 'No characters match these filters.';
      grid.appendChild(empty);
    } else {
      filtered.forEach(c => grid.appendChild(renderCard(c)));
    }

    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${characters.length}`;
    }
  }

  // Wire role pills
  document.querySelectorAll('[data-filter-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.role = btn.dataset.filterRole;
      document.querySelectorAll('[data-filter-role]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  // Wire adventure pills
  document.querySelectorAll('[data-filter-adventure]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adventure = btn.dataset.filterAdventure;
      document.querySelectorAll('[data-filter-adventure]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  // Wire virality pills
  document.querySelectorAll('[data-filter-virality]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.virality = btn.dataset.filterVirality;
      document.querySelectorAll('[data-filter-virality]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  // Wire search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value.trim();
      render();
    });
  }

  // Build adventure pills dynamically
  const adventurePillsContainer = document.getElementById('adventure-pills');
  if (adventurePillsContainer && adventures) {
    adventures.forEach(adv => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.dataset.filterAdventure = adv.id;
      // Short name: first 3 words
      const short = adv.name.replace(/^The\s+/i, '').split(' ').slice(0, 3).join(' ');
      btn.textContent = short;
      adventurePillsContainer.appendChild(btn);
      btn.addEventListener('click', () => {
        state.adventure = adv.id;
        document.querySelectorAll('[data-filter-adventure]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }

  render();
}

/* ============================================================
   ADVENTURES PAGE
   ============================================================ */

/** Fetch the style-C name for an adventure. Falls back to "Trend" on 404 or error. */
async function fetchAdvStyleCName(advId) {
  try {
    const res = await fetch(`./data/style-c/${encodeURIComponent(advId)}.json`,
      { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return 'Trend';
    const data = await res.json();
    return (data && typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : 'Trend';
  } catch {
    return 'Trend';
  }
}

function initAdventuresPage(characters, adventures) {
  _characters = characters;

  const container = document.getElementById('adventures-container');
  if (!container) return;

  // Eyebrow count is data-driven so it can't drift when adventures are added.
  const eyebrowEl = document.querySelector('.page-eyebrow');
  if (eyebrowEl) eyebrowEl.textContent = `${adventures.length} Adventures`;

  const charMap = {};
  characters.forEach(c => { charMap[c.id] = c; });

  adventures.forEach(adv => {
    const block = document.createElement('div');
    block.className = 'adventure-block';

    /* --- Cover image + style toggle ------------------------- */

    const coverWrap = document.createElement('div');
    coverWrap.className = 'adv-cover-wrap';

    // Style toggle bar (A / B / C)
    const styleToggleBar = document.createElement('div');
    styleToggleBar.className = 'adv-style-toggle';
    styleToggleBar.setAttribute('role', 'group');
    styleToggleBar.setAttribute('aria-label', 'Module cover style');

    const ADV_STYLE_LABELS = { A: 'Module', B: 'Graphic Novel', C: 'Trend' };
    let currentCoverStyle = 'A';
    const styleBtns = {};

    // Cover image
    const coverImg = document.createElement('img');
    coverImg.className = 'adv-cover-img';
    coverImg.src = `./cards/covers/${escAttr(adv.id)}-A.png`;
    coverImg.alt = `${escAttr(adv.name)} module cover`;
    coverImg.setAttribute('loading', 'lazy');

    // Hide cover area on image load error; show again when toggling to a
    // style that may exist. Track per-style error state.
    const styleErrors = { A: false, B: false, C: false };

    function setCoverStyle(key) {
      if (currentCoverStyle === key) return;
      currentCoverStyle = key;

      // Update button states
      ['A', 'B', 'C'].forEach(k => {
        styleBtns[k].classList.toggle('active', k === key);
        styleBtns[k].setAttribute('aria-pressed', k === key ? 'true' : 'false');
      });

      // Reset img visibility optimistically; error handler will hide again if needed
      coverImg.style.display = '';
      coverWrap.style.display = '';
      coverImg.src = `./cards/covers/${escAttr(adv.id)}-${key}.png`;
    }

    let coverRendered = false;
    coverImg.addEventListener('error', () => {
      if (coverRendered) return;
      if (window.CardRender) {
        coverRendered = true;
        const advNames = {
          party: (adv.party || []).map(id => charMap[id] && charMap[id].name).filter(Boolean),
          npcs: (adv.npcs || []).map(id => charMap[id] && charMap[id].name).filter(Boolean),
          bestiary: (adv.bestiary || []).map(id => charMap[id] && charMap[id].name).filter(Boolean),
        };
        let coverCanvas = window.CardRender.adventureCanvas(adv, advNames);
        coverCanvas.className = 'adv-cover-img';
        coverImg.replaceWith(coverCanvas);
        styleToggleBar.style.display = 'none';
        coverWrap.style.display = '';
        let currentCoverImg = null;
        function showCover(img) {
          currentCoverImg = img || null;
          const n = window.CardRender.adventureCanvas(adv, advNames, img || null);
          n.className = 'adv-cover-img';
          coverCanvas.replaceWith(n); coverCanvas = n;
        }
        coverWrap.appendChild(window.CardRender.versionedMaker({
          itemId: 'cover-' + (adv.id || 'adventure'),
          show: showCover,
          buildPrompt: (note) => window.CardRender.stylePrompt.painterly + (adv.name || '') + '. ' + (adv.quest || '') + ' Epic D&D module cover illustration, no text, no words.' + (note ? ' Art-director note: ' + note : ''),
          placeholder: 'Note to steer this cover (optional)…',
          makeSaveCanvas: () => window.CardRender.adventureCanvas(adv, advNames, currentCoverImg),
        }));
      } else {
        styleErrors[currentCoverStyle] = true;
        coverImg.style.display = 'none';
        coverWrap.style.display = 'none';
      }
    });

    ['A', 'B', 'C'].forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'adv-style-btn' + (key === 'A' ? ' active' : '');
      btn.dataset.style = key;
      btn.setAttribute('aria-pressed', key === 'A' ? 'true' : 'false');
      btn.textContent = ADV_STYLE_LABELS[key];
      btn.addEventListener('click', () => setCoverStyle(key));
      styleBtns[key] = btn;
      styleToggleBar.appendChild(btn);
    });

    // Async: update style-C button label
    fetchAdvStyleCName(adv.id).then(name => {
      if (name !== ADV_STYLE_LABELS.C) {
        styleBtns['C'].textContent = name;
      }
    });

    coverWrap.appendChild(styleToggleBar);
    coverWrap.appendChild(coverImg);
    block.appendChild(coverWrap);

    /* --- Header + quest text -------------------------------- */

    function renderSection(label, ids) {
      if (!ids || ids.length === 0) return null;
      const validChars = ids.map(id => charMap[id]).filter(Boolean);
      if (!validChars.length) return null;

      const sectionEl = document.createElement('div');
      sectionEl.className = 'adventure-section';
      sectionEl.innerHTML = `<div class="adventure-section-label">${escHtml(label)}</div>`;

      const miniCardsContainer = document.createElement('div');
      miniCardsContainer.className = 'mini-cards';

      validChars.forEach(c => {
        const div = document.createElement('div');
        div.className = 'mini-card';
        div.dataset.role = c.role || 'npc';
        div.innerHTML = `
          <div class="mini-card-name">${escHtml(c.name)}</div>
          <div class="mini-card-title">${escHtml(c.title || '')}</div>
          <div class="mini-card-abilities">${renderAbilityInline(c.abilities)}</div>
        `;
        div.addEventListener('click', () => openModal(c.id));
        miniCardsContainer.appendChild(div);
      });

      sectionEl.appendChild(miniCardsContainer);
      return sectionEl;
    }

    const headerDiv = document.createElement('div');
    headerDiv.innerHTML = `
      <div class="adventure-eyebrow">${escHtml(adv.use_category)}</div>
      <div class="adventure-name">${escHtml(adv.name)}</div>
      <div class="adventure-quest">${escHtml(adv.quest)}</div>
    `;
    block.appendChild(headerDiv);

    const partySec = renderSection('Party', adv.party);
    const npcSec = renderSection('NPCs', adv.npcs);
    const bestiarySec = renderSection('Bestiary', adv.bestiary);

    if (partySec) block.appendChild(partySec);
    if (npcSec) block.appendChild(npcSec);
    if (bestiarySec) block.appendChild(bestiarySec);

    container.appendChild(block);

    // Comment widget per adventure
    if (window.CS && window.CS.mountAdvComments) {
      window.CS.mountAdvComments(block, adv.id);
    }
  });
}

/* ============================================================
   BOOTSTRAP — detect current page and init
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  setNavActive();
  initHamburger();

  const path = window.location.pathname;
  const isCharacters = path.includes('characters');
  const isAdventures = path.includes('adventures');

  if (!isCharacters && !isAdventures) return;

  try {
    const [charsRes, advsRes] = await Promise.all([
      fetch('./data/characters.json'),
      fetch('./data/adventures.json'),
    ]);

    if (!charsRes.ok) throw new Error('Failed to load characters.json');
    if (!advsRes.ok) throw new Error('Failed to load adventures.json');

    const characters = await charsRes.json();
    const advsData = await advsRes.json();
    const adventures = advsData.adventures;

    if (isCharacters) {
      initCharactersPage(characters, adventures);
    } else if (isAdventures) {
      initAdventuresPage(characters, adventures);
    }

    syncFromHash();
  } catch (err) {
    console.error('Character Sheets boot error:', err);
    const errEl = document.createElement('div');
    errEl.style.cssText = 'padding:24px;font-family:monospace;color:#C84B31;';
    errEl.textContent = 'Error loading data: ' + err.message;
    document.body.appendChild(errEl);
  }
});
