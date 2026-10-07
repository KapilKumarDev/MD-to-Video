# Checklist

Acceptance criteria for "done". Tick an item only after its verify command ran in the current state and its output was read. Evidence goes in the last column of section 12 when a release is cut.

Item format: `ID` description, then **verify:** the exact check. IDs `S` and `O` are defined in [SECURITY](SECURITY.md) and [OPTIMIZATIONS](OPTIMIZATIONS.md) and are verified there, not repeated here.

## 1. Parse (seam 1)

- [ ] **P1** A valid script produces a `Deck` with the expected scenes, blocks and attributes. verify: `npm test -- parse`
- [ ] **P2** Every frontmatter key in [USAGE 4.1](USAGE.md) is accepted with valid values and rejected with invalid ones, including defaults when omitted. verify: parse tests, one per key
- [ ] **P3** Every heading attribute and every block attribute in [USAGE 4.2 to 4.3](USAGE.md) has a valid and an invalid test. verify: parse tests generated from `schema.ts`, so schema and tests cannot drift
- [ ] **P4** An animation name used in the wrong place fails and the message lists the valid names for that place (table 4.4). verify: one test per element type
- [ ] **P5** Every error includes file name and line number. verify: tests assert the line in the message
- [ ] **P6** A silent scene without `hold` fails. verify: parse test
- [ ] **P7** Unknown directive, unknown frontmatter key, `#` heading and missing `alt` each fail with a clear message. verify: parse tests
- [ ] **P8** Parse does not read or write anything outside the script file and its assets. verify: test with a read-only temp folder

## 2. Narration (seam 3 via e2e, plus fake adapter in timeline tests)

- [ ] **N1** A scene's audio file is created and its measured duration is stored. verify: e2e on `minimal.md`
- [ ] **N2** Rebuilding with no changes makes zero synthesis calls (O3). verify: e2e run twice, second run reports all cache hits
- [ ] **N3** Editing one scene synthesizes exactly one scene (O4). verify: e2e edits one paragraph, checks the summary
- [ ] **N4** Changing `voice` invalidates all audio. verify: e2e
- [ ] **N5** A missing voice exits with code 2 and names the install command. verify: CLI test
- [ ] **N6** Narration containing quotes, semicolons, backticks, `$(...)`, emoji, and non-Latin text is spoken or cleanly rejected, never executed (S13). verify: S13 fixture

## 3. Timeline (seam 2)

- [ ] **T1** Scene frames = round((narration seconds + pad) x fps), or `hold` if longer. verify: `npm test -- timeline` with literal expected values worked out by hand, not recomputed from the same formula
- [ ] **T2** Transition overlap shortens total length by exactly the overlap. verify: timeline tests with 1, 2 and 10 scenes
- [ ] **T3** First scene has no incoming transition. Last scene has no outgoing one. verify: timeline test
- [ ] **T4** A zero-length narration with `hold` works. A scene shorter than its transition is handled without negative frames. verify: edge-case tests
- [ ] **T5** The 60-minute total limit is enforced (S19). verify: S19 fixture
- [ ] **T6** Output is identical for identical input (deterministic). verify: run twice, compare JSON

## 4. Render and animation (e2e)

- [ ] **R1** `demo.md` renders to an MP4 with exactly one video stream and one audio stream. verify: `ffprobe` in `smoke.spec.ts`
- [ ] **R2** Output video duration matches `timeline` total within one frame. verify: `ffprobe` duration against the timeline value
- [ ] **R3** Every catalog animation appears in `demo.md`, and a coverage check fails if one is missing. verify: script comparing `schema.ts` names to names used in the fixture
- [ ] **R4** Each animation component renders without errors at frame 0, the middle frame and the last frame. verify: per-component render of three frames
- [ ] **R5** Each animation reaches its final state before its scene ends (nothing still moving at the cut). verify: compare the last two frames of each scene, they must match
- [ ] **R6** Frames are deterministic: rendering the same frame twice gives identical pixels (O28, O31). verify: render a frame twice and compare hashes
- [ ] **R7** At most one entrance and one emphasis run on a title at a time. verify: parse rule plus a render test
- [ ] **R8** All four sizes (`1080p`, `720p`, `square`, `vertical`) render without clipped or overflowing text. verify: render `minimal.md` at each size and inspect frames
- [ ] **R9** All three themes render `demo.md`. verify: e2e loop over themes
- [ ] **R10** Long titles, 6 list items, 200-row charts and 150-line code blocks do not overflow the frame. verify: stress fixture rendered and inspected
- [ ] **R11** Visual review: keyframes of every scene type were looked at and judged against the design plan in [SPEC](SPEC.md) (run once as a batched pass, fix everything found, confirm once more). verify: screenshot set reviewed

## 5. Audio mix

- [ ] **A1** Narration starts at its scene start within 1 frame (O9). verify: onset detection on the output audio against timeline start frames
- [ ] **A2** No clipping: true peak stays below the ceiling. verify: `ffmpeg` loudness analysis on the output
- [ ] **A3** Output loudness is within the target range for narration-only and narration-plus-music builds. verify: loudness analysis on both
- [ ] **A4** Music is audibly lower during narration and recovers between scenes. verify: level measurement during and between narration
- [ ] **A5** Music shorter than the video loops without a click. Longer music is trimmed with a fade. verify: listen and inspect waveform around the join and the end
- [ ] **A6** A build without `music` has no music track and no error. verify: e2e
- [ ] **A7** The `waveform` background responds to narration and is flat during silence. verify: frame comparison between a speech frame and a silent frame

## 6. CLI and user experience

- [ ] **C1** `check`, `preview`, `build`, `voices list`, `voices install` behave as in [USAGE 6](USAGE.md). verify: CLI tests
- [ ] **C2** Exit codes 0, 1, 2, 3 are returned for success, invalid script, environment problem, render failure. verify: one test each
- [ ] **C3** Existing output is not overwritten without `--force` (S11). verify: CLI test
- [ ] **C4** The build summary shows scenes, length, cache hits, render time, output size and cache size. verify: e2e output check
- [ ] **C5** `--draft` produces a playable video at the draft settings (O23). verify: e2e plus the O7 timing
- [ ] **C6** Every row of the troubleshooting table in USAGE 8 is reproducible and the fix works. verify: one test per row
- [ ] **C7** The complete example in USAGE 9 passes `check` and builds. verify: the example is extracted from the doc and run in CI, so doc and tool cannot drift

## 7. Accessibility and legibility

- [ ] **X1** Text and background contrast is at least 4.5:1 for body text and 3:1 for large text in all three themes. verify: computed from theme tokens in a test
- [ ] **X2** `high-contrast` meets 7:1 for body text. verify: same test
- [ ] **X3** `image` requires `alt`, and `alt` text is carried into output metadata or the scene description. verify: parse test
- [ ] **X4** Information is never carried by color alone in charts. verify: chart render shows labels and values
- [ ] **X5** Reduced-motion mode renders static final-state frames for every animation. verify: render each component with the flag on
- [ ] **X6** Minimum on-screen text size is met at `720p` and `vertical`. verify: token test for minimum sizes
- [ ] **X7** No flashing faster than 3 times per second (`glitch`, `particles`, `grid-pulse`). verify: frame-difference check on those components

## 8. Security

- [ ] **SEC** Every control S1 to S24 has a passing check as listed in [SECURITY](SECURITY.md). verify: `npm test -- parse-security voices` plus the check script plus the offline e2e run

## 9. Performance

- [ ] **PERF** Every budget O1 to O10 is measured and recorded in the table in [OPTIMIZATIONS 6](OPTIMIZATIONS.md). verify: the benchmark procedure in OPTIMIZATIONS 1
- [ ] **PERF2** The regression gate is wired into the check script. verify: a deliberately slowed component fails it

## 10. Code hygiene (your rules)

- [ ] **H1** No dead code and no unused files, exports or dependencies. verify: `knip` reports zero findings
- [ ] **H2** No redundancy: no duplicated logic or duplicated documentation. verify: duplicate-code scan, plus the rule that syntax is defined only in USAGE and animation names only in `schema.ts`
- [ ] **H3** No inline CSS. verify: ESLint rule on `style` props, plus a search for `style=` in components
- [ ] **H4** No outdated dependencies. verify: `npm outdated` is empty or each entry has a written reason
- [ ] **H5** No custom code where a maintained library does the job, unless a comment states why the custom code is better. verify: review against SPEC section 6
- [ ] **H6** No temporary fixes: each fix addresses the cause and adds a failing-first test. verify: red-then-green recorded in the commit
- [ ] **H7** TypeScript strict mode with zero errors and zero lint warnings. verify: `tsc --noEmit` and `eslint .`
- [ ] **H8** Every module is reached only through its interface file. verify: import-boundary lint rule

## 11. Docs

- [ ] **D1** [FILES](FILES.md) matches the repository: no missing or extra files, statuses correct, every removal recorded with its path and instruction, change log updated. verify: `npm run check:files`
- [ ] **D2** Every command and attribute in [USAGE](USAGE.md) exists and works. verify: C6, C7 and P3
- [ ] **D3** [PROGRESS](PROGRESS.md) is current and every ticked item here has evidence. verify: review
- [ ] **D4** README, SPEC, USAGE, SECURITY and OPTIMIZATIONS do not repeat each other. verify: each fact has one home, others link to it

## 12. Release gate

All of sections 1 to 11 ticked, then:

- [ ] **L1** Fresh clone, `npm ci`, voice install, `build` of `demo.md` succeeds on a clean machine. verify: run it
- [ ] **L2** The Playwright script in `tests/e2e/smoke.spec.ts` runs unchanged against `minimal.md` and `demo.md`. verify: `npm run e2e`
- [ ] **L3** Licenses are noted: Remotion (size conditions) and Piper (GPL). verify: README and SPEC section 7 updated

| Release | Date | Evidence location |
|---|---|---|
| none yet | | |