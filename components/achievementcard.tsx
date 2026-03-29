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
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ALL_ACHIEVEMENTS,
  RARITY_CONFIG,
} from '@/convex/Achievementsconfig';

// ── XP needed for next level ──
function xpForLevel(level: number): number {
  return level * 500;
}

// ── Badge icon circle ──
function BadgeIcon({ badgeId, unlocked }: { badgeId: string; unlocked: boolean }) {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!def) return null;
  const rc = RARITY_CONFIG[def.rarity];
  return (
    <View style={[ac.badgeCircle, { backgroundColor: unlocked ? rc.bg : '#f1f5f9' }]}>
      <Text style={[ac.badgeEmoji, !unlocked && { opacity: 0.3 }]}>{def.icon}</Text>
      {!unlocked && (
        <View style={ac.lockOverlay}>
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>🔒</Text>
        </View>
      )}
    </View>
  );
}

// ── Badge with label ──
function BadgeWithLabel({ badgeId, unlocked }: { badgeId: string; unlocked: boolean }) {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!def) return null;
  const rc = RARITY_CONFIG[def.rarity];
  return (
    <View style={ac.badgeItem}>
      <View style={[ac.badgeCircle, { backgroundColor: unlocked ? rc.bg : '#f1f5f9' }]}>
        <Text style={[ac.badgeEmoji, !unlocked && { opacity: 0.3 }]}>{def.icon}</Text>
        {!unlocked && (
          <View style={ac.lockOverlay}>
            <Text style={{ fontSize: 8, color: '#94a3b8' }}>🔒</Text>
          </View>
        )}
      </View>
      <Text style={[ac.badgeLabel, !unlocked && { color: '#cbd5e1' }]} numberOfLines={1}>
        {def.title}
      </Text>
    </View>
  );
}

interface Props {
  userId: Id<'users'>;
}

export default function AchievementsCard({ userId }: Props) {
  const router = useRouter();

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
      style={ac.card}
      onPress={() => router.push('/achievements' as any)}
      activeOpacity={0.92}
    >
      {/* Header: count + level | See all */}
      <View style={ac.headerRow}>
        <Text style={ac.headerText}>
          <Text style={ac.headerCount}>{unlockedCount} unlocked</Text>
          {'  ·  '}
          <Text style={ac.headerLevel}>Level {level}</Text>
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/achievements' as any)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={ac.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Badge icons row with labels */}
      <View style={ac.badgesRow}>
        {displayBadges.map(b => (
          <BadgeWithLabel key={b.id} badgeId={b.id} unlocked={b.unlocked} />
        ))}
      </View>

      {/* XP progress bar */}
      <View style={ac.xpSection}>
        <View style={ac.xpRow}>
          <Text style={ac.xpText}>
            <Text style={ac.xpVal}>{xp.toLocaleString()} XP</Text>
          </Text>
          <Text style={ac.xpGoal}>Lvl {level + 1} at {xpForNext.toLocaleString()}</Text>
        </View>
        <View style={ac.xpBar}>
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
    backgroundColor: '#ffffff',
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
    color: '#64748b',
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerLevel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
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
    color: '#475569',
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
    borderTopColor: '#f1f5f9',
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
    color: '#0f172a',
  },
  xpVal: {
    fontWeight: '900',
    color: '#0f172a',
  },
  xpGoal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
});