/* ============================================================
   PLAYTHROUGHS · render a multi-agent playthrough produced by the
   play harness (play/README.md). Loads ./data/playthroughs/index.json,
   then each playthrough JSON (the /api/dm beat contract + a raw play log).
   Standalone; reuses the .p-beat styles from practitioners.css.
   ============================================================ */

'use strict';

function ptEsc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

const ABBR = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

function renderBeats(beats) {
  return `<div class="practitioner-beats">${beats.map((b, i) => `
    <div class="p-beat">
      <div class="p-beat-head">
        <span class="p-beat-n">${b.n != null ? b.n : (i + 1)}</span>
        <span class="p-beat-caption">${ptEsc(b.caption || '')}</span>
      </div>
      ${(b.archetype || b.event) ? `<div class="p-beat-tags">
        ${b.archetype ? `<span class="p-beat-tag">${ptEsc(b.archetype)}</span>` : ''}
        ${b.event ? `<span class="p-beat-tag p-beat-event">${ptEsc(b.event)}</span>` : ''}
      </div>` : ''}
      ${b.decision ? `<div class="p-beat-decision">${ptEsc(b.decision)}</div>` : ''}
      ${b.scene ? `<div class="p-beat-scene">${ptEsc(b.scene)}</div>` : ''}
      ${b.dm_note ? `<details class="p-beat-why"><summary>Why this happened</summary><div>${ptEsc(b.dm_note)}</div></details>` : ''}
      ${b.moral ? `<div class="p-beat-moral">${ptEsc(b.moral)}</div>` : ''}
    </div>`).join('')}</div>`;
}

function renderParty(party) {
  return `<div class="pt-party">${party.map(p => `
    <div class="pt-party-chip" data-role="${ptEsc(p.role || 'party')}">
      <span class="pt-party-name">${ptEsc(p.name)}</span>
      <span class="pt-party-dumped">dumps ${ptEsc((ABBR[p.dumped] || p.dumped || '').toUpperCase())}</span>
      ${p.plays ? `<span class="pt-party-plays">${ptEsc(p.plays)}</span>` : ''}
    </div>`).join('')}</div>`;
}

function renderLog(log) {
  if (!log || !log.length) return '';
  return `<details class="pt-log">
    <summary>How this was generated · the raw sub-agent moves</summary>
    <div class="pt-log-body">${log.map(m => `
      <div class="pt-log-move">
        <div class="pt-log-meta"><span class="pt-log-round">Round ${ptEsc(String(m.round))}</span>
          <span class="pt-log-actor">${ptEsc(m.name)}</span></div>
        <div class="pt-log-text"><strong>Move.</strong> ${ptEsc(m.move)}</div>
        ${m.aside ? `<div class="pt-log-aside">${ptEsc(m.aside)}</div>` : ''}
      </div>`).join('')}</div>
  </details>`;
}

function renderPlaythrough(pt) {
  const el = document.createElement('article');
  el.className = 'pt-block';
  el.id = pt.slug || '';
  el.innerHTML = `
    <div class="pt-titlebar">
      <div class="pt-adventure">${ptEsc(pt.adventure || '')}</div>
      <h2 class="pt-title">${ptEsc(pt.title || '')}</h2>
      ${pt.scenario ? `<p class="pt-scenario">${ptEsc(pt.scenario)}</p>` : ''}
    </div>
    ${pt.party ? renderParty(pt.party) : ''}
    ${pt.moral ? `<div class="pt-moral">${ptEsc(pt.moral)}</div>` : ''}
    ${pt.beats ? renderBeats(pt.beats) : ''}
    ${renderLog(pt.play_log)}
    ${pt.generated_by ? `<p class="pt-credit">${ptEsc(pt.generated_by)}</p>` : ''}
  `;
  return el;
}

/* --- NAV (mirrors app.js) -------------------------------- */
function ptSetNavActive() {
  const current = (location.pathname.split('/').pop().split('?')[0]) || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.split('/').pop().split('?')[0] === current) link.classList.add('active');
  });
}
function ptInitHamburger() {
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
  ptSetNavActive();
  ptInitHamburger();
  const container = document.getElementById('pt-container');
  if (!container) return;
  try {
    const idxRes = await fetch('./data/playthroughs/index.json');
    if (!idxRes.ok) throw new Error('Failed to load playthroughs index');
    const index = await idxRes.json();
    const eyebrow = document.getElementById('pt-eyebrow');
    if (eyebrow) eyebrow.textContent = `${index.length} Playthrough${index.length === 1 ? '' : 's'}`;

    const loaded = await Promise.all(index.map(async entry => {
      try {
        const r = await fetch(`./data/playthroughs/${encodeURIComponent(entry.slug)}.json`);
        return r.ok ? await r.json() : null;
      } catch { return null; }
    }));
    loaded.filter(Boolean).forEach(pt => container.appendChild(renderPlaythrough(pt)));
  } catch (err) {
    console.error('Playthroughs boot error:', err);
    const e = document.createElement('div');
    e.style.cssText = 'padding:24px;font-family:monospace;color:#C84B31;';
    e.textContent = 'Error loading playthroughs: ' + err.message;
    container.appendChild(e);
  }
});
