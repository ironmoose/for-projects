#!/usr/bin/env bash
set -euo pipefail

# ── Resolve version ──────────────────────────────────────────────
# Usage:
#   ./deploy.sh          → bump patch  (0.1.8 → 0.1.9)
#   ./deploy.sh minor    → bump minor  (0.1.8 → 0.2.0)
#   ./deploy.sh major    → bump major  (0.1.8 → 1.0.0)
#   ./deploy.sh 2.0.0    → use exact version

BUMP="${1:-patch}"

LATEST=$(git tag -l 'v*' --sort=-v:refname | head -n1 | sed 's/^v//')
if [[ -z "$LATEST" ]]; then
  # No tags — fall back to package.json version.
  LATEST=$(grep '"version"' package.json | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$LATEST"

case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  [0-9]*) IFS='.' read -r MAJOR MINOR PATCH <<< "$BUMP" ;;
  *) echo "Usage: ./deploy.sh [patch|minor|major|x.y.z]"; exit 1 ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists."
  exit 1
fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Error: deploy must run from 'main' branch (currently on '$CURRENT_BRANCH')."
  exit 1
fi

echo "Deploying $TAG from branch $CURRENT_BRANCH..."
echo ""

# ── Preflight ────────────────────────────────────────────────────
echo "Checking remote access..."
if ! git ls-remote --exit-code origin >/dev/null 2>&1; then
  echo "Error: cannot reach remote 'origin'. Fix auth before deploying."
  exit 1
fi

echo "Checking working tree..."
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is dirty. Commit or stash changes first."
  exit 1
fi

# ── Verify ──────────────────────────────────────────────────────
echo "Typechecking..."
bun run typecheck

echo "Running tests..."
bun test

echo "Building frontend..."
bun run build

# ── Update package.json version ──────────────────────────────────
#
# `sed -i ''` is BSD-compatible (macOS) — the single-quote arg to `-i` is the
# (empty) backup extension. GNU sed tolerates it too if there's a space.
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# ── Stamp CHANGELOG ──────────────────────────────────────────────
#
# BSD sed (macOS) does NOT interpret `\n` in the replacement side — it writes
# a literal `\n`. Historical deploys using `sed ... 's/X/Y\n\nZ/'` mangled the
# CHANGELOG every run, which is why this repo is full of "fix: version"
# cleanup commits and has zero `release: vX.Y.Z` commits.
#
# Use Bun to do the file transform properly and portably: rename
# `## [Unreleased]` → `## [VERSION] - DATE`, then insert a fresh
# `## [Unreleased]` block right under `# Changelog`.
if grep -q '^## \[Unreleased\]' CHANGELOG.md; then
  DATE=$(date +%Y-%m-%d)
  export VERSION DATE
  bun -e '
    import { readFileSync, writeFileSync } from "node:fs";
    const path = "CHANGELOG.md";
    const { VERSION, DATE } = process.env;
    let c = readFileSync(path, "utf8");
    // 1. Rename the first `## [Unreleased]` heading line to the dated release.
    //    Match just the heading + its trailing newline so surrounding blank
    //    lines are preserved verbatim.
    c = c.replace(/^## \[Unreleased\]\n/m, `## [${VERSION}] - ${DATE}\n`);
    // 2. Insert a fresh `## [Unreleased]` block right after the top header.
    //    `# Changelog\n\n` is the canonical top-of-file; we rebuild it to
    //    `# Changelog\n\n## [Unreleased]\n\n` so the new block has a blank
    //    line on each side.
    c = c.replace(/^# Changelog\n\n/, "# Changelog\n\n## [Unreleased]\n\n");
    writeFileSync(path, c);
  '
  echo "Stamped CHANGELOG.md with [$VERSION] - $DATE"
else
  echo "Error: no [Unreleased] section in CHANGELOG.md to stamp."
  echo "Fix CHANGELOG.md and re-run."
  # Roll back the package.json edit so the working tree is clean for the next try.
  git checkout -- package.json
  exit 1
fi

# ── Commit & tag ─────────────────────────────────────────────────
#
# Stage only the two files we actually edited. The built frontend lives at
# src/web/dist/ and is gitignored on purpose — publishing via npm uses the
# `files` field in package.json to include src/, so dist is produced fresh at
# install time. If this repo ever needs to ship pre-built for github:<tag>
# installs, force-add dist here and update .gitignore accordingly.
git add package.json CHANGELOG.md
git commit -m "release: $TAG"
git tag "$TAG"

# ── Push (atomic: all-or-nothing) ────────────────────────────────
#
# `--atomic` makes the branch + tag push succeed or fail together — no more
# state where the tag exists locally but never made it to origin (or vice
# versa). Scope to the specific tag; never push `--tags` which would try to
# re-push every stale tag from past aborted runs.
#
# On failure, roll back the local commit + tag so the next `make deploy`
# starts from a clean slate instead of fighting the preflight working-tree
# check.
if ! git push --atomic origin main "$TAG"; then
  echo ""
  echo "Error: push failed. Rolling back local commit and tag."
  git tag -d "$TAG"
  git reset --hard HEAD^
  echo "Local state restored to pre-deploy. Fix the push issue and re-run."
  exit 1
fi

echo ""
echo "Deployed $TAG"
echo ""
echo "Install:"
echo "  \"@x4lt7ab/tab-for-projects\": \"github:4lt7ab/projects#$TAG\""
