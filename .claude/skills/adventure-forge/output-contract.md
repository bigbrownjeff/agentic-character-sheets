# output-contract.md — answers → schema → validated files

How to turn the intake answers into files the build accepts. Defer to `SCHEMA.md`,
`STATTING.md`, and `BEATS.md` for the *why*; this is the *where* and the *shape*.

## Mapping cheatsheet (intake → fields)

| Intake answer | Field(s) | Rule (STATTING.md) |
|---|---|---|
| A1 name / who based on | `name`, `represents`; if real product → `source_url`, `source_kind`, `verified`, `signal` | name has no leading "The"; cite-or-cut on any factual claim |
| A2 what they're great at | headline ability **17–20**; `class`, `subclass`, `title` | one towering stat; map domain → STR/DEX/CON/INT/WIS/CHA |
| A3 what they overdo | dumped ability **6–9**; monsters: `dumped_save` | the cost of the build; externalize it (steering rule 1) |
| A4 how they show up for others | `alignment`, two proficient `saves` | lean Good/collaborative; saves = the failure modes they resist |
| A5 a moment they grew | `log[]` (≥1 row: `v`, `change`, `why`) | **mandatory**; this is the unique outcome / re-authoring |
| A6 their quote | `tagline` | stat-block voice |
| (inferred) | `ac` 5–25, `hp` (string w/ unit), `initiative` -5..15, `temperature` 0–2, `level` 1–20 or `cr` (string), `lineage`, `prof`, `skills`, `feature`, `weapon`, `armor` | infer from A2–A4; don't ask a non-expert |

`role` is `party`, `npc`, or `monster`. Remaining-stats fill the **10–15** band. Modifier =
`floor((score − 10) / 2)`.

## Where things go

**Character** — append one JSON object to a file under `data/sheets/` (e.g. a new
`data/sheets/NN-<slug>.json` as a one-element array, or into an existing themed file). Required
slots (build rejects a miss): `id, name, title, represents, source_url, source_kind, verified,
virality, lineage, alignment, role, adventures, abilities, tagline` — plus for party/npc
`class, level, ac, saves` (exactly 2) `, log` (≥1 row); for monster `cr, dumped_save`.
`id` must be kebab `^[a-z0-9-]+$` and unique. `adventures` must list ≥1 adventure id.

> **Real people → keep private.** Write to a git-ignored dir (`local/sheets/…`) or hand the
> JSON to the user. Do not commit real-person sheets to the public repo (see SKILL.md).

**Adventure** — add an object to `data/adventures.json#adventures`: `id, name, use_category,
quest, party[], npcs[], bestiary[]`. **Every id in party/npcs/bestiary must resolve to a real
sheet** or `build.mjs` fails on referential integrity (this is intentional). Reuse existing
monsters where they fit — monsters recur across adventures.

**Beat** — append to `site/data/beats.json#beats`: `id` (kebab; also the image-path and
style-c key), `title`, `adventure` (display name), `caption`, and `cards[]` (each `{caption,
scene}`, 5–9 of them). Also include the saga fields from BEATS.md: `archetype`, `moral`,
`event`. Open and close on the same image (ring composition).

**Optional polish** — a module cover in `site/data/covers.json#covers[<adventure-id>]`
(`{title, scene}`, painterly Style-A grammar), and a Trend graphic style at
`site/data/style-c/<beat-id>.json` (`{adventure, name, rationale, preamble}`).

## Validate (required before "done")

```bash
npm run build
```

- It merges + validates every sheet, checks adventure→sheet referential integrity, regenerates
  `data/characters.json` and the `site/data/` mirrors, and **exits non-zero on any error**.
- Fix every reported error and re-run until green. A green build is the definition of done for
  characters and adventures.
- `beats.json`, `covers.json`, and `style-c/*` are **not** build-validated and **not** mirrored
  — edit them directly under `site/data/`, and just confirm the JSON parses
  (`node -e "JSON.parse(require('fs').readFileSync('site/data/beats.json','utf8'))"`).

## Worked micro-example (Character)

Intake: *"Make my sister Mara — she's an incredible planner, but she overcommits and burns out;
she's the one who holds the group together; last year she finally said no to a project and it
saved her."*

→ (kept private, written to `local/sheets/mara.json`)

```json
{
  "id": "mara-the-planner", "name": "Mara the Ever-Ready",
  "title": "Quartermaster of the Group That Would Fall Apart Without Her",
  "represents": "a real person (private)", "source_url": "https://example.invalid/private",
  "source_kind": "blog", "verified": false, "virality": "niche",
  "class": "Quartermaster", "subclass": "Order of the Standing Plan",
  "lineage": "Half-Construct (kin-forged)", "alignment": "Lawful Good",
  "level": 6, "ac": 16, "hp": "runs hot", "prof": 3, "initiative": 2, "temperature": 0.3,
  "retrieval_index": "every shared calendar at once",
  "adventures": ["the-round-table-of-unscripted-hands"],
  "abilities": { "str": 11, "dex": 13, "con": 12, "int": 17, "wis": 15, "cha": 14 },
  "saves": ["int", "wis"],
  "feature": "Holds the Line: the group functions because she planned for the thing no one else saw coming",
  "tagline": "She already booked it, packed it, and made a backup. Tame the Overcommit and she's unstoppable.",
  "role": "party",
  "log": [{ "v": "v1", "change": "learned the save: said no", "why": "Turned down one project last year; the burnout lifted and the work got better — the day the Overcommit didn't win" }]
}
```

Note the moves: the flaw ("the Overcommit") is **externalized**, the strength leads, the log is
the **unique outcome**, the alignment is collaborative, and — because Mara is a real person —
it lives in a **git-ignored** path, never the public roster.
