# DM Consistency Craft → Prompt Cues

> **Purpose.** Translate 50+ years of Dungeon-Master craft on *consistency and continuity*
> into concrete, reusable prompt cues + a metadata schema for the AI image/video pipeline in
> `agentic-character-sheets` (Veo 3.1 clips, Gemini stills, 5-9 frame swipe beats).
>
> **The problem we are solving.** The model re-invents environments, lighting, recurring
> characters, and mood between frames. A great DM keeps a world coherent across a 100-session
> campaign with a small set of disciplines. We steal those disciplines, the same way the
> project already steals the 5e character sheet for agent prompts.
>
> **What already exists in the consuming repo** (don't re-derive): a global
> `beats.json#style_preamble` (painterly/WotC house style), per-adventure aesthetic records
> at `site/data/style-c/<adventure>.json` (each with `preamble` + `rationale`), per-card
> `scene` prose + `caption`, recurring monsters across adventures (`data/adventures.json`),
> and **ring composition** (BEATS.md §9: the last card resolves the image the first card
> opened on). The fields proposed in §3 *extend* those records; they do not replace them.

---

## 0. The one-line thesis

A DM holds a world together with a **short, repeated, written-down "consistency bible"** that
threads one tone, one palette, a fixed set of locations, a recurring cast with hard
distinguishing features, and a planted-then-paid-off arc through *every* scene. We make that
bible **data** (§3), compress it to a **prepend block** (§4), and inject it into every frame's
prompt so Veo/Gemini render continuity instead of re-rolling it.

---

## 1. Techniques by dimension

Each technique: **principle** -> **who** (cited, fetched URL) -> **why it works**. Every entry
ends in a usable cue (collected in §2).

### 1.1 Environment / setting

- **Evocative name + exactly three sensory aspects.** Define a location as a named place plus
  three concrete sensory details ("Defiled Catacomb: oozing sarcophagus, wailing skulls, unholy
  circle"). Re-state the same three every time the place appears.
  *Who:* Mike Shea / Sly Flourish, "Location Moves" and the eight-steps "Fantastic Locations"
  step. https://slyflourish.com/location_moves.html , https://slyflourish.com/eight_steps_2023.html
  *Why it works:* three fixed aspects are small enough to repeat verbatim and specific enough to
  re-render the *same* place, not a new one. This is the single most directly portable DM
  technique for image continuity.

- **The strong start / establishing shot.** Open with one vivid, wide "something happens" scene
  that draws the audience out of the real world and fixes the sense of place before anything
  else. *Who:* Mike Shea, "Create a Strong Start" (eight steps).
  https://slyflourish.com/eight_steps_2023.html
  *Why it works:* the first frame sets the spatial + tonal anchor every later frame inherits;
  the repo already does this (every card 1 is a "wide establishing shot").

- **A consistent living world, with deliberate small change.** Keep the setting consistent, then
  introduce occasional changes the audience notices that are *not* caused by the protagonists, so
  the world feels alive rather than static. *Who:* WotC, 5e DMG guidance on world consistency (as
  summarized in community coverage). https://www.dndbeyond.com/forums/dungeons-dragons-discussion/dungeon-masters-only/91790-themes-for-a-campaign
  *Why it works:* fixed core + one moving element per beat = recognizable continuity *plus* a
  reason to keep swiping (and it matches BEATS.md's "make the capital ALIVE, move the camera
  every shot, the rot is the only still wrong thing").

### 1.2 Theme / tone

- **One-word theme, reinforced everywhere.** Name the campaign's core in a single word
  (*Isolation*, *Whimsy*, *Redemption*) and make "every strong start, every scene, every location,
  every NPC, every monster" reinforce it. *Who:* Mike Shea, "Reinforce the Theme of your D&D
  Campaign." https://slyflourish.com/reinforce_campaign_themes.html
  *Why it works:* a single tonal token, repeated, is what stops frame 4 drifting from heroic to
  generic. It is the tone analogue of the palette lock.

- **Tone is set at the table before play (session zero / house style).** Establish the visual and
  emotional register up front and keep returning to it. *Who:* the repo's own anchor doctrine is
  the cleanest exemplar: a default painterly "front door" plus a deliberate second anchor (World
  of Darkness "personal horror") with a named per-adventure look (`style-c/masquerade.json`:
  "Sanguine Gothic"). See BEATS.md §5, §7.
  *Why it works:* an explicit, named style record is reusable verbatim across every frame of an
  adventure; the repo already ships exactly this as `preamble`.

- **Motif repetition (the formula / type-scene).** Re-use a small set of recurring visual
  formulae rather than inventing new ones each beat. *Who:* grounded in oral-formulaic theory the
  project already cites (Parry-Lord type-scenes, Ong's patterned repetition; BEATS.md §6); the
  DM-craft expression is Shea's "reinforce the theme through every element."
  *Why it works:* a repeated motif (a recurring prop, color, silhouette) is the visual rhyme that
  reads as "same world" across frames.

### 1.3 NPCs (recurring cast)

- **One hard distinguishing feature + a body-language anchor.** Give each NPC a single memorable
  physical tell and a fixed mannerism; lead with body language ("steeple your fingers or drop your
  shoulders"). *Who:* Matt Mercer, via Sly Flourish's writeup of his NPC craft.
  https://slyflourish.com/mercer_bringing_npcs_to_life.html
  *Why it works:* one locked feature ("grey ponytail, oval glasses, plain robes; raises one empty
  open hand") is cheap to repeat in every prompt and is what makes a face recognizable frame to
  frame. The repo's cards already do this; the fix is to make the descriptor *mandatory and
  identical* every appearance.

- **Motivation + goal as the consistency root.** Anchor an NPC in what drives them and what they
  want in each scene; improvise the surface from that root. *Who:* Matt Mercer, GM Tips / NPC
  creation. https://criticalrole.fandom.com/wiki/Game_Master_Tips_with_Matt_Mercer ; corroborated
  https://slyflourish.com/mercer_bringing_npcs_to_life.html
  *Why it works:* a fixed motivation keeps an NPC's *behavior* (pose, expression, action) coherent
  even when the camera/angle changes.

- **Prep characters as reusable "toys," not scripts.** Build NPCs as discrete, ready elements
  (personalities, names, looks) you can drop into any scene. *Who:* Brennan Lee Mulligan,
  "I would rather have an NPC with a personality ready to go ... rather than plan my session
  rigidly." https://www.thegamer.com/brennan-lee-mulligan-dm-style-dimension-20-improv-planning/
  *Why it works:* a stable per-character descriptor block is exactly a reusable toy; inject the
  same block whenever that character is on stage.

### 1.4 Monsters

- **Signature silhouette, repeated.** Give the big bad a single instantly-readable silhouette and
  re-use it. *Who:* DM forum craft attributed to Colville-style villain presentation (the "figure
  clearly in charge ... a hint of who he is to keep the mystery going").
  https://www.dndbeyond.com/forums/dungeons-dragons-discussion/dungeon-masters-only/52428-villain-presentation
  *Why it works:* a locked silhouette ("colossal clockwork dragon of interlocking brass gears,
  spinning clock-eyes") survives lighting/style changes and reads as the *same* monster across
  beats and across adventures (the repo's monsters recur by design).

- **Show the villain being evil; build them before the showdown.** Have the villain appear early,
  do something clearly evil, and have heated exchanges before the finale to grow investment.
  *Who:* Matthew Colville, documented design digest. https://www.elvenacademy.org/test/ (corroborated:
  https://en.wikipedia.org/wiki/Matt_Colville for the "Running the Game" provenance).
  *Why it works:* an early, foreshadowed monster makes its later frames feel *paid off* rather than
  arbitrary; the dread is planted and escalates.

- **Escalation via a visible threat that grows.** Render the threat as something that mounts toward
  a culminating event. *Who:* John Harper, progress/danger clocks ("a circle divided into segments
  ... once completely filled, the represented threat manifests").
  https://bladesinthedark.com/progress-clocks
  *Why it works:* mapping beat-index to a visible escalation cue (bloom thicker, fire lower, sand
  nearer empty) makes the arc legible inside the images themselves.

### 1.5 Timeline / continuity

- **Secrets and clues: planted-and-paid-off, tweet-sized.** Keep ~10 short ("one to two
  sentences"), location-independent facts that surface across sessions and tie locations, NPCs, and
  villain plans together. *Who:* Mike Shea, "Secrets and Clues."
  https://slyflourish.com/sharing_secrets.html ; https://slyflourish.com/secrets_serve_you.html
  *Why it works:* a per-beat list of "callbacks" is the data form of a planted clue; re-rendering an
  earlier prop/figure is a visual payoff that stitches the timeline.

- **The clock as a continuity spine (Chekhov's gun).** A countdown that "tells the GM what will
  happen if the thing proceeds unchecked" gives a story a forward timeline and guarantees an earlier
  element returns. *Who:* John Harper. https://bladesinthedark.com/progress-clocks
  *Why it works:* a `time_marker` per beat ("turn three" -> "turn forty" -> "dawn") is a literal,
  cheap timeline token; the repo already writes these into captions ("turn three", "turn nine",
  "turn thirteen").

- **Ring composition (close where you opened).** End on the image you began with, transformed.
  *Who:* the project's own canon (BEATS.md §9, grounded in Mary Douglas / oral tradition).
  *Why it works:* an explicit "callback to card 1" field forces the closing frame to reuse the
  opening anchor, which is the strongest possible continuity signal in a short sequence.

### 1.6 Arc structure

- **Strong start -> rising scenes -> earned payoff.** Open hard, list flexible scenes, escalate,
  resolve. *Who:* Mike Shea, the eight steps (strong start + outline potential scenes).
  https://slyflourish.com/eight_steps_2023.html
  *Why it works:* a per-beat `arc_position` lets the prompt dial composition/energy to the slot
  (establishing -> complication -> climax -> resolution), so tension actually rises across frames.

- **Players play chaos, the DM plays it straight (the engine).** Comedy/tension lives in the gap
  between the committed chaotic figure (rendered in motion, diagonal, mid-leap) and the still,
  centered straight man. *Who:* the project's own engine (BEATS.md §2), itself grounded in Bergson's
  *mechanical inelasticity*.
  *Why it works:* encoding "who is chaos / who is the straight man" as composition cues keeps the
  visual joke consistent and the framing intentional rather than random.

- **Failing forward / progress at a cost.** Prefer escalating complications over flat pass/fail.
  *Who:* Matthew Colville, design digest. https://www.elvenacademy.org/test/
  *Why it works:* each mid-arc beat should raise stakes (a cost paid, a complication added), which
  is what "escalating" looks like frame to frame.

---

## 2. Translation table: technique -> prompt cue

Short, model-friendly phrasings to prepend or append. `{...}` = data slots from §3.

| Dimension | Technique | Reusable prompt cue (literal text to inject) |
|---|---|---|
| Environment | Name + 3 aspects | `Location: {setting_name}, {aspect_1}, {aspect_2}, {aspect_3}. Re-render this exact place; do not invent new architecture.` |
| Environment | Establishing anchor | `Establishing anchor (every frame must obey): {establishing_anchor}.` e.g. `a fiery dwarven forge-dungeon, anvils are glowing slabs of code, a giant hourglass burning low in the corner` |
| Environment | Lighting/palette lock | `Lighting + palette LOCK: {palette}. Keep this exact color key and light direction across all frames.` e.g. `molten orange key light, deep forge-shadow, ember sparks` |
| Environment | Living world + one change | `World is alive (crowds/banners/motion); the only still, wrong thing is {moving_element}.` |
| Theme/tone | One-word theme | `Tone throughline: {tone[]} (e.g. heroic, ominous, deadpan-comedic). Every frame reads this register.` |
| Theme/tone | Named house style | `Style: {style_preamble} // {adventure_preamble}.` (already in repo: global `style_preamble` + `style-c` `preamble`) |
| Theme/tone | Motif repetition | `Recurring visual motifs (repeat at least one per frame): {recurring_motifs[]}.` e.g. `glowing code-runes, brass gears, an hourglass` |
| NPC | Locked feature + mannerism | `{character}: {locked_descriptor}; signature action: {mannerism}.` e.g. `Ponytail, serene grey-ponytailed monk, oval glasses, plain robes; raises one empty open hand` |
| NPC | Recurring cast lock | `Returning cast (keep identical to prior frames): {recurring_cast[]}.` |
| Monster | Signature silhouette | `Antagonist silhouette (do not redesign): {bigbad_silhouette}.` e.g. `colossal clockwork dragon, interlocking brass gears, spinning clock-eyes` |
| Monster | Foreshadow the big bad | `Foreshadow: {bigbad_foreshadow} visible/implied at the edge of frame.` e.g. `a faint paperclip-tide silhouette in the far smoke` |
| Monster | Visible escalation | `Escalation state at this beat: {escalation_cue}.` e.g. `the orange bloom is thicker and pulses brighter than the previous frame` |
| Timeline | Time marker | `Time marker: {time_marker}.` e.g. `turn three` / `turn forty, the session has run long` |
| Timeline | Callback / payoff | `Callback (reuse from earlier frame): {callbacks[]}.` e.g. `the same dog-eared test-scroll from card 2, now flaking to ash` |
| Timeline | Ring close | `This is the closing frame: resolve the opening image ({establishing_anchor}), transformed by the outcome.` |
| Arc | Arc position | `Arc position: {arc_position}, compose for it (establishing=wide+calm; complication=tense; climax=peak energy+contrast; resolution=settled).` |
| Arc | Chaos vs straight man | `Composition: chaos figure ({chaos_actor}) in motion, diagonal, mid-leap; straight man ({straight_actor}) still, centered, flat-faced. They do not acknowledge each other.` |

**Generic adjective sets** (pick a tone row, inject as `tone[]`):

- Heroic/painterly: `warm, ornate, semi-realistic, dramatic lighting, dignified`
- Personal-horror (WoD): `seductive, damned, intimate dread, chiaroscuro, blood-red and shadow`
- Telecast/spectacle: `over-produced, saturated, broadcast-bright, triumphant, slightly absurd`
- Glitch/uncanny: `creeping, datamoshed, chromatic-aberrant, system-crash, wrong-pixel`

---

## 3. Suggested metadata schema (data-driven cues)

Two tiers, matching the repo's existing files. **Per-adventure** continuity fields slot into the
existing `site/data/style-c/<adventure>.json` records (they already hold `adventure`, `name`,
`rationale`, `preamble`, the natural home for the visual bible). **Per-beat** and **per-card**
fields slot into `site/data/beats.json`. Field names are kebab/snake to match existing JSON
(`style_preamble`, `video_note`).

### 3.1 Per-adventure (extend `site/data/style-c/<adventure>.json`)

```jsonc
{
  // --- existing fields (keep) ---
  "adventure": "forge",
  "name": "Terminal Brutalism",                 // named house style for this region
  "rationale": "...",
  "preamble": "...",                            // the long style string already injected

  // --- NEW continuity bible fields ---
  "setting": "a fiery dwarven forge-dungeon",   // the place, one phrase
  "setting_aspects": [                          // Shea's 3 fixed sensory aspects (repeat verbatim)
    "anvils are glowing slabs of code",
    "molten channels of light run through black stone",
    "a giant hourglass of sand burns low in the corner"
  ],
  "establishing_anchor": "wide shot of the forge-dungeon, anvils as glowing code-slabs, the deadline hourglass burning low",
  "palette": "molten orange key light, deep forge-shadow, ember-spark highlights, brass and black",
  "tone": ["heroic", "tense", "deadpan-comedic"],          // one-to-three tonal tokens
  "recurring_motifs": ["glowing code-runes", "brass gears", "the burning hourglass", "a single calm green CI-rune"],
  "recurring_props": ["the deadline hourglass", "the central anvil", "the red push-lever"],
  "recurring_cast": [                           // locked descriptor per returning figure
    { "id": "ponytail", "locked_descriptor": "serene grey-ponytailed monk, oval glasses, plain robes",
      "mannerism": "raises one empty open hand; a calm pale glow ripples out" }
  ],
  "bigbad_silhouette": "the Confabulator, a smiling figure woven from too-perfect false detail",
  "bigbad_foreshadow": "a faint over-ornate false-citation glow at the edge of frame",
  "moving_element": "the hourglass sand (the only thing that should change between frames)",
  "ring": "open and close on the central anvil"  // what the first and last card share
}
```

### 3.2 Per-beat + per-card (extend `site/data/beats.json`)

```jsonc
{
  "id": "forge",
  "title": "The Untested Push",
  "adventure": "The Forge of Endless Diffs",
  "archetype": "...", "moral": "...", "event": "...",   // existing
  "caption": "...",                                      // existing

  // --- NEW beat-level arc fields ---
  "escalation": "danger",            // none | tension | danger | climax (the clock kind)
  "chaos_actor": "Riff the Reckless / Abstraxus the Overbuilder",
  "straight_actor": "Ponytail",

  "cards": [
    {
      "caption": "...",                                  // existing
      "scene": "...",                                    // existing prose

      // --- NEW per-card continuity fields ---
      "arc_position": "establishing",   // establishing | complication | escalation | climax | resolution
      "time_marker": "the deadline burns low",
      "callbacks": [],                                   // ids/phrases reused from earlier cards
      "escalation_cue": "hourglass full",                // the visible state of the clock this frame
      "active_cast": ["ponytail"],                       // who must keep their locked descriptor here
      "is_ring_close": false                             // true on the final card -> reuse establishing_anchor
    }
    // ... card 5: { "arc_position": "resolution", "callbacks": ["the red push-lever, now dark"], "escalation_cue": "hourglass sand stopped", "is_ring_close": true }
  ]
}
```

**Why this split:** the per-adventure record is written *once* and injected into *every* frame of
that adventure (the bible); the per-beat/per-card fields carry only what changes (time, callbacks,
escalation state, arc slot). That is exactly the DM split: a fixed world + a moving clock.

---

## 4. The "consistency bible" prepend block (template)

The condensed block to prepend to **every** frame's prompt for an adventure. Built purely from the
§3.1 fields. Target a few hundred characters; trim aspects/motifs to fit a prompt budget.

**Template:**

```
[WORLD] {setting}, {setting_aspects joined by ", "}. Establishing anchor: {establishing_anchor}.
[LOOK] {palette}. Style: {name}. Tone: {tone joined}. Recurring motifs (show >=1): {recurring_motifs}.
[CAST] Keep identical across frames: {recurring_cast as "name (descriptor)"}.
[THREAT] Antagonist silhouette: {bigbad_silhouette}; foreshadow {bigbad_foreshadow}.
[RULE] Re-render this exact place, palette, and cast; only {moving_element} changes between frames.
```

**Worked example: The Forge of Endless Diffs** (real adventure, `id: forge`):

```
[WORLD] A fiery dwarven forge-dungeon, anvils are glowing slabs of code, molten channels of light
run through black stone, a giant hourglass of sand burns low in the corner. Establishing anchor:
wide shot of the forge, anvils as glowing code-slabs, the deadline hourglass burning low.
[LOOK] Molten orange key light, deep forge-shadow, ember-spark highlights, brass and black.
Style: painterly WotC/Critical Role house style. Tone: heroic, tense, deadpan-comedic. Recurring
motifs (show >=1): glowing code-runes, brass gears, the burning hourglass.
[CAST] Keep identical across frames: Ponytail (serene grey-ponytailed monk, oval glasses, plain
robes, raises one empty open hand).
[THREAT] Antagonist silhouette: the Confabulator, a smiling figure woven from too-perfect false
detail; foreshadow a faint over-ornate false-citation glow at frame's edge.
[RULE] Re-render this exact place, palette, and cast; only the hourglass sand changes between frames.
```

Then per frame, append the small moving set:

```
[FRAME] Arc: {arc_position}. Time: {time_marker}. Escalation: {escalation_cue}.
Callbacks (reuse): {callbacks}. {if is_ring_close: "Closing frame: resolve the opening image, transformed."}
+ the card's own {scene} prose.
```

---

## 5. Sourcing notes / honest limits

- **Verified, fetched primary-ish sources:** Sly Flourish (Mike Shea) articles
  ([secrets](https://slyflourish.com/sharing_secrets.html),
  [secrets serve you](https://slyflourish.com/secrets_serve_you.html),
  [eight steps](https://slyflourish.com/eight_steps_2023.html),
  [location moves](https://slyflourish.com/location_moves.html),
  [reinforce theme](https://slyflourish.com/reinforce_campaign_themes.html),
  [Mercer NPCs](https://slyflourish.com/mercer_bringing_npcs_to_life.html));
  [John Harper, Blades in the Dark, Progress Clocks](https://bladesinthedark.com/progress-clocks);
  [Brennan Lee Mulligan via TheGamer](https://www.thegamer.com/brennan-lee-mulligan-dm-style-dimension-20-improv-planning/);
  [Matthew Colville design digest](https://www.elvenacademy.org/test/) and
  [Wikipedia: Matt Colville](https://en.wikipedia.org/wiki/Matt_Colville) for provenance;
  [Critical Role Wiki: GM Tips with Matt Mercer](https://criticalrole.fandom.com/wiki/Game_Master_Tips_with_Matt_Mercer).
- **Attribution caveats (stated, not invented):**
  - The Mercer "steeple your fingers / drop your shoulders" body-language line and the "big Word
    document" come via Sly Flourish's writeup of Mercer's craft, not a direct Mercer transcript
    fetched here. The *principle* (one locked feature + a mannerism) is well attested; treat the
    exact wording as Shea-reported.
  - **Matt Colville's "Running the Game" videos were not transcribed here.** The villain points
    ("early appearance where he beats and humiliates the party," "heated exchanges before the final
    showdown," "show what evil the villain can do") are quoted from the Game Design Digest summary
    of his work (elvenacademy.org), and the silhouette/"hint of who he is to keep the mystery going"
    phrasing is from a D&D Beyond forum thread that *cites* Colville but does not transcribe him.
    The techniques are sound and widely repeated; the precise sourcing is secondary, flagged here so
    it can be upgraded to a direct video citation later.
  - **Brennan Lee Mulligan: the phrase "the world is a character" was not verified** in a primary
    source. What is verified is his "80% improv, 20% planning," the "toys you dump out" worldbuilding
    analogy, and "I would rather have an NPC with a personality ready to go ... rather than plan my
    session rigidly" (TheGamer). Used those; dropped the unverified phrase.
  - WotC DMG world-consistency guidance is cited via community summary (D&D Beyond forum), not the
    DMG text directly.
- **Aabria Iyengar:** no specific, citable consistency-craft article was located in this pass; her
  technique is folded under the general improv-on-a-prepped-foundation principle (shared with BLM)
  rather than attributed to a fabricated source.

---

## 6. Drop-in checklist for the pipeline

1. Add the §3.1 continuity fields to each `site/data/style-c/<adventure>.json`.
2. Add the §3.2 arc/time/callback fields to `site/data/beats.json` cards.
3. Build the §4 bible block from §3.1 and prepend it to every frame's prompt (after the existing
   `style_preamble`).
4. Append the small per-frame moving set (arc position, time marker, escalation cue, callbacks,
   ring-close flag).
5. Verify continuity the DM way: do frames share the establishing anchor, palette, and cast? Does
   the last frame close the ring? Does the escalation cue actually escalate frame to frame?
