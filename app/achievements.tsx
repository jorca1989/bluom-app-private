import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ALL_ACHIEVEMENTS,
  CATEGORY_CONFIG,
  RARITY_CONFIG,
  type AchievementCategory,
  type AchievementDef,
} from '@/convex/Achievementsconfig';

type DbAchievement = { badgeId: string; unlockedAt: number };
type CategoryFilter = 'all' | AchievementCategory;

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return '';
  }
}

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  ) as { _id: Id<'users'> } | null | undefined;

  const userId = convexUser?._id;

  const dbAchievements = (useQuery(
    api.achievements.getUserAchievements,
    userId ? { userId } : 'skip'
  ) ?? []) as DbAchievement[];

  const gardenState = useQuery(
    api.mindworld.getGardenState,
    userId ? { userId } : 'skip'
  ) as any;

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [detail, setDetail] = useState<AchievementDef | null>(null);

  const unlockedById = useMemo(() => {
    const m = new Map<string, DbAchievement>();
    for (const a of dbAchievements) m.set(a.badgeId, a);
    return m;
  }, [dbAchievements]);

  const visibleAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS.filter((a) => !a.secret || unlockedById.has(a.id));
  }, [unlockedById]);

  const filtered = useMemo(() => {
    return visibleAchievements.filter((a) => (category === 'all' ? true : a.category === category));
  }, [visibleAchievements, category]);

  const unlockedCount = unlockedById.size;
  const totalVisible = visibleAchievements.length;

  const level = gardenState?.level ?? 1;
  const xp = gardenState?.xp ?? 0;
  const tokens = gardenState?.tokens ?? 0;
  const streak = gardenState?.meditationStreak ?? 0;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Achievements</Text>
          <Text style={s.subTitle}>
            {unlockedCount}/{totalVisible} unlocked · Level {level}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{typeof xp === 'number' ? xp.toLocaleString() : '—'}</Text>
            <Text style={s.statLbl}>XP</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: '#d97706' }]}>{tokens}</Text>
            <Text style={s.statLbl}>Tokens</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{streak}</Text>
            <Text style={s.statLbl}>Streak</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          <TouchableOpacity
            onPress={() => setCategory('all')}
            style={[s.chip, category === 'all' && s.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[s.chipTxt, category === 'all' && s.chipTxtActive]}>All</Text>
          </TouchableOpacity>

          {(Object.keys(CATEGORY_CONFIG) as AchievementCategory[]).map((k) => {
            const cc = CATEGORY_CONFIG[k];
            const active = category === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setCategory(k)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{cc.emoji} {cc.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.grid}>
          {filtered.map((a) => {
            const unlocked = unlockedById.get(a.id);
            const locked = !unlocked;
            const rc = RARITY_CONFIG[a.rarity];
            const isSecretLocked = !!a.secret && locked;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={() => setDetail(a)}
                style={[
                  s.card,
                  { backgroundColor: rc.bg, borderColor: rc.border, opacity: locked ? 0.78 : 1 },
                ]}
                activeOpacity={0.88}
              >
                <View style={s.cardTop}>
                  <Text style={s.icon}>{isSecretLocked ? '❓' : a.icon}</Text>
                  <View style={[s.rarityPill, { backgroundColor: rc.color + '22' }]}>
                    <Text style={[s.rarityTxt, { color: rc.color }]}>{rc.label}</Text>
                  </View>
                </View>

                <Text style={s.cardTitle} numberOfLines={2}>
                  {isSecretLocked ? 'Secret Achievement' : a.title}
                </Text>
                <Text style={s.cardDesc} numberOfLines={3}>
                  {isSecretLocked ? 'Unlock to reveal details.' : a.description}
                </Text>

                <View style={s.cardBottom}>
                  <View style={s.rewardPill}>
                    <Text style={s.rewardTxt}>+{a.xpReward} XP · +{a.tokenReward} Tokens</Text>
                  </View>
                  {unlocked ? (
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  ) : (
                    <Ionicons name="lock-closed" size={16} color="#64748b" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Achievement</Text>
              <TouchableOpacity onPress={() => setDetail(null)} style={s.modalClose} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {detail && (() => {
              const unlocked = unlockedById.get(detail.id);
              const rc = RARITY_CONFIG[detail.rarity];
              const cc = CATEGORY_CONFIG[detail.category];
              const isSecretLocked = !!detail.secret && !unlocked;
              return (
                <View>
                  <View style={s.modalHero}>
                    <Text style={s.modalIcon}>{isSecretLocked ? '❓' : detail.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalName}>{isSecretLocked ? 'Secret Achievement' : detail.title}</Text>
                      <Text style={s.modalMeta}>
                        {cc.emoji} {cc.label} · <Text style={{ color: rc.color, fontWeight: '900' }}>{rc.label}</Text>
                      </Text>
                    </View>
                  </View>

                  <Text style={s.modalDesc}>{isSecretLocked ? 'Unlock to reveal details.' : detail.description}</Text>

                  <View style={s.modalRewards}>
                    <Text style={s.modalRewardTxt}>Rewards: +{detail.xpReward} XP · +{detail.tokenReward} Tokens</Text>
                    {unlocked ? (
                      <Text style={s.modalUnlocked}>Unlocked: {formatDate(unlocked.unlockedAt)}</Text>
                    ) : (
                      <Text style={s.modalLocked}>Not unlocked yet</Text>
                    )}
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ebf1fe' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ebf1fe',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subTitle: { marginTop: 2, fontSize: 12, fontWeight: '800', color: '#64748b' },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 6 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statVal: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  statLbl: { marginTop: 2, fontSize: 10, fontWeight: '800', color: '#94a3b8' },

  chipsRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipTxt: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  chipTxtActive: { color: '#ffffff' },

  grid: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    minHeight: 150,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { fontSize: 22 },
  rarityPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  rarityTxt: { fontSize: 10, fontWeight: '900' },
  cardTitle: { marginTop: 10, fontSize: 13, fontWeight: '900', color: '#0f172a' },
  cardDesc: { marginTop: 6, fontSize: 11, fontWeight: '800', color: '#475569', lineHeight: 15 },
  cardBottom: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(15, 23, 42, 0.06)' },
  rewardTxt: { fontSize: 9, fontWeight: '900', color: '#0f172a' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalClose: { width: 36, height: 36, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalHero: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIcon: { fontSize: 34 },
  modalName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalMeta: { marginTop: 2, fontSize: 12, fontWeight: '800', color: '#64748b' },
  modalDesc: { marginTop: 12, fontSize: 13, fontWeight: '800', color: '#334155', lineHeight: 18 },
  modalRewards: { marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  modalRewardTxt: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  modalUnlocked: { marginTop: 6, fontSize: 11, fontWeight: '800', color: '#10b981' },
  modalLocked: { marginTop: 6, fontSize: 11, fontWeight: '800', color: '#64748b' },
});

