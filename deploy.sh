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
  # Fall back to package.json version
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

echo "Deploying $TAG..."
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

# ── Typecheck ────────────────────────────────────────────────────
echo "Typechecking..."
bun run typecheck

# ── Test ─────────────────────────────────────────────────────────
echo "Running tests..."
bun test

# ── Build ────────────────────────────────────────────────────────
echo "Building frontend..."
bun run build

# ── Update package.json version ──────────────────────────────────
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# ── Stamp changelog ──────────────────────────────────────────────
if grep -q '\[Unreleased\]' CHANGELOG.md; then
  DATE=$(date +%Y-%m-%d)
  sed -i '' "s/## \[Unreleased\]/## [$VERSION] - $DATE/" CHANGELOG.md
  # Add fresh Unreleased section
  sed -i '' "s/# Changelog/# Changelog\n\n## [Unreleased]/" CHANGELOG.md
  echo "Stamped CHANGELOG.md with [$VERSION] - $DATE"
else
  echo "Warning: no [Unreleased] section in CHANGELOG.md"
fi

# ── Commit & tag ─────────────────────────────────────────────────
git add package.json CHANGELOG.md src/web/dist/
git commit -m "release: v$VERSION"
git tag "$TAG"

# ── Push ─────────────────────────────────────────────────────────
git push origin main --tags

echo ""
echo "Deployed $TAG"
echo ""
echo "Install:"
echo "  \"@x4lt7ab/tab-for-projects\": \"github:4lt7ab/Tab/tab-for-projects#$TAG\""
