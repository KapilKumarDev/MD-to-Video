# Progress

Last updated: 2026-11-15

## Workflow stages

| # | Stage | State |
|---|---|---|
| 1 | Research | done (Remotion audio and license, Piper status, sandbox limits) |
| 2 | Plan | done (this docs set). SPEC approved 2026-10-07. [PLAN](PLAN.md) written, waiting on your review |
| 3 | Design | done (tokens and themes approved 2026-10-07) |
| 4 | Implement | in progress: Tasks 0 to 3 done, Task 4 not started |
| 5 | Test | in progress: 219 unit tests green (5 inventory, 214 parse), `npm audit` clean. `knip` has not run since Task 0 (sandbox cannot run it) |
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
- 2026-10-07: Task 2 heading attributes, test-first. Tests are generated from `HEADING_NAMES` in `schema.ts`: every valid name accepted, a name from another place rejected with that place's valid names listed (P4), plus `hold` range, unknown, repeated and malformed attributes. P2 and P6 ticked in CHECKLIST. P3 and P4 stay open for the block half (Task 3). Deviation from PLAN: the heading parser is `src/parse/heading.ts`, not `blocks.ts`, because `blocks.ts` is for blocks. PLAN updated. `HEADING_NAMES` includes `none` where USAGE allows it, so the Task 15 coverage check must skip `none`.
- 2026-10-07: Verification in the sandbox after Task 2: `tsc`, `eslint --max-warnings 0` and `vitest run` (90 tests) pass. `knip` still cannot run here.

- 2026-10-20: Node 22 to 26. `.nvmrc` and `engines` were already on 26. Moved `@types/node` to 26.6.5 and the Node requirement in USAGE and PLAN. On Node 26.12.0 in the sandbox: `tsc`, `eslint --max-warnings 0`, `vitest run` (90 tests), `check:files` and `npm audit` pass. `knip` still cannot run here (buffer allocation failure).

- 2026-11-15: Task 3 blocks, test-first. Added `remark-directive` 4.0.0 and `shiki` 4.6.0 (exact). New `src/parse/blocks.ts` validates the six blocks; bodies are stored normalized (CSV rows trimmed, list items as plain text, flow chains with single spaces, code verbatim). Ticked P1, P3, P4, P7. Found and fixed: the USAGE `highlight=2-3` example had only 2 code lines (now `highlight=2`), and markdown reads `10:30` as a directive and drops it, so text directives are turned back into the text that was written. Decisions beyond the plan: `anim` is optional with a default (first listed name, or the one matching the chart `type`); `highlight` accepts comma lists; labels and flow nodes are limited to 40 characters (`labelChars` in `limits.json`, S19); a `diff` block needs at least one `+` or `-` line; `src` and `alt` only checked for presence here, and `src` file type and containment stay in Task 4. Also cleared `npm audit`: updated eslint, knip, typescript-eslint, vitest, `@types/node` and added a `minimatch` 11.0.8 override (the typescript-eslint chain still asks for 10).
- 2026-11-15: Verification in the sandbox (Node 22.23.4, `engines` asks for 26): `tsc`, `eslint --max-warnings 0`, `vitest run` (219 tests), `check:files` and `npm audit` pass. `knip` still cannot run here.

## Next action

You: copy the changed files over your working copy (paths are in chat), run `npm ci` then `npm run check`, paste the output, and reply `start task 4`. `npm run check` is the first run of `knip` since Task 0; expect it to ask for `knip.json` only if it reports `config/limits.json` or `shiki` usage wrongly.