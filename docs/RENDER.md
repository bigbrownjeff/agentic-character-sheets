# Finished-moment rendering ("Finish this story → video")

Stitches a played story's per-beat clips into ONE polished social moment: captions
burned in, a written voiceover read by George (ElevenLabs), a genre music bed, muxed
and uploaded to R2. The site only generates per-beat clips; this assembles them.

## Why it's CI, not a Function

ffmpeg can't run in a Cloudflare Pages Function. So the heavy lifting runs on a GitHub
Actions runner (which has ffmpeg) and the site just kicks it and polls R2 for the result.

## Flow

```
forge.js  buildFinishMoment()                      (story view)
  │  1. gate: every beat needs a clip in R2 (story-<hero>-<adv>-<n>.mp4)
  │  2. POST /api/render { outKey, title, tone, genre, clipKeys[], beats[{caption,scene}] }
  ▼
functions/api/render.ts  (POST)
  │  repository_dispatch -> GitHub  (needs GH_DISPATCH_TOKEN)
  ▼
.github/workflows/render-moment.yml   (event: render-moment)
  │  installs ffmpeg, runs:
  ▼
scripts/render-moment.mjs
  │  curl clips from R2 -> burn captions -> concat
  │  gemini-2.5-flash writes a VO -> ElevenLabs George TTS (Gemini TTS fallback)
  │  ElevenLabs Music by genre (Lyria fallback) -> ffmpeg mix + mux
  │  PUT the file to /api/r2-put  (RENDER_UPLOAD_TOKEN)
  ▼
functions/api/r2-put.ts  -> env.MEDIA.put(outKey)   (R2 binding, same one /api/video uses)
  ▼
forge.js polls  GET /api/render?key=<outKey>  -> shows + restores the video
```

`outKey` is always `videos/story-<heroId>-<advId>-FULL.mp4`. The client knows it, so it
polls (and restores on reload) without server round-trips beyond the R2 head check.

## Secrets

| Secret | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | GitHub Actions | VO script + Gemini TTS/Lyria fallback |
| `ELEVENLABS_API_KEY` | GitHub Actions | George voice + genre music |
| `RENDER_UPLOAD_TOKEN` | GitHub Actions **and** Pages env | shared secret authing the `/api/r2-put` upload |
| `GH_DISPATCH_TOKEN` | Pages env | fine-grained GitHub PAT, **Contents: read/write**, so `/api/render` can trigger the workflow |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions | deploy (also a wrangler fallback for local uploads) |

### One-time setup for `GH_DISPATCH_TOKEN`
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate.
   Repo access: only `agentic-character-sheets`. Permission: **Contents → Read and write**.
2. Cloudflare → Pages → `agentic-character-sheets` → Settings → Variables and secrets →
   add `GH_DISPATCH_TOKEN` = the PAT (type **Secret**).

The other secrets are already set. `RENDER_UPLOAD_TOKEN` was generated and set on both
sides via `gh secret set` + `wrangler pages secret put`.

## Render one manually (no button needed)

```bash
gh workflow run render-moment.yml -f payload="$(cat payload.json)"
# payload.json:
# { "outKey":"videos/story-<hero>-<adv>-FULL.mp4", "title":"…", "genre":"trailer",
#   "clipKeys":["videos/story-…-1.mp4", …], "beats":[{"caption":"…","scene":"…"}] }
```
`genre` presets: americana · techno · orchestral · ambient · trailer · noir · folk ·
synthwave · horror (else auto from `tone`). Genre auto-maps per adventure in
`forge.js storyGenre()`.

## Gotchas this design paid for

- **The deploy token has no R2 scope** — `wrangler r2 object put` 500s with "bucket does
  not exist". Upload through the `MEDIA` binding (`/api/r2-put`), not a token.
- **`local/` is gitignored** — CI can't see it. Anything CI runs lives in `scripts/`.
- **No local `tsc`** for Functions — `node --check` only parses JS. Before pushing a
  `functions/*.ts` change, run `npx esbuild functions/api/<f>.ts --bundle --format=esm
  --outfile=/dev/null`; that's what the Cloudflare build uses and it catches things like
  duplicate `const` declarations that otherwise fail the deploy silently.
- **`repository_dispatch` needs Contents:write** on a fine-grained PAT (not Actions).
- **Don't build a `concurrency.group` from the raw payload** — invalid chars fail the run
  at validation (2s, no jobs).
- **Stale-FULL on re-finish** — the client waits ~35s before polling so it doesn't read
  the previous render's file before the new one overwrites it.
