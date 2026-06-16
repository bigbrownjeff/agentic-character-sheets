# Stat Everything → Cross-Media Schema

> **Purpose.** D&D didn't only stat *characters*. It statted the whole world: items, spells,
> monsters, dungeons, regions, factions, encounters, treasure, each a small, named, repeatable
> block. Those blocks are *why* a DM can run the same castle the same way across a hundred
> sessions and four media (read-aloud text, the battle-map, the miniature, the theater of the
> mind). This doc proposes how to bring that "stat-block everything" discipline into *our* data
> model so a beat carries enough structured detail to scaffold a **consistent outcome across
> media** (text, still image, video, and later audio + 3D).
>
> **Thesis carried forward.** `SCHEMA.md` already steals the 5e *character* sheet for agents.
> `docs/research/dm-consistency-craft.md` already steals the DM's *continuity bible* and made it
> the per-beat `bible` block. This doc finishes the job: steal the 5e *non-character* blocks too.
> The leverage is that **half of these already exist in our JSON as loose prose** (a scene
> string, a `recurring_props[]` list, a `bigbad_silhouette`); formalizing them turns one-shot
> strings into reusable, cross-media-injectable records: the same upgrade the character sheet
> made over a system prompt.
>
> **What already exists (do not re-derive).** Per-beat `bible` block in `site/data/beats.json`
> (setting, setting_aspects, establishing_anchor, tone, recurring_motifs, recurring_props,
> recurring_cast, bigbad_silhouette, bigbad_foreshadow, moving_element, ring); per-adventure
> named visual style in `site/data/style-c/<adventure>.json` (name, rationale, preamble);
> per-adventure cover in `site/data/covers.json`; per-adventure rosters in `data/adventures.json`
> (`party` / `npcs` / `bestiary` id-arrays → `data/characters.json`); the global
> `beats.json#style_preamble`. The proposals below **extend** these; they do not replace them.

---

## 0. The one-line thesis

A campaign is consistent across media because every *thing* in it (not just every person) has
a **small named block you re-state verbatim every time it appears.** We already do this for
agents (the sheet) and for scenes (the `bible`). Do it for the **three entity types that are
currently load-bearing but unstructured** (**Locations, Props/Artifacts, and Factions**), and
the same Location, the same hourglass, and the same allegiance render the same way in frame 1 and
frame 9, in the still and the clip, and (later) in the audio bed and the 3D set.

---

## 1. Inventory: which entity types to formalize (and why it helps cross-media)

D&D formalizes seven non-character entity families. Here is each, mapped to what we *already*
have, the **gap**, and **why structuring it buys cross-media consistency**. Ranked by leverage.

| # | Entity | How D&D blocks it (sourced §6) | What we have today | Gap | Why it helps **cross-media** |
|---|---|---|---|---|---|
| **1** | **Location / Setting** | Evocative name + 3 sensory aspects (Sly Flourish); module "General Features": **Light · Sound · Ceilings · Doors · terrain**; map-keyed exits; boxed read-aloud + DM text (Lost Mine of Phandelver) | `bible.setting` + `setting_aspects` + `establishing_anchor` + `palette`/`moving_element`, **duplicated per beat** | The Forge, the Hall of Echoes, the reflecting pool recur but are re-typed each beat; no canonical record; no cross-beat reuse | A location is the **strongest single continuity anchor** in a short sequence. One canonical record → identical place across every frame, every clip, every medium. The "3 aspects" + "Light/Sound" fields map 1:1 to *image* cues, *video* camera/lighting, *audio* ambience, and *3D* set dressing. |
| **2** | **Prop / Artifact** | Magic-item block: **Type line · Rarity · Requires Attunement · charges · body**; artifacts add **Random Properties · Destruction · Lore** | `bible.recurring_props[]` (loose strings: "the deadline hourglass", "the red push-lever") | Props are the literal **payoff objects** (the forged citation, the goal-scroll, the green CI-rune) yet live as bare strings with no description, no per-frame state, no reuse across beats | A named prop with a locked visual descriptor + a **state field** is what makes Chekhov's-gun payoffs render: the *same* scroll in card 2 is the *same* scroll, now ash, in card 5. In video it's an object to track; in audio a sound cue (the hourglass running out); in 3D a placeable mesh. |
| **3** | **Faction / Allegiance** | **Stated goal vs True goal** (public/secret split), Alignment, Leadership, HQ/territory, **renown tiers** (5 named ranks), Allies/Enemies (Forgotten Realms: Harpers, Zhentarim, Lords' Alliance) | Adventures are **use-categories**, not factions; `party` vs `bestiary` is an implicit good/evil split; each sheet has `alignment` + `lineage` | No first-class faction concept; the party-vs-monster *conflict axis* that drives every beat's moral is never named as data | A faction's **one-word ideology + public-face-vs-true-agenda** is the tone/theme lock the moral needs. Cross-media: it sets a consistent *palette and posture* for "the party side" vs "the rot side" in image **and** video **and** the audio key (heroic horns vs dissonant drone). `lineage` already mirrors VtM clans (`BEATS.md` §5). |
| 4 | **Monster** | Full 5e stat block: AC, HP, Speed, 6 abilities, saves, senses, CR, traits, actions | **Already statted as characters** (`role:"monster"` stub: `cr` + `dumped_save`): `SCHEMA.md`, `schema/sheet.json` | **None**: this is solved. Note it so we don't re-stat. | Already cross-media via the sheet's `visual` (proposed) + the monster's `bigbad_silhouette` in the bible. The only add: monsters should grow the same `visual` block characters get (Phase 2 of VIDEO-PIPELINE). |
| 5 | **Encounter** | Difficulty (Easy/Med/Hard/Deadly), XP budget, **objective · monster roster · terrain · tactics** | A **`card`** is already a de-facto encounter (objective in caption, roster in scene, terrain = location) | The *structure* is implicit in prose; `arc_position` (proposed in dm-consistency-craft §3.2) is the missing spine | Lower leverage: our "encounter" is a *narrative beat*, not a combat-balance problem. We need the **arc/escalation** fields (already designed in dm-consistency-craft), not XP math. Fold there, don't add a collection. |
| 6 | **Spell / Ability** | **Level+School · Casting Time · Range · Components (V/S/M) · Duration · At Higher Levels** | Sheets carry a `spell` / `feature` string; cards show effects as prose ("a calm pale glow ripples out") | Signature *actions* (Ponytail's dissolve, Helm's held-out scroll, the Warden's screen-shield) recur but aren't typed | Lowest leverage for now. A signature ability is really a **prop-in-motion + a VFX cue**; covered by Prop (#2) `vfx` + the cast `mannerism` we already lock. Revisit only if we want a reusable VFX library. |
| 7 | **Treasure / Reward** | CR-banded hoard tables; coins + **gems/art objects** + magic items | None | None | Out of scope: we tell fables, not loot-distribution. The *one* useful crumb (a hoard = a small set of *named, described* valuable objects) is just Prop (#2) again. Skip. |

**Conclusion: formalize three new collections (Location, Prop/Artifact, Faction), and fold
Encounter/Spell into the already-designed beat arc + Prop fields.** Monsters are done. Treasure is
out.

---

## 2. Proposed schemas (the top 3) + one worked example each

House style observed in our JSON: `snake_case` keys, kebab-case `id`s, id-arrays for relations
(`party: ["ponytail", ...]`), short prose values tuned to be injectable into a prompt. New
collections mirror that and live beside the others in `site/data/` (built/validated the same way
as the sheets: a JSON array per concept, referential-integrity-checked in `scripts/build.mjs`).

> **Relational shape.** Today a beat's `bible` inlines everything. The upgrade is to make Location,
> Prop, and Faction **first-class records with ids**, and have the per-beat `bible` *reference*
> them (`location: "the-forge"`, `props: ["deadline-hourglass", ...]`, `factions: {...}`). A beat
> that names a `location`/`prop`/`faction` id that doesn't exist **fails the build**: exactly the
> referential-integrity gate `adventures.json` ids already get (README "checks referential
> integrity"). Backward-compatible: a `bible` may still inline fields; the build prefers the
> referenced record when an id is present.

### 2.1 `locations`: `site/data/locations.json`

A location is the 5e **General Features** block (Light / Sound / Ceilings / terrain: Lost Mine of
Phandelver) fused with Sly Flourish's **evocative name + three aspects**, plus the cross-media
fields our pipeline needs (palette, ambience for audio, layout for 3D). It absorbs and canonicalizes
the place-fields currently duplicated inside every `bible`.

```jsonc
{
  "id": "the-forge",                         // kebab; referenced by beats.bible.location
  "name": "The Forge of Endless Diffs",      // evocative name (Sly Flourish)
  "adventure": "forge-of-endless-diffs",     // FK → adventures.json (home region; may appear in others)
  "one_phrase": "a fiery dwarven forge-dungeon",   // the place in one phrase (bible.setting today)

  // --- Sly Flourish: exactly three sensory aspects, repeated verbatim every appearance ---
  "aspects": [
    "anvils are glowing slabs of code",
    "molten channels of light run through black stone",
    "a giant hourglass of sand burns low in the corner"
  ],

  // --- Lost Mine of Phandelver "General Features": the ambient lock, split by sense ---
  "features": {
    "light":   "molten orange key light, deep forge-shadow, ember-spark highlights",
    "sound":   "ring of distant hammers, the low roar of the forge, sand hissing through glass",
    "smell":   "hot iron, ozone, scorched parchment",
    "terrain": "black basalt floor, narrow code-channels of light, a central anvil dais",
    "ceiling": "lost in smoke and floating spark-runes"
  },

  "palette": "molten orange and ember, brass and black, one calm green CI-rune",  // image/video color lock
  "establishing_anchor": "wide shot of the forge-dungeon, anvils as glowing code-slabs, the deadline hourglass burning low",
  "moving_element": "the hourglass sand (the only thing that should change between frames)",

  // --- map-key / exits: the graph-paper layer, optional, for multi-location beats + future 3D ---
  "exits": [],                               // e.g. [{ "to": "the-caves-of-chaos", "via": "the cave mouth" }]
  "key_features": ["the central anvil", "the red push-lever", "the deadline hourglass"],  // ≈ recurring_props ids welcome

  // --- forward-compatible, additive, never required at intro ---
  "audio_bed": "industrial-forge ambience; hammer rhythm; a ticking that quickens with the sand",  // → TTS/SFX/music key
  "layout_3d": "circular forge cavern, central raised anvil dais, lever station stage-left, hourglass alcove upstage-right"  // → 3D set blocking
}
```

**Worked example (`the-forge`, above).** This record is built entirely from the real `forge` beat's `bible`
in `site/data/beats.json` (lines 31-66) plus the `style-c/forge.json` palette: nothing invented,
every field traces to an existing string. `aspects` = the current `setting_aspects` verbatim;
`features.light`/`palette` lift the style-c "Terminal Brutalism"/painterly color key; `establishing_anchor`
and `moving_element` are copied 1:1.

### 2.2 `props`: `site/data/props.json`

A prop/artifact is the 5e **magic-item block** (Type line · Rarity · Attunement · charges · body)
re-cast for *continuity*: the fields that matter to us are the **locked visual descriptor**, a
**per-appearance state machine** (the artifact's "charges"/condition is *our* version of the
payoff arc), and the **cross-media cues**. This formalizes the bare strings in
`bible.recurring_props[]`.

```jsonc
{
  "id": "deadline-hourglass",                // kebab; referenced by bible.props[] and card.active_props[]
  "name": "The Deadline Hourglass",
  "kind": "fixture",                         // fixture | hand-prop | vfx | macguffin  (≈ 5e "type line")
  "significance": "legendary",               // common | notable | legendary  (≈ 5e rarity: how much it must be honored)
  "home_location": "the-forge",              // FK → locations.json (optional; props can travel)
  "locked_descriptor": "a cathedral-sized brass-and-glass hourglass, fine luminous sand, a hairline crack down one bulb",  // re-render verbatim
  "carried_by": null,                        // optional FK → characters.json (a hand-prop's owner)

  // --- the payoff arc: our analogue of an artifact's charges/condition; states are re-renderable ---
  "states": [
    { "key": "full",     "desc": "sand high, glowing bright: time remains" },
    { "key": "low",      "desc": "sand nearly run out, the glow guttering" },
    { "key": "stopped",  "desc": "sand frozen mid-fall, the crack sealed with calm green light" }
  ],

  // --- cross-media cues, additive ---
  "vfx": "warm motes drifting up from the sand; a faint ticking glow",   // image/video
  "sfx": "a steady hiss of sand that quickens, then snaps to silence",   // audio
  "model_3d": "placeable hero-prop; emissive sand material driven by a 0→1 'time' parameter"  // 3D
}
```

**Worked example (`deadline-hourglass`).** This is the single most-recurring prop in the `forge` beat:
it appears in card 1 ("the deadline burns low"), is the named `moving_element`, and resolves in
card 5 ("the hourglass sand has stopped"). The three `states` are *exactly* the three the cards
already narrate, so the prop record just lifts the implicit state machine out of the prose and
makes it a thing every frame's prompt can reference by id + state. A second clean example from our
data: `forged-citation` (the Library beat's "radiant ornate citation-scroll that glows a little too
beautifully" → state `flawless` → state `dissolved`/"blank vellum, ink curling into smoke").

### 2.3 `factions`: `site/data/factions.json`

A faction is the 5e/Forgotten-Realms **organization write-up**: a one-word ideology, the
**stated-goal-vs-true-goal** split, leadership, and an **allegiance posture** the art can lock.
We don't need renown tiers; we need the **conflict axis** every beat already runs on (party-side
vs rot-side) made explicit, because that axis *is* the theme/palette lock for cross-media tone.

```jsonc
{
  "id": "the-yagni-order",                   // kebab
  "name": "The Order of the Empty Diff",
  "adventure": "forge-of-endless-diffs",     // FK (home region; factions may span adventures)
  "side": "order",                           // order | chaos | rot; the moral axis (drives palette + audio key)
  "creed": "Restraint",                      // ONE word, reinforced everywhere (Sly Flourish theme-lock; BEATS.md §4)
  "stated_goal": "ship the feature",         // the public face
  "true_goal": "delete more than you add; the best code is the code you never wrote",  // the deeper aim
  "alignment": "Lawful Good",                // reuse the sheet alignment vocabulary (schema/sheet.json)
  "leadership": ["ponytail"],                // FK[] → characters.json
  "members": ["ponytail", "aider", "claude-code", "cline", "openhands"],  // ≈ adventures.party
  "rivals": ["the-overbuild-cabal"],         // FK[] → factions.json
  "visual_signature": "plain robes, calm pale-green light, empty open hands, a single clean line",  // the faction's look-lock
  "audio_signature": "quiet, sparse, one sustained calm tone"  // → music/ambience key for this side
}
```

**Worked example: `the-yagni-order` vs `the-overbuild-cabal`** in the Forge: the party
(`adventures.json` `forge-of-endless-diffs.party`) embodies *Restraint* led by Ponytail; the
bestiary (`over-engineer`, `vibe-coder`, `confabulator`) is the chaos/rot side. Both already exist
as character-id arrays; the faction record just **names the two sides, their one-word creeds, and
their look/sound signatures**, which is what lets the pipeline render "the party side" with a
consistent calm-green palette and the "rot side" with the orange-bloom palette across every frame,
clip, and (later) audio bed. (`the-orange-menace` is the textbook case: the entire adventure *is*
a faction conflict (five nobodies vs `the-rot-crowned`) with the orange-vs-marble palette already
written into every card; a faction record makes that lock data instead of repeated prose.)

---

## 3. Each entity → a prompt cue (text / image / video → audio / 3D)

The point of structuring these is that each field is a **reusable cue** the pipeline injects. The
bible-block prepend (`dm-consistency-craft.md` §4) already does this for the inlined fields; with
records, the prepend is *assembled from the referenced Location + Props + Faction*. Mapping:

| Entity field | **Text** (caption/scene) | **Image** (Gemini still) | **Video** (Veo clip) | **Audio** (later: TTS/SFX/music) | **3D** (later) |
|---|---|---|---|---|---|
| Location `aspects[]` + `features.light` | narration of place | `Location: {name}, {aspects}. Light: {features.light}. Re-render this exact place.` | same, + "camera moves, the place does not" | `features.sound` → ambient bed; `features.smell` → none (drop) | `layout_3d` → set geometry; `features.light` → light rig |
| Location `palette` | n/a | `Palette LOCK: {palette}` (hard color key) | same lock, every frame | maps to musical key/mode (warm vs dissonant) | material/lighting LUT |
| Location `moving_element` | "the deadline burns low" | "only {moving_element} changes" | the one animated element per clip | the sound that tracks it (sand hiss) | the one driven parameter |
| Prop `locked_descriptor` + `states[].key` | "the same scroll, now ash" | `Prop {name}: {locked_descriptor}, state={state.desc}.` | object tracked across the clip in that state | `sfx` cue fires on state change | `model_3d`, state = a 0→1 material/anim param |
| Prop `vfx` | n/a | the prop's glow/particles | animated VFX | the prop's `sfx` | particle system + emissive |
| Faction `side` + `creed` + `visual_signature` | the moral, the posture | `{side} side look: {visual_signature}; tone: {creed}.` | posture + palette per side | `audio_signature` → that side's music/ambience | side-keyed set dressing + lighting mood |
| Faction `stated_goal` vs `true_goal` | the irony the caption lands | the public face vs the tell at frame's edge | the reveal across the arc | warm surface vs dissonant undertone | a visible-vs-hidden staging choice |

**The condensed prepend, now assembled from records** (extends `dm-consistency-craft.md` §4):

```
[WORLD]  = locations[bible.location]: one_phrase, aspects, features.light, establishing_anchor
[LOOK]   = location.palette + style_preamble + style-c[adventure].preamble + tone[]
[PROPS]  = for id in bible.props: "{name}: {locked_descriptor} (state: {card.prop_states[id]})"
[SIDES]  = for f in bible.factions: "{f.side} side ({f.creed}): {f.visual_signature}; villain {bigbad_silhouette}"
[RULE]   = "Re-render this exact place, palette, cast, and props; only {location.moving_element} changes between frames."
[FRAME]  = arc_position · time_marker · escalation_cue · callbacks · is_ring_close   (per-card, from dm-consistency-craft §3.2)
```

**Audio extension (Phase 3 of VIDEO-PIPELINE).** `location.audio_bed` + each side's
`faction.audio_signature` + each prop's `sfx` give the stitch step (`scripts/beat-video.mjs`) a
**data-driven sound plan**: ambient bed from the location, music key from the dominant faction's
side, timed SFX from props as their `states` advance, TTS narration from the existing card
`caption`. No new prose needed; the records *are* the cue sheet.

**3D extension (the eventual end state).** `location.layout_3d` + `location.exits` is a scene
graph (rooms + connections: the literal "graph-paper castle"); `prop.model_3d` + `states` are
placeable, parameterized assets; `faction.side` keys the lighting/material mood. The same records
that lock a still also block a set. This is the whole reason to structure now rather than keep
prose: **prose doesn't port to a scene graph; a keyed Location with exits does.**

---

## 4. Phased adoption (fits the existing VIDEO-PIPELINE phases: don't boil the ocean)

The build sequencing piggybacks on the phases already in `docs/VIDEO-PIPELINE.md`. Each phase is
shippable alone and additive (no field is required at introduction → no existing beat breaks).

**Phase 2a: Locations (do first; highest leverage, near-zero new content).**
The `bible` block already holds every Location field as inlined prose, duplicated per beat. Lift
the *recurring* settings into `site/data/locations.json` (one record per distinct place: start
with `the-forge`, `the-hall-of-echoes`, `the-reflecting-pool`, `the-caves-of-chaos`, `the-boundless-library`,
`the-proving-grounds`, `the-masquerade-salon`, `the-round-table`), have `bible` reference by
`location` id, and assemble the §3 prepend from the record. **Acceptance:** the Forge renders
identically whether a frame comes from the `forge` beat or any future beat set there; build fails on
an unknown `location` id. *Effort: a port, not authorship; mirrors the §3.1 work already specced
in dm-consistency-craft, just promoted from inline to a keyed record.*

**Phase 2b: Props (with the same Phase-2 character-consistency work).**
While adding the per-character `visual` block (VIDEO-PIPELINE Phase 2), also lift
`bible.recurring_props[]` into `site/data/props.json` with `locked_descriptor` + `states[]`, and
add a per-card `prop_states` map (`{"deadline-hourglass": "low"}`). This is what makes
Chekhov's-gun payoffs actually re-render. **Acceptance:** the forged citation / the hourglass / the
goal-scroll appear with the *same* descriptor and a *correct, escalating* state across a beat's
cards; the ring-close card reuses the opener's prop in its final state. *Effort: ~one descriptor +
2-3 states per recurring prop; only props that recur or pay off need a record (one-off scenery
stays prose).*

**Phase 2c: Factions (lightweight; ride the allegory adventures).**
Add `site/data/factions.json` with two records per *conflict-driven* adventure (the party-side
order and the bestiary-side chaos/rot), starting with the ones whose moral *is* a faction conflict:
`the-orange-menace` (nobodies vs the-rot-crowned), `forge-of-endless-diffs` (YAGNI vs overbuild),
`the-proving-grounds` (honest judges vs Goodhart). Wire `bible.factions` + each side's `audio_signature`
into the §3 prepend and the Phase-3 audio plan. **Acceptance:** "party side" and "rot side" carry a
consistent palette + (later) audio key across frames and clips. *Effort: ~6-10 small records; reuse
existing `party`/`bestiary` arrays as `members`.*

**Phase 3: Audio/3D fields go live with the stitch + any future 3D spike.**
`audio_bed` / `audio_signature` / prop `sfx` feed `scripts/beat-video.mjs`'s sound plan (VIDEO-PIPELINE
Phase 3). `layout_3d` / `exits` / `model_3d` stay *documented-but-dormant* until a 3D effort starts;
they cost nothing to carry and are the on-ramp when it does.

**Explicitly deferred / not building:** Encounter as its own collection (fold the arc fields into
the per-card schema already designed in `dm-consistency-craft.md` §3.2); Spell/Ability collection
(covered by Prop `vfx` + cast `mannerism`); Treasure (out of thesis); monster *re-statting* (done;
monsters are characters; they only need the same `visual` block characters get in Phase 2).

**Build/validation note.** Each new collection is a JSON array validated and integrity-checked in
`scripts/build.mjs` alongside the sheets (README: "checks referential integrity… exits non-zero on
any violation"). Add: (1) a light JSON-Schema per collection in `schema/`; (2) a referential check
that every `bible.location` / `bible.props[]` / `bible.factions` / faction `members[]` /
`leadership[]` / `home_location` id resolves. A beat referencing a missing location is a failing CI
check: same gate, same reason as a sheet with a missing slot.

---

## 5. Sourcing: how D&D formalizes each entity (fetched URLs)

Every claim below traces to a page **fetched** during this research (sub-agent fan-out + four
spot-checks re-fetched at the main thread). Where a source could not be fetched, it is flagged.

**Locations / dungeons.**
- Sly Flourish (Mike Shea), "Location Moves": fantastic location = **evocative name + three
  aspects**; verbatim example **"Defiled Catacomb. *Oozing sarcophagus, wailing skulls, unholy
  circle.*"** (re-fetched at main thread; confirmed "an evocative name and three aspects").
  https://slyflourish.com/location_moves.html
- Sly Flourish, "Lazy GM's Resource Document": "Develop Fantastic Locations": short evocative
  title + **three fantastic aspects** (e.g. The Sunspire). https://slyflourish.com/lazy_gm_resource_document.html
- Sly Flourish, "Nine Fantastic Encounter Locations": adds the **"Area Aspects:"** label and
  Rodney Thompson's "three Fs" (fantastic, familiar, functional); count flexes 2-3.
  https://slyflourish.com/nine_fantastic_encounter_locations.html
- *Lost Mine of Phandelver*, full text: the **"General Features"** preamble per dungeon with
  subsection labels **Ceilings · Light · Sound · Doors · Secret Doors · Stalagmites · Stream**;
  each numbered area = **"1. Cave Mouth"** → *italic boxed read-aloud* → DM text. (Literal "Smells"
  label not found in the fetched text, flagged; "Sound" confirmed.)
  https://archive.org/stream/dnd-5ed-adv-lost-mine-of-phandelver/dnd-5ed-adv-lost-mine-of-phandelver_djvu.txt
- The Alexandrian, "The Art of the Key": keyed-area history; B1 *In Search of the Unknown* splits
  each entry into **Monster / Treasure / Location**; **boxed read-aloud vs DM-only** split.
  https://thealexandrian.net/wordpress/35180/roleplaying-games/the-art-of-the-key
- The Alexandrian, "Better Dungeon Maps #6: The Room Key": the **numbered map area → key (room
  name + creatures + stats + behavior)** convention. https://thealexandrian.net/wordpress/5581/roleplaying-games/better-dungeon-maps-6-the-room-key

**Magic items / artifacts.**
- SRD 5.1 Magic Items: six rarities **Common · Uncommon · Rare · Very Rare · Legendary ·
  Artifact**; attunement field **"requires attunement (by a …)"**; type categories **Wondrous item,
  Weapon, Armor, Potion, Ring, Rod, Scroll, Staff, Wand** (re-fetched at main thread; rarities,
  attunement phrasing, and type list all confirmed).
  https://www.5esrd.com/tools-resources/system-reference-document-5-1-1/magic-items/
- SRD item header example (Staff of Abjuration): literal top line **"Staff, very rare (requires
  attunement by an arcane spellcaster)"** + **"This staff has 10 charges."**
  https://www.5esrd.com/gamemastering/magic-items/magic-items-by-other-publishers/magic-items-frog-god-games/staff-of-abjuration/
- SRD Artifacts (Orb of Dragonkind): sections **"Random Properties" · "Spells" · "Destroying an
  Orb"**; "2 minor beneficial; 1 minor detrimental; 1 major detrimental".
  https://www.5esrd.com/gamemastering/magic-items/artifacts/
- DumpStat, "A Player's Guide to Artifacts": DMG artifact framework: **Random Properties** caps
  (minor/major × beneficial/detrimental), **Curse · Destruction (a quest, not HP) · Lore ·
  Personality**. https://dumpstatadventures.com/a-players-perspective/a-players-guide-to-artifacts

**Spells.**
- SRD/5thsrd, "Casting a Spell": verbatim: "Each spell description begins with a block of
  information, including the spell's **name, level, school of magic, casting time, range,
  components, and duration**"; components **V (verbal) · S (somatic) · M (material)** (re-fetched
  at main thread; both confirmed). https://5thsrd.org/spellcasting/casting_a_spell/
- SRD Fireball: filled fields: **"3rd-level evocation" · Casting Time 1 action · Range 150 feet ·
  Components V, S, M · Duration Instantaneous · At Higher Levels +1d6/slot**.
  https://www.5esrd.com/spellcasting/all-spells/f/fireball/

**Factions / organizations.**
- D&D Adventurers League Faction Guide (PDF): **renown ladder** (Rank 1 Initiate → Rank 5
  Exemplar) + per-faction named rank titles (Harpers: Watcher/Harpshadow/Brightcandle/Wise
  Owl/High Harper; Zhentarim: Fang/Wolf/Viper/Ardragon/Dread Lord; etc.).
  https://www.victoriaescapegames.com/wp-content/uploads/2018/01/DDAL_FACTION_GUIDE_v701.pdf
- Crit Academy, "How to Create Organizations in D&D": field set: Name · **Stated Goal vs True
  Goal** (public/secret split) · Alignment · Philosophy · History · Leadership · Membership
  Requirements · Structure · Activities · Enemies vs Rivals.
  https://www.critacademy.com/post/how-to-create-organizations-in-dungeons-and-dragons
  - *(Forgotten Realms Fandom + World Anvil faction infoboxes block WebFetch (403/500); the DDAL
    renown structure + Crit Academy field list cover the synthesis without them, flagged.)*

**Encounters.**
- D&D Basic Rules (2014), "Building Combat Encounters": difficulty **Easy/Medium/Hard/Deadly**;
  five steps (XP thresholds → party threshold → monster XP → encounter multiplier → compare).
  https://www.dndbeyond.com/sources/dnd/basic-rules-2014/building-combat-encounters
  - *(2024 DMG replaces this with a Low/Moderate/High XP-budget table and drops the multiplier,
    per EN World/Blog of Holding search hits not fetched; treat as unverified. Not load-bearing here.)*

**Monster stat block (for the "already done" comparison).**
- SRD goblin (mirrors): canonical block labels **Armor Class · Hit Points · Speed · STR DEX CON
  INT WIS CHA · Saving Throws° · Skills° · Damage Resistances/Immunities° · Condition Immunities° ·
  Senses · Languages · Challenge (CR + XP) · Traits · Actions · Reactions° · Legendary Actions°**
  (° = shown only when non-empty). https://5thsrd.org/gamemaster_rules/monsters/goblin/ ·
  https://farreachco.com/dnd/5e/srd/monsters/goblin

**Treasure (out of scope; one fetched receipt).**
- Roll20 Compendium, Adventure Rewards: CR bands **0-4 · 5-10 · 11-16 · 17+**; **Individual
  Treasure vs Treasure Hoard**; coins + gems/art objects + magic items.
  https://roll20.net/compendium/dnd5e/Rules:Adventure%20Rewards?expansion=33359

**Honest limits.** Treasure-hoard "Magic Item Tables A-I" exact row labels were corroborated by
search, not page-fetched (the SRD treasure page 404'd). The 2024-vs-2014 encounter and treasure
models differ; the 2014 SRD framing is cited as load-bearing since our use is structural, not
balance-driven. Fandom/World Anvil consistently block automated fetch; faction fields are grounded
in the DDAL PDF + Crit Academy instead. None of these gaps affect the three proposed schemas.
