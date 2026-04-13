# Changelog

## [Unreleased]

### Fixed
- **White page backgrounds on all 4 themes:** added `css` property to each ThemeDefinition in `lib-themes.ts` so the library's ThemeProvider injects body background-color and color rules, matching the `colorSurfacePage` and `colorText` token values per theme
- **Library built-in themes showing bright backgrounds:** replaced library `ThemePicker` with app-scoped `AppThemePicker` that only shows the 4 custom dark themes (deepTeal, ember, nord, synth), preventing light built-in themes (warm-sand, coral, etc.) from appearing in the picker or being applied via stale localStorage values
- **ThemesPage text contrast:** theme cards now use explicit `var(--color-text)` and `var(--color-text-secondary)` overrides via `useInjectStyles`, fixing unreadable black text on dark surfaces caused by browser button `color: inherit` defaults
- Removed deprecated `baseUrl` from `src/web/tsconfig.json` to avoid TypeScript 7.0 breakage — paths resolution is unaffected since the only alias (`@domain/*`) uses a scoped specifier

### Changed
- **Skeleton atoms:** migrated Skeleton, CardSkeleton, RowSkeleton from local implementations to `@4lt7ab/ui/ui` re-exports — removes compat `useTheme()` dependency; accepts static background in place of shimmer animation
- **Overlay atom:** migrated from local implementation to `@4lt7ab/ui/ui` re-export — gains `ref` forwarding, `role="presentation"`, and theme-aware `colorSurfaceOverlay` token
- ThemesPage migrated from compat `theme.spacing.xl` to library token `t.spaceXl`; removed `useTheme` import
- **SectionLabel atom:** migrated from compat `theme.font.size.xxs` / `theme.font.letterSpacing.wide` to library tokens `t.fontSizeXs` / `t.letterSpacingWide`; removed `useTheme` import
- **ReferenceTypeBadge atom:** same font token migration as SectionLabel; removed `useTheme` import

### Removed
- `ThemeSwitcher.tsx` — thin re-export shim no longer imported by any component (replaced by direct `ThemePicker` import from `@4lt7ab/ui/ui`)
- `theme-picker-migration.test.ts` — migration verification test for the removed ThemeSwitcher shim

### Changed
- Updated CLAUDE.md theme system documentation to reflect completed @4lt7ab/ui integration: compat layer is load-bearing (not temporary), synth glow tokens are the standard pattern

### Added
- `src/web/src/hooks/useFocusTrap.ts` — focus trap hook: saves trigger element, auto-focuses first focusable child, traps Tab/Shift+Tab cycling, restores focus on unmount
- `src/web/src/components/organisms/modal-a11y.test.ts` — 28 tests verifying ModalShell ARIA attributes, focus trap integration, escape key handling, and consumer a11y wiring
- `src/web/src/components/a11y-pass.test.ts` — tests verifying accessibility pass: aria-labels, aria-expanded, landmarks, focus rings, keyboard nav, aria-pressed, toast a11y, skip link
- Skip-to-main-content link in App.tsx — hidden link revealed on focus, targets `#main-content`
- `useFieldFocusStyles()` in fieldUtils — shared `:focus-visible` ring injection for form fields

### Fixed
- **Accessibility pass (Phase 4b):** ExpandableCard now has `aria-expanded`; Input/Select/Textarea have `:focus-visible` rings via `tfp-field` class; TaskTable rows and DocumentTable cards are keyboard-navigable (tabIndex, Enter key); SearchToggle and favorite buttons have `aria-pressed`; ToastContainer has `aria-live="polite"` and `role="status"`; FolderGroup collapse button has `aria-expanded`; `<main>` has `id="main-content"` (removed redundant `role="main"`)

### Fixed
- **ModalShell accessibility:** added `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap via `useFocusTrap` hook, and focus restoration on close
- ModalShell now accepts optional `title` prop (renders accessible h2 with auto-generated ID) and `ariaLabelledBy` prop (for consumers with custom title layouts)
- ConfirmDialog and CreateEntityOverlay migrated to use ModalShell `title` prop instead of rendering duplicate h2 elements
- ShortcutHelpOverlay, GitHubBrowserOverlay, DocumentReaderModal, and ProjectPage task detail modal now pass `ariaLabelledBy` with matching h2 IDs

### Added (continued)
- `src/web/src/components/atoms/animation-styles-migration.test.ts` — 29 tests verifying AnimationStyles migration from inline `<style>` to useInjectStyles
- `src/web/src/components/atoms/hover-migration.test.ts` — 57 tests verifying hover state migration from useState to useInjectStyles CSS pseudo-classes
- `src/web/src/components/theme/lib-themes.ts` — 4 custom ThemeDefinition objects (deepTeal, ember, nord, synth) mapping app colors to @4lt7ab/ui/core token structure
- `src/web/src/components/theme/compat.ts` — compatibility layer bridging old nested token structure to library CSS var references for incremental migration
- `src/web/src/components/theme/theme-integration.test.ts` — 43 tests covering ThemeDefinition completeness, color preservation, compat token mapping, and backwards compatibility
- `src/web/src/components/atoms/atoms-migration.test.ts` — 53 tests verifying atom/molecule migration to library semantic tokens

### Changed
- **Phase 4a: Synth theme decoupling** — removed all `isSynth`/`themeName === 'synth'` branches from 7 component files (Input, Select, Textarea, SearchToggle, tableUtils, TaskTable, ModalShell). Replaced direct `sg()` calls with `theme.glow.*` token references that resolve to animated synth values or static fallbacks. Eliminated `sg()` import from all components — only theme.ts definition still uses it. Documented synth handling architecture in lib-themes.ts file header.
- **Phase 3d: AnimationStyles migration to useInjectStyles** — replaced inline `<style>` element rendering with `useInjectStyles("tfp-animations", css)` from @4lt7ab/ui/core. CSS content extracted to module-level `ANIMATION_CSS` constant. Component now returns `null`. All 19 keyframes, `@property --synth-glow`, `:root[data-synth]` glow cycling, and `prefers-reduced-motion` media query preserved identically.
- **Phase 3a: Migrate hover states to useInjectStyles** — replaced useState-based hover tracking with CSS :hover/:focus-visible pseudo-classes via `useInjectStyles` from @4lt7ab/ui/core:
  - `Button.tsx` — removed useState hover, added CSS hover for all variants; synth glow hover via `[data-synth]` CSS selectors using `var(--synth-glow)`
  - `IconButton.tsx` — added :hover and :focus-visible styles via useInjectStyles
  - `Card.tsx` — removed useState hover, conditional hover via `tfp-card-hoverable` className; synth hover glow via `[data-synth]` CSS
  - `ExpandableCard.tsx` — removed headerHovered state, header hover via CSS `.tfp-expandable-header:hover`
  - `DependencyChip.tsx` — removed useState hover, background hover via CSS
  - `DocumentReferenceCard.tsx` — removed useState hover, detach button show/hide via CSS `.tfp-doc-ref:hover .tfp-doc-ref-detach`
  - `TopBar.tsx` — replaced manual DOM style injection with useInjectStyles; renamed classes to `tfp-topbar-nav-btn`
  - `TaskTable.tsx` — added row hover via CSS `.tfp-task-row:hover`
  - `DocumentTable.tsx` — removed useState hover from DocumentCard; border/shadow/actions-reveal all via CSS; synth hover via `[data-synth]`
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
