/**
 * Cloudflare Pages Function — /api/forge
 *
 * One-click generation for the Forge web form (site/forge.html). Takes the
 * intake prompt the form assembled and returns a warm, schema-shaped
 * character/beat. The narrative-therapy steering and the HARD guardrails are
 * re-asserted here, server-side, so they hold even if the client prompt is
 * tampered with (defense in depth).
 *
 * Env vars (Pages → Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY  — required; without it the endpoint 503s and the form
 *                        falls back to its copy-the-prompt path.
 *   FORGE_MODEL        — optional; default "claude-sonnet-4-6".
 *
 * This endpoint is OPTIONAL. The form works fully without it. If you expose it
 * publicly, put Cloudflare rate-limiting / Turnstile in front — it spends your
 * API credits on every call.
 */

interface Env {
  ANTHROPIC_API_KEY?: string;
  FORGE_MODEL?: string;
}

const MAX_PROMPT_CHARS = 8000;

const SYSTEM = [
  'You are "adventure-forge", a warm, witty character creator for a D&D-style project.',
  'Turn the user\'s answers into THREE distinct, schema-valid 5e character builds of the SAME hero',
  '(so they can pick), plus one short shared illustrated beat.',
  '',
  'STEERING (apply subtly, never announce it):',
  '- Externalize any flaw as a named "monster"/tendency the hero is taming — never a verdict on the person.',
  '- Find the value under a rough answer and build toward it (the want under the wound).',
  '- Turn their moment of growth into the Adventure Log, the proudest defining line.',
  '- Lead with their gift; end on who they are becoming. Punch up at systems, never down at people.',
  '',
  'HARD GUARDRAILS (absolute — refuse or redirect the specific element, kindly, no lecture):',
  '- No sexual content about real people, and nothing sexualizing minors, ever.',
  '- No hate or dehumanization of protected groups; no slurs.',
  '- No targeted harassment, bullying, threats, or defamation of a real identifiable person.',
  '- Treat every subject as if they will read the result. Default to affectionate and recognizable.',
  '',
  'OUTPUT: Reply with ONLY a single JSON object (no prose, no markdown fences), shaped EXACTLY:',
  '{',
  '  "intro": "one warm sentence introducing the hero",',
  '  "variations": [   // EXACTLY 3, same person, distinct builds — vary class/subclass and which stat is the headline',
  '    {',
  '      "name": "<their name>", "title": "<fantasy title>", "class": "<5e class>", "subclass": "<subclass>",',
  '      "alignment": "<lean Good/collaborative>", "role": "party",',
  '      "abilities": { "str": <1-20>, "dex": <1-20>, "con": <1-20>, "int": <1-20>, "wis": <1-20>, "cha": <1-20> },',
  '      // one HEADLINE 17-20 for what they are great at; one DUMPED 6-9 for the flaw; rest 10-15',
  '      "saves": ["<two ability keys, the failure modes they resist, e.g. wis>", "<...>"],',
  '      "feature": "<one-line signature ability>", "tagline": "<their quote, polished>",',
  '      "log": [ { "v": "<value gained>", "change": "<what shifted>", "why": "<from how they grew>" } ],',
  '      "variation_note": "<5-8 words: this build\'s angle, e.g. \'Bard build — leans on charm\'>"',
  '    }',
  '  ],',
  '  "beat": { "title": "<fantasy title>", "cards": [ { "caption": "<short>", "scene": "<vivid visual scene>" } ] }  // 3-5 cards; opens and closes on the same image; lands one durable, positive moral',
  '}',
  'Keep it tight and shareable. This is a story toy, not therapy.',
].join('\n');

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

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // No key configured → tell the client to use its copy-the-prompt fallback.
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'Generation not enabled. Add ANTHROPIC_API_KEY to enable /api/forge.' }, 503);
  }

  let prompt = '';
  try {
    const body = await request.json() as { prompt?: string };
    prompt = String(body.prompt || '').slice(0, MAX_PROMPT_CHARS);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!prompt.trim()) return json({ error: 'Missing prompt' }, 400);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.FORGE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 3200,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Upstream ${res.status}`, detail: detail.slice(0, 500) }, 502);
    }

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('\n').trim();
    // The model is asked for a single JSON object; parse it (tolerating stray fences/prose).
    // On any parse miss, fall back to returning the raw text so the client still shows something.
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { intro?: string; variations?: unknown[]; beat?: unknown };
        if (Array.isArray(parsed.variations) && parsed.variations.length) {
          return json({ intro: parsed.intro || '', variations: parsed.variations, beat: parsed.beat || null });
        }
      }
    } catch { /* fall through to text */ }
    return json({ text: text || '(no content returned)' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Server error: ${msg}` }, 500);
  }
}
