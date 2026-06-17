/**
 * Cloudflare Pages Function — /api/image
 *
 * Text-to-image with a selectable provider:
 *   - "gemini"     → Google Gemini image model (Nano Banana / Imagen-class). Best quality.
 *   - "cloudflare" → Cloudflare Workers AI (flux-1-schnell). Fast/free, lower fidelity.
 *   - "auto"       → IMAGE_PROVIDER env, else Gemini if a key exists, else Cloudflare.
 *
 * Request:  { prompt: string, provider?: "auto"|"gemini"|"cloudflare" }
 * Response: { image: "data:image/...;base64,…", provider: "gemini"|"cloudflare" }
 *
 * Setup (Cloudflare → Pages → your project → Settings):
 *   Gemini:     Variables and Secrets → GEMINI_API_KEY = <your key>
 *               (optional) GEMINI_IMAGE_MODEL  (default "gemini-2.5-flash-image")
 *   Cloudflare: Functions → Bindings → add Workers AI binding named  AI
 *               (optional) FORGE_IMAGE_MODEL   (default flux-1-schnell)
 *   (optional)  IMAGE_PROVIDER = gemini | cloudflare   (default for "auto")
 *
 * If the chosen provider isn't configured it 503s and the client falls back to
 * the dependency-free Canvas card, so users still see an image.
 */

interface Env {
  AI?: { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };
  GEMINI_API_KEY?: string;
  GEMINI_IMAGE_MODEL?: string;
  FORGE_IMAGE_MODEL?: string;
  IMAGE_PROVIDER?: string;
}

const MAX_PROMPT = 1500;
const BLOCK = /\b(nude|naked|nsfw|sexual|porn|explicit|gore|child|minor)\b/i;

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

/* --- Gemini (best quality) ------------------------------- */
async function viaGemini(prompt: string, env: Env): Promise<string> {
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  };
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  for (const p of parts) {
    if (p.inlineData && p.inlineData.data) {
      return `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
    }
  }
  throw new Error('Gemini returned no image (model may not support image output — check GEMINI_IMAGE_MODEL)');
}

/* --- Cloudflare Workers AI (fast) ------------------------ */
async function viaCloudflare(prompt: string, env: Env): Promise<string> {
  const model = env.FORGE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';
  const out = await env.AI!.run(model, { prompt, steps: 4 });
  if (out && typeof (out as { image?: string }).image === 'string') {
    return 'data:image/jpeg;base64,' + (out as { image: string }).image;
  }
  if (out instanceof ReadableStream || out instanceof ArrayBuffer || out instanceof Uint8Array) {
    const buf = out instanceof ReadableStream ? await new Response(out).arrayBuffer()
      : (out instanceof Uint8Array ? out.buffer : out);
    const bytes = new Uint8Array(buf as ArrayBuffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return 'data:image/png;base64,' + btoa(bin);
  }
  throw new Error('Unexpected Workers AI output');
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let prompt = '', provider = 'auto';
  try {
    const body = await request.json() as { prompt?: string; provider?: string };
    prompt = String(body.prompt || '').slice(0, MAX_PROMPT).trim();
    provider = String(body.provider || 'auto').toLowerCase();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!prompt) return json({ error: 'Missing prompt' }, 400);
  if (BLOCK.test(prompt)) return json({ error: 'Prompt rejected' }, 422);

  // Resolve the provider, then fall back to whichever engine IS configured so no
  // choice in the UI's engine picker is ever a dead end. (The picker offers
  // Auto / Gemini / Cloudflare; if a site has only one backend wired, picking the
  // other must still return art instead of a 503 that reads as "button broken".)
  const hasGemini = !!env.GEMINI_API_KEY;
  const hasCF = !!env.AI;
  if (!hasGemini && !hasCF) {
    return json({ error: 'No image engine configured. Set GEMINI_API_KEY or add a Workers AI binding named "AI".' }, 503);
  }
  if (provider === 'auto') {
    provider = (env.IMAGE_PROVIDER || (hasGemini ? 'gemini' : 'cloudflare')).toLowerCase();
  }
  if (provider === 'gemini' && !hasGemini) provider = 'cloudflare';
  if (provider === 'cloudflare' && !hasCF) provider = 'gemini';

  try {
    if (provider === 'gemini') {
      return json({ image: await viaGemini(prompt, env), provider: 'gemini' });
    }
    return json({ image: await viaCloudflare(prompt, env), provider: 'cloudflare' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Image generation failed: ${msg}` }, 500);
  }
}
