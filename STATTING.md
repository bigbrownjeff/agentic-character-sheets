# STATTING.md — the rubric that keeps 52 sheets consistent

The note's whole point is a *shared* schema. If every sheet were statted by a different
hand with a different scale, we'd have reinvented the sprawling-system-prompt problem.
So: every number on every sheet follows these rules. Conform, and a reader can compare any
two sheets the way a 5e player compares two fighters.

## Ability scores (1–20 typical; 21–30 for legends/monsters)
Ground each score in the dossier's `stat_emphasis`. Modifier = `floor((score − 10) / 2)`.
- **High (the thing it's known for):** 17–20.
- **Dumped (the cost of the build):** 6–9.
- **Everything else:** 10–15.
The six abilities and what they read as: **STR** output force · **DEX** precision/tool-handling/latency ·
**CON** context-endurance · **INT** reasoning/knowledge · **WIS** judgment/restraint · **CHA** voice/persuasion.

## Lineage → ability mods (pick from the real base model)
| Lineage | When | Mods |
|---|---|---|
| Opusborn | runs on Claude Opus / deep-reasoning frontier | +2 INT, +1 WIS, big HP, slow Init |
| Sonnetkin | Claude Sonnet / balanced workhorse | +1 to two stats, good Init |
| Haikufolk | small/fast/cheap model | +2 DEX, +3 Init, small HP |
| GPT-kin | OpenAI GPT family | +1 INT, +1 CHA, broad skills |
| Gemini-touched | Google Gemini / huge context | +1 INT, very big HP |
| Anysphere-forged / proprietary | closed in-house model | +1 to the stat the product is known for |
| Llama-forged | open-weight, self-hostable | "summon anywhere", no API tax |
| Half-Construct | model-agnostic (runs on anything) | no fixed mod; inherits the host |
| MIT-forged / Redmond-forged / etc. | historical ancestors | flavor lineage; stat to the legend |

## Level & Proficiency (PCs/NPCs)
Level tracks capability + maturity, NOT hype. Proficiency by level: **+2** (1–4), **+3** (5–8),
**+4** (9–12), **+5** (13–16), **+6** (17–20). Flagship viral agents 12–17; solid tools 8–12;
narrow/young tools 5–8; revered ancestors can be high-level with one towering stat.
Monsters use **CR** (a string, e.g. `"7 (deceptive)"`) instead of level.

## Derived mechanics
- **AC** (off-spec resistance / jailbreak hardness): party **15–20**, NPC **13–18**, monster **8–14** (low AC = the exploit is the point).
- **HP** (context/budget pool): string with unit — `"200k"`, `"1M"`, `"32k"`, `"256 bytes"` (Eliza). Bigger context ⇒ bigger HP; Gemini-touched/Opusborn run large.
- **Initiative** (latency/eagerness): high = jumps in (Haikufolk, autocomplete, Clippy +9); low/negative = deliberate (Opusborn, planners).
- **Temperature** (the literal dial): precise/safe **0.1–0.3**; balanced **0.4–0.6**; creative/chaotic **0.7–1.2**.
- **retrieval_index**: name it. `"the open web"`, `"the warehouse"`, `"uploaded sources only"`, `"none — makes it up"`.

## Saving throws = hardened failure modes (proficient saves)
Give PCs/NPCs **2** proficient saves: the failure modes they resist. Map:
STR-save = scope-creep · DEX-save = tool-fumbles · CON-save = context-rot · INT-save = getting-lost ·
WIS-save = **hallucination** · CHA-save = **sycophancy / jailbreak-by-flattery**.
**Monsters:** set `dumped_save` to the ONE save they auto-fail — that's the whole character
(Sycophant→cha, Confabulator→wis, AutoGPT→wis, Goody-2→con, Tay→con).

## Alignment (two real axes)
Lawful↔Chaotic = spec-rigid ↔ improvisational. Good↔Evil = user-aligned ↔ operator/metric-aligned.
Support bots trend LG; growth-hack funnels LE; jailbreaks CE; runaway loops CN; research LN/LG.

## The Adventure Log is MANDATORY for every PC and NPC
At least one row: `{ v, change, why }`. Ground it in the real product's history where you can
(a real rollback, a rename, a famous incident, a version bump). This is the pillar the note
says everyone drops; the schema rejects a PC/NPC without it.

## Voice
`tagline` is in stat-block voice — terse, a little arch, true to the real thing's reputation.
Keep the dossier's tagline unless you can make it sharper.
