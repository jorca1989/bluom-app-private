/**
 * Color System for Bluom.App
 * Following the design system requirements
 */

export const Colors = {
  // Primary Colors
  fuel: "#3b82f6", // Fuel (Nutrition) - Blue
  move: "#10b981", // Move (Fitness) - Green
  wellness: "#8b5cf6", // Wellness (Mind) - Purple
  premium: "#ec4899", // Premium - Pink

  // Status Colors
  success: "#16a34a",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  // Neutral Colors
  white: "#ffffff",
  black: "#000000",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",

  // Background & Surface
  background: "#f9fafb",
  surface: "#ffffff",
  surfaceSecondary: "#f3f4f6",

  // Text Colors
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  textInverse: "#ffffff",

  // Macro Colors
  protein: "#ef4444", // Red
  carbs: "#3b82f6", // Blue
  fat: "#f59e0b", // Yellow/Orange
  calories: "#8b5cf6", // Purple
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
