/**
 * components/AchievementsCard.tsx
 * ─────────────────────────────────────────────────────────────
 * Home screen widget — shows level, XP bar, recent badges,
 * and a "View All" CTA linking to /achievements.
 *
 * Usage in index.tsx:
 *   import AchievementsCard from '@/components/AchievementsCard';
 *   ...
 *   {isWidget('achievements') && <AchievementsCard userId={convexUser._id} />}
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '@/convex/_generated/dataModel';
import {
  ALL_ACHIEVEMENTS,
  RARITY_CONFIG,
} from '@/convex/Achievementsconfig';

// ── XP needed for next level (simple formula) ──
function xpForLevel(level: number): number {
  return level * 500;
}

const RARITY_GRADIENT: Record<keyof typeof RARITY_CONFIG, [string, string]> = {
  common: ['#e2e8f0', '#cbd5e1'],
  rare: ['#60a5fa', '#2563eb'],
  epic: ['#a78bfa', '#7c3aed'],
  legendary: ['#fbbf24', '#d97706'],
};

// ── Recent badge mini chip ──
function Minibadge({ badgeId }: { badgeId: string }) {
  const def = ALL_ACHIEVEMENTS.find(a => a.id === badgeId);
  if (!def) return null;
  const rc = RARITY_CONFIG[def.rarity];
  return (
    <LinearGradient
      colors={RARITY_GRADIENT[def.rarity]}
      style={ac.miniBadgeGrad}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <View style={[ac.miniBadgeInner, { backgroundColor: rc.bg }]}>
        <Text style={ac.miniBadgeEmoji}>{def.icon}</Text>
      </View>
    </LinearGradient>
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

  const level      = gardenState?.level ?? 1;
  const xp         = gardenState?.xp ?? 0;
  const tokens     = gardenState?.tokens ?? 0;
  const xpForNext  = xpForLevel(level);
  const xpInLevel  = xp % xpForNext;
  const xpPct      = Math.min((xpInLevel / xpForNext) * 100, 100);

  const unlockedCount = dbAchievements?.length ?? 0;
  const totalVisible  = ALL_ACHIEVEMENTS.filter(a => !a.secret).length;

  // 4 most recent unlocks
  const recentBadges = useMemo(() => {
    if (!dbAchievements) return [];
    return [...dbAchievements]
      .sort((a: any, b: any) => b.unlockedAt - a.unlockedAt)
      .slice(0, 5);
  }, [dbAchievements]);

  // Next closest achievement to unlock (simple heuristic: first locked non-secret)
  const nextHint = useMemo(() => {
    if (!dbAchievements) return null;
    const unlockedIds = new Set(dbAchievements.map((a: any) => a.badgeId));
    return ALL_ACHIEVEMENTS.find(a => !a.secret && !unlockedIds.has(a.id)) ?? null;
  }, [dbAchievements]);

  // Level label
  const levelLabel = level >= 20 ? 'Legend' : level >= 15 ? 'Elite' : level >= 10 ? 'Advanced' : level >= 5 ? 'Rising' : 'Rookie';

  return (
    <TouchableOpacity
      style={ac.card}
      onPress={() => router.push('/achievements' as any)}
      activeOpacity={0.92}
    >
      {/* Top row */}
      <View style={ac.topRow}>
        {/* Level badge */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={ac.levelBadge}>
          <Text style={ac.levelNum}>{level}</Text>
          <Text style={ac.levelLbl}>{levelLabel}</Text>
        </LinearGradient>

        {/* XP + tokens */}
        <View style={ac.statsCol}>
          <View style={ac.statRow}>
            <Text style={ac.statVal}>{xp.toLocaleString()}</Text>
            <Text style={ac.statLbl}> XP</Text>
          </View>
          <View style={ac.statRow}>
            <Text style={[ac.statVal, { color: '#d97706' }]}>{tokens}</Text>
            <Text style={ac.statLbl}> Tokens</Text>
          </View>
        </View>

        {/* Progress to next level */}
        <View style={ac.levelProgress}>
          <Text style={ac.levelProgressLbl}>Next level</Text>
          <View style={ac.xpBar}>
            <View style={[ac.xpBarFill, { width: `${xpPct}%` as any }]} />
          </View>
          <Text style={ac.xpBarLbl}>{xpInLevel}/{xpForNext}</Text>
        </View>
      </View>

      {/* Recent unlocks */}
      {recentBadges.length > 0 && (
        <View style={ac.recentRow}>
          <Text style={ac.recentLbl}>Recent</Text>
          <View style={ac.badgesRow}>
            {recentBadges.map((a: any, i: number) => (
              <Minibadge key={`${a.badgeId}-${a.unlockedAt ?? i}`} badgeId={a.badgeId} />
            ))}
          </View>
          <View style={ac.countBadge}>
            <Text style={ac.countTxt}>{unlockedCount}/{totalVisible}</Text>
          </View>
        </View>
      )}

      {/* Next hint */}
      {nextHint && (
        <View style={ac.nextHint}>
          <Text style={ac.nextHintEmoji}>{nextHint.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={ac.nextHintTitle}>Up next: {nextHint.title}</Text>
            <Text style={ac.nextHintDesc} numberOfLines={1}>{nextHint.description}</Text>
          </View>
          <Text style={[ac.nextXP, { color: RARITY_CONFIG[nextHint.rarity].color }]}>+{nextHint.xpReward} XP</Text>
        </View>
      )}

      {/* CTA */}
      <View style={ac.cta}>
        <Text style={ac.ctaTxt}>View all achievements</Text>
        <Ionicons name="chevron-forward" size={14} color="#2563eb" />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const ac = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    gap: 14,
  },

  // Top row
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBadge:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  levelNum:    { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  levelLbl:    { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.5 },
  statsCol:    { gap: 4 },
  statRow:     { flexDirection: 'row', alignItems: 'baseline' },
  statVal:     { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  statLbl:     { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  levelProgress: { flex: 1 },
  levelProgressLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginBottom: 5 },
  xpBar:       { height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  xpBarFill:   { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
  xpBarLbl:    { fontSize: 9, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },

  // Recent badges
  recentRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentLbl:   { fontSize: 11, fontWeight: '700', color: '#94a3b8', width: 44 },
  badgesRow:   { flexDirection: 'row', gap: 6, flex: 1 },
  miniBadgeGrad: { width: 36, height: 36, borderRadius: 11, padding: 1.5 },
  miniBadgeInner:{ flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  miniBadgeEmoji:{ fontSize: 18 },
  countBadge:  { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  countTxt:    { fontSize: 11, fontWeight: '800', color: '#475569' },

  // Next hint
  nextHint:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 14, padding: 12 },
  nextHintEmoji:{ fontSize: 22 },
  nextHintTitle:{ fontSize: 13, fontWeight: '700', color: '#1e293b' },
  nextHintDesc: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  nextXP:       { fontSize: 12, fontWeight: '800' },

  // CTA
  cta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  ctaTxt: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
});