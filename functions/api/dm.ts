/**
 * Cloudflare Pages Function — /api/dm
 *
 * The "DM hat": drop a forged hero (or party) into an existing adventure and run an EMERGENT
 * version of it. Scene 1 is the canonical opening; from scene 2 the beats branch off the hero's
 * stat block (their high stat shines; their dumped stat causes the failure the story turns on),
 * bending toward the adventure's meaningful, kind end. The per-beat `decision` + `dm_note` are the
 * TEXT BEHIND the image/video — the hidden stat-logic the media is rendered from.
 *
 * POST /api/dm  body: { hero: {stat block}, adventure: { title, adventure, bible, cards:[{scene,caption}] } }
 *   -> { beats: [ { decision, scene, caption, dm_note } ] }   (one per canonical card)
 *
 * Env: GEMINI_API_KEY (same Pages secret the image/video Functions use); DM_MODEL (default gemini-2.5-pro).
 */
interface Env { GEMINI_API_KEY?: string; DM_MODEL?: string; }

const SYSTEM = [
  'You are the DUNGEON MASTER. Insert the player\'s forged hero (or party) into this adventure and run an EMERGENT version of it.',
  'Rules:',
  '- Scene 1 is the adventure\'s canonical opening; just place the hero in it.',
  '- From Scene 2 on, the beats MUST vary based on THIS hero\'s stats and personality and the choices those stats imply.',
  '  The hero\'s highest ability SHINES; their DUMPED ability causes a believable failure the story turns on.',
  '  If it is a party, let complementary strengths interplay (one hero\'s weakness is another\'s strength).',
  '- Stay strictly inside the adventure\'s world/bible and recurring cast. Bend toward the adventure\'s meaningful, kind end.',
  '  Punch up at systems, never down at people. This is warm, a little funny, never cruel.',
  '- Keep the SAME number of beats as the canonical card list.',
  'For each beat output: "decision" (one line: what the hero does, driven by their stats), "scene" (the visual, for image+video, in the adventure\'s style), "caption" (a short on-screen line), "dm_note" (one line: the hidden logic, why this beat happened given the stats).',
  'Output ONLY a JSON object: { "beats": [ { "decision": "", "scene": "", "caption": "", "dm_note": "" } ] }',
].join('\n');

function cors(): Record<string, string> {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.GEMINI_API_KEY) return json({ error: 'DM not enabled. Set GEMINI_API_KEY.' }, 503);

  let hero: unknown, adventure: { title?: string; adventure?: string; bible?: Record<string, unknown>; cards?: Array<{ scene?: string; caption?: string }> };
  try {
    const body = await request.json() as { hero?: unknown; adventure?: typeof adventure };
    hero = body.hero; adventure = body.adventure || {};
  } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!hero || !adventure || !Array.isArray(adventure.cards) || !adventure.cards.length) {
    return json({ error: 'Need { hero, adventure:{ cards:[...] } }' }, 400);
  }

  const b = adventure.bible || {};
  const canon = (adventure.cards || []).map((c, i) => `${i + 1}. ${c.scene || ''}`).join('\n');
  const user = [
    `ADVENTURE: ${adventure.adventure || ''} — ${adventure.title || ''}.`,
    `WORLD: ${b.setting || ''}. Threat: ${b.bigbad_silhouette || ''}. Tone: ${Array.isArray(b.tone) ? b.tone.join(', ') : ''}.`,
    `Recurring cast to honor: ${Array.isArray(b.recurring_cast) ? (b.recurring_cast as Array<{ locked_descriptor?: string }>).map((c) => c.locked_descriptor).join('; ') : ''}.`,
    `CANONICAL BEATS (${adventure.cards.length}, scene per card):\n${canon}`,
    `\nPLAYER HERO (or party): ${JSON.stringify(hero)}`,
    `\nRun it. Exactly ${adventure.cards.length} beats.`,
  ].join('\n');

  try {
    const model = env.DM_MODEL || 'gemini-2.5-pro';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ parts: [{ text: user }] }], generationConfig: { temperature: 0.95, responseMimeType: 'application/json' } }),
    });
    if (!r.ok) return json({ error: `Upstream ${r.status}`, detail: (await r.text()).slice(0, 300) }, 502);
    const data = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    let parsed: { beats?: unknown[] } | null = null;
    try { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch { /* fall through */ }
    if (!parsed || !Array.isArray(parsed.beats) || !parsed.beats.length) return json({ error: 'DM returned no beats', raw: text.slice(0, 300) }, 502);
    return json({ beats: parsed.beats });
  } catch (e) {
    return json({ error: `Server error: ${e instanceof Error ? e.message : 'unknown'}` }, 500);
  }
}
