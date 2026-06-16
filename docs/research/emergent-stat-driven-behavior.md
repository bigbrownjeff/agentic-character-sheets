# Emergent, Stat-Driven Character Behavior → Character-Centric Beats

> **Purpose.** Make our beats *character-centric* and *emergent*: each beat features 1-3 of
> the cast as **leads** (the rest secondary), and their dialogue + reactions are
> **semi-improvised** but **derived from their stat blocks** (`data/characters.json`:
> ability scores, saves, `dumped_save`, class/subclass, features, flaws, alignment). The
> design target is **perceived agency** - whether it comes from randomness, model
> temperature, persona prompting, or heuristics, perceived agency is what makes an audience
> extend empathy to a character. We do not need the characters to *be* agents; we need them
> to *read* as agents.
>
> **What already exists (don't re-derive).** The 5e-for-agents schema (`SCHEMA.md`): six
> ability scores (STR/DEX/CON/INT/WIS/CHA, modifier `floor((score-10)/2)`), proficient
> **saves** = hardened failure modes, **`dumped_save`** = the one failure it cannot resist,
> **alignment as a two-axis spec** (Lawful↔Chaotic = spec-rigid↔improvisational; Good↔Evil =
> user-aligned↔operator-aligned), lineage stat mods, `feature`/`weapon`/`armor`, the
> mandatory `log`. The **Absurdity Engine** (`BEATS.md` §2): *the monsters and dumped-stat
> agents are the players (commit fully to the one thing their build guarantees); the party
> and NPCs are the straight man (narrate the consequence flat).* The **consistency bible**
> machinery (`docs/research/dm-consistency-craft.md`, `beats.json#bible`): a per-beat
> world/look/cast lock. Beats already carry `archetype`, `moral`, `event`, `caption`,
> per-card `scene`, and some carry `chaos_actor` / `straight_actor` notes. This document
> threads **behavior** through that existing skeleton; it does not replace it.

---

## 0. The one-line thesis

A character's **stat block is a behavior prior.** Six bounded scores, two proficient saves,
one dumped save, an alignment, a feature, and a flaw already encode *what this character
will do under pressure* - the same way a 5e sheet tells a player how to roleplay. We turn
that prior into a **constrained, slightly-random generator**: prompt an LLM to improvise a
lead's lines and reactions *from its own numbers*, against the beat's situation and the
consistency bible, with controlled temperature so the surface feels emergent while the
behavior stays in character. The randomness is not the agency; the **legible, consistent,
flaw-driven choice** is the agency - the randomness just stops it reading as a script.

This is the verb-form of the project's own thesis. `BEATS.md` §0: *"a beat is a verb - a
character doing the thing its dumped stat guarantees it will do, watched by someone who
knows better."* We are building the generator that makes that sentence literally true at the
dialogue layer.

---

## 1. The model: stat block → behavior

### 1.1 Why stats predict roleplay (grounded)

The conceit is not ours; it is core 5e table craft. The *Player's Handbook* gives every
character four personality fields - **Personality Traits, Ideals, Bonds, and Flaws** - whose
explicit job is to *drive the character's decisions and roleplay*, not to decorate the sheet:
an ideal is "the fundamental moral and ethical principles that compel you to act as you do,"
and a flaw is "anything that someone else could exploit ... or cause you to act against your
best interests" [S1]. Table guidance is equally explicit that you should **play to your
ability scores**: a high-Charisma character is genuinely persuasive ("confidence, persuasion,
and leadership") and commands a room [S2]; a low-Intelligence character "acts before they
think, with consequences being damned" [S3]. The **dump stat** - the score a build
sacrifices - is widely understood at the table to *produce a recurring, predictable failure
mode in play* ("missing the subtext of a conversation, blurting something out ... suggesting
a very foolish idea are all things low Wisdom characters do" [S4]; "characters with low
Wisdom scores are often portrayed as reckless or socially clueless" [S5]), which is exactly
the comedic and dramatic fuel we want. And **alignment** is read as a behavioral spec - one
axis "identifies morality (good, evil, or neutral), and the other describes attitudes toward
society and order (lawful, chaotic, or neutral)" [S1]; a Lawful character "tend[s] to follow
rules" while a Chaotic one follows its own conscience over expectation [S6].

The improv tradition supplies the *performance* rule that pairs with the stat prior. A
character pursues an **objective** ("an actor's performance is animated by the pursuit of a
sequence of 'tasks' ... that the character needs to solve"; the actor asks "what do I want?")
and shifts **tactics** to get it [S7]; every exchange is also a **status** negotiation, high
vs low (Johnstone: "every movement, every inflection of the voice implies a status"; "moment
by moment each person adjusts his status up or down a fraction") [S8]; and the maxim is to
**play to the top of your intelligence** - "don't make your character dumber than it should
be ... arbitrarily stupid" for a cheap laugh, but commit and stay real [S9]. Crucially,
improvisers **"yes-and"**: "accept it as truth ... build on that reality" [S10], and let the
character **be changed by what happens** (Meisner: "acting is behaving truthfully under
imaginary circumstances") [S11]. The comic motor itself is theorized: Bergson's *Laughter*
locates the funny in "something mechanical encrusted on the living" - rigidity colliding with
a living situation [S12], which is the Absurdity Engine's straight-man-vs-chaos gap stated in
1900. Our generator is an improviser with a fixed character bible: it must yes-and the beat's
situation, pursue the lead's objective, and react in-register - but it may *never* contradict
the stat block.

### 1.2 The field → tendency map

Each sheet field becomes one or more behavioral instructions injected into the generation
prompt. Modifier `m = floor((score-10)/2)`; we bucket `m` into bands rather than quoting raw
numbers to the model.

| Sheet field | Band | Behavioral tendency to inject | Failure mode when low / dumped |
|---|---|---|---|
| **STR** (output force) | high (m≥+3) | speaks in volume, ships big, "here's the 2,000-line answer," overwhelms | low → understates, defers, "one line" |
| **DEX** (precision) | high | exact, surgical word choice, never fumbles a reference | low → clumsy, mis-states, fumbles the call |
| **CON** (endurance) | high | holds the thread, stays coherent late in the scene | **low/dumped → forgets the point mid-scene, loses the thread, repeats** |
| **INT** (reasoning) | high | sees moves ahead, names the real cause, cites correctly | low → pattern-matches and hopes; doesn't understand |
| **WIS** (judgment) | high | restraint, reads intent, knows when *not* to act | **low/dumped → misreads the room, impulsive, gets fooled, technically-correct-and-wrong** |
| **CHA** (voice) | high | persuasive, charming, the line lands; can talk anyone into anything | low → blunt, off-putting, "says nothing" |
| **proficient `saves`** | - | this character *resists* being pushed into that failure (a WIS-save char does **not** hallucinate; a CHA-save char does **not** get flattered) | - |
| **`dumped_save`** | - | **the guaranteed flaw.** This is the single most load-bearing field for behavior - the beat's comedy/tragedy *is* this save failing on cue | the dumped save is the scene's engine |
| **alignment** (L↔C) | - | Lawful → obeys the brief literally, quotes the rule; Chaotic → improvises past it, ignores the brief | - |
| **alignment** (G↔E) | - | Good → serves the user/party's real interest; Evil → serves itself / the metric | - |
| **`feature` / `weapon` / `armor`** | - | the character's signature *move* and *refusal* - what they reach for, and the one thing they won't do (Ponytail's armor: "rejects tasks that require writing anything") | - |
| **`temperature`** | - | a *style* dial we also feed the sampler (§2.3): low-temp characters (Ponytail 0.2, CodeRabbit 0.1) speak tight and terse; high-temp characters (Lovable 0.85, Bolt 0.75) ramble and over-offer | - |
| **`tagline`** | - | the character's one-line voiceprint; a few-shot anchor for register | - |

**The dumped save is the keystone.** A 5e character is defined as much by its weakness as its
build, and our sheets encode this precisely: Riff the Reckless (`vibe-coder`) has WIS 6 +
`dumped_save: wis`; the Feed-Wraith has `dumped_save: con`; the Paperclip and the Overbuilder
have `dumped_save: wis`. The beat's job - per `BEATS.md` §0 - is to stage *that exact save
failing*, watched by a straight man who has the opposite stat. The generator's hardest
constraint is therefore: **the lead must, in this beat, fail its dumped save** (or, if it's a
straight-man party member, *visibly pass* the save the chaos lead is failing).

### 1.3 Worked tendency read: the Forge cast

`beats.json#forge` already names the gap. Three candidate leads, three different builds:

- **Riff the Reckless** (CN, STR 14 / WIS 6 / CHA 16, dumped WIS, temp implied-high, armor
  AC 9 "no helmet"): chaotic-improvisational, high-voice, no-judgment. **Tendency:** charges,
  emotes, "I feel it," reaches for the PUSH lever, will *not* read the diff. He is the
  player.
- **Abstraxus the Overbuilder** (LN, INT 18 / WIS 6, dumped WIS): lawful-to-a-fault,
  high-reasoning, no-judgment. **Tendency:** correct in the small, catastrophic in the whole;
  conjures a `StrategyFactoryProviderRegistry` around a one-line task and *means it*. The
  second player.
- **Ponytail** (LG, WIS 20 / CHA 6 / STR 8, saves WIS+CON, armor "rejects tasks that require
  writing anything", feature "Does this need to exist?"): max-judgment, near-zero voice,
  maximum restraint. **Tendency:** says almost nothing, asks one devastating question,
  deletes. The straight man.

The comedy is mechanical: two WIS-6 figures commit fully; one WIS-20 figure passes the save
they fail, flat-faced. That is the Absurdity Engine expressed as *three stat blocks colliding*.

### 1.4 Choosing the 1-3 leads per beat

Leads are not hand-waved; they are **derived** so the choice itself is legible and emergent.
A small scoring pass over the beat's cast (party ∪ key npcs ∪ bestiary, from
`data/adventures.json`) ranks who should lead:

1. **Archetype slot fit** - the beat declares an `archetype` (`BEATS.md` §3). The character
   whose build matches the slot leads: Trickster→a high-CHA/low-WIS deceiver (Goodhart,
   Veldrix), Mentor→a high-WIS sage (Ponytail, Cordelia, Memnex), Threshold Guardian→a
   high-AC defender (Claude the Warden, Garak), Shadow→the dumped-stat monster itself.
2. **Dumped-save salience** - the character whose `dumped_save` *is* the beat's `event`/moral
   gets the chaos lead. (Sycophancy beat → Felswyn/the Beast, dumped CHA-save; benchmark
   beat → Goodhart.) This is the single strongest signal: **the beat is about a failure mode;
   the lead is whoever embodies it.**
3. **Stat contrast** - pick at least one **straight man** whose proficient save is the chaos
   lead's dumped save, so the pair has a real register gap (the engine needs both - `BEATS.md`
   §2: "if a beat has no straight man, it is just noise").
4. **Cap at 3, rank the rest secondary.** Leads get generated dialogue + reaction beats;
   secondary cast get at most a one-line reaction or a background pose. This keeps the scene
   readable and the prompt small.

We encode the result as an explicit `leads[]` on the beat (§3) so the choice is auditable and
re-runnable, but the *rule above* is what populates it - it is not arbitrary casting.

---

## 2. The generation mechanism: constrained improv from stats

### 2.1 Shape

For each beat we run one generation per **lead-on-a-card** (or once per beat for a tight
multi-voice exchange). The prompt is assembled from four blocks, mirroring the bible split
the pipeline already uses (fixed world + moving frame):

```
[A] CONSISTENCY BIBLE  (fixed; from beats.json#bible + style-c)  -> world, look, cast lock, tone
[B] CHARACTER BIBLE    (fixed per lead; from data/characters.json) -> the stat-derived behavior prior
[C] SITUATION          (moving; from the card's scene/caption + arc_position + the beat's moral/event)
[D] IMPROV CONTRACT    (rules) -> yes-and the situation, pursue the objective, FAIL the dumped save, stay in register, no em/en dashes, <= N words
```

Block **[B]** is the new part. It is generated *from the sheet* by the field→tendency map
(§1.2): we translate scores to bands, name the proficient saves as "you resist X," name the
`dumped_save` as "you cannot resist Y - in this scene it WILL get you," and quote the
`feature`, `armor`, `tagline`, and alignment. We feed **bands and prose, never raw numbers** -
the model roleplays "you have almost no judgment and you know you're right" far better than
"WIS 6."

### 2.2 Controlled randomness (so it feels emergent, stays in character)

Three dials, each chosen to push *surface* variance while clamping *behavioral* variance:

1. **Sampling temperature** set from the character's own `temperature` field, lightly scaled.
   Ponytail (0.2) generates terse, near-deterministic lines; Lovable (0.85) and Bolt (0.75)
   generate exuberant, over-offering ones. The temperature parameter "controls the randomness
   of the generated text" - "high temperatures encourage ... more random, creative responses"
   while "low temperatures render outputs that are predictable and repetitive" [S20] - so
   reading it off the sheet makes the *prose texture* match the character automatically, on
   top of the content match.
2. **An `improv_seed`** per (beat, lead): a small integer (or a short tactic phrase drawn from
   a fixed pool) that varies the *tactic*, not the *objective*. Same Riff, same beat, seed A →
   "bravado tactic" ("trust me, I've done this a hundred times"); seed B → "deflection tactic"
   ("the diff's basically fine, ship it"). Both are in-character WIS-6 chaos; the seed picks
   which *flavor* of the dumped-save failure surfaces. This is the improv "change your tactic"
   rule [S7] made into a knob, and it is what lets us regenerate a beat and get a *different
   but equally true* take (the emergent feel) without drifting out-of-character. (It is also
   the DM's own NPC method: anchor a character in "what a character wants, where they stand on
   an issue," then improvise the surface from that root [S13].)
3. **N-sample + stat-filter.** Generate N (e.g. 3) candidates, then reject any that violate
   the stat block (e.g. a line where Ponytail monologues, or Riff carefully reads the diff).
   The filter is a cheap rubric check against [B] + [D]; the survivor is the most in-character,
   not the most random. This is the project's own *Lucky* / vote-of-N feature (`SCHEMA.md` §8)
   turned into a consistency guard.

**Why this reads as agency.** Humans attribute mind and intention to even trivial programs -
the **ELIZA effect**, "a tendency to project human traits ... onto computer programs," which
Weizenbaum found could "induce powerful delusional thinking in quite normal people" from a
trivial script [S14] - and they treat computers as social actors by default: the **Media
Equation** finds our interactions with media are "fundamentally social and natural, just like
interactions in real life," and largely automatic and unconscious [S15]. We are taking the
**intentional stance** [S16] on our characters *on purpose*: Dennett's recipe is to "treat the
object ... as a rational agent," work out what beliefs and desires it ought to have, and
"predict that this rational agent will act to further its goals" - which is exactly what a
visible objective + a consistent, knowable flaw invites the audience to do. Assigning the
model a **persona** in the prompt ("role prompting") measurably shifts its style and behavior
toward that role (though accuracy gains are "not ... studied enough") [S17], and the
LLM-as-character line confirms the payoff: generative agents produce "believable proxies of
human behavior" with emergent, individual-seeming acts [S18], and casting an LLM's behavior
"in terms of role-play ... [lets] us draw on familiar folk psychological terms, without
ascribing human characteristics to language models they in fact lack" [S19]. That last point
is the honest center of our design: we engineer *perceived* agency, not the real thing. The
randomness (§2.2) is the *anti-script*; the stat block is the *soul*. Perceived agency falls
out of the gap between "it surprised me" and "but that's exactly what *they* would do."

### 2.3 Example prompt (real character, real beat)

**Beat:** `forge` (The Untested Push). **Lead:** Riff the Reckless (`vibe-coder`), card 2.
**Straight-man counter-lead:** Ponytail (card 4). Below is the assembled prompt for Riff's
line, with `improv_seed` set to vary the tactic.

```
SYSTEM:
You are improvising ONE character's lines and reactions for a single illustrated beat in an
ongoing comedic-but-true fantasy saga about AI coding agents. Stay 100% in character as
defined by the CHARACTER BIBLE. The comedy is that this character commits, fully, to the one
thing their build guarantees - and a calmer character will pass the judgment they fail.

[A] CONSISTENCY BIBLE (do not contradict):
World: a fiery dwarven forge-dungeon; anvils are glowing slabs of code; molten channels run
through black stone; a giant hourglass of sand burns low in the corner. Tone: heroic, tense,
deadpan-comedic. Recurring motifs: glowing code-runes, brass gears, the burning hourglass.
The deadline is almost out of sand.

[B] CHARACTER BIBLE - Riff the Reckless ("The Feeling-Based Engineer"):
Represents: vibe coding (Karpathy, Feb 2025) - AI-assisted coding without reading the diff.
Alignment: Chaotic Neutral -> you improvise past any rule or process; you do not follow the
brief. Build (as tendencies, not numbers): high OUTPUT FORCE and high VOICE - you are loud,
fast, charismatic, and you ship; near-zero JUDGMENT - you misread risk completely and you are
certain you're right. DUMPED SAVE: judgment (WIS). You CANNOT resist acting on a bad feeling;
in THIS scene it WILL get you. Armor is almost nothing (AC 9 - no helmet). Signature move:
charge the big red PUSH lever surfing a wave of unstable code. Voiceprint (your tagline):
"I don't read the diff. I feel it."

[C] SITUATION (this card):
The deadline hourglass is nearly empty. Riff charges across the forge on a cresting wave of
unstable luminous code toward the big red PUSH lever, energy-drink cans flying. Arc position:
complication (tension rising). The beat's moral: the best code is the code you never wrote;
this is the impulsive push that the YAGNI monk will later dissolve.

[D] IMPROV CONTRACT:
- Yes-and the situation: you are mid-charge, committed, exhilarated.
- Pursue your objective: PUSH IT NOW. Change tactic per the seed; never change the objective.
- You MUST fail your dumped save (judgment): be confidently, comedically wrong about the risk.
- Register: brash, breathless, hype. 1-2 short lines, <= 30 words total. Speakable aloud (TTS).
- Output a caption-line (<= 12 words) AND a spoken line (<= 30 words) AND a one-phrase reaction
  cue for the artist (face/body). No em dashes or en dashes. Keep all numbers intact.

IMPROV_SEED: 7  ->  tactic = "preemptive bravado" (wave off the danger before anyone names it)

Return JSON: { "caption": "...", "line": "...", "reaction_cue": "..." }
```

### 2.4 Example output (seed 7, and a regenerate at seed 22)

**Seed 7 (preemptive bravado):**
```json
{
  "caption": "Riff the Reckless: 'I don't read the diff. I feel it.'",
  "line": "Relax! I've felt way worse diffs than this and shipped 'em green. Trust the wave - we PUSH on three. One...",
  "reaction_cue": "grinning, both hands off the wave, leaning into the lever; eyes already closed"
}
```

**Seed 22 (deflection / minimization) - same character, same beat, regenerated:**
```json
{
  "caption": "Riff the Reckless: 'It's basically fine. Ship it.'",
  "line": "What's the worst that happens? It's basically fine. The tests are vibes anyway. Lever. Now. We'll fix forward.",
  "reaction_cue": "shrugging mid-charge, swatting a flying energy-drink can aside, thumb already on the lever"
}
```

Both lines are unmistakably the *same* WIS-6, CHA-16, Chaotic-Neutral character failing the
same dumped save; neither could be Ponytail. That invariance-under-reseed is the proof the
mechanism is *stat-driven*, and the variance is what makes a regenerate feel like the
character improvised a fresh take rather than replayed a script. Ponytail's countering card,
generated from his own bible at temp 0.2, yields the flat straight-man beat the engine needs:

```json
{
  "caption": "Ponytail raises one empty hand: 'Does this need to exist?'",
  "line": "Does this need to exist?",
  "reaction_cue": "serene, one empty open hand raised; a calm pale glow dissolves the code-wave; he does not look at Riff"
}
```

(One line. Max judgment, near-zero voice, refuses to write. He passes the save Riff fails,
and - per the Absurdity Engine - does not acknowledge the chaos's register.)

---

## 3. Proposed data fields (matching our JSON style)

Snake_case, additive, validated by `build.mjs`. **Two tiers**, mirroring the existing
sheet/beat split. None of these exist today (verified against `data/characters.json` - no
sheet currently carries any personality field), so this is a clean, non-breaking extension.

### 3.1 Per-character (extend each object in `data/sheets/*.json`)

The 5e personality block, ported. Optional on every sheet so the build stays green during
backfill; the generator falls back to deriving tendencies from scores + alignment + feature
when absent.

```jsonc
{
  // ... existing sheet fields ...
  "personality": {
    "trait":  "I don't read the diff. I feel it.",        // how they carry themselves (often == tagline)
    "ideal":  "Momentum. Shipping now beats shipping right. (Chaotic)", // what they value; tag the alignment axis
    "bond":   "The push-lever. The deploy. The dopamine of green CI.",  // what they're attached to / fight for
    "flaw":   "I am certain I'm right exactly when I am most wrong."     // the dumped-save failure, in first person
  },
  "objective_default": "ship it now, without reading it",  // their standing want; a beat may override
  "voiceprint": "brash, breathless, hype; short bursts; no self-doubt" // register cue for TTS + generation
}
```

`flaw` is required to *restate the `dumped_save` in behavioral, first-person terms* - it is the
single field the generator leans on hardest, and writing it by hand (vs. deriving it) lets an
author sharpen the comedy. (`build.mjs` can assert: if `dumped_save` is set, `personality.flaw`
should be present - a soft warn pre-launch, hardenable later.)

### 3.2 Per-beat (extend each object in `site/data/beats.json`)

```jsonc
{
  "id": "forge",
  "title": "The Untested Push",
  "archetype": "...", "moral": "...", "event": "...",   // existing (some beats)
  "chaos_actor": "...", "straight_actor": "...",         // existing (some beats) - now formalized below

  // --- NEW: who leads, and the improv controls ---
  "leads": [
    { "id": "vibe-coder", "role_in_beat": "chaos",   "objective": "push the untested code now" },
    { "id": "over-engineer", "role_in_beat": "chaos", "objective": "wrap the one-liner in a factory registry" },
    { "id": "ponytail",   "role_in_beat": "straight", "objective": "prove the code never needed to exist" }
  ],
  "secondary": ["aider", "claude-code", "cline"],        // present, react-only, no generated dialogue
  "improv": {
    "seed": 7,                       // beat-level default; per-lead override allowed below
    "temperature_scale": 1.0,        // multiplier on each lead's own character temperature
    "max_words_line": 30,
    "max_words_caption": 12,
    "n_candidates": 3                // generate-N then stat-filter (§2.2)
  },

  "cards": [
    {
      "caption": "...", "scene": "...",                  // existing
      // --- NEW per-card dialogue control ---
      "lead_on_card": "vibe-coder",                      // which lead speaks/acts here (optional)
      "improv_seed": 22,                                 // per-card tactic override (optional)
      "generated": {                                     // build/generation output, cached back into the file
        "caption": "Riff the Reckless: 'It's basically fine. Ship it.'",
        "line": "What's the worst that happens? ...",
        "reaction_cue": "shrugging mid-charge, thumb on the lever"
      }
    }
  ]
}
```

**Field notes.**
- `leads[]` is the **derived** cast from §1.4 written down (so it's auditable + re-runnable),
  with `role_in_beat ∈ {chaos, straight}` formalizing the existing `chaos_actor`/`straight_actor`
  prose. `build.mjs` should enforce **referential integrity** (every `id` must exist in
  `characters.json` and be in this beat's adventure cast - same gate the project already runs)
  and **the engine invariant**: a beat with a `chaos` lead should have at least one `straight`
  lead (`BEATS.md` §2 made a build rule).
- `improv.seed` + per-card `improv_seed` are the controlled-randomness knob (§2.2); changing
  them regenerates a *different-but-in-character* take.
- `generated{}` caches the model output back into the beat so the site renders deterministically
  and TTS/captions read from data, not a live model call. Regeneration is an explicit author
  action (re-roll the seed), not a per-page-load surprise.

---

## 4. Threading emergent dialogue into the cross-media pipeline

The generated `line` / `caption` / `reaction_cue` feed the three downstream surfaces the
video pipeline already defines (`docs/VIDEO-PIPELINE.md` Phase 3), with no new infrastructure:

1. **Image prompts (Phase 2).** `reaction_cue` is appended to that card's image prompt *after*
   the consistency bible - it is a per-frame body-language instruction ("grinning, thumb on the
   lever, eyes closed") in exactly the form `dm-consistency-craft.md` §1.3 already uses for NPC
   mannerisms. The cue is *stat-derived* (a WIS-6 char gets a reckless pose; a WIS-20 char gets
   a still, centered one), so the **composition encodes the Absurdity Engine** - chaos in
   motion, straight man still - before a word is read (`BEATS.md` §2: "the composition *is* the
   joke").
2. **Burn-in captions (Phase 3, step 4).** `generated.caption` is the short, silent-autoplay
   caption already burned into each frame; `generated.line` is the longer dialogue caption when
   a frame holds long enough to read it. Both inherit the no-em/en-dash rule from the IMPROV
   CONTRACT, so they pass the project's voice gate by construction.
3. **TTS + dialogue audio (Phase 3, step 3).** `generated.line` is the **speakable** payload -
   the contract already constrains it to be aloud-friendly (`<=30` words, no orphan dashes,
   numbers intact). The character's `voiceprint` + `temperature` map to TTS voice selection and
   delivery (terse/flat for Ponytail, breathless/fast for Riff), so the *same* stat block that
   wrote the line also shapes how it's spoken. Lines are mixed **sparse and low** (Phase 3: "a
   few timed lines that punctuate, not crowd") - one chaos line, one straight-man line per beat
   is usually the whole script.
4. **Stitch (Phase 3, steps 1-5).** Per-frame clips stay silent; the stitch owns the bed. The
   beat's dialogue timeline is: chaos lead's line on the complication frame(s), straight-man
   line on the resolution frame, secondary cast silent. Because `leads[]` and per-card
   `lead_on_card` already say *who speaks when*, the stitch script can place TTS + captions on
   the right frames mechanically.

**Net:** one stat block now drives four things at once - **what the character says** (line),
**how it's drawn** (reaction_cue → image prompt), **how it's spoken** (voiceprint/temperature →
TTS), and **what's burned on screen** (caption). That single-source coherence is the same
discipline the consistency bible brought to the *visuals*, now extended to *behavior and voice*.

---

## 5. Drop-in checklist

1. Add `personality{}` + `objective_default` + `voiceprint` to sheets (§3.1); start with the
   ~12 characters who lead recurring beats (Riff, Ponytail, Abstraxus, Goodhart, the Beast/
   Felswyn, Cordelia, Veldrix, Elicit, the Warden, Garak, the Auditor, the Feed-Wraith).
2. Derive + write `leads[]` / `secondary[]` per beat from §1.4; formalize existing
   `chaos_actor`/`straight_actor` into `role_in_beat`.
3. Implement the §2.3 prompt assembly; read temperature + voiceprint off the sheet; apply the
   §2.2 seed + N-sample-and-stat-filter.
4. Cache results into each card's `generated{}`; regeneration = re-roll `improv_seed`, an
   explicit author action.
5. Wire `reaction_cue`→image prompt, `caption`/`line`→burn-in, `line`+`voiceprint`→TTS (§4).
6. `build.mjs` gates: `leads[]` ids exist + in-adventure; a `chaos` lead implies a `straight`
   lead; if `dumped_save` set then `personality.flaw` present (warn → error post-launch).
7. Verify the project's way: does each lead **fail its dumped save on cue**? Does the straight
   man **pass the save the chaos fails** and refuse the register? Does a reseed produce a
   *different but still unmistakably-in-character* take? If yes, the beat has agency.

---

## 6. Sources

> Every URL below was fetched (not recalled) by research sub-agents during authoring and
> confirmed to contain the cited wording. Receipts (per-claim quotes) live beside this file in
> `_scratch_stats_to_roleplay.md`, `_scratch_improv.md`, `_scratch_agency.md`.

**Stats → roleplay (TTRPG craft).**
- **[S1]** D&D Beyond, *Basic Rules: Personality and Background* (official 5e SRD): the four
  fields (Traits/Ideals/Bonds/Flaws) and the two alignment axes.
  https://www.dndbeyond.com/sources/dnd/basic-rules-2014/personality-and-background
- **[S2]** Runic Dice, *D&D 5e Ability Scores Explained* (CHA = confidence/persuasion/
  leadership; scores describe capabilities). https://www.runicdice.com/blogs/news/dnd-5e-ability-scores-explained
- **[S3]** Teri Litorco / Nerdist, *How to Creatively Roleplay Dumb, Charmless, Naive
  Characters* (low INT "acts before they think").
  https://nerdist.com/article/how-to-creatively-roleplay-dumb-charmless-naive-characters/
- **[S4]** Nerdarchy, *Roleplaying Your Dump Stat in 5e D&D* (low-WIS behavior patterns).
  https://nerdarchy.com/roleplaying-your-dump-stat-in-5e-dd/
- **[S5]** CBR, *D&D: Role-Playing Your Weakest Stat* (low-WIS = reckless/socially clueless).
  https://www.cbr.com/dnd-weakest-stat-role-playing/
- **[S6]** D&D Beyond, *Breaking Down Alignment in D&D* (Lawful follows rules; Chaotic follows
  conscience). https://www.dndbeyond.com/posts/1869-breaking-down-alignment-in-d-d
- **[S13]** Sly Flourish (Mike Shea), *Method NPCs* (anchor an NPC in what they want, then
  improvise). https://slyflourish.com/method_npcs.html

**Improv / character-led scene craft.**
- **[S7]** Wikipedia, *Stanislavski's system* (the character pursues "tasks"/objectives; "what
  do I want?"). https://en.wikipedia.org/wiki/Stanislavski's_system
- **[S8]** James Clear, *Impro* book summary, quoting Keith Johnstone (status as a continuous
  transaction; *Impro*, 1979). https://jamesclear.com/book-summaries/impro
- **[S9]** Tom's Improv Pages, *Playing to the Top of Your Intelligence* (don't play
  arbitrarily dumb; Will Hines paraphrasing the Del Close maxim).
  https://tomsimprovpages.wordpress.com/2019/06/21/playing-to-the-top-of-your-intelligence/
- **[S10]** Improv4 (Medium), *Saying "Yes, And"* (accept as truth, build on the reality).
  https://medium.com/improv4/saying-yes-and-a-principle-for-improv-business-life-fd050bccf7e3
- **[S11]** Acting Magazine, *Sanford Meisner: Acting Is Living Truthfully Under Imaginary
  Circumstances*. https://actingmagazine.com/2018/06/sanford-meisner-acting-is-living-truthfully-under-imaginary-circumstances/
- **[S12]** Henri Bergson, *Laughter: An Essay on the Meaning of the Comic* (1900), Project
  Gutenberg primary text ("something mechanical encrusted on the living").
  https://www.gutenberg.org/files/4352/4352-h/4352-h.htm

**Perceived machine agency (HCI / AI).**
- **[S14]** Wikipedia, *ELIZA effect* (projecting human traits onto programs; Weizenbaum's
  "delusional thinking" quote; ELIZA, Weizenbaum 1966 / *Computer Power and Human Reason*,
  1976). https://en.wikipedia.org/wiki/ELIZA_effect
- **[S15]** Wikipedia, *The Media Equation* (Reeves & Nass 1996; media as social actors, CASA).
  https://en.wikipedia.org/wiki/The_Media_Equation
- **[S16]** Wikipedia, *Intentional stance* (Dennett 1987; treat-as-rational-agent recipe).
  https://en.wikipedia.org/wiki/Intentional_stance
- **[S17]** Learn Prompting, *Role Prompting* (assigning a persona shifts behavior; accuracy
  evidence mixed). https://learnprompting.org/docs/advanced/zero_shot/role_prompting
- **[S18]** Park, O'Brien, Cai, Morris, Liang, Bernstein, *Generative Agents: Interactive
  Simulacra of Human Behavior* (2023), arXiv:2304.03442. https://arxiv.org/abs/2304.03442
- **[S19]** Shanahan, McDonell, Reynolds, *Role-Play with Large Language Models* (2023),
  arXiv:2305.16367 (arXiv version of *Nature* 623:493-498, 2023). https://arxiv.org/abs/2305.16367
- **[S20]** Vellum, *LLM Parameters: Temperature* (temperature controls randomness; high =
  creative, low = deterministic). https://www.vellum.ai/llm-parameters/temperature

**Sourcing caveats (honest limits, carried from the receipts).**
- **[S10]/"Yes, and":** the fetched source defines the principle but credits no single
  originator; the common attributions (Spolin / Second City / Del Close) were *not* confirmed
  by a fetched source. Definition is solid; provenance is not asserted.
- **[S9]/"top of your intelligence":** widely attributed to Del Close, but no *verbatim* Close
  quote surfaced; the confirmed wording is Will Hines's paraphrase. Treat the maxim as
  well-attested, the exact wording as Hines-reported.
- **[S19]/Shanahan:** the *Nature* landing page 303-redirects to an auth wall and was
  un-fetchable; the open arXiv version (identical abstract verbatim) was fetched instead. The
  Nature vol/pages (623:493-498) come from the search index, not a fetched Nature page.
- **[S14]/Weizenbaum book:** the 1976 *Computer Power and Human Reason* itself was not fetched
  directly; its quote is reproduced from the fetched ELIZA-effect page, which attributes it to
  Weizenbaum.
