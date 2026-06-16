# Admin content browser

> One owner-only page that lists EVERY piece of the project's content (pages, text,
> images, videos) in a single searchable, filterable, sortable table, and previews any
> item inline. Built so you can find content by attribute instead of walking the live
> site to find it in place.

## How to reach it

Open `/admin` (i.e. `https://character-sheet.jeffpinto.com/admin.html`, or
`./admin.html` locally). It is **unlisted**: not linked from the public nav and tagged
`<meta name="robots" content="noindex, nofollow">`. The only way in is to know the URL.

## What it lists

Four sources are fetched in the browser and merged into one table:

| Source | Row type(s) | Loaded from |
|---|---|---|
| R2 media bucket | `sheet`, `cover`, `beat-image`, `clip`, `moment` | `GET ./api/content` (the Function below) |
| Statted characters | `character-text` | `./data/characters.json` |
| Beats (per card) | `beat-text` | `./data/beats.json` (one row per `cards[]` entry) |
| Site pages | `page` | a static list inside `site/assets/admin.js` (`PAGES`) |

Each row carries: **type** (with a colour tick: green = page, blue = text, red = media),
**name / key** (key shown in mono underneath), **size** (media only, formatted from bytes),
and a **preview** affordance.

Controls:

- **Search** box: substring match across the key/name and, for text rows, the underlying
  text (stat line, signal, beat caption + scene). Case-insensitive.
- **Filter pills**: `All`, then one pill per type actually present, each with a live count.
- **Column sort**: click `Type`, `Name / Key`, or `Size` to sort; click again to reverse.
  Null sizes (text and pages) always sort to the bottom.

**Inline preview**: click any row and it expands in place.

- Image rows render an `<img>`; video rows render a `<video controls>`. The URL is built as
  `media.base + '/' + key` (base from `media.js` / `site/data/media.json`). A meta line shows
  the key, size, and upload date, plus an `open ↗` link to the raw R2 object.
- Text rows render the labeled detail (character: name, represents, role/alignment, stat line,
  tagline, signal, source; beat: beat/adventure, caption, scene).
- Page rows show the file and an `open ↗` link to the page.

It is plain DOM with client-side filter/sort, so it stays fast at a few hundred rows. If a
source fails to load it fails soft: the other sources still populate the table and the status
line names what was missing (e.g. an unbound `MEDIA` binding shows the media-unavailable note).

## How the R2 list Function works

`functions/api/content.ts` is a Cloudflare Pages Function (GET only) that lists the whole
media bucket through the `MEDIA` R2 binding already configured on the Pages project (same
binding `functions/api/video.ts` uses to persist clips). It mirrors `functions/api/comments.ts`
for CORS, JSON responses, and error handling.

```
GET /api/content  ->  { count, objects: [ { key, size, uploaded, kind } ] }
```

- It pages through the bucket with `env.MEDIA.list({ cursor })`, following `truncated` /
  `cursor` until exhausted, so the response is the FULL object set, not just the first 1000 keys.
- `kind` is derived from the key prefix/pattern:
  - `cards/sheets/<id>.png` -> `sheet`
  - `cards/covers/<adv>-<A|B|C>.png` -> `cover`
  - `cards/beats/<beat>-<A|B|C>-<n>.png` -> `beat-image`
  - `videos/<...>-full.mp4` -> `moment` (stitched), any other `videos/...mp4` -> `clip`
  - anything else -> `other`
- If `env.MEDIA` is not bound it returns a clear **503** so the page can say so rather than
  silently showing zero media.

## v1 access caveat

There is **no auth in v1**. That is acceptable because the R2 bucket is already public through
its `r2.dev` URL (see `site/data/media.json`), so `/api/content` only re-lists keys that are
already publicly fetchable, and the page exposes no write path. The page is owner-only by
obscurity (unlisted URL + `noindex`), not by an access control.

If real protection is ever needed, gate it with Cloudflare Access (zero-trust) on the
`/admin.html` and `/api/content` routes, or add a shared-secret header check in the Function.

## Constraints honored

Additive only. The feature adds exactly three files (`functions/api/content.ts`,
`site/admin.html`, `site/assets/admin.js`) plus this doc; no existing page, Function, data
file, or build step was modified, and `admin` is intentionally absent from the public nav.
