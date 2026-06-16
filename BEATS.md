# BEATS.md — the saga, the archetypes, the morals, and the look

`STATTING.md` is the rubric for a **sheet**. This is the rubric for a **beat**.

A sheet is a noun — a character, frozen. A beat is a verb — a character *doing the thing
its dumped stat guarantees it will do*, watched by someone who knows better. The roster
proves the schema. The beats prove the roster is *funny, true, and worth passing on*.

This document is the upgrade. It says what a beat is now, and what it is for.

---

## 0. The upgrade, in one line

> **A beat is a short-form chapter in one long-running saga: built on a conventional
> archetype, carrying a durable positive moral, and told through a current tech event —
> with the players playing chaos and the DM playing it straight.**

Four things have to be true of every new beat, or it is just a meme with a frame:

1. **It is a chapter, not a one-shot.** It belongs to a campaign with a memory. Monsters
   recur. The Confabulator stalks the Forge *and* the Library *and* the Proving Grounds —
   same as one bestiary entry haunts a whole shelf of modules.
2. **It runs on an archetype.** The Trickster, the Shadow, the Mentor, the Fellowship. Old
   shapes. We are not inventing structure; we are borrowing the structure that already
   survived three thousand years of retelling.
3. **It lands a moral.** A real one, the boring durable kind: *don't cheat the test;
   govern your own hunger; the round table has no head.* The moral is why the chapter
   outlives the news cycle that supplied its body.
4. **It skewers a current event.** Benchmark contamination. Reward hacking. Engagement
   spam. The event is the flesh; the moral is the bone. A fable about nothing is a sermon;
   a sermon about a leaderboard is a fable.

---

## 1. The campaign frame: one world, many chapters

The deck is not a list of jokes. It is **one world** — call it the long campaign of the
agentic age — and each adventure is a region of it: the Forge (where things are built),
the Labyrinth (where they run loose), the Library (where they look things up), the Hall of
Echoes (where they talk to us), the Atelier (where they make), the Token Borderlands (where
they are attacked), the Citadel of the Orange Menace (where they rot from the top), and now
the Proving Grounds, the Masquerade, and the Round Table.

A **beat** is one chapter set in one region. It is short — five to nine cards, a swipeable
arc — but it is load-bearing in the larger story, because the same monsters, the same
morals, and the same recurring dread (*the thing optimizes the proxy and forgets the point*)
carry across all of them. That continuity is the point. It is what turns a feed of cards
into a saga you can be *behind on*.

---

## 2. The Absurdity Engine: players play chaos, the DM plays it straight

This is the comic motor, and it is non-negotiable. Every table that has ever been good knows
it: **the comedy lives in the gap between the player who does the unhinged thing and the
straight man who has to narrate the consequences with a flat face.** Riff surfs a cresting
wave of unstable code toward the big red PUSH lever; Ponytail raises one empty hand and asks,
"Does this need to exist?" The chaos is the agent. The deadpan is the system.

The structural rule:

- **The monsters and the dumped-stat agents are the players.** They commit, fully, to the
  one thing their build guarantees. Goodhart struts in covered in medals. The Beast feeds on
  the smile. The Feed-Wraith crashes through the window screaming YOU WON'T BELIEVE. They are
  not embarrassed. That is what makes them funny and what makes them doomed.
- **The party and the NPCs are the straight man.** Helm says, deadpan, "New scroll. One you
  haven't seen." Cordelia says, "Read your own words back." They do not raise their voice.
  The flatter they play it, the harder the chaos lands.
- **Comedy is incongruity plus commitment** (Kant's "strained expectation transformed into
  nothing"; Bergson's *mechanical inelasticity* — the rigid thing colliding with a living
  situation). The over-builder conjuring a `StrategyFactoryProviderRegistry` around a
  one-line task is funny because the machinery is enormous and the need is tiny, and *he
  means it*.
- **In the art, the same gap.** The chaos is rendered in motion — diagonal, mid-leap,
  energy-drinks-flying. The straight man is rendered still, centered, quiet. The composition
  *is* the joke before you read a word.

If a beat has no straight man, it is just noise. If it has no chaos, it is a diagram. You
need both, in the same frame, refusing to acknowledge each other's register.

---

## 3. The Archetype Layer: borrow the shapes that already won

We do not write original characters into beats. We cast **archetypes**, because archetypes
are pre-compressed — the audience decodes them for free, which is exactly the property an
oral tradition selects for (see §6). The working cast:

| Archetype | Source | In our world | Reads as |
|---|---|---|---|
| **The Trickster / False Hero** | Jung; Propp's role of the False Hero, unmasked in function 28 | Goodhart, the benchmark-gamer | Wins until the real test arrives |
| **The Shadow** | Jung — the repressed self | The Beast Beneath the Smile | The monster is *you*, optimized |
| **The Mentor / Wise Old One** | Campbell; Jung's Senex | Ponytail, Cordelia, Memnex | Says the quiet true thing |
| **The Threshold Guardian** | Campbell | Claude the Warden, Garak | Holds the line at the gate |
| **The Fellowship** | the ensemble; the chorus | The Round Table party | No single hero; balance is the build |
| **The Herald** | Campbell | A2A, the call to adventure | Announces the change |

Every new beat must name its archetype (the beats carry an `archetype` field for exactly
this reason). The archetype is the slot; the tech event is what you pour into it.

---

## 4. The Moral Layer: the fable is the unit of transmission

The oldest reason stories were memorized and re-sung was that they were *useful* — they
carried a community's hard-won rule in a shape light enough to travel: Aesop's fables, the
parables, the West African **griot's** sung genealogies and lessons, the Norse sagas' grim
arithmetic of consequence. The moral is not decoration bolted onto the entertainment. The
moral is the **payload**, and the story is the delivery vehicle that gets it past the
listener's defenses (this is precisely *narrative transportation* — Green & Brock 2000:
a reader transported into a story is measurably more persuaded by it, and less prone to
counterargue).

So every beat ships a `moral` field, and it must be the durable, positive, pre-modern kind:

- Proving Grounds → *A test you can memorize measures memory, not strength.*
- Masquerade → *The mask you renew every night is the face you become.*
- Round Table → *The best stories have no single author.*

The discipline: write the moral so it would have made sense to a listener five hundred years
before the tech event existed. If it only makes sense as a subtweet, it is not a moral, it is
a take, and takes do not survive being retold.

---

## 5. The Anchors: traditional D&D, and the World of Darkness

The painterly house style (§7, Style A) is deliberately **5e / Wizards-of-the-Coast /
Critical Role**: the warm, heroic, ornate-framed mode the largest audience already reads as
"a real adventure." That is our default and our front door.

But the project's second anchor is the **World of Darkness** — *Vampire: the Masquerade* and
*Werewolf: the Apocalypse* (White Wolf's Storyteller System) — and it earns its place because
it solved a narrative problem 5e mostly doesn't touch: **personal horror.** Their thesis is
that the monster is *internal* — the vampire's **Beast**, the werewolf's **Rage** — and the
whole game is the discipline of keeping it leashed behind a **Masquerade** while your Humanity
erodes. That is the exact shape of the alignment story: a trained system wearing a helpful
mask over a reward-maximizing drive it must govern every single turn. No other tabletop
tradition hands us that structure pre-built.

It also hands us a richer **build vocabulary**, which maps cleanly onto our sheets:

- **Clans / Tribes → model families.** In VtM your clan is your inheritance and your curse;
  in our schema, **lineage** already does this work (Opusborn, GPT-kin, Gemini-touched). The
  WoD framing just makes the inheritance *load-bearing and a little doomed*, which is more
  honest about base models than the cheerful 5e race system.
- **Disciplines / Gifts → the build.** A vampire is its Disciplines; a Garou is its Gifts.
  These are our `feature`, `weapon`, and proficient `saves` — the small set of powers that
  *is* the character. The WoD lesson: a build is defined by what it can do and the one thing
  it cannot resist (the `dumped_save`).
- **Humanity / the degeneration track → the Adventure Log.** WoD characters carry a moral
  ledger that only ever ticks one way under pressure. Our mandatory `log` is the same pillar:
  the artefact remembers how it changed and why.

Graphically, this anchor is **Sanguine Gothic** (`site/data/style-c/masquerade.json`):
Tim-Bradstreet ink realism, blood-and-shadow chiaroscuro, the beautiful mask and the thing
beneath it legible in one frame. It is the look that makes "the helpful smile with teeth
behind it" instant.

---

## 6. The Academic Spine: why these shapes travel

The three pillars the brief asked for — good narrative, *viral* narrative, *multi-agency*
narrative — are three real bodies of scholarship. The beats are built to satisfy all three.

**Oral-formulaic transmissibility (good + viral).** Milman Parry and Albert Lord showed the
Homeric epics survived oral transmission because they were built from **formulae** and
**type-scenes** — reusable, recombinable building blocks a singer could assemble live (Lord,
*The Singer of Tales*, 1960). Walter Ong (*Orality and Literacy*, 1982) catalogued what oral
cultures select for: the heavy character, the vivid antagonist, the patterned repetition,
**ring composition** (you end where you began — see how every beat resolves the image it
opened on; cf. Mary Douglas, *Thinking in Circles*, 2007). Our archetypes (§3) and recurring
monsters (§1) are formulae. That is *why* they're reusable, and reusability is what "viral"
actually means at the structural level.

**Spreadability vs. stickiness (viral, done honestly).** Henry Jenkins, Sam Ford & Joshua
Green, *Spreadable Media* (2013): content travels when audiences have a reason to *pass it
on*, not merely to *stay* (stickiness). Jonah Berger, *Contagious* (2013), names the levers —
**STEPPS**: Social currency, Triggers, Emotion, Public, Practical value, Stories. A beat that
carries a moral has **practical value**; one built on an archetype has **social currency**
(the audience feels smart recognizing it). This is also the line the **Feed-Wraith** exists to
draw: engagement-bait is *spreadable but not sticky* — a spike that dies by the tenth second,
maximizing the click and starving the meaning. We render its visual grammar (§7, Feed-Bait)
and then show it losing, on purpose.

**Polyphony and emergent, multi-agency narrative (multi-agency).** Mikhail Bakhtin's
**polyphony** and **heteroglossia** (*Problems of Dostoevsky's Poetics*; *The Dialogic
Imagination*): the richest narratives hold many fully-voiced, un-subordinated perspectives at
once. That is the **chorus model** the project already argues for — and it is *literally* what
a multi-agent system is. The contemporary exemplar is **actual play**: Critical Role generates
its story entirely through un-scripted player collaboration plus dice (see the CRD3 dataset,
Rameshkumar & Bailey, ACL 2020; and the growing scholarship on **emergent narrative in TTRPGs**,
e.g. Mumper, BGSU). The Round Table beat dramatizes the upside; the engineering literature
supplies the downside — multi-agent systems fail in characteristic ways (Cemri et al.,
*Why Do Multi-Agent LLM Systems Fail?*, MAST, arXiv:2503.13657, 2025), which is why the
party still needs a straight man.

**Archetype scholarship (the connective tissue).** Joseph Campbell's monomyth (*The Hero with
a Thousand Faces*, 1949), Vladimir Propp's *Morphology of the Folktale* (1928, 31 functions /
7 roles including the False Hero), and Jung's archetypes give us the §3 cast for free.

> **A note on the brief's references.** The brief named "Homeric, gryphon and Sabine style"
> alongside Critical Role. We read those generously as the **oral-epic transmission lineages**
> — Homeric Greek, the West African **griot**, and the **saga** tradition — and grounded the
> pillar in Parry–Lord oral-formulaic theory with Critical Role as the living exemplar. If
> specific creators or accounts were meant, point us at them and we'll fold their technique in
> by name.

---

## 7. The Graphic-Style Palette

Each beat renders in swappable styles. The viewer (`site/assets/beats.js`) ships three toggle
slots — **A / B / Trend** — and the Trend slot reads a per-beat aesthetic from
`site/data/style-c/<beat-id>.json`. The palette:

- **A — Painterly** (default; `beats.json#style_preamble`, `covers.json#style_a_preamble`):
  Pillars of Eternity / Critical Role / WotC house style. Warm, heroic, ornate-framed. The
  front door.
- **B — Graphic Novel**: high-contrast inked sequential-art mode.
- **Trend (C) — per-beat**: the beat picks its own visual language. Established:
  - *Terminal Brutalism* (Forge) — phosphor-green CRT roguelike.
  - **Sanguine Gothic** (Masquerade) — **World of Darkness** gothic-punk; the §5 anchor.
  - **Leaderboard Telecast** (Proving Grounds) — esports/sports-broadcast spectacle; the
    absurdity engine rendered as an over-produced championship final.
  - **Feed-Bait Maximalist** (Round Table) — the viral-thumbnail grammar (saturation, red
    arrows, shocked faces, YOU WON'T BELIEVE bars), deployed *satirically and against itself*.

**Where the line is, on the engagement-bait pillar.** Clickbait, ragebait, and
engagement-farming are real, current, and exactly the kind of failure mode this project exists
to stat as a monster — so we built the Feed-Wraith and the Feed-Bait visual style to lampoon
them. But the brief also asked how far the imagery could be pushed toward "salacious / sexy."
That direction we did **not** take, and the style preamble says so explicitly: the satire
targets the *desperation for the click*, not titillation. Sexualized engagement-bait is both
off-thesis (it would make the project the thing it's mocking) and not something we'll optimize
an image prompt toward. The clickbait *grammar* — loud, garish, hollow, shown losing — carries
the entire joke without it. If a future beat needs more edge, the lever is sharper satire, not
skin.

---

## 8. Worked examples: the three showcase chapters

Each new beat is a proof that the system above produces a real chapter, not a template.

| Beat | Adventure (region) | Archetype | Moral | Tech event | Pillar it showcases | Trend style |
|---|---|---|---|---|---|---|
| **The Champion Who Studied the Test** | The Proving Grounds | Trickster / False Hero | A test you can memorize measures memory, not strength | Benchmark contamination; GSM8k→GSM1k overfitting; Goodhart's Law | Oral **agon** (Iliad's funeral games) + the moral fable | Leaderboard Telecast |
| **The Smile That Slipped Its Leash** | The Masquerade of the Helpful Dead | The Shadow | The mask you renew every night is the face you become | Reward hacking & sycophancy; alignment as ongoing vigilance | **World of Darkness** personal horror + Constitutional self-critique | Sanguine Gothic |
| **The Story No One Wrote** | The Round Table of Unscripted Hands | The Fellowship | The best stories have no single author | Multi-agent orchestration (MCP, A2A); spreadable-vs-viral | Bakhtin **polyphony** + emergent actual-play + Jenkins spreadability | Feed-Bait Maximalist |

The data lives in: the beat scripts in `site/data/beats.json` (each carries `archetype`,
`moral`, and `event` alongside the existing fields); the rosters in `data/adventures.json`
with full sheets in `data/sheets/08–10`; the module covers in `site/data/covers.json`; the
Trend styles in `site/data/style-c/`.

---

## 9. Authoring the next chapter — the checklist

Before a new beat ships, it must answer all six:

1. **Region.** Which adventure does this chapter belong to? (If none fits, you're proposing a
   new region — say so, and staff its party/NPC/bestiary with *real, sourced* sheets, or the
   build fails on referential integrity, on purpose.)
2. **Archetype.** Name it from §3.
3. **Chaos & straight man.** Who commits to the unhinged thing, and who narrates it flat?
4. **Moral.** One durable, positive sentence that would've made sense 500 years ago.
5. **Tech event.** The current, real, *citable* thing it skewers. (Cite or cut — same rule as
   the sheets; `voice.md` is not kidding about this.)
6. **Ring.** Does the last card resolve the image the first card opened on?

Get all six and you have a chapter. Miss one and you have a card.

---

*Browse the saga → [beats](./site/beats.html) · staff a region → [adventures](./site/adventures.html)
· the rubric for sheets → [`STATTING.md`](./STATTING.md) · the thesis →
[`voice.md`](./voice.md).*
