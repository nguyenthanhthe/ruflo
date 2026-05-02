# ADR-103: Light theme support for goal_ui

**Status**: Accepted (Phase 1 shipped 2026-05-02)
**Date**: 2026-05-02
**Branch**: `main`
**Relates to**: ADR-093 (original goal_ui design system), ADR-094 (security), ADR-101/102 (recent feature additions)

## Context

Browser walkthroughs against the live deploy (8 captures across desktop/mobile × `prefers-color-scheme: light/dark`) showed the SPA renders identically in both schemes — there is **no light theme**. Three structural reasons:

1. **`src/index.css` defines a dark palette only.** `:root { --background: 0 0% 10%; --foreground: 0 0% 95%; ... }` and there is no `.dark { ... }` (or any other) override block. Tailwind is configured with `darkMode: ["class"]`, but no class is ever toggled because there's only one palette.
2. **No `ThemeProvider` is mounted.** `next-themes@0.3` is in `package.json` and used by `components/ui/sonner.tsx`, but `App.tsx` doesn't wrap the tree with `<ThemeProvider>`, so `useTheme()` returns `'system'` with no class on `<html>`.
3. **Inline color styles bypass the design tokens.** `Index.tsx` carries 17+ hardcoded color literals (`style={{ color: '#f5f5f5' }}`, `'#a3a3a3'`, page-wrapper `backgroundColor: widgetConfig.backgroundColor`). Even if (1) and (2) were fixed, the page chrome would still look dark.

The original `widgetConfig.*` color story was for **embed customization** — third-party sites embed the SPA via `<script>` and tweak colors through `WidgetCustomizer`. That mode is real and needs to survive. But the main app at `goal.ruv.io` shouldn't have its top-level chrome painted by the widget config; only the actual embedded-widget surface should.

## Decision

Add a **complete light theme** while preserving the embed-widget customization story. Three layers:

| Layer | Change |
|---|---|
| **CSS** | Add a full light palette under `:root`, move the current dark palette into `.dark { ... }`. Browser default state (no class) → light; `class="dark"` on `<html>` → dark. |
| **Theme runtime** | Wrap `App` with `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>`. Default stays dark (preserves current visual identity); users on `prefers-color-scheme: light` opt in via system setting; manual toggle persists per-browser. |
| **Page chrome** | Replace hardcoded color literals (`'#f5f5f5'`, `'#a3a3a3'`, `widgetConfig.backgroundColor` on page wrappers) with Tailwind tokens (`text-foreground`, `text-muted-foreground`, `bg-background`). Widget config still drives **embedded widget** chrome (sticky headers, stat cards inside the planning view), where third-party customization legitimately applies. |

## Implementation (Phase 1, this PR)

1. **`src/index.css`** — add light palette as `:root` (background `0 0% 100%`, foreground `0 0% 9%`, primary `262 83% 58%` = the existing brand purple in HSL, etc.). Move current dark palette block to `.dark { ... }`. Keep success/destructive HSL pairs working in both.
2. **`src/App.tsx`** — add `import { ThemeProvider } from 'next-themes'` and wrap the existing tree. Default `dark` so today's visitors see no change.
3. **`src/components/ThemeToggle.tsx`** (new) — sun/moon icon button that toggles `light` ↔ `dark` via `useTheme()`. Suppresses hydration mismatch via `mounted` flag.
4. **`src/pages/Index.tsx`** — drop page-wrapper inline `backgroundColor: widgetConfig.backgroundColor`; the body's `bg-background` from the design-system layer takes over. Replace the most visible hardcoded colors on hero h1/description/preset hint with Tailwind tokens. Keep `widgetConfig.*` on the **stat cards inside the report view**, the **sticky planning header**, and **WidgetCustomizer preview** — those are genuinely widget-embed surfaces.
5. **`src/pages/Agents.tsx`** + **`src/pages/Index.tsx`** — render `<ThemeToggle />` next to the existing nav buttons (Back to Research / Widget Demo / Agent Swarm).

## Phase 2 (deferred)

- **Audit remaining hardcoded colors** in `Demo.tsx`, `ReviseResearchForm.tsx`, and the AgentActivityPanel/CodePreview cluster. Today they're invisible to light-theme users until they navigate into the report view; Phase 2 sweeps them.
- **Make `widgetConfig` theme-responsive.** The default `widgetConfig.backgroundColor: '#1a1a1a'` is dark. When the embedded widget renders inside a light-theme host page, defaults should follow. Approach: make defaults reactive to `useTheme()` and let `WidgetCustomizer` overrides win.
- **Visual regression suite** with Percy or playwright-screenshot diffs. Today the only protection is the live walkthrough.

## Consequences

### Positive
- Users with `prefers-color-scheme: light` see a real light UI on first paint (after Phase 1's chrome refactor lands).
- The `ThemeToggle` is discoverable: a single icon-button in each page header.
- The dark default keeps existing visitors' visual identity intact — nothing changes for them.
- Embed customization still works because `widgetConfig.*` continues to drive the actual widget surface.

### Negative
- Two palettes to maintain. Each new component now needs to be visually checked at both themes (or risk subtle contrast bugs).
- Phase 1 only sweeps the chrome. Deep views (research progress, agent panels) still have hardcoded colors that look fine in dark but may have low-contrast issues in light. Phase 2 mops up.
- next-themes' SSR-safe pattern requires a `mounted` guard on the toggle to avoid hydration mismatches. Easy to forget when adding new theme-sensitive components.

### Risks
- **Flash of unstyled content (FOUC)** on first paint if the dark class isn't applied before React hydrates. next-themes' `<script>` injection handles this for the html-class but not for inline `style={{ backgroundColor }}` — those briefly show widget defaults during hydration. Mitigated by removing the page-wrapper inline backgroundColor in Phase 1 (it was the worst offender).
- **Embed-widget appearance shift.** If a third-party embed page has `prefers-color-scheme: light`, the widget today renders dark. After Phase 2, it would follow theme — which may surprise integrators. Phase 2 will gate on a `forceColorScheme` config flag that defaults to current behaviour.

## Definition of Done

- **Phase 1** (this PR):
  - `:root` carries a light palette; `.dark { ... }` carries the existing dark palette; no other changes to design tokens.
  - `ThemeProvider` mounted in `App.tsx` with `defaultTheme="dark"`.
  - `ThemeToggle` component exists and is visible on `/` and `/agents`.
  - Index.tsx hero (h1, description, page wrapper) uses Tailwind tokens, not literal colors.
  - Browser walkthrough at `prefers-color-scheme: light` and dark both render correctly with 0 console errors.
- **Phase 2** (follow-up, separate PR):
  - Demo.tsx + remaining hardcoded color literals replaced with tokens.
  - Embed widget defaults follow `useTheme()` unless `forceColorScheme` is set.
  - Visual regression suite with at least 5 baseline screenshots per theme.

## References
- ADR-093 — original design system establishment (dark-only palette decision)
- `tailwind.config.ts` — `darkMode: ["class"]` configuration
- `next-themes@^0.3.0` — already in `package.json`, used by `ui/sonner.tsx`
