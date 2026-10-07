# Security

Threat model and controls. Each control has an ID that [CHECKLIST](CHECKLIST.md) verifies. Controls here are design requirements, not claims of what already exists.

## 1. What is being protected

| Asset | Why it matters |
|---|---|
| The user's files and machine | Rendering runs a headless browser and external processes locally |
| The user's time and resources | A hostile or accidental input must not hang or exhaust the machine |
| The integrity of the output video | Content should come from the script, nothing else |
| Voice models and dependencies | Trusted code and data enter through downloads |
| Privacy | Scripts may be confidential; nothing leaves the machine at runtime |

## 2. Trust boundaries and inputs

```
 script.md + assets  --(untrusted)-->  parse  -->  Deck (validated, trusted)
 Deck  -->  narrate  --(argv + stdin)-->  Piper process
 Timeline  -->  render  -->  headless Chromium (localhost)  -->  FFmpeg  -->  out.mp4
 npm / pip / voice downloads  --(setup time only)-->  machine
```

Everything before `parse` finishes is untrusted: the markdown, frontmatter, directive attributes, CSV bodies, code bodies, and every referenced file. After validation the `Deck` is the only thing later stages read.

Assumed attacker: someone who can give the user a script or asset folder (a shared template, a downloaded project), or a compromised dependency. Not in scope: an attacker who already controls the user's machine.

## 3. Controls

### Input and parsing

| ID | Threat | Control | Verified by |
|---|---|---|---|
| S1 | Raw HTML or script tags reach the render browser | Raw HTML nodes are rejected with a line number. Rendered text is always escaped | `parse-security.test.ts` with an HTML and `<script>` fixture |
| S2 | JavaScript frontmatter (`---js`) executes code at parse time | Frontmatter is loaded with the `yaml` package, which has no JavaScript engine. A `---js` block is rejected as an unknown frontmatter type | `parse-security.test.ts` with a `---js` fixture |
| S3 | YAML tricks (anchors, huge aliases) cause blow-up | Frontmatter size is capped, and values are validated against the schema after load | oversized and alias-bomb fixtures |
| S4 | Directive attributes carry paths or code | Every attribute is validated against `schema.ts`. Unknown names, unknown keys and wrong types fail the parse | one failing test per element type |
| S5 | Code or CSV bodies are interpreted | Bodies are data. Code is highlighted and displayed, never evaluated. CSV is parsed as numbers and short labels only | code fixture containing script-like text renders as plain text |

### Files and paths

| ID | Threat | Control | Verified by |
|---|---|---|---|
| S6 | Path traversal (`../`, absolute paths, encoded forms) | Resolve every asset to a real path and require it to be inside the project folder | traversal fixtures including encoded and absolute forms |
| S7 | Symlinks inside the project point outside it | Resolve symlinks before the containment check | symlink fixture |
| S8 | Remote URLs fetched at render time (SSRF, tracking) | Only local relative paths are accepted. `http:`, `https:`, `file:`, `data:` and similar are rejected | scheme fixtures |
| S9 | Malicious images (decompression bombs, polyglot files) | Only png, jpg, webp. File signature checked, pixel dimensions read from the header and capped before decoding | oversized-dimension fixture, wrong-extension fixture |
| S10 | SVG scripts or external references | SVG is never embedded. For `path`, only outline `d` attributes are extracted from the file. Everything else in the SVG is discarded | SVG fixture with script and external image |
| S11 | Output overwrites or escapes | Output must end in `.mp4`, its folder must exist, and an existing file needs `--force` | CLI tests |
| S12 | Cache directory read or tampered by others | Cache is created owner-only. Entries are named by content hash and re-verified on read | permission test and corrupted-entry test |

### Processes

| ID | Threat | Control | Verified by |
|---|---|---|---|
| S13 | Shell injection through narration, paths or titles | No shell is ever used. Processes start with an argument array. Narration goes to stdin | fixture with quotes, semicolons, backticks and `$(...)` in narration and file names |
| S14 | Filter-graph injection into FFmpeg | User text never enters an FFmpeg filter string. Only numeric settings built by the tool do | code review item plus the S13 fixture |
| S15 | Piper or FFmpeg hangs | Every child process has a timeout and is killed on expiry. Failure maps to exit code 2 or 3 | timeout test with a stub that sleeps |
| S16 | Voice model tampering | Voices install only from entries in `config/voices.json`. SHA-256 is verified. A mismatch deletes the download and fails closed | `voices.test.ts` with a corrupted file |
| S17 | Unsafe browser configuration | Chromium runs with its sandbox on. Disabling it requires an explicit documented flag for containers and prints a warning | config review and a test that the default is on |
| S18 | Preview or render server exposed to the network | Servers bind to localhost only | e2e step that checks the listening address |

### Resources (denial of service)

Defaults live in `config/limits.json`. They are tunable but always enforced.

| ID | Limit | Default |
|---|---|---|
| S19 | Script file size | 1 MB |
| S19 | Scenes per script | 200 |
| S19 | Narration characters per scene / per script | 3,000 / 100,000 |
| S19 | CSV rows per chart | 200 |
| S19 | Code lines per block | 150 |
| S19 | List items per list | 6 |
| S19 | Image file size / pixel dimensions | 20 MB / 8,000 x 8,000 |
| S19 | Music file size / duration | 50 MB / 1 hour |
| S19 | Total video length | 60 minutes |

Verified by one over-limit fixture per row. Exceeding a limit is a parse error naming the limit.

### Supply chain and privacy

| ID | Threat | Control | Verified by |
|---|---|---|---|
| S20 | Malicious or vulnerable dependency | Exact versions pinned, lockfile committed, installs use `npm ci`, and `npm audit` runs in the check script. Install scripts of new dependencies are reviewed before they are allowed | check script exit code, review item |
| S21 | Unused dependency widens the attack surface | `knip` fails the check on unused dependencies | check script |
| S22 | Hidden network calls leak script content | Document every network call the tools make at runtime. The e2e render runs with the network blocked and must still pass | offline e2e run |
| S23 | GPL boundary | Piper runs as a separate process and none of its code is copied here | review item |
| S24 | Sensitive data in logs | Logs and errors show relative paths and line numbers, never narration text or absolute home paths | log fixture test |

## 4. Residual risks (accepted, documented)

- Remotion and Chromium are large dependencies. We pin and audit them but do not audit their internals.
- A voice model can still sound wrong or say unintended words from a mispronounced script. That is a quality issue, not a security one.
- Anyone who can already run code as the user is outside this model.

## 5. Reporting

Add an entry under the log in [PROGRESS](PROGRESS.md) with the input that triggered the issue. Every confirmed issue gets a new fixture under `tests/fixtures/hostile/` and a failing test before the fix.