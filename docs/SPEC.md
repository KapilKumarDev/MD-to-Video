# md2video: Design Spec

Status: **approved 2026-10-07**. No product code exists yet. Date: 2026-10-07.

## 1. Intent

Turn one markdown file into an MP4 with narration audio and a large variety of purposeful animations.

| Said by you | Assumed by me (override any) |
|---|---|
| Video from markdown, audio in the output file | Narration is text-to-speech from the markdown body |
| Proper animations, large variety | Variety comes from a component catalog (names in USAGE 4.4, design in section 5), not one effect repeated |
| README, progress, checklist, usage, optimizations, security, files-to-check docs | Each doc has one job; none repeats another |
| Reusable end-to-end Playwright script | Script drives the Remotion preview and one real render |
| No Colab | Everything runs locally on CPU |
| Content type not yet chosen | Default to explainers and code walkthroughs; data scenes included |

**Design read:** explainer and code-walkthrough video generator for a solo developer, kinetic-typography language, leaning toward Remotion springs plus `@remotion/transitions`.
**Dials:** variance 6, motion 8, density 3.
**Rule for every animation:** it must communicate something (hierarchy, sequence, feedback, state change). "Looks cool" is not a reason, so a scene may use at most one entrance and one emphasis effect.

## 2. Architecture

Four deep modules. Each has a small interface and is testable at that interface.

| Module | Interface | Hides |
|---|---|---|
| `parse` | `parse(markdown: string, ctx: { file: string; root: string }): Deck` | frontmatter, directives, scene splitting, asset containment, validation errors with file and line |
| `narrate` | `narrate(deck: Deck, voice: VoiceAdapter): Promise<NarratedDeck>` | TTS calls, caching by content hash, audio duration probing |
| `timeline` | `timeline(deck: NarratedDeck, fps: number): Timeline` | scene lengths, transition overlap, total frame count (pure function) |
| `render` | `render(timeline: Timeline, out: string): Promise<void>` | Remotion bundling, composition, FFmpeg mix |

The seam between `narrate` and the TTS engine is a real one: Piper today, a second engine later only if you ask for it. Until then there is one adapter and no plugin system.

## 3. Markdown format

Defined in one place only: [USAGE section 4](USAGE.md). Design constraints on it:

1. Parsed with `remark`, `remark-directive`, `remark-frontmatter` and `yaml` (YAML only). Not a custom parser.
2. Strict: unknown keys, directives and animation names fail with a line number. Nothing is ignored silently.
3. Every animation name is declared once, in `src/parse/schema.ts`. The parser, the error messages, the coverage check in [CHECKLIST](CHECKLIST.md) and the demo fixture all read from it, so names cannot drift.
4. Defaults come from the theme, so a plain script with only headings and paragraphs still renders.

## 4. Pipeline

`parse` -> `narrate` -> `timeline` -> `render`.

- Scene length is narration duration plus padding, so visuals always match the voice.
- Audio per scene is cached by content hash, so edits re-synthesize only the changed scene.
- Music, when given, is ducked under narration and the final mix is loudness-normalized to a fixed target. Details and checks are in [OPTIMIZATIONS](OPTIMIZATIONS.md) and [CHECKLIST](CHECKLIST.md).
- `--draft` trades size and quality for speed while editing.

## 5. Animation design

The names and where each applies are in [USAGE 4.4](USAGE.md). This section is the design reasoning only.

| Group | Communicates | Built from |
|---|---|---|
| Title entrance | A new idea starts | `spring`, `interpolate` |
| Title emphasis | This word matters | `interpolate`, seeded randomness |
| Transitions | Move from one idea to the next | `@remotion/transitions` presets |
| Background | Mood and pace, never competes with text | CSS gradients, seeded particles, audio data |
| Data | Quantity and change | `d3` scales computed once at render setup, SVG |
| Code | Reading order and what changed | `shiki` tokens computed once at render setup |
| Lists and images | Sequence and focus | `spring` stagger, transforms |
| Diagrams | Structure and flow | `@remotion/paths`, SVG |

Rules:
- Motion must be motivated. Each effect answers "what does this show?" in one sentence. One entrance and one emphasis per title at most.
- Look: three themes, one accent each, values frozen in `styles/themes/`. Sizes, type scale and spacing are in `styles/tokens.css`. Theme defaults for animations are in [USAGE 4.1](USAGE.md). No inline CSS.
- Type: IBM Plex Sans for text, JetBrains Mono only for code and data. Both come from `@fontsource` packages (OFL-1.1) so the render needs no network (SECURITY S22). Google Fonts links are not used.
- Units: design in pixels at the 1080p reference. `720p` renders the same layout scaled by Remotion's `scale` option (verify at implementation).
- Code colors: shiki built-in themes `github-dark`, `github-light` and `github-dark-high-contrast`, one per theme. Where the theme-to-shiki mapping lives is decided in the plan.
- Motion timing: entrances 0.5 to 0.8 s with ease-out or a spring, emphasis loops no faster than 3 flashes per second, exits shorter than entrances, one authored focal moment per scene.
- Every component honors a global reduced-motion flag and renders its final state as a still frame.
- Components read time only through Remotion's frame hooks, and use seeded randomness, so parallel frames are identical.

## 6. Stack

| Need | Choice | Why |
|---|---|---|
| Video | Remotion 4.x (version pinned at install) | frame-accurate, audio native, `renderMedia()` |
| Language | TypeScript | one language for parser, timeline, scenes |
| Parse | remark, remark-directive, remark-frontmatter, yaml | do not reinvent. `yaml` is maintained, caps alias expansion and has no JavaScript engine |
| TTS | `piper-tts` (OHF-Voice/piper1-gpl) | local, CPU-fast. The old rhasspy/piper repo is archived, so it is not used |
| Code highlighting | `shiki` | tokens computed once at render setup. It starts asynchronously, so `parse` only checks that `lang` is known and `check` stays fast |
| Chart math | `d3-scale` | do not hand-roll scales |
| Image headers | `image-size` | read dimensions without decoding (see SECURITY S9) |
| Mix/encode | FFmpeg via Remotion | already in the render path |
| Unit tests | Vitest | pairs with TypeScript |
| E2E | Playwright | requested |
| Hygiene | ESLint, knip | enforces no dead code and no inline CSS |

## 7. Decisions, cuts, and open risks

- **Cut from v1 (YAGNI):** Mermaid diagrams, cloud TTS, Lambda rendering, GPU paths, a plugin system.
- **Word-level sync:** Piper does not give word timestamps. Karaoke-style text sync needs an alignment step. It is deferred to phase 2 and must be verified before promising it.
- **Remotion license:** free for individuals and small companies, company license required above a size threshold. Confirm you qualify before commercial use.
- **Piper license:** GPL. Piper is called as a separate process and its code is not copied into this repo.
- **Sandbox limit:** the build environment here cannot download Chromium (host returns 403) and has none installed. Parser, narration, and timeline tests run anywhere. The Playwright e2e and real renders run on your machine.

## 8. Test seams (TDD)

Confirmed before any test is written:
1. `parse`: markdown in, `Deck` out. Includes error cases with line numbers.
2. `timeline`: `NarratedDeck` in, frame counts and transition overlaps out. Pure and fast.
3. `narrate`: `Deck` plus a counting fake `VoiceAdapter` in, `NarratedDeck` out. Covers cache hits, one-scene edits and corrupted entries. The real engine is covered by the e2e seam.
4. End to end: one markdown fixture in, MP4 with a video stream and an audio stream out, checked with `ffprobe`.

The seams are fixed by [PLAN](PLAN.md). `narrate` gets no mock-heavy tests beyond the fake adapter.

Full acceptance criteria are in [CHECKLIST](CHECKLIST.md).

## 9. Workflow for this project

Research, plan, design, implement, test, fix, repeat, present. Progress is tracked in `PROGRESS.md`. Acceptance is tracked in `CHECKLIST.md`.