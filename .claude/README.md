# Claude Code setup for this repo

Everything here is loaded automatically by any Claude Code session opened on
this repo — CLI, desktop, or claude.ai/code. No install step.

## Caveman — compressed replies

[caveman](https://github.com/JuliusBrussee/caveman) makes the agent drop filler
and answer in tight fragments. Code, commands, paths, and error strings stay
byte-for-byte exact. Upstream measures ~65% fewer **output** tokens.

**Active from message one, at level `full`.** No `/caveman` needed — the
SessionStart hook injects the ruleset every session.

### Controls

| Say / type | Effect |
|---|---|
| `/caveman lite` | Gentler — filler dropped, sentences intact |
| `/caveman full` | Default — no articles/filler/hedging, fragments OK |
| `/caveman ultra` | Bare fragments, tables over prose |
| `/caveman wenyan` | Classical Chinese, densest of all |
| `normal mode` / `stop caveman` | Off for the rest of the session |
| `/caveman-help` | Full reference card |
| `/caveman-commit` | Conventional Commit message, ≤50-char subject |
| `/caveman-review` | One-line-per-finding PR review comments |
| `/caveman-compress <file>` | Rewrite a memory file terse; saves input tokens every session after. Backs up to `<file>.original.md` |
| `/caveman-stats` | Session token usage + estimated savings |

Caveman keeps your language — write Afrikaans or Portuguese, get terse
Afrikaans or Portuguese back. It compresses style, never translates.

It also self-disables for security warnings, irreversible-action
confirmations, and anything you ask it to clarify.

### Change the default level

Edit `.caveman/config.json` at the repo root:

```json
{ "defaultMode": "ultra" }
```

Valid: `off`, `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan`, `wenyan-ultra`.
`"off"` disables activation entirely while leaving the skills installed.
`CAVEMAN_DEFAULT_MODE` in the environment overrides the file.

### Subagents

`cavecrew-investigator` (find code), `cavecrew-builder` (small edits), and
`cavecrew-reviewer` (diff review) return compressed results, so delegating
costs the main context ~60% less than the stock agents.

### Statusline badge (local only, opt-in)

Shows `[CAVEMAN] ⛏ 12.4k` — current mode and lifetime tokens saved. Add to your
**personal** `~/.claude/settings.json` (kept out of the repo so it doesn't
clobber anyone else's statusline):

```json
"statusLine": {
  "type": "command",
  "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/caveman/hooks/caveman-statusline.sh\""
}
```

Until you add it, the SessionStart hook nudges once per session to offer setup.
`CAVEMAN_STATUSLINE_SAVINGS=0` hides the savings number.

## Files

```
.claude/
├── settings.json        hooks that activate caveman each session
├── skills/              caveman, -commit, -review, -compress, -help, -stats, cavecrew
├── agents/              cavecrew-{investigator,builder,reviewer}
└── caveman/
    ├── hooks/           vendored upstream hook scripts (Node ≥18, no deps)
    ├── update.sh        re-vendor from upstream
    └── VENDOR.md        upstream pin + what was copied
.caveman/config.json     default mode for this repo
```

Requires Node ≥18 on PATH for the hooks. Without Node the session still works —
Claude Code reports a failed hook and caveman just never activates; the skills
stay usable via `/caveman`. `/caveman-compress` also needs Python 3.
