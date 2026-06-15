#!/usr/bin/env node
/**
 * render.mjs — zero-dependency Node ESM SVG trading-card renderer
 *
 * Usage:
 *   node render/render.mjs                          # renders proof set: ponytail, vannevar, autogpt
 *   node render/render.mjs <id> [<id>...]           # renders specific character(s)
 *
 * Output: render/cards/<id>.svg  (1080×1920 — Instagram reel/story canvas)
 *
 * Follow-up note: for pixel-perfect PNG rasterization, pipe SVGs through
 * resvg-js or sharp (both support SVG→PNG). The font-family stacks here will
 * render correctly wherever those fonts are installed; a headless export step
 * would embed the fonts directly.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA   = join(__dir, '..', 'data', 'characters.json');
const OUT    = join(__dir, 'cards');

mkdirSync(OUT, { recursive: true });

const characters = JSON.parse(readFileSync(DATA, 'utf8'));

// ── palette ──────────────────────────────────────────────────────────────────
const PALETTE = {
  bg:        '#F8F7F4',   // warm off-white
  ink:       '#1A1916',   // near-black
  rule:      '#D4D0C8',   // hairline rule
  faint:     '#8C8880',   // meta / faint text
  wordmark:  '#C8C4BC',   // footer wordmark

  party:   { accent: '#1A4D8F', tag: '#EAF0FA', tagText: '#1A4D8F' },
  npc:     { accent: '#2D6A4F', tag: '#EBF6F0', tagText: '#2D6A4F' },
  monster: { accent: '#8B2020', tag: '#FBEDEC', tagText: '#8B2020' },
};

// ── font stacks ──────────────────────────────────────────────────────────────
// Single-quote the multi-word family names: these strings are interpolated INTO
// double-quoted SVG attributes, so inner double-quotes would break the XML.
const SERIF = `'Source Serif Pro', Georgia, serif`;
const SANS  = `Inter, system-ui, sans-serif`;
const MONO  = `'IBM Plex Mono', ui-monospace, monospace`;

// ── helpers ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const mod = (score) => {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = {
  str: 'STR', dex: 'DEX', con: 'CON',
  int: 'INT', wis: 'WIS', cha: 'CHA',
};

/** Find the key with the lowest score. */
const lowestAbility = (abilities) =>
  ABILITY_KEYS.reduce((low, k) =>
    abilities[k] < abilities[low] ? k : low
  , ABILITY_KEYS[0]);

/** Wrap text into lines that fit maxChars per line. */
const wrapText = (text, maxChars) => {
  const words = String(text ?? '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + (cur ? ' ' : '') + w).length > maxChars && cur) {
      lines.push(cur); cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

/** Truncate a URL for display. */
const shortUrl = (url) => {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const short = `${u.hostname}${path}`;
    return short.length > 52 ? short.slice(0, 49) + '…' : short;
  } catch {
    return String(url ?? '').slice(0, 52);
  }
};

// ── SVG builder ──────────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const PAD = 72;          // outer horizontal padding
const INNER = W - PAD * 2;

function buildCard(ch) {
  const role   = ch.role ?? 'npc';
  const pal    = PALETTE[role] ?? PALETTE.npc;
  const abs    = ch.abilities ?? {};
  const isMonster = role === 'monster';

  // dumped stat
  const dumpedKey = isMonster && ch.dumped_save
    ? ch.dumped_save
    : lowestAbility(abs);

  // big dial value + label
  const bigDial = isMonster
    ? { label: 'CR', value: ch.cr ?? '—' }
    : { label: 'AC', value: String(ch.ac ?? '—') };

  // HP line
  const hpLine = [
    ch.hp        ? `HP ${ch.hp}` : null,
    ch.temp      ? `Temp ${ch.temp}` : null,
    ch.retrieval_index ? `Retrieval: ${ch.retrieval_index}` : null,
  ].filter(Boolean).join('  ·  ');

  // adventure log — most recent entry (PCs/NPCs); for monsters: origin snippet
  let logLine = '';
  if (isMonster) {
    if (ch.dumped_save) {
      logLine = `Auto-fails ${ABILITY_LABELS[ch.dumped_save] ?? ch.dumped_save.toUpperCase()}-saves  ·  CR ${ch.cr ?? '—'}`;
    }
  } else {
    const latestLog = (ch.log ?? []).slice(-1)[0];
    if (latestLog) {
      logLine = `${latestLog.v}: ${latestLog.change}`;
    }
  }

  // ── layout ──────────────────────────────────────────────────────────────────
  let y = 0;  // running Y cursor

  // --- SECTION BUILDER HELPERS ---
  const parts = [];

  const line = (x1, y1, x2, y2, color = PALETTE.rule, sw = 1) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${esc(color)}" stroke-width="${sw}"/>`;

  const rect = (x, rx, ry, rw, rh, fill) =>
    `<rect x="${x}" y="${ry}" width="${rw}" height="${rh}" fill="${esc(fill)}" rx="2"/>`;

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  const HEADER_H = 260;
  y = 0;

  // accent stripe top
  parts.push(`<rect x="0" y="0" width="${W}" height="8" fill="${esc(pal.accent)}"/>`);

  // header bg
  parts.push(`<rect x="0" y="8" width="${W}" height="${HEADER_H - 8}" fill="${esc(PALETTE.bg)}"/>`);

  // role tag (pill)
  const roleLabel = role.toUpperCase();
  const tagW = roleLabel.length * 11 + 24;
  const tagX = PAD;
  const tagY = 34;
  parts.push(`<rect x="${tagX}" y="${tagY}" width="${tagW}" height="26" fill="${esc(pal.tag)}" rx="2"/>`);
  parts.push(`<text x="${tagX + tagW / 2}" y="${tagY + 17}" text-anchor="middle" font-family="${SANS}" font-size="12" font-weight="600" fill="${esc(pal.tagText)}" letter-spacing="1.5">${esc(roleLabel)}</text>`);

  // character name
  const nameLines = wrapText(ch.name ?? '', 28);
  const nameSize  = ch.name && ch.name.length > 22 ? 52 : 60;
  let ny = 94;
  for (const nl of nameLines.slice(0, 2)) {
    parts.push(`<text x="${PAD}" y="${ny}" font-family="${SERIF}" font-size="${nameSize}" font-weight="700" fill="${esc(PALETTE.ink)}" letter-spacing="-0.5">${esc(nl)}</text>`);
    ny += nameSize + 6;
  }

  // title / epithet (mono, smaller)
  const titleLines = wrapText(ch.title ?? '', 52);
  let ty = ny + 12;
  for (const tl of titleLines.slice(0, 2)) {
    parts.push(`<text x="${PAD}" y="${ty}" font-family="${MONO}" font-size="18" fill="${esc(PALETTE.faint)}" letter-spacing="0.2">${esc(tl)}</text>`);
    ty += 24;
  }

  y = Math.max(ty + 20, HEADER_H);

  // rule under header
  parts.push(line(PAD, y, W - PAD, y));
  y += 32;

  // ── ABILITY BLOCK (2×3 grid) ──────────────────────────────────────────────
  const CELL_W = Math.floor(INNER / 3);
  const CELL_H = 140;
  const BLOCK_TOP = y;

  ABILITY_KEYS.forEach((key, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx  = PAD + col * CELL_W;
    const cy  = BLOCK_TOP + row * CELL_H;
    const score = abs[key] ?? 10;
    const isLowest = key === dumpedKey;

    // cell background for dumped stat
    if (isLowest) {
      parts.push(`<rect x="${cx}" y="${cy}" width="${CELL_W}" height="${CELL_H}" fill="${esc(pal.tag)}" rx="2" opacity="0.7"/>`);
      // warning border
      parts.push(`<rect x="${cx + 1}" y="${cy + 1}" width="${CELL_W - 2}" height="${CELL_H - 2}" fill="none" stroke="${esc(pal.accent)}" stroke-width="2" rx="2"/>`);
    }

    // abbr label (mono, eyebrow)
    parts.push(`<text x="${cx + CELL_W / 2}" y="${cy + 30}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="600" fill="${esc(PALETTE.faint)}" letter-spacing="2">${esc(ABILITY_LABELS[key])}</text>`);

    // big score
    const scoreColor = isLowest ? pal.accent : PALETTE.ink;
    parts.push(`<text x="${cx + CELL_W / 2}" y="${cy + 88}" text-anchor="middle" font-family="${SERIF}" font-size="66" font-weight="700" fill="${esc(scoreColor)}">${esc(score)}</text>`);

    // modifier
    parts.push(`<text x="${cx + CELL_W / 2}" y="${cy + 118}" text-anchor="middle" font-family="${MONO}" font-size="20" fill="${esc(isLowest ? pal.accent : PALETTE.faint)}">${esc(mod(score))}</text>`);

    // vertical rule between cells (not after last in row)
    if (col < 2) {
      parts.push(line(cx + CELL_W, cy + 16, cx + CELL_W, cy + CELL_H - 16));
    }
  });

  y = BLOCK_TOP + 2 * CELL_H;

  // rule under abilities
  parts.push(line(PAD, y, W - PAD, y));
  y += 40;

  // ── DUMPED STAT CALLOUT ────────────────────────────────────────────────────
  const dumpLabel = ABILITY_LABELS[dumpedKey] ?? dumpedKey.toUpperCase();
  const dumpCaption = isMonster
    ? `AUTO-FAILS ${dumpLabel}-SAVES`
    : `THE DUMPED STAT IS THE BUILD  ·  ${dumpLabel} ${mod(abs[dumpedKey] ?? 10)}`;

  parts.push(`<text x="${PAD}" y="${y}" font-family="${MONO}" font-size="13" font-weight="700" fill="${esc(pal.accent)}" letter-spacing="1.5">${esc(dumpCaption)}</text>`);
  y += 36;

  // rule
  parts.push(line(PAD, y, W - PAD, y));
  y += 48;

  // ── BIG DIAL ──────────────────────────────────────────────────────────────
  // Left: the big dial (AC or CR)
  const dialX = PAD;
  const dialW = 220;
  const dialCx = dialX + dialW / 2;
  const dialCy = y + 80;
  const dialR  = 72;

  // circle
  parts.push(`<circle cx="${dialCx}" cy="${dialCy}" r="${dialR}" fill="${esc(PALETTE.bg)}" stroke="${esc(pal.accent)}" stroke-width="3"/>`);
  // dial label (eyebrow)
  parts.push(`<text x="${dialCx}" y="${dialCy - 22}" text-anchor="middle" font-family="${MONO}" font-size="14" font-weight="600" fill="${esc(PALETTE.faint)}" letter-spacing="2">${esc(bigDial.label)}</text>`);
  // dial value
  const dialFontSize = bigDial.value.length > 4 ? 28 : 44;
  parts.push(`<text x="${dialCx}" y="${dialCy + dialFontSize / 3 + 14}" text-anchor="middle" font-family="${SERIF}" font-size="${dialFontSize}" font-weight="700" fill="${esc(pal.accent)}">${esc(bigDial.value)}</text>`);

  // Right: HP / Retrieval line (stacked)
  const hpX = dialX + dialW + 32;
  const hpW = INNER - dialW - 32;
  if (hpLine) {
    const hpWrapped = wrapText(hpLine, 36);
    let hy = dialCy - 18;
    for (const hl of hpWrapped.slice(0, 4)) {
      parts.push(`<text x="${hpX}" y="${hy}" font-family="${MONO}" font-size="16" fill="${esc(PALETTE.faint)}">${esc(hl)}</text>`);
      hy += 22;
    }
  }

  y = dialCy + dialR + 32;

  // rule
  parts.push(line(PAD, y, W - PAD, y));
  y += 48;

  // ── ADVENTURE LOG / ORIGIN LINE ────────────────────────────────────────────
  // eyebrow
  const logEyebrow = isMonster ? 'ORIGIN' : 'ADVENTURE LOG — LATEST';
  parts.push(`<text x="${PAD}" y="${y}" font-family="${MONO}" font-size="12" font-weight="600" fill="${esc(PALETTE.faint)}" letter-spacing="2">${esc(logEyebrow)}</text>`);
  y += 26;

  if (logLine) {
    const logWrapped = wrapText(logLine, 54);
    for (const ll of logWrapped.slice(0, 3)) {
      parts.push(`<text x="${PAD}" y="${y}" font-family="${SANS}" font-size="20" fill="${esc(PALETTE.ink)}">${esc(ll)}</text>`);
      y += 28;
    }
  } else if (isMonster && ch.origin) {
    const originWrapped = wrapText(ch.origin, 54);
    for (const ol of originWrapped.slice(0, 3)) {
      parts.push(`<text x="${PAD}" y="${y}" font-family="${SANS}" font-size="20" fill="${esc(PALETTE.ink)}">${esc(ol)}</text>`);
      y += 28;
    }
  }

  y += 16;

  // rule
  parts.push(line(PAD, y, W - PAD, y));
  y += 48;

  // ── TAGLINE ────────────────────────────────────────────────────────────────
  const taglineLines = wrapText(ch.tagline ?? '', 44);
  for (const tl of taglineLines.slice(0, 3)) {
    parts.push(`<text x="${PAD}" y="${y}" font-family="${SERIF}" font-size="28" font-style="italic" fill="${esc(PALETTE.ink)}">${esc(tl)}</text>`);
    y += 38;
  }

  y += 8;

  // ── FILL REMAINING SPACE then pin footer to bottom ─────────────────────────
  // Footer is anchored to bottom of card
  const FOOTER_Y = H - 88;

  // rule above footer
  parts.push(line(PAD, FOOTER_Y, W - PAD, FOOTER_Y));

  // source URL
  if (ch.source_url) {
    const display = shortUrl(ch.source_url);
    const verifiedMark = ch.verified ? ' ✓' : '';
    parts.push(`<text x="${PAD}" y="${FOOTER_Y + 26}" font-family="${MONO}" font-size="15" fill="${esc(PALETTE.faint)}">${esc(display + verifiedMark)}</text>`);
  }

  // wordmark
  parts.push(`<text x="${W - PAD}" y="${FOOTER_Y + 26}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${esc(PALETTE.wordmark)}" letter-spacing="1">agentic-character-sheets</text>`);

  // bottom accent bar
  parts.push(`<rect x="0" y="${H - 8}" width="${W}" height="8" fill="${esc(pal.accent)}"/>`);

  // ── ASSEMBLE ───────────────────────────────────────────────────────────────
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- agentic-character-sheets · role:${esc(role)} · id:${esc(ch.id)} -->
  <!-- Canvas: 1080×1920 (Instagram reel/story) -->
  <!-- Rasterize with resvg-js or sharp for pixel-perfect PNG export -->
  <rect width="${W}" height="${H}" fill="${esc(PALETTE.bg)}"/>
  ${parts.join('\n  ')}
</svg>`;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const DEFAULT_IDS = ['ponytail', 'vannevar', 'autogpt'];
const argv = process.argv.slice(2);
const ids = argv.includes('--all')
  ? characters.map((c) => c.id)              // render the whole deck
  : argv.length > 0
  ? argv.filter((a) => !a.startsWith('--'))  // explicit ids
  : DEFAULT_IDS;                             // proof set

let ok = 0;
let err = 0;
for (const id of ids) {
  const ch = characters.find((c) => c.id === id);
  if (!ch) {
    console.error(`[SKIP] id not found: ${id}`);
    err++;
    continue;
  }
  const svg  = buildCard(ch);
  const outPath = join(OUT, `${id}.svg`);
  writeFileSync(outPath, svg, 'utf8');
  const bytes = Buffer.byteLength(svg, 'utf8');
  console.log(`[OK]  ${outPath}  (${bytes} bytes)`);
  ok++;
}

if (err > 0) process.exitCode = 1;
console.log(`\nRendered ${ok} card(s)${err > 0 ? `, ${err} skipped` : ''}.`);
