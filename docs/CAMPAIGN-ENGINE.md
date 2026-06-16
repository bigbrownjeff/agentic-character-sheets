# The Campaign Engine — unified design

> Synthesis of four research streams into one model. The thesis "your prompt is a character
> sheet" generalizes: **stat-block everything**, let **emergent stat-driven behavior** play out,
> and have the **DM bend the arc** toward a meaningful end — all rendered consistently across
> text → image → video → audio → 3D. Source docs in `docs/research/`:
> `stat-everything-schema.md`, `campaign-structure.md`, `emergent-stat-driven-behavior.md`,
> `narrative-therapy-dm.md`, plus the consistency craft in `dm-consistency-craft.md`.

## 1. The big idea, reconciled

Four streams, one spine. **D&D stats everything → that's what feeds consistent media.** We add
three things on top of the character-sheet corpus:
- **A world that's fully statted** (locations, props, factions — not just characters/monsters).
- **A campaign tier above adventures** (persistent world-state, recurring antagonists, arcs).
- **Emergent characters** whose dialogue/reactions derive from their stat blocks, with the **DM**
  bending the result toward a chosen, meaningful ending.

## 2. The data model (additive, non-breaking)

Three **tiers** + statted **entities**, all id-keyed and integrity-checked in `build.mjs`.

| Tier | File | Holds | Injects |
|---|---|---|---|
| **Campaign** | `data/campaigns.json` (NEW) | advancing world-state, `factions[]`, `recurring_antagonists[]` (seed→escalate→payoff), `arc_stages[]`, `throughlines[]`, `adventure_order` | `[SAGA]` block |
| **Adventure** | beat `bible` (DONE) + back-ref | setting+3 aspects, anchor, motifs, locked cast, big-bad, tone, moving-element | `[WORLD]` block |
| **Beat/card** | `beats.json` cards (extend) | arc_position, time_marker, escalation_cue, callbacks, leads[], improv | `[FRAME]` block |

**New statted entities** (referenced from `bible`, per `stat-everything-schema.md`):
- `data/locations.json` — Sly-Flourish "name + 3 aspects" fused with Phandelver "General Features"
  (`features.light/sound/terrain`), `audio_bed`, `exits`, future `layout_3d`.
- `data/props.json` — the magic-item block recast: `locked_descriptor` + a payoff `states[]` machine
  (e.g. the hourglass: full → low → stopped) + `sfx`.
- `data/factions.json` — stated-goal vs `true_goal`, one-word `creed`, side `palette`, `sigil`.
- **Monsters: already done** (statted as characters). Treasure: out of thesis. Encounter/Spell: fold
  into beat-arc + prop fields.

**Character extensions** (per `emergent-stat-driven-behavior.md`): `personality{trait,ideal,bond,flaw}`,
`objective_default`, `voiceprint`, per-character `temperature`. These *also* are the portrait/`visual`
source the sheets need.

## 3. The 3-tier prompt-injection cascade

Every image/video prompt is assembled outermost → innermost, so the same saga villain, world, and
cast inject identically into every frame (extends the Phase-2 `buildBible`):

```
[SAGA]  campaign: throughline, recurring antagonist silhouette + payoff state, faction sigils/palette
[WORLD] adventure bible: setting + 3 aspects, anchor, motifs, locked cast, big-bad foreshadow, tone
[FRAME] this card: arc position, time marker, escalation state, callbacks, ring-close
[CAST]  the 1-3 leads' locked descriptors + stat-derived behavior + (emergent) line
+ the card's own scene prose
```

## 4. Emergent stat-driven behavior (the "agency")

Per `emergent-stat-driven-behavior.md`: each beat names **1-3 leads** (4-signal rule: archetype-fit,
`dumped_save` salience, stat contrast); a 4-block generator (bible + stat-derived character bible +
situation + improv contract) produces **semi-improvised in-character dialogue + reactions**, with
controlled randomness via each character's own `temperature` + an `improv_seed`, generate-N-then-
stat-filter. **`dumped_save` is the dramatic keystone** — the beat stages that one failure, watched by
a straight-man who passes it. Output threads everywhere: `reaction_cue`→image, `line`→caption + TTS,
`leads[]`→stitch timing.

## 5. DM goal modes (bending the arc)

Per `narrative-therapy-dm.md`: a selectable `dm_goal` (adventure-level `default_goal_mode` + runtime
override; templates in `data/goal-modes.json`). 8 modes — default **`therapeutic`** (externalize →
sit with it → unique outcome → re-author; aim the *user* at calm/empathy/compassion/kindness) plus
`strict_realism`, `guaranteed_victory`, `just_made_it`, `tragedy_averted`, `pyrrhic`, `redemption`,
`comedic_deflate`. The DM **constrains the ending's meaning, improvises the path** (soft constraints,
not railroading — agency holds). Ethics: allegory/entertainment, not clinical treatment.

## 6. Cross-media cue mapping

One stat block drives every medium: `features.light`→image lighting→Veo; `personality/voiceprint`+
`line`→TTS; prop `sfx`/location `audio_bed`→the Phase-3 stitch sound plan; burned `caption`→silent-
autoplay social; `layout_3d`/`exits`→the eventual scene graph.

## 7. Implementation plan (reconciled with VIDEO-PIPELINE.md)

- **P2a — bibles** for all 10 adventures (the `[WORLD]` tier). *In progress (Forge piloted).*
- **P2b — campaign** `campaigns.json`: author the "Failure-Modes Saga" (the Confabulator already
  recurs across 5 adventures) + the `[SAGA]` inject tier.
- **P2c — entities**: `locations.json`, `props.json`, `factions.json` + `build.mjs` integrity gate;
  fold into the bible prepend.
- **P2d — characters**: `personality`/`visual`/`voiceprint` (unblocks sheets + covers + emergent gen).
- **P2e — emergent dialogue** generator + `leads[]` per beat.
- **P2f — goal modes** `goal-modes.json` + `dm_goal` resolution.
- **P3 — stitch tooling** (`beat-video.mjs`): concat → strip → music + TTS + FX → burn captions → moment.
- **Mass-gen** — `generate-videos.mjs` corpus-wide (Veo→R2), then a moment per beat. *Pilot cost first.*
- **P4 — site refresh** to expose moments / clips / campaign + stat structure.

All additive and non-breaking; each phase ships behind a loud `build.mjs` integrity check.
