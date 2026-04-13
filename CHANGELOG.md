# Changelog

## [Unreleased]

### Added
- `src/web/src/components/theme/lib-themes.ts` — 4 custom ThemeDefinition objects (deepTeal, ember, nord, synth) mapping app colors to @4lt7ab/ui/core token structure
- `src/web/src/components/theme/compat.ts` — compatibility layer bridging old nested token structure to library CSS var references for incremental migration
- `src/web/src/components/theme/theme-integration.test.ts` — 43 tests covering ThemeDefinition completeness, color preservation, compat token mapping, and backwards compatibility
- `src/web/src/components/atoms/atoms-migration.test.ts` — 53 tests verifying atom/molecule migration to library semantic tokens

### Changed
- `ThemeSwitcher.tsx` — replaced custom swatch-button implementation with re-export of `ThemePicker` from `@4lt7ab/ui/ui`; barrel export preserved as `ThemeSwitcher` alias
- `ThemesPage.tsx` — replaced custom `ThemeCard` grid with library `<ThemePicker />` grid variant with theme descriptions
- `App.tsx` — added `<ThemePicker variant="compact" />` to TopBar trailing area for quick theme switching
- `theme-picker-migration.test.ts` — 9 tests verifying ThemePicker library integration across ThemeSwitcher, ThemesPage, and TopBar
- `ThemeContext.tsx` — replaced hand-rolled ThemeProvider/useTheme with @4lt7ab/ui/core ThemeProvider wrapper + compat bridge; old API preserved for existing components
- `Button.tsx` — migrated to use `semantic` tokens from @4lt7ab/ui/core directly (proof-of-concept for migration pattern); glow effects still use compat theme
- Theme system now uses @4lt7ab/ui/core as the underlying provider (CSS custom properties on document root, automatic localStorage persistence)
- **Phase 2 atom/molecule migration to @4lt7ab/ui/core semantic tokens:**
  - `fieldUtils.tsx` — FieldWrapper and baseFieldStyle now use `t.colorText`, `t.colorSurfaceRaised`, `t.fontSans`, `t.fontSizeSm`, `t.fontSizeXs`, `t.radiusLg`; preserves original spacing values and unmapped `borderSubtle`
  - `Input.tsx`, `Select.tsx`, `Textarea.tsx` — inherit token changes via updated baseFieldStyle; synth glow effects preserved
  - `Badge.tsx` — uses library tokens for colors; introduces `color-mix()` alpha helper for CSS-var-compatible opacity blending; keeps compat `useTheme()` for `tertiary`, `xxs`, glow
  - `IconButton.tsx` — fully migrated, no longer depends on `useTheme()`
  - `Skeleton.tsx` — uses `t.colorSurface`, `t.colorSurfaceRaised`, `t.radiusMd`/`t.radiusLg`; keeps compat for spacing and `borderSubtle`
  - `MetaValue.tsx` — fully migrated, no longer depends on `useTheme()`
  - `SectionLabel.tsx` — uses `t.colorTextSecondary`; keeps compat for `xxs`/`letterSpacing.wide`
  - `StatusDot.tsx` — uses `t.radiusFull`; keeps compat for `motion`/`animation`
  - `ActivityIndicator.tsx` — uses library tokens with `color-mix()` alpha; keeps compat for `xxs`, `animation`
  - `ReferenceTypeBadge.tsx` — uses `t.radiusSm`, `t.fontSans`, `t.colorSurfaceRaised`, `t.colorTextMuted`; keeps compat for `xxs`/`letterSpacing.wide`
  - `Card.tsx` — uses `t.colorSurface`, `t.colorSurfacePanel`, `t.shadowMd`, `t.colorBorder` with `color-mix()` for live variant; keeps compat for `glow`, `radius.xl`, spacing
  - `ExpandableCard.tsx` — uses `t.colorSurfaceRaised`, `t.colorText`, `t.colorTextMuted`, `t.fontSizeSm`, `t.radiusLg`; keeps compat for spacing, `motion`, `font.headline`
  - `EmptyState.tsx` — fully migrated, no longer depends on `useTheme()`
  - `Pagination.tsx` — uses `t.fontSizeSm`, `t.colorTextMuted`, `t.fontSans`; keeps compat for spacing

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
