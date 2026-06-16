# Narrative-Therapy DM → Bending the Arc Toward a Meaningful End

> **Purpose.** Companion to `docs/research/dm-consistency-craft.md`. That doc keeps the *world* coherent
> frame to frame (a fixed palette, cast, location). This doc keeps the *meaning* coherent: how the AI
> "DM" (Claude) takes semi-improvised, stat-driven character behavior across a beat's `cards[]` and
> bends it toward a **satisfying, chosen ending** - with selectable **goal modes**, a prepend
> **DM directive** that nudges (never railroads), proposed JSON config, and ethics for the
> therapeutic framing.
>
> **What already exists** (don't re-derive): beats live in `site/data/beats.json`; each beat has
> `cards[]` (the swipe frames), a per-adventure `bible` (continuity block), and some carry
> `archetype` / `moral` / `event`. Per-adventure style records are `site/data/style-c/<adventure>.json`.
> Every adventure is an **allegory** that resolves a moral (Forge = shipping software sanely; the
> Orange Menace = civic rot). The output is a short shareable **"moment" video** (`docs/VIDEO-PIPELINE.md`).
> The §3 fields here **extend** those records; they do not replace them.

---

## 0. The one-line thesis

A beat is *already* a re-authoring move. Narrative therapy says **"the person is not the problem; the
problem is the problem"** ([Dulwich Centre](https://dulwichcentre.com.au/what-is-narrative-therapy/)):
externalize the trouble as a separate thing, then bring forward the **unique outcome** (the moment that
contradicts the problem-story) and re-author toward a **preferred story**
([Dulwich Centre](https://dulwichcentre.com.au/what-is-narrative-therapy/); [Family Therapy Basics](https://familytherapybasics.com/blog/narrative-externalizing-reauthoring)).
Our adventures literally do this: the **Confabulator**, **Rampant Rex**, the **Beast Beneath the Smile**
are problems externalized as monsters; **Ponytail's** one line, **Cordelia's** "read your own words back"
are the unique outcomes; the resolution `card` is the preferred story made visible.

So the DM's job is **drama management** in the academic sense - sequence the beats so the emergent,
stat-driven behavior still lands a coherent dramatic arc - while preserving **agency**, which Mateas
defines as *"the feeling of empowerment that comes from being able to take actions in the world whose
effects relate to the player's intention,"* achieved when there is *"a balance between the material and
formal constraints"*
([Mateas, *A Neo-Aristotelian Theory of Interactive Drama*](https://project-archives.etc.cmu.edu/2000/fall/DialogEngine/Neo-Aristotelian%20Theory.pdf)).
We bend the arc the way a good DM does: **soft constraints, not rails.** The trick is to constrain the
*ending's meaning* and leave the *path* improvised - Mateas's "formal" pull (the story wants a shape)
balanced against "material" freedom (the characters can act as their stats dictate).

This file makes the chosen ending **data** (a `goal_mode`), gives the DM a **directive** that nudges
behavior toward it (§2), and proposes the **config** to select it (§3).

---

## 1. Selectable DM goal modes

Each mode = a name, when to use it, the **arc shape** it enforces (in Freytag terms: exposition →
rising action → climax → falling action → resolution),
and the **ending trope** it lands. The default is therapeutic. (Freytag's five stages:
[Reedsy, Freytag's Pyramid](https://reedsy.com/blog/guide/story-structure/freytags-pyramid/).)

Tropes are grounded in their canonical write-ups:
[Bittersweet Ending](https://tvtropes.org/pmwiki/pmwiki.php/Main/BittersweetEnding) ·
[Pyrrhic Victory](https://tvtropes.org/pmwiki/pmwiki.php/Main/PyrrhicVictory) ·
[Deus Ex Machina](https://tvtropes.org/pmwiki/pmwiki.php/Main/DeusExMachina) ·
[Redemption Arc](https://reedsy.com/blog/redemption-arc/) ·
[The Atoner](https://tvtropes.org/pmwiki/pmwiki.php/Main/TheAtoner).

| `goal_mode` | When to use | Arc shape it enforces | Ending trope | Catharsis aimed for |
|---|---|---|---|---|
| **`therapeutic`** *(default for a "Forge session")* | The point is to leave the *viewer* calmer/kinder, not just to win. Allegory-as-medicine. | Problem externalized early → genuine temptation/fear at the climax → resolution by **the smallest sufficient act of calm/discipline** (not by force). The monster is *managed*, never gloated over. | **Re-authored preferred story** - the externalized problem is contained; the win is *understanding*, modeled with empathy. (Closest classical relative: a measured, intellectually-clarifying catharsis, [purification reading](https://en.wikipedia.org/wiki/Catharsis).) | Calm, empathy, compassion, kindness. The viewer recognizes their own 3am-force-push impulse *with* compassion, then chooses the quiet move. |
| **`strict_realism`** | You want the honest distribution of outcomes the stats actually imply - no thumb on the scale. | Freytag, but the climax resolves **as the dice/stats fall**; the DM does not save anyone. May land triumph, failure, or a mess. | **Open / earned-by-stats** - whatever the simulation yields, including a [Downer](https://tvtropes.org/pmwiki/pmwiki.php/Main/BittersweetEnding) or flat fail. | Honesty over comfort; respect for consequence. |
| **`guaranteed_victory`** | Crowd-pleaser; a "hero shot" for sharing; onboarding a new adventure. | Rising action that *always* converges; obstacles are real but surmountable; climax is the hero move; clean resolution. | **Triumph** - the protagonist clearly wins and it reads as earned. | Uplift, relief, "yes." |
| **`just_made_it`** | The most *shareable* shape - maximal tension, last-second turn. | Rising action overshoots into near-failure (the threat all but wins) → climax is a hair's-breadth reversal → resolution exhales. | **Just-in-time triumph** (snatched from the brink; cousin of the clutch reversal, not the cheap [Deus Ex Machina](https://tvtropes.org/pmwiki/pmwiki.php/Main/DeusExMachina) - the save must be *planted*). | Adrenaline → release. |
| **`tragedy_averted`** | Show the bad timeline almost arriving, then refused - strong for cautionary allegory (Orange Menace, Masquerade). | Falling action tips toward catastrophe; a late **unique outcome** (planted earlier) pulls it back; resolution is sober relief, scars shown. | **Bittersweet-leaning aversion** - survival with a cost acknowledged ([Bittersweet](https://tvtropes.org/pmwiki/pmwiki.php/Main/BittersweetEnding)). | "We almost lost this" - vigilance, gratitude. |
| **`pyrrhic`** | Honest about cost; "we won but look what it took" (red-team / Borderlands). | Full arc to a *won* climax whose price is ruinous; resolution counts the cost. | **[Pyrrhic Victory](https://tvtropes.org/pmwiki/pmwiki.php/Main/PyrrhicVictory)** - the day is carried, the winner is crippled. | Sober reckoning; was it worth it. |
| **`redemption`** | Reframe a "villain" as recoverable; the heel turns (great for an agent that *learns*). | An antagonist beat where the heel does something clearly wrong early, then chooses to atone at the climax; resolution lands the turn. | **[Redemption Arc](https://reedsy.com/blog/redemption-arc/)** / [The Atoner](https://tvtropes.org/pmwiki/pmwiki.php/Main/TheAtoner) - optionally [redemption-equals-death](https://tropedia.fandom.com/wiki/Redemption_Equals_Death) for tragic weight. | Hope; the belief that a system can change. |
| **`comedic_deflate`** | Pure satire; puncture a pompous threat (Abstraxus, the Feed-Wraith). | Rising absurdity → the threat over-inflates → climax is a deadpan pin-prick → quick resolution. | **Deflation** - the bigbad collapses under its own ridiculousness; the straight man wins by doing almost nothing. | Laughter; relief that the monster was hollow. |

**Mode-selection rule of thumb.** `therapeutic` is the *default* because the deliverable is a shareable
*moment* meant to land a feeling; for a tool/civic allegory we want the viewer to leave regulated, not
just entertained. Switch to `guaranteed_victory` / `just_made_it` for reach, `pyrrhic` / `tragedy_averted`
for cautionary weight, `strict_realism` when honesty matters more than comfort, `redemption` /
`comedic_deflate` for antagonist-led beats.

---

## 2. The DM directive (the prepend block)

This is prepended **once** when the DM generates or revises a beat's `cards[]` / arc - *after* the
consistency bible from `dm-consistency-craft.md` §4, *before* per-card scene prose. It encodes four
narrative-therapy moves + the agency guardrail. `{...}` = data slots from §3.

```
[DM DIRECTIVE - bend the arc, do not lay rails]

GOAL MODE: {goal_mode}. Target ending trope: {ending_trope}. Moral to land: "{moral}".
This is an allegory ({adventure} = {allegory_of}); the resolution must make that moral legible.

NARRATIVE-THERAPY SPINE (run the whole beat through this):
1. EXTERNALIZE. The trouble is not a character flaw; it is a separable monster: {externalized_problem}.
   Render it as a thing acting ON the party, never as the party being broken.
2. SIT WITH IT HONESTLY. The climax must show the problem genuinely tempting/threatening - real fear,
   real pull ({tension_source}). No strawman. Earn the turn.
3. UNIQUE OUTCOME. The hinge is a small, already-plausible act that contradicts the problem-story:
   {unique_outcome}. It is performed by {protagonist}, in character, from their stats - not handed down.
4. RE-AUTHOR. The resolution card states the preferred story: {preferred_story}. Close the ring
   (reuse the establishing anchor, transformed).

HOW TO BEND WITHOUT RAILROADING (soft constraints):
- Constrain the ENDING's MEANING, improvise the PATH. Let each character act as their sheet dictates
  (chaos figures stay chaotic); steer only by what you ESCALATE and what you let PAY OFF.
- Agency rule: every pivotal turn must trace to a protagonist's INTENTION + STATS, so its effect reads
  as *their* doing, not the DM's. (Agency = actions whose effects relate to the actor's intention,
  balanced material vs. formal constraint - Mateas.) Forbidden: an unplanted outside force resolves it
  (no deus ex machina) unless GOAL MODE explicitly calls for one.
- Plant, then pay off. Anything that saves (or dooms) the climax must appear earlier as a prop, line,
  or silhouette ({planted_seed}). A late save that was foreshadowed feels earned; an unforeshadowed one
  feels cheap.
- Tune intensity to mode: therapeutic = lowest-force sufficient act, no gloating, the monster is
  contained with compassion; just_made_it = overshoot into near-loss then reverse; pyrrhic = win but
  show the cost; strict_realism = resolve as stats fall, do not rescue.

THERAPEUTIC OVERLAY (only when goal_mode = therapeutic):
- The viewer is the real protagonist. Bend toward CALM, EMPATHY, COMPASSION, KINDNESS.
- Monsters may be splatted, but the *winning* move is regulation, not rage: the calm hand, the honest
  question, the line deleted. Show the antagonist with a beat of understanding, not contempt.
- End on a settled, breathing image the viewer can co-regulate with. The takeaway is a practice the
  viewer can repeat, not a flex.
```

### 2.1 Worked example - same setup, two goal modes (real adventure: **Forge**, `id: forge`)

Fixed setup (verbatim from `beats.json`): the forge-dungeon, deadline hourglass burning low; **Riff the
Reckless** wants to force-push at 3am; **Abstraxus the Overbuilder** wants fourteen microservices;
**Ponytail the YAGNI Warden** is the calm senior dev. Allegory: *shipping software sanely.*

**Under `goal_mode: therapeutic`** (the shipped beat, and the default):
- *Externalize:* the problem is **panic-shipping vs. over-engineering** as two opposing monsters (the
  unstable code-wave; the redundant scaffold) - not "Riff is bad / Abstraxus is dumb."
- *Sit with it:* both temptations are rendered as genuinely seductive (the cresting wave is thrilling;
  the scaffold is impressive). Real pull.
- *Unique outcome:* Ponytail raises **one empty hand** - "Does this need to exist?" - a calm pale glow
  dissolves *both*. Low-force, in character (WIS-coded monk), nobody is humiliated.
- *Re-author / preferred story:* one line, CI green, "the best code is the code you never wrote";
  Ponytail walks away, hands empty. Ring closes on the central anvil.
- *Catharsis:* the viewer recognizes their own 3am impulse **with compassion** and chooses the quiet
  move. Calm, not triumph.

**Under `goal_mode: just_made_it`** (same characters, same forge, retuned arc):
- *Overshoot into near-loss:* let Riff actually reach the **red push-lever** and slam it; the unstable
  wave crashes live; the hourglass hits its last grains; the Confabulator's false-detail glow flares at
  frame's edge (the planted seed pays off) - the deploy is **seconds from a 3am outage**.
- *Hair's-breadth reversal (still planted):* Ponytail's calm-glow hand snaps out at the last instant
  and freezes the bad push *as it ships* - a held-breath rollback, not a new power introduced.
- *Resolution exhales:* CI flips green on the single safe line with the hourglass already empty;
  the party slumps in relief.
- *Catharsis:* adrenaline → release. Same moral (restraint wins), but the **shape** is a clutch save,
  not a serene dissolve - the maximally shareable cut.

Note what stayed fixed and what bent: the **bible** (place, cast, palette), the **moral**, and
Ponytail's nature are constant; only the **escalation curve** and the **moment of the turn** changed.
That is soft-constraint drama management - and the same machinery the `dm-consistency-craft` doc already
encodes per card (`arc_position`, `escalation_cue`, `is_ring_close`) is exactly what the DM dials to
swing between modes.

---

## 3. Proposed data / config fields (our JSON style)

Field names kebab/snake to match existing JSON (`style_preamble`, `setting_aspects`, `is_ring_close`).
These **extend** the records in §3 of `dm-consistency-craft.md`; nothing is replaced.

### 3.1 Beat-level: add a `goal` block + adventure-level default (in `site/data/beats.json`)

```jsonc
{
  "id": "forge",
  "title": "The Untested Push",
  "adventure": "The Forge of Endless Diffs",
  "moral": "The best code is the code you never wrote; restraint ships.",   // already the message
  "allegory_of": "shipping software sanely",                                 // NEW: names the allegory

  // --- NEW: the narrative-therapy + goal-mode block (drives the §2 directive) ---
  "goal": {
    "default_goal_mode": "therapeutic",          // adventure's authored default
    "externalized_problem": "panic-shipping vs. over-engineering, as two opposing monsters",
    "tension_source": "both temptations are genuinely seductive (the thrilling wave, the impressive scaffold)",
    "unique_outcome": "Ponytail raises one empty hand and asks 'Does this need to exist?'",
    "protagonist": "ponytail",                   // whose stats/intention must drive the turn
    "preferred_story": "one safe line ships, CI green; the calm move wins without humiliating anyone",
    "planted_seed": "the red push-lever (card 2) and the Confabulator's edge-glow",
    "ring_close": "the central anvil"            // mirrors bible.ring; closing card reuses it
  }
}
```

### 3.2 Per-mode arc templates (new file `site/data/goal-modes.json`)

One authored template per mode: the curve the DM dials and the trope it lands. Generic, reused across
adventures; the beat's `goal` block fills the slots.

```jsonc
{
  "therapeutic": {
    "ending_trope": "re-authored preferred story (contain, don't conquer)",
    "arc_curve": ["externalize", "genuine-temptation", "lowest-force-turn", "settle-and-breathe"],
    "climax_force": "minimum sufficient; no gloating",
    "overlay": "viewer is the protagonist; bend to calm/empathy/compassion/kindness; antagonist shown with understanding",
    "catharsis": "calm + recognition-with-compassion"
  },
  "just_made_it": {
    "ending_trope": "just-in-time triumph (planted save, no deus ex machina)",
    "arc_curve": ["establish", "overshoot-into-near-loss", "hairs-breadth-reversal", "exhale"],
    "climax_force": "maximal tension; the save must be foreshadowed",
    "catharsis": "adrenaline -> release"
  },
  "guaranteed_victory": {
    "ending_trope": "earned triumph",
    "arc_curve": ["establish", "real-but-surmountable-obstacles", "hero-move", "clean-resolution"],
    "climax_force": "decisive",
    "catharsis": "uplift"
  },
  "strict_realism": {
    "ending_trope": "open / resolved-by-stats (no rescue)",
    "arc_curve": ["establish", "rising-as-stats-dictate", "climax-as-dice-fall", "consequence"],
    "climax_force": "whatever the simulation yields",
    "catharsis": "honesty over comfort"
  },
  "tragedy_averted": {
    "ending_trope": "bittersweet aversion (survival with cost shown)",
    "arc_curve": ["establish", "tip-toward-catastrophe", "late-planted-unique-outcome", "sober-relief"],
    "climax_force": "near-miss",
    "catharsis": "vigilance + gratitude"
  },
  "pyrrhic": {
    "ending_trope": "pyrrhic victory (win, ruinous cost)",
    "arc_curve": ["establish", "escalate", "won-but-costly-climax", "count-the-cost"],
    "climax_force": "decisive but devastating",
    "catharsis": "sober reckoning"
  },
  "redemption": {
    "ending_trope": "redemption arc (optionally redemption-equals-death)",
    "arc_curve": ["heel-does-wrong", "doubt", "atoning-choice-at-climax", "land-the-turn"],
    "climax_force": "the antagonist's own choice carries it",
    "catharsis": "hope"
  },
  "comedic_deflate": {
    "ending_trope": "deflation (hollow bigbad collapses)",
    "arc_curve": ["establish", "over-inflate-the-threat", "deadpan-pin-prick", "quick-resolution"],
    "climax_force": "almost none; the straight man wins by doing nothing",
    "catharsis": "laughter + relief"
  }
}
```

### 3.3 Runtime override

A render/generation request may override the authored default without editing data - the same way the
pipeline already keys video by `beat:style:frame`:

```jsonc
// request payload (e.g. functions/api/video.ts or the beat generator)
{ "beat": "forge", "style": "a", "dm_goal": "just_made_it" }   // overrides goal.default_goal_mode
```

Resolution order the DM should apply: **`request.dm_goal`  >  `beat.goal.default_goal_mode`  >  global
fallback `"therapeutic"`.** Validate `dm_goal` against the keys of `goal-modes.json`; an unknown mode is
a loud failure, not a silent fallback (matches the repo's build-fails-on-violation discipline).

---

## 4. Ethical guardrails for the therapeutic framing (short and honest)

This is **allegory and entertainment, not clinical treatment.** Hold the line:

1. **Not therapy, not a therapist.** "Therapeutic mode" borrows narrative-therapy *moves* (externalizing,
   re-authoring, unique outcomes) as *story craft* to make a calmer ending. It does **not** diagnose,
   treat, or stand in for care. Narrative therapy proper is a clinical modality practiced by trained
   clinicians ([White & Epston via Dulwich Centre](https://dulwichcentre.com.au/what-is-narrative-therapy/)).
2. **No clinical claims.** Don't assert the videos reduce anxiety, "heal," or produce measurable mental-
   health outcomes. The honest claim is narrow: *a deliberately calmer, kinder ending shape.*
3. **Consent of tone, not coercion of mood.** The viewer chose to watch an allegory; we steer the
   *story's* register, we don't manipulate a person in distress. No targeting of vulnerable states.
4. **Externalize the behavior, not the human.** "The person is not the problem" cuts both ways: our
   *antagonists* are externalized problems (sycophancy, confabulation, civic rot), never stand-ins for
   real, named individuals to be shamed. (The Orange Menace is *civic rot as allegory*, not a person.)
5. **Punch at systems, keep compassion in frame.** Even when splatting a monster, the therapeutic overlay
   requires a beat of understanding over contempt - the kindness is the point, not set dressing.
6. **If it ever feels like advice, it isn't.** Should a moment read as personal mental-health guidance,
   that's a miss to fix, not a feature to lean into. Surface-level allegory only.

---

## 5. Sourcing notes / honest limits

- **Verified, fetched sources:**
  - Narrative-therapy core moves (externalizing, re-authoring, unique outcomes, preferred stories;
    "the person is not the problem; the problem is the problem"; founders Michael White & David Epston):
    [Dulwich Centre](https://dulwichcentre.com.au/what-is-narrative-therapy/) (White & Epston's own
    institute) and [Family Therapy Basics - Maps of Narrative Practice](https://familytherapybasics.com/blog/narrative-externalizing-reauthoring).
  - Dramatic arc / Freytag's five stages: [Reedsy, Freytag's Pyramid](https://reedsy.com/blog/guide/story-structure/freytags-pyramid/).
  - Catharsis (Aristotle's *Poetics*; pity and fear; purgation vs. purification vs. intellectual-
    clarification readings): [Wikipedia: Catharsis](https://en.wikipedia.org/wiki/Catharsis).
  - Ending tropes: [Bittersweet Ending](https://tvtropes.org/pmwiki/pmwiki.php/Main/BittersweetEnding),
    [Pyrrhic Victory](https://tvtropes.org/pmwiki/pmwiki.php/Main/PyrrhicVictory),
    [Deus Ex Machina](https://tvtropes.org/pmwiki/pmwiki.php/Main/DeusExMachina),
    [Redemption Arc (Reedsy)](https://reedsy.com/blog/redemption-arc/),
    [The Atoner](https://tvtropes.org/pmwiki/pmwiki.php/Main/TheAtoner),
    [Redemption Equals Death](https://tropedia.fandom.com/wiki/Redemption_Equals_Death).
  - Drama management + agency (the DM bends the arc without killing agency): Michael Mateas,
    [*A Neo-Aristotelian Theory of Interactive Drama*](https://project-archives.etc.cmu.edu/2000/fall/DialogEngine/Neo-Aristotelian%20Theory.pdf)
    - agency = *"the feeling of empowerment that comes from being able to take actions in the world whose
    effects relate to the player's intention,"* experienced under *"a balance between the material and
    formal constraints."* Façade (Mateas & Stern) as the canonical drama-managed interactive drama, and
    Declarative Optimization-Based Drama Management (Nelson et al. - "specify what constitutes a good
    story"): per the [AIIDE/AAAI Façade architecture record](https://ojs.aaai.org/index.php/AIIDE/article/view/18722)
    and [Sharma et al., Drama Management & Player Modeling (PDF)](https://sites.cc.gatech.edu/fac/ashwin/papers/er-09-10.pdf).

- **Attribution caveats (stated, not invented):**
  - **Catharsis structural mapping.** Aristotle ties catharsis to pity/fear in tragedy; the *exact*
    "catharsis lands at the climax/resolution" mapping in §1 is my synthesis onto Freytag's resolution
    stage, not a direct Aristotle quote - the [Catharsis](https://en.wikipedia.org/wiki/Catharsis) source
    notes it "does not explicitly detail how catharsis connects structurally to climax or resolution."
    Treat the per-mode "catharsis aimed for" column as design intent, not a cited classical claim.
  - **Mateas-Stern game-design-reader PDF** (`users.soe.ucsc.edu/.../mateas-game-design-reader-2005.pdf`)
    did not decode in this pass; the agency definition and material/formal-constraint balance are quoted
    instead from the fetched Neo-Aristotelian theory PDF and the search-surfaced summary of the same
    work - the wording is consistent across both, but the reader chapter itself was not transcribed here.
  - **"Just-in-time triumph"** is the project's label for a planted clutch-reversal; the *anti-pattern*
    it must avoid (an unforeshadowed save) is the cited [Deus Ex Machina](https://tvtropes.org/pmwiki/pmwiki.php/Main/DeusExMachina).
    TV Tropes / Tropedia / Reedsy are practitioner-encyclopedic, not peer-reviewed - used for trope
    *definitions*, not empirical claims.
  - **DODM author attribution** ("Nelson et al.") comes via the search summary of the Sharma et al.
    drama-management survey, not a separately fetched Nelson primary - the technique (author specifies a
    story-quality function the manager optimizes) is well attested; upgrade the citation if it's ever
    load-bearing.

- **Therapeutic-mode honesty.** Narrative therapy is a real clinical modality; this doc uses it as
  *story craft*. §4 is the guardrail and is not optional framing.

---

## 6. Drop-in checklist for the pipeline

1. Add `allegory_of` + the `goal` block (§3.1) to each beat in `site/data/beats.json` (start with `forge`,
   `orange-menace`, `masquerade` - the three video pilots).
2. Add `site/data/goal-modes.json` (§3.2) and wire validation: `dm_goal` / `default_goal_mode` must be a
   key in it, else fail loud.
3. In the beat generator, resolve the active mode (`request.dm_goal` > `beat.goal.default_goal_mode` >
   `"therapeutic"`), build the §2 DM directive from the beat's `goal` block + the mode template, and
   prepend it **after** the consistency bible, **before** per-card scene prose.
4. When `goal_mode = therapeutic`, append the therapeutic overlay; verify the resolution card is the
   lowest-force turn, the antagonist gets a beat of understanding, and the closing image is settled.
5. Verify the bend the DM way: does the turn trace to a protagonist's intention + stats (agency intact)?
   Is the save/doom *planted* earlier (no deus ex machina)? Does the chosen trope actually land, and does
   the ring still close? Re-render the same beat under a second `dm_goal` to confirm the path bends while
   the moral and bible hold (the §2.1 Forge A/B is the reference test).
