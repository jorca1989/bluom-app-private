# Bluom — PRD

## Original Problem Statement (2026-01)
Implement a Multi-Theme Switcher Context using NativeWind v4 for the Bluom Expo app.
- CSS Definitions in `global.css` mapping `--brand-*` CSS variables for theme classes (`.theme-pink`, `.theme-green`, `.theme-navy`, default `#F5F4F0`, pure black, violet).
- React Context at `context/ThemeContext.tsx` managing active theme, persisted via `@react-native-async-storage/async-storage` + Convex cross-device sync.
- Wrap the screen router in `app/_layout.tsx` in a `<View className={themeClass}>`.
- Settings utility component with selection buttons.
- Onboarding inline picker on welcome slide 3 with "Set as my theme colour" popup.
- Wire legacy Dark Mode toggle in profile widget config to the new system.
- Translate theme strings into all 16 locales.
- Migrate hardcoded screen backgrounds to themed colors so themes visibly tint full screens.

## Architecture
- **Frontend**: Expo Router (`expo-router@6`) + React Native + NativeWind v4 + Tailwind v3.4
- **Backend**: Convex (`/app/convex`) + Clerk authentication
- **Theme infra**: CSS variables (web) + JS-side `THEMES` catalogue (native), single source of truth in `context/ThemeContext.tsx`.

## Theme Catalogue
| Key | Label | Bg | Accent | Scheme |
|---|---|---|---|---|
| default | Stone | `#F5F4F0` | `#2563EB` | light |
| pink | Blush | `#FDE7EF` | `#D6336C` | light |
| green | Meadow | `#DFFFD0` | `#3A8A5A` | light |
| violet | Iris | `#EFEAFE` | `#6D28D9` | light |
| navy | Navy | `#1D375A` | `#4D5E75` | dark (lighter surface `#2B4673`) |
| black | Obsidian | `#000000→#1B1A1A` | `#0A0A0C` | dark (surface `#0B0B0B`) |

## What's Been Implemented (2026-01)
### Iteration 1 — Theme infrastructure
- `global.css` — `:root` + `.theme-*` CSS variable classes
- `tailwind.config.js` — `brand-*` color tokens bound to CSS vars + added `./context` to content paths
- `context/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, `THEMES` catalogue, `THEME_ORDER`, AsyncStorage (`bluom.preferredTheme.v1`) + Convex `preferredTheme` cross-device sync
- `convex/schema.ts` — added optional `preferredTheme: v.string()` on users
- `convex/users.ts` — `updateUser` now accepts `preferredTheme`
- `app/_layout.tsx` — wrapped `InitialLayout` in `<ThemeProvider>`; extracted `ThemedRoot` that renders `<View className={themeClass} style={{ backgroundColor: colors.bg }}>` around the `<Stack>`
- `app/settings.tsx` — new "Theme Colour" row in Preferences opens a modal with all themes as swatch cards
- `app/onboarding.tsx` — inline color-dot picker on welcome slide 3 with confirmation popup ("Set X as my theme?")

### Iteration 2 — Integration finish-off
- `app/(tabs)/profile.tsx` — legacy widget-config "Dark Mode" toggle now calls `setTheme('black' | 'default')` and reads the active theme; the switch reflects whether navy/black is active.
- **i18n in 16 locales** (en, pt, es, fr, de, nl, pl, sv, no, da, tr, el, bg, ro, lt, lv) — added under `settings.themeColor`, `settings.themeColorDesc`, `onboarding.welcome.themePrompt`, `onboarding.welcome.themeConfirmTitle` (with `{{name}}`), `onboarding.welcome.themeConfirmDesc`, `onboarding.welcome.themeConfirmCta`.
- **Screen-level background migration** to themed colors via inline override on root `SafeAreaView` style props:
    - `app/(tabs)/_layout.tsx` — tab bar bg/border/active/inactive colours + `sceneStyle.backgroundColor` all bound to `useTheme().colors`
    - `app/(tabs)/index.tsx`, `app/(tabs)/fuel.tsx`, `app/(tabs)/move.tsx`, `app/(tabs)/wellness.tsx`, `app/(tabs)/profile.tsx`
    - `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/forgot-password.tsx`
    - `app/settings.tsx`
    - `app/onboarding.tsx` — welcome `LinearGradient` now reads `themeColors.bgGradientFrom/To`, questionnaire SafeAreaView tinted
- TypeScript: `tsc --noEmit` passes clean (0 errors) for the full project.

## Cross-device sync prerequisite
The new `preferredTheme` field must be deployed to Convex production:
```
yarn convex:deploy
```
Until then, the theme persists locally (AsyncStorage) only and the Convex update is a silent no-op (caught by `console.warn`).

## Known Limitations / Backlog

### P1 — Card surface migration (dark themes)
The user noted: *"we can not have whitish cards/widgets on a pure black or navy background"*. Screen-level backgrounds are now themed, but **inline `'#ffffff'` card backgrounds inside StyleSheets are NOT yet migrated** (32 occurrences across the five tab screens + settings). On the **light themes** (default, pink, green, violet) this looks great. On the **dark themes** (navy, black) the cards are still white — strong contrast but stylistically inconsistent. Migrating them requires per-card design QA (text colour, icon colour, border, shadow all cascade). Recommended approach: add a `useThemedSurface()` helper that returns `{ backgroundColor, borderColor, textColor }` and migrate one screen at a time.

### P2 — Onboarding bulk submit
Currently the onboarding theme popup persists the choice directly. The `handleFinalSubmit` payload does NOT include `preferredTheme`. This works (the popup saves immediately), but adding it to the bulk payload would be more defensive.

### P3 — Per-screen sub-routes
Sub-routes like `app/recipes.tsx`, `app/workouts.tsx`, `app/todo.tsx`, `app/admin/*`, `app/mens-health.tsx`, etc. still hardcode `#F5F4F0`. Since these are pushed on top of the themed `Stack` (which now has `contentStyle: { backgroundColor: colors.bg }`), the page-edges may show theme tinting through the SafeAreaView padding, but the screen body remains beige. Same migration pattern as the tabs — add `useTheme()`, override root style.

## Test Credentials
N/A (no auth changes).

## Notes / Open Questions
- Pure-black gradient (`#000000→#1B1A1A`) is stored as `bgGradientFrom/To` in `THEMES.black.colors`. Onboarding's welcome `LinearGradient` already uses these — black theme renders the gradient automatically there. Other screens use solid `colors.bg`.
- ThemeProvider is mounted INSIDE the Convex+Clerk providers in `_layout.tsx`, so it can hydrate the Convex-stored `preferredTheme` once `convexUser` loads. AsyncStorage is read first for instant restore on app boot.
