# Phase 1: Project Scaffolding & Theme - Research

**Researched:** 2026-03-13
**Domain:** React/Vite/TypeScript project scaffolding, Tailwind CSS 4 dark theming, Zustand state management
**Confidence:** HIGH

## Summary

This phase creates the foundational application shell for an Iran Conflict Monitor dashboard. The stack is locked: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 4 + Zustand 5. The project is greenfield with no existing code. The scaffold uses `npm create vite@6` with the `react-ts` template, then adds Tailwind CSS 4 via its first-party Vite plugin (`@tailwindcss/vite`), and Zustand for state management.

Tailwind CSS v4 has fundamentally changed from v3: configuration is now CSS-first using `@theme` directives and `@layer` blocks instead of `tailwind.config.js`. Custom colors are defined as CSS variables in `--color-*` namespace. This is critical because most guides and training data reference the v3 approach, which is wrong for this project.

The dark theme is the default (and only) theme -- this is a dark-mode-only intelligence dashboard. No light/dark toggle is needed. Colors are deliberately restrained: black/white primary palette with blue, red, green, and yellow accent colors that carry semantic meaning (blue=naval/friendly, red=hostile/strikes, green=confirmed/safe, yellow=warning/unconfirmed).

**Primary recommendation:** Scaffold with `npm create vite@6 my_world -- --template react-ts`, add `@tailwindcss/vite` + `tailwindcss` + `zustand`, define a CSS-first dark theme with semantic color tokens, and create placeholder layout regions for the full-screen map with floating HUD-style overlays.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-screen map layout with floating overlays -- map fills entire viewport
- All controls, panels, and counters float on top of the map with semi-transparent dark backgrounds
- Detail panel slides in from the left edge (~320px wide) when an entity is clicked
- Layer toggles and filter controls positioned in the top-right corner, filters expand as dropdown
- Analytics counters (strikes, sorties, intercepts) in a floating card in the top-left, collapsible
- Title/branding in top-left area (above or near the counters card)
- Shell placeholder regions: top-left (title + counters slot), top-right (layer toggles + filters slot), left edge (slide-in detail panel slot, hidden by default), center (full-viewport map container)
- All overlay slots should be defined as layout regions with z-index layering

### Claude's Discretion
- Exact dark background shade and overlay opacity levels
- Typography choices (font family, sizes, weights)
- Spacing and padding within overlay panels
- Grid line treatment (visible/subtle)
- Title text and branding style
- Responsive behavior at different viewport sizes
- Directory structure organization (components, hooks, stores, api)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-02 | Dark theme with clean grid layout (black/white primary, blue/red/green/yellow accents only) | Tailwind CSS 4 @theme directive for semantic color tokens; CSS-first dark theming via @layer base; opacity modifier syntax (bg-black/80) for overlay panels |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UI framework | Latest stable React; component model fits dashboard panels |
| react-dom | 19.2.4 | React DOM renderer | Required peer of React 19 |
| vite | ^6.4.1 | Build tool & dev server | Locked per STATE.md; fast HMR, native ESM |
| typescript | ~5.9.3 | Type safety | Latest TS 5.x; strict mode enabled. Avoid TS 6 (releasing 2026-03-17, breaking changes) |
| tailwindcss | ^4.2.1 | Utility-first CSS | Locked per STATE.md; v4 has CSS-first config, first-party Vite plugin |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin | Required for Tailwind v4 + Vite integration (replaces PostCSS approach) |
| zustand | ^5.0.11 | State management | Locked per STATE.md; minimal boilerplate, TypeScript-first |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | ^6.0.1 | React Fast Refresh in Vite | Required for React HMR in development |

### Dev Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | latest | React type definitions | TypeScript compilation |
| @types/react-dom | latest | ReactDOM type definitions | TypeScript compilation |
| eslint | ^10.0.3 | Linting | Included in Vite template |
| vitest | ^3.2.4 | Test framework | Unit/component testing (Vite-native) |
| @testing-library/react | ^16.3.2 | React component testing | Rendering components in tests |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers | Extends expect with DOM matchers |
| jsdom | ^28.1.0 | DOM simulation | Test environment for Vitest |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite 6 | Vite 8 (latest) | Vite 8 uses Rolldown/Oxc; too bleeding-edge, stick with locked v6 |
| TypeScript 5.9 | TypeScript 6.0 | TS 6.0 releases March 17 with breaking changes; use stable 5.x |
| Vitest 3.x | Vitest 4.x | Vitest 4 supports Vite 6, but 3.x is more battle-tested with Vite 6 |

**Installation:**
```bash
# Scaffold project
npm create vite@6 . -- --template react-ts

# Add Tailwind CSS 4 with Vite plugin
npm install tailwindcss @tailwindcss/vite

# Add Zustand
npm install zustand

# Add test dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── layout/          # Shell layout components (AppShell, overlay regions)
│   └── ui/              # Shared UI primitives (cards, buttons, panels)
├── hooks/               # Custom React hooks
├── stores/              # Zustand store definitions
├── api/                 # API client modules (future phases)
├── types/               # Shared TypeScript type definitions
├── styles/              # Global CSS (app.css with @theme, @layer)
├── App.tsx              # Root component with shell layout
├── main.tsx             # Entry point
└── vite-env.d.ts        # Vite type declarations
```

### Pattern 1: CSS-First Dark Theme with Tailwind v4
**What:** Define all design tokens as CSS variables using `@theme` and `@layer base`, consumed by Tailwind utility classes.
**When to use:** Always -- this is how Tailwind v4 works. No `tailwind.config.js` needed.
**Example:**
```css
/* src/styles/app.css */
@import "tailwindcss";

/* Define semantic color tokens */
@theme {
  /* Accent colors with semantic meaning */
  --color-accent-blue: oklch(0.623 0.214 259.1);     /* naval/friendly */
  --color-accent-red: oklch(0.577 0.245 27.33);       /* hostile/strikes */
  --color-accent-green: oklch(0.723 0.219 149.58);    /* confirmed/safe */
  --color-accent-yellow: oklch(0.795 0.184 86.05);    /* warning/unconfirmed */

  /* Surface colors for overlays */
  --color-surface: oklch(0.145 0 0);                  /* near-black panels */
  --color-surface-elevated: oklch(0.185 0 0);         /* slightly lighter panels */

  /* Text colors */
  --color-text-primary: oklch(0.95 0 0);              /* white-ish */
  --color-text-secondary: oklch(0.7 0 0);             /* muted gray */
  --color-text-muted: oklch(0.5 0 0);                 /* dim gray */

  /* Z-index scale for overlay layering */
  --z-map: 0;
  --z-overlay: 10;
  --z-panel: 20;
  --z-controls: 30;
  --z-modal: 40;

  /* Panel dimensions */
  --width-detail-panel: 320px;
}

/* Dark base styles */
@layer base {
  html {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}
```

### Pattern 2: Full-Screen Map Shell with Floating Overlays
**What:** A layout where the map fills the entire viewport and all UI elements float on top with absolute/fixed positioning and z-index layering.
**When to use:** This is the locked layout decision for this project.
**Example:**
```tsx
// src/components/layout/AppShell.tsx
export function AppShell() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface">
      {/* Map container - fills viewport */}
      <div className="absolute inset-0 z-[var(--z-map)]">
        {/* Map component will be injected here in Phase 2 */}
        <div className="h-full w-full bg-surface" />
      </div>

      {/* Top-left: Title + Counters */}
      <div className="absolute top-4 left-4 z-[var(--z-overlay)] flex flex-col gap-3">
        <TitleSlot />
        <CountersSlot />
      </div>

      {/* Top-right: Layer toggles + Filters */}
      <div className="absolute top-4 right-4 z-[var(--z-controls)] flex flex-col gap-2 items-end">
        <LayerTogglesSlot />
        <FiltersSlot />
      </div>

      {/* Left edge: Detail panel (hidden by default) */}
      <DetailPanelSlot />
    </div>
  );
}
```

### Pattern 3: Zustand Store with TypeScript
**What:** Type-safe Zustand stores using the curried `create<T>()()` pattern.
**When to use:** All state management in this project.
**Example:**
```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  isDetailPanelOpen: boolean;
  isCountersCollapsed: boolean;
  isFiltersExpanded: boolean;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleCounters: () => void;
  toggleFilters: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isDetailPanelOpen: false,
  isCountersCollapsed: false,
  isFiltersExpanded: false,
  openDetailPanel: () => set({ isDetailPanelOpen: true }),
  closeDetailPanel: () => set({ isDetailPanelOpen: false }),
  toggleCounters: () => set((s) => ({ isCountersCollapsed: !s.isCountersCollapsed })),
  toggleFilters: () => set((s) => ({ isFiltersExpanded: !s.isFiltersExpanded })),
}));
```

### Pattern 4: Overlay Panel Component
**What:** Semi-transparent dark panels that float over the map with HUD-style aesthetics.
**When to use:** All overlay UI elements.
**Example:**
```tsx
// src/components/ui/OverlayPanel.tsx
interface OverlayPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function OverlayPanel({ children, className = '' }: OverlayPanelProps) {
  return (
    <div className={`rounded-lg border border-white/10 bg-surface/85
                      px-4 py-3 shadow-lg backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Using tailwind.config.js:** Tailwind v4 uses CSS-first configuration via `@theme`. Do NOT create a `tailwind.config.js` file.
- **Using PostCSS for Tailwind:** Tailwind v4 with Vite uses the `@tailwindcss/vite` plugin, not PostCSS. Do NOT create `postcss.config.js`.
- **Using `darkMode: 'class'` config:** This is Tailwind v3 syntax. In v4, dark mode uses `@custom-variant` or the default `prefers-color-scheme`. Since this is a dark-only app, no dark mode variant is needed at all.
- **Content globs in config:** Tailwind v4 auto-detects content files. No need to specify content paths.
- **Using `bg-opacity-*` classes:** Deprecated in v4. Use the slash modifier: `bg-black/50` instead of `bg-black bg-opacity-50`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS utility framework | Custom CSS classes for spacing, colors, layout | Tailwind CSS 4 | Thousands of edge cases in responsive design, dark mode |
| Build tooling | Webpack/Rollup config | Vite 6 with `react-ts` template | HMR, TypeScript, production builds all pre-configured |
| UI state management | React Context + useReducer | Zustand 5 | Re-render optimization, devtools, persistence middleware |
| CSS reset/normalize | Custom reset stylesheet | Tailwind's Preflight (included via `@import "tailwindcss"`) | Cross-browser consistency |
| Dev server with HMR | Custom Node.js dev server | Vite dev server (`npm run dev`) | Fast cold start, instant HMR |

**Key insight:** The Vite `react-ts` template provides a working TypeScript + React setup out of the box. Adding Tailwind v4 is two steps: install packages, add the Vite plugin. Do not over-engineer the scaffold.

## Common Pitfalls

### Pitfall 1: Using Tailwind v3 Configuration Patterns with v4
**What goes wrong:** Creating `tailwind.config.js`, adding PostCSS config, specifying content paths, using `darkMode: 'class'` -- none of this applies to v4.
**Why it happens:** Most documentation, tutorials, and AI training data reference v3 patterns.
**How to avoid:** Use ONLY `@import "tailwindcss"` in CSS, `@theme` for design tokens, and `@tailwindcss/vite` plugin. No JS config file.
**Warning signs:** Error about missing `tailwind.config.js`, PostCSS errors, classes not being generated.

### Pitfall 2: TypeScript 6.0 Accidental Installation
**What goes wrong:** Running `npm install typescript` without a version pin installs TS 6.0 (releasing March 17, 2026) with breaking changes including deprecated ES5 targets and changed module defaults.
**Why it happens:** TS 6.0 becomes `latest` on npm around March 17.
**How to avoid:** Pin to `typescript@~5.9.3` in package.json. The Vite template should handle this, but verify after scaffolding.
**Warning signs:** Deprecation warnings for `target: "ES2020"`, unexpected module resolution changes.

### Pitfall 3: Zustand TypeScript Curried Create Pattern
**What goes wrong:** Using `create<State>((set) => ...)` without the extra parentheses causes type inference to break.
**Why it happens:** TypeScript limitation requires curried function for proper generics inference.
**How to avoid:** Always use `create<State>()((set) => ...)` -- note the extra `()` before the implementation function.
**Warning signs:** Type errors on `set` function, loss of autocompletion.

### Pitfall 4: Vite Template Cleanup
**What goes wrong:** Leaving the default Vite template demo code (counter app, React logo, demo CSS) in the project, creating confusion.
**Why it happens:** `create vite` scaffolds with example components that need to be replaced.
**How to avoid:** Remove all demo content from `App.tsx`, `App.css`, `index.css` after scaffolding. Replace with the shell layout and theme CSS immediately.
**Warning signs:** Seeing the Vite + React logo splash page instead of the dark dashboard shell.

### Pitfall 5: Z-Index Chaos with Overlays
**What goes wrong:** Overlay elements render behind the map or behind each other unpredictably.
**Why it happens:** Stacking context issues; each `position: relative` or `transform` creates a new stacking context.
**How to avoid:** Define a clear z-index scale (map=0, overlay=10, panel=20, controls=30, modal=40) and apply it consistently. Use CSS variables for the scale.
**Warning signs:** Panels disappearing behind the map container, click events not reaching overlay elements.

### Pitfall 6: Missing `type: "module"` or Incorrect Module Config
**What goes wrong:** ESM import errors, `require` vs `import` conflicts.
**Why it happens:** Node 25 defaults may differ from expectations; Vite requires ESM.
**How to avoid:** The Vite template sets `"type": "module"` in package.json. Do not remove it.
**Warning signs:** `ERR_REQUIRE_ESM`, `Cannot use import statement outside a module`.

## Code Examples

Verified patterns from official sources:

### Vite Config with React + Tailwind v4 Plugins
```typescript
// vite.config.ts
// Source: https://tailwindcss.com/docs (Tailwind v4 Vite installation)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
});
```

### tsconfig.json (Strict Mode)
```json
// Source: Vite react-ts template + project requirements
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

### CSS Entry Point with Theme Tokens
```css
/* src/styles/app.css */
/* Source: https://tailwindcss.com/docs/theme */
@import "tailwindcss";

@theme {
  /* Accent palette -- semantic colors per PROJECT.md */
  --color-accent-blue: oklch(0.623 0.214 259.1);
  --color-accent-red: oklch(0.577 0.245 27.33);
  --color-accent-green: oklch(0.723 0.219 149.58);
  --color-accent-yellow: oklch(0.795 0.184 86.05);

  /* Surface palette -- dark backgrounds */
  --color-surface: oklch(0.145 0 0);
  --color-surface-elevated: oklch(0.185 0 0);
  --color-surface-overlay: oklch(0.165 0 0 / 85%);

  /* Text palette */
  --color-text-primary: oklch(0.95 0 0);
  --color-text-secondary: oklch(0.7 0 0);
  --color-text-muted: oklch(0.5 0 0);

  /* Border */
  --color-border: oklch(1 0 0 / 10%);
  --color-border-accent: oklch(1 0 0 / 20%);

  /* Z-index scale */
  --z-map: 0;
  --z-overlay: 10;
  --z-panel: 20;
  --z-controls: 30;
  --z-modal: 40;

  /* Layout dimensions */
  --width-detail-panel: 320px;
}

@layer base {
  html {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

### Slide-In Detail Panel Component
```tsx
// src/components/layout/DetailPanelSlot.tsx
import { useUIStore } from '../../stores/uiStore';
import { OverlayPanel } from '../ui/OverlayPanel';

export function DetailPanelSlot() {
  const isOpen = useUIStore((s) => s.isDetailPanelOpen);
  const close = useUIStore((s) => s.closeDetailPanel);

  return (
    <div
      className={`absolute top-0 left-0 z-[var(--z-panel)] h-full
                   w-[var(--width-detail-panel)] transform transition-transform
                   duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="h-full bg-surface/95 border-r border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary text-sm font-semibold uppercase tracking-wider">
            Details
          </h2>
          <button
            onClick={close}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
        {/* Detail content will be rendered here by later phases */}
        <p className="text-text-secondary text-sm">Select an entity on the map</p>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS config) | @theme directive (CSS-first config) | Tailwind CSS 4.0, Jan 2025 | No JS config file needed; all tokens in CSS |
| PostCSS plugin for Tailwind | @tailwindcss/vite Vite plugin | Tailwind CSS 4.0 | Simpler setup, better HMR performance |
| Content glob patterns | Auto-detection | Tailwind CSS 4.0 | No content configuration needed |
| bg-opacity-50 utilities | bg-black/50 slash modifier | Tailwind CSS 3.1+ (standard in 4.0) | Simpler syntax, more intuitive |
| forwardRef for refs | ref as prop | React 19 | Cleaner component APIs |
| Zustand create without currying | create<T>()() curried pattern | Zustand 5 | Better TypeScript inference |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts`: Replaced by `@theme` in CSS. Still works via `@config` directive but discouraged.
- `postcss.config.js` for Tailwind: Replaced by `@tailwindcss/vite` plugin.
- `darkMode: 'class'` config option: Replaced by `@custom-variant dark` in CSS.
- `bg-opacity-*` utilities: Use slash modifier syntax instead.
- `forwardRef`: No longer needed in React 19; refs are regular props.

## Open Questions

1. **Inter font loading**
   - What we know: system-ui is the fallback; Inter is a common dashboard font
   - What's unclear: Whether to bundle Inter via npm package (@fontsource/inter) or use system fonts only
   - Recommendation: Use `@fontsource/inter` for consistent typography across platforms. It's 15KB for the latin subset. If the planner prefers zero external fonts, system-ui works fine.

2. **Vite path aliases**
   - What we know: Deep imports like `../../stores/uiStore` get unwieldy
   - What's unclear: Whether to set up `@/` path alias immediately or defer
   - Recommendation: Set up `@/` alias in vite.config.ts and tsconfig.json in this phase to avoid refactoring later. Minimal effort, high payoff.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| Config file | vite.config.ts (Vitest reads Vite config) or vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-02-a | App renders without crashing | smoke | `npx vitest run src/__tests__/App.test.tsx -t "renders"` | No -- Wave 0 |
| INFRA-02-b | Dark theme CSS variables are defined | unit | `npx vitest run src/__tests__/theme.test.ts -t "theme"` | No -- Wave 0 |
| INFRA-02-c | Shell layout has all placeholder regions | unit | `npx vitest run src/__tests__/AppShell.test.tsx -t "layout"` | No -- Wave 0 |
| INFRA-02-d | Zustand UI store toggles work | unit | `npx vitest run src/__tests__/uiStore.test.ts -t "store"` | No -- Wave 0 |
| INFRA-02-e | TypeScript strict compilation passes | smoke | `npx tsc --noEmit` | N/A (tsc itself) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/App.test.tsx` -- covers INFRA-02-a (app renders)
- [ ] `src/__tests__/AppShell.test.tsx` -- covers INFRA-02-c (layout regions)
- [ ] `src/__tests__/uiStore.test.ts` -- covers INFRA-02-d (Zustand store)
- [ ] `src/__tests__/theme.test.ts` -- covers INFRA-02-b (theme variables)
- [ ] `vitest.config.ts` or test config in `vite.config.ts` -- test environment setup (jsdom)
- [ ] `src/test/setup.ts` -- jest-dom matchers setup
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS Theme Variables docs](https://tailwindcss.com/docs/theme) -- @theme directive, --color-* namespace, CSS-first configuration
- [Tailwind CSS Dark Mode docs](https://tailwindcss.com/docs/dark-mode) -- @custom-variant, prefers-color-scheme default, class-based toggle
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 architecture changes, Vite plugin, auto-detection
- [Vite Getting Started](https://vite.dev/guide/) -- create vite command, templates, Node requirements
- [npm registry](https://www.npmjs.com/) -- verified versions: vite 6.4.1, tailwindcss 4.2.1, @tailwindcss/vite 4.2.1, zustand 5.0.11, react 19.2.4, typescript 5.9.3, vitest 3.2.4
- [React versions page](https://react.dev/versions) -- React 19.2.4 confirmed latest

### Secondary (MEDIUM confidence)
- [Vite react-ts template on GitHub](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) -- template file structure, tsconfig patterns
- [TypeScript 6.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/) -- breaking changes, March 17 release date
- [Zustand GitHub](https://github.com/pmndrs/zustand) -- TypeScript curried create pattern, v5 changes

### Tertiary (LOW confidence)
- [Various Medium articles on React folder structure 2025-2026](https://dev.to/pramod_boda/recommended-folder-structure-for-react-2025-48mc) -- directory organization patterns (subjective, varies by project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified on npm, compatibility confirmed
- Architecture: HIGH -- Tailwind v4 patterns verified with official docs, layout decisions locked by user
- Pitfalls: HIGH -- Tailwind v3->v4 migration is well-documented, TS 6 release date confirmed
- Testing: MEDIUM -- Vitest + Vite 6 compatibility verified, but specific test patterns are standard practice

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days -- stable stack, no fast-moving dependencies)
