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

  // Inline card(s). Images are generated only when you click Make image (no auto).
  if (window.CardRender) {
    const gallery = document.createElement('div');
    gallery.className = 'forge-gallery';
    state.people.forEach((p) => {
      const ch = liteChar(p);
      const item = document.createElement('div');
      item.className = 'forge-card-item';
      let cv = window.CardRender.characterCanvas(ch);
      cv.className = 'forge-card-img';
      item.appendChild(cv);

      function portraitPrompt(note) {
        const great = a(p, 'great'), others = a(p, 'others');
        return window.CardRender.stylePrompt.painterly +
          'Heroic, warm fantasy character portrait of ' + (ch.name || 'a hero') +
          (great ? ', who is great at ' + great : '') + (others ? '. ' + others : '') +
          '. Single dignified figure, friendly, no text, no words.' + (note ? ' Art-director note: ' + note : '');
      }
      const saveBtn = window.CardRender.saveButton('⬇ Save card', () => cv, (ch.id || 'hero') + '.png');
      const bar = window.CardRender.makerControls({
        placeholder: 'Note to steer ' + (ch.name || 'this hero') + '’s portrait (optional)…',
        buttons: [{
          label: '🖼 Make image', busy: '🖼 making…', done: '🖼 Remake image', fail: 'image not enabled',
          run: (note) => window.CardRender.fetchArt(portraitPrompt(note)).then((img) => {
            if (!img) return false;
            const ncv = window.CardRender.characterCanvas(ch, img);
            ncv.className = 'forge-card-img';
            cv.replaceWith(ncv); cv = ncv;
            return true;
          }),
        }],
        extra: [saveBtn],
      });
      item.appendChild(bar);
      gallery.appendChild(item);
    });
    const resultEl = $('#forge-result');
    const tog = document.createElement('div');
    tog.className = 'forge-actions';
    tog.appendChild(window.CardRender.providerToggle());
    resultEl.parentNode.insertBefore(tog, resultEl);
    resultEl.parentNode.insertBefore(gallery, resultEl);
  }
}

async function generateHere(prompt) {
  const out = $('#forge-result');
  out.innerHTML = `<p class="forge-busy">Forging… this takes a few seconds.</p>`;
  try {
    const res = await fetch('./api/forge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const text = (data && (data.text || data.result)) || JSON.stringify(data, null, 2);
    out.innerHTML = `<div class="forge-result">${esc(text)}</div>`;
    toast('Forged ✦');
  } catch (e) {
    out.innerHTML = `<div class="forge-gentle">One-click generation isn't switched on for this site yet.
      No problem — tap <b>Copy the prompt</b> and paste it into Claude. (To enable one-click, the owner
      adds an <code>ANTHROPIC_API_KEY</code> secret in Cloudflare Pages — see the function at
      <code>functions/api/forge.ts</code>.)</div>`;
  }
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

document.addEventListener('DOMContentLoaded', () => { initHamburger(); render(); });
