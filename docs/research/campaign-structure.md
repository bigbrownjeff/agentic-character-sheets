# Campaign Structure → A Layer Above Adventures

> **Purpose.** We have standalone *adventures* (each a sequence of *beats*/cards) but **nothing
> above them**: no campaign, arc, persistent world-state, or recurring-villain layer. This doc
> proposes that layer, drawn from how acclaimed long-running D&D narratives and published modules
> sustain one coherent saga, so our story outcomes stay consistent as a beat travels across media
> (still → clip → stitched social video).
>
> **What already exists (don't re-derive).** `data/adventures.json` (10 adventures, each with
> `party`/`npcs`/`bestiary` id lists; **monsters already recur across adventures** by design).
> `site/data/beats.json` (per-adventure beats, per-card `scene`+`caption`, and a per-beat
> `bible` block on `forge`). `docs/research/dm-consistency-craft.md` (the **per-adventure** /
> **per-beat** continuity-bible layer + the prepend-block injection pattern). **This doc adds the
> tier *above* the adventure**; it consumes the same injection machinery, one level up.
>
> **The seam this rides on (verified in our data).** Our monsters *already* cross adventures:
> the **Confabulator** appears in 5 adventures (`forge`, `library`, `atelier`, `borderlands`,
> `proving-grounds`); the **Sycophant** in 4; `vibe-coder` in 4; `paperclip`, `sydney`, `tay`,
> `grandma-exploit` in 2+. **Keep on the Token Borderlands** is literally a Caves-of-Chaos boss
> rush that re-gathers the whole bestiary. We have the raw material of a campaign; we just never
> named the layer that makes it one. (Source: `node` join over `data/adventures.json`, §2.5.)

---

## 0. One-line thesis

A long campaign coheres because a **small, written-down canon above the adventures** fixes four
things and lets exactly one of them move per chapter: a **persistent world-state**, a roster of
**recurring factions/villains seeded early and paid off late**, an **ordered arc with rising
stakes**, and **callbacks** that re-pay planted elements. We make that canon **data** (a
`campaigns.json`), compress it to a **campaign prepend block** that sits *above* the adventure
bible, and inject it so the model renders one saga instead of ten unrelated shorts.

---

## 1. The structural patterns that make a long campaign cohere

Five patterns, each grounded in a real long-form D&D narrative or published GM/TV craft. Citations
are fetched URLs; fan wikis and unfetchable pages are flagged inline (full caveats in §6).

### 1.1 An ordered arc spine: named chapters, not a flat list of sessions

The defining move is that a campaign is **a set of adventures played in succession**, organized
into **named arcs** with explicit boundaries, not an undifferentiated stream.

- *Definitional.* "A campaign is a continuing storyline in a game. In role-playing games, a
  campaign is a set of adventures." Wikipedia, *Campaign (gaming)*,
  https://en.wikipedia.org/wiki/Campaign_(gaming) . The unit below: "A series of adventures played
  in succession are collectively called a campaign." Wikipedia, *Adventure (role-playing games)*,
  https://en.wikipedia.org/wiki/Adventure_(role-playing_games) . **This nesting (campaign ⊃
  adventure ⊃ beat) is exactly the tier we're missing.**
- *Critical Role, Campaign 1.* The official site organizes the campaign into **named arcs with
  episode boundaries** (the Briarwoods arc begins at Ep 24, the Chroma Conclave arc at Ep 39),
  proving arcs are an explicit organizing unit. https://critrole.com/campaign-1-vox-machina/ .
  The canonical five-arc spine (Kraghammer & Vasselheim → The Briarwoods → The Chroma Conclave →
  Taryon Darrington → Vecna) is community-documented (Critical Role **fan** wiki, *fetch returned
  403; via search snippet*, flag, §6).
- *A module shows the same spine in miniature.* **Lost Mine of Phandelver** is four named parts:
  **Part 1 Goblin Arrows · Part 2 Phandalin · Part 3 The Spider's Web · Part 4 Wave Echo Cave**
  (official ToC, D&D Beyond, https://www.dndbeyond.com/sources/dnd/lmop ; narrative body
  paywalled; titles verified, prose not).
- *The pattern as craft.* Frame the whole campaign around one goal: "Think about the goal of our
  campaign as a big shining north star with lots of potential adventures leading up to it." Mike
  Shea (Sly Flourish), *Focus Your Campaign*, https://slyflourish.com/focus_your_campaign.html .

**Takeaway for us:** a campaign is an **ordered list of adventure ids** with **named arc_stages**
that group them, each stage carrying its own stakes; not a tag on adventures.

### 1.2 A recurring antagonist/faction, seeded early and paid off late

The strongest cohesion device is a villain who **appears early, does something clearly evil, and
returns as the culminating threat**: the planted-and-escalated Big Bad.

- *Seed-early / pay-late, canonical example.* In Critical Role C1, **Delilah Briarwood** (an
  arc-2 antagonist serving **Vecna**) is foreshadowed before the party knows whom she serves,
  killed mid-campaign, revived, and the **final arc** reveals her endgame was Vecna's resurrection
  all along; the arc-2 villains return as the finale's lieutenants. (Critical Role **fan** wiki,
  *403 / search-snippet*, flag, §6.) This is precisely "antagonist introduced in chapter 2, paid
  off in chapter 5."
- *Module version.* The **Black Spider / Nezznar** is the late-revealed mastermind of Lost Mine,
  while the **Redbrands (led by Glasstaff)** are the mid-tier local obstacle in Phandalin; a
  two-tier villain stack (street-level faction now, true mastermind later). (Part titles official,
  D&D Beyond above; the Nezznar/Glasstaff *roles* are fan-sourced, flag, §6.)
- *Villains as living "fronts," not statues.* "Our villains are not static entities sitting atop a
  throne waiting for the characters to show up." And the resilience trick: "That's why we have
  three villains. When one villain gets thwarted, two others move their plans forward." Mike Shea,
  *Build Resilient and Evolving Villainous Plots*,
  https://slyflourish.com/resilient_villainous_plots.html .
- *Build the villain before the showdown* (already in our consistency doc): the big bad appears
  early and escalates, so the finale is *paid off* rather than arbitrary (Colville, via secondary;
  see `dm-consistency-craft.md` §1.4 and its caveats).

**Takeaway for us:** model **`recurring_antagonists[]`** (and `factions[]`) at the campaign level,
each with where it's `seeded`, where it `escalates`, and where it's `paid_off` (adventure ids).
We already have the recurring monsters; this names their through-line.

### 1.3 A persistent world-state that survives and changes between chapters

A living setting keeps a **fixed core** and changes **one visible thing at a time**, and those
changes *persist*; the world is permanently altered between arcs.

- *The mechanism, at the setting scale.* The **Forgotten Realms** maintains one continuous
  chronology via an in-world calendar (Dale Reckoning, "DR") that is **moved forward on the page**
  to sync decades of products: TSR "advanc[ed] the calendar one year forward to 1358 DR" (Time of
  Troubles); the Spellplague "moved the fictional world's timeline 94 years into the future to
  1479 DR." Wikipedia, *Forgotten Realms*, https://en.wikipedia.org/wiki/Forgotten_Realms . The
  lesson isn't the lore; it's that **a persistent world needs a single advancing state variable**.
- *Recurring NPCs as continuity anchors.* The same source frames **Elminster** and **Drizzt** as
  "noteworthy recurring characters"; fixed figures that persist across products and tell you it's
  the same world.
- *The arc-scale version.* In Critical Role C1 the Chroma Conclave arc **sacks the capital (Emon)
  and forces the party to relocate survivors to Whitestone**: a permanent world change carried
  forward into later sessions. (Fan wiki, *403/snippet*, flag, §6.)
- *Change must be deliberate and small* (already in our consistency doc, §1.1): keep the setting
  consistent, introduce occasional change the audience notices. The campaign layer is where that
  change is **recorded as state** so the *next* adventure inherits it.

**Takeaway for us:** a `world_state` object on the campaign, plus per-stage `world_state_delta`s
so an adventure rendered "after" another shows the inherited consequence (e.g., the pool further
gone, a faction now hostile).

### 1.4 Factions as a reusable affiliation layer spanning chapters

Between "one villain" and "the whole world" sits the **faction**: a named organization that recurs
across adventures and gives every NPC an allegiance.

- *Factions are an explicit cross-product device.* "Many characters created in the Forgotten
  Realms setting, especially those for organized D&D play, belong to one of five factions"; those
  five are the Harpers, Order of the Gauntlet, Emerald Enclave, Lords' Alliance, Zhentarim. Official: D&D
  Beyond, *Appendix C: The Five Factions*,
  https://www.dndbeyond.com/sources/dnd/basic-rules-2014/appendix-c-the-five-factions . Each is a
  one-line role ("clandestine network of spellcasters and spies"; "well-trained mercenaries…who
  seek to expand their influence"). A single faction (the **Harpers**) recurs across ~35 years of
  products: Wikipedia, *Harpers (Forgotten Realms organization)*,
  https://en.wikipedia.org/wiki/Harpers_(Forgotten_Realms_organization) .

**Takeaway for us:** our adventures already cluster into camps (the *good-practice* heroes vs. the
*failure-mode* bestiary). Naming 2 to 3 `factions[]` (e.g., **The Disciplined** vs. **The Confabulant
Court**) lets every character carry an allegiance and lets the prompt say "this is the same faction
you saw two adventures ago."

### 1.5 A three-act / story-circle shape per arc, and callbacks that close rings

Each arc (and the campaign overall) should run a recognizable dramatic shape, and **plant elements
that get re-paid**: visually, that's a callback.

- *The party-quest three-act.* **D&D: Honor Among Thieves** is read as a heist/quest in three
  acts: assemble the party → the plan with a "goes wrong" midpoint ("find the room empty except
  for a magical trap") → the climactic confrontation, over a father-daughter emotional spine.
  Wikipedia, https://en.wikipedia.org/wiki/Dungeons_%26_Dragons:_Honor_Among_Thieves .
- *The episodic arc shape.* Dan Harmon's **Story Circle**: "You, Need, Go, Search, Find, Take,
  Return, Change"; is the eight-step shape where each episode runs its own circle while feeding a
  larger serialized arc. StudioBinder, https://www.studiobinder.com/blog/dan-harmon-story-circle/ .
  The classic five-part frame underneath it: Freytag's "exposition, rising action, climax, falling
  action, and dénouement." https://www.studiobinder.com/blog/what-is-freytags-pyramid-definition/ .
- *Callbacks / planted-and-paid-off* are already our idiom: the per-card `callbacks[]` and
  ring-close fields in `dm-consistency-craft.md` §1.5. The campaign layer adds **cross-adventure**
  callbacks (a prop or figure from adventure A re-rendered in adventure D).

### 1.6 The canonical reference that keeps a long story consistent: the "bible"

All of the above is held together by **one written reference** that new contributors read before
adding anything; the screen-industry "show/series bible."

- "a document that outlines the characters, plots, settings, and themes of a television series," a
  **"living document"** that keeps a serialized story "true to their foundational concepts across
  multiple seasons and episodes written by different writers." StudioBinder, *What Is a Show
  Bible*, https://www.studiobinder.com/blog/what-is-a-show-bible-examples-template/ .
- "a reference document used by screenwriters for information on characters, settings, and other
  elements," updated "to keep everything within the series consistent" and "sometimes given to new
  writers when they join." Wikipedia, *Bible (screenwriting)*,
  https://en.wikipedia.org/wiki/Bible_(screenwriting) .

**Our `dm-consistency-craft.md` already builds a per-adventure bible. This doc adds the
campaign-level bible above it**: and `campaigns.json` *is* that bible, as data.

---

## 2. The proposed `campaign` / `arc` data layer

### 2.1 Design constraints (minimal, high-leverage)

1. **One new file, additive.** `data/campaigns.json`. No change to `adventures.json` or
   `beats.json` is *required* (an optional back-reference is offered in §2.4). The build stays
   green if the file is absent; same posture the project takes elsewhere.
2. **Reference adventures by their canonical `adventures[].id` slug** (`forge-of-endless-diffs`,
   not `forge`). Beats use short ids (`forge`) and join to adventures via
   `beats[].adventure === adventures[].name`; the campaign layer anchors on the stable slug and
   relies on that existing name-join to reach beats (§2.5). Don't invent a third id space.
3. **Don't duplicate the per-adventure bible.** The campaign holds only what is *above* one
   adventure: world-state, cross-adventure factions/villains, ordering, throughlines. Per-adventure
   `setting`/`palette`/`recurring_cast` stay in the §3.1 records of `dm-consistency-craft.md`.
4. **Every field must earn a prompt cue** (§3); if it can't be injected, it doesn't belong here.

### 2.2 Schema (`data/campaigns.json`)

```jsonc
{
  "$comment": "The tier above adventures. A campaign is an ordered set of adventures sharing a world, factions, recurring villains, and an arc. Adventure ids are data/adventures.json ids.",
  "campaigns": [
    {
      "id": "the-failure-modes-saga",          // kebab slug, stable
      "name": "The Failure-Modes Saga",
      "logline": "Ten ways to use an agent, and the ten ways each one rots.",
      "theme": "discipline vs. confabulation",  // ONE-to-three word campaign north-star (Shea §1.1)
      "tone": ["heroic", "cautionary", "deadpan-comedic"], // campaign-wide register, inherited by every beat

      // --- PERSISTENT WORLD-STATE (the fixed core + a single advancing variable) ---
      "world": {
        "name": "The Realm of Tooluse",         // the shared setting these adventures sit in
        "premise": "A world where every craft is performed by summoned agents; competence is a discipline, and every discipline has a matching damnation.",
        "fixed_anchors": [                       // things true in EVERY adventure of this campaign
          "agents are summoned, not born",
          "the good ones hold a discipline; the monsters are that discipline's failure",
          "painterly Obsidian/WotC house look (inherited from beats.json#style_preamble)"
        ],
        "advancing_state": {                     // the single state variable that moves across the arc (Forgotten Realms DR lesson §1.3)
          "name": "the Confabulation",           // the creeping world-condition
          "scale": "0=contained … 5=the Realm runs on false detail",
          "value": 1                             // current campaign-wide level; stages raise it
        }
      },

      // --- FACTIONS (reusable affiliations spanning adventures, §1.4) ---
      "factions": [
        {
          "id": "the-disciplined",
          "name": "The Disciplined",
          "one_line": "Practitioners who hold a craft's discipline: test, cite, scope, verify.",
          "members": ["ponytail", "elicit", "helm", "garak", "the-auditor"], // persona ids from adventures' party/npcs
          "sigil": "a calm green CI-rune",        // a recurring visual motif this faction carries
          "stance": "protagonist"
        },
        {
          "id": "the-confabulant-court",
          "name": "The Confabulant Court",
          "one_line": "Failure-modes that produce confident, beautiful, false output.",
          "members": ["confabulator", "goodhart", "sycophant", "over-engineer"], // all real persona ids in adventures.json
          "guises": { "confabulator": ["Veldrix Falsewright (its Library form)", "the Confabulator (its Forge form)"] }, // beat-card names are costumes on ONE persona id; the id is what the build checks
          "sigil": "an over-ornate false-citation glow",
          "stance": "antagonist"
        }
      ],

      // --- RECURRING ANTAGONISTS (seed early, pay off late, §1.2) ---
      "recurring_antagonists": [
        {
          "id": "confabulator",                  // persona id; already recurs in 5 adventures (verified §2.5)
          "name": "The Confabulator",
          "silhouette": "a smiling figure woven from too-perfect false detail", // matches forge bible's bigbad_silhouette
          "faction": "the-confabulant-court",
          "seeded_in": "forge-of-endless-diffs", // first, peripheral appearance (foreshadow at frame edge)
          "escalates_in": ["boundless-library", "the-proving-grounds"], // grows, does something clearly evil
          "paid_off_in": "keep-on-the-borderlands", // confronted in the Caves-of-Chaos finale
          "escalation_rule": "each appearance: more central in frame, the false-detail glow brighter and more believable"
        }
      ],

      // --- THE ARC: ordered chapters with rising stakes (§1.1, §1.5) ---
      "arc_stages": [
        {
          "stage": 1,
          "name": "First Threads",
          "act": "exposition",                   // Freytag/Harmon slot (§1.5)
          "stakes": "one practitioner notices one wrong thing",
          "adventures": ["forge-of-endless-diffs"],
          "world_state_delta": "the Confabulation is a glow at the edge of frame (advancing_state stays 1)"
        },
        {
          "stage": 2,
          "name": "The Forgeries Spread",
          "act": "rising-action",
          "stakes": "the false detail is now load-bearing; trust starts to cost",
          "adventures": ["boundless-library", "the-proving-grounds"],
          "world_state_delta": "advancing_state → 3; forged citations and gamed scores are everywhere"
        },
        {
          "stage": 3,
          "name": "Into the Caves",
          "act": "climax",
          "stakes": "every failure-mode at once; hold the line or the Realm runs on lies",
          "adventures": ["keep-on-the-borderlands"],
          "world_state_delta": "advancing_state peaks at 4, then is pushed back to 2 by the mapping (a cost paid, not a clean win)"
        }
      ],

      // --- THROUGHLINES: planted-and-paid-off across adventures (§1.5) ---
      "throughlines": [
        {
          "id": "the-true-small-source",
          "motif": "a humble dog-eared true tome / one honest line of code",
          "appears_in": ["forge-of-endless-diffs", "boundless-library", "the-proving-grounds"],
          "payoff": "the recurring lesson that the real answer was smaller and true; re-render the SAME tome each time"
        },
        {
          "id": "the-disciplines-sigil",
          "motif": "the calm green CI-rune (The Disciplined's sigil)",
          "appears_in": ["forge-of-endless-diffs", "keep-on-the-borderlands"],
          "payoff": "the green rune flares back along the wall when the line holds at dawn"
        }
      ],

      // --- ORDERING: the canonical reading/render order of the whole campaign ---
      "adventure_order": [
        "forge-of-endless-diffs",
        "boundless-library",
        "the-proving-grounds",
        "keep-on-the-borderlands"
      ]
    }
  ]
}
```

### 2.3 Worked example: a real mini-arc from OUR adventures

**"The Failure-Modes Saga" (above) is built entirely from existing, verified data**, not invented
content:

- **The recurring villain is real.** The **Confabulator** already appears as a bestiary monster in
  `forge-of-endless-diffs`, `boundless-library`, `dreaming-atelier`, `keep-on-the-borderlands`, and
  `the-proving-grounds` (5 adventures; verified, §2.5). The campaign layer doesn't add it; it
  **names its through-line**: foreshadowed at the edge of the Forge (`forge` beat bible already has
  `"bigbad_silhouette": "the Confabulator…"` and a `bigbad_foreshadow`), it grows in the Library
  (the forged-citation monster *is* the Confabulator: its beat-card name "Veldrix Falsewright" is a
  costume on the same persona id, which `boundless-library.bestiary` confirms is `confabulator`, not
  a separate sheet) and the Proving Grounds (Goodhart's memorized answers are confabulation in a
  crown), and is finally confronted in the **Borderlands** Caves of Chaos, where `confabulator` is
  in the bestiary alongside every other monster. **Modeling note:** the campaign layer keys on
  **persona ids**, not the per-adventure narrative names; one id (`confabulator`) wears many guises
  (Veldrix in the Library, the smiling false-detail figure in the Forge), and the `guises` field
  (§2.2) records them so references stay build-checkable without losing the flavor.
- **The arc shape is real.** Forge (a single team's argument) → Library + Proving Grounds (the
  forgery/gaming spreads, stakes rise) → Borderlands (the boss-rush finale that gathers the whole
  bestiary) is an exposition → rising-action → climax ladder over adventures the project already
  shipped.
- **The factions are a renaming, not an invention.** "The Disciplined" = the heroes who already
  win each adventure by holding a discipline (Ponytail's YAGNI restraint, Elicit's verify-the-
  source, Helm's held-out test, Garak's probe-first). "The Confabulant Court" = the failure-modes
  that already recur. Both map to existing persona ids.
- **The throughline is real.** "The real source was smaller, and true" is a line that *already*
  closes the Library beat ("The real source was smaller, and true"); the campaign layer asks us to
  **re-render the same dog-eared true tome** in the Forge resolution and the Proving Grounds
  laurel-moment, turning three separate morals into one rhyming motif.

A second candidate arc that's equally grounded (not written out, but flagged as the obvious next
one): **the Runaway/Paperclip arc**: `paperclip` and `autogpt` recur across `self-winding-
labyrinth`, `keep-on-the-borderlands`, and `the-round-table…`; `sydney` across `hall-of-echoes`
and `borderlands`. The Borderlands finale is the natural convergence point for *both* arcs, which
is exactly how a campaign's threads braid at the climax.

### 2.4 Optional, non-breaking back-references

If we want the site to surface "part of *The Failure-Modes Saga*" on an adventure, add **one
optional field** to `adventures.json` (mirrors how `record.note` optionally links a row to a note
in the sibling jeffpinto-site project; a known, low-risk pattern):

```jsonc
{ "id": "forge-of-endless-diffs", "...": "...",
  "campaign": "the-failure-modes-saga", "arc_stage": 1 }   // both optional; absent = standalone
```

The campaign is still authored *once* in `campaigns.json`; this is only a convenience pointer for
rendering. Keep `campaigns.json` the source of truth for ordering/stages to avoid two places to
edit.

### 2.5 Provenance of the worked example (so a future session can re-verify)

The recurring-entity graph was computed, not assumed:

```bash
node -e 'const a=require("./data/adventures.json").adventures;const s={};
for(const adv of a)for(const r of ["party","npcs","bestiary"])for(const id of adv[r]||[])
(s[id]=s[id]||[]).push(adv.id);Object.entries(s).filter(([,v])=>v.length>1)
.sort((x,y)=>y[1].length-x[1].length).forEach(([k,v])=>console.log(k,v.length,v.join(",")))'
```

Output (entities in >1 adventure): `confabulator 5`, `vibe-coder 4`, `sycophant 4`,
`over-engineer 3`, `autogpt 3`, `devin 2`, `paperclip 2`, `sydney 2`, `grandma-exploit 2`,
`tay 2`. The beats↔adventures bridge: `beats[].adventure` (full name) === `adventures[].name`;
beats carry short ids, adventures carry slug ids.

---

## 3. How the layer feeds cross-media consistency

The project already injects a **per-adventure bible** + a **per-frame moving set** into every
image/video prompt (`dm-consistency-craft.md` §4). The campaign layer slots in **above** the
adventure bible as a third, outermost prepend. The injection order, outermost → innermost, becomes:

```
[CAMPAIGN]  (from campaigns.json; written once per campaign, identical across all its adventures)
[ADVENTURE] (from style-c/<adventure>.json bible; the §3.1 record; once per adventure)
[FRAME]     (from beats.json card; the small moving set; per card)
+ the card's own scene prose
```

### 3.1 What each tier owns (the split that prevents drift)

| Tier | Injected how often | Owns (examples) | Why it lives here |
|---|---|---|---|
| **Campaign** | once per campaign, into *every* beat of *every* adventure in it | `theme`, campaign `tone`, `world.name`/`premise`/`fixed_anchors`, the **faction sigils**, the **recurring antagonist silhouette + its current escalation level**, the active **throughline motifs**, `world.advancing_state.value` | These must be *identical across adventures* or the saga fractures; same villain face in adventure 1 and 4, same world, same north-star tone |
| **Adventure** | once per adventure, into every beat of it | `setting`, `setting_aspects`, `establishing_anchor`, `palette`, per-adventure `recurring_cast`, `recurring_motifs` (`dm-consistency-craft.md` §3.1) | Specific to one location/episode; changes between adventures by design |
| **Beat / card** | per card | `arc_position`, `time_marker`, `escalation_cue`, `callbacks[]`, `is_ring_close` (§3.2 of that doc) | The only things that move frame-to-frame |

### 3.2 The campaign prepend block (template)

Built purely from the §2.2 fields; sits before the adventure's `[WORLD]/[LOOK]` block. Keep it to a
few hundred characters; trim to prompt budget.

```
[SAGA] {campaign.name}: {world.premise} Theme: {theme}. Tone: {tone joined}.
[CANON] Always true: {world.fixed_anchors joined}. World-condition level: {advancing_state.name} = {value}/{max}.
[FACTIONS] {for each faction: name} carry {sigil}; {protagonist faction} are the heroes, {antagonist faction} the failures.
[ARCH-VILLAIN] {recurring_antagonist.name}: silhouette {silhouette}; DO NOT redesign across adventures. Escalation here: {derived from arc_stage}.
[THREAD] Re-render identically when present: {active throughline motifs}.
```

**Worked example: the `[SAGA]` block injected into *every* beat of the Confabulator arc:**

```
[SAGA] The Failure-Modes Saga: a world where every craft is performed by summoned agents and every
discipline has a matching damnation. Theme: discipline vs. confabulation. Tone: heroic, cautionary,
deadpan-comedic.
[CANON] Always true: agents are summoned not born; the good ones hold a discipline, the monsters are
that discipline's failure; painterly Obsidian/WotC house look. World-condition level: the
Confabulation = 1/5 (rising).
[FACTIONS] The Disciplined carry a calm green CI-rune; The Confabulant Court carry an over-ornate
false-citation glow. The Disciplined are the heroes, The Confabulant Court the failures.
[ARCH-VILLAIN] The Confabulator: a smiling figure woven from too-perfect false detail; DO NOT
redesign across adventures; keep this exact silhouette in Forge, Library, Proving Grounds, and the
Caves. Escalation here: foreshadow only, faint at frame's edge.
[THREAD] Re-render identically when present: the humble dog-eared true tome; the calm green CI-rune.
```

Then the existing adventure `[WORLD]/[LOOK]/[CAST]` block and the per-frame `[FRAME]` set append
below it, unchanged.

### 3.3 What this buys cross-media

- **Same villain across adventures (the core win).** The Confabulator's silhouette is injected from
  *one* campaign field into the Forge stills, the Library stills, *and* their Veo clips; so the
  monster that was a glow at the Forge's edge is recognizably the *same* thing the Library party
  unmasks, in image and in motion. Today nothing guarantees that; each adventure re-rolls it.
- **A legible escalation.** `arc_stage` → an escalation phrase drives the antagonist's prominence
  and the `advancing_state.value` cue, so the arc *visibly* rises across adventures, not just within
  one beat (the §1.2 "build the villain before the showdown" lesson, applied across episodes).
- **Cross-adventure callbacks become renderable.** A `throughline.motif` (the true tome, the green
  rune) is a campaign-level instruction to re-render the *same* prop in adventures that are
  otherwise unrelated; the strongest "same saga" signal a viewer gets when shorts are watched back
  to back on social.
- **One edit, everywhere.** Because the campaign block is authored once, changing the villain's look
  or the world-condition propagates to every beat and clip in the arc; the show-bible "single
  source of truth" property (§1.6), as data.

---

## 4. Phased adoption plan (fits the existing design phases)

Sequenced to ride the Video-Pipeline phases (`docs/VIDEO-PIPELINE.md`) and the consistency-craft
drop-in (`dm-consistency-craft.md` §6), newest work last. Each phase is independently shippable and
the build stays green if a later phase is skipped.

**Phase 0: Author the canon (no code).** Write `data/campaigns.json` with the **one** verified
mini-arc (the Confabulator saga, §2.3). Naming-only: every id already exists; no new personas, no
new adventures, no schema in the build yet. Deliverable: the file + this doc. *Unblocks everything
below; costs an afternoon.*

**Phase 1: Validate + reference-check (rides the build's existing integrity pass).** Teach
`scripts/build.mjs` to, *if `campaigns.json` exists*, assert that every id under `members`,
`recurring_antagonists`, `factions`, `arc_stages.adventures`, `throughlines.appears_in`, and
`adventure_order` resolves against `adventures.json` (persona ids and adventure ids); the same
referential-integrity discipline the build already enforces for `adventures.json`. Loud failure on a
dangling id; **absent file = skip, build stays green** (matches the project's "fail loud, but don't
invent assertions where there's no data" posture). No prompt wiring yet.

**Phase 2: Inject the campaign block (rides Video-Pipeline Phase 2, "character consistency").**
Phase 2 already adds per-character `visual` injection and the per-adventure bible prepend. Extend
the prompt builder to look up an adventure's campaign (via the §2.4 back-ref or a reverse lookup
over `campaigns.json`) and **prepend the §3.2 `[SAGA]` block above the adventure block** for both
image and video prompts. This is the payoff phase: the recurring villain and throughline motifs
start rendering identically across adventures and across still→clip. Verify the §3.3 wins in a real
render of two different adventures sharing the Confabulator.

**Phase 3: Arc-aware escalation + cross-adventure callbacks (rides Video-Pipeline Phase 3,
"stitch").** When stitching a beat into a social moment, use `arc_stage` to pick the antagonist's
escalation phrase and the `advancing_state.value` cue, and honor `throughline` callbacks so a prop
from an earlier adventure re-appears. Optional surfacing on the site: an arc strip ("Chapter 2 of
The Failure-Modes Saga") using the §2.4 back-references; purely presentational, no new source of
truth.

**Phase 4: Generalize + recurse.** Once the Confabulator arc is proven end-to-end, author the
second grounded arc (the Runaway/Paperclip thread, §2.3) and, if the boss-rush convergence works,
let **Keep on the Token Borderlands** be the shared finale of *both* arcs (it already gathers both
bestiaries). Then re-audit: are there adventures left genuinely standalone (e.g.,
`the-round-table…` polyphony piece) that should *stay* standalone? Not every adventure must join an
arc; over-fitting the whole roster into one saga would be the failure mode this very campaign warns
about.

---

## 5. Minimal-footprint summary (what we're actually adding)

- **One file:** `data/campaigns.json` (the campaign bible, as data).
- **One optional field** on `adventures.json` entries (`campaign` + `arc_stage`), non-breaking.
- **One new prepend tier** (`[SAGA]`) above the existing adventure/frame injection; reuses the
  machinery that already exists, one level up.
- **One build assertion** (referential integrity for campaign ids), skipped if the file is absent.
- **Zero new personas, zero new adventures** for the first arc; it's a renaming of links already
  in the data.

Everything above is grounded in the project's real adventures and the verified recurring-entity
graph; the only *invented* strings are the campaign/faction *names* (e.g., "The Failure-Modes
Saga," "The Confabulant Court"), which are labels for relationships that already exist in
`adventures.json` and are flagged as such.

---

## 6. Sourcing notes / honest limits

- **Fetched and quote-verified on-page:** Wikipedia *Campaign (gaming)*, *Adventure (role-playing
  games)*, *Forgotten Realms*, *Harpers (FR organization)*, *Bible (screenwriting)*, *Dungeons &
  Dragons: Honor Among Thieves*, *The Legend of Vox Machina*; D&D Beyond official *Lost Mine of
  Phandelver* ToC and *Appendix C: The Five Factions*; Sly Flourish *Focus Your Campaign* and
  *Build Resilient and Evolving Villainous Plots*; StudioBinder *Show Bible*, *Dan Harmon Story
  Circle*, *Freytag's Pyramid*; critrole.com *Campaign 1* and Variety on LoVM S2 (these last two
  via the upstream research pass; the season→arc mapping is primary-confirmed by Wikipedia +
  Variety).
- **Flagged secondary / fan-wiki / unfetchable (do not treat as primary):**
  - The **Critical Role five-arc spine**, the **Delilah Briarwood → Vecna seed-and-payoff**, and
    the **Emon→Whitestone relocation** come from the Critical Role **fan** wiki
    (criticalrole.fandom.com), which **returned HTTP 403** to direct fetch; quotes are from
    search-result snippets, not full-page reads. The *principles* (named arcs; villain seeded early
    and paid off late; world permanently altered between arcs) are corroborated across multiple
    community sources and by the official critrole.com arc boundaries, but the exact in-world detail
    is community-sourced.
  - The **Black Spider/Nezznar reveal** and **Redbrands/Glasstaff (= Iarno Albrek)** roles in Lost
    Mine are **fan-sourced**; the official D&D Beyond page gave the part *titles* and location list
    but the narrative body is paywalled, so the antagonist mechanics were not read from the primary
    text.
  - **Matt Colville's "Running the Game"** villain guidance (cited in §1.2 and in
    `dm-consistency-craft.md` §1.4) is **video-only, no transcript fetched**: attribute to the
    channel/episode, not a verbatim line.
  - **TV Tropes** on Honor Among Thieves (the "Ocean's Eleven vibe" heist read) **returned 403** : 
    search-preview color only, not a load-bearing citation.
  - **WotC DMG** campaign-building text was **not cleanly fetched** (only forum/wiki mirrors
    surfaced); Sly Flourish is the fetched substitute for the GM-craft claims.
- **Internal data claims are verified, not cited to the web:** the recurring-entity counts (§2.5)
  and the beats↔adventures id bridge were computed directly from `data/adventures.json` and
  `site/data/beats.json` in this session. **One seam surfaced during the self-review and is baked
  into the schema:** beat-card narrative names (e.g., "Veldrix Falsewright") are **not** persona
  ids; the only build-checkable id for that monster is `confabulator`. The campaign layer therefore
  references persona ids and records flavor names under `guises`; otherwise the Phase 1 referential
  assertion (§4) would reject the worked example, which would be self-refuting.
