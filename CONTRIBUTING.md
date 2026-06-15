# Contributing a character sheet

## The one rule

**A PR that omits a required slot fails CI on purpose.** The repo is the thesis: you can't fake a character sheet any more than you can fake a prompt. The build rejects the sheet, and the PR stays open until it's complete.

## How to add a character

1. Drop a `.json` file in `data/sheets/` (or append to an existing file — each file is a JSON array of one or more sheets).
2. Conform to `schema/sheet.json`. See `SCHEMA.md` for field-by-field guidance and `STATTING.md` for the stat-assignment philosophy.
3. Run `npm run build` locally. Fix all errors before opening a PR.

## Required slots by role

**Party members and NPCs** (`role: "party"` or `"npc"`) require:

- `class`, `level`, `ac`, `saves` (exactly 2 ability names), `log` (at least 1 entry)

Each `log` entry requires `v` (version label), `change` (what moved), and `why` (the reason). This is the evolution log — the pillar everyone drops.

**Monsters** (`role: "monster"`) require:

- `cr` (Challenge Rating string, e.g. `"9 (banished)"`)
- `dumped_save` (the one save the monster auto-fails — its whole character)

**All roles** require: `id`, `name`, `title`, `represents`, `source_url`, `source_kind`, `verified`, `virality`, `lineage`, `alignment`, `role`, `adventures`, `abilities`, `tagline`.

The `adventures` array must contain at least one adventure id from `data/adventures.json`. If the character belongs to a new adventure, add the adventure to that file first.

## CI

GitHub Actions runs `node scripts/build.mjs` on every push and pull request. If validation fails, the job fails. There is no override — fix the sheet.
