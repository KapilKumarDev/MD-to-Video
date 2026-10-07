# Files

A **living inventory** of every file in the repository. It is updated in the same change as the file it describes, so it always shows what exists, what is only planned, what changed, and what was removed.

## Rules

1. Creating, renaming, changing the job of, or deleting a file updates this document in the same change.
2. A file that is not listed here does not belong in the repo. A listed file that is missing must be `planned` or `removed`.
3. Status values: `planned` (designed, not created), `exists` (created and in use), `removed` (deleted, kept in the Removed table).
4. "Last change" holds the date of the most recent edit that changed behavior or meaning, not formatting.
5. "Verified by" points to [CHECKLIST](CHECKLIST.md) and [SECURITY](SECURITY.md) item IDs, so every file is tied to a check.
6. `npm run check:files` runs `scripts/check-files.ts` and fails when the tree and this inventory disagree on paths or statuses.
7. Adding a file is a design change: update [SPEC](SPEC.md) if it adds a module or an animation.

## Inventory

### Root

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `README.md` | root | Entry point and doc index | exists | 2026-10-07 | D1-D4 |
| `package.json` | root | Dependencies (pinned) and scripts | exists | 2026-10-07 | H1-H8 |
| `package-lock.json` | root | Exact dependency tree | exists | 2026-10-07 | H1-H8 |
| `.nvmrc` | root | Node version | exists | 2026-10-07 | H1-H8 |
| `.gitignore` | root | Excludes `node_modules`, `out`, `.md2video-cache`, test output | exists | 2026-10-07 | H1-H8 |
| `tsconfig.json` | root | TypeScript settings, strict mode, covers `src`, `scripts` and `tests` | exists | 2026-10-07 | H1-H8 |
| `eslint.config.js` | root | Lint rules, including a ban on inline `style` props | exists | 2026-10-07 | H1-H8 |
| `knip.json` | root | Dead code and unused dependency detection | planned | - | H1-H8 |
| `vitest.config.ts` | root | Unit test settings | exists | 2026-10-07 | H1-H8 |
| `playwright.config.ts` | root | E2E settings | planned | - | H1-H8 |
| `remotion.config.ts` | root | Render defaults (codec, quality, concurrency) | planned | - | H1-H8 |

### docs/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `docs/SPEC.md` | docs | Design and decisions | exists | 2026-10-07 | D1-D4 |
| `docs/USAGE.md` | docs | User guide and the markdown format | exists | 2026-10-07 | D1-D4 |
| `docs/PLAN.md` | docs | Implementation plan: decisions, seams, tasks | exists | 2026-10-07 | D1-D4 |
| `docs/PROGRESS.md` | docs | Stage tracker and log | exists | 2026-10-07 | D1-D4 |
| `docs/CHECKLIST.md` | docs | Acceptance criteria | exists | 2026-10-07 | D1-D4 |
| `docs/OPTIMIZATIONS.md` | docs | Performance budgets and techniques | exists | 2026-10-07 | D1-D4 |
| `docs/SECURITY.md` | docs | Threat model and controls | exists | 2026-10-07 | D1-D4 |
| `docs/FILES.md` | docs | This map | exists | 2026-10-07 | D1-D4 |

### config/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `config/voices.json` | config | Allowed voices: id, download URL, SHA-256 | planned | - | S16, S19 |
| `config/limits.json` | config | Resource limits used by the parser and CLI | exists | 2026-10-07 | S16, S19 |

### src/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `src/types.ts` | shared | `Deck`, `Scene`, `Block`, `NarratedDeck`, `Timeline`, `ScriptError` | exists | 2026-10-07 | C1-C7 |
| `src/cli.ts` | shared | Command parsing, exit codes, build summary | planned | - | C1-C7 |
| `src/parse/index.ts` | parse | `parse(markdown, ctx): Deck` | exists | 2026-10-07 | P1-P8, S1-S10 |
| `src/parse/frontmatter.ts` | parse | YAML-only frontmatter loading and validation | exists | 2026-10-07 | P1-P8, S1-S10 |
| `src/parse/blocks.ts` | parse | Directive extraction and per-block validation | planned | - | P1-P8, S1-S10 |
| `src/parse/schema.ts` | parse | Frontmatter rules and defaults, theme defaults, allowed attributes and animation names per element | exists | 2026-10-07 | P1-P8, S1-S10 |
| `src/parse/assets.ts` | parse | Asset path containment and file type checks | planned | - | P1-P8, S1-S10 |
| `src/narrate/index.ts` | narrate | `narrate(deck, voice)` | planned | - | N1-N6, S12-S16 |
| `src/narrate/piper.ts` | narrate | Piper voice adapter (separate process, array arguments) | planned | - | N1-N6, S12-S16 |
| `src/narrate/cache.ts` | narrate | Content-hash audio cache and duration probe | planned | - | N1-N6, S12-S16 |
| `src/narrate/voices.ts` | narrate | Voice install and checksum verification | planned | - | N1-N6, S12-S16 |
| `src/timeline/index.ts` | timeline | `timeline(deck, fps): Timeline` | planned | - | T1-T6 |
| `src/render/index.ts` | render | `render(timeline, out, options)` | planned | - | R1-R2, A1-A7 |
| `src/render/Root.tsx` | render | Remotion root and composition registration | planned | - | R1-R2, A1-A7 |
| `src/render/Scene.tsx` | render | Scene layout, block ordering, transition wiring | planned | - | R1-R2, A1-A7 |
| `src/render/mix.ts` | render | Music ducking and loudness normalization settings | planned | - | R1-R2, A1-A7 |

### src/scenes/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `src/scenes/title/Typewriter.tsx` | scenes | Component for: typewriter | planned | - | R3-R7, X5, X7 |
| `src/scenes/title/WordFade.tsx` | scenes | Component for: word-fade | planned | - | R3-R7, X5, X7 |
| `src/scenes/title/Kinetic.tsx` | scenes | Component for: kinetic | planned | - | R3-R7, X5, X7 |
| `src/scenes/title/LetterDrop.tsx` | scenes | Component for: letter-drop | planned | - | R3-R7, X5, X7 |
| `src/scenes/title/ScalePop.tsx` | scenes | Component for: scale-pop | planned | - | R3-R7, X5, X7 |
| `src/scenes/title/SlideUp.tsx` | scenes | Component for: slide-up | planned | - | R3-R7, X5, X7 |
| `src/scenes/emphasis/HighlightSweep.tsx` | scenes | Component for: highlight-sweep | planned | - | R3-R7, X5, X7 |
| `src/scenes/emphasis/Wave.tsx` | scenes | Component for: wave | planned | - | R3-R7, X5, X7 |
| `src/scenes/emphasis/Glitch.tsx` | scenes | Component for: glitch | planned | - | R3-R7, X5, X7 |
| `src/scenes/background/GradientDrift.tsx` | scenes | Component for: gradient-drift | planned | - | R3-R7, X5, X7 |
| `src/scenes/background/Particles.tsx` | scenes | Component for: particles | planned | - | R3-R7, X5, X7 |
| `src/scenes/background/GridPulse.tsx` | scenes | Component for: grid-pulse | planned | - | R3-R7, X5, X7 |
| `src/scenes/background/Waveform.tsx` | scenes | Component for: waveform | planned | - | R3-R7, X5, X7 |
| `src/scenes/chart/Bars.tsx` | scenes | Component for: grow-bars | planned | - | R3-R7, X5, X7 |
| `src/scenes/chart/Line.tsx` | scenes | Component for: line-draw | planned | - | R3-R7, X5, X7 |
| `src/scenes/chart/Pie.tsx` | scenes | Component for: pie-sweep | planned | - | R3-R7, X5, X7 |
| `src/scenes/chart/Ring.tsx` | scenes | Component for: progress-ring | planned | - | R3-R7, X5, X7 |
| `src/scenes/chart/Counter.tsx` | scenes | Component for: counter-tick | planned | - | R3-R7, X5, X7 |
| `src/scenes/code/LineByLine.tsx` | scenes | Component for: line-by-line | planned | - | R3-R7, X5, X7 |
| `src/scenes/code/Diff.tsx` | scenes | Component for: diff | planned | - | R3-R7, X5, X7 |
| `src/scenes/code/Typing.tsx` | scenes | Component for: typing | planned | - | R3-R7, X5, X7 |
| `src/scenes/list/Stagger.tsx` | scenes | Component for: stagger | planned | - | R3-R7, X5, X7 |
| `src/scenes/list/CardStack.tsx` | scenes | Component for: card-stack | planned | - | R3-R7, X5, X7 |
| `src/scenes/image/Parallax.tsx` | scenes | Component for: parallax | planned | - | R3-R7, X5, X7 |
| `src/scenes/image/ZoomFocus.tsx` | scenes | Component for: zoom-focus | planned | - | R3-R7, X5, X7 |
| `src/scenes/image/Flip.tsx` | scenes | Component for: flip, scale-pop (shared image motion) | planned | - | R3-R7, X5, X7 |
| `src/scenes/diagram/Flow.tsx` | scenes | Component for: node-by-node | planned | - | R3-R7, X5, X7 |
| `src/scenes/diagram/PathDraw.tsx` | scenes | Component for: path-draw | planned | - | R3-R7, X5, X7 |
| `src/scenes/transitions.ts` | scenes | Component for: The seven transition presets | planned | - | R3-R7, X5, X7 |
| `src/scenes/motion.ts` | scenes | Component for: Shared spring and easing presets, reduced-motion switch | planned | - | R3-R7, X5, X7 |

### styles/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `styles/tokens.css` | styles | Shared sizes, spacing scale, type scale | exists | 2026-10-07 | X1, X2, X6 |
| `styles/scene.css` | styles | Layout classes used by scene components | planned | - | X1, X2, X6 |
| `styles/themes/midnight.css` | styles | Theme colors | exists | 2026-10-07 | X1, X2, X6 |
| `styles/themes/daylight.css` | styles | Theme colors | exists | 2026-10-07 | X1, X2, X6 |
| `styles/themes/high-contrast.css` | styles | Theme colors | exists | 2026-10-07 | X1, X2, X6 |

### tests/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `tests/unit/parse.test.ts` | tests | Parse seam: valid decks and every error case | exists | 2026-10-07 | H1, R3 |
| `tests/unit/parse-security.test.ts` | tests | Hostile inputs: raw HTML, `---js` frontmatter, `../` paths, remote URLs, oversized input | planned | - | H1, R3 |
| `tests/unit/timeline.test.ts` | tests | Timeline seam: frame counts and transition overlap | planned | - | H1, R3 |
| `tests/unit/voices.test.ts` | tests | Checksum verification fails closed | planned | - | H1, R3 |
| `tests/unit/narrate.test.ts` | tests | Narrate seam with a counting fake adapter: cache hits, one-scene edits, corruption | planned | - | N2-N4, S12 |
| `tests/unit/cli.test.ts` | tests | Commands, exit codes, overwrite protection, build summary | planned | - | C1-C5 |
| `tests/unit/check-files.test.ts` | tests | Inventory check: missing, unlisted, planned-but-present, listed directories, CRLF | exists | 2026-10-07 | D1 |
| `tests/e2e/smoke.spec.ts` | tests | Reusable Playwright script: preview loads, one render, stream and duration checks | planned | - | H1, R3 |
| `tests/e2e/helpers.ts` | tests | Shared e2e helpers (`ffprobe` wrapper, render runner) | planned | - | H1, R3 |
| `tests/fixtures/demo.md` | tests | Demo using every animation in the catalog | planned | - | H1, R3 |
| `tests/fixtures/minimal.md` | tests | Smallest valid script, used for fast renders | planned | - | H1, R3 |
| `tests/fixtures/hostile/` | tests | One file per hostile input used by the security tests | planned | - | H1, R3 |

### scripts/

| Path | Module | Job | Status | Last change | Verified by |
|---|---|---|---|---|---|
| `scripts/check-coverage.ts` | scripts | Fails when an animation name in `schema.ts` is missing from `demo.md` | planned | - | R3 |
| `scripts/check-files.ts` | scripts | Compares the repository tree with this inventory and fails on any mismatch in paths or statuses | exists | 2026-10-07 | D1 |

## Change log

Newest first. One line per change to the repository's file set.

| Date | Change | Files |
|---|---|---|
| 2026-10-07 | Task 1 parse: scenes, narration and frontmatter with line-numbered errors, and the parse seam tests. Added the five parser dependencies (exact pins) and `src` to the TypeScript project | `src/types.ts`, `src/parse/index.ts`, `src/parse/frontmatter.ts`, `src/parse/schema.ts`, `tests/unit/parse.test.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `docs/USAGE.md`, `docs/FILES.md`, `docs/PROGRESS.md` |
| 2026-10-07 | Task 0 scaffold: tooling pinned, `npm run check` chain, inventory check with its test, resource limits. `knip.json` deferred to Task 8 (knip passes on defaults). Moved the three theme files into `styles/themes/` to match SPEC | `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `scripts/check-files.ts`, `tests/unit/check-files.test.ts`, `config/limits.json` |
| 2026-10-07 | Wrote the implementation plan and listed the extra test and script files it needs | `docs/PLAN.md`, `tests/unit/narrate.test.ts` (planned), `tests/unit/cli.test.ts` (planned), `scripts/check-coverage.ts` (planned), `docs/FILES.md`, `docs/PROGRESS.md`, `README.md` |
| 2026-10-07 | Design stage: froze tokens and three themes. Added theme defaults to USAGE and design decisions to SPEC | `styles/tokens.css`, `styles/themes/midnight.css`, `styles/themes/daylight.css`, `styles/themes/high-contrast.css`, `docs/USAGE.md`, `docs/SPEC.md`, `docs/PROGRESS.md`, `docs/FILES.md` |
| 2026-10-07 | Turned this document into a living inventory with status, history and a sync check | `docs/FILES.md`, `scripts/check-files.ts` (planned) |
| 2026-10-07 | Expanded checklist, security and optimizations. USAGE became the single definition of the markdown format | `docs/CHECKLIST.md`, `docs/SECURITY.md`, `docs/OPTIMIZATIONS.md`, `docs/USAGE.md`, `docs/SPEC.md`, `docs/PROGRESS.md`, `README.md` |
| 2026-10-07 | Created the doc set | all files under `docs/`, `README.md` |

## Removed

Each removal records the full path, why it was removed, what replaced it, and the exact instruction for your working copy.

| Path | Date | Reason | Replaced by | Instruction |
|---|---|---|---|---|
| none yet | | | | |