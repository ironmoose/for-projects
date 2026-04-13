# Changelog

## [Unreleased]

### Fixed
- Add body background CSS rules to app theme definitions (white page fix)
- Replace library ThemePicker with app-scoped AppThemePicker (hide light built-in themes)
- Fix ThemesPage text contrast on dark surfaces
- Remove deprecated `baseUrl` from web tsconfig
- ModalShell: add `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore
- Accessibility pass: focus rings, `aria-expanded`, keyboard nav, `aria-pressed`, skip link

### Changed
- Migrate Skeleton, CardSkeleton, RowSkeleton to `@4lt7ab/ui` re-exports
- Migrate Overlay to `@4lt7ab/ui` re-export
- Migrate ThemesPage to library tokens, remove compat `useTheme`
- Migrate SectionLabel to library font tokens, remove compat `useTheme`
- Migrate ReferenceTypeBadge to library font tokens, remove compat `useTheme`
- Migrate hover states to CSS pseudo-classes via `useInjectStyles` (Button, Card, IconButton, TopBar, TaskTable, DocumentTable, etc.)
- Migrate AnimationStyles from inline `<style>` to `useInjectStyles`
- Decouple synth theme from components via glow tokens (remove `isSynth` branches)
- Migrate atoms/molecules to `@4lt7ab/ui/core` semantic tokens (Phase 2)
- Wire ThemeContext to `@4lt7ab/ui/core` ThemeProvider with compat bridge
- Add compact ThemePicker to TopBar

### Added
- `useFocusTrap` hook
- `useFieldFocusStyles` shared focus ring injection
- Skip-to-main-content link
- `lib-themes.ts` — app ThemeDefinitions for `@4lt7ab/ui/core`
- `compat.ts` — bridge layer from old token shapes to library CSS vars
- Migration test suites (theme integration, atoms migration, hover migration, animation migration, a11y, modal a11y)

### Removed
- `ThemeSwitcher.tsx` shim (unused)
- `theme-picker-migration.test.ts` (no longer needed)

## [0.1.9] - 2026-04-13

### Changed
- docker-compose: remove volumes, app behind `app` profile, ports to 3001/3002

### Added
- `@4lt7ab/ui` component library dependency (v0.2.12)
- Makefile with build, test, deploy targets
- `deploy.sh` version/build/tag pipeline
- CHANGELOG.md
- CLAUDE.md: source layout, how-to procedures, gotchas, frontend architecture, releasing
