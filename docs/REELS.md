# REELS — the beats-to-video shot & style bible

How a beat becomes a short-form reel that people watch to the end and that funnels
them to the long-form saga (the written notes, the card decks, the module pages).

This is the missing layer between `BEATS.md` (how a story chapter is built) and the
render tools (`local/tools/generate-videos.mjs`, `local/tools/beat-video.mjs`, and the
site's `/api/video` path in `site/assets/cardrender.js`). BEATS.md governs the *still*
cards; this governs the *motion*.

---

## 0. The one-line thesis

**Keep the drawing sacred; move only the camera, the environment, and the type.**

The uncanny valley punishes "almost real." A proudly-illustrated saga that moves like a
moody motion comic never enters the valley, because artificiality is part of the form. Our
whole aesthetic (Pillars of Eternity / Critical Role / WoD ink) is already the fix. The job
of the video layer is to *not undo it.*

---

## 0.5. Calibration exemplars (Jeff's reference reels — these override generic research)

Two reels Jeff flagged as the target, plus one structural signal. Grammar to *borrow*,
never IP to clone: our output uses **our own roster only** (no Star Wars / Muppets / Messi
assets or likenesses).

- **Comedy exemplar** (@ickletoonies2, "Eddie Izzard, Death Star canteen", 6.5K shares):
  stylized plastic stop-motion figures lip-synced to a proven standup audio bit. Lesson: the
  **AUDIO carries the comedy**; the animation just visualizes the gag. Fully plastic figures =
  zero uncanny valley. One mundane exchange in a menacing setting, played deadpan.
- **Anime exemplar** (@ai.primes / @worldcuptimes, provoked-hero power-up, 16.4K shares):
  DBZ-grammar escalation (**provocation → warning → power-up → masterclass → climax**)
  compressed into a reel; anime stylization makes the AI render an *aesthetic*, not a defect;
  hooked on a current event + a recognizable figure.
- **Episodic signal** (@cult.of.vision "FLUFF FICTION"): numbered episodes + a strong caption
  voice + a comment-bait question = serial follow-through, 16.5K shares.

**Five rules extracted (these lead the bible):**
1. **Never photoreal humans.** Commit to a stylized *register* where AI artifacts read as
   style, not error (see §2.5). Our painterly-but-semi-real faces are the *risk*; the register
   choice is the fix.
2. **Audio-first for comedy/narration.** A written VO bit or a two-hander of proven-quality
   lines is the *spine*; the video illustrates it. (This overrides the generic "silent-first,
   skip the VO" reel advice, for comedic and narrated beats. See revised §4.)
3. **One escalation arc per reel**, with the *provocation in the first 1.5s* (§4).
4. **Episodic branding**: "Chapter N of <Adventure>" + a caption voice + a comment-bait
   question + the CTA to the long-form saga.
5. **Our hook substitute for celebrity/IP** is the *recognizable agentic-AI archetype*: the
   over-builder, the vibe-coder who force-pushes at 3am, the agent you gave a goal and walked
   away from. People know these from their own tool use; that recognition is the hook.

---

## 1. Why the old output read as slop (the diagnosis)

The pipeline's core instinct was right: image-to-video from a locked painted keyframe. But
five things dragged it back into the valley.

1. **The video prompt re-rendered the scene.** The shipped `videoPrompt` re-injected the
   full style preamble + the whole `scene` prose + "bring it to life with motion." Naming
   people and objects to a video model makes it *redesign* them frame-to-frame. On a
   semi-real painted face that means morphing features, dead tracking eyes, and drift —
   the exact valley. Fix: the keyframe already carries 100% of the content; the prompt must
   be **motion-only** and must **forbid re-rendering.**
2. **Too much "life."** "Slow drift, parallax, living light, drifting elements" stacked
   several motions at once. Stacked motion is the #1 cause of warping. Fix: **one camera
   move + one subtle environmental motion, per clip. Nothing else.**
3. **No negative prompt.** Nothing banned facial morphing, lip movement, added people, or a
   push toward photoreal skin. Fix: a hard, shared **negative clause** on every clip.
4. **No hook.** Every beat opened on a slow WIDE establishing shot — the worst possible
   first 1.5 seconds for a reel. Fix: a **cold-open** flash of the climax frame + a text
   hook on frame one; the establishing shot becomes a *breath*, not the opener.
5. **Wrong audio + pacing for the format.** A slow documentary voiceover over a 20–36s
   uniform-drift cut fights the silent-first, fast-cut reel format and adds a TTS tell.
   Fix: **silent-first with kinetic captions**, tighter and variable clip lengths, a
   seamless loop, and a keyword-comment CTA that funnels to long-form.

The frame-cue machinery (`arc_position`, `escalation_cue`, `is_ring_close`) was also **dead
code** — the builders read those fields but no card ever set them. This bible defines the
data that makes them live.

---

## 2. Recommended creative direction (proposal — not a unilateral brand change)

> **Recommendation for Jeff's sign-off, not a done deal.** This keeps the existing painterly
> brand and does *not* invent new visual flourishes; it changes only how the stills MOVE.

- **Direction: "motion comic."** The painted card is a static panel. Motion comes from the
  camera (a single named film move) and discrete environmental FX layers (embers, mist,
  cloth/hair sway, flicker, a scanline crawl for the glitch beats) — never from "animating"
  a face. Deliberate, low, limited-animation motion reads as *craft*, not defect.
- **Lean into 2.5D parallax where a beat has clear depth** (foreground figure vs deep
  background): push the camera *through* the plane instead of re-rendering pixels. Zero
  morph risk. (After Effects layer-split, or a parallax tool, then composite.)
- **Faces do almost nothing.** At most one natural blink, or none. Never lip-sync our
  characters. Move the world around the face, not the face.
- **The glitch / non-human beats are our safest** (echoes/Sydney's porcelain-mask datamosh,
  the clockwork dragon, the paperclip tide). Non-human subjects and stylized decay dodge the
  valley entirely — favor them for the lead posts.

### 2.5 Registers (the committed stylized looks — proposal for Jeff's sign-off)

A *register* is the non-photoreal visual language a beat commits to, head to toe. Picking one
per beat is rule #1 from the exemplars. Three, matched to the material. (Painterly stays the
default brand for the still card decks; these are the **video/reel** registers, and adding
them to the image `STYLE_PROMPT` system is a brand extension that needs Jeff's OK, so they are
proposed here as `reel.register` data, not yet wired into the style enum.)

| Register | Looks like | Best for | Anti-uncanny because |
|---|---|---|---|
| **A. Painterly** (current) | POE / Critical Role paint | atmospheric / dread beats (echoes) | keep faces still; move world + type |
| **B. Tabletop-miniature / stop-motion** | painted resin D&D minis on a lit diorama board, shallow macro, tiny scale | **deadpan comedy** (forge) | plastic figures = zero uncanny valley; *and* it literally is "character sheets" made flesh |
| **C. Anime action** | cel-shaded shonen, ink lines, speed-lines, aura FX, hard light | **power-up / escalation** beats (labyrinth, proving-grounds) | anime rendering is an aesthetic; morphing reads as "energy," not error |

The **miniature register is a gift for this project specifically**: the whole thesis is "your
prompt is a character sheet," so rendering the cast as literal painted tabletop miniatures on a
diorama is on-brand *and* the safest possible anti-slop move. Favor it for the comedy beats.

**The register governs the KEYFRAME image, not just the motion.** For an in-register reel the
still cards must be generated with the register preamble below (via `generate-beats.mjs`), then
the motion-only prompt animates that still. Ready-to-use image preambles (drop into
`STYLE_PROMPT` once Jeff approves the extension; until then paste manually into the still
render):

- **miniature:** `Photograph of a painted tabletop RPG miniatures diorama on a lit gaming board: hand-painted resin figures at ~32mm scale, visible brushwork and matte primer, shallow macro depth of field, warm practical lighting, tiny sculpted terrain. Charming, tactile, deliberately toy-like (zero photoreal humans). 9:16.`
- **anime:** `Hyper-stylized cel-shaded anime action still, shonen "battle-manga" grade: bold ink linework, flat cel shading, dramatic speed-lines and impact frames, glowing aura and energy FX, hard rim light, high-contrast dynamic composition. Anime, not photoreal. 9:16.`
- **painterly:** the existing `style_preamble` (default brand).

### Model direction (needs a key decision from Jeff — flagged, not actioned)

Current default is `veo-3.1-fast` via `/api/video`. Veo is a photoreal engine; it preserves
illustration the *least* of the current field. Options, cheapest-preserving first:

| Need | 2026 pick | Why |
|---|---|---|
| Preserve a painted still + light motion | **Midjourney V1 Video** or **WAN 2.7** | built to keep the illustration looking illustrated through motion |
| Stylized motion with real camera control | **Kling 3.x** | granular camera paths, cel-shaded-friendly, cheapest/clip |
| Reference-locked character across an episode | **Seedance 2.0** | tag + bind references |
| Staying on Veo | keep `veo-3.1-fast`, **clamp motion hard** | works if we forbid re-render and keep moves tiny (this bible does that) |

The prompt discipline in §3–§4 is model-agnostic and makes even Veo behave; switching models
is an upside, not a prerequisite. Any model swap needs a new API key + a cost cap → Jeff.

---

## 3. The per-clip prompt contract (image-to-video)

The keyframe is the source of truth. The prompt is **motion, and prohibitions, only.**

```
Animate this exact image. Do not re-render or redesign anything.
Camera: <ONE named move from card.camera>.
Motion: <ONE subtle environmental motion from card.motion>.
Preserve the exact composition, every character, face, object, linework, and color palette.
No on-screen text or captions.
NEGATIVE: <the shared negative clause>
```

**Named camera moves** (use these words; they translate across Veo/Kling/Runway/WAN):
`slow push-in` · `slow pull-back` · `pan left` / `pan right` · `dolly forward` ·
`orbit slowly` · `crane up` / `tilt up` · `lateral track` · `locked-off` (no move) ·
`rack focus` · `2.5D parallax push`.

**Shared negative clause** (baked into the builder as `VIDEO_NEGATIVE`):
`no face morphing, no facial warping, no re-rendering, no redesign, no style drift,
no added or removed characters, no outfit changes, no lip movement, no talking,
no photoreal skin, no plastic sheen, no fast motion, no scene change, no on-screen text,
no watermark`.

**Rules:** one camera move + one environmental motion, nothing more · small motions beat big
ones · name a light source in `card.motion` (it stabilizes shadows) · never name the
characters again in the video prompt (that invites redesign).

---

## 4. Reel assembly (the beat becomes a 7–15s vertical)

- **Aspect / size:** 9:16, 1080×1920. Always.
- **Length:** target **8–15s** for max reach and loop; a 9-card epic (borderlands) can run
  ~20s as a "follow for the lore" capstone, not a first-touch.
- **One escalation arc, provocation first (first 1.5s):** every reel is a single arc, not a
  slideshow. Borrow the DBZ grammar where it fits: **provocation → warning → power-up →
  masterclass → climax → (our) reversal/moral.** Put the *provocation* on frame one (the
  vibe-coder reaching for the push-lever; the human walking away from the goal). The
  `reel.cold_open` climax-flash + `reel.hook_text` sits over that provocation.
- **Pattern-interrupt ~every 3s:** each card cut is already an interrupt; keep clips short
  (2–3.5s), and make the climax cut hard and fast. Ruthlessly trim dead air.
- **Kinetic captions (always on, for mute viewers):** 2–4 word chunks held ~600–900ms, not a
  full banner and not a 240-wpm word-flicker. Even with audio-first beats, captions mirror the
  spine so it reads on silent autoplay. Derive chunks from each card's `caption`.
- **Audio — pick the mode per beat (`reel.audio`):**
  - **`audio-first`** (comedy, narration): a *written VO bit* or two-hander is the **spine**;
    the video illustrates it (the Eddie Izzard model). The lines must be genuinely funny /
    well-written proven-quality copy, delivered by an expressive voice (ElevenLabs George, or a
    two-voice read for a dialogue beat), over a light bed. This is NOT the old generic
    documentary-TTS drone; the comedy or the story lives in the words. Use for **forge** and
    any dialogue/monologue beat.
  - **`silent-first`** (atmosphere, dread): kinetic captions + a short instrumental bed (mood
    from `bible.tone`), no VO. Use for **echoes** and mood beats.
  - **`anime`**: minimal or no VO; a driving music bed + impact SFX on the power-up/climax
    cuts; captions carry the taunts and the moral. Use for **labyrinth** and escalation beats.
- **Seamless loop:** the last frame should flow back into the cold-open (ring composition
  already gives us this — the ring close *is* the loop).
- **Episodic branding + comment-bait CTA (no reach-killing link in-frame):** brand every reel
  as **"Chapter N of <Adventure>"** (`reel.chapter`) in a consistent caption voice (the deadpan
  DM register), end on the cliffhanger, then a **comment-bait question** + a keyword CTA
  (`reel.cta` → "Comment FORGE and I'll send you the full chapter. Which one are you: the
  vibe-coder, the over-builder, or the warden?"). The question drives comments (the algorithm's
  favorite signal) *and* the keyword funnels to the long-form page. Link lives in bio / pinned
  comment / auto-DM, never burned into the video. Numbered episodes + caption voice = serial
  follow-through (the FLUFF FICTION signal).

---

## 5. The data (what a beat needs for a good reel)

Optional fields on `site/data/beats.json`. Absent = the builder falls back to safe defaults,
so un-enriched beats still render (just less sharp). See the pilot beat `echoes` for a fully
worked example, and `beats.json` top-level `video_negative` + `reel_defaults`.

Per **card**:
- `camera` — ONE named move (§3 list).
- `motion` — ONE subtle environmental motion, name a light source.
- `is_ring_close` — `true` on the final card (loop + ring-resolve cue).

Per **beat**, a `reel` block:
- `register` — `painterly` | `miniature` | `anime` (§2.5): the committed stylized look.
- `audio` — `audio-first` | `silent-first` | `anime` (§4): which audio mode drives the cut.
- `voiceover` — for `audio-first`: the written VO bit / two-hander lines (the comedy or
  narration spine). Proven-quality copy, not generic. This is the script the render reads.
- `arc` — optional labels mapping cards to the escalation grammar (provocation, warning,
  power-up, masterclass, climax, reversal) so the pacing knows where the hard cut lands.
- `hook_text` — the silent-scroll text hook for frame one (short, a tease of the payoff).
- `cold_open` — card index whose climax frame flashes first (usually the loudest card).
- `chapter` — episodic label, e.g. "Chapter 1 of the Forge of Endless Diffs".
- `cta` — the comment-bait question + keyword line that funnels to long-form.
- `durations` — optional per-card seconds (else the builder uses a punchy default curve).

---

## 6. Before/after comparison plan (how we prove it worked)

Renders are **pending Jeff** (Veo needs `GEMINI_API_KEY`; a model swap needs a new key + a
cost cap). Three pilots are fully specced in `beats.json`, one per register / exemplar:

- **`forge`** → miniature register, audio-first comedy (answers the Eddie Izzard exemplar).
- **`labyrinth`** → anime register, DBZ power-up escalation (answers the anime exemplar).
- **`echoes`** → painterly/glitch, silent-first dread (the original pilot).

**Keyframe step first (important):** for the miniature and anime pilots the *still* cards must
be re-generated in-register (§2.5 preambles) before the motion pass. The existing forge/
labyrinth PNGs are painterly and won't carry the register look; the motion prompt only preserves
whatever the keyframe already is.

When a key + cap are set, run the A/B (start with `forge`, the clearest exemplar answer):

1. **Baseline (old):** `git stash` the builder change, render `echoes` with the old
   `videoPrompt`, stitch with the old `beat-video.mjs`. Save as `echoes-BEFORE.mp4`.
2. **New:** restore the change, render `echoes` with the new motion-only + negative builder
   and the enriched card `camera`/`motion`, stitch with cold-open + kinetic captions + loop.
   Save as `echoes-AFTER.mp4`.
3. **Cost cap for the A/B:** ~$0.13–2.50/clip × 5 cards × 2 versions ≈ **$1.30–$25**. Confirm
   the cap and the model with Jeff before the fan-out. Pilot ONE card each way first.
4. **Score, don't vibe.** Watch both on a phone, muted, in a real feed. Rubric:
   - Faces: any morph/drift/dead-eyes? (old: expected yes; new: should be none)
   - First 1.5s: does it grab before the thumb moves?
   - Watch-to-end + does it loop cleanly?
   - Does the ending make you want the long-form? (the CTA landing)
5. **If Veo still morphs on the new prompt,** that's the signal to spend the key on Midjourney
   V1 / WAN 2.7 / Kling for the illustration-preserving path (§2).

---

## 7. Quick reference — the whole pipeline

```
BEAT (beats.json: bible + cards + reel)
  → generate-beats.mjs        → still keyframe PNGs per card  (Nano Banana Pro, text-correct)
  → generate-videos.mjs       → per-card i2v clip  (motion-only prompt + VIDEO_NEGATIVE)  → R2
  → beat-video.mjs            → cold-open + stitch + kinetic captions + loop + CTA           → R2
  → post as a 9:16 reel; keyword-comment CTA funnels to the long-form saga page
```
</content>
