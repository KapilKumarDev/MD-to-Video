# Usage Guide

How to go from an idea to an MP4. This file is the **single definition** of the markdown format. [SPEC](SPEC.md) explains why the tool is built the way it is.

**Interface status:** planned, not implemented. A command or directive is listed as working only after its item in [CHECKLIST](CHECKLIST.md) passes.

## 1. The workflow in five steps

1. **Write** a script in markdown (section 4). Each `##` heading is one scene. The paragraph under it is what the voice says.
2. **Check** it: `md2video check script.md`. This parses only, takes under a second, and reports errors with line numbers.
3. **Preview** it: `md2video preview script.md`. Opens the Remotion preview so you can scrub scenes and tune animations. Voice is generated on first preview and cached.
4. **Build** it: `md2video build script.md out/talk.mp4`. Use `--draft` for a fast low-quality pass while editing.
5. **Iterate.** Change one scene and rebuild. Only that scene's narration is re-synthesized.

## 2. Setup (once)

| Need | Detail |
|---|---|
| Node.js | 22 or newer |
| Python | 3.9 or newer, only for the voice engine |
| FFmpeg | on the path, used for probing and mixing |
| Browser | Remotion downloads a headless Chromium on first run |
| Voice | `md2video voices install en_US-lessac-medium` downloads a voice and verifies its checksum |

Everything runs on CPU and offline after setup.

## 3. Your project folder

```
my-video/
  script.md          the script (any name)
  assets/            images, svg shapes, music; referenced by relative path
  out/               finished videos
  .md2video-cache/   narration audio and probe results; safe to delete
```

Rules: every asset path in the script is relative to the script file and must stay inside this folder. Anything outside it is rejected.

## 4. The markdown format

### 4.1 Frontmatter (top of the file, YAML only)

| Key | Type | Default | Meaning |
|---|---|---|---|
| `title` | text | file name | Shown on the opening scene if one is requested, used in the output metadata |
| `voice` | voice id (letters, digits, `_` and `-`) | `en_US-lessac-medium` | Installed voice used for narration |
| `theme` | `midnight`, `daylight`, `high-contrast` | `midnight` | Colors, type, default animations |
| `fps` | 24, 30, 60 | 30 | Frames per second |
| `size` | `1080p`, `720p`, `square`, `vertical` | `1080p` | 1920x1080, 1280x720, 1080x1080, 1080x1920 |
| `music` | asset path | none | Background track. It is ducked under narration and loops or trims to fit |
| `pad` | seconds, 0 to 3 | 0.6 | Silence added after each scene's narration |

Unknown keys fail the check. JavaScript frontmatter is rejected.

Themes and what "theme default" means below:

| Theme | Look | Default `entrance` | Default `transition` | Default `bg` |
|---|---|---|---|---|
| `midnight` | Dark navy, green accent | `kinetic` | `fade` | `gradient-drift` |
| `daylight` | Light, deep green accent | `slide-up` | `slide-left` | `none` |
| `high-contrast` | Near-black, white text, yellow accent | `word-fade` | `fade` | `none` |

### 4.2 Scenes

```md
## Scene title {entrance=kinetic emphasis=highlight-sweep transition=slide-left}
Narration paragraph. Everything in plain paragraphs is spoken, in order.
```

- The heading text is shown on screen as the scene title. Narration is the plain paragraph text.
- Several paragraphs are spoken as one continuous narration with a short natural pause between them.
- A scene with no narration is silent. Give it `hold=3` (seconds) or it fails the check, because its length would be undefined.
- Only `##` starts a scene. `#` is rejected (use frontmatter `title`), and so are `###` and deeper.
- Between scenes you can write paragraphs and `:::` blocks. Lists, code fences, quotes, tables and raw HTML outside a block are rejected, and so is any text before the first scene.

Heading attributes (all optional):

| Attribute | Values | Default | Notes |
|---|---|---|---|
| `entrance` | `typewriter`, `word-fade`, `kinetic`, `letter-drop`, `scale-pop`, `slide-up` | theme default | How the title arrives. One per scene |
| `emphasis` | `highlight-sweep`, `wave`, `glitch`, `none` | `none` | Ongoing effect on the title. One per scene |
| `transition` | `fade`, `slide-left`, `slide-right`, `wipe`, `flip`, `clock-wipe`, `zoom`, `none` | theme default | How the **previous** scene hands over to this one |
| `bg` | `gradient-drift`, `particles`, `grid-pulse`, `waveform`, `none` | theme default | Background animation. `waveform` reacts to the narration audio |
| `hold` | seconds, 1 to 60 | none | Minimum length. Required for silent scenes |

Why only one entrance and one emphasis: every animation has to communicate something, so effects do not pile up.

### 4.3 Visual blocks

A block is a directive written between `:::name{attributes}` and `:::`. Blocks appear in the scene after the title, top to bottom. Narration paragraphs and blocks can be mixed; paragraphs are spoken, blocks are shown.

| Block | Purpose | Body |
|---|---|---|
| `:::chart` | Data | CSV with a header row |
| `:::code` | Code | The code, verbatim |
| `:::list` | Points | A markdown list |
| `:::image` | Picture | none |
| `:::flow` | Flowchart | One chain per line, `A -> B -> C` |
| `:::path` | Drawn shape | none |

#### chart

```md
:::chart{type=bar anim=grow-bars}
label,value
Q1,12
Q2,19
:::
```

| Attribute | Values |
|---|---|
| `type` | `bar`, `line`, `pie`, `ring`, `counter` |
| `anim` | bar: `grow-bars`; line: `line-draw`; pie: `pie-sweep`; ring: `progress-ring`; counter: `counter-tick` |
| `title` | optional caption |

`ring` and `counter` take a single data row. `ring` value is 0 to 100. Colors never carry meaning alone; labels are always drawn.

#### code

```md
:::code{lang=python anim=line-by-line highlight=2-3}
def greet(name):
    return f"hello {name}"
:::
```

| Attribute | Values |
|---|---|
| `lang` | any language `shiki` knows. Required |
| `anim` | `line-by-line`, `diff`, `typing` |
| `highlight` | line numbers or ranges, e.g. `2` or `2-3` |

For `diff`, prefix removed lines with `-` and added lines with `+`. Code is only displayed, never run.

#### list

```md
:::list{anim=stagger}
- First point
- Second point
:::
```

`anim`: `stagger` or `card-stack`. Maximum 6 items so each stays readable.

#### image

```md
:::image{src=assets/diagram.png alt="Request flow overview" anim=zoom-focus}
:::
```

`src` is png, jpg or webp. `alt` is required. `anim`: `parallax`, `zoom-focus`, `flip`, `scale-pop`. SVG files are not allowed here; use `path`.

#### flow

```md
:::flow{anim=node-by-node}
Browser -> Server -> Database
Server -> Cache
:::
```

Each unique name becomes a node. Nodes appear in order of first mention, edges draw as they are reached. `anim`: `node-by-node`.

#### path

```md
:::path{src=assets/logo.svg anim=path-draw}
:::
```

Only the outline paths inside the SVG are read and drawn. Scripts, text and images inside the SVG are ignored. `anim`: `path-draw`.

### 4.4 Which animation applies where

| Where | Group | Names |
|---|---|---|
| Heading `entrance` | Text and layout | `typewriter`, `word-fade`, `kinetic`, `letter-drop`, `scale-pop`, `slide-up` |
| Heading `emphasis` | Text | `highlight-sweep`, `wave`, `glitch` |
| Heading `transition` | Transitions | `fade`, `slide-left`, `slide-right`, `wipe`, `flip`, `clock-wipe`, `zoom` |
| Heading `bg` | Background | `gradient-drift`, `particles`, `grid-pulse`, `waveform` |
| `chart` | Data | `grow-bars`, `line-draw`, `pie-sweep`, `progress-ring`, `counter-tick` |
| `code` | Code | `line-by-line`, `diff`, `typing` |
| `list` | Layout | `stagger`, `card-stack` |
| `image` | Layout | `parallax`, `zoom-focus`, `flip`, `scale-pop` |
| `flow`, `path` | Diagrams | `node-by-node`, `path-draw` |

A name used in the wrong place fails the check and the message lists the valid names for that place.

### 4.5 Writing narration that sounds right

- Write numbers the way you want them said: `twenty twenty-six`, not `2026`, when the voice mispronounces.
- Spell out abbreviations once: `Central Processing Unit` or `C P U`.
- Short sentences get clearer pacing. A comma adds a short pause, a period a longer one.
- Piper supports overriding a word's pronunciation with raw phonemes in double square brackets. Verify the exact syntax for your installed version before relying on it.

## 5. Timing rules

- Scene length = narration length + `pad`, or `hold` if longer.
- A transition lasts half a second and overlaps the end of the previous scene and the start of the next one, so total length is slightly shorter than the sum of scenes. `none` has no overlap.
- Visual blocks animate in order across the scene and finish before the narration ends.

## 6. Commands

| Command | Does |
|---|---|
| `md2video check <script>` | Parse and validate only |
| `md2video preview <script>` | Open the Remotion preview |
| `md2video build <script> <out.mp4> [--draft] [--force]` | Parse, narrate, render, mix. `--draft` renders at half size and lower quality. Existing output is not overwritten without `--force` |
| `md2video voices list` | Show installed and available voices |
| `md2video voices install <id>` | Download and verify a voice |

Exit codes: 0 success, 1 invalid script, 2 environment problem (missing tool or voice), 3 render failure.

## 7. Outputs

| Path | Content |
|---|---|
| `out/*.mp4` | H.264 video with AAC audio |
| `.md2video-cache/audio/` | One wav per scene, named by content hash |
| `.md2video-cache/probe/` | Measured audio durations |

A build prints a summary: scenes, total length, cache hits, render time, output size.

## 8. Troubleshooting

| Message or symptom | Cause | Fix |
|---|---|---|
| `line 12: unknown directive "chat"` | Typo in a block name | Use a name from section 4.3 |
| `line 20: "typing" is not valid for chart; valid: grow-bars, ...` | Animation used in the wrong place | See table 4.4 |
| `line 8: scene has no narration and no hold` | Silent scene without a length | Add `hold=3` |
| `asset escapes project folder` | Path points outside the folder | Move the file into `assets/` |
| `voice not installed` | Voice missing | `md2video voices install <id>` |
| Voice mispronounces a word | Engine guess | Respell it phonetically in the narration |
| Build is slow | Full quality render | Use `--draft` while editing |

## 9. A complete example

```md
---
title: How a request travels
voice: en_US-lessac-medium
theme: midnight
size: 1080p
---

## The journey of one request {entrance=kinetic bg=gradient-drift}
Every click starts a short trip across the network.

## Following the path {entrance=typewriter transition=slide-left}
First the browser asks the server, then the server asks the database.

:::flow{anim=node-by-node}
Browser -> Server -> Database
Server -> Cache
:::

## Where the time goes {entrance=word-fade transition=wipe}
Most of the delay sits in the database call.

:::chart{type=bar anim=grow-bars title="Milliseconds per hop"}
label,value
Network,40
Server,25
Database,120
:::

## The fix {entrance=scale-pop transition=zoom emphasis=highlight-sweep}
A cache removes the slowest hop.

:::code{lang=python anim=diff}
- row = db.query(user_id)
+ row = cache.get(user_id) or db.query(user_id)
:::
```