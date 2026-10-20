# Implementation plan

**Goal:** build md2video as designed in [SPEC](SPEC.md), task by task, each task ending in a passing check from [CHECKLIST](CHECKLIST.md).

**Execution:** native, in one session, no subagents. The sandbox has Node 22 and FFmpeg but no Chromium, so tasks marked **[you run]** end with an exact command for your machine and wait for the pasted output. Nothing is called done without fresh output (verification-before-completion).

**Rules for every task:** one failing test first, then the least code that passes it (red before green). Tests only at the confirmed seams below. Versions are pinned from `npm view` at install time. File set changes update [FILES](FILES.md) in the same step.

## Decisions

D1 to D5 approved 2026-10-07 and applied to [SPEC](SPEC.md). D6 is done at Task 7.

| # | Decision | Why |
|---|---|---|
| D1 | Frontmatter uses `remark-frontmatter` + `yaml`, not `gray-matter` | `yaml` is current and maintained, caps alias expansion (S3) and has no JavaScript engine (S2). `gray-matter` bundles an old YAML library and a JS engine that must be disabled |
| D2 | Signature becomes `parse(markdown, ctx: { file: string; root: string }): Deck` | Error messages need the file name (P5) and assets need a root to be contained in (S6) |
| D3 | Shiki tokens are computed in `render`, not `parse`. `parse` only checks that `lang` is known | Shiki starts asynchronously, and `check` must stay under 200 ms (O1) |
| D4 | Add a fourth seam: `narrate` with a counting fake `VoiceAdapter` | Cache behavior (N2 to N4) needs a call counter, and the real engine cannot run in the sandbox. Two adapters (Piper, fake) make it a real seam |
| D5 | Transition length is 0.5 s, `round(0.5 x fps)` frames, `none` is 0 | SPEC leaves it open. Needed for T2 |
| D6 | Voice SHA-256 values are produced by you | The sandbox cannot download voice models. Task 7 gives the commands |

## Seams (confirm before tests)

1. `parse`: markdown in, `Deck` or `ScriptError` out.
2. `timeline`: `NarratedDeck` in, frames out. Pure.
3. `narrate`: `Deck` plus a `VoiceAdapter` in, `NarratedDeck` out (D4).
4. End to end: `minimal.md` and `demo.md` in, MP4 out, checked with `ffprobe`.

## Shared types (`src/types.ts`)

```ts
type Meta = { title: string; voice: string; theme: 'midnight'|'daylight'|'high-contrast'; fps: 24|30|60; size: '1080p'|'720p'|'square'|'vertical'; music?: string; pad: number }
type Scene = { index: number; line: number; title: string; narration: string; hold?: number; entrance: string; emphasis: string; transition: string; bg: string; blocks: Block[] }
type Block = { kind: 'chart'|'code'|'list'|'image'|'flow'|'path'; line: number; attrs: Record<string,string|number>; body: string }
type Deck = { meta: Meta; scenes: Scene[] }
type VoiceAdapter = { id: string; synthesize(text: string): Promise<Uint8Array> }
type NarratedScene = Scene & { audioPath: string; seconds: number }
type NarratedDeck = { meta: Meta; scenes: NarratedScene[] }
type Timeline = { fps: number; totalFrames: number; scenes: { index: number; from: number; frames: number; transitionIn: number }[] }
class ScriptError extends Error { file: string; line: number }
```

## Global constraints

Node 22 (`.nvmrc`). TypeScript strict. No inline `style` props, no raw hex in components, colors only from `styles/` tokens. Every module reached only through its `index.ts`. Limits in `config/limits.json` (S19). No shell: child processes use argument arrays (S13).

## Review focus

Inputs the spec implies but no checklist item pins. Each gets a test in the task that owns it.

1. Windows line endings and a byte-order mark in the script (Task 1).
2. Backslash paths and drive letters in `src=` (Task 4).
3. A file with only frontmatter, or an empty file (Task 1).
4. Two scenes with identical titles and narration share one audio file without breaking timing (Task 6).
5. A scene shorter than its incoming transition (Task 7, T4).

## Tasks

### Task 0: Scaffold
**Files:** create `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `scripts/check-files.ts`, `tests/unit/check-files.test.ts`, `config/limits.json`. Modify `docs/FILES.md`. `knip.json` moves to Task 8: knip passes on its defaults until Remotion adds an entry point it cannot see.
**Produces:** `npm run check` = `tsc --noEmit`, `eslint .`, `knip`, `vitest run`, `check:files`, `npm audit`.
- [ ] Write `scripts/check-files.ts` test case: a path listed as `exists` but missing fails. Run, see fail.
- [ ] Implement it. Run `npm run check`. Expected: exit 0 on the empty project.

### Task 1: Parse scenes and frontmatter (P1, P2, P5, P6, P7)
**Files:** `src/types.ts`, `src/parse/{index,frontmatter,schema}.ts`, `tests/unit/parse.test.ts`.
**Consumes:** Task 0. **Produces:** `parse(markdown, ctx): Deck` for scenes, narration, `hold`, frontmatter defaults.
- [ ] Test `parse_minimal_script_gives_two_scenes`: literal expected `Deck` for a 2-scene script.
- [ ] Tests: unknown frontmatter key, `#` heading, silent scene without `hold`, each asserting `ScriptError.line`.
- [ ] Tests (review focus 1, 3): CRLF input equals LF input. Empty file and frontmatter-only file give clear errors.
- [ ] Implement with `unified` + `remark-parse` + `remark-frontmatter` + `yaml`. Defaults come from `schema.ts`.

### Task 2: Heading attributes (P3, P4)
**Files:** modify `schema.ts`, `parse/index.ts`; create `parse/heading.ts`, tests.
**Produces:** `schema.ts` exports the one list of animation names per place (USAGE 4.4). Tests are generated from it.
- [ ] Generated test: every valid value accepted, every invalid value rejected.
- [ ] Test: wrong-place name error lists the valid names for that place.
- [ ] Implement: one small function parses the trailing `{key=value}` group of the heading text. `remark-directive` is used only for `:::` blocks (Task 3).

### Task 3: Blocks (P3, P4, S4, S5)
**Files:** modify `parse/blocks.ts`, `schema.ts`; tests.
- [ ] One failing test per block type with a valid and an invalid attribute set (`chart`, `code`, `list`, `image`, `flow`, `path`).
- [ ] CSV: only numbers and short labels. 200-row cap. `ring` takes one row, 0 to 100.
- [ ] `code`: `lang` must be in shiki's `bundledLanguages`. `diff` lines need `+` or `-`.
- [ ] Implement. Bodies stay data and are never evaluated.

### Task 4: Assets and hostile input (S1, S3, S6 to S10, S19, P8)
**Files:** `parse/assets.ts`, `config/limits.json`, `tests/unit/parse-security.test.ts`, `tests/fixtures/hostile/*`.
**Produces:** `resolveAsset(root, rel): string` throwing `ScriptError`.
- [ ] One test per fixture: raw HTML, `---js`, alias bomb, `../`, encoded `..%2f`, absolute path, symlink out, `http:`/`file:`/`data:`, wrong-extension image, oversized dimensions, SVG with script.
- [ ] Test (review focus 2): `assets\\a.png` and `C:\\x.png` are handled the same on every OS.
- [ ] Implement with `fs.realpath` containment and `image-size` headers. Run `npm test -- parse` and `parse-security`. Expected: all pass.

### Task 5: Timeline (T1 to T6)
**Files:** `src/timeline/index.ts`, `tests/unit/timeline.test.ts`.
**Produces:** `timeline(deck: NarratedDeck, fps: number): Timeline`.
- [ ] Hand-computed literals: 2.0 s + 0.6 pad at 30 fps = 78 frames. Two such scenes with a 15-frame transition = 141 total.
- [ ] Tests: `hold` longer than narration, first scene no incoming transition, scene shorter than transition (review focus 5), 200 scenes under 50 ms, same input twice gives identical JSON.
- [ ] Implement as a pure function.

### Task 6: Narrate (N1 to N4, S12, S13 for the fake path)
**Files:** `src/narrate/{index,cache}.ts`, `tests/unit/narrate.test.ts`.
**Produces:** `narrate(deck, voice: VoiceAdapter, opts: { cacheDir: string }): Promise<NarratedDeck>`, plus a `summary` of hits and misses.
- [ ] Counting fake adapter. Tests: second run makes 0 calls, editing one scene makes 1, changing `voice.id` makes all.
- [ ] Test: corrupted cache entry is detected and re-made. Cache folder is owner-only.
- [ ] Test (review focus 4): duplicate scenes share one wav.
- [ ] Implement. Duration comes from `ffprobe` via `execFile`, stored in `probe/`.

### Task 7: Piper adapter and voices (N5, N6, S13, S15, S16)
**Files:** `src/narrate/{piper,voices}.ts`, `config/voices.json`, `tests/unit/voices.test.ts`.
- [ ] Tests: checksum mismatch deletes the file and fails closed. A stub that sleeps hits the timeout. Hostile narration is passed on stdin, never as arguments.
- [ ] Implement `piper` as a child process with an argument array and timeout.
- [ ] **[you run]** download the two voice files from the pinned tag with `curl -L -O`, hash both with `shasum -a 256` (Windows: `Get-FileHash -Algorithm SHA256`), paste the hashes and byte sizes. Exact commands are given when this task starts. Install cannot be used first: it fails closed without a hash.

### Task 8: Render core and one scene end to end (R1, R2, R8)
**Files:** `src/render/index.ts`, `src/render/Root.tsx`, `src/render/Scene.tsx`, `src/scenes/motion.ts`, `styles/scene.css`, `tests/fixtures/minimal.md`, `tests/e2e/{smoke.spec.ts,helpers.ts}`, `playwright.config.ts`, `remotion.config.ts`, `knip.json`.
**Produces:** `render(timeline, narrated, out, options)`. Title, narration audio, `fade` transition, `midnight` theme.
- [ ] Failing e2e: `minimal.md` gives one video and one audio stream, duration within one frame of the timeline.
- [ ] Implement. Fonts from `@fontsource`. Servers bind to localhost (S18). Chromium sandbox on (S17).
- [ ] **[you run]** `npm run e2e`. Paste the output.

### Tasks 9 to 15: Animation groups
One task per group, same shape. Each adds its components, adds its names to `tests/fixtures/demo.md`, and checks R4, R5, R6, X5, X7.

| Task | Group | Components |
|---|---|---|
| 9 | Title entrance and emphasis | 6 entrances, 3 emphasis |
| 10 | Transitions | 7 presets in `transitions.ts` |
| 11 | Backgrounds | 4, including `waveform` (A7) |
| 12 | Charts | 5 (X4: labels always drawn) |
| 13 | Code | 3 (shiki tokens computed here, D3) |
| 14 | Lists and images | 2 and 4 |
| 15 | Diagrams | 2 |

- [ ] Per task, failing test: the group's components render frames 0, middle and last without error, final frame equals the frame before the scene ends, same frame twice gives the same hash, reduced-motion gives the final state.
- [ ] Implement. **[you run]** `npm run e2e`.
- [ ] After Task 15, `scripts/check-coverage.ts` fails if a name in `schema.ts` is missing from `demo.md` (R3).

### Task 16: Audio mix (A1 to A6)
**Files:** `src/render/mix.ts`, tests.
- [ ] Failing test on loudness, peak, onset within one frame, ducking, loop and trim with fade, no-music build.
- [ ] Implement with FFmpeg `sidechaincompress` and `loudnorm`. Only numbers built by the tool enter the filter string (S14).

### Task 17: CLI (C1 to C5, N5, S11, S15)
**Files:** `src/cli.ts`, `tests/unit/cli.test.ts`.
- [ ] Failing test per command and exit code 0, 1, 2, 3. Existing output without `--force` fails. Build summary shows scenes, length, cache hits, render time, output size, cache size.
- [ ] Implement with Node's `util.parseArgs`.

### Task 18: Docs, benchmarks, release gate (C6, C7, D1 to D4, PERF, PERF2, L1 to L3)
- [ ] Extract the USAGE 9 example in CI and run it. Reproduce each USAGE 8 troubleshooting row.
- [ ] **[you run]** the benchmark procedure in OPTIMIZATIONS 1. Record results in section 6.
- [ ] One batched visual review of keyframes for every scene type (R11). Fix everything found in one batch, confirm once more.
- [ ] Update [PROGRESS](PROGRESS.md) with evidence for each ticked item.