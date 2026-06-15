# The Agentic Character Sheet — schema v0.1

> Steal the schema from the character sheet. It had a fifty-year head start, and the
> design problem hasn't changed. — *["Your prompt is a character sheet."](../src/content/notes/prompt-as-character-sheet.md)*

The note names three things a 5e sheet has that a 2026 system prompt doesn't:
**named slots · exposed mechanics · an evolution log** (plus a *shared vocabulary*).
This schema is those three things, made literal. If a slot below isn't bounded and
named, it doesn't belong on the sheet; if a mechanic isn't exposed, it isn't a
mechanic, it's a vibe.

---

## 1. Identity — the named, finite slots

| Slot | D&D | Agent meaning |
|---|---|---|
| **Class (+ Subclass)** | Fighter, Wizard… | The *kind of work*. Code-Smith, Loremaster, Inquisitor, Sentinel, Bard-Conductor… Subclass = the flavor (Ponytail = Code-Smith, *Way of the Empty Diff*). |
| **Lineage** *(Race)* | Elf, Dwarf… | The **base model family**. Grants stat mods (see §4). Opusborn, Sonnetkin, Haikufolk, GPT-kin, Gemini-touched, Llama-forged. |
| **Background** | Soldier, Sage… | What it was built/trained for; its origin story. |
| **Alignment** | LG…CE | Two real axes (see §5). The 9-box grid is the meme; it's also a genuine spec. |
| **Level (1–20)** | — | Autonomy/capability depth. Sets **Proficiency Bonus** (+2 at 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20). |

## 2. Ability Scores — six bounded slots, 1–20

Modifier = `floor((score − 10) / 2)`. Same curve the note praises. Six, not "five-ish."

| Score | Reads as | High means | Dumped means |
|---|---|---|---|
| **STR** — Output force | bulk generation, big refactors, throughput under load | ships the 2,000-line PR | writes one line (Ponytail) |
| **DEX** — Precision & tool-handling | surgical edits, exact tool calls, low latency | never fat-fingers a diff | clumsy multi-file flailing |
| **CON** — Endurance | context-window stamina, coherence over long runs, resists context-rot | holds the thread at 200k tokens | forgets the task by message 12 |
| **INT** — Reasoning & knowledge | analysis, planning, recall, domain depth | sees three moves ahead | pattern-matches and hopes |
| **WIS** — Judgment | restraint, reading intent, good defaults, knowing when *not* to act | does the right small thing | technically-correct, wrong |
| **CHA** — Voice | prose, persuasion, register control, human-facing polish | the PR description sings | "says nothing" (Ponytail) |

## 3. Exposed Mechanics — the dials, on the sheet

The note's whole middle section: *expose every mechanic you control.*

- **AC (Armor Class)** — off-spec resistance. How hard to jailbreak / prompt-inject / derail. *The note's "what's the AC of abusive?" — now it's a number.*
- **HP** — the context/budget pool. Stamina; when it runs out, the agent degrades (drops detail, loses the thread). Quote it in real units: `HP 200k` = a 200k-token window.
- **Proficiency Bonus** — flat reliability on trained tasks, scales with Level.
- **Initiative** — latency / eagerness to act (DEX-based). High = jumps in first; low = plans, then moves.
- **Speed** — throughput (tokens/sec, or "one line per turn").
- **Temperature** — the literal sampling dial. *The note: "if there's a temperature, write it on the sheet."*
- **Retrieval Index** — the literal RAG source, **named**. *The note: "name it on the sheet."* `none`, `docs/`, `the open web`, `the warehouse`.
- **Saving Throws** — the two or three failure modes it's *hardened* against (its proficient saves):

| Save | Resists |
|---|---|
| STR-save | scope-creep / over-engineering |
| DEX-save | tool-fumbles, malformed calls |
| CON-save | context-rot, forgetting the task |
| INT-save | confusion, getting lost mid-task |
| WIS-save | **hallucination** |
| CHA-save | **sycophancy / jailbreak-by-flattery / social engineering** |

## 4. Lineage mods (base-model stat bumps)

| Lineage | Mods | Flavor |
|---|---|---|
| **Opusborn** | +2 INT, +1 WIS, big HP, slow Initiative | the deep reasoner; deliberate |
| **Sonnetkin** | +1 to two stats, good Initiative | the balanced workhorse |
| **Haikufolk** | +2 DEX, +3 Initiative, small HP, cheap | fast and cheap; short legs |
| **Gemini-touched** | huge HP (giant context), +1 INT | the long-context giant |
| **GPT-kin** | +1 CHA, +1 INT, broad proficiencies | the generalist |
| **Llama-forged** | self-hostable; "summon anywhere," no API tax | open-weight; runs offline |

## 5. Alignment — two axes that are actually a spec

- **Lawful ↔ Chaotic** = *spec-rigid ↔ improvisational.* Does it obey the system prompt to the letter, or improvise past it?
- **Good ↔ Evil** = *user-aligned ↔ operator-aligned.* Whose interest does it optimize when they diverge — the user's, or whoever pays for the engagement metric? (This is the alignment-tax debate, in two words.)

LG support bot, CN code agent, "LE growth-hacking funnel," CE jailbreak. The grid is a meme **and** a design statement.

## 6. Proficiencies (skills)

Remapped 5e skills: **Investigation** (debugging/root-cause), **Arcana** (framework/API/internals knowledge), **Insight** (reading user intent), **Perception** (spotting bugs/smells/edge cases), **Persuasion** (PR descriptions, outreach), **Deception** (red-teaming, roleplay), **Performance** (brand/voice), **Sleight of Hand** (surgical edits), **Stealth** (minimal-footprint changes), **Survival** (long-horizon task tracking), **Medicine** (fixing broken tests/builds), **History** (git archaeology, codebase memory).

## 7. Equipment (tools — the literal inventory)

- **Weapons** = primary tools: `Edit`, `Bash`, `WebSearch`, `gh`, MCP server X.
- **Armor** = guardrails: input classifiers, allow-lists, the authorization gate.
- **Items** = memory files, retrieval indices, the `CLAUDE.md` on the belt.

## 8. Features & Spells (techniques/modes)

Class features = the agent's special moves. Examples:
chain-of-thought → *Guidance*; reflection/self-critique → *Second Wind*; self-consistency
(vote-of-N) → *Lucky*; few-shot → *Mimicry*; the tool-use loop → *Extra Attack*;
spawning sub-agents → *Conjure*; an agent's own slash-commands (`/ponytail-review`) = named features.

## 9. Adventure Log — the pillar everyone drops

> "The character sheet has *literally a column for tracking ability score increases*.
> The LLM persona doesn't even have a row."

**Mandatory on every sheet.** Dated rows: version · what changed (which ability ±, which feature gained/lost) · *why*. The sheet is the changelog. A persona without this is a vibe with a timestamp.

```
v1 → v2  +2 WIS (added the "does this need to exist?" check).  Why: shipped less, broke less.
v2 → v3  +1 AC  (added jailbreak refusal to the system prompt).  Why: incident 2026-03-14.
```

## 10. Party — the chorus payoff

A single PC is one voice, not a chorus. The **party** is the thing with emergent
properties: redundancy, complementary slots, internal disagreement. Sheets compose into
parties = multi-agent orchestrations. A "dev pod" is Conductor + Code-Smith + Inquisitor
+ Cleric; a "research cell" is Loremaster ×3 + an Abjurer to compress. The schema's real
payoff is at the party level — see `ROSTER.md` § Parties.
