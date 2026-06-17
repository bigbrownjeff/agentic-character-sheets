# Forge to Story

> Play a forged hero through an existing adventure. After the Forge produces three
> stat-card builds, the user picks one build, picks an adventure, and the DM engine
> returns an emergent, stat-driven beat sequence rendered as a personalized "Your Story"
> view beside the canonical adventure.

## The flow

1. **Forge a hero.** Unchanged. `generateHere()` POSTs the intake prompt to `/api/forge`;
   `renderForgedVariations()` draws three full stat-card builds, each with its own portrait
   maker. (When `/api/forge` is off, the page still offers copy-the-prompt; Forge-to-Story
   only attaches to real forged builds, not the lite preview cards.)
2. **Play this build.** Each build card now carries a `▶ Play <name> in an adventure`
   button. Clicking it reveals a chip picker of all adventures, read live from
   `./data/adventures.json` (names + use-category).
3. **Pick an adventure.** On pick we load `./data/beats.json`, match the adventure to its
   beat by `beat.adventure === adventure.name` (id fallback), and POST
   `{ hero, adventure: { title, adventure, bible, cards } }` to `./api/dm`. A calm loading
   state runs (~10 to 20s on gemini-2.5-pro).
4. **Your Story.** The returned beats render as a vertical sequence. Each beat shows its
   `caption` (headline), `decision` (what the hero does), `scene` (the visual, muted), a
   collapsed `Why this happened` toggle revealing `dm_note` (the hidden stat-logic), a
   `Make image` control, and a collapsed `Make a video of this beat` control. A closing line
   links your version against the canonical adventure: "Compare it to the canonical
   <Adventure> ->" (to `./adventures.html`).
5. **Persistence.** The generated beats are saved to `localStorage` under
   `cs-story:<heroId>:<adventureId>`, so a refresh restores the story instead of re-billing
   the model. A `↻ Re-run this story` button clears the key and regenerates.

## The /api/dm contract (built against, not modified)

`POST /api/dm`

```json
{
  "hero": { "name": "...", "class": "...", "abilities": { "str": 0, "dex": 0, "con": 0, "int": 0, "wis": 0, "cha": 0 }, "feature": "...", "tagline": "..." },
  "adventure": { "title": "...", "adventure": "...", "bible": { ... }, "cards": [ { "scene": "...", "caption": "..." } ] }
}
```

returns one beat per canonical card:

```json
{ "beats": [ { "decision": "...", "scene": "...", "caption": "...", "dm_note": "..." } ] }
```

- `decision` = what the hero does, driven by their stats (high ability shines, dumped
  ability causes the turn).
- `scene` = the visual to render (image/video prompt source).
- `caption` = the on-screen line.
- `dm_note` = the hidden stat-logic, the "text behind the media" (shown under
  "Why this happened").

`503` ("DM not enabled", no `GEMINI_API_KEY`) and any other error fall back to a calm
message pointing at the canonical adventure. The key IS set in production, so the live path
works.

### Per-beat media prompts

Image and video prompts are composed locally in `forge.js` to mirror
`CardRender.beatPrompt` / `CardRender.videoPrompt`, but keyed off the DM's emergent
`beat.scene` rather than a canonical card:

```
<style preamble for the adventure's beat id>  +  <bible: [WORLD]/[MOTIFS]/[CAST]/[THREAT]/[TONE]>  +  beat.scene  [+ Art-director note]
```

The style is chosen by the same beat-id map the Adventures page uses (`forge`→terminal,
`masquerade`→gothic, etc.; default painterly). Images POST to `./api/image` via
`CardRender.fetchArt`; videos POST to `./api/video` and poll `./api/video?op=...&key=...`,
persisting to R2 key `story-<heroId>-<adventureId>-<n>.mp4` (same scheme as `beats.js`).

## Files changed

- `site/assets/forge.js` (additive). New: `buildPlayBlock`, `renderAdventurePicker`,
  `playAdventure`, `renderStory`, `buildBeatVideoMaker`, the prompt helpers
  (`storyBeatPrompt`, `storyVideoPrompt`, `storyStyleName`, `bibleToPrompt`), the data
  loaders (`loadAdventures`, `loadBeats`, `beatForAdventure`), and `storyKey`. One line added
  to `renderForgedVariations` to mount the Play block per build.
- `site/assets/forge.css` (additive). Scoped `.forge-play*`, `.forge-adv-*`, `.forge-story-*`,
  `.forge-beat*` blocks. Tokens only, no hardcoded hex beyond the two paper tints the file
  already uses.

Nothing else touched: no Functions, no other pages, no data, no build script. Reuses
`CardRender.versionedMaker / makerControls / takeDisclosure / fetchArt / stylePrompt` and
`window.MEDIA_BASE`.

## JS contracts preserved

- `#forge-app` mount, nav ids (`#nav-toggle` / `#nav-list`), and the `media.js` →
  `cardrender.js` → `forge.js` load order are unchanged (`forge.html` untouched).
- Existing globals/functions (`render`, `generateHere`, `renderForgedVariations`,
  `normalizeForged`, `forgedPortraitPrompt`) keep their signatures; the new code is purely
  additive.
- No em or en dashes added: the dash sweep over `site/assets/forge.js` stays at its
  pre-existing baseline (count of 22), and that count lives entirely in the published
  intake-prompt copy, not in any Forge-to-Story line.

## Verified

Headless Chrome against a mock-API harness: forged a build, clicked Play, saw 10 adventure
chips, picked one, and the Your-Story view rendered 5 beats (matching the Forge adventure's
5 cards) each with caption + decision + scene + a working `Why this happened` reveal showing
`dm_note`, a working `Make image` control (rendered a real `<img>`), the compare link, and a
persisted `cs-story:` localStorage key.
