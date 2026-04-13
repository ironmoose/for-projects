# Changelog

## [Unreleased]

- Add body background CSS rules to app theme definitions (white page fix)
- Replace library ThemePicker with app-scoped AppThemePicker (hide light built-in themes)
- Fix ThemesPage text contrast on dark surfaces
- Remove deprecated `baseUrl` from web tsconfig
- ModalShell: add `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore
- Accessibility pass: focus rings, `aria-expanded`, keyboard nav, `aria-pressed`, skip link
- Migrate Skeleton, CardSkeleton, RowSkeleton to `@4lt7ab/ui` re-exports
- Migrate Overlay to `@4lt7ab/ui` re-export
- Migrate ThemesPage to library tokens, remove compat `useTheme`
- Migrate SectionLabel to library font tokens, remove compat `useTheme`
- Migrate ReferenceTypeBadge to library font tokens, remove compat `useTheme`
- Migrate hover states to CSS pseudo-classes via `useInjectStyles`
- Migrate AnimationStyles from inline `<style>` to `useInjectStyles`
- Decouple synth theme from components via glow tokens (remove `isSynth` branches)
- Migrate atoms/molecules to `@4lt7ab/ui/core` semantic tokens
- Wire ThemeContext to `@4lt7ab/ui/core` ThemeProvider with compat bridge
- Add compact ThemePicker to TopBar
- Add `useFocusTrap` hook
- Add `useFieldFocusStyles` shared focus ring injection
- Add skip-to-main-content link
- Add `lib-themes.ts` app ThemeDefinitions for `@4lt7ab/ui/core`
- Add `compat.ts` bridge layer from old token shapes to library CSS vars
- Add migration test suites (theme, atoms, hover, animation, a11y, modal)
- Remove `ThemeSwitcher.tsx` shim (unused)
- Remove `theme-picker-migration.test.ts` (no longer needed)
- Migrate BackButton, Pagination, MetadataTable off compat `useTheme`
- Migrate ListPageLayout, DisconnectionBanner, Toast off compat `useTheme`
- Migrate ConfirmDialog, CreateEntityOverlay, CreateProjectOverlay, CreateTaskOverlay off compat `useTheme`

## [0.1.9] - 2026-04-13

- Remove docker-compose volumes, app behind `app` profile, ports to 3001/3002
- Add `@4lt7ab/ui` component library dependency (v0.2.12)
- Add Makefile with build, test, deploy targets
- Add `deploy.sh` version/build/tag pipeline
- Add CHANGELOG.md
- Add CLAUDE.md: source layout, how-to procedures, gotchas, frontend architecture, releasing
