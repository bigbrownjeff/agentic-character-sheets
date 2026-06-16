# intake-questions.md — the guided form

This is the question script for `adventure-forge`. It is written so it can be **read aloud one
at a time** (voice-friendly) and so a web team can render it directly: each question is one
screen with a `prompt` (what the user sees/hears), a `why` (what schema field it feeds — not
shown to the user), and `steer` (the pro-social lean to apply when interpreting the answer).
Ask in order, skip what's already answered, never ask more than one at a time.

---

## Step 0 — Welcome & branch

> **prompt:** "Let's make something for your saga. Want to create a single **character**, a
> single **beat** (one illustrated scene with a lesson), or a whole **adventure** (a party and
> their quest)?"
> **why:** routes to a track below.
> **steer:** none. Set a warm, playful tone.

> **prompt:** "Is this about **real people** — you, your friends, your family, your team — or
> a **made-up** cast?"
> **why:** if real people, load the "real people" guardrail block in `steering-and-guardrails.md`
> before continuing, and keep output private (see SKILL.md).
> **steer:** if real people, signal this is a celebration of them.

---

## Track A — Character

> **A1. prompt:** "Who is this? Give me a name, and who they're based on if anyone."
> **why:** `name`, `represents`. If a real product/agent: `source_url`, `source_kind`, `verified`.
> **steer:** —

> **A2. prompt:** "In one line — what are they genuinely *great* at? The thing people come to
> them for?"
> **why:** the headline high ability (17–20) per STATTING.md; informs `class`/`title`.
> **steer:** name a real strength generously; everyone gets a gift.

> **A3. prompt:** "And the thing they *overdo* — the lovable flaw, the move they can't help
> making?"
> **why:** the dumped stat (6–9) and, for a monster, the `dumped_save`.
> **steer:** **externalize it.** Treat the flaw as a *tendency that visits them* ("the
> Overthinking", "the Big Swing"), not a verdict on who they are. Keep it affectionate and
> recognizable. If the answer is contemptuous or cruel, see `steering-and-guardrails.md`.

> **A4. prompt:** "How do they show up *for other people* — at their best?"
> **why:** `alignment` (lean Good/collaborative unless they insist otherwise), proficient `saves`,
> party fit.
> **steer:** surface the cooperative, others-regarding side. This is where empathy/respect enter.

> **A5. prompt:** "Tell me about a time they *grew* — changed their mind, learned something, did
> the harder right thing."
> **why:** the **Adventure Log** (mandatory ≥1 row: `v`, `change`, `why`). This is the
> re-authoring beat.
> **steer:** this is the most important question. A "unique outcome" — a moment the flaw did
> *not* win — becomes the log and seeds their arc. If they can't think of one, offer a small,
> plausible one and let them edit.

> **A6. prompt:** "Last one — their vibe in a single quote. What would they say?"
> **why:** `tagline`.
> **steer:** keep it true-to-them and kind; arch is fine, cruel is not.

*(You infer the rest — abilities spread, AC, HP, initiative, temperature, level/CR, lineage,
skills, feature — from these answers using STATTING.md. Don't ask a non-expert for them.)*

---

## Track B — Beat (a saga chapter)

Use the **BEATS.md six-point checklist**. Ask for the human version; you translate.

> **B1. prompt:** "What's the situation? Set the scene — where are we and what's going on?"
> **why:** `adventure`/region + the establishing card. **event:** the real situation it mirrors.
> **steer:** —

> **B2. prompt:** "Who's the one doing the wild, all-in thing — and who's the calm one who has
> to deal with it?"
> **why:** the Absurdity Engine — chaos vs. straight-man; `cards` choreography.
> **steer:** the chaos is *committed and doomed*, never cruel; the straight-man is *kind and
> unbothered*, never contemptuous.

> **B3. prompt:** "When the dust settles, what's the little truth we're left with — the lesson?"
> **why:** `moral`. Must be durable and positive (see BEATS.md §4).
> **steer:** steer toward a pro-social, pre-modern-durable moral (courage, honesty, restraint,
> care, interdependence). Never a cynical "take".

> **B4. prompt:** "What real thing — in tech, or just in everyday life — does this poke fun at?"
> **why:** `event`; keeps it current and grounded.
> **steer:** punch at systems and behaviors, not at vulnerable people.

> **B5. prompt:** "Which old story-shape is this? A trickster who gets caught? A hero who faces
> their own shadow? A team that wins together?" *(offer 2–3, let them pick)*
> **why:** `archetype` (Trickster, Shadow, Mentor, Threshold Guardian, Fellowship, Herald).
> **steer:** —

*(You then write 5–9 `cards` (caption + scene), opening and closing on the same image (ring
composition), and pick a Trend graphic style.)*

---

## Track C — Adventure (a region + party + one beat)

> **C1. prompt:** "What's the world or arena? What do people *do* here?" **why:** `name`,
> `use_category`, the cover scene.
> **C2. prompt:** "What's the shared challenge — the quest everyone's facing together?"
> **why:** `quest`. **steer:** frame as a *collective* challenge solved together.
> **C3. prompt:** "Who's on the team? Give me 2–5 people and one strength each." **why:** the
> `party`. **steer:** **the chorus** — make sure each person's weak spot is another's strength,
> so the team only works *together*. Run each through Track A briefly.
> **C4. prompt:** "What's the problem you're all up against — give it a name, like a monster."
> **why:** the `bestiary` (externalized problem). **steer:** the monster is the *problem*, never
> a real person. Reuse an existing monster if it fits (monsters recur).
> **C5.** Then build **one beat** for this adventure via Track B.

---

## Closing (every track)

> **prompt:** "Here's what I've got: *<plain-English draft>*. Want to tweak anything before I
> finalize it?"
> **why:** confirmation before writing JSON.
> **steer:** end on the character's/party's **strengths and growth**, not their deficits — the
> last word is who they're becoming. Then offer to share/celebrate the finished card (the
> "outsider-witness" moment).
