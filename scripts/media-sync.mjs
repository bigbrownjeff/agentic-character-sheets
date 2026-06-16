#!/usr/bin/env node
/*
 * media-sync.mjs — sync site/cards media with the Cloudflare R2 media bucket.
 *
 *   node scripts/media-sync.mjs push [--dry]   upload local site/cards/** to R2   (needs wrangler auth)
 *   node scripts/media-sync.mjs pull [--dry]   download media from the public R2 URL (NO auth)
 *
 * Why: binary media (images, beat videos, future audio) does NOT belong in git —
 * it grows forever. It lives in R2 (durable, cheap, zero-egress). A fresh clone —
 * local OR a cloud session — runs `pull` to get the media; after generating new
 * art it runs `push`. The public URL + a manifest.json index make `pull`
 * credential-free, so any environment can restore the media.
 *
 * Reads the bucket + public base from site/data/media.json.
 * Writes go through `wrangler r2 object put --remote` (uses your wrangler login).
 * Reads go through the public base URL (no auth) + the uploaded manifest.json.
 *
 * Zero deps (Node 20+).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const CARDS = join(REPO, 'site', 'cards');
const MEDIA = JSON.parse(readFileSync(join(REPO, 'site', 'data', 'media.json'), 'utf8'));
const BUCKET = MEDIA.bucket;
const BASE = MEDIA.base.replace(/\/$/, '');
const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|webm|mov|mp3|m4a|wav)$/i;
const POOL = 8;

const mode = process.argv[2];
const dry = process.argv.includes('--dry');

/* run async tasks with a bounded concurrency pool */
async function pool(items, n, fn) {
  const out = []; let i = 0; let ok = 0; let fail = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); ok++; }
      catch (e) { out[idx] = null; fail++; console.error(`  FAIL ${items[idx].key || items[idx]}: ${e.message.split('\n')[0]}`); }
      if ((ok + fail) % 25 === 0) console.log(`  …${ok + fail}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return { out, ok, fail };
}

/* recursively list media files under site/cards -> [{abs, key}] (key is R2 path, e.g. cards/sheets/x.png) */
function listLocal(dir = CARDS, acc = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) listLocal(abs, acc);
    else if (MEDIA_RE.test(name)) acc.push({ abs, key: 'cards/' + relative(CARDS, abs) });
  }
  return acc;
}

async function wranglerPut(key, file) {
  // --remote is REQUIRED: without it wrangler writes to the local Miniflare sim, not real R2.
  await execFileP('npx', ['--yes', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--remote'], {
    cwd: REPO, maxBuffer: 1 << 24,
  });
}

async function push() {
  const files = listLocal();
  console.log(`push: ${files.length} media file(s) -> r2://${BUCKET}/  (base ${BASE})`);
  if (dry) { files.slice(0, 10).forEach((f) => console.log('  ' + f.key)); console.log(files.length > 10 ? `  …+${files.length - 10}` : ''); return; }
  const { ok, fail } = await pool(files, POOL, (f) => wranglerPut(f.key, f.abs));
  // manifest.json indexes everything we uploaded, so `pull` needs no list API / no creds.
  const manifest = { base: BASE, count: files.length, keys: files.map((f) => f.key).sort() };
  const mPath = join(REPO, 'site', 'cards', 'manifest.json');
  writeFileSync(mPath, JSON.stringify(manifest, null, 2));
  await wranglerPut('manifest.json', mPath);
  console.log(`push done: ${ok} ok, ${fail} failed, +manifest.json (${files.length} keys)`);
}

async function pull() {
  const res = await fetch(`${BASE}/manifest.json`);
  if (!res.ok) throw new Error(`no manifest.json at ${BASE} (HTTP ${res.status}) — run \`push\` first`);
  const manifest = await res.json();
  const keys = manifest.keys || [];
  console.log(`pull: ${keys.length} media file(s) from ${BASE}`);
  if (dry) { keys.slice(0, 10).forEach((k) => console.log('  ' + k)); console.log(keys.length > 10 ? `  …+${keys.length - 10}` : ''); return; }
  const { ok, fail } = await pool(keys, POOL, async (key) => {
    const dest = join(REPO, 'site', key); // key is cards/... -> site/cards/...
    if (existsSync(dest)) return; // already have it
    const r = await fetch(`${BASE}/${key}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  });
  console.log(`pull done: ${ok} ok, ${fail} failed`);
}

if (mode === 'push') await push();
else if (mode === 'pull') await pull();
else { console.error('usage: media-sync.mjs <push|pull> [--dry]'); process.exit(1); }
