# site/cards/ — media lives in Cloudflare R2, not git

The card/cover/beat images (and beat videos, future audio) are the site's **default**
illustrations. They are **NOT committed to git** — binary media grows forever and doesn't
belong in history. They live in a **Cloudflare R2 bucket** (durable, cheap, zero-egress)
and the site loads them from the R2 public URL.

- **Bucket / base URL:** see `site/data/media.json` (`base`). The browser reads the same
  value from `site/assets/media.js` (`window.MEDIA_BASE`).
- The site loads each image by a fixed path under `<MEDIA_BASE>/cards/...` and **falls back
  to a drawn Canvas card** on 404 (so a missing image degrades gracefully).
- The in-page **🖼 Make image** buttons add AI-generated versions on top of these defaults.
- The PNGs under `site/cards/**` are **gitignored**; this README and `manifest.json` are the
  only tracked things here.

## Where each file goes

| Content | Local path (and R2 key under `cards/`) | Example |
|---|---|---|
| Character | `site/cards/sheets/<character-id>.png` | `sheets/ponytail.png` |
| Adventure cover | `site/cards/covers/<adventure-id>-<A\|B\|C>.png` | `covers/the-orange-menace-A.png` |
| Beat card | `site/cards/beats/<beat-id>-<A\|B\|C>-<n>.png` | `beats/orange-menace-A-1.png` |

- `<character-id>` / `<adventure-id>` / `<beat-id>` are the `id` fields in
  `data/characters.json`, `data/adventures.json`, and `site/data/beats.json`.
- Cover/beat style suffix: `A` = painterly, `B` = graphic novel, `C` = Trend.
- Beat `<n>` is the 1-based card index within the beat.
- Portrait 4:5 PNGs (the cards are designed for ~1080×1350).

## Sync media with R2

A fresh clone — **local or a cloud session** — has no images. Restore them from R2:

```bash
npm run media:pull          # download every default from the R2 public URL (no auth needed)
```

After generating or updating art locally, publish it:

```bash
# write the file to site/cards/{sheets,covers,beats}/ using the names above, then:
npm run media:push          # upload to R2 + refresh manifest.json   (needs `wrangler login`)
```

`media:pull` is credential-free (public URL + `manifest.json` index), so any environment can
restore the media. `media:push` writes to R2 via `wrangler r2 object put --remote`.

> The CI deploy ships the site **code** from git; images are served from R2 at runtime, so
> they don't need to be in the deploy. To repoint to a custom domain (e.g.
> `media.jeffpinto.com`), change `base` in `site/data/media.json` **and** `MEDIA_BASE` in
> `site/assets/media.js`.
