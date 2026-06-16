# site/cards/ — committed default images

These are the **default** illustrations the site shows. They're committed to the repo
(not gitignored) so the CI deploy ships them — the GitHub Action deploys only what's in
git, so anything not committed here will NOT appear on the live site.

The site loads each image by a fixed path and **falls back to a drawn Canvas card** if the
file is missing. The in-page **🖼 Make image** buttons add AI-generated versions on top of
these defaults (they never overwrite the files here).

## Where each file goes

| Content | Path | Example |
|---|---|---|
| Character | `site/cards/sheets/<character-id>.png` | `sheets/ponytail.png` |
| Adventure cover | `site/cards/covers/<adventure-id>-<A\|B\|C>.png` | `covers/the-orange-menace-A.png` |
| Beat card | `site/cards/beats/<beat-id>-<A\|B\|C>-<n>.png` | `beats/orange-menace-A-1.png` |

- `<character-id>` / `<adventure-id>` / `<beat-id>` are the `id` fields in
  `data/characters.json`, `data/adventures.json`, and `site/data/beats.json`.
- Cover/beat style suffix: `A` = painterly, `B` = graphic novel, `C` = Trend.
- Beat `<n>` is the 1-based card index within the beat.
- Portrait 4:5 PNGs (the cards are designed for ~1080×1350).

## To restore / update the live defaults

From a local clone that has your generated images:

```bash
git pull
# copy your images into site/cards/{sheets,covers,beats}/ using the names above
git add site/cards
git commit -m "art: default card images"
git push        # the deploy workflow publishes them on merge to main
```
