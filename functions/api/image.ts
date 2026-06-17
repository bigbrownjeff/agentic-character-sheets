/**
 * Cloudflare Pages Function: /api/image
 *
 * Text-to-image with a selectable provider:
 *   - "gemini"     → Google Gemini image model (Nano Banana / Imagen-class). Best quality.
 *   - "cloudflare" → Cloudflare Workers AI (flux-1-schnell). Fast/free, lower fidelity.
 *   - "auto"       → IMAGE_PROVIDER env, else Gemini if a key exists, else Cloudflare.
 *
 * Request:  { prompt: string, provider?: "auto"|"gemini"|"cloudflare", quality?: "hq"|"std",
 *             intent?: string, aspect?: "9:16"|"1:1"|"16:9", docs?: [{ mimeType, data }] }
 * Response: { image: "data:image/...;base64,…", provider, passes?, score? }
 *
 * aspect (gemini only) sets generationConfig.imageConfig.aspectRatio; the Cloudflare
 * path ignores it (flux-1-schnell has no aspect param). docs are reference documents
 * (PDF/txt/md, base64-stripped {mimeType,data}) appended as inlineData parts so the
 * model can read an attached brief (separate from refImages, the identity-anchor pixels).
 *
 * quality:"hq" (Gemini only) runs a HIDDEN adversarial pass: generate -> a vision
 * critic scores it against the intent and, if it's weak, we regenerate ONCE with a
 * targeted fix, then ship the better of the two. Two passes, one quality output;
 * the caller never sees the reject. `intent` overrides what the critic judges
 * against (defaults to the prompt).
 *
 * Setup (Cloudflare → Pages → your project → Settings):
 *   Gemini:     Variables and Secrets → GEMINI_API_KEY = <your key>
 *               (optional) GEMINI_IMAGE_MODEL  (default "gemini-2.5-flash-image")
 *               (optional) CRITIC_MODEL        (default "gemini-2.5-flash")
 *   Cloudflare: Functions → Bindings → add Workers AI binding named  AI
 *               (optional) FORGE_IMAGE_MODEL   (default flux-1-schnell)
 *   (optional)  IMAGE_PROVIDER = gemini | cloudflare   (default for "auto")
 *
 * If the chosen provider isn't configured it 503s and the client falls back to
 * the dependency-free Canvas card, so users still see an image.
 */

interface R2Like { put(key: string, value: ArrayBuffer, opts?: unknown): Promise<unknown>; }
interface Env {
  AI?: { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };
  GEMINI_API_KEY?: string;
  GEMINI_IMAGE_MODEL?: string;
  CRITIC_MODEL?: string;
  FORGE_IMAGE_MODEL?: string;
  IMAGE_PROVIDER?: string;
  MEDIA?: R2Like;       // R2 binding; with `saveKey` the image persists to cards/forged/<key>.png
  MEDIA_BASE?: string;
}

const MEDIA_BASE_DEFAULT = 'https://pub-92102a1a4a2e4137b3e39df163badf14.r2.dev';
const MAX_PROMPT = 1500;

// Persist a generated data-URL image to R2 so forged heroes survive a reload and show in
// /admin. Returns the public URL, or '' (best-effort: never blocks returning the image).
async function persistImage(dataUrl: string, saveKey: string, env: Env): Promise<string> {
  if (!saveKey || !env.MEDIA) return '';
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return '';
  const key = 'cards/forged/' + saveKey.replace(/[^a-zA-Z0-9._-]/g, '') + '.png';
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    await env.MEDIA.put(key, bytes.buffer, { httpMetadata: { contentType: m[1] || 'image/png' } });
    return (env.MEDIA_BASE || MEDIA_BASE_DEFAULT).replace(/\/$/, '') + '/' + key;
  } catch { return ''; }
}
const REDO_PROMPT_MAX = 2200; // the internal redo prompt carries the critic's fix, so it runs longer
const CRITIC_THRESHOLD = 7;   // a generation scoring below this gets one redo
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
interface ImagePart { inlineData: { mimeType: string; data: string }; }
// When reference images are supplied (e.g. a locked character portrait), Gemini copies
// identity from the PIXELS, not the words; this is the keyframe-identity lock. Prepend a
// short instruction so it knows the refs are the subject to preserve, not scenery.
const IDENTITY_LOCK = 'Preserve the EXACT appearance of the character(s) shown in the reference image(s): same face, hair, build, age, and signature clothing. Keep them identical; only the scene, pose, and action change. ';
async function viaGemini(prompt: string, env: Env, refs?: ImagePart[], aspect?: string, docs?: ImagePart[]): Promise<string> {
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const hasRefs = !!(refs && refs.length);
  const reqParts: Array<{ text?: string } | ImagePart> = [{ text: (hasRefs ? IDENTITY_LOCK : '') + prompt }];
  if (hasRefs) for (const r of refs!) reqParts.push(r);
  if (docs && docs.length) for (const d of docs) reqParts.push(d); // attached brief as inlineData
  const generationConfig: Record<string, unknown> = { responseModalities: ['TEXT', 'IMAGE'] };
  if (aspect) generationConfig.imageConfig = { aspectRatio: aspect };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: reqParts }],
      generationConfig,
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
  throw new Error('Gemini returned no image (model may not support image output; check GEMINI_IMAGE_MODEL)');
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

/* --- Adversarial critic (hidden quality gate) ------------ */
interface Critique { score: number; verdict: 'keep' | 'redo'; flaws: string[]; tweak: string; }

// Score a generated image against its intent with a vision model. Returns null on
// any failure (so the gate degrades to "ship what we have", never blocks output).
async function critique(imageDataUrl: string, intent: string, env: Env): Promise<Critique | null> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(imageDataUrl);
  if (!m || !env.GEMINI_API_KEY) return null;
  const model = env.CRITIC_MODEL || 'gemini-2.5-flash';
  const sys = [
    'You are a ruthless art director reviewing an AI-generated illustration before it ships.',
    'Judge it ONLY against the stated INTENT. Score 1-10 on, in order of weight:',
    '1) does it depict the intended scene/subject; 2) anatomy (hands, fingers, faces, eyes, limb counts);',
    '3) composition and focal clarity; 4) NO garbled text, watermarks, logos, or artifacts; 5) tonal fit.',
    'Be harsh. 7+ is genuinely shippable; 9-10 is rare. Any real flaw => verdict "redo".',
    'Output ONLY JSON: {"score":<int 1-10>,"verdict":"keep"|"redo","flaws":["short specifics"],',
    '"tweak":"<one concrete prompt addition that fixes the biggest flaw, e.g. \'render the left hand with exactly five fingers; remove the floating text\'>"}',
  ].join('\n');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ parts: [{ text: 'INTENT: ' + intent }, { inlineData: { mimeType: m[1], data: m[2] } }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return null;
    const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    const mm = text.match(/\{[\s\S]*\}/);
    if (!mm) return null;
    const c = JSON.parse(mm[0]) as Partial<Critique>;
    if (typeof c.score !== 'number') return null;
    const flaws = Array.isArray(c.flaws) ? c.flaws.map(String) : [];
    return {
      score: c.score,
      verdict: (c.verdict === 'redo' || c.score < CRITIC_THRESHOLD) ? 'redo' : 'keep',
      flaws,
      tweak: String(c.tweak || ''),
    };
  } catch { return null; }
}

// HQ generate: gen -> critique -> (one targeted redo if weak) -> ship the higher score.
// Always at most two generations. Hidden from the caller except for {passes, score}.
async function generateBestGemini(prompt: string, intent: string, env: Env, refs?: ImagePart[], aspect?: string, docs?: ImagePart[]): Promise<{ image: string; passes: number; score: number | null }> {
  const first = await viaGemini(prompt, env, refs, aspect, docs);
  const c1 = await critique(first, intent, env);
  if (!c1 || c1.verdict === 'keep') return { image: first, passes: 1, score: c1 ? c1.score : null };
  const fix = (c1.tweak ? ' ' + c1.tweak : '') + (c1.flaws.length ? ' Avoid: ' + c1.flaws.slice(0, 3).join('; ') + '.' : '');
  // The redo is a SECOND upstream call on an already-long request (HQ + reference can be ~40s);
  // if it blips, ship the good first pass instead of 500-ing the whole thing (which read to the
  // user as a dead "image not enabled" button). Pass 1 is always a valid image.
  let second: string;
  try { second = await viaGemini((prompt + fix).slice(0, REDO_PROMPT_MAX), env, refs, aspect, docs); }
  catch { return { image: first, passes: 1, score: c1.score }; }
  const c2 = await critique(second, intent, env);
  const keepSecond = !c2 || c2.score >= c1.score;
  return { image: keepSecond ? second : first, passes: 2, score: keepSecond ? (c2 ? c2.score : null) : c1.score };
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let prompt = '', provider = 'auto', quality = 'std', intent = '', saveKey = '', aspect = '';
  let rawRefs: string[] = [];
  const docs: ImagePart[] = [];
  const ASPECTS = ['9:16', '1:1', '16:9'];
  try {
    const body = await request.json() as { prompt?: string; provider?: string; quality?: string; intent?: string; refImages?: unknown; saveKey?: string; aspect?: string; docs?: unknown };
    prompt = String(body.prompt || '').slice(0, MAX_PROMPT).trim();
    provider = String(body.provider || 'auto').toLowerCase();
    quality = String(body.quality || 'std').toLowerCase();
    intent = String(body.intent || '').slice(0, MAX_PROMPT).trim();
    saveKey = String(body.saveKey || '').slice(0, 80);
    if (body.aspect && ASPECTS.indexOf(String(body.aspect)) !== -1) aspect = String(body.aspect);
    if (Array.isArray(body.refImages)) rawRefs = body.refImages.filter((x) => typeof x === 'string').slice(0, 3) as string[];
    // Reference docs: {mimeType, data} where data is bare base64 (the client strips the
    // data-URL prefix). Appended as inlineData parts for the gemini path; max 2.
    if (Array.isArray(body.docs)) {
      for (const d of (body.docs as Array<{ mimeType?: unknown; data?: unknown }>).slice(0, 2)) {
        if (d && typeof d.mimeType === 'string' && typeof d.data === 'string' && d.data) {
          docs.push({ inlineData: { mimeType: d.mimeType, data: d.data } });
        }
      }
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!prompt) return json({ error: 'Missing prompt' }, 400);
  if (BLOCK.test(prompt)) return json({ error: 'Prompt rejected' }, 422);

  // Resolve reference images (data URLs or fetchable URLs, e.g. a locked portrait in R2)
  // into inline parts. These are the identity anchor; see IDENTITY_LOCK / viaGemini.
  const refs: ImagePart[] = [];
  for (const ref of rawRefs) {
    const dm = /^data:([^;]+);base64,(.+)$/.exec(ref);
    if (dm) { refs.push({ inlineData: { mimeType: dm[1], data: dm[2] } }); continue; }
    if (/^https?:\/\//.test(ref)) {
      try {
        const rr = await fetch(ref);
        if (rr.ok) {
          const buf = await rr.arrayBuffer();
          if (buf.byteLength <= 8 * 1024 * 1024) {
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
            refs.push({ inlineData: { mimeType: rr.headers.get('Content-Type') || 'image/png', data: btoa(bin) } });
          }
        }
      } catch { /* skip an unfetchable ref; degrade to no-anchor gen */ }
    }
  }

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
    let image: string, meta: Record<string, unknown>;
    if (provider === 'gemini') {
      if (quality === 'hq') {
        const r = await generateBestGemini(prompt, intent || prompt, env, refs, aspect, docs);
        image = r.image; meta = { provider: 'gemini', passes: r.passes, score: r.score, refs: refs.length };
      } else {
        image = await viaGemini(prompt, env, refs, aspect, docs); meta = { provider: 'gemini', passes: 1, refs: refs.length };
      }
    } else {
      image = await viaCloudflare(prompt, env); meta = { provider: 'cloudflare' }; // aspect/docs are gemini-only
    }
    const saved = await persistImage(image, saveKey, env); // durable copy when saveKey given
    return json({ image, saved, ...meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `Image generation failed: ${msg}` }, 500);
  }
}
