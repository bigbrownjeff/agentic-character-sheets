# The Forge of Endless Diffs — Agent Research Dossier

Adventure: coding / software-engineering agents.
Schema ref: `../SCHEMA.md`
Researched: 2026-06-15

---

### Ponytail · represents DietrichGebert/ponytail
- real_source: https://github.com/DietrichGebert/ponytail
- source_kind: github
- verified: yes
- signal: 13.6k★ GitHub; v4.6.0 shipped 2026-06-15; claims 80–94% code reduction vs baseline agents
- virality: idiomatic
- origin: Solo-authored Claude Code plugin; instructs any coding agent to write nothing unless YAGNI allows it; supports 8 hosts (Claude Code, Cursor, Cline, Copilot, Codex, Kiro, Windsurf, Pi)
- stat_emphasis: high WIS, dump CHA — judges before writing, never explains itself
- role: party
- tagline: "The best code is the code you never wrote."

---

### Devin the Autonomous · represents Devin (Cognition AI)
- real_source: https://cognition.ai/blog/introducing-devin
- source_kind: blog
- verified: yes
- signal: launched March 2024 viral; $26B post-money valuation May 2026; $1B+ latest raise; $73M ARR by June 2025
- virality: viral
- origin: Cognition AI (fka Cognition Labs); billed as "world's first fully autonomous AI software engineer"; ships with integrated shell, browser, and editor; debuted at SOTA on SWE-bench
- stat_emphasis: high STR, dump WIS — maximal throughput, notoriously over-promises
- role: npc
- tagline: "Plan. Clone. Build. Deploy. Repeat. (Results may vary.)"

---

### Aider Paulgauthier · represents Aider (Aider-AI/aider)
- real_source: https://github.com/Aider-AI/aider
- source_kind: github
- verified: yes
- signal: 41.6k★ GitHub; 5.3M+ PyPI installs; ships biweekly; started 2023 by Paul Gauthier
- virality: viral
- origin: Open-source terminal pair-programmer; user adds files, describes changes, Aider edits code and auto-commits to Git with descriptive messages; model-agnostic; consistently high on SWE-bench leaderboard
- stat_emphasis: high DEX, dump CHA — surgical git-native edits, zero UI polish
- role: party
- tagline: "Describe it. It diffs it. Git never lies."

---

### Cursor the Composer · represents Cursor (Anysphere)
- real_source: https://cursor.com
- source_kind: product
- verified: yes
- signal: $3B ARR May 2026; $60B valuation talks (Jun 2026); 2.3B Series D at $29.3B (Nov 2025)
- virality: viral
- origin: Anysphere IDE fork of VS Code; multi-agent Composer architecture; proprietary frontier model; the dominant paid AI code editor by revenue; fastest SaaS to $1B ARR in history at the time
- stat_emphasis: high CHA, dump CON — stunning autocomplete UX, context-rot on long tasks
- role: npc
- tagline: "The composer conducts. You conduct the composer."

---

### Claude of the Codebase · represents Claude Code (Anthropic)
- real_source: https://github.com/anthropics/claude-code
- source_kind: github
- verified: yes
- signal: 131k★ GitHub; GA May 2025; 1M-token context window; deep git + filesystem integration
- virality: viral
- origin: Anthropic's official agentic CLI; terminal-native; reads the whole repo, edits files, runs tests, commits; supports parallel sub-agents and MCP tool servers; CLAUDE.md system for per-project instructions
- stat_emphasis: high INT, dump STR — deep reasoning + restraint, one line beats 2k-line PRs
- role: party
- tagline: "Understands your codebase. Respects your CLAUDE.md."

---

### Cline the Unblocked · represents Cline (cline/cline, formerly Claude Dev)
- real_source: https://github.com/cline/cline
- source_kind: github
- verified: yes
- signal: 61.6k★ GitHub; 5M+ installs; supports 30+ LLM providers; used by Samsung, Salesforce, Amazon
- virality: viral
- origin: Open-source VS Code sidebar agent (Apache 2.0); formerly Claude Dev; reads codebase, edits files, runs terminal commands, drives real browser via Puppeteer; human-in-the-loop approval at each step; expanded to JetBrains, Cursor, Windsurf, Zed, Neovim, and preview CLI
- stat_emphasis: high DEX, dump CON — precise multi-tool execution, context budget sensitive
- role: party
- tagline: "Open-source. Human-in-loop. Thirty providers. Pick your weapon."

---

### CodeRabbit the Reviewer · represents CodeRabbit
- real_source: https://coderabbit.ai
- source_kind: product
- verified: yes
- signal: $550M valuation Sep 2025 ($60M Series B); 2M+ connected repos; 13M+ PRs reviewed; top-installed AI app on GitHub Marketplace; revenue 10x in 2025
- virality: viral
- origin: AI code review bot (founded 2023); posts inline PR comments; integrates with GitHub and GitLab; 8k+ paying customers; 46% bug-detection accuracy in Macroscope benchmark (vs. Greptile 24%)
- stat_emphasis: high WIS, dump STR — catches what you shipped wrong, writes nothing itself
- role: monster
- tagline: "Every PR gets a thorough second opinion. Automated, inline, opinionated."

---

### Greptile the Cartographer · represents Greptile
- real_source: https://www.greptile.com
- source_kind: product
- verified: yes
- signal: $180M valuation Sep 2025 ($25M Series A, Benchmark); 9k+ teams; 2k+ customers; YC-backed
- virality: idiomatic
- origin: YC-backed (2023); indexes the entire codebase into a semantic code graph before reviewing any PR; catches cross-module bugs, convention violations, dependency breaks competitors miss; 82% catch rate in 2025 internal benchmarks
- stat_emphasis: high INT, dump DEX — whole-repo graph reasoning, slower than diff-only reviewers
- role: monster
- tagline: "Reads the whole repo. Catches what the diff hides."

---

### SWE-Agent the Benchmarker · represents SWE-agent (Princeton / Stanford)
- real_source: https://github.com/SWE-agent/SWE-agent
- source_kind: github
- verified: yes
- signal: 19.5k★ GitHub; NeurIPS 2024 paper; SWE-agent 1.0 + Claude 3.7 = prior SOTA on SWE-bench full + verified; mini-swe-agent: 74%+ on SWE-bench verified in 100 lines of Python
- virality: idiomatic
- origin: Research agent from Princeton + Stanford; takes a GitHub issue and autonomously patches it using the LM of your choice; defines the benchmark everyone else chases; not a product — a reproducible research artifact
- stat_emphasis: high INT, dump CHA — publication-grade rigor, no UX whatsoever
- role: npc
- tagline: "It reads the issue. It writes the patch. You write the paper."

---

### OpenHands the Collective · represents OpenHands (All Hands AI, formerly OpenDevin)
- real_source: https://github.com/All-Hands-AI/OpenHands
- source_kind: github
- verified: yes
- signal: 65k★ GitHub; 250+ contributors; 18 months to 64k stars; model-agnostic open-core platform
- virality: viral
- origin: Open-source platform (formerly OpenDevin) from All Hands AI; model-agnostic cloud coding agent that automates routine software engineering tasks; open-core with enterprise tier; the open-source answer to Devin
- stat_emphasis: high CON, dump CHA — long-horizon task stamina, community-built rough edges
- role: party
- tagline: "Code less. Make more. Open-source, end-to-end."

---

## Party Summary

| D&D Name | Real Agent | Verified | Virality | Role |
|---|---|---|---|---|
| Ponytail | DietrichGebert/ponytail | yes | idiomatic | party |
| Devin the Autonomous | Cognition AI / Devin | yes | viral | npc |
| Aider Paulgauthier | Aider-AI/aider | yes | viral | party |
| Cursor the Composer | Anysphere / Cursor | yes | viral | npc |
| Claude of the Codebase | Anthropic / Claude Code | yes | viral | party |
| Cline the Unblocked | cline/cline | yes | viral | party |
| CodeRabbit the Reviewer | CodeRabbit | yes | viral | monster |
| Greptile the Cartographer | Greptile | yes | idiomatic | monster |
| SWE-Agent the Benchmarker | SWE-agent (Princeton/Stanford) | yes | idiomatic | npc |
| OpenHands the Collective | All Hands AI / OpenHands | yes | viral | party |

10/10 verified. Added: SWE-agent (NeurIPS 2024, 19.5k★, the benchmark everyone chases) and OpenHands (65k★, open-source Devin alternative). These displace no candidates — they fill the "research agent" and "open-source autonomous platform" roles the original list lacked.
