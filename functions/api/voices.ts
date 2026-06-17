/**
 * Cloudflare Pages Function: /api/voices
 *
 * Lists the available ElevenLabs voices for the "Add your take" maker's Audio
 * output type (the voice picker). Read-only proxy: it calls ElevenLabs with the
 * server-held key so the key never reaches the browser, and trims the upstream
 * payload to just what the picker needs.
 *
 * Route:
 *   GET /api/voices  ->  { voices: [{ voice_id, name, preview_url, category }] }
 *
 * Upstream: GET https://api.elevenlabs.io/v1/voices  (header `xi-api-key`).
 * Mirrors functions/api/content.ts for CORS + JSON + error handling.
 *
 * Fail-safe:
 *   - no ELEVENLABS_API_KEY                  -> 503 (UI hides the picker, no crash)
 *   - upstream error / bad JSON / any throw  -> { voices: [] } (200) so the
 *     caller degrades to "no voices to pick" rather than a broken control.
 *
 * Setup (Cloudflare -> Pages -> your project -> Settings):
 *   Variables and Secrets -> ELEVENLABS_API_KEY = <your key>
 *   (the same key the CI render pipeline uses for the George voiceover)
 */

interface Env {
  ELEVENLABS_API_KEY?: string;
}

// Shape of one upstream voice (only the fields we read; ElevenLabs sends more).
interface ElevenVoice {
  voice_id?: string;
  name?: string;
  preview_url?: string;
  category?: string;
}
interface ElevenVoicesResponse {
  voices?: ElevenVoice[];
}

// The trimmed shape we hand back to the picker.
interface TrimmedVoice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
}

const VOICES_URL = 'https://api.elevenlabs.io/v1/voices';
const MAX_VOICES = 120; // a generous cap; the picker is a <select>, not a wall

/* --- CORS + JSON (mirrors content.ts) ------------------- */

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

/* --- Main handler --------------------------------------- */

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (method !== 'GET') return err('Method not allowed', 405);

  if (!env.ELEVENLABS_API_KEY) {
    return err('Voice list unavailable. Set ELEVENLABS_API_KEY on the Pages project.', 503);
  }

  try {
    const res = await fetch(VOICES_URL, {
      method: 'GET',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Accept': 'application/json' },
    });
    // Any non-2xx (bad key, rate limit, outage): degrade to an empty list, not a 500,
    // so the picker shows "no voices" instead of reading as a broken endpoint.
    if (!res.ok) return json({ voices: [] });

    const data = (await res.json()) as ElevenVoicesResponse;
    const raw = Array.isArray(data.voices) ? data.voices : [];
    const voices: TrimmedVoice[] = [];
    for (const v of raw) {
      if (!v || typeof v.voice_id !== 'string' || !v.voice_id) continue;
      voices.push({
        voice_id: v.voice_id,
        name: typeof v.name === 'string' ? v.name : v.voice_id,
        preview_url: typeof v.preview_url === 'string' ? v.preview_url : '',
        category: typeof v.category === 'string' ? v.category : '',
      });
      if (voices.length >= MAX_VOICES) break;
    }
    return json({ voices });
  } catch {
    // Network/parse failure: fail safe to an empty list.
    return json({ voices: [] });
  }
}
