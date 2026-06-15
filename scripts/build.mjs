#!/usr/bin/env node
// Merge data/sheets/*.json -> data/characters.json, validating against schema/sheet.json.
// Zero deps: a hand-rolled checker of the rules that matter. Loud errors, no silent pass.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEETS = join(ROOT, 'data', 'sheets');
const ENUMS = {
  role: ['party', 'npc', 'monster'],
  virality: ['viral', 'idiomatic', 'niche'],
  source_kind: ['github', 'product', 'wikipedia', 'blog', 'news', 'reddit', 'film', 'meme-origin'],
  alignment: ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'],
};
const ABIL = ['str','dex','con','int','wis','cha'];
const BASE_REQ = ['id','name','title','represents','source_url','source_kind','verified','virality','lineage','alignment','role','adventures','abilities','tagline'];
const PCNPC_REQ = ['class','level','ac','saves','log'];
const MONSTER_REQ = ['cr','dumped_save'];

const errors = [];
const all = [];
for (const f of readdirSync(SHEETS).filter(f => f.endsWith('.json')).sort()) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(SHEETS, f), 'utf8')); }
  catch (e) { errors.push(`${f}: invalid JSON — ${e.message}`); continue; }
  if (!Array.isArray(arr)) { errors.push(`${f}: not a JSON array`); continue; }
  for (const c of arr) all.push({ ...c, _file: f });
}

const ids = new Set();
for (const c of all) {
  const who = `${c._file}:${c.id ?? '(no id)'}`;
  for (const k of BASE_REQ) if (c[k] === undefined) errors.push(`${who}: missing required '${k}'`);
  if (c.id && ids.has(c.id)) errors.push(`${who}: duplicate id`);
  if (c.id) ids.add(c.id);
  if (c.role && !ENUMS.role.includes(c.role)) errors.push(`${who}: bad role '${c.role}'`);
  if (c.virality && !ENUMS.virality.includes(c.virality)) errors.push(`${who}: bad virality '${c.virality}'`);
  if (c.source_kind && !ENUMS.source_kind.includes(c.source_kind)) errors.push(`${who}: bad source_kind '${c.source_kind}'`);
  if (c.alignment && !ENUMS.alignment.includes(c.alignment)) errors.push(`${who}: bad alignment '${c.alignment}'`);
  if (c.source_url && !/^https?:\/\//.test(c.source_url)) errors.push(`${who}: source_url not a URL`);
  if (c.abilities) {
    for (const a of ABIL) {
      const v = c.abilities[a];
      if (!Number.isInteger(v) || v < 1 || v > 30) errors.push(`${who}: abilities.${a} out of range (${v})`);
    }
  }
  const req = c.role === 'monster' ? MONSTER_REQ : PCNPC_REQ;
  for (const k of req) if (c[k] === undefined) errors.push(`${who}: role '${c.role}' missing '${k}'`);
  if (c.role !== 'monster' && Array.isArray(c.saves) && c.saves.length !== 2) errors.push(`${who}: expected 2 proficient saves, got ${c.saves.length}`);
  if (c.role !== 'monster' && Array.isArray(c.log) && c.log.length < 1) errors.push(`${who}: PC/NPC needs >=1 log row (the evolution-log pillar)`);
}

// Referential integrity: every id cast in adventures.json must exist.
const advs = JSON.parse(readFileSync(join(ROOT, 'data', 'adventures.json'), 'utf8')).adventures;
for (const a of advs)
  for (const slot of ['party','npcs','bestiary'])
    for (const id of a[slot] || [])
      if (!ids.has(id)) errors.push(`adventures.json:${a.id}.${slot}: unknown persona id '${id}'`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} validation error(s):\n` + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}

all.sort((a, b) => a.name.localeCompare(b.name));
const out = all.map(({ _file, ...c }) => c);
const json = JSON.stringify(out, null, 2) + '\n';
writeFileSync(join(ROOT, 'data', 'characters.json'), json);

// Make the static site self-contained & Cloudflare-Pages-deployable: mirror data into site/data/.
const siteData = join(ROOT, 'site', 'data');
mkdirSync(siteData, { recursive: true });
writeFileSync(join(siteData, 'characters.json'), json);
copyFileSync(join(ROOT, 'data', 'adventures.json'), join(siteData, 'adventures.json'));

// Serve the frozen schema alongside the site so essay/nav links to it resolve on deploy.
const siteSchema = join(ROOT, 'site', 'schema');
mkdirSync(siteSchema, { recursive: true });
copyFileSync(join(ROOT, 'schema', 'sheet.json'), join(siteSchema, 'sheet.json'));

const by = (k) => out.reduce((m, c) => (m[c[k]] = (m[c[k]] || 0) + 1, m), {});
console.log(`✓ ${out.length} characters validated -> data/characters.json`);
console.log(`  roles: ${JSON.stringify(by('role'))}`);
console.log(`  virality: ${JSON.stringify(by('virality'))}`);
console.log(`  adventures: ${advs.length} (${advs.map(a => a.id).join(', ')})`);
