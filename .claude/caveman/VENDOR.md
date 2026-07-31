# Vendored: caveman

Upstream: https://github.com/JuliusBrussee/caveman (MIT — see `LICENSE`)

- **Commit:** `0d95a81d35a9f2d123a5e9430d1cfc43d55f1bb0`
- **Vendored from upstream date:** 2026-07-03

## Why vendored instead of installed

Claude Code sessions on the web run in a fresh, throwaway container. Anything
installed into `~/.claude` (what `install.sh` or `claude plugin install` does)
is gone next session. Files committed to this repo are not — they get cloned
with the repo, so the skills and hooks are live from message one of every
future session, with no network call and no install step.

## What was copied

| Repo path | Upstream path |
|---|---|
| `.claude/skills/caveman*/`, `.claude/skills/cavecrew/` | `skills/` |
| `.claude/agents/cavecrew-*.md` | `agents/` |
| `.claude/caveman/hooks/*` | `src/hooks/` |

Files are **unmodified** upstream copies — no local patches. Keep it that way so
updates stay a straight overwrite.

Not copied: the marketplace/plugin manifests, installers, benchmarks, evals,
docs, the `caveman-shrink` MCP server, and the OpenCode/Codex/Gemini adapters.
This repo only needs the Claude Code surface. Grab the rest from upstream if
ever needed.

## Layout matters

`caveman-activate.js` locates `SKILL.md` at runtime by walking
`__dirname/../../skills/caveman/SKILL.md`. With hooks at
`.claude/caveman/hooks/`, that resolves to `.claude/skills/caveman/SKILL.md`.
**Moving either directory breaks the ruleset injection** — the hook silently
falls back to an abbreviated built-in ruleset instead of erroring.

## Updating

```bash
bash .claude/caveman/update.sh          # latest main
bash .claude/caveman/update.sh v2.1.0   # or a pinned tag/sha
git diff .claude                        # review, then commit
```

The script rewrites the commit/date pins above.
