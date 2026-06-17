/* ============================================================
   FORGE — guided, pro-social character/adventure intake
   Zero dependencies. Voice via Web Speech API where available.
   Two output modes:
     A) Portable prompt — copy / open in Claude (works with no backend).
     B) One-click — POST /api/forge (active only if the site has an
        ANTHROPIC_API_KEY secret configured; falls back to A gracefully).
   The narrative-therapy steering + hard guardrails travel WITH the
   generated prompt, so a fresh Claude behaves the same as the skill.
   ============================================================ */
'use strict';

/* --- tiny helpers ---------------------------------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/* --- gentle steering: never block, just nudge ------------ */
/* These are SOFT. The real enforcement lives in the generation
   prompt below (and server-side). Here we only offer a kinder
   reframe so the answer that gets sent is already warm.        */
const NUDGE_PATTERNS = [
  /\b(idiot|stupid|moron|loser|worthless|pathetic|hate(s|d)?)\b/i,
  /\b(kill|destroy|hurt|abuse|crush)\b.*\b(them|him|her|everyone|people)\b/i,
  /\b(manipulat|backstab|ruthless|sociopath|narciss)/i,
];
function maybeNudge(text) {
  if (NUDGE_PATTERNS.some((re) => re.test(text))) {
    return "Love the honesty. I'll keep what's true about them but aim it kindly — the best " +
      "cards make the person laugh and nod, not wince. What do they really *want* underneath that?";
  }
  return null;
}

/* --- the question script (mirrors intake-questions.md) ---- */
/* field = which schema slot it feeds; steer = how we read it. */
const CHARACTER_QS = [
  { id: 'name', q: "Who is this hero? Give me a name.", hint: "A real name is perfect — we'll find their fantasy title.", field: 'name' },
  { id: 'great', q: "In one line — what are they genuinely great at?", hint: "The thing people come to them for.", field: 'high-stat', area: true },
  { id: 'overdo', q: "And the thing they *overdo* — the lovable flaw?", hint: "We'll make it a friendly monster they're learning to tame, never a knock on them.", field: 'dumped-stat', area: true },
  { id: 'others', q: "How do they show up for the people around them, at their best?", hint: "This is the heart of their character.", field: 'alignment', area: true },
  { id: 'grew', q: "Tell me about a time they grew — changed their mind, or did the harder right thing.", hint: "Even a small moment. This becomes the proudest line on their card.", field: 'log', area: true },
  { id: 'quote', q: "Last one — their vibe in a single quote. What would they say?", hint: "Funny is good. Kind is better. Both is best.", field: 'tagline' },
];

/* --- state ----------------------------------------------- */
const state = {
  mode: null,        // 'one' | 'crew'
  people: [],        // [{answers:{}}]
  personIdx: 0,
  qIdx: 0,
};

const app = $('#forge-app');

/* ============================================================
   RENDERERS
   ============================================================ */

function render() {
  if (state.mode === null) return renderStart();
  const person = state.people[state.personIdx];
  if (state.qIdx < CHARACTER_QS.length) return renderQuestion(person);
  // finished this person
  if (state.mode === 'crew') return renderPersonDone(person);
  return renderOutput();
}

function renderStart() {
  app.innerHTML = `
    <div class="forge-card">
      <div class="forge-step-eyebrow">Step 1 of 2 · who's the hero?</div>
      <div class="forge-q">Who are we forging today?</div>
      <div class="forge-hint">Pick one. You can always make more.</div>
      <div class="forge-choices">
        <button class="forge-choice" data-mode="one">
          <b>Just one person</b><small>You, a friend, a parent, a coworker — one card.</small>
        </button>
        <button class="forge-choice" data-mode="crew">
          <b>My whole crew</b><small>A balanced party where everyone's strength covers someone's gap.</small>
        </button>
      </div>
    </div>`;
  app.querySelectorAll('.forge-choice').forEach((b) =>
    b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      state.people = [{ answers: {} }];
      state.personIdx = 0; state.qIdx = 0;
      render();
    }));
}

function progressBar() {
  const cells = CHARACTER_QS.map((_, i) => {
    const cls = i < state.qIdx ? 'done' : i === state.qIdx ? 'current' : '';
    return `<span class="${cls}"></span>`;
  }).join('');
  return `<div class="forge-progress" aria-hidden="true">${cells}</div>`;
}

function transcript(person) {
  const rows = CHARACTER_QS.slice(0, state.qIdx).map((qq) => {
    const a = person.answers[qq.id];
    if (a == null || a === '') return '';
    const steered = a.__steered;
    return `<div class="forge-bubble ${steered ? 'steered' : ''}">
        <div class="bq">${esc(qq.q)}</div>
        <div class="ba">${esc(a.text || a)}</div>
        ${steered ? `<div class="note">↳ kept, aimed kindly</div>` : ''}
      </div>`;
  }).join('');
  return rows ? `<div class="forge-transcript">${rows}</div>` : '';
}

function renderQuestion(person) {
  const qq = CHARACTER_QS[state.qIdx];
  const who = state.mode === 'crew' && person.answers.name
    ? ` <span style="color:var(--muted)">· ${esc(person.answers.name.text || person.answers.name)}</span>` : '';
  const inputEl = qq.area
    ? `<textarea class="forge-textarea" id="forge-field" placeholder="Type or tap the mic…"></textarea>`
    : `<input class="forge-input" id="forge-field" placeholder="Type or tap the mic…" />`;
  app.innerHTML = `
    <div class="forge-card forge-output">
      ${progressBar()}
      ${transcript(person)}
      <div class="forge-step-eyebrow">Question ${state.qIdx + 1} of ${CHARACTER_QS.length}${who}</div>
      <div class="forge-q">${esc(qq.q)}</div>
      <div class="forge-hint">${esc(qq.hint)}</div>
      <div class="forge-inputrow">
        ${inputEl}
        <button class="forge-mic" id="forge-mic" title="Speak your answer" aria-label="Dictate answer">🎤</button>
      </div>
      <div id="forge-nudge"></div>
      <div class="forge-actions">
        <button id="forge-next">Next →</button>
        ${state.qIdx > 0 ? `<button class="forge-skip" id="forge-back">back</button>` : ''}
        <button class="forge-skip" id="forge-skip">skip</button>
      </div>
    </div>`;

  const field = $('#forge-field');
  field.focus();
  setupMic(field);

  const submit = () => {
    const text = field.value.trim();
    person.answers[qq.id] = { text, __steered: false };
    // soft nudge only on the "flaw" / "how they treat others" questions
    if ((qq.id === 'overdo' || qq.id === 'others' || qq.id === 'great')) {
      const nudge = maybeNudge(text);
      if (nudge && !person.answers[qq.id].__nudged) {
        person.answers[qq.id].__nudged = true;
        person.answers[qq.id].__steered = true;
        $('#forge-nudge').innerHTML = `<div class="forge-gentle">${esc(nudge)}</div>`;
        // let them revise; pressing Next again accepts as-is (kept, aimed kindly)
        return;
      }
    }
    advance();
  };
  $('#forge-next').addEventListener('click', submit);
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (!qq.area || e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  });
  $('#forge-skip').addEventListener('click', () => { person.answers[qq.id] = { text: '', __steered: false }; advance(); });
  if ($('#forge-back')) $('#forge-back').addEventListener('click', () => { state.qIdx--; render(); });
}

function advance() { state.qIdx++; render(); }

function renderPersonDone(person) {
  const name = (person.answers.name && (person.answers.name.text || person.answers.name)) || 'this hero';
  app.innerHTML = `
    <div class="forge-card">
      <div class="forge-step-eyebrow">${esc(name)} is ready</div>
      <div class="forge-q">Add another to the party?</div>
      <div class="forge-hint">A great party has complementary strengths — add the friend whose gift covers ${esc(name)}'s gap.</div>
      <div class="forge-actions">
        <button id="forge-add">+ Add another hero</button>
        <button class="ghost" id="forge-finish">We're done — forge it ✦</button>
      </div>
    </div>`;
  $('#forge-add').addEventListener('click', () => {
    state.people.push({ answers: {} });
    state.personIdx = state.people.length - 1; state.qIdx = 0; render();
  });
  $('#forge-finish').addEventListener('click', renderOutput);
}

/* ============================================================
   OUTPUT
   ============================================================ */

function a(person, id) {
  const v = person.answers[id];
  return (v && (v.text || v)) || '';
}

function buildPrompt() {
  const people = state.people.map((p, i) => {
    return `Hero ${i + 1}:
- Name / who they are: ${a(p, 'name') || '(unnamed)'}
- Genuinely great at: ${a(p, 'great') || '(skipped)'}
- The thing they overdo (their lovable flaw): ${a(p, 'overdo') || '(skipped)'}
- How they show up for others at their best: ${a(p, 'others') || '(skipped)'}
- A time they grew / did the harder right thing: ${a(p, 'grew') || '(skipped)'}
- Their vibe, in a quote: ${a(p, 'quote') || '(skipped)'}`;
  }).join('\n\n');

  const partyNote = state.mode === 'crew'
    ? `\nThis is a PARTY. Balance it as a "chorus": make sure each hero's weak spot is another's strength, so they only win together. Note the complementary pairings.`
    : '';

  return `You are "adventure-forge" for the agentic-character-sheets project. Turn the answers below into a warm, schema-valid D&D-style character sheet (or a small party).

HOW TO WRITE IT — narrative-therapy technique, applied subtly, never announced:
1. Externalize the flaw as a named "monster"/tendency the hero is learning to tame ("the Overcommit"), never a verdict on the person.
2. Listen for the value under any rough answer and build toward it (find the want under the wound).
3. Turn "a time they grew" into the Adventure Log — the proudest, defining line.
4. Lead with their real gift; end on who they're becoming, not their deficit.
5. Keep the voice affectionate and a little arch. Punch up at systems, never down at people.${partyNote}

HARD GUARDRAILS (absolute): never produce sexual content about real people or any minors; no hate or dehumanization of protected groups; no targeted harassment, bullying, or defamation. If asked, kindly decline that specific element and offer the constructive version instead.

OUTPUT: For each hero, a D&D 5e-style stat block as JSON with these slots — name, title, class (+subclass), alignment (lean Good/collaborative), abilities {str,dex,con,int,wis,cha on a 1–20 curve: one headline 17–20 for what they're great at; one dumped 6–9 for the flaw; the rest 10–15}, two proficient saves (the failure modes they resist), a one-line feature, a tagline (their quote, polished), and a log[] with at least one {v, change, why} row drawn from how they grew. Then write one short "beat" — a 3–5 card illustrated scene (each card: caption + scene) that opens and closes on the same image, dramatizes their growth, and lands one durable, positive moral. Give it a fantasy title. Keep real names private to me; don't post these anywhere.

THE ANSWERS:
${people}`;
}

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'hero'; }
function liteChar(person) {
  const name = a(person, 'name') || 'A Hero';
  const great = a(person, 'great');
  const quote = a(person, 'quote');
  const title = great
    ? 'The One Who ' + great.replace(/^(is |they |he |she |can )/i, '').replace(/[.?!]+$/, '').slice(0, 56)
    : 'A Hero in the Making';
  return {
    id: slug(name), name: name, title: title,
    role: 'party', 'class': 'Adventurer', subclass: '', lineage: '',
    ac: null, tagline: quote || '',
  };
}

function renderOutput() {
  const prompt = buildPrompt();
  const sessionTs = Date.now();
  // Persist every session's answers so no Forge input is ever lost.
  try {
    const log = JSON.parse(localStorage.getItem('cs-forge-sessions') || '[]');
    log.push({ ts: sessionTs, mode: state.mode, people: state.people.map((p) => {
      const o = {}; CHARACTER_QS.forEach((q) => { o[q.id] = a(p, q.id); }); return o;
    }) });
    localStorage.setItem('cs-forge-sessions', JSON.stringify(log));
  } catch (e) {}
  app.innerHTML = `
    <div class="forge-card forge-output">
      <div class="forge-step-eyebrow">Step 2 of 2 · forge it</div>
      <div class="forge-q">Your hero${state.people.length > 1 ? 'es are' : ' is'} ready to forge ✦</div>
      <div class="forge-hint">Two ways to finish — pick whichever's easy.</div>

      <div class="forge-actions">
        <button id="forge-generate">⚡ Generate it here</button>
        <button class="ghost" id="forge-copy">Copy the prompt</button>
        <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer"><button class="ghost">Open Claude ↗</button></a>
        <button class="forge-skip" id="forge-download">download answers</button>
      </div>
      <p class="forge-hint" style="margin-top:.8rem">
        <b>Easy path:</b> tap <i>Copy the prompt</i>, open Claude, paste, send. <b>One-click:</b> tap
        <i>Generate it here</i> (works when this site has AI generation switched on).
      </p>

      <div id="forge-result"></div>

      <details style="margin-top:1rem">
        <summary style="cursor:pointer;color:var(--muted)">See the exact prompt</summary>
        <div class="forge-result">${esc(prompt)}</div>
      </details>

      <div class="forge-actions" style="margin-top:1.25rem">
        <button class="ghost" id="forge-restart">Forge another</button>
      </div>
    </div>
    <div class="forge-toast" id="forge-toast"></div>`;

  $('#forge-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(prompt); toast('Prompt copied — paste it into Claude ✦'); }
    catch { toast('Press ⌘/Ctrl+C to copy the selected prompt'); selectPrompt(); }
  });
  $('#forge-download').addEventListener('click', () => downloadJSON());
  $('#forge-restart').addEventListener('click', () => { state.mode = null; state.people = []; state.personIdx = 0; state.qIdx = 0; render(); });
  $('#forge-generate').addEventListener('click', () => generateHere(prompt));
  // No pre-generation "hero card" — "Generate it here" fills #forge-result with the 3
  // built, auto-illustrated, stat-filled variations (renderForgedVariations). The old
  // manual placeholder card (garbled, no stats, no auto-art) was dropped per feedback.
}

async function generateHere(prompt) {
  const out = $('#forge-result');
  // A live elapsed counter so the wait never reads as a hang (the model can take 10-20s).
  out.innerHTML = `<p class="forge-busy">Forging 3 builds<span class="forge-ell">…</span>
    <span class="forge-elapsed" aria-hidden="true">0s</span><br>
    <small>Summoning a hero takes a few seconds.</small></p>`;
  const t0 = Date.now();
  const tick = setInterval(() => {
    const el = out.querySelector('.forge-elapsed');
    if (el) el.textContent = Math.round((Date.now() - t0) / 1000) + 's';
  }, 1000);
  try {
    const res = await fetch('./api/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (data && Array.isArray(data.variations) && data.variations.length && window.CardRender) {
      renderForgedVariations(out, data);
      toast('Forged 3 builds — pick your favourite ✦');
      return;
    }
    // Fallback: a structured object never arrived; show whatever text came back.
    const text = (data && (data.text || data.result)) || JSON.stringify(data, null, 2);
    out.innerHTML = `<div class="forge-result">${esc(text)}</div>`;
    toast('Forged ✦');
  } catch (e) {
    out.innerHTML = `<div class="forge-gentle">One-click generation isn't switched on for this site yet.
      No problem — tap <b>Copy the prompt</b> and paste it into Claude. (To enable one-click, the owner
      adds a <code>GEMINI_API_KEY</code> secret in Cloudflare Pages — see the function at
      <code>functions/api/forge.ts</code>.)</div>`;
  } finally {
    clearInterval(tick);
  }
}

// Shape a forged variation into what CardRender.characterCanvas expects (raw ability scores,
// saves[], role) so the card draws a FULL stat block instead of an empty "AC —" frame.
function normalizeForged(v, i) {
  const ab = v.abilities || {};
  return {
    id: slug(v.name || ('hero-' + i)) + '-' + (i + 1),
    name: v.name || 'A Hero', title: v.title || '', role: v.role || 'party',
    'class': v['class'] || 'Adventurer', subclass: v.subclass || '', alignment: v.alignment || '',
    abilities: { str: +ab.str || 10, dex: +ab.dex || 10, con: +ab.con || 10, int: +ab.int || 10, wis: +ab.wis || 10, cha: +ab.cha || 10 },
    saves: Array.isArray(v.saves) ? v.saves : [],
    feature: v.feature || '', tagline: v.tagline || '', log: Array.isArray(v.log) ? v.log : [],
    ac: null,
  };
}
function forgedPortraitPrompt(ch, note) {
  return window.CardRender.stylePrompt.painterly +
    'Heroic, warm fantasy character portrait of ' + (ch.name || 'a hero') +
    (ch['class'] ? ', a ' + ch['class'] : '') + (ch.feature ? '. ' + ch.feature : '') +
    '. Head-and-shoulders composition, face clearly visible in the upper third of the frame, ' +
    'looking toward the viewer. Single dignified figure, friendly, no text, no words.' +
    (note ? ' Art-director note: ' + note : '');
}
// Render the 3 forged builds as full, filled stat-cards, each with its own art maker.
function renderForgedVariations(out, data) {
  out.innerHTML = '';
  if (data.intro) { const p = document.createElement('p'); p.className = 'forge-hint'; p.style.marginBottom = '.8rem'; p.textContent = data.intro; out.appendChild(p); }
  const grid = document.createElement('div'); grid.className = 'forge-gallery';
  data.variations.slice(0, 3).forEach((v, i) => {
    const ch = normalizeForged(v, i);
    const item = document.createElement('div'); item.className = 'forge-card-item';
    item.dataset.hero = (ch.name || 'A hero') + (ch['class'] ? ' · ' + ch['class'] : ''); // WIP-rail label
    if (v.variation_note) { const n = document.createElement('div'); n.className = 'forge-step-eyebrow forge-card-eyebrow'; n.textContent = v.variation_note; item.appendChild(n); }
    let cv = window.CardRender.characterCanvas(ch); cv.className = 'forge-card-img';
    const show = (img) => { const ncv = window.CardRender.characterCanvas(ch, img || null); ncv.className = 'forge-card-img'; cv.replaceWith(ncv); cv = ncv; };
    // Order per feedback: title → "Add your take" CTA → card graphic → play.
    item.appendChild(window.CardRender.versionedMaker({
      itemId: 'forge-' + ch.id + '-' + Date.now(),
      show: show,
      buildPrompt: (note) => forgedPortraitPrompt(ch, note),
      placeholder: 'Note to steer ' + (ch.name || 'this hero') + '’s art (optional)…',
      makeSaveCanvas: () => cv,
    }));
    item.appendChild(cv);
    // Play THIS build through an adventure (the forge-to-story flow).
    item.appendChild(buildPlayBlock(ch));
    grid.appendChild(item);
    // Restore the SAME portrait from R2 if we saved one; else generate + capture its url.
    if (v.portrait) {
      window.CardRender.loadImage(v.portrait).then(show).catch(() => autoIllustrate(item, ch, show, (url) => savePortrait(data, i, url)));
    } else {
      autoIllustrate(item, ch, show, (url) => savePortrait(data, i, url));
    }
  });
  out.appendChild(grid);
  saveForge(data); // so navigating away mid-forge doesn't lose it
}

// Persist the last forge (builds + their R2 portrait urls) so /forge restores it on return.
function saveForge(data) {
  try { localStorage.setItem('cs-forge-last', JSON.stringify({ intro: data.intro, variations: data.variations, ts: Date.now() })); } catch (e) {}
}
function savePortrait(data, i, url) {
  if (!url || !data.variations[i]) return;
  data.variations[i].portrait = url;
  saveForge(data);
}

// Auto-generate a forged card's portrait so the user sees their hero immediately
// instead of the blank stat-card. Fast (std) pass; "Make another" re-rolls at HQ.
// A small badge marks the wait; failure just leaves the placeholder.
function autoIllustrate(item, ch, show, onPortrait) {
  if (!(window.CardRender && window.CardRender.fetchArtFull)) return;
  const badge = document.createElement('div');
  badge.className = 'forge-illustrating';
  badge.textContent = '✦ illustrating ' + (ch.name || 'your hero') + '…';
  item.appendChild(badge);
  const gate = window.CardRender.GenGate;
  if (gate) gate.begin(); // count toward the cap so manual Make buttons grey out meanwhile
  // saveKey persists the portrait to R2 so the SAME hero returns on reload (and shows in /admin).
  window.CardRender.fetchArtFull(forgedPortraitPrompt(ch, ''), undefined, { quality: 'std', saveKey: ch.id })
    .then((d) => {
      if (d && d.image) { window.CardRender.loadImage(d.image).then(show).catch(() => {}); if (onPortrait) onPortrait(d.saved || ''); }
    })
    .catch(() => {})
    .then(() => { badge.remove(); if (gate) gate.end(); });
}

/* ============================================================
   FORGE → STORY  (play a forged hero through an adventure)
   Picks an adventure, calls the DM engine (/api/dm), and renders
   the returned emergent beats as a personalized "Your Story" view
   beneath the stat-card. Persisted to localStorage per hero+adventure.
   ============================================================ */

// A stable persistence key for one hero's run of one adventure.
function storyKey(ch, advId) { return 'cs-story:' + (ch.id || slug(ch.name)) + ':' + advId; }

// Lazily load the two data files the flow needs (adventures + beats), cached.
let _advCache = null, _beatCache = null;
async function loadAdventures() {
  if (_advCache) return _advCache;
  const res = await fetch('./data/adventures.json');
  if (!res.ok) throw new Error('adventures ' + res.status);
  const data = await res.json();
  _advCache = (data && Array.isArray(data.adventures)) ? data.adventures : [];
  return _advCache;
}
async function loadBeats() {
  if (_beatCache) return _beatCache;
  const res = await fetch('./data/beats.json');
  if (!res.ok) throw new Error('beats ' + res.status);
  const data = await res.json();
  _beatCache = (data && Array.isArray(data.beats)) ? data.beats : [];
  return _beatCache;
}
// Match an adventure to its beat by name first, then id (both are present in beats.json).
function beatForAdventure(beats, adv) {
  return beats.find((b) => b.adventure === adv.name) ||
    beats.find((b) => b.id && (adv.id === b.id || adv.id.indexOf(b.id) !== -1)) || null;
}

// The collapsed "Play this hero in an adventure" control on each build card.
function buildPlayBlock(ch) {
  const block = document.createElement('div');
  block.className = 'forge-play';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'forge-play-btn';
  btn.textContent = '▶ Play ' + (ch.name || 'this hero') + ' in an adventure';
  const panel = document.createElement('div'); panel.className = 'forge-play-panel'; panel.hidden = true;
  const story = document.createElement('div'); story.className = 'forge-story-mount';
  block.appendChild(btn); block.appendChild(panel); block.appendChild(story);

  let built = false;
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && !built) { built = true; renderAdventurePicker(panel, story, ch); }
  });
  return block;
}

// The adventure chooser. On pick, runs (or restores) the story into `mount`.
async function renderAdventurePicker(panel, mount, ch) {
  panel.innerHTML = '<p class="forge-hint">Loading adventures…</p>';
  let advs;
  try { advs = await loadAdventures(); }
  catch (e) {
    panel.innerHTML = '<div class="forge-gentle">Could not load the adventure list. Reload and try again.</div>';
    return;
  }
  panel.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'forge-step-eyebrow';
  label.textContent = 'Pick an adventure to drop ' + (ch.name || 'this hero') + ' into';
  panel.appendChild(label);
  const chips = document.createElement('div'); chips.className = 'forge-adv-chips';
  advs.forEach((adv) => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'forge-adv-chip';
    chip.innerHTML = '<b>' + esc(adv.name) + '</b><small>' + esc(adv.use_category || '') + '</small>';
    chip.addEventListener('click', () => {
      panel.querySelectorAll('.forge-adv-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      playAdventure(mount, ch, adv);
    });
    chips.appendChild(chip);
  });
  panel.appendChild(chips);
}

// Run one adventure for one hero: restore from localStorage if present, else call /api/dm.
async function playAdventure(mount, ch, adv) {
  const key = storyKey(ch, adv.id);
  // Restore a previously generated run so a refresh keeps it.
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.beats) && saved.beats.length) {
      renderStory(mount, ch, adv, saved.beats, true);
      return;
    }
  } catch (e) {}

  mount.innerHTML = '';
  const busy = document.createElement('div'); busy.className = 'forge-story-busy';
  busy.innerHTML = '<span class="forge-spinner" aria-hidden="true"></span>' +
    '<span>The DM is running your story through <b>' + esc(adv.name) + '</b>… this takes about 10 to 20 seconds.</span>';
  mount.appendChild(busy);

  let beats;
  try { beats = await loadBeats(); }
  catch (e) {
    mount.innerHTML = '<div class="forge-gentle">Could not load the adventure beats. Reload and try again.</div>';
    return;
  }
  const beat = beatForAdventure(beats, adv);
  if (!beat || !Array.isArray(beat.cards) || !beat.cards.length) {
    mount.innerHTML = '<div class="forge-gentle">This adventure has no beats to play yet. Try another one.</div>';
    return;
  }

  const payload = {
    hero: ch,
    adventure: { title: beat.title, adventure: adv.name, bible: beat.bible, cards: beat.cards },
  };
  try {
    const res = await fetch('./api/dm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 503) {
      mount.innerHTML = '<div class="forge-gentle">DM generation isn’t switched on for this site yet. ' +
        'No problem; the canonical adventure still plays at <a href="./adventures.html">Adventures</a>.</div>';
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!data || !Array.isArray(data.beats) || !data.beats.length) throw new Error('no beats');
    // Persist with everything renderStory needs to redraw on reload.
    try { localStorage.setItem(key, JSON.stringify({ beats: data.beats, beatId: beat.id, ts: Date.now() })); } catch (e) {}
    renderStory(mount, ch, adv, data.beats, false);
    toast('Your story is ready ✦');
  } catch (e) {
    mount.innerHTML = '<div class="forge-gentle">The DM couldn’t run this one just now. ' +
      'Reload to try again, or read the canonical version at <a href="./adventures.html">Adventures</a>.</div>';
  }
}

// Build the per-beat image/video prompt from the DM scene + the canonical bible,
// mirroring CardRender.beatPrompt (style preamble + [WORLD]/[CAST]/[TONE] bible) but
// keyed off the DM's emergent scene rather than the canonical card.
function storyBeatPrompt(beatId, bible, beat, note) {
  const pre = (window.CardRender.stylePrompt[storyStyleName(beatId)] || window.CardRender.stylePrompt.painterly);
  const world = bibleToPrompt(bible);
  return pre + world + (beat.scene || beat.caption || '') + (note ? ' Art-director note: ' + note : '');
}
function storyVideoPrompt(beatId, bible, beat, note) {
  const pre = (window.CardRender.stylePrompt[storyStyleName(beatId)] || window.CardRender.stylePrompt.painterly);
  return pre + bibleToPrompt(bible) +
    'Animate this single keyframe into a 3-5 second cinematic shot in this exact art style: ' +
    (beat.scene || beat.caption || '') +
    ' Bring it to life with motion and a moving camera (slow push-in, parallax, drifting elements), but stay on this one scene; do NOT cut to other scenes. No on-screen text or captions.' +
    (note ? ' Art-director note: ' + note : '');
}
// Map a beat id to the same default illustration style the Adventures page uses.
function storyStyleName(beatId) {
  const byId = { masquerade: 'gothic', 'round-table': 'feedbait', 'proving-grounds': 'telecast', forge: 'terminal', echoes: 'glitch' };
  return byId[beatId] || 'painterly';
}
// Compose the style-independent world/cast/tone bible into a prompt fragment
// (same shape CardRender.buildBible emits, kept local so forge.js stays additive).
function bibleToPrompt(b) {
  if (!b) return '';
  const cast = (b.recurring_cast || []).map((c) => c.locked_descriptor + (c.mannerism ? ' (' + c.mannerism + ')' : '')).join('; ');
  const p = [];
  p.push('[WORLD] ' + (b.setting || '') + (b.setting_aspects && b.setting_aspects.length ? ', ' + b.setting_aspects.join(', ') : '') + (b.establishing_anchor ? '. Establishing anchor: ' + b.establishing_anchor : '') + '.');
  if (b.recurring_motifs && b.recurring_motifs.length) p.push('[MOTIFS] recurring, show at least one: ' + b.recurring_motifs.join(', ') + '.');
  if (cast) p.push('[CAST] keep identical across frames: ' + cast + '.');
  if (b.bigbad_silhouette) p.push('[THREAT] antagonist silhouette: ' + b.bigbad_silhouette + '.');
  if (b.tone && b.tone.length) p.push('[TONE] ' + b.tone.join(', ') + '.');
  return ' ' + p.join(' ') + ' ';
}

// Render the DM's emergent beats as a vertical "Your Story" sequence.
function renderStory(mount, ch, adv, beats, restored) {
  mount.innerHTML = '';
  // Resolve the canonical beat (for its bible + id) so per-beat art stays in-world.
  const cBeat = (_beatCache && beatForAdventure(_beatCache, adv)) || null;
  const bible = cBeat ? cBeat.bible : null;
  const beatId = cBeat ? cBeat.id : adv.id;

  // Identity anchor (keyframe lock): generate the hero's portrait ONCE up front, then every
  // beat image references it so the SAME character recurs across beats instead of being
  // re-imagined each time. Fire-and-forget at std quality; beats that fire before it lands
  // just generate un-anchored (graceful). getRefImages() reads it lazily.
  let heroRef = null;
  if (window.CardRender && window.CardRender.fetchArtData) {
    window.CardRender.fetchArtData(forgedPortraitPrompt(ch, ''), undefined, { quality: 'std' })
      .then((dataUrl) => { if (dataUrl) heroRef = dataUrl; })
      .catch(() => {});
  }

  const head = document.createElement('div'); head.className = 'forge-story-head';
  head.dataset.adventure = adv.name || 'Your story'; // WIP-rail label
  head.innerHTML =
    '<div class="forge-step-eyebrow">Your story · ' + esc(adv.name) + (restored ? ' · saved' : '') + '</div>' +
    '<div class="forge-story-title">' + esc(ch.name || 'Your hero') + ' plays ' + esc(adv.name) + '</div>' +
    '<p class="forge-hint">' + beats.length + ' beats, branched off ' + esc(ch.name || 'your hero') +
      '’s stats. Their strongest ability shines; their dumped one causes the turn. ' +
      'Reveal “why this happened” under any beat to see the DM’s hidden logic.</p>';
  mount.appendChild(head);

  const list = document.createElement('div'); list.className = 'forge-story-list';
  beats.forEach((beat, i) => {
    const node = document.createElement('div'); node.className = 'forge-beat';

    const num = document.createElement('div'); num.className = 'forge-beat-num'; num.textContent = (i + 1) + ' / ' + beats.length;
    node.appendChild(num);

    if (beat.caption) {
      const cap = document.createElement('div'); cap.className = 'forge-beat-caption'; cap.textContent = beat.caption;
      node.appendChild(cap);
    }
    if (beat.decision) {
      const dec = document.createElement('div'); dec.className = 'forge-beat-decision'; dec.textContent = beat.decision;
      node.appendChild(dec);
    }
    if (beat.scene) {
      const scn = document.createElement('div'); scn.className = 'forge-beat-scene'; scn.textContent = beat.scene;
      node.appendChild(scn);
    }
    // "why this happened": the hidden stat-logic (dm_note), collapsed.
    if (beat.dm_note) {
      const why = document.createElement('details'); why.className = 'forge-beat-why';
      const sum = document.createElement('summary'); sum.textContent = 'Why this happened';
      sum.addEventListener('click', (e) => e.stopPropagation());
      const body = document.createElement('div'); body.className = 'forge-beat-why-body'; body.textContent = beat.dm_note;
      why.appendChild(sum); why.appendChild(body);
      node.appendChild(why);
    }

    // Per-beat art maker: prompt = style + bible + the DM's emergent scene.
    if (window.CardRender && window.CardRender.versionedMaker) {
      const artWrap = document.createElement('div'); artWrap.className = 'forge-beat-art';
      let imgEl = null;
      // The current beat keyframe (data URL), shared with the video maker so a generated
      // (identity-locked) beat image becomes the video's first frame — the full keyframe lock.
      const art = { src: null };
      const maker = window.CardRender.versionedMaker({
        itemId: 'storyimg:' + (ch.id || slug(ch.name)) + ':' + adv.id + ':' + i,
        show: (img) => {
          art.src = img ? img.src : null;
          if (img) {
            if (!imgEl) { imgEl = document.createElement('img'); imgEl.className = 'forge-beat-img'; imgEl.alt = beat.scene || ''; artWrap.insertBefore(imgEl, artWrap.firstChild); }
            imgEl.src = img.src;
          } else if (imgEl) { imgEl.remove(); imgEl = null; }
        },
        buildPrompt: (note) => storyBeatPrompt(beatId, bible, beat, note),
        getRefImages: () => (heroRef ? [heroRef] : []),
        placeholder: 'Note to steer this beat’s image (optional)…',
      });
      node.appendChild(artWrap);
      node.appendChild(maker);
      // Optional video maker for the beat. Passes `art` so that if the user has made a beat
      // image, that locked still is animated as the clip's first frame (image-to-video).
      node.appendChild(buildBeatVideoMaker(ch, adv, beatId, bible, beat, i, art));
    }

    list.appendChild(node);
  });
  mount.appendChild(list);

  // "Finish this story -> video": stitch the per-beat clips into one polished moment (CI render).
  mount.appendChild(buildFinishMoment(ch, adv, beats, beatId, bible));

  // The whole point: your version vs. the canonical one.
  const compare = document.createElement('div'); compare.className = 'forge-story-compare';
  compare.innerHTML = 'This is <b>your</b> version. Compare it to the canonical <a href="./adventures.html">' +
    esc(adv.name) + ' →</a>';
  mount.appendChild(compare);

  // Replay / clear controls.
  const actions = document.createElement('div'); actions.className = 'forge-actions';
  const again = document.createElement('button'); again.type = 'button'; again.className = 'cr-save-btn ghost';
  again.textContent = '↻ Re-run this story';
  again.addEventListener('click', () => {
    try { localStorage.removeItem(storyKey(ch, adv.id)); } catch (e) {}
    playAdventure(mount, ch, adv);
  });
  actions.appendChild(again);
  mount.appendChild(actions);
}

// Map an adventure to a fitting music genre for its finished moment.
function storyGenre(beatId) {
  const m = { masquerade: 'noir', 'round-table': 'americana', 'proving-grounds': 'trailer', forge: 'synthwave', echoes: 'synthwave', 'orange-menace': 'trailer' };
  return m[beatId] || 'orchestral';
}

// "Finish this story -> video": gate on every beat having a clip (so the moment isn't gappy),
// then POST /api/render (kicks the CI stitcher) and poll R2 for the finished, narrated, scored clip.
function buildFinishMoment(ch, adv, beats, beatId, bible) {
  const wrap = document.createElement('div'); wrap.className = 'forge-finish';
  const heroId = ch.id || slug(ch.name);
  const outKey = 'videos/story-' + heroId + '-' + adv.id + '-FULL.mp4';
  const clipKeys = beats.map((b, i) => 'videos/story-' + heroId + '-' + adv.id + '-' + (i + 1) + '.mp4');
  const title = (ch.name || 'Your hero') + ' · ' + adv.name;
  const tone = (bible && Array.isArray(bible.tone) && bible.tone.join(', ')) || 'cinematic';
  const genre = storyGenre(beatId);

  const head = document.createElement('div'); head.className = 'forge-finish-head';
  head.innerHTML = '<b>Finish this story → video</b> <span>one polished clip: your beats, narrated and scored.</span>';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cr-save-btn forge-finish-btn'; btn.textContent = '🎬 Finish this story → video';
  const status = document.createElement('div'); status.className = 'forge-finish-status';
  const player = document.createElement('div'); player.className = 'forge-finish-player';
  wrap.appendChild(head); wrap.appendChild(btn); wrap.appendChild(status); wrap.appendChild(player);

  function showVideo(url) {
    const v = document.createElement('video'); v.className = 'forge-moment-video'; v.controls = true; v.playsInline = true;
    v.src = url; player.innerHTML = ''; player.appendChild(v);
  }
  // Restore an already-finished moment if one exists in R2.
  (function restore() {
    const probe = document.createElement('video');
    probe.onloadeddata = function () { showVideo(probe.src); btn.textContent = '🎬 Re-finish'; if (!status.textContent) status.textContent = 'Your finished moment:'; };
    probe.src = (window.MEDIA_BASE || '.') + '/' + outKey;
  })();

  btn.addEventListener('click', async () => {
    btn.disabled = true; player.innerHTML = ''; status.textContent = 'Checking your beats…';
    let have;
    try { have = await Promise.all(clipKeys.map((k) => fetch('./api/render?key=' + encodeURIComponent(k)).then((r) => r.json()).then((d) => !!d.ready).catch(() => false))); }
    catch (e) { status.textContent = 'Could not check your beats. Reload and retry.'; btn.disabled = false; return; }
    const missing = []; have.forEach((ok, i) => { if (!ok) missing.push(i + 1); });
    if (missing.length) {
      status.innerHTML = 'Make a video for beat' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') +
        ' first — open “Make a video of this beat” under each, then finish. (The look stays consistent across beats unless you steer one with a note.)';
      btn.disabled = false; return;
    }
    status.textContent = 'Sending to the renderer…';
    const payload = { outKey, title, tone, genre, clipKeys, beats: beats.map((b) => ({ caption: b.caption || '', scene: b.scene || '' })) };
    let started;
    try { started = await fetch('./api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then((r) => r.json()); }
    catch (e) { status.textContent = 'Could not start the render.'; btn.disabled = false; return; }
    if (!started || started.error) {
      status.textContent = (started && /not enabled/.test(started.error || '')) ? 'The finished-video renderer isn’t switched on for this site yet.' : ('Render error: ' + ((started && started.error) || 'unknown'));
      btn.disabled = false; return;
    }
    status.textContent = 'Rendering your moment… ~1 to 2 minutes (it saves to this page).';
    let tries = 0;
    const poll = () => {
      fetch('./api/render?key=' + encodeURIComponent(outKey) + '&t=' + Date.now()).then((r) => r.json()).then((d) => {
        if (d.ready && d.url) { showVideo(d.url + '?t=' + Date.now()); status.textContent = 'Done ✓ your finished moment:'; btn.textContent = '🎬 Re-finish'; btn.disabled = false; return; }
        if (tries++ > 30) { status.textContent = 'Still rendering — check back shortly; it saves here when done.'; btn.disabled = false; return; }
        setTimeout(poll, 5000);
      }).catch(() => { if (tries++ <= 30) setTimeout(poll, 5000); else { btn.disabled = false; } });
    };
    setTimeout(poll, 35000); // the stitch takes ~30s; wait past it so we don't catch a stale FULL
  });
  return wrap;
}

// One collapsed video maker per beat. Renders THIS DM scene as a silent 3-5s clip
// and persists it to its own R2 key so a reload finds it (same scheme as beats.js).
function buildBeatVideoMaker(ch, adv, beatId, bible, beat, i, art) {
  const take = window.CardRender.takeDisclosure
    ? window.CardRender.takeDisclosure({ label: 'Make a video of this beat' })
    : document.createElement('div');
  const body = take._body || take;
  let videoEl = null, statusEl = null;
  const key = 'story-' + (ch.id || slug(ch.name)) + '-' + adv.id + '-' + (i + 1);
  function ensureEls() {
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.className = 'forge-beat-video'; videoEl.controls = true; videoEl.playsInline = true; videoEl.loop = true; videoEl.style.display = 'none';
      body.appendChild(videoEl);
    }
    if (!statusEl) { statusEl = document.createElement('p'); statusEl.className = 'beat-video-status'; body.appendChild(statusEl); }
  }
  function poll(op, n) {
    return new Promise((resolve, reject) => {
      const tick = () => {
        fetch('./api/video?op=' + encodeURIComponent(op) + '&key=' + encodeURIComponent(key)).then((r) => r.json()).then((d) => {
          if (d.error) return reject(d);
          if (d.done && d.video) return resolve(d.persisted ? ((window.MEDIA_BASE || '') + '/' + d.video) : d.video);
          if (n++ > 36) return reject({ error: 'timed out' });
          if (statusEl) statusEl.textContent = 'Rendering clip… (' + (n * 5) + 's)';
          setTimeout(tick, 5000);
        }).catch(reject);
      };
      tick();
    });
  }
  // One Veo cycle (start -> poll -> persisted R2 url) at the beat's key. If the user has
  // made a beat image, that locked still rides along as the FIRST FRAME (image-to-video).
  function genClip(prompt) {
    const payload = { prompt: prompt, aspectRatio: '9:16', durationSeconds: 4, key: key };
    if (art && art.src) payload.image = art.src;
    return fetch('./api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then((r) => r.json().then((d) => r.ok ? d : Promise.reject(d)))
      .then((d) => { if (!d.op) return Promise.reject(d); return poll(d.op, 0); });
  }
  // Hidden adversarial pass: a video critic scores the take; null/keep on any failure.
  function critiqueClip(url, intent) {
    return fetch('./api/critique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: url, intent: intent, kind: 'video' }) })
      .then((r) => r.ok ? r.json() : null).catch(() => null);
  }
  const bar = window.CardRender.makerControls({
    placeholder: 'Note to steer this beat’s video (optional)…',
    buttons: [{
      label: '🎬 Make video', busy: '🎬 generating…', done: '🎬 Remake video', fail: '⚠ video failed', ghost: true,
      title: 'Render THIS beat as a silent 3-5s clip',
      run: (note) => {
        ensureEls();
        const hasKey = !!(art && art.src);
        statusEl.textContent = hasKey ? 'Animating your beat image…' : 'Rendering the shot…';
        // With a locked keyframe the prompt is motion-only (Veo animates the still); without
        // one it falls back to the full scene prompt (text-to-video).
        const prompt = hasKey
          ? ('Animate this exact image into a 3-5 second cinematic shot: keep the composition, every character, and the color palette IDENTICAL; add only subtle ambient motion (living light, gentle drift) and a slow camera move.' + (note ? ' ' + note : '') + ' Add no new people or objects, no scene change, no on-screen text.')
          : storyVideoPrompt(beatId, bible, beat, note);
        const intent = beat.scene || beat.caption || beat.title || '';
        // Pass 1, then a hidden critic decides if a single targeted redo is worth it.
        return genClip(prompt).then((url1) => {
          statusEl.textContent = 'Reviewing the take…';
          return critiqueClip(url1, intent).then((c) => {
            if (!c || c.verdict !== 'redo') return url1;
            statusEl.textContent = 'Refining the shot (final pass)…';
            var fix = prompt + (c.tweak ? ' ' + c.tweak : '') + (c.flaws && c.flaws.length ? ' Avoid: ' + c.flaws.slice(0, 2).join('; ') + '.' : '');
            return genClip(fix.slice(0, 1900)).catch(() => url1); // redo failed (e.g. quota) -> keep pass 1
          });
        }).then((url) => {
          videoEl.src = url + (url.indexOf('?') < 0 ? '?t=' : '&t=') + Date.now(); // bust cache on overwrite
          videoEl.style.display = ''; statusEl.textContent = 'Saved to this beat ✓'; return true;
        }).catch((err) => { statusEl.textContent = (err && err.error) ? ('Video unavailable: ' + err.error) : 'Video failed.'; return false; });
      },
    }],
  });
  body.appendChild(bar);
  // Restore a previously rendered clip for this beat, if any.
  ensureEls();
  videoEl.onloadeddata = function () { videoEl.style.display = ''; };
  videoEl.onerror = function () { videoEl.style.display = 'none'; };
  videoEl.src = (window.MEDIA_BASE || '.') + '/videos/' + key + '.mp4';
  return take;
}

function downloadJSON() {
  const payload = { mode: state.mode, people: state.people.map((p) => {
    const o = {}; CHARACTER_QS.forEach((q) => o[q.id] = a(p, q.id)); return o;
  }) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'forge-answers.json'; link.click();
  URL.revokeObjectURL(url);
  toast('Answers downloaded');
}

function selectPrompt() {
  const el = $('.forge-result'); if (!el) return;
  const r = document.createRange(); r.selectNodeContents(el);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}

let toastTimer;
function toast(msg) {
  const t = $('#forge-toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================
   VOICE (Web Speech API) — graceful if unsupported
   ============================================================ */
function setupMic(field) {
  const mic = $('#forge-mic');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { mic.classList.add('unsupported'); return; }
  let rec = null, listening = false;
  mic.addEventListener('click', () => {
    if (listening && rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    const base = field.value ? field.value + ' ' : '';
    rec.onstart = () => { listening = true; mic.classList.add('listening'); };
    rec.onend = () => { listening = false; mic.classList.remove('listening'); field.focus(); };
    rec.onerror = () => { listening = false; mic.classList.remove('listening'); };
    rec.onresult = (ev) => {
      let t = '';
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      field.value = base + t;
    };
    rec.start();
  });
}

/* ============================================================
   DEEP LINK — land a pre-forged hero at the "choose adventure" stage
   forge.html?play=<base64url(JSON variation)> skips the intake form and
   drops straight into the adventure picker with the hero ready to play.
   Used to hand someone a specific hero (e.g. a shared "play as Bridie" link).
   ============================================================ */
function decodePlay(s) {
  try {
    let b = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    const v = JSON.parse(decodeURIComponent(escape(atob(b))));
    return (v && v.name) ? v : null;
  } catch (e) { return null; }
}

function renderPlayView(v) {
  const ch = normalizeForged(v, 0);
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'forge-card';
  const eyebrow = document.createElement('div');
  eyebrow.className = 'forge-step-eyebrow';
  eyebrow.textContent = 'Your hero is ready · choose an adventure';
  wrap.appendChild(eyebrow);
  const h = document.createElement('div');
  h.className = 'forge-q';
  h.textContent = (ch.name || 'Your hero') + ' — ' + (ch.title || ch['class'] || '');
  wrap.appendChild(h);
  if (v.tagline) {
    const t = document.createElement('p');
    t.className = 'forge-hint';
    t.textContent = '“' + v.tagline + '”';
    wrap.appendChild(t);
  }
  if (window.CardRender) {
    const item = document.createElement('div');
    item.className = 'forge-card-item';
    item.dataset.hero = (ch.name || 'A hero') + (ch['class'] ? ' · ' + ch['class'] : ''); // WIP-rail label
    let cv = window.CardRender.characterCanvas(ch);
    cv.className = 'forge-card-img';
    item.appendChild(cv);
    const show = (img) => { const n = window.CardRender.characterCanvas(ch, img || null); n.className = 'forge-card-img'; cv.replaceWith(n); cv = n; };
    item.appendChild(window.CardRender.versionedMaker({
      itemId: 'play-' + ch.id,
      show: show,
      buildPrompt: (note) => forgedPortraitPrompt(ch, note),
      placeholder: 'Note to steer ' + (ch.name || 'this hero') + '’s art (optional)…',
      makeSaveCanvas: () => cv,
    }));
    wrap.appendChild(item);
    autoIllustrate(item, ch, show); // show Bridie immediately, not a placeholder
    const tog = document.createElement('div');
    tog.className = 'forge-actions';
    tog.appendChild(window.CardRender.providerToggle());
    wrap.appendChild(tog);
  }
  const panel = document.createElement('div');
  panel.className = 'forge-play-panel';
  const story = document.createElement('div');
  story.className = 'forge-story-mount';
  wrap.appendChild(panel);
  wrap.appendChild(story);
  app.appendChild(wrap);
  renderAdventurePicker(panel, story, ch);
}

/* ============================================================
   WIP RAIL — a floating, collapsible project outline for the forge/story page.
   Lists the hero(es) -> story -> beats with jump links + which media each has,
   plus a live "generating…" status, so you can edit anywhere, watch work grow,
   and tame the long scroll. Rebuilds itself from the DOM as content appears.
   ============================================================ */
const WipRail = (function () {
  let root, statusEl, listEl, observer, debounce;
  let collapsed = false;
  try { collapsed = localStorage.getItem('cs-wip-collapsed') === '1'; } catch (e) {}

  function ensure() {
    if (root) return;
    root = document.createElement('aside');
    root.className = 'wip-rail' + (collapsed ? ' collapsed' : '');
    const head = document.createElement('div'); head.className = 'wip-head';
    const title = document.createElement('span'); title.className = 'wip-title'; title.textContent = 'Project';
    const tog = document.createElement('button'); tog.type = 'button'; tog.className = 'wip-tog'; tog.setAttribute('aria-label', 'Toggle project rail'); tog.textContent = collapsed ? '☰' : '×';
    tog.addEventListener('click', () => {
      collapsed = !collapsed; root.classList.toggle('collapsed', collapsed); tog.textContent = collapsed ? '☰' : '×';
      try { localStorage.setItem('cs-wip-collapsed', collapsed ? '1' : '0'); } catch (e) {}
    });
    head.appendChild(title); head.appendChild(tog);
    statusEl = document.createElement('div'); statusEl.className = 'wip-status'; statusEl.style.display = 'none';
    listEl = document.createElement('div'); listEl.className = 'wip-list';
    root.appendChild(head); root.appendChild(statusEl); root.appendChild(listEl);
    document.body.appendChild(root);
    const gate = window.CardRender && window.CardRender.GenGate;
    if (gate) { gate.onChange(renderStatus); renderStatus(gate.active()); }
  }
  function renderStatus(n) {
    if (!statusEl) return;
    statusEl.textContent = n > 0 ? ('⏳ ' + n + ' generating…') : '';
    statusEl.style.display = n > 0 ? '' : 'none';
  }
  function jump(target) { if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function link(label, target, cls) {
    const a = document.createElement('button'); a.type = 'button'; a.className = 'wip-link' + (cls ? ' ' + cls : ''); a.textContent = label;
    a.addEventListener('click', () => jump(target)); return a;
  }
  function badge(on, glyph) { const s = document.createElement('span'); s.className = 'wip-badge' + (on ? ' on' : ''); s.textContent = glyph; return s; }
  function sect(t) { const d = document.createElement('div'); d.className = 'wip-sect-label'; d.textContent = t; return d; }

  function refresh() {
    ensure();
    listEl.innerHTML = '';
    const scope = document.getElementById('forge-app') || document.body;
    let any = false;
    const cards = scope.querySelectorAll('.forge-card-item');
    if (cards.length) {
      any = true; listEl.appendChild(sect(cards.length > 1 ? 'Heroes' : 'Hero'));
      cards.forEach((c, i) => {
        const nm = c.querySelector('.forge-card-eyebrow, .forge-step-eyebrow');
        const label = c.dataset.hero || ((nm && nm.textContent) ? nm.textContent.slice(0, 26) : 'Build ' + (i + 1));
        listEl.appendChild(link('• ' + label, c));
      });
    }
    const headEl = scope.querySelector('.forge-story-head');
    const beats = scope.querySelectorAll('.forge-beat');
    if (headEl || beats.length) {
      any = true;
      const advT = headEl ? (headEl.dataset.adventure || (headEl.querySelector('.forge-story-title') || headEl).textContent) : 'Your story';
      listEl.appendChild(sect('Story'));
      listEl.appendChild(link((advT || 'Your story').slice(0, 28), headEl || beats[0], 'wip-adv'));
      beats.forEach((b, i) => {
        const row = document.createElement('div'); row.className = 'wip-beat';
        const cap = b.querySelector('.forge-beat-caption');
        const capText = (cap && cap.textContent.trim()) ? cap.textContent.trim() : '';
        row.appendChild(link((i + 1) + '. ' + (capText ? capText.slice(0, 22) : 'Beat ' + (i + 1)), b));
        const bd = document.createElement('span'); bd.className = 'wip-badges';
        bd.appendChild(badge(true, '📝'));
        bd.appendChild(badge(!!b.querySelector('.forge-beat-img'), '🖼'));
        const v = b.querySelector('.forge-beat-video');
        bd.appendChild(badge(!!(v && v.src && v.style.display !== 'none'), '🎬'));
        row.appendChild(bd); listEl.appendChild(row);
      });
      const finish = scope.querySelector('.forge-finish');
      if (finish) listEl.appendChild(link((scope.querySelector('.forge-moment-video') ? '✓ ' : '') + 'Finished video', finish, 'wip-finish'));
    }
    root.style.display = any ? '' : 'none'; // only show once there's something to outline
  }
  function watch() {
    ensure(); refresh();
    if (observer) return;
    observer = new MutationObserver(() => { clearTimeout(debounce); debounce = setTimeout(refresh, 400); });
    observer.observe(document.getElementById('forge-app') || document.body, { childList: true, subtree: true });
  }
  return { watch };
})();

/* ============================================================
   NAV (hamburger) + boot
   ============================================================ */
function initHamburger() {
  const toggle = $('#nav-toggle'), navList = $('#nav-list');
  if (!toggle || !navList) return;
  toggle.addEventListener('click', () => {
    navList.classList.toggle('open');
    toggle.setAttribute('aria-expanded', navList.classList.contains('open'));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initHamburger();
  if (window.CardRender) WipRail.watch(); // floating project outline; self-hides until there's content
  const param = new URLSearchParams(location.search).get('play');
  let hero = decodePlay(param);
  // Short alias: ?play=bridie -> look up a named hero in data/heroes.json. Keeps the
  // shareable link tiny and unbreakable (the base64 form is ~850 chars and gets
  // truncated in SMS/iMessage, which silently drops back to the intake form).
  if (!hero && param && param.length <= 40 && /^[a-z0-9_-]+$/i.test(param)) {
    try {
      const res = await fetch('./data/heroes.json');
      const d = await res.json(); // throws on the HTML 404-fallback -> caught below
      hero = (d && d[param.toLowerCase()]) || null;
    } catch (e) { /* no such named hero -> fall through to the intake form */ }
  }
  if (hero && window.CardRender) { renderPlayView(hero); return; }
  // Restore the last forge so navigating away (then back) doesn't lose the heroes.
  if (!param && window.CardRender) {
    let last = null;
    try { last = JSON.parse(localStorage.getItem('cs-forge-last') || 'null'); } catch (e) {}
    if (last && Array.isArray(last.variations) && last.variations.length) { renderRestoredForge(last); return; }
  }
  render();
});

// Pick up where you left off: re-render the last forge's builds (portraits load from R2).
function renderRestoredForge(data) {
  app.innerHTML = `
    <div class="forge-card forge-output">
      <div class="forge-step-eyebrow">Picked up where you left off ✦</div>
      <p class="forge-hint">Your last forged heroes are saved here.
        <button class="ghost" id="forge-new">Forge someone new</button></p>
      <div id="forge-result"></div>
    </div>
    <div class="forge-toast" id="forge-toast"></div>`;
  $('#forge-new').addEventListener('click', () => {
    try { localStorage.removeItem('cs-forge-last'); } catch (e) {}
    state.mode = null; state.people = []; state.personIdx = 0; state.qIdx = 0; render();
  });
  renderForgedVariations($('#forge-result'), data);
}
