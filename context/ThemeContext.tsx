import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ──────────────────────────────────────────────────────────────────────────────
// Theme catalogue — single source of truth for both NativeWind & JS styling
// ──────────────────────────────────────────────────────────────────────────────

export type ThemeKey = 'default' | 'pink' | 'green' | 'navy' | 'black' | 'violet';

export interface ThemeColors {
  bg: string;
  bgGradientFrom: string;
  bgGradientTo: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  accent: string;
  onPrimary: string;
  scheme: 'light' | 'dark';
}

export interface ThemeDefinition {
  key: ThemeKey;
  label: string;
  className: string;
  swatch: string; // representative color shown in the picker
  colors: ThemeColors;
}

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  default: {
    key: 'default',
    label: 'Stone',
    className: 'theme-default',
    swatch: '#F5F4F0',
    colors: {
      bg: '#F5F4F0',
      bgGradientFrom: '#F5F4F0',
      bgGradientTo: '#F5F4F0',
      surface: '#FFFFFF',
      surfaceMuted: '#F8FAFC',
      text: '#1E293B',
      textMuted: '#64748B',
      border: '#E2E8F0',
      primary: '#2563EB',
      accent: '#2563EB',
      onPrimary: '#FFFFFF',
      scheme: 'light',
    },
  },
  pink: {
    key: 'pink',
    label: 'Blush',
    className: 'theme-pink',
    swatch: '#FDE7EF',
    colors: {
      bg: '#FDE7EF',
      bgGradientFrom: '#FDE7EF',
      bgGradientTo: '#FDE7EF',
      surface: '#FFFFFF',
      surfaceMuted: '#FFF5F8',
      text: '#1E293B',
      textMuted: '#6B6770',
      border: '#F4D2DF',
      primary: '#D6336C',
      accent: '#D6336C',
      onPrimary: '#FFFFFF',
      scheme: 'light',
    },
  },
  green: {
    key: 'green',
    label: 'Meadow',
    className: 'theme-green',
    swatch: '#DFFFD0',
    colors: {
      bg: '#DFFFD0',
      bgGradientFrom: '#DFFFD0',
      bgGradientTo: '#DFFFD0',
      surface: '#FFFFFF',
      surfaceMuted: '#F2FFEC',
      text: '#1E293B',
      textMuted: '#4F6E58',
      border: '#C8E8B8',
      primary: '#3A8A5A',
      accent: '#3A8A5A',
      onPrimary: '#FFFFFF',
      scheme: 'light',
    },
  },
  navy: {
    key: 'navy',
    label: 'Navy',
    className: 'theme-navy',
    swatch: '#1D375A',
    colors: {
      bg: '#1D375A',
      bgGradientFrom: '#1D375A',
      bgGradientTo: '#14253E',
      surface: '#2B4673',
      surfaceMuted: '#23396A',
      text: '#F1F5F9',
      textMuted: '#B7C2D6',
      border: '#4D5E75',
      primary: '#7CA0DA',
      accent: '#4D5E75',
      onPrimary: '#0B1B33',
      scheme: 'dark',
    },
  },
  black: {
    key: 'black',
    label: 'Obsidian',
    className: 'theme-black',
    swatch: '#000000',
    colors: {
      bg: '#000000',
      bgGradientFrom: '#000000',
      bgGradientTo: '#1B1A1A',
      surface: '#1A1A1A', // dark grey — distinguishable from pure black bg
      surfaceMuted: '#262626',
      text: '#F5F5F5',
      textMuted: '#A1A1A6',
      border: '#2B2B2B',
      primary: '#F5F5F5',
      accent: '#1A1A1A',
      onPrimary: '#000000',
      scheme: 'dark',
    },
  },
  violet: {
    key: 'violet',
    label: 'Iris',
    className: 'theme-violet',
    swatch: '#EFEAFE',
    colors: {
      bg: '#EFEAFE',
      bgGradientFrom: '#EFEAFE',
      bgGradientTo: '#EFEAFE',
      surface: '#E0D6FA', // slight tonal variation, not white
      surfaceMuted: '#D0C4F4',
      text: '#241E3F',
      textMuted: '#6B6485',
      border: '#C6B8F0',
      primary: '#6D28D9',
      accent: '#6D28D9',
      onPrimary: '#FFFFFF',
      scheme: 'light',
    },
  },
};

export const THEME_ORDER: ThemeKey[] = ['default', 'pink', 'green', 'violet', 'navy', 'black'];

const STORAGE_KEY = 'bluom.preferredTheme.v1';
const isThemeKey = (v: any): v is ThemeKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(THEMES, v);

// ──────────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeKey;
  themeClass: string;
  colors: ThemeColors;
  themes: ThemeDefinition[];
  setTheme: (key: ThemeKey) => Promise<void> | void;
  isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeKey>('default');
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasSyncedFromConvex, setHasSyncedFromConvex] = useState(false);

  // Clerk + Convex are wrapped above this provider in _layout.tsx.
  // useUser/useQuery are safe to call here; they return undefined when unauthenticated.
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const updateUser = useMutation(api.users.updateUser);

  // 1) Hydrate from AsyncStorage on mount — fastest possible local restore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isThemeKey(stored)) {
          setThemeState(stored);
        }
      } catch {
        // ignore — fall back to default
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Once Convex user loads, treat that as the cross-device source of truth.
  //    Only override the local value on the FIRST sync to avoid overwriting a
  //    user's just-made local change.
  useEffect(() => {
    if (hasSyncedFromConvex) return;
    if (!convexUser) return;
    const remote = (convexUser as any).preferredTheme;
    if (isThemeKey(remote) && remote !== theme) {
      setThemeState(remote);
      AsyncStorage.setItem(STORAGE_KEY, remote).catch(() => null);
    }
    setHasSyncedFromConvex(true);
  }, [convexUser, hasSyncedFromConvex, theme]);

  const setTheme = useCallback(
    async (key: ThemeKey) => {
      if (!isThemeKey(key)) return;
      setThemeState(key);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, key);
      } catch {
        // ignore
      }
      // Persist to Convex for cross-device sync (best-effort).
      if (convexUser?._id) {
        try {
          await updateUser({ userId: convexUser._id, updates: { preferredTheme: key } as any });
        } catch (err) {
          console.warn('Theme: failed to persist to Convex', err);
        }
      }
    },
    [convexUser?._id, updateUser]
  );

  const value = useMemo<ThemeContextValue>(() => {
    const def = THEMES[theme] ?? THEMES.default;
    return {
      theme,
      themeClass: def.className,
      colors: def.colors,
      themes: THEME_ORDER.map((k) => THEMES[k]),
      setTheme,
      isHydrated,
    };
  }, [theme, isHydrated, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so consumers never crash if used outside the provider.
    return {
      theme: 'default',
      themeClass: THEMES.default.className,
      colors: THEMES.default.colors,
      themes: THEME_ORDER.map((k) => THEMES[k]),
      setTheme: async () => {},
      isHydrated: true,
    };
  }
  return ctx;
}
