# Changelog

## [Unreleased]

### Added
- `src/web/src/components/theme/lib-themes.ts` — 4 custom ThemeDefinition objects (deepTeal, ember, nord, synth) mapping app colors to @4lt7ab/ui/core token structure
- `src/web/src/components/theme/compat.ts` — compatibility layer bridging old nested token structure to library CSS var references for incremental migration
- `src/web/src/components/theme/theme-integration.test.ts` — 43 tests covering ThemeDefinition completeness, color preservation, compat token mapping, and backwards compatibility

### Changed
- `ThemeContext.tsx` — replaced hand-rolled ThemeProvider/useTheme with @4lt7ab/ui/core ThemeProvider wrapper + compat bridge; old API preserved for existing components
- `Button.tsx` — migrated to use `semantic` tokens from @4lt7ab/ui/core directly (proof-of-concept for migration pattern); glow effects still use compat theme
- Theme system now uses @4lt7ab/ui/core as the underlying provider (CSS custom properties on document root, automatic localStorage persistence)

## [0.1.9] - 2026-04-13

### Changed
- docker-compose: remove all volumes — containers are now fully ephemeral
- docker-compose: app service behind `app` profile (`docker-compose --profile app up`)
- docker-compose: Postgres on port 3001, Ollama on port 3002 (was 5433/11435)
- Updated all port references across package.json, embedding.ts, smoke tests, README
- CLAUDE.md: "Every Commit" section now includes CLAUDE.md alongside tests and changelog

### Added
- CLAUDE.md: dev environment section with service ports table
- `@4lt7ab/ui` component library dependency (v0.2.12)
- Makefile with build, test, typecheck, verify, deploy, and smoke test targets
- `deploy.sh` — version bumping, build pipeline, changelog stamping, git tagging, and push
- CHANGELOG.md file for tracking changes
- CLAUDE.md: source layout section with annotated directory tree
- CLAUDE.md: how-to procedures for adding routes, migrations, components, MCP tools, and connectors
- CLAUDE.md: gotchas and workarounds section
- CLAUDE.md: expanded frontend architecture section
- CLAUDE.md: "Every Commit" section requiring tests and changelog with every change
- CLAUDE.md: releasing section documenting make deploy workflow
