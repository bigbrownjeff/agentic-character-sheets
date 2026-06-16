# Turning on AI generation (Cloudflare Pages)

The site works without any of this — it always renders the dependency-free Canvas
cards. These steps switch on *generated* content. All of it lives in the Cloudflare
dashboard; no code changes needed.

Open: **Cloudflare dashboard → Workers & Pages → your Pages project**.

## A. Anthropic key — the Forge's "Generate it here" text sheet

Powers `functions/api/forge.ts` (writes the stat block + beat from the answers).

1. Get a key at **console.anthropic.com → API Keys → Create Key**.
2. In your Pages project: **Settings → Variables and Secrets → Add**.
3. Name: `ANTHROPIC_API_KEY` · Value: your key · type **Secret (encrypt)**.
4. (optional) `FORGE_MODEL` = `claude-sonnet-4-6` (the default).
5. **Save**, then **Deployments → … → Retry deployment** (env changes need a redeploy).

## B. Image generation — pick ONE (or both; the toggle chooses)

The "Art engine" dropdown on the Forge/Beats pages sends `auto | gemini | cloudflare`.
`auto` uses `IMAGE_PROVIDER` if set, else Gemini if a key exists, else Cloudflare.

### B1. Gemini (best quality) — recommended

1. Get a key at **aistudio.google.com → Get API key**.
2. Pages → **Settings → Variables and Secrets → Add**:
   - `GEMINI_API_KEY` = your key (Secret).
   - (optional) `GEMINI_IMAGE_MODEL` = `gemini-2.5-flash-image` (default; this is the
     "Nano Banana" image model — change it here if your account uses a different id).
3. (optional) `IMAGE_PROVIDER` = `gemini` to make it the default for "Auto".
4. **Save** → **Retry deployment**.

### B2. Cloudflare Workers AI (fast/free fallback)

1. Pages → **Settings → Functions → Bindings → Add binding**.
2. Type: **Workers AI** · Variable name: **`AI`** (exactly).
3. (optional) `FORGE_IMAGE_MODEL` = `@cf/black-forest-labs/flux-1-schnell` (default).
4. **Save** → **Retry deployment**.

## Verify

After the redeploy, open `/forge.html`, answer the questions, and set **Art engine →
Best (Gemini)**. You should see a generated portrait replace the stylized card. If the
dropdown's choice isn't configured, the button reads "AI art not enabled" and the
stylized card stays — that's the graceful fallback, not an error.

## C. Beat videos — Gemini / Veo ("Gemini Omni")

Powers `functions/api/video.ts`. Video is the **final step**: on the Beats page, approve a
storyboard style (the 3-option toggle), then **🎬 Make video** renders a short clip in that
style. Uses the **same** `GEMINI_API_KEY` as image gen.

1. Ensure `GEMINI_API_KEY` is set (step B1).
2. (optional) `VEO_MODEL` = `veo-3.1-generate-preview` (the default — Veo 3.1, for 15–30s
   clips). Override if your account exposes a different 3.1 id (e.g. a `*-fast-*` variant).
3. (optional) `VEO_DURATION` = `24` — target clip length in seconds (clamped 4–30).
4. **Save** → **Retry deployment**.

Notes / honest limits:
- Veo is long-running (~1–2 min); the UI starts the job and polls, then shows the clip.
- We default to **Veo 3.1** and request `durationSeconds` in the 15–30s range. The delivered
  length still depends on what your account's model allows; if it rejects the duration or the
  model id, the function surfaces the exact API error — lower `VEO_DURATION` or adjust
  `VEO_MODEL`.
- This path is wired but **unverified against the live Veo API from here** — confirm once the
  key is in, and tweak `VEO_MODEL` / `VEO_DURATION` if the start/poll/download shape differs.

Keeping the URL unlisted means no rate-limiting is required; if you ever make it public,
add Cloudflare Rate Limiting / Turnstile in front of `/api/image`, `/api/forge`, and
`/api/video` so a stranger can't spend your credits (video is the most expensive).
