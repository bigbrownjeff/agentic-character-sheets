/**
 * Cloudflare Pages Function — /api/image
 *
 * Text-to-image via Cloudflare Workers AI. Turns a scene/portrait prompt into
 * an illustration the card renderer composites into a card. Used by the Forge
 * (hero portraits) and by the beats/adventures "✨ Illustrate" buttons.
 *
 * Setup (Pages → Settings → Functions → Bindings):
 *   - Add a "Workers AI" binding named  AI
 *   - (optional) FORGE_IMAGE_MODEL env var; default flux-1-schnell
 *
 * Returns: { image: "data:image/jpeg;base64,…" }
 * If the AI binding is absent it 503s; the client falls back to the
 * dependency-free Canvas card (so users still see an image).
 */

interface Env {
  AI?: { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };
  FORGE_IMAGE_MODEL?: string;
}

const MAX_PROMPT = 1500;

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

// Reject obviously unsafe prompts at the edge (defense in depth; the form already steers).
const BLOCK = /\b(nude|naked|nsfw|sexual|porn|explicit|gore|child|minor)\b/i;

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.AI) return json({ error: 'Image generation not enabled. Add a Workers AI binding named "AI".' }, 503);

  let prompt = '';
  try {
    const body = await request.json() as { prompt?: string };
    prompt = String(body.prompt || '').slice(0, MAX_PROMPT).trim();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!prompt) return json({ error: 'Missing prompt' }, 400);
  if (BLOCK.test(prompt)) return json({ error: 'Prompt rejected' }, 422);

  const model = env.FORGE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';

  try {
    const out = await env.AI.run(model, { prompt, steps: 4 });

    // flux-1-schnell → { image: "<base64>" }; SD models → raw bytes / ReadableStream.
    if (out && typeof (out as { image?: string }).image === 'string') {
      return json({ image: 'data:image/jpeg;base64,' + (out as { image: string }).image });
    }
    if (out instanceof ReadableStream || out instanceof ArrayBuffer || out instanceof Uint8Array) {
      const buf = out instanceof ReadableStream
        ? await new Response(out).arrayBuffer()
        : (out instanceof Uint8Array ? out.buffer : out);
      let bin = '';
      const bytes = new Uint8Array(buf as ArrayBuffer);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return json({ image: 'data:image/png;base64,' + btoa(bin) });
    }
    return json({ error: 'Unexpected model output' }, 502);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Image generation failed: ${msg}` }, 500);
  }
}
