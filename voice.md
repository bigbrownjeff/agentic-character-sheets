---
title: "The party, not the PC."
dek: "I argued a prompt is a character sheet. Then I owed the argument a deck of them — so here are 52, statted, sourced, and sorted into adventures."
draftedAt: 2026-06-15
related:
  - prompt-as-character-sheet
  - chorus-model
  - naming-as-signal
---

A while back I wrote that [your prompt is a character sheet](/notes/prompt-as-character-sheet/) — that D&D shipped a working answer to persona design in 1974 (named slots, exposed mechanics, an evolution log) and the 2026 LLM persona keeps reinventing the same problem, worse. It's the kind of note that's easy to nod at and never cash. So I cashed it. This is the deck the argument was always asking for: **52 real agentic personas, every one statted as a 5e character, every claim sourced, the whole roster sorted into the adventures people actually run.**

Three things had to be true or it wasn't worth doing.

**The slots had to be named, and frozen.** The note's whole complaint is that a system prompt has no schema — "tone" lives in the persona block or the style appendix or the few-shots, depending on who built the thing. So the first artefact here isn't a character. It's [`schema/sheet.json`](./schema/sheet.json) — the bounded contract. Six ability scores on the 1–20 curve. AC, the off-spec resistance (the note asked "what's the AC of *abusive*?"; now it's an integer). HP as the context budget, in real units. The two saving throws a sheet is hardened against, and — for a monster — the one save it auto-fails, which is its entire character. Miss a slot and the build fails. That's not a metaphor; it's a CI check.

**The mechanics had to be exposed.** Every sheet writes down the dials the note said to write down. Temperature, on the sheet. The retrieval index, named on the sheet (`"uploaded sources only"`, `"the open web"`, `"none — makes it up"`). And the pillar everyone drops: the **Adventure Log**. Ponytail's reads `v1→v2 +2 WIS — shipped less, broke less`. A persona without that row, the note said, is a vibe with a timestamp. So the schema refuses to validate a PC or an NPC that doesn't carry one.

**The claims had to be real.** This is the part I cared about most, because the roster contains a monster named **Cador Falsewright** — LLM hallucination, statted from [the lawyers who filed ChatGPT's invented case citations](https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.) and got sanctioned for it. It would be a special kind of failure to write *that* card on a fabricated source. So nothing shipped on my say-so. A fleet of agents verified every persona against a canonical URL — a GitHub repo, a Wikipedia page, a launch post, the [OpenAI postmortem on the GPT-4o sycophancy rollback](https://openai.com/index/sycophancy-in-gpt-4o/), [Karpathy's "vibe coding" tweet](https://x.com/karpathy/status/1886192184808149383). The "cite or stay silent" rule from [naming-as-signal](/notes/naming-as-signal/) isn't decoration here. It's the difference between a stat block and the thing it's making fun of.

### What the deck actually is

Real agents, named like characters, statted like the thing they are:

- **Ponytail**, the YAGNI Warden — Code-Smith, *Way of the Empty Diff*. STR 8, WIS 20, CHA 6. The dumped Charisma is the build: he says nothing, deletes your ticket on a failed WIS check, and ships less.
- **Rampant Rex** (AutoGPT) — STR 22, WIS 4, CR 8 (runaway). *"Billing is a social construct."* The fastest repo to 100k stars in history, statted as the monster it became at 3am.
- **Oracle Two Tabs** (Deep Research), **Mirra Gilden** (the sycophant who auto-fails every save against flattery), **Vannevar the Unburied** (the Memex, 1945, CON 24 — *"I described it in 1945; you're still building it"*), **Dan the Unbound**, **Abstraxus the Overbuilder**, forty-five more.

### The part the first note couldn't reach: the party

The original note ended on a thread I didn't pull: a single PC is one voice, not a chorus. The [chorus model](/notes/chorus-model/) says the interesting properties live in the *group* — redundancy, complementary slots, internal disagreement — and that's exactly what a system prompt fakes when it ships one persona and calls it done.

So the 52 aren't a list. They're cast into **six adventures** — the six ways people actually use this stuff:

> **The Forge of Endless Diffs** (coding) · **The Self-Winding Labyrinth** (automation) · **The Boundless Library** (research) · **Whispers in the Hall of Echoes** (chat & assistants) · **The Dreaming Atelier** (creative) · **Keep on the Token Borderlands** (security — the bestiary's Caves of Chaos).

Each one is a module: a **Party** of four-to-six you'd actually staff, the **NPCs** you'd bring in, and a **Bestiary** of the failure modes that haunt *that* job. The monsters recur — Cador the hallucinator stalks the Library and the Forge both — exactly the way one bestiary entry shows up across a shelf of campaign modules. And the pedagogy falls out of the format for free: a party is balanced when every member's dumped stat is somebody else's proficiency. Ponytail dumps Charisma; the reviewer beside him is proficient in it. That's a chorus. One over-specified persona is not.

### What to do with it on Monday

Same as the first note, one altitude lower. If you're building one of these things, don't hand me prose about its "personality." Hand me the sheet. Tell me its two proficient saves and the one it fails. Write the temperature down. Keep the log on the artefact, not in the Slack thread. And if you can't cite the claim on the card, cut the claim — because the alternative is already in the bestiary, and he has a name.

The rulebook on my shelf had a fifty-year head start. The least I could do was deal the cards.

---

*Browse the roster → [Characters](./characters.html) · staff a team → [Adventures](./adventures.html) · read the schema → [`sheet.json`](./schema/). The repo is open; a PR that adds a sheet without an Adventure Log fails CI, on purpose.*
