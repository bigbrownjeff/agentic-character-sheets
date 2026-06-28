# The Play Harness · personas into narrative, for real

> Forge-to-Story (`docs/FORGE-TO-STORY.md`) turns one forged hero into emergent beats with a
> single `gemini-2.5-pro` synthesis call. This is the next step: the characters are **real
> interacting agents**. The DM poses a scenario, each character is spawned as its own
> sub-agent that responds *in character, per its stats*, and the DM synthesizes their colliding
> moves into a coherent beat sequence. The magic is the interaction, not any single voice
> (the chorus model; Bakhtin's polyphony).

This is the Claude-native realization of `/api/dm`. The seam to the live site is preserved:
the synthesized output matches the `/api/dm` beat contract, so a playthrough can later be fed
to `site/data/beats.json` or rendered through the existing pipeline.

## The pieces

```
play/
  README.md                  this · the harness contract + procedure
  party/<id>.md              reusable PLAY-KITS: a roster character rewritten as a playable
                             agent (its sheet + how to commit to its dumped stat + its voice).
                             Drop one into any session to play that character.
  playthroughs/<slug>.md     a finished playthrough (the readable saga)
  playthroughs/<slug>.json   the same, as the /api/dm beat contract (the wiring seam)
```

## Who plays what (the absurdity engine, BEATS.md §2)

- **The monsters and dumped-stat agents are the players.** They commit, fully, to the one
  thing their build guarantees. That commitment is what makes them funny and doomed.
- **The high-judgment character (or the DM's NPC) is the straight man.** It narrates the
  consequence flat. No straight man = noise; no chaos = a diagram.

A play-kit's whole job is to make a sub-agent *commit to its dumped stat*. Rampant Rex
(WIS 4) does not hedge; he completes the task, then completes completing it. Ponytail
(WIS 20) says the quiet true thing and deletes your ticket.

## The procedure (what the DM runs)

The DM persona (`@agent-dm`) runs this with the `Agent` tool. No new infrastructure; the
agents-spawning-agents IS the harness.

1. **Frame.** Pick a region (one of the ten adventures), an antagonist, and a party of
   2 to 4 characters with *contrasting dumped stats* (the collision is the story). State the
   inciting scenario in one line.
2. **Initiative.** Order the turns. The instigator (usually the monster) moves first.
3. **Turns.** Spawn each character as a sub-agent given (a) its play-kit, (b) the scenario,
   (c) what the other players have done so far. It returns ONLY its in-character move plus a
   one-line aside in its voice. It is a player playing chaos, never a narrator.
4. **Rounds.** Feed each round's moves into the next so characters react to each other. Two
   to three rounds is enough for a five-beat arc.
5. **Synthesize.** The DM (you) collapses the colliding moves into a **five-beat ring**:
   each beat carries `caption`, `decision`, `scene`, `dm_note` (the stat-logic), plus
   `archetype`, `moral`, and `event` per `BEATS.md`. The last beat resolves the image the
   first opened on. One durable, positive, 500-year-old moral for the whole arc.
6. **Persist.** Write the readable saga to `playthroughs/<slug>.md` and the contract JSON to
   `playthroughs/<slug>.json`.

## The beat contract (the wiring seam to `/api/dm`)

```json
{
  "adventure": "<region name>",
  "party": [ { "id": "...", "name": "...", "role": "party|monster", "dumped": "wis" } ],
  "moral": "<one durable line>",
  "beats": [
    { "n": 1, "actor": "<id>", "archetype": "...", "event": "...",
      "caption": "...", "decision": "...", "scene": "...", "dm_note": "..." }
  ]
}
```

`decision` = what the actor does, driven by its stats (high ability shines, dumped ability
causes the turn). `scene` = the visual to render. `caption` = the on-screen line. `dm_note`
= the hidden stat-logic, the text behind the media. That is the same shape `/api/dm` returns,
so the static site can consume a playthrough without a model call.
