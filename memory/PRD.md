# Bluom — PRD

## Original Problem Statement (2026-01)
Implement a Multi-Theme Switcher Context using NativeWind v4 for the Bluom Expo app.
- CSS Definitions in `global.css` mapping `--brand-*` CSS variables for theme classes (`.theme-pink`, `.theme-green`, `.theme-navy`, default `#F5F4F0`, pure black, violet).
- React Context at `context/ThemeContext.tsx` managing active theme, persisted via `@react-native-async-storage/async-storage` + Convex cross-device sync.
- Wrap the screen router in `app/_layout.tsx` in a `<View className={themeClass}>`.
- Settings utility component with selection buttons.
- Onboarding inline picker on welcome slide 3 with "Set as my theme colour" popup.
- Wire legacy Dark Mode toggles to the new system; add one to home tab.
- Translate theme strings into all 16 locales.
- Migrate hardcoded screen and card backgrounds so themes visibly tint the entire app on dark mode.

## Architecture
- **Frontend**: Expo Router (`expo-router@6`) + React Native + NativeWind v4 + Tailwind v3.4
- **Backend**: Convex (`/app/convex`) + Clerk authentication
- **Theme infra**: CSS variables (web) + JS-side `THEMES` catalogue (native) + `createStyles(c: ThemeColors)` factory pattern in main screens, single source of truth in `context/ThemeContext.tsx`.

## Theme Catalogue
| Key | Label | Bg | Surface (card) | Accent | Scheme |
|---|---|---|---|---|---|
| default | Stone | `#F5F4F0` | `#FFFFFF` | `#2563EB` | light |
| pink | Blush | `#FDE7EF` | `#FFFFFF` | `#D6336C` | light |
| green | Meadow | `#DFFFD0` | `#FFFFFF` | `#3A8A5A` | light |
| violet | Iris | `#EFEAFE` | `#FFFFFF` | `#6D28D9` | light |
| navy | Navy | `#1D375A` | `#2B4673` | `#4D5E75` | dark |
| black | Obsidian | `#000000→#1B1A1A` | `#0B0B0B` | `#0A0A0C` | dark |

## What's Been Implemented (2026-01)

### Iteration 1 — Theme infrastructure
- `global.css` — `:root` + `.theme-*` CSS variable classes
- `tailwind.config.js` — `brand-*` color tokens bound to CSS vars
- `context/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, `THEMES`, `THEME_ORDER`, AsyncStorage + Convex `preferredTheme` cross-device sync
- `convex/schema.ts` + `convex/users.ts` — added optional `preferredTheme` field on users + `updateUser` mutation
- `app/_layout.tsx` — wrapped `InitialLayout` in `<ThemeProvider>`; `ThemedRoot` renders `<View className={themeClass} style={{ backgroundColor: colors.bg }}>` around `<Stack>` with `contentStyle.backgroundColor` themed
- `app/settings.tsx` — "Theme Colour" row in Preferences opens a modal grid of swatch cards
- `app/onboarding.tsx` — inline color-dot picker on welcome slide 3 with confirmation popup

### Iteration 2 — i18n + screen-chrome migration
- i18n strings in all 16 locales (en, pt, es, fr, de, nl, pl, sv, no, da, tr, el, bg, ro, lt, lv)
- Screen-level `SafeAreaView` backgrounds themed in all 5 tab screens, all 3 auth screens, settings, onboarding (welcome + questionnaire), and the tab bar (`(tabs)/_layout.tsx`)

### Iteration 3 — Full-app dark mode + card-level migration (CURRENT)
- **`setTheme` is now fire-and-forget** — UI state updates synchronously, AsyncStorage + Convex persist async without blocking. Convex failures (e.g. schema not deployed yet) no longer affect the UI.
- **Five Dark Mode toggles wired** to `setTheme('black' | 'default')`, each with its own `data-testid`:
    - `home-darkmode-toggle` (newly added to `app/(tabs)/index.tsx` customize modal)
    - `fuel-darkmode-toggle` (fixed: was `disabled`, "Coming soon")
    - `move-darkmode-toggle` (fixed: was empty `() => {}`)
    - `wellness-darkmode-toggle` (fixed: was `disabled`, "Coming soon")
    - `profile-darkmode-toggle`
- **Card surfaces migrated** via `createStyles(c: ThemeColors)` factory pattern in 6 files: `profile.tsx`, `fuel.tsx`, `move.tsx`, `wellness.tsx`, `index.tsx`, `settings.tsx`. Color literals inside StyleSheets converted:
    - `#ffffff` / `#fff` → `c.surface`
    - `#F5F4F0` → `c.bg`
    - `#1e293b` / `#0f172a` / `#334155` / `#475569` → `c.text`
    - `#64748b` / `#94a3b8` → `c.textMuted`
    - `#e2e8f0` / `#cbd5e1` → `c.border`
    - `#f8fafc` / `#f1f5f9` → `c.surfaceMuted`
- Module-scope helper components (e.g. `MenuItem`, `Section`, `MiniBar`, KPI helpers) read from a default-theme static fallback at module scope (so they don't crash). These don't react to theme changes — flagged as P2.
- **Onboarding bulk submit now writes `preferredTheme`** through the `onboardUser` Convex mutation (`convex/onboarding.ts` updated to accept and persist the field).
- **Sub-routes themed**: 22 sub-routes had their root container background overridden to `themeColors.bg` via a script (recipes, workouts, todo, mens-health, womens-health, weightmanagement, life-goals, personalized-plan, shopping-list, food-scan-review, sugar-scan-result, sugar-control, habit-hub, move-insights, reflections-hub, pill-reminder, achievements, HealthLogScreen, four-week-plan).
- TypeScript: `tsc --noEmit` passes clean (0 errors).

## Cross-device sync prerequisite
The new `preferredTheme` field must be deployed to Convex:
```
yarn convex:deploy
```
Until deployed, theme persists locally (AsyncStorage) only and Convex mutation calls are silently caught.

## Known Limitations / Remaining Backlog

### P2 — Module-scope helper components use static default-theme styles
`MenuItem`, `Section` (profile), `MiniBar`, `BalStat`, `KPICard` (home), KPI/QuickAction/Hub helpers (wellness) live at module scope and reference the static fallback `s`/`kpiStyles`/etc. They render correctly on light themes but won't re-tint on dark theme switch. Fix: pass styles as props or call `useTheme()` inside each helper. Low priority — these are small sections.

### P3 — Some sub-routes were skipped by the migration script
Files with no clear single root-container pattern (`sugar-dashboard`, `fasting`, `meal-hub`, `music-hub`, `mental-health-plan`, `focus-mode`, `integrations`, `ai-coach`, `ai-meal-maker`, `about`, `support`, `landing`, `premium`) need manual `useTheme()` integration. Same one-line override pattern.

### P3 — Component library (`/app/components/*`)
Shared components (PhotoRecognitionModal, SugarScanModal, BlueCheckin, etc.) still hardcode their own backgrounds. They'll inherit the theme through prop drilling or `useTheme()` per component.

### P3 — Admin section
`app/admin/*.tsx` left untouched (internal tooling, lower priority).

## Test Credentials
N/A (no auth changes).

## Notes / Open Questions
- ThemeProvider is mounted INSIDE the Convex+Clerk providers in `_layout.tsx`. AsyncStorage hydrates first for instant restore; Convex sync overrides once `convexUser` loads (only on first load via `hasSyncedFromConvex` guard).
- `data-testid` on Switch components works for React Native Web and is a no-op on native — kept for testing tooling compatibility.
- Pure-black gradient (`#000000→#1B1A1A`) is exposed as `colors.bgGradientFrom/To` for any screen that wants to use `LinearGradient` (onboarding welcome already does).
