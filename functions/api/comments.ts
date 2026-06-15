/**
 * Cloudflare Pages Function — /api/comments
 *
 * Persists per-target comment arrays as JSON files in the GitHub repo at
 * feedback/<safe-target-id>.json via the GitHub Contents API.
 *
 * Env vars required (Pages → Settings → Variables and Secrets):
 *   GITHUB_TOKEN   — fine-grained PAT with Contents:read+write on the repo
 *   GITHUB_REPO    — "owner/repo"  (default: "bigbrownjeff/agentic-character-sheets")
 *   GITHUB_BRANCH  — branch to commit to (default: "main")
 *
 * Comment shape: { id, author, body, ts, updated }
 *
 * Routes:
 *   GET    /api/comments?target=<id>   → Comment[]
 *   POST   /api/comments               → body: { target, comment: Comment }    → Comment
 *   PUT    /api/comments               → body: { target, id, body: string }    → Comment
 *   DELETE /api/comments               → body: { target, id }                  → { ok: true }
 */

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
}

interface Comment {
  id: string;
  author: string;
  body: string;
  ts: number;
  updated: boolean;
}

interface GhContentsResponse {
  sha: string;
  content: string; // base64
}

/* --- Target id sanitisation ----------------------------- */

function safeTarget(raw: string | null): string | null {
  if (!raw) return null;
  // Allow alphanumerics, dash, underscore, colon → colon becomes dash in path
  const cleaned = raw.replace(/[^a-zA-Z0-9\-_:]/g, '').slice(0, 128);
  if (!cleaned) return null;
  return cleaned.replace(/:/g, '-');
}

/* --- GitHub Contents API helpers ------------------------ */

async function ghGet(path: string, env: Env): Promise<{ data: GhContentsResponse | null; sha: string | null }> {
  const repo = env.GITHUB_REPO || 'bigbrownjeff/agentic-character-sheets';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'agentic-character-sheets-comments/1',
    },
  });

  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status}`);

  const data = await res.json() as GhContentsResponse;
  return { data, sha: data.sha };
}

async function ghPut(path: string, content: string, sha: string | null, message: string, env: Env): Promise<void> {
  const repo = env.GITHUB_REPO || 'bigbrownjeff/agentic-character-sheets';
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'agentic-character-sheets-comments/1',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${text}`);
  }
}

/* --- Read / write comment list -------------------------- */

async function readComments(safeName: string, env: Env): Promise<{ comments: Comment[]; sha: string | null }> {
  const path = `feedback/${safeName}.json`;
  const { data, sha } = await ghGet(path, env);
  if (!data) return { comments: [], sha: null };

  const json = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  const comments = JSON.parse(json) as Comment[];
  return { comments, sha };
}

async function writeComments(safeName: string, comments: Comment[], sha: string | null, targetId: string, env: Env): Promise<void> {
  const path = `feedback/${safeName}.json`;
  const content = JSON.stringify(comments, null, 2);
  const message = `comment: ${targetId}`;
  await ghPut(path, content, sha, message, env);
}

/* --- Concurrency-safe mutate ---------------------------- */

/** Early-return a specific Response (e.g. 404) from inside a mutator. */
class HttpError extends Error {
  constructor(public response: Response) { super('http-error'); }
}

/**
 * read → mutate → write, retrying ONCE if a concurrent comment moved the
 * file's sha out from under us (GitHub Contents API → 409). The mutator is
 * re-applied against freshly-read comments on retry, so concurrent comments
 * merge instead of clobbering each other. Mutators may throw HttpError to
 * short-circuit (e.g. comment-not-found) without writing.
 */
async function commitMutation(
  safeName: string,
  targetId: string,
  env: Env,
  mutate: (comments: Comment[]) => { next: Comment[]; result: unknown },
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const { comments, sha } = await readComments(safeName, env);
    const { next, result } = mutate(comments);
    try {
      await writeComments(safeName, next, sha, targetId, env);
      return json(result);
    } catch (e) {
      const conflict = e instanceof Error && /→ 409/.test(e.message);
      if (conflict && attempt === 0) continue; // re-read fresh sha, re-apply, retry once
      throw e;
    }
  }
}

/* --- CORS headers --------------------------------------- */

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
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

/* --- Main handler --------------------------------------- */

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!env.GITHUB_TOKEN) {
    return err('GITHUB_TOKEN env var not configured', 500);
  }

  try {
    /* GET ------------------------------------------------- */
    if (method === 'GET') {
      const url = new URL(request.url);
      const rawTarget = url.searchParams.get('target');
      const safeName = safeTarget(rawTarget);
      if (!safeName) return err('Missing or invalid target');

      const { comments } = await readComments(safeName, env);
      return json(comments);
    }

    /* POST — add ------------------------------------------ */
    if (method === 'POST') {
      const body = await request.json() as { target: string; comment: Comment };
      const safeName = safeTarget(body.target);
      if (!safeName) return err('Missing or invalid target');

      const c = body.comment;
      if (!c || !c.id || !c.author || !c.body || !c.ts) return err('Invalid comment shape');

      return await commitMutation(safeName, body.target, env, (comments) => {
        const comment: Comment = { id: c.id, author: String(c.author).slice(0, 60), body: String(c.body).slice(0, 4000), ts: Number(c.ts), updated: false };
        return { next: [...comments, comment], result: comment };
      });
    }

    /* PUT — edit ------------------------------------------ */
    if (method === 'PUT') {
      const body = await request.json() as { target: string; id: string; body: string };
      const safeName = safeTarget(body.target);
      if (!safeName) return err('Missing or invalid target');
      if (!body.id) return err('Missing id');

      return await commitMutation(safeName, body.target, env, (comments) => {
        const idx = comments.findIndex(c => c.id === body.id);
        if (idx === -1) throw new HttpError(err('Comment not found', 404));
        const edited: Comment = { ...comments[idx], body: String(body.body).slice(0, 4000), updated: true };
        const next = comments.slice();
        next[idx] = edited;
        return { next, result: edited };
      });
    }

    /* DELETE ---------------------------------------------- */
    if (method === 'DELETE') {
      const body = await request.json() as { target: string; id: string };
      const safeName = safeTarget(body.target);
      if (!safeName) return err('Missing or invalid target');
      if (!body.id) return err('Missing id');

      return await commitMutation(safeName, body.target, env, (comments) => {
        const next = comments.filter(c => c.id !== body.id);
        if (next.length === comments.length) throw new HttpError(err('Comment not found', 404));
        return { next, result: { ok: true } };
      });
    }

    return err('Method not allowed', 405);
  } catch (e) {
    if (e instanceof HttpError) return e.response;
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return err(`Server error: ${msg}`, 500);
  }
}
