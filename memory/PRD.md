# Bluom — PRD

## Original Problem Statement (2026-01)
Implement a Multi-Theme Switcher Context using NativeWind v4 for the Bluom Expo app.
- CSS Definitions in `global.css` mapping `--brand-*` CSS variables for theme classes (`.theme-pink`, `.theme-green`, `.theme-navy`, default `#F5F4F0`, pure black, violet).
- React Context at `context/ThemeContext.tsx` managing active theme, persisted via `@react-native-async-storage/async-storage` + Convex cross-device sync.
- Wrap the screen router in `app/_layout.tsx` in a `<View className={themeClass}>`.
- Settings utility component with selection buttons.
- Onboarding inline picker on welcome slide 3 with "Set as my theme colour" popup.

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
- `global.css` — `:root` + `.theme-*` CSS variable classes
- `tailwind.config.js` — `brand-*` color tokens bound to CSS vars + added `./context` to content paths
- `context/ThemeContext.tsx` — `ThemeProvider`, `useTheme()`, `THEMES` catalogue, `THEME_ORDER`, AsyncStorage (`bluom.preferredTheme.v1`) + Convex `preferredTheme` cross-device sync
- `convex/schema.ts` — added optional `preferredTheme: v.string()` on users
- `convex/users.ts` — `updateUser` now accepts `preferredTheme`
- `app/_layout.tsx` — wrapped `InitialLayout` in `<ThemeProvider>`; extracted `ThemedRoot` that renders `<View className={themeClass} style={{ backgroundColor: colors.bg }}>` around the `<Stack>`
- `app/settings.tsx` — new "Theme Colour" row in Preferences opens a modal with all themes as swatch cards
- `app/onboarding.tsx` — inline color-dot picker on welcome slide 3 with confirmation popup ("Set X as my theme?")

## Cross-device sync prerequisite
The new `preferredTheme` field must be deployed to Convex production:
```
yarn convex:deploy
```
Until then, the theme persists locally (AsyncStorage) only and the Convex update is a silent no-op (caught by `console.warn`).

## Test Credentials
N/A (no auth changes).

## Prioritized Backlog
- **P1** Migrate widget-config "Dark Mode" toggle in `(tabs)/profile.tsx` to call `setTheme('black')` / `setTheme('default')` so it stays in sync with the new system.
- **P2** Save `preferredTheme` inside `onboarding.tsx` `handleFinalSubmit` dataToSave payload (currently the popup saves it independently, but adding it to the bulk submit guarantees persistence even if the user picks during the questionnaire flow).
- **P2** Add i18n translation entries (`settings.themeColor`, `settings.themeColorDesc`, `onboarding.welcome.themePrompt`, `onboarding.welcome.themeConfirmTitle/Desc/Cta`) to each locale JSON.
- **P3** Gradually migrate hard-coded `#F5F4F0` / `#ffffff` styles in screens to `brand-*` Tailwind tokens or `useTheme().colors.*` so themes visibly tint full screens (currently the root background + the picker UIs are themed; per-screen StyleSheets still hardcode colors).

## Notes / Open Questions
- Pure-black gradient (`#000000→#1B1A1A`) is stored as `bgGradientFrom/To` in `THEMES.black.colors`. Any screen that wants to render the gradient can wrap a `LinearGradient` with those values — single-color screens just use `colors.bg`.
- The widget dark mode toggle the user mentioned still lives in `app/(tabs)/profile.tsx` (line ~346, `wcDarkLabel`). It is intentionally left untouched in this pass per scope; see P1 above.
