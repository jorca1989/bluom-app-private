/**
 * components/AchievementsCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Simplified home screen widget — shows unlock count, level,
 * "See all" link, recent badge icons in a row, and XP bar.
 * Taps through to /achievements for the full view.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ALL_ACHIEVEMENTS,
  RARITY_CONFIG,
} from '@/convex/Achievementsconfig';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';

// ── XP needed for next level ──
function xpForLevel(level: number): number {
  return level * 500;
}

// ── Badge icon circle ──
function BadgeIcon({ badgeId, unlocked, themeColors }: { badgeId: string; unlocked: boolean; themeColors: ThemeColors }) {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!def) return null;
  const rc = RARITY_CONFIG[def.rarity];
  return (
    <View style={[ac.badgeCircle, { backgroundColor: unlocked ? `${rc.color}28` : themeColors.surfaceMuted }]}>
      <Text style={[ac.badgeEmoji, !unlocked && { opacity: 0.3 }]}>{def.icon}</Text>
      {!unlocked && (
        <View style={ac.lockOverlay}>
          <Text style={{ fontSize: 8, color: themeColors.textMuted }}>🔒</Text>
        </View>
      )}
    </View>
  );
}

// ── Badge with label ──
function BadgeWithLabel({ badgeId, unlocked, themeColors }: { badgeId: string; unlocked: boolean; themeColors: ThemeColors }) {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!def) return null;
  const { t } = useTranslation();
  const rc = RARITY_CONFIG[def.rarity];
  const title = t(`achievements.${def.id}.title`, def.title);
  return (
    <View style={ac.badgeItem}>
      <View style={[ac.badgeCircle, { backgroundColor: unlocked ? `${rc.color}28` : themeColors.surfaceMuted }]}>
        <Text style={[ac.badgeEmoji, !unlocked && { opacity: 0.3 }]}>{def.icon}</Text>
        {!unlocked && (
          <View style={ac.lockOverlay}>
            <Text style={{ fontSize: 8, color: themeColors.textMuted }}>🔒</Text>
          </View>
        )}
      </View>
      <Text style={[ac.badgeLabel, { color: unlocked ? themeColors.textMuted : themeColors.border }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

interface Props {
  userId: Id<'users'>;
}

export default function AchievementsCard({ userId }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();

  const dbAchievements = useQuery(
    api.achievements.getUserAchievements,
    { userId }
  ) as any[] | undefined;

  const gardenState = useQuery(
    api.mindworld.getGardenState,
    { userId }
  );

  const level     = gardenState?.level ?? 1;
  const xp        = gardenState?.xp ?? 0;
  const xpForNext = xpForLevel(level);
  const xpInLevel = xp % xpForNext;
  const xpPct     = Math.min((xpInLevel / xpForNext) * 100, 100);

  const unlockedIds = useMemo(() => {
    return new Set((dbAchievements ?? []).map((a: any) => a.badgeId));
  }, [dbAchievements]);

  const unlockedCount = unlockedIds.size;

  // Show 5 badges: unlocked first, then next locked ones
  const displayBadges = useMemo(() => {
    const unlocked = ALL_ACHIEVEMENTS.filter(a => !a.secret && unlockedIds.has(a.id));
    const locked = ALL_ACHIEVEMENTS.filter(a => !a.secret && !unlockedIds.has(a.id));
    const combined = [...unlocked, ...locked].slice(0, 5);
    return combined.map(a => ({ id: a.id, unlocked: unlockedIds.has(a.id) }));
  }, [unlockedIds]);

  return (
    <TouchableOpacity
      style={[ac.card, { backgroundColor: themeColors.surface }]}
      onPress={() => router.push('/achievements' as any)}
      activeOpacity={0.92}
    >
      {/* Header: count + level | See all */}
      <View style={ac.headerRow}>
        <Text style={[ac.headerText, { color: themeColors.textMuted }]}>
          <Text style={[ac.headerCount, { color: themeColors.text }]}>{unlockedCount} {t('home.achievements.unlocked', 'desbloqueadas')}</Text>
          {'  ·  '}
          <Text style={[ac.headerLevel, { color: themeColors.textMuted }]}>{t('home.achievements.level', 'Nível')} {level}</Text>
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/achievements' as any)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[ac.seeAll, { color: themeColors.primary }]}>{t('home.achievements.seeAll', 'See all')}</Text>
        </TouchableOpacity>
      </View>

      {/* Badge icons row with labels */}
      <View style={ac.badgesRow}>
        {displayBadges.map(b => (
          <BadgeWithLabel key={b.id} badgeId={b.id} unlocked={b.unlocked} themeColors={themeColors} />
        ))}
      </View>

      {/* XP progress bar */}
      <View style={[ac.xpSection, { borderTopColor: themeColors.border }]}>
        <View style={ac.xpRow}>
          <Text style={[ac.xpText, { color: themeColors.text }]}>
            <Text style={[ac.xpVal, { color: themeColors.text }]}>{xp.toLocaleString()} XP</Text>
          </Text>
          <Text style={[ac.xpGoal, { color: themeColors.textMuted }]}>{t('home.achievements.lvl', 'Lvl')} {level + 1} {t('home.achievements.at', 'at')} {xpForNext.toLocaleString()}</Text>
        </View>
        <View style={[ac.xpBar, { backgroundColor: themeColors.surfaceMuted }]}>
          <View style={[ac.xpBarFill, { width: `${xpPct}%` as any }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const ac = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerLevel: {
    fontSize: 15,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Badge row
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  badgeItem: {
    alignItems: 'center',
    width: 58,
    gap: 5,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },

  // XP bar
  xpSection: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 14,
  },
  xpVal: {
    fontWeight: '900',
  },
  xpGoal: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
});