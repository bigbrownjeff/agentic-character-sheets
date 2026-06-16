/**
 * Cloudflare Pages Function: /api/content
 *
 * Lists EVERY object in the R2 media bucket (via the `MEDIA` binding) for the
 * owner-only admin content browser at /admin. Read-only: no writes, no auth
 * (the bucket is already public through its r2.dev URL; see site/data/media.json).
 *
 * Route:
 *   GET /api/content  →  { count, objects: [{ key, size, uploaded, kind }] }
 *
 * `kind` is derived from the key prefix/pattern:
 *   cards/sheets/<id>.png            → "sheet"
 *   cards/covers/<adv>-<A|B|C>.png   → "cover"
 *   cards/beats/<beat>-<A|B|C>-<n>.png → "beat-image"
 *   videos/<beat>-<style>-<n>.mp4    → "clip"
 *   videos/<beat>-<style>-full.mp4   → "moment"
 *   (anything else)                  → "other"
 *
 * R2 `list()` returns at most 1000 keys per call, so we follow `truncated` /
 * `cursor` until exhausted; the browser needs the EXHAUSTIVE set, not page one.
 * Mirrors functions/api/comments.ts for CORS + JSON + error handling. If the
 * MEDIA binding is missing (e.g. a misconfigured Pages project), returns 503.
 */

// Minimal structural types for the R2 binding (no @cloudflare/workers-types dep).
interface R2Object {
  key: string;
  size: number;
  uploaded: Date | string;
}
interface R2Listing {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}
interface R2Like {
  list(opts?: { cursor?: string; limit?: number }): Promise<R2Listing>;
}

interface Env {
  MEDIA?: R2Like;
}

type Kind = 'sheet' | 'cover' | 'beat-image' | 'clip' | 'moment' | 'other';

/* --- CORS + JSON (mirrors comments.ts) ------------------ */

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

/* --- Key → kind classification -------------------------- */

function classify(key: string): Kind {
  if (key.startsWith('cards/sheets/')) return 'sheet';
  if (key.startsWith('cards/covers/')) return 'cover';
  if (key.startsWith('cards/beats/')) return 'beat-image';
  if (key.startsWith('videos/')) return /-full\.mp4$/i.test(key) ? 'moment' : 'clip';
  return 'other';
}

/* --- Main handler --------------------------------------- */

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (method !== 'GET') return err('Method not allowed', 405);

  if (!env.MEDIA) {
    return err('Media bucket not bound. Configure the MEDIA R2 binding on the Pages project.', 503);
  }

  try {
    const objects: Array<{ key: string; size: number; uploaded: string; kind: Kind }> = [];
    let cursor: string | undefined;

    // Page through the whole bucket. R2 caps a listing at 1000 keys; follow the
    // cursor until `truncated` is false so the admin table is EXHAUSTIVE.
    do {
      const page = await env.MEDIA.list({ cursor, limit: 1000 });
      for (const o of page.objects) {
        objects.push({
          key: o.key,
          size: o.size,
          uploaded: typeof o.uploaded === 'string' ? o.uploaded : o.uploaded.toISOString(),
          kind: classify(o.key),
        });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    return json({ count: objects.length, objects });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return err(`Server error: ${msg}`, 500);
  }
}
