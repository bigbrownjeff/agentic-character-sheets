/**
 * Cloudflare Pages Function — /api/video
 *
 * Short beat videos via Google's video model (Veo) on the Gemini API
 * ("Gemini Omni"/Veo). Video is the FINAL step, after a beat's storyboard
 * (image style) is approved — the client passes the approved style + the beat's
 * scene shot-list, we generate one short clip.
 *
 * Veo is long-running (~1–2 min), so this is a 3-verb endpoint:
 *   POST /api/video            { prompt, aspectRatio? }   → { op: "<operation>" }
 *   GET  /api/video?op=<name>                              → { done:false } | { done:true, video:"./api/video?file=…" }
 *   GET  /api/video?file=<uri>                             → streams video/mp4 (key kept server-side)
 *
 * Setup (Cloudflare → Pages → Settings → Variables and Secrets):
 *   GEMINI_API_KEY  = <your key>                  (same key as image gen)
 *   VEO_MODEL       = veo-3.1-generate-preview     (default; Veo 3.1)
 *   VEO_DURATION    = 5                            (optional; seconds per cell, clamped 3–8)
 *   VEO_PERSON_GENERATION = allow_all              (optional; default; 'dont_allow' or 'omit')
 *
 * One clip = one beat cell/keyframe (3–5s). A whole beat is the sequence of its
 * per-cell clips (~15–30s across 5–6 cards). VEO_MODEL / VEO_DURATION are
 * env-overridable; upstream errors are surfaced verbatim.
 * If GEMINI_API_KEY is absent it 503s and the UI keeps the still storyboard.
 */

// Minimal structural type for the R2 bucket binding (no @cloudflare/workers-types dep).
interface R2Like { put(key: string, value: ArrayBuffer | ReadableStream, opts?: unknown): Promise<unknown>; }

interface Env {
  GEMINI_API_KEY?: string;
  VEO_MODEL?: string;
  VEO_DURATION?: string;
  VEO_PERSON_GENERATION?: string; // 'allow_all' (default) | 'dont_allow' | 'omit'
  MEDIA?: R2Like;                  // R2 bucket binding; clips persist to videos/<key>.mp4
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_PROMPT = 2000;
const BLOCK = /\b(nude|naked|nsfw|sexual|porn|explicit|gore|child|minor)\b/i;

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}
function withKey(uri: string, key: string): string {
  return uri + (uri.indexOf('?') === -1 ? '?' : '&') + 'key=' + key;
}
// Walk the operation response for the first video file uri (shape varies by Veo version).
function findVideoUri(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (o.video && typeof (o.video as Record<string, unknown>).uri === 'string') return (o.video as Record<string, string>).uri;
  if (typeof o.uri === 'string' && /video|\.mp4|files\//i.test(o.uri)) return o.uri as string;
  if (o.fileData && typeof (o.fileData as Record<string, unknown>).fileUri === 'string') return (o.fileData as Record<string, string>).fileUri;
  for (const k in o) { const found = findVideoUri(o[k]); if (found) return found; }
  return null;
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (!env.GEMINI_API_KEY) return json({ error: 'Video not enabled. Set GEMINI_API_KEY.' }, 503);

  const key = env.GEMINI_API_KEY;
  const model = env.VEO_MODEL || 'veo-3.1-generate-preview';
  const url = new URL(request.url);

  try {
    /* --- GET: poll an operation, or proxy the finished file --- */
    if (request.method === 'GET') {
      const file = url.searchParams.get('file');
      if (file) {
        const r = await fetch(withKey(file, key));
        if (!r.ok) return json({ error: `Download ${r.status}` }, 502);
        return new Response(r.body, { status: 200, headers: { 'Content-Type': r.headers.get('Content-Type') || 'video/mp4', 'Access-Control-Allow-Origin': '*' } });
      }
      const op = url.searchParams.get('op');
      if (!op) return json({ error: 'Missing op or file' }, 400);
      const r = await fetch(`${BASE}/${op}?key=${key}`);
      if (!r.ok) return json({ error: `Poll ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
      const data = await r.json() as { done?: boolean; response?: unknown; error?: unknown };
      if (!data.done) return json({ done: false });
      if (data.error) return json({ done: true, error: JSON.stringify(data.error).slice(0, 400) }, 502);
      const uri = findVideoUri(data.response);
      if (!uri) return json({ done: true, error: 'No video uri in response' }, 502);
      // Persist to R2 (the default) when the client passes a key, so the clip is linked to its
      // frame and survives reloads. Falls back to the streaming proxy if MEDIA isn't bound / no key.
      const saveKey = (url.searchParams.get('key') || '').replace(/[^a-zA-Z0-9._-]/g, '');
      if (saveKey && env.MEDIA) {
        const dl = await fetch(withKey(uri, key));
        if (dl.ok) {
          await env.MEDIA.put(`videos/${saveKey}.mp4`, await dl.arrayBuffer(), { httpMetadata: { contentType: 'video/mp4' } });
          return json({ done: true, video: `videos/${saveKey}.mp4`, persisted: true });
        }
      }
      return json({ done: true, video: './api/video?file=' + encodeURIComponent(uri) });
    }

    /* --- POST: start a generation --- */
    if (request.method === 'POST') {
      let prompt = '', aspectRatio = '9:16';
      let duration = parseInt(env.VEO_DURATION || '4', 10);
      try {
        const body = await request.json() as { prompt?: string; aspectRatio?: string; durationSeconds?: number };
        prompt = String(body.prompt || '').slice(0, MAX_PROMPT).trim();
        if (body.aspectRatio) aspectRatio = String(body.aspectRatio);
        if (body.durationSeconds) duration = Number(body.durationSeconds);
      } catch { return json({ error: 'Invalid JSON body' }, 400); }
      if (!prompt) return json({ error: 'Missing prompt' }, 400);
      if (BLOCK.test(prompt)) return json({ error: 'Prompt rejected' }, 422);
      // Veo 3.1 accepts only EVEN durations 4/6/8 — it 400s on 5 or 7 ("out of bound,
      // between 4 and 8") despite the misleading message. Clamp to 4-8, snap odd down.
      if (!Number.isFinite(duration)) duration = 4;
      duration = Math.max(4, Math.min(8, Math.round(duration)));
      if (duration % 2 === 1) duration -= 1;

      // personGeneration: Veo rejects 'allow_adult' (INVALID_ARGUMENT); 'allow_all' is the
      // supported "people allowed" value. Env-overridable ('dont_allow', or 'omit' to drop it).
      const personGen = (env.VEO_PERSON_GENERATION || 'allow_all').trim();
      // NB: veo-3.1-generate-preview REJECTS the `generateAudio` param (400 "isn't supported").
      // So per-frame audio isn't controllable here — silence/music is handled at the Phase-3
      // stitch (strip the clip audio, add one track), not per-frame.
      const r = await fetch(`${BASE}/models/${model}:predictLongRunning?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            aspectRatio: aspectRatio,
            durationSeconds: duration,
            ...(personGen && personGen.toLowerCase() !== 'omit' ? { personGeneration: personGen } : {}),
          },
        }),
      });
      if (!r.ok) return json({ error: `Start ${r.status}: ${(await r.text()).slice(0, 300)}` }, 502);
      const data = await r.json() as { name?: string };
      if (!data.name) return json({ error: 'No operation name returned' }, 502);
      return json({ op: data.name });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Video error: ${msg}` }, 500);
  }
}
