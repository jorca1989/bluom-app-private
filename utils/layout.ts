import { Dimensions } from 'react-native';

// Per repo rules: tab bar height 65px + insets.bottom.
export const TAB_BAR_HEIGHT = 65;

export function getBottomContentPadding(insetsBottom: number, extra: number = 16) {
  // Content padding should account for OS navigation bars/home indicator.
  // Tab bar sizing is handled by the Tabs navigator itself (`app/(tabs)/_layout.tsx`).
  return Math.max(insetsBottom, 8) + extra;
}

/**
 * Calendar date button size that fits 7 columns inside the Fuel card.
 * Card has marginHorizontal 24 and padding 24 -> inner usable width ≈ screenWidth - 96.
 */
export function getWeekCalendarItemSize(screenWidth: number = Dimensions.get('window').width) {
  const innerWidth = Math.max(0, screenWidth - 96);
  const perItem = Math.floor(innerWidth / 7);
  return Math.max(28, Math.min(40, perItem));
}


