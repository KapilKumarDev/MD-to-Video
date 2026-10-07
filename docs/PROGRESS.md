# Progress

Last updated: 2026-10-07

## Workflow stages

| # | Stage | State |
|---|---|---|
| 1 | Research | done (Remotion audio and license, Piper status, sandbox limits) |
| 2 | Plan | done (this docs set). SPEC approved 2026-10-07. [PLAN](PLAN.md) written, waiting on your review |
| 3 | Design | done (tokens and themes approved 2026-10-07) |
| 4 | Implement | in progress: Tasks 0 and 1 done, Task 2 not started |
| 5 | Test | in progress: 44 unit tests green (5 inventory, 39 parse), `npm audit` clean. `knip` has not run since Task 0 (sandbox cannot run it) |
| 6 | Fix | not started |
| 7 | Repeat | not started |
| 8 | Present | not started |

## Log

- 2026-10-07: Read the requested skills. Researched Remotion and Piper. Found that the sandbox has Node 22 and FFmpeg but no Chromium, and its download host is blocked.
- 2026-10-07: Wrote SPEC, README, USAGE, PROGRESS, CHECKLIST, OPTIMIZATIONS, SECURITY, FILES.
- 2026-10-07: Revised after review. USAGE is now a full user guide and the only definition of the markdown format. FILES is a static map. CHECKLIST, SECURITY and OPTIMIZATIONS were expanded with numbered, verifiable items. SPEC no longer repeats syntax or animation names.
- 2026-10-07: FILES had been made static by mistake. It is now a living inventory with status, last change, checks, a change log, a removed-files table and a sync script.
- 2026-10-07: SPEC approved. Read the requested skills. Design stage: froze `styles/` tokens and three themes, added theme defaults to USAGE and design decisions to SPEC section 5.
- 2026-10-07: Design approved. Wrote [PLAN](PLAN.md) with six decisions (D1 to D6) and four test seams.

- 2026-10-07: D1 to D5 approved and applied to SPEC, SECURITY, OPTIMIZATIONS, USAGE, FILES. D6 explained: done at Task 7.
- 2026-10-07: Task 0 scaffold. TypeScript pinned to 6.0.3 (typescript-eslint 8.71.1 supports below 6.1; 7.0.2 is newest). `scripts/check-files.ts` built test-first in 5 red/green slices. `npm run check` passes every step except `check:files`, which found the theme files flat in `styles/` while SPEC and FILES say `styles/themes/`. Moved them (decision A). `knip.json` deferred to Task 8.
- 2026-10-07: Task 1 parse, test-first in three slices. Added `unified` 11.0.5, `remark-parse` 11.0.0, `remark-frontmatter` 5.0.0, `yaml` 2.9.1, `mdast-util-to-string` 4.0.0 and `@types/mdast` 4.0.4, all exact. `parse` now returns scenes with narration and theme defaults, and loads frontmatter with one rule per key. Covered: P2 (every key, valid and invalid), P5 (line asserted on every error), P6, and from P7 the unknown key and `#` heading cases. Left for later tasks: heading attributes and `hold` (Task 2), blocks and the unknown directive and missing `alt` cases (Task 3), assets and hostile input (Task 4). So P1, P3, P4 and P7 stay unticked. Review focus 1 and 3 (Windows line endings, byte-order mark, empty and frontmatter-only files) are tested. Decisions beyond the plan: `###` and deeper headings are rejected like `#`, any other content inside a scene (list, code fence, raw HTML) is rejected instead of ignored, text before the first scene is rejected. These are now in USAGE 4.2. Types are `interface` rather than `type` because the lint config requires it.
- 2026-10-07: Verification in the sandbox: `tsc`, `eslint --max-warnings 0`, `vitest run` (44 tests), `check:files` and `npm audit` pass. `knip` crashes here because its parser cannot allocate its working buffer, so it is unverified. Checked by hand instead that every export is used outside its own file.

## Next action

You: copy the changed files over your working copy (paths are in chat), run `npm ci` then `npm run check`, paste the output, and reply `start task 2`. `npm run check` is the first run of `knip` since Task 0.