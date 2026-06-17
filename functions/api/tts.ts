/**
 * Cloudflare Pages Function: /api/tts
 *
 * Text-to-speech for the "Add your take" maker's Audio output type. The maker
 * POSTs the note/prompt text plus the chosen ElevenLabs voice id; we synthesize
 * with the server-held key (so the key never reaches the browser) and return the
 * clip as a base64 data URL the maker drops straight into an <audio controls>.
 *
 * Route:
 *   POST /api/tts  { text, voiceId }  ->  { audio: "data:audio/mpeg;base64,…" }
 *
 * Upstream: POST https://api.elevenlabs.io/v1/text-to-speech/<voiceId>
 *   header `xi-api-key`, model_id "eleven_multilingual_v2", returns audio/mpeg.
 * Mirrors functions/api/voices.ts for CORS + JSON + fail-safe error handling.
 *
 * Fail-safe:
 *   - no ELEVENLABS_API_KEY                  -> 503 (UI falls back to no audio)
 *   - missing text / voiceId                 -> 400
 *   - upstream error / any throw             -> 502 / 500 with a short message
 *
 * Setup (Cloudflare -> Pages -> your project -> Settings):
 *   Variables and Secrets -> ELEVENLABS_API_KEY = <your key>
 *   (optional) ELEVENLABS_TTS_MODEL  (default "eleven_multilingual_v2")
 */

interface Env {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_TTS_MODEL?: string;
}

const TTS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech/';
const MAX_TEXT = 2500; // a take is a short line, not a script; keep latency + cost bounded

/* --- CORS + JSON (mirrors voices.ts) -------------------- */

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Base64-encode an ArrayBuffer in chunks (apply() overflows the call stack on big buffers).
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}

/* --- Main handler --------------------------------------- */

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!env.ELEVENLABS_API_KEY) {
    return json({ error: 'Audio unavailable. Set ELEVENLABS_API_KEY on the Pages project.' }, 503);
  }

  let text = '', voiceId = '';
  try {
    const body = await request.json() as { text?: string; voiceId?: string };
    text = String(body.text || '').slice(0, MAX_TEXT).trim();
    voiceId = String(body.voiceId || '').trim();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!text) return json({ error: 'Missing text' }, 400);
  if (!voiceId) return json({ error: 'Missing voiceId' }, 400);
  // Keep the path segment a plain id; never let a caller-supplied string escape the route.
  if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) return json({ error: 'Invalid voiceId' }, 400);

  const model = env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2';
  try {
    const res = await fetch(TTS_BASE + encodeURIComponent(voiceId), {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text: text, model_id: model }),
    });
    if (!res.ok) {
      return json({ error: `TTS ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
    }
    const buf = await res.arrayBuffer();
    return json({ audio: 'data:audio/mpeg;base64,' + toBase64(buf) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: `TTS error: ${msg}` }, 500);
  }
}
