/**
 * Cloudflare Pages Function — /api/r2-put
 *
 * Authed binary upload into R2 via the MEDIA binding. The render CI (which has no R2
 * token, only the deploy token that lacks R2 scope) PUTs the finished moment here and
 * the Function stores it through the same binding /api/video already uses to persist.
 *
 *   PUT /api/r2-put?key=videos/...-FULL.mp4   (header x-render-token: <RENDER_UPLOAD_TOKEN>)
 *        body = the file bytes  -> { ok:true, key }
 *
 * Env: MEDIA (R2 binding); RENDER_UPLOAD_TOKEN (shared secret; required). Keys are
 * restricted to videos/ so this can't be used to overwrite anything else.
 */
interface R2Like { put(key: string, value: ArrayBuffer, opts?: unknown): Promise<unknown>; }
interface Env { MEDIA?: R2Like; RENDER_UPLOAD_TOKEN?: string; }

const MAX_BYTES = 60 * 1024 * 1024; // a stitched moment is ~5-15MB; cap well above, refuse abuse

function cors(): Record<string, string> {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,x-render-token' };
}
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.MEDIA) return json({ error: 'R2 not bound' }, 503);
  if (!env.RENDER_UPLOAD_TOKEN) return json({ error: 'Upload not enabled. Set RENDER_UPLOAD_TOKEN.' }, 503);
  if (request.headers.get('x-render-token') !== env.RENDER_UPLOAD_TOKEN) return json({ error: 'Unauthorized' }, 401);

  const key = String(new URL(request.url).searchParams.get('key') || '').replace(/[^a-zA-Z0-9._/-]/g, '');
  if (!key || !key.startsWith('videos/') || !key.endsWith('.mp4')) return json({ error: 'key must be videos/*.mp4' }, 400);

  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'Empty body' }, 400);
  if (buf.byteLength > MAX_BYTES) return json({ error: 'Too large' }, 413);

  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: 'video/mp4' } });
  return json({ ok: true, key, bytes: buf.byteLength });
}
