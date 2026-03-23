/**
 * app/(tabs)/profile.tsx
 * ─────────────────────────────────────────────────────────────
 * Redesigned profile tab — matches the clean card-based design
 * of Home / Fuel / Move. Features avatar picker, achievement
 * teaser, stats row, and all existing menu items preserved.
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Image, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Sparkles, RefreshCcw, TrendingDown, MessageSquare, Clock,
  LayoutGrid, BookOpen, Calendar, Zap, Bug, Scale,
  LogOut, Settings, Trophy, ChevronRight, Star,
  Utensils, Dumbbell, Heart, Brain,
} from 'lucide-react-native';
import AchievementsCard from '@/components/achievementcard';
import { getCustomerInfoSafe } from '@/utils/revenuecat';

// ─────────────────────────────────────────────────────────────
// AVATAR EMOJI OPTIONS
// ─────────────────────────────────────────────────────────────
const AVATARS = [
  '🦁', '🐺', '🦊', '🐻', '🐼', '🦄',
  '🐯', '🦅', '🐬', '🦋', '🌸', '⚡',
  '🔥', '🌊', '🌿', '💎', '🏔️', '🎯',
];
const AVATAR_BG_PAIRS: [string, string][] = [
  ['#2563eb', '#1e40af'],
  ['#7c3aed', '#5b21b6'],
  ['#059669', '#047857'],
  ['#dc2626', '#b91c1c'],
  ['#d97706', '#b45309'],
  ['#0ea5e9', '#0284c7'],
  ['#db2777', '#be185d'],
  ['#0f172a', '#1e293b'],
];

const AVATAR_KEY = 'bluom_avatar_v1';
const AVATAR_BG_KEY = 'bluom_avatar_bg_v1';

// ─────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────
function MenuRow({
  icon, iconBg, iconColor, label, sub, onPress, badge,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  label: string;
  sub?: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.menuIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={s.menuText}>
        <Text style={s.menuLabel}>{label}</Text>
        {sub && <Text style={s.menuSub}>{sub}</Text>}
      </View>
      {badge && (
        <View style={s.menuBadge}><Text style={s.menuBadgeTxt}>{badge}</Text></View>
      )}
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const { signOut }          = useAuth();
  const router               = useRouter();
  const insets               = useSafeAreaInsets();

  const convexUser     = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const dbAchievements = (useQuery(api.achievements.getUserAchievements, convexUser?._id ? { userId: convexUser._id } : 'skip') ?? []) as any[];
  const gardenState    = useQuery(api.mindworld.getGardenState, convexUser?._id ? { userId: convexUser._id } : 'skip');
  const resetOnboarding = useMutation(api.users.resetOnboarding);

  // Avatar state — stored in SecureStore (import at top if needed; using useState default here)
  const [avatarEmoji,    setAvatarEmoji]    = useState('🦁');
  const [avatarBgIdx,    setAvatarBgIdx]    = useState(0);
  const [showAvatarPick, setShowAvatarPick] = useState(false);
  const [tempEmoji,      setTempEmoji]      = useState(avatarEmoji);
  const [tempBgIdx,      setTempBgIdx]      = useState(avatarBgIdx);

  const [rcInfo,    setRcInfo]    = useState<any>(null);
  const [rcLoading, setRcLoading] = useState(false);

  // Derived
  const name           = convexUser?.name ?? clerkUser?.fullName ?? 'Athlete';
  const firstName      = name.split(' ')[0];
  const email          = convexUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const isPro          = !!convexUser?.isPremium;
  const level          = gardenState?.level ?? 1;
  const xp             = gardenState?.xp ?? 0;
  const tokens         = gardenState?.tokens ?? 0;
  const unlockedCount  = dbAchievements.length;
  const avatarGradient = AVATAR_BG_PAIRS[avatarBgIdx];

  // Stats
  const goal    = convexUser?.fitnessGoal?.replace(/_/g, ' ') ?? '—';
  const weight  = convexUser?.weight ? `${convexUser.weight} kg` : '—';
  const streak  = gardenState?.meditationStreak ?? 0;

  const handleSignOut = () => Alert.alert('Sign Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: async () => { try { await signOut(); router.replace('/login'); } catch {} } },
  ]);

  const handleReset = () => Alert.alert('Reset Goal', 'This will restart your onboarding.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: async () => {
      if (convexUser) { await resetOnboarding({ userId: convexUser._id }); router.replace('/onboarding'); }
    }},
  ]);

  const refreshRC = async () => {
    setRcLoading(true);
    try { setRcInfo(await getCustomerInfoSafe()); } finally { setRcLoading(false); }
  };

  const saveAvatar = () => {
    setAvatarEmoji(tempEmoji);
    setAvatarBgIdx(tempBgIdx);
    setShowAvatarPick(false);
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── AVATAR PICKER MODAL ── */}
      <Modal visible={showAvatarPick} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.pickerHeader}>
            <Text style={s.pickerTitle}>Choose Your Avatar</Text>
            <TouchableOpacity onPress={() => setShowAvatarPick(false)} style={s.pickerClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Preview */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <LinearGradient colors={AVATAR_BG_PAIRS[tempBgIdx]} style={s.avatarLarge}>
                <Text style={s.avatarLargeEmoji}>{tempEmoji}</Text>
              </LinearGradient>
            </View>

            {/* Emoji grid */}
            <Text style={s.pickerSectionLbl}>Pick an avatar</Text>
            <View style={s.emojiGrid}>
              {AVATARS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiOption, tempEmoji === e && s.emojiOptionActive]}
                  onPress={() => setTempEmoji(e)}
                >
                  <Text style={s.emojiOptionTxt}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* BG picker */}
            <Text style={s.pickerSectionLbl}>Pick a colour</Text>
            <View style={s.bgRow}>
              {AVATAR_BG_PAIRS.map((pair, i) => (
                <TouchableOpacity key={i} onPress={() => setTempBgIdx(i)} style={[s.bgSwatch, tempBgIdx === i && s.bgSwatchActive]}>
                  <LinearGradient colors={pair} style={s.bgSwatchGrad} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveAvatarBtn} onPress={saveAvatar}>
              <Text style={s.saveAvatarTxt}>Save Avatar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO CARD ── */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={s.heroCard}>
          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={() => { setTempEmoji(avatarEmoji); setTempBgIdx(avatarBgIdx); setShowAvatarPick(true); }} activeOpacity={0.85}>
            <LinearGradient colors={avatarGradient} style={s.avatar}>
              <Text style={s.avatarEmoji}>{avatarEmoji}</Text>
            </LinearGradient>
            <View style={s.editBadge}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Name & email */}
          <Text style={s.heroName}>{name}</Text>
          <Text style={s.heroEmail}>{email}</Text>

          {/* Pro badge or upgrade */}
          {isPro ? (
            <View style={s.proBadge}>
              <Sparkles size={12} color="#d97706" />
              <Text style={s.proBadgeTxt}>Pro Member</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.upgradeChip} onPress={() => router.push('/premium')} activeOpacity={0.85}>
              <Text style={s.upgradeChipTxt}>✦ Upgrade to Pro</Text>
            </TouchableOpacity>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{level}</Text>
              <Text style={s.statLbl}>Level</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statVal}>{xp.toLocaleString()}</Text>
              <Text style={s.statLbl}>XP</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#fcd34d' }]}>{tokens}</Text>
              <Text style={s.statLbl}>Tokens</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statVal}>{streak}</Text>
              <Text style={s.statLbl}>Streak</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── ACHIEVEMENTS ── */}
        {convexUser?._id ? <AchievementsCard userId={convexUser._id} /> : null}

        {/* ── QUICK STATS ── */}
        <View style={s.quickStats}>
          {[
            { icon: '🎯', label: 'Goal', value: goal },
            { icon: '⚖️', label: 'Weight', value: weight },
            { icon: convexUser?.biologicalSex === 'female' ? '🌸' : '⚡', label: 'Sex', value: convexUser?.biologicalSex ?? '—' },
            { icon: '😴', label: 'Sleep', value: convexUser?.sleepHours ? `${convexUser.sleepHours}h` : '—' },
          ].map(item => (
            <View key={item.label} style={s.quickStatItem}>
              <Text style={s.quickStatEmoji}>{item.icon}</Text>
              <Text style={s.quickStatVal}>{item.value}</Text>
              <Text style={s.quickStatLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── ACCOUNT ── */}
        <Section title="Account">
          {!isPro && (
            <>
              <MenuRow
                icon={<Sparkles size={18} color="#f59e0b" />} iconBg="#fef3c7"
                label="Go Premium" sub="Unlock all features & AI plans"
                badge="✦ Upgrade"
                onPress={() => router.push('/premium')}
              />
              <View style={s.divider} />
            </>
          )}
          <MenuRow
            icon={<Sparkles size={18} color="#6366f1" />} iconBg="#eef2ff"
            label="My Blueprint" sub="Nutrition, fitness & wellness plan"
            onPress={() => router.push('/personalized-plan')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<TrendingDown size={18} color="#ef4444" />} iconBg="#fee2e2"
            label="Sugar Control" sub="90-day reset + daily check-ins"
            onPress={() => router.push('/sugar-dashboard')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<RefreshCcw size={18} color="#f97316" />} iconBg="#fff7ed"
            label="Restart Goal" sub="Reset biometrics & onboarding"
            onPress={handleReset}
          />
        </Section>

        {/* ── HEALTH & TRACKING ── */}
        <Section title="Health & Tracking">
          <MenuRow
            icon={<Scale size={18} color="#0ea5e9" />} iconBg="#f0f9ff"
            label="Weight Journey" sub="Logs, measurements & progress photos"
            onPress={() => router.push('/Weightmanagement')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={convexUser?.biologicalSex === 'female'
              ? <Calendar size={18} color="#db2777" />
              : <Zap size={18} color="#3b82f6" />}
            iconBg={convexUser?.biologicalSex === 'female' ? '#fdf2f8' : '#eff6ff'}
            label={convexUser?.biologicalSex === 'female' ? "Women's Health" : "Men's Health"}
            sub="Hormonal blueprint & daily protocols"
            onPress={() => router.push(convexUser?.biologicalSex === 'female' ? '/womens-health' : '/mens-health')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Clock size={18} color="#f59e0b" />} iconBg="#fffbeb"
            label="Fasting Tracker" sub="Protocols, timers & streaks"
            onPress={() => router.push('/fasting')}
          />
        </Section>

        {/* ── TOOLS ── */}
        <Section title="Tools">
          <MenuRow
            icon={<MessageSquare size={18} color="#2563eb" />} iconBg="#eff6ff"
            label="AI Coach" sub="Your precision health expert"
            onPress={() => router.push('/ai-coach')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Dumbbell size={18} color="#7c3aed" />} iconBg="#ede9fe"
            label="Move" sub="Workouts, steps & exercise log"
            onPress={() => router.push('/move')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Utensils size={18} color="#16a34a" />} iconBg="#f0fdf4"
            label="Fuel" sub="Meal plan & food tracker"
            onPress={() => router.push('/fuel')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Heart size={18} color="#8b5cf6" />} iconBg="#f5f3ff"
            label="Wellness" sub="Mood, sleep & meditation"
            onPress={() => router.push('/wellness')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<LayoutGrid size={18} color="#0ea5e9" />} iconBg="#f0f9ff"
            label="Productivity Hub" sub="Tasks, focus & goals"
            onPress={() => router.push('/todo-list')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<BookOpen size={18} color="#10b981" />} iconBg="#ecfdf5"
            label="Bluom Library" sub="Curated knowledge & protocols"
            onPress={() => router.push('/library')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Trophy size={18} color="#d97706" />} iconBg="#fffbeb"
            label="Achievements" sub={`${unlockedCount} unlocked · ${level} Level`}
            onPress={() => router.push('/achievements' as any)}
          />
        </Section>

        {/* ── SUPPORT ── */}
        <Section title="Support">
          <MenuRow
            icon={<Bug size={18} color="#64748b" />} iconBg="#f1f5f9"
            label="Help & Feedback"
            onPress={() => router.push('/support')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Settings size={18} color="#2563eb" />} iconBg="#eff6ff"
            label="Settings" sub="Units, goals, notifications"
            onPress={() => router.push('/settings')}
          />
        </Section>

        {/* ── ADMIN DEBUG ── */}
        {convexUser?.isAdmin && (
          <Section title="Admin Debug">
            <MenuRow
              icon={<Sparkles size={18} color="#0284c7" />} iconBg="#e0f2fe"
              label={rcLoading ? 'Loading RevenueCat…' : 'Refresh RevenueCat'}
              sub="Verify subscription on device"
              onPress={refreshRC}
            />
            {rcInfo && (
              <View style={s.debugBox}>
                <Text style={s.debugTxt}>{JSON.stringify(rcInfo, null, 2)}</Text>
              </View>
            )}
          </Section>
        )}

        {/* ── SIGN OUT ── */}
        <View style={s.section}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <LogOut size={18} color="#ef4444" />
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Image source={require('../../assets/images/logo.png')} style={s.footerLogo} resizeMode="contain" />
          <Text style={s.footerTxt}>Bluom · Life Optimised</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Hero
  heroCard:  { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 14, overflow: 'hidden' },
  avatarWrap:{ position: 'relative', marginBottom: 14 },
  avatar:    { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji:{ fontSize: 40 },
  editBadge: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1e293b' },
  heroName:  { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 12 },
  proBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  proBadgeTxt:{ fontSize: 12, fontWeight: '800', color: '#92400e' },
  upgradeChip:{ backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  upgradeChipTxt:{ fontSize: 12, fontWeight: '800', color: '#fcd34d' },
  statsRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, width: '100%' },
  stat:      { flex: 1, alignItems: 'center' },
  statVal:   { fontSize: 18, fontWeight: '900', color: '#fff' },
  statLbl:   { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 2 },
  statDivider:{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Achievements teaser
  achievCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, gap: 10 },
  achievLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achievTitle:{ fontSize: 16, fontWeight: '800', color: '#0f172a' },
  achievSub:  { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  achievBadges:{ flexDirection: 'row', gap: 6 },
  miniBadge:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniBadgeEmoji:{ fontSize: 18 },
  achievNone: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  achievBar:  { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  achievBarFill:{ height: '100%', backgroundColor: '#d97706', borderRadius: 2 },

  // Quick stats
  quickStats: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, gap: 0 },
  quickStatItem:{ flex: 1, alignItems: 'center', gap: 3 },
  quickStatEmoji:{ fontSize: 18 },
  quickStatVal:  { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  quickStatLbl:  { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },

  // Sections
  section:     { marginBottom: 14 },
  sectionTitle:{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 2 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  divider:     { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 16 },

  // Menu rows
  menuRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon:  { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuText:  { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  menuSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1, fontWeight: '500' },
  menuBadge: { backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  menuBadgeTxt:{ fontSize: 10, fontWeight: '800', color: '#d97706' },

  // Sign out
  signOutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#fecaca' },
  signOutTxt: { fontSize: 15, fontWeight: '700', color: '#ef4444' },

  // Debug
  debugBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, margin: 14 },
  debugTxt: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },

  // Footer
  footer:    { alignItems: 'center', paddingVertical: 32, gap: 6 },
  footerLogo:{ width: 72, height: 22 },
  footerTxt: { fontSize: 11, color: '#cbd5e1', fontWeight: '600' },

  // Avatar picker modal
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle:  { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  pickerClose:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  pickerSectionLbl: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  avatarLarge:      { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarLargeEmoji: { fontSize: 52 },
  emojiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiOption:{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emojiOptionActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  emojiOptionTxt: { fontSize: 28 },
  bgRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  bgSwatch:   { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  bgSwatchActive: { borderColor: '#0f172a', transform: [{ scale: 1.1 }] },
  bgSwatchGrad: { flex: 1 },
  saveAvatarBtn: { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveAvatarTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});