# Beat Video Pipeline — design spec

> A beat is a swipe deck of frames (per style A/B/C). Turn each frame into a short clip,
> persist it, page through clips like images, keep characters consistent across frames via
> character-sheet injection, then stitch a beat's clips into one full-length video with a
> music track (auto / prompt / upload). Captures Jeff's 2026-06-16 direction.

## Phases (build order)

### Phase 1 — Persist & page (foundation)
- **R2 binding** `MEDIA` on the Pages project (dashboard → Settings → Functions → Bindings).
- `functions/api/video.ts`: on completion, copy the finished Veo file into R2 at
  `videos/<beat>-<style>-<n>[-v<variant>].mp4` and return the R2 URL. **Default-save** — a
  generated clip persists and is linked to its frame.
- **Silent per-frame clips**: request Veo with audio/music OFF so the *stitch* owns the
  soundtrack (Veo 3 adds audio by default — confirm the suppression param; else strip at stitch).
- **Frontend (beats.js)**: video state keyed by `beat:style:frame` (+ variant). Fixes the
  current bugs: (a) button leaks "Remake video" onto frames with no clip → must be per-frame;
  (b) clips don't persist → load each frame's clip from R2 on paging. Carousel pages through
  **clips and variants** by style/pill (pill→variant selector).

### Phase 2 — Character consistency (the thesis)
- Veo re-invents the recurring cast between frames — the exact thing character sheets exist to
  fix. Add a **`visual`** descriptor per character in `data/characters.json` (condensed:
  face/build, hair, garb, signature prop, palette). This *also* becomes the portrait source for
  sheet rendering (currently the 10 new chars have no portrait source → sheets can't render).
- Map **beat → adventure → cast** (party + key npcs/monsters). Inject a condensed
  "character bible" (the `visual` one-liners for that beat's cast) into the image **and** video
  prompts, so Gemini/Veo render the same characters every frame.

### Phase 3 — Stitch + music (post-process)
- **Stitch** a beat's per-frame clips → one full video. *Recommended:* a local
  `scripts/beat-video.mjs` (Node + ffmpeg) — reliable, fast, high quality, handles uploads;
  Cloudflare Pages Functions can't run ffmpeg. (In-browser ffmpeg.wasm is the fallback if we
  want in-app stitching later.) Output → R2 `videos/<beat>-<style>-full.mp4`; the site plays it.
- **Music** over the (silent) stitched video, in priority order:
  1. **Upload** a track (simplest; personal use — Jeff owns copyright responsibility).
  2. **Prompt → music-gen** if a Gemini music model (Lyria) is reachable.
  3. None.
  Mixed under the stitched video by the stitch script.

## Data-model additions
- `data/characters.json` → per character: `visual: { appearance, garb, signature, palette }`
  (or one condensed string). Drives sheet portraits + prompt injection.
- R2 keys: `videos/<beat>-<style>-<n>[-v<variant>].mp4` (frame clips),
  `videos/<beat>-<style>-full.mp4` (stitched), `audio/<beat>-<style>.<ext>` (music).

## Open decisions (defaults chosen unless Jeff redirects)
- **Music source:** upload-first + simple prompt-gen if available. *(default)*
- **Stitch location:** local Node+ffmpeg script now; in-browser ffmpeg.wasm later. *(default)*
- **Veo audio suppression:** confirm the parameter; if none, strip audio at stitch.

## Research inputs (consistency craft) — feeds Phase 2 cue design

Beyond per-character cues, inject per-adventure/per-beat ENVIRONMENT, theme, setting, NPC,
monster, and timeline cues, adapted from real DM/dramatic craft so Veo recreates coherent,
meaningful ARCS. A background research agent is sourcing techniques into
`docs/research/dm-consistency-craft.md`. Scope to cover:
- **DM experts (last decade):** Matt Mercer, Brennan Lee Mulligan, Aabria Iyengar, Matt
  Colville ("Running the Game"), Mike Shea / Sly Flourish ("Lazy DM"), WotC DMG, D&D Beyond.
- **Dramatic arts:** "theater of the mind", improv ("yes-and", scene-establishment,
  status/stakes), stagecraft — for evoking and *holding* a consistent scene.
- Output: technique → reusable prompt cue, plus adventure/beat metadata fields + a per-adventure
  "consistency bible" block prepended to every frame's prompt.

## Status
- Phase 1 blocked on the R2 binding (one dashboard step). Functions + frontend ready to build after.
- Phase 2 `visual` metadata also unblocks the 10 missing character sheets + 9 covers.
