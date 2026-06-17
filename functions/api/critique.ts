/**
 * Cloudflare Pages Function — /api/critique
 *
 * The HIDDEN adversarial quality gate, as a standalone endpoint. Give it a freshly
 * generated image or video plus the INTENT it was meant to satisfy; a vision/video
 * critic scores it and says keep or redo, with a concrete prompt fix. The caller
 * (the site's video maker, or the batch tools) uses the verdict to regenerate once
 * and ship the better take — two passes hidden, one quality output.
 *
 * POST /api/critique
 *   { intent: string, kind?: "image"|"video",
 *     imageUrl?|videoUrl?: string,            // fetched server-side (e.g. an R2 url)
 *     image?|video?: "data:...;base64,…" }    // or inline
 *   -> { score: 1-10|null, verdict: "keep"|"redo", flaws: string[], tweak: string }
 *
 * Fails OPEN: any error (no key, oversize, bad upstream) returns verdict "keep" so
 * the gate degrades to "ship what we have" and never blocks output.
 *
 * Env: GEMINI_API_KEY (same key as the other Functions); CRITIC_MODEL (default gemini-2.5-flash).
 */
interface Env { GEMINI_API_KEY?: string; CRITIC_MODEL?: string; }

const MAX_BYTES = 18 * 1024 * 1024; // inline generateContent ceiling (~20MB request)
const THRESHOLD = 7;                // below this => redo

function cors(): Record<string, string> {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}
// "ship it" verdict — the fail-open default so the gate never blocks generation.
function keep(extra?: Record<string, unknown>) {
  return json({ score: null, verdict: 'keep', flaws: [], tweak: '', ...(extra || {}) });
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
}

const IMAGE_CRITIC = [
  'You are a ruthless art director reviewing an AI-generated illustration before it ships.',
  'Judge it ONLY against the stated INTENT. Score 1-10, weighting: 1) depicts the intended scene/subject;',
  '2) anatomy (hands, fingers, faces, eyes, limb counts); 3) composition/focal clarity;',
  '4) NO garbled text, watermarks, logos, artifacts; 5) tonal fit. Be harsh; 7+ is shippable, 9-10 rare.',
].join('\n');

const VIDEO_CRITIC = [
  'You are a ruthless film/VFX supervisor reviewing a short AI-generated clip before it ships.',
  'Judge it ONLY against the stated INTENT. Score 1-10, weighting: 1) depicts the intended scene/action;',
  '2) TEMPORAL coherence — no morphing, flicker, warping faces/objects, popping, or identity drift between frames;',
  '3) motion quality (purposeful, physical, not jittery or sliding); 4) anatomy; 5) NO garbled text/artifacts; 6) tonal fit.',
  'Be harsh; 7+ is shippable, 9-10 rare. A single bad frame transition is enough to fail it.',
].join('\n');

const FORMAT = 'Output ONLY JSON: {"score":<int 1-10>,"verdict":"keep"|"redo","flaws":["short specifics"],"tweak":"<one concrete prompt addition that fixes the biggest flaw>"}';

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.GEMINI_API_KEY) return keep();

  let body: { intent?: string; kind?: string; imageUrl?: string; videoUrl?: string; image?: string; video?: string };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const intent = String(body.intent || '').slice(0, 1500).trim();
  const srcUrl = body.videoUrl || body.imageUrl || '';
  const inline = body.video || body.image || '';
  const isVideo = (body.kind === 'video') || !!body.videoUrl || (!!body.video && !body.image);

  // Resolve the media to inline base64 + mime.
  let mimeType = isVideo ? 'video/mp4' : 'image/png';
  let data = '';
  try {
    if (inline) {
      const m = /^data:([^;]+);base64,(.+)$/.exec(inline);
      if (!m) return keep();
      mimeType = m[1]; data = m[2];
    } else if (srcUrl) {
      const r = await fetch(srcUrl);
      if (!r.ok) return keep();
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return keep({ flaws: ['media too large to critique'] });
      mimeType = r.headers.get('Content-Type') || mimeType;
      data = bytesToB64(new Uint8Array(buf));
    } else {
      return json({ error: 'Need imageUrl/videoUrl or image/video' }, 400);
    }
  } catch { return keep(); }

  const sys = (isVideo ? VIDEO_CRITIC : IMAGE_CRITIC) + '\n' + FORMAT;
  try {
    const model = env.CRITIC_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ parts: [{ text: 'INTENT: ' + (intent || '(no intent given — judge general quality and coherence)') }, { inlineData: { mimeType, data } }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return keep();
    const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    const mm = text.match(/\{[\s\S]*\}/);
    if (!mm) return keep();
    const c = JSON.parse(mm[0]) as { score?: number; verdict?: string; flaws?: unknown[]; tweak?: string };
    if (typeof c.score !== 'number') return keep();
    const flaws = Array.isArray(c.flaws) ? c.flaws.map(String) : [];
    return json({
      score: c.score,
      verdict: (c.verdict === 'redo' || c.score < THRESHOLD) ? 'redo' : 'keep',
      flaws,
      tweak: String(c.tweak || ''),
    });
  } catch { return keep(); }
}
