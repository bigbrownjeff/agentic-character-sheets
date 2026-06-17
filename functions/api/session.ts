/**
 * Cloudflare Pages Function: /api/session
 *
 * Server-side persistence for FORGE STORY sessions, so a forged hero's run of an
 * adventure becomes shareable + listable (today it lives only in browser
 * localStorage as `cs-forge-last` / `cs-story:<hero>:<adv>`, which can't leave the
 * one device). One session = a hero build + an adventure + the DM's beats. Stored
 * as JSON in the same R2 bucket the media uses (the `MEDIA` binding), under
 * `sessions/<id>.json`.
 *
 * Routes:
 *   POST /api/session   { id?, title, hero, adventure, beats }
 *        -> store JSON at sessions/<id>.json; mint id via crypto.randomUUID()
 *           if absent; sanitize id to [a-z0-9-]; cap the body at ~1MB.
 *        -> { ok:true, id }
 *   GET  /api/session?id=<id>   -> the stored session JSON, or 404
 *   GET  /api/session           -> { sessions:[{ id, title, updated }] }
 *        (lists sessions/ via env.MEDIA.list; `updated` is the object's
 *         uploaded time; title is read from the object body)
 *
 * Mirrors r2-put.ts / video.ts for the MEDIA binding and content.ts for the
 * paged listing. CORS + JSON helpers copied from r2-put.ts. Fail-safe: every
 * handler is wrapped so a bad object or a bucket hiccup returns an error JSON,
 * never a thrown 500 to the client. If MEDIA isn't bound, returns 503.
 */

// Minimal structural types for the R2 binding (no @cloudflare/workers-types dep).
interface R2ObjectBody {
  text(): Promise<string>;
}
interface R2ObjectMeta {
  key: string;
  uploaded: Date | string;
}
interface R2Listing {
  objects: R2ObjectMeta[];
  truncated: boolean;
  cursor?: string;
}
interface R2Like {
  put(key: string, value: string, opts?: unknown): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  list(opts?: { prefix?: string; cursor?: string; limit?: number }): Promise<R2Listing>;
}

interface Env {
  MEDIA?: R2Like;
}

const PREFIX = 'sessions/';
const MAX_BYTES = 1024 * 1024; // ~1MB: a hero + adventure + a handful of beats is a few KB; cap abuse.

/* --- CORS + JSON (mirrors r2-put.ts) -------------------- */

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

/* --- id sanitize ---------------------------------------- */
// Lowercase, collapse anything outside [a-z0-9-] to '-', trim leading/trailing '-'.
// An empty / all-junk id falls back to a random uuid (also [a-z0-9-]).
function sanitizeId(raw: unknown): string {
  const s = String(raw == null ? '' : raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return s || crypto.randomUUID();
}

/* --- Main handler --------------------------------------- */

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (!env.MEDIA) return json({ error: 'Media bucket not bound. Configure the MEDIA R2 binding on the Pages project.' }, 503);

  const url = new URL(request.url);

  try {
    /* --- POST: store (or overwrite) a session --- */
    if (request.method === 'POST') {
      // Read the raw text first so we can both byte-cap and parse from one body.
      let raw: string;
      try { raw = await request.text(); }
      catch { return json({ error: 'Could not read body' }, 400); }
      if (raw.length > MAX_BYTES) return json({ error: 'Too large' }, 413);

      let body: { id?: unknown; title?: unknown; hero?: unknown; adventure?: unknown; beats?: unknown };
      try { body = JSON.parse(raw || '{}'); }
      catch { return json({ error: 'Invalid JSON body' }, 400); }

      const hero = body.hero;
      const adventure = body.adventure;
      const beats = body.beats;
      if (!hero || typeof hero !== 'object') return json({ error: 'Missing hero' }, 400);
      if (!adventure || typeof adventure !== 'object') return json({ error: 'Missing adventure' }, 400);
      if (!Array.isArray(beats) || !beats.length) return json({ error: 'Missing beats' }, 400);

      const id = sanitizeId(body.id);
      const title = String(body.title == null ? '' : body.title).slice(0, 300) || id;

      // Stamp the write time server-side; clients can't be trusted for ordering.
      const record = { id, title, hero, adventure, beats, updated: new Date().toISOString() };
      const payload = JSON.stringify(record);
      // The serialized record can grow past the raw cap (we add fields); re-check.
      if (payload.length > MAX_BYTES) return json({ error: 'Too large' }, 413);

      await env.MEDIA.put(`${PREFIX}${id}.json`, payload, { httpMetadata: { contentType: 'application/json' } });
      return json({ ok: true, id });
    }

    /* --- GET ?id=<id>: one session --- */
    if (request.method === 'GET') {
      const id = sanitizeId(url.searchParams.get('id') || '');
      // A real id was passed (the param wasn't empty/junk that fell back to a uuid).
      const asked = String(url.searchParams.get('id') || '').trim();
      if (asked) {
        const obj = await env.MEDIA.get(`${PREFIX}${id}.json`);
        if (!obj) return json({ error: 'Not found' }, 404);
        let text: string;
        try { text = await obj.text(); }
        catch { return json({ error: 'Could not read session' }, 502); }
        // Pass the stored JSON straight through (it's already the record shape).
        return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json', ...cors() } });
      }

      /* --- GET (no id): list every session --- */
      const sessions: Array<{ id: string; title: string; updated: string }> = [];
      let cursor: string | undefined;
      // R2 caps a listing at 1000 keys; follow the cursor so the admin list is exhaustive.
      do {
        const page = await env.MEDIA.list({ prefix: PREFIX, cursor, limit: 1000 });
        for (const o of page.objects) {
          const key = o.key;
          const sid = key.slice(PREFIX.length).replace(/\.json$/i, '');
          const updated = typeof o.uploaded === 'string' ? o.uploaded : o.uploaded.toISOString();
          // Title lives inside the object; read it (cheap at this scale). If the read
          // fails, fall back to the id so the row still renders + links.
          let title = sid;
          try {
            const obj = await env.MEDIA.get(key);
            if (obj) {
              const parsed = JSON.parse(await obj.text()) as { title?: unknown };
              if (parsed && typeof parsed.title === 'string' && parsed.title) title = parsed.title;
            }
          } catch { /* keep the id-derived title */ }
          sessions.push({ id: sid, title, updated });
        }
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);

      // Newest first.
      sessions.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
      return json({ sessions });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Server error: ${msg}` }, 500);
  }
}
