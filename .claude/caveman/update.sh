#!/usr/bin/env bash
# Re-vendor caveman from upstream into this repo's .claude/ tree.
#
# Usage:
#   bash .claude/caveman/update.sh            # pull latest main
#   bash .claude/caveman/update.sh <git-ref>  # pin a tag/branch/sha
#
# Copies only the files this repo uses (skills, cavecrew agents, hooks).
# Nothing outside .claude/ is touched. Review `git diff` before committing.

set -euo pipefail

REF="${1:-main}"
REPO="https://github.com/JuliusBrussee/caveman.git"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DST="$REPO_ROOT/.claude"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "caveman: cloning $REPO @ $REF"
git clone --quiet --depth 1 --branch "$REF" "$REPO" "$TMP/caveman" 2>/dev/null || {
  # --branch does not accept a raw sha; fall back to full clone + checkout.
  git clone --quiet "$REPO" "$TMP/caveman"
  git -C "$TMP/caveman" checkout --quiet "$REF"
}
SRC="$TMP/caveman"
SHA="$(git -C "$SRC" rev-parse HEAD)"
DATE="$(git -C "$SRC" log -1 --format=%cs)"

SKILLS=(caveman caveman-commit caveman-review caveman-compress caveman-help caveman-stats cavecrew)
for s in "${SKILLS[@]}"; do
  rm -rf "${DST:?}/skills/$s"
  cp -R "$SRC/skills/$s" "$DST/skills/$s"
done

cp "$SRC"/agents/cavecrew-*.md "$DST/agents/"

HOOK_FILES=(
  caveman-activate.js
  caveman-mode-tracker.js
  caveman-config.js
  caveman-stats.js
  cavecrew-model-overrides.js
  caveman-statusline.sh
  caveman-statusline.ps1
  package.json
)
for f in "${HOOK_FILES[@]}"; do
  cp "$SRC/src/hooks/$f" "$DST/caveman/hooks/$f"
done
cp "$SRC/LICENSE" "$DST/caveman/LICENSE"

find "$DST/skills" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Record what we vendored so the pin in VENDOR.md never goes stale silently.
sed -i.bak -E \
  -e "s|^- \*\*Commit:\*\*.*|- **Commit:** \`$SHA\`|" \
  -e "s|^- \*\*Vendored from upstream date:\*\*.*|- **Vendored from upstream date:** $DATE|" \
  "$DST/caveman/VENDOR.md"
rm -f "$DST/caveman/VENDOR.md.bak"

echo "caveman: updated to $SHA ($DATE)"
echo "caveman: review changes with 'git diff .claude' before committing."
