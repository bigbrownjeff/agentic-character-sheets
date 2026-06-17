/**
 * Cloudflare Pages Function — /api/sheet
 *
 * Render the FULL ornate character-sheet (the painted parchment + brass-frame card,
 * like the canonical /characters cards) for a forged hero the user picked to play.
 * This is the heavyweight, high-fidelity render (gemini-3-pro-image, 4:5, 2K) so we do
 * it ONLY on the chosen hero, not all three forge builds. Mirrors the local
 * generate-sheets.mjs pipeline (same TEMPLATE, same per-score effect text) and uses the
 * canonical Ponytail card in R2 as the style anchor so it matches the fleet.
 *
 * POST /api/sheet  { hero: { name, title?, class?, subclass?, lineage?, level?, alignment?,
 *                            abilities{str..cha}, saves?, feature?, tagline?, ac?, hp? }, saveKey? }
 *   -> { image: "data:image/png;base64,…", saved? }
 *
 * Env: GEMINI_API_KEY; SHEET_MODEL (default gemini-3-pro-image); MEDIA (R2 binding, for the
 * anchor fetch + optional persist); MEDIA_BASE.
 */
interface R2Obj { arrayBuffer(): Promise<ArrayBuffer>; }
interface R2Like { get(key: string): Promise<R2Obj | null>; put(key: string, value: ArrayBuffer, opts?: unknown): Promise<unknown>; }
interface Env { GEMINI_API_KEY?: string; SHEET_MODEL?: string; MEDIA?: R2Like; MEDIA_BASE?: string; }

const MEDIA_BASE_DEFAULT = 'https://pub-92102a1a4a2e4137b3e39df163badf14.r2.dev';
const ANCHOR_KEY = 'cards/sheets/ponytail.png';

const ABBR: Record<string, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
// Per-ability effect text BY SCORE TIER — provided so the model renders THIS hero's effects
// (high score = strong, low = weak), never copying the reference card's. Same table as the fix.
const DESC: Record<string, { hi: string; mid: string; lo: string }> = {
  str: { hi: 'Crushing grip; hefts what others cannot lift', mid: 'Capable strength; holds its own', lo: 'Feeble grip; struggles with loads' },
  dex: { hi: 'Preternatural agility; moves with impossible grace', mid: 'Steady and sure-footed', lo: 'Stiff and clumsy; slow to react' },
  con: { hi: 'Robust physique; endures strain and poison', mid: 'Sound constitution; rarely falters', lo: 'Frail; tires and sickens easily' },
  int: { hi: 'Sharp intellect; calculates probabilities', mid: 'Clear reasoning; learns quickly', lo: 'Slow to reason; misses the obvious' },
  wis: { hi: 'Peerless insight; sees the truth beneath', mid: 'Level-headed; reads a room', lo: 'Blind to the obvious; easily fooled' },
  cha: { hi: 'Commanding presence; bends a room', mid: 'Personable; holds attention', lo: 'Minimal presence; ignored or misunderstood' },
};
const tier = (v: number) => (v >= 16 ? 'hi' : v <= 9 ? 'lo' : 'mid');
const mod = (s: number) => { const m = Math.floor((s - 10) / 2); return m < 0 ? '−' + Math.abs(m) : '+' + m; };

const TEMPLATE = 'A full-color fantasy RPG character record sheet. Style: Pillars of Eternity character screen meets a modern D&D 2024 sheet, painterly and ornate, never flat. 4:5 portrait, stack the portrait above the stat panel. An ornate carved dark-walnut frame with aged brass corner brackets borders the whole image. LEFT ~40%: a large painterly, semi-realistic oil-painted character portrait (head-and-shoulders) in a recessed gilt frame, dramatic chiaroscuro lighting, Wizards-of-the-Coast house style. RIGHT ~60%: an aged parchment record panel with fantasy serif type and small leaf-flourish (❧) section dividers. Muted palette (parchment cream, oxblood red, ink-brown, brass gold) plus one accent color. Panel layout top to bottom: a header (Name / Class / Race / Background / Level); a ❧ Attributes ❧ 2x3 grid of the six abilities, each as ABBREVIATION + a large number + (modifier) + a short colored effect, with the modifier circled (as on the 2024 D&D sheet); a thin rule; a derived line (Armor Class, Health, Saving Throws); a ❧ Signature ❧ feature line; and an italic tagline at the bottom. Crisp, legible lettering.';

function cors(): Record<string, string> {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

interface Hero { name?: string; title?: string; class?: string; subclass?: string; lineage?: string; level?: number | string; alignment?: string; abilities?: Record<string, number>; saves?: string[]; feature?: string; tagline?: string; ac?: number | string; hp?: number | string; }

function lowestKey(a: Record<string, number>): string { return ORDER.reduce((lo, k) => ((a[k] || 10) < (a[lo] || 10) ? k : lo), 'str'); }
function gridLines(a: Record<string, number>): string {
  return ORDER.map((k) => `${ABBR[k]} ${a[k]} (${mod(a[k])}): ${DESC[k][tier(a[k])]}`).join('\n');
}
function buildPrompt(h: Hero): string {
  const a = h.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const low = ABBR[lowestKey(a)];
  const portrait = `a dignified ${h.class || 'adventurer'}${h.title ? ', ' + h.title : ''}, ${h.name || 'a hero'}` +
    (h.feature ? `; ${h.feature}` : '') + '; heroic and warm, head-and-shoulders';
  return [
    'Use the exact same frame, layout, typography, and painting style as the attached Ponytail sheet. New character:',
    `Portrait: ${portrait}. Accent color: warm gold.`,
    `Render this exact parchment text. For each ability render the score, modifier, AND exactly the short effect given after the colon; do NOT invent effects or copy them from the attached reference card. Circle ONLY the ${low} score in oxblood red (the lowest, dumped stat); every other score in normal ink:`,
    `Name: ${h.name || 'A Hero'}   ·   Class: ${h.class || 'Adventurer'}${h.subclass ? ' (' + h.subclass + ')' : ''}`,
    `Race: ${h.lineage || 'Forged'}   ·   Alignment: ${h.alignment || 'Heroic'}   ·   Level ${h.level || 1}`,
    '❧ Attributes ❧',
    gridLines(a),
    `Armor Class ${h.ac != null ? h.ac : 14} · Health: ${h.hp != null ? h.hp : 'hardy'} · Saves: ${(h.saves || []).map((s) => String(s).toUpperCase()).join(', ') || 'none'}`,
    `❧ Signature ❧ ${h.feature || 'A talent all their own.'}`,
    `"${h.tagline || ''}"`,
  ].join('\n');
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.GEMINI_API_KEY) return json({ error: 'Sheet rendering not enabled. Set GEMINI_API_KEY.' }, 503);

  let hero: Hero, saveKey = '';
  try {
    const body = await request.json() as { hero?: Hero; saveKey?: string };
    hero = body.hero || {};
    saveKey = String(body.saveKey || '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!hero.abilities) return json({ error: 'Need hero.abilities' }, 400);

  // Style anchor: the canonical Ponytail sheet from R2, so forge sheets match the fleet.
  const parts: Array<{ text?: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: buildPrompt(hero) }];
  try {
    if (env.MEDIA) {
      const a = await env.MEDIA.get(ANCHOR_KEY);
      if (a) parts.push({ inlineData: { mimeType: 'image/png', data: bytesToB64(new Uint8Array(await a.arrayBuffer())) } });
    }
  } catch { /* no anchor -> rely on the TEMPLATE description alone */ }

  try {
    const model = env.SHEET_MODEL || 'gemini-3-pro-image';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:5', imageSize: '2K' } } }),
    });
    if (!res.ok) return json({ error: `Upstream ${res.status}`, detail: (await res.text()).slice(0, 200) }, 502);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; inline_data?: { mimeType?: string; data?: string } }> } }> };
    const ps = data.candidates?.[0]?.content?.parts || [];
    const img = ps.find((p) => p.inlineData || p.inline_data);
    const inl = img && (img.inlineData || img.inline_data);
    if (!inl || !inl.data) return json({ error: 'No image returned' }, 502);
    const image = `data:${inl.mimeType || 'image/png'};base64,${inl.data}`;

    let saved = '';
    if (saveKey && env.MEDIA) {
      try {
        const bin = atob(inl.data); const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await env.MEDIA.put(`cards/forged-sheets/${saveKey}.png`, bytes.buffer, { httpMetadata: { contentType: 'image/png' } });
        saved = (env.MEDIA_BASE || MEDIA_BASE_DEFAULT).replace(/\/$/, '') + `/cards/forged-sheets/${saveKey}.png`;
      } catch { /* best-effort */ }
    }
    return json({ image, saved });
  } catch (e) {
    return json({ error: `Sheet error: ${e instanceof Error ? e.message : 'unknown'}` }, 500);
  }
}
