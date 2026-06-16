# UX redesign: clarity pass

A clarity-focused redesign of the static site. The site had grown overwhelming:
a long essay as the home page, a wall of always-on generation buttons on every
card and beat, and unlabeled style toggles. A first-time visitor could not tell
what to do. This pass makes the front door obvious and quiets the busy pages
without removing any function.

Branch: `feat/ux-redesign` (do not merge). HTML / CSS / copy only, plus three
tiny JS additions that preserve every element-ID contract the app binds to.

---

## Information architecture: before and after

### Before

| Page | Role |
|---|---|
| `index.html` | The home WAS the thesis essay ("The party, not the PC.") — ~900 words of argument before any call to action. New visitors landed in the middle of a manifesto. |
| `characters.html` | 59-card grid. Each card showed an always-open note input + a solid-ink "Make image" button + a "Save" button. |
| `adventures.html` | Seven module blocks. Cover style toggle was three bare buttons (Module / Graphic Novel / Trend) with no label saying what they switched. |
| `beats.html` | Illustrated beats. Each beat showed a loud "Make image / Make video / Save card" row by default, plus an unlabeled art-style toggle. |
| `forge.html` | The Forge wizard (unchanged in function). |
| (none) | There was no About page; the essay had nowhere else to live. |

Nav (every page): Characters · Adventures · Beats · Forge · Schema · GitHub.

### After

| Page | Role |
|---|---|
| `index.html` | Short hero (one line on what this is) + three primary paths (Forge / Adventures / Characters) + an "Add your take to the story" invitation. Framed as a kind, funny story toy. |
| `about.html` | NEW. Holds the thesis essay verbatim (byte-identical move; it is Jeff-approved canon copy). Linked from nav and from the home. |
| `characters.html` | Same grid + filters, plus a one-line orientation under the hero and a calmer card affordance (see below). |
| `adventures.html` | Same modules, plus a one-line orientation and a "Cover style" label on the toggle. |
| `beats.html` | Same beats, plus a one-line orientation and an "Art style" label on the toggle; the generation row is tucked behind "Add your take". |
| `forge.html` | Unchanged in function; nav updated. |

Nav (every page, reordered to lead with the action paths and add About):
**Forge · Adventures · Characters · Beats · About · Schema · GitHub.**
Nav order is cosmetic only — `setNavActive()` matches by filename, not position.

---

## Front-page rationale

The old home asked the visitor to read an essay before doing anything. The new
home answers one question fast: *what is this, and what can I do here?*

1. **One-line hero.** Eyebrow "A kind, funny story toy" + headline "Real AI
   agents, statted as heroes." + a single lede sentence. The framing is
   empathy + entertainment ("built for empathy and a laugh, not for work"), so
   nobody mistakes it for a SaaS tool.
2. **Three primary paths**, as flat editorial cards in the site's existing
   hairline-border grid idiom (radius 0, no shadow, accent only as a hover
   hairline):
   - **Start a Forge** -> `/forge` (turn a real person you love into a hero)
   - **Explore Adventures** -> `/adventures`
   - **Explore Characters** -> `/characters`
3. **"Add your take to the story."** A concise two-way invitation explaining how
   anyone shapes custom characters / images / video:
   - **1 - Forge a new hero** (the Forge).
   - **2 - Mod what is here** (the "Add your take" controls on any card or beat:
     make art, render a clip, or drop a note to steer the next image).
   This names the two contribution paths plainly and keeps the empathy framing.

The essay is not gone — it moved to `/about` for the visitor who wants the
argument. The home now earns the click to it instead of forcing it.

---

## Reducing overwhelm without removing function

The biggest source of noise was the **maker controls** rendered on every card,
cover, and beat: an always-visible note input plus a solid-ink "Make image"
button (and "Make video" on beats). On a 59-card grid that is 59 shouting
buttons.

**Fix:** the shared `makerControls()` builder in `cardrender.js` now wraps its
note input + action row inside a native `<details class="cr-take">` disclosure
with a calm summary, **"Add your take"** (closed by default). The card reads
quietly; the generator UI appears on one click. This calms all four call sites
at once (character cards, adventure covers, beats, and the Forge result cards),
since they all route through this one builder.

The version pills (`.cr-versions` / "Default") stay visible outside the
disclosure — they are calm *results*, not noisy *generators*.

**Button treatment.** Maker buttons changed from solid-ink (the page's loudest
treatment) to a quiet mono outline that fills on hover — secondary, because the
primary action on every page is reading the card, not generating. While here,
the maker note input and buttons were brought to the project's radius standard
(buttons 2px, inputs ~0) — they had drifted to 8px.

**Style toggles clarified.** Both art-style toggles now lead with a small label
so a newcomer knows what the buttons switch: **"Cover style"** on adventures,
**"Art style"** on beats.

**Orientation lines.** Each busy page got one short serif sentence under its
hero telling a newcomer what they are looking at and that the controls are
optional.

Every interaction still works: Make image, Make video, Save, the note-to-steer
field, the version pills, the style toggles, the modal, comments, and the Forge
wizard.

---

## Files changed

| File | Change |
|---|---|
| `site/index.html` | Rewritten: hero + three primary paths + "Add your take" (was the essay). |
| `site/about.html` | **New.** The thesis essay, moved verbatim from the old home. |
| `site/characters.html` | Nav + About; one-line orientation under hero. |
| `site/adventures.html` | Nav + About; one-line orientation under hero. |
| `site/beats.html` | Nav + About; one-line orientation under hero. |
| `site/forge.html` | Nav reordered + About + Schema link added (was missing). |
| `site/assets/styles.css` | New `.home-*`, `.path-*`, `.take-*` front-page blocks; `.page-hero-help`; `.style-toggle-label`; `align-items:center` on `.adv-style-toggle`. Tokens only, no new hex. |
| `site/assets/cardrender.css` | Quiet/secondary maker buttons (2px radius, outline); `.cr-take` disclosure styling; `.cr-note` radius to 2px. |
| `site/assets/cardrender.js` | `makerControls()` wraps note + actions in `<details class="cr-take">` ("Add your take"). Returned node and `.cr-actions` nesting preserved. |
| `site/assets/app.js` | Prepend a "Cover style" label `<span class="style-toggle-label">` to the adventure cover toggle bar. |
| `site/assets/beats.js` | Prepend an "Art style" label `<span class="style-toggle-label">` to the beat style toggle bar. |
| `docs/UX-REDESIGN.md` | This document. |

No changes to `functions/`, `data/`, `site/cards/`, R2, the build, or the
content of any character/adventure/beat data.

---

## JS contracts preserved or updated

**Preserved (verified):**

- Element IDs the page scripts bind to are all still present, once each, on
  every page: `#nav-toggle`, `#nav-list`, `#char-grid`, `#count-display`,
  `#adventure-pills`, `#adventures-container`, `#beats-container`, `#forge-app`,
  plus `.page-eyebrow` and the modal (`#modal-overlay` / `#modal-container`).
- **Script include order** is unchanged on every page; `media.js` still loads
  before the page scripts (and before `cardrender.js` where present).
- **`beats.js` video-button selector.** `beats.js` finds the Make-video button
  via `bar.querySelectorAll('.cr-actions .cr-save-btn')[1]`, where `bar` is the
  node returned by `makerControls()`. The new `<details>` wrapper keeps
  `.cr-actions` as a descendant of that returned node and keeps the button order
  `[Make image, Make video, Save]`, so index `[1]` still resolves to Make video.
  Verified against the live DOM (10/10 beat makers nest correctly; button order
  confirmed).
- **Card click vs disclosure.** Character cards open a modal on click; the new
  `<summary>` calls `stopPropagation()` so toggling "Add your take" does not also
  open the modal. The note input and buttons already stopped propagation.
- **`setNavActive()`** matches nav links by filename, so reordering the nav and
  adding About is safe; About correctly highlights on `/about`.

**Updated (additive, no contract broken):**

- `makerControls()` (cardrender.js): output now nests note + actions inside
  `<details class="cr-take"><summary>…</summary><div class="cr-take-panel">…`.
  Same return value (`.cr-maker` node), same `.cr-note` and `.cr-save-btn`
  elements with identical handlers.
- `app.js` / `beats.js`: each prepends one label `<span>` to its style-toggle
  bar before the existing A/B/C button loop. The loop, `dataset.style`,
  `aria-pressed`, and click handlers are untouched.

---

## Verification

- `node --check` passes on `app.js`, `beats.js`, `cardrender.js`.
- Rendered every page in headless Chrome at 1200px and 390px:
  home (paths + "Add your take", stacks on mobile), characters (grid + filters +
  collapsed "Add your take"), adventures ("Cover style" label + module covers),
  beats ("Art style" label + collapsed maker), forge (wizard intact), about
  (essay intact).
- Functional (puppeteer-core): opened a card's "Add your take" disclosure and
  confirmed the note input + Make image button render and are present; clicked
  the mobile nav toggle and confirmed `.open` + `aria-expanded` flip. No script
  errors (only an expected R2 image 404 that falls back to a drawn canvas).
- About-page essay is byte-identical to the old home essay (verbatim canon).
- No em or en dashes in any new copy (project Rule 8). The verbatim About essay
  and pre-existing comments retain theirs.
