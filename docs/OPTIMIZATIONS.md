# Optimizations

Performance and size decisions with budgets. **All numbers are targets to be validated, not results.** Nothing is claimed as achieved until a measurement is recorded in section 6. Techniques that depend on a specific Remotion or FFmpeg option are verified against current docs at implementation time.

## 1. Method

1. **Measure first.** No optimization is added without a baseline and a number showing the gain.
2. **One reference workload:** `tests/fixtures/demo.md` at 1080p, 30 fps. A second one, `minimal.md`, is used for fast checks.
3. **Protocol:** record machine (CPU model, cores, RAM), run 3 times, report the median.
4. **Regression gate:** a render more than 15 percent slower than the recorded baseline fails the check.
5. **Rule:** if a technique cannot show a gain on the reference workload, it is removed (no dead optimizations).

## 2. Budgets

| ID | Metric | Target |
|---|---|---|
| O1 | `check` on a 100-scene script | under 200 ms |
| O2 | `timeline` on 200 scenes | under 50 ms |
| O3 | Narration cache hit rate when nothing changed | 100 percent, zero synthesis calls |
| O4 | Editing one scene re-synthesizes | exactly 1 scene |
| O5 | Cold narration speed | faster than real time on a 4-core laptop |
| O6 | Render, reference workload | baseline recorded, then regression gate |
| O7 | Draft render vs full render | at least 3x faster |
| O8 | Peak memory during render, reference workload | recorded, then must not grow more than 15 percent |
| O9 | A/V sync error between narration and its scene start | within 1 frame |
| O10 | Cache size | reported in every build summary |

## 3. Techniques by stage

### Parse and timeline

| ID | Technique | Why |
|---|---|---|
| O11 | Parse once, produce an immutable `Deck` | Later stages never re-read markdown |
| O12 | `timeline` is a pure function with no I/O | Fast, deterministic, trivially testable |
| O13 | Syntax highlighting (`shiki`) and chart layout (scales, bar sizes) are computed once at render setup | Moves per-frame work to one-time work |

### Narration

| ID | Technique | Why |
|---|---|---|
| O14 | Cache key = hash of (scene text, voice id, voice model checksum, engine version) | Edits invalidate exactly what changed, and a model change invalidates everything it should |
| O15 | Synthesize uncached scenes in parallel, limited to cores divided by the engine's own thread count | Avoids oversubscribing the CPU |
| O16 | Probe audio duration once and cache it beside the audio | Avoids re-reading files on every build |
| O17 | Load the voice model once per build, not per scene, if the engine API allows it | Model load is the fixed cost per call. Verify with the installed Piper version |

### Render

| ID | Technique | Why |
|---|---|---|
| O18 | Bundle the Remotion project once per build and reuse it for every render call | Bundling is slow and needs to happen once |
| O19 | Benchmark concurrency on the reference workload and set the default from the result | Remotion picks from CPU count, but memory is often the real limit |
| O20 | Use JPEG frames for opaque scenes (all default themes are opaque) with a measured quality setting | Faster capture and encode than PNG when no transparency is needed |
| O21 | Choose the Chromium GL backend by benchmark per platform | The best backend differs by machine. Verify available options |
| O22 | Enable parallel encoding if the installed Remotion version supports it | Overlaps frame capture and encoding |
| O23 | `--draft`: half resolution, lower fps cap, faster x264 preset, higher CRF | Fast feedback while editing |
| O24 | Final quality: H.264, CRF around 18, AAC audio | Good quality at a size that plays everywhere. Tune with a size and quality check |
| O25 | Unmount scenes outside their time range and premount the next scene shortly before it starts | Keeps the DOM small and avoids a first-frame hitch |

### Per-frame cost rules (for every scene component)

| ID | Rule | Why |
|---|---|---|
| O26 | Animate `transform` and `opacity`. Avoid animating layout properties | Cheap to paint |
| O27 | Large blurs and filters are limited and measured, because they are the usual hotspots | Cost scales with pixel area |
| O28 | Particle and grid effects have a fixed element cap and use Remotion's seeded `random()` | Deterministic frames and bounded cost. Non-seeded randomness would also make frames differ between workers |
| O29 | Heavy values are computed with `useMemo` or once at render setup, never per frame | Avoids repeating identical work |
| O30 | Fonts and images are loaded before the first frame is requested | A frame captured before assets load is wrong, and retries are slow |
| O31 | Components read time through Remotion's frame hooks only, never real clocks | Required for correct parallel rendering |
| O32 | The waveform background samples audio at a reduced resolution | Full-resolution sampling adds cost the eye cannot see |

### Audio mix

| ID | Technique | Why |
|---|---|---|
| O33 | Music ducking is a volume function of the frame, computed from the timeline | No extra audio pass |
| O34 | Final loudness normalization is a single pass with a fixed target, chosen after a listening and measurement check | Predictable level across videos without a second encode |

## 4. Rejected for now

| Idea | Reason |
|---|---|
| Cloud or Lambda rendering | Not needed for a local single-user tool, adds accounts and cost |
| GPU video encoding | Machine-specific, no baseline showing the CPU path is the bottleneck |
| Experimental in-browser renderer | Unproven for this feature set. Revisit if Chromium rendering proves too slow |
| Pre-resizing images | Added dependency with no measured gain. Reconsider if image decode shows up in profiling |
| Custom worker pool for frames | Remotion already parallelizes. Duplicating it breaks the "do not reinvent" rule |
| Cache pruning command | Disk use is reported per build, and the cache is safe to delete. Add only if size becomes a real problem |

## 5. How to profile when a budget fails

1. Run the reference workload with verbose logging and note frame time per scene.
2. If a few scenes dominate, inspect their components against rules O26 to O32.
3. If time is evenly spread, test concurrency (O19) and GL backend (O21).
4. If time goes before the first frame, check bundling (O18) and asset loading (O30).
5. Fix the cause, re-run the same workload, record the result below.

## 6. Measurements

| Date | Machine | Workload | Metric | Before | After | Change |
|---|---|---|---|---|---|---|
| none recorded | | | | | | |