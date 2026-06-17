/**
 * Cloudflare Pages Function — /api/render
 *
 * "Finish this story -> video". ffmpeg can't run here, so this just KICKS a GitHub
 * Actions run (.github/workflows/render-moment.yml) that stitches the beat clips into
 * one polished moment and uploads it to R2. The site then polls for the result.
 *
 *   POST /api/render   { outKey, title, tone?, style?, genre?, clipKeys:[...], beats:[{caption,scene}] }
 *        -> { ok:true, outKey }                 (dispatch accepted)
 *   GET  /api/render?key=videos/...-FULL.mp4    -> { ready:bool, url }   (poll R2)
 *
 * Env (Cloudflare -> Pages -> Settings -> Variables and Secrets):
 *   GH_DISPATCH_TOKEN  — a fine-grained GitHub PAT with "Actions: read/write" on the repo (required for POST).
 *   GH_REPO            — optional; default "bigbrownjeff/agentic-character-sheets".
 *   MEDIA              — R2 bucket binding (for the GET poll).
 *   MEDIA_BASE         — optional; public R2 base for the returned url.
 */
interface R2Like { head(key: string): Promise<unknown>; }
interface Env { GH_DISPATCH_TOKEN?: string; GH_REPO?: string; MEDIA?: R2Like; MEDIA_BASE?: string; }

const MEDIA_BASE = 'https://pub-92102a1a4a2e4137b3e39df163badf14.r2.dev';

function cors(): Record<string, string> {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}
function cleanKey(k: string): string { return String(k || '').replace(/[^a-zA-Z0-9._/-]/g, ''); }

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  const url = new URL(request.url);
  const base = (env.MEDIA_BASE || MEDIA_BASE).replace(/\/$/, '');

  /* GET: poll R2 for the finished moment */
  if (request.method === 'GET') {
    const key = cleanKey(url.searchParams.get('key') || '');
    if (!key) return json({ error: 'Missing key' }, 400);
    if (env.MEDIA) {
      try { const h = await env.MEDIA.head(key); return json({ ready: !!h, url: h ? `${base}/${key}` : '' }); }
      catch { return json({ ready: false }); }
    }
    // No binding -> fall back to a public fetch check.
    try { const r = await fetch(`${base}/${key}`, { method: 'HEAD' }); return json({ ready: r.ok, url: r.ok ? `${base}/${key}` : '' }); }
    catch { return json({ ready: false }); }
  }

  /* POST: trigger the render workflow */
  if (request.method === 'POST') {
    if (!env.GH_DISPATCH_TOKEN) return json({ error: 'Rendering not enabled. Set GH_DISPATCH_TOKEN.' }, 503);
    let body: { outKey?: string; clipKeys?: unknown[]; beats?: unknown[]; title?: string; tone?: string; style?: string; genre?: string };
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const outKey = cleanKey(body.outKey || '');
    const clipKeys = Array.isArray(body.clipKeys) ? body.clipKeys.filter((x) => typeof x === 'string').map(cleanKey).slice(0, 12) : [];
    if (!outKey || !clipKeys.length) return json({ error: 'Need outKey + clipKeys' }, 400);
    if (!/-FULL\.mp4$/.test(outKey)) return json({ error: 'outKey must end with -FULL.mp4' }, 400);

    // Keep beats compact (captions/scenes only) so client_payload stays well under GitHub's 64KB cap.
    const beats = Array.isArray(body.beats) ? body.beats.slice(0, 12).map((b) => {
      const o = b as { caption?: string; scene?: string };
      return { caption: String(o.caption || '').slice(0, 300), scene: String(o.scene || '').slice(0, 600) };
    }) : [];

    const payload = {
      outKey, clipKeys, beats,
      title: String(body.title || '').slice(0, 120),
      tone: String(body.tone || '').slice(0, 120),
      style: String(body.style || '').slice(0, 40),
      genre: String(body.genre || '').slice(0, 40),
    };

    const repo = env.GH_REPO || 'bigbrownjeff/agentic-character-sheets';
    const gh = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GH_DISPATCH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'character-sheet-render',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'render-moment', client_payload: payload }),
    });
    if (gh.status !== 204) return json({ error: `Dispatch ${gh.status}: ${(await gh.text()).slice(0, 200)}` }, 502);
    return json({ ok: true, outKey, url: `${base}/${outKey}` });
  }

  return json({ error: 'Method not allowed' }, 405);
}
