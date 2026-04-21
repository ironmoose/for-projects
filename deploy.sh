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

# ── Commit & tag ─────────────────────────────────────────────────
#
# Stage only the file we actually edited. The built frontend lives at
# src/web/dist/ and is gitignored on purpose — publishing via npm uses the
# `files` field in package.json to include src/, so dist is produced fresh at
# install time. If this repo ever needs to ship pre-built for github:<tag>
# installs, force-add dist here and update .gitignore accordingly.
git add package.json
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
