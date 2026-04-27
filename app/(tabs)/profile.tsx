/**
 * app/(tabs)/profile.tsx
 * ─────────────────────────────────────────────────────────────
 * Redesigned profile tab — matches the clean card-based design
 * of Home / Fuel / Move. Features avatar picker, achievement
 * teaser, stats row, and all existing menu items preserved.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Image, Pressable, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Avatar, { AvatarConfig } from '@/components/Avatar';
import {
  Sparkles, RefreshCcw, TrendingDown, MessageSquare, Clock,
  LayoutGrid, BookOpen, Calendar, Zap, Bug, Scale,
  LogOut, Settings, Settings2, Trophy, ChevronRight, Star,
  Utensils, Dumbbell, Heart, Brain,
} from 'lucide-react-native';
import AchievementsCard from '@/components/achievementcard';
import { getCustomerInfoSafe } from '@/utils/revenuecat';

// ─────────────────────────────────────────────────────────────
// DICEBEAR AVATAR OPTIONS (Avataaars)
// ─────────────────────────────────────────────────────────────
const TOP_STYLES: Array<{ id: AvatarConfig['top']; label: string }> = [
  { id: 'shortFlat', label: 'Short Flat' },
  { id: 'shortWaved', label: 'Short Waved' },
  { id: 'shaggy', label: 'Shaggy' },
  { id: 'curly', label: 'Curly' },
  { id: 'longButNotTooLong', label: 'Long' },
  { id: 'dreads01', label: 'Dreads' },
  { id: 'bun', label: 'Bun' },
  { id: 'hat', label: 'Hat' },
  { id: 'theCaesar', label: 'Caesar' },
  { id: 'theCaesarAndSidePart', label: 'Caesar Side Part' },
  { id: 'shavedSides', label: 'Shaved Sides' },
  { id: 'bigHair', label: 'Big Hair' },
];

const EYES: Array<{ id: AvatarConfig['eyes']; label: string }> = [
  { id: 'happy', label: 'Happy' },
  { id: 'default', label: 'Default' },
  { id: 'wink', label: 'Wink' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'side', label: 'Side' },
  { id: 'closed', label: 'Closed' },
];

const BROWS: Array<{ id: AvatarConfig['eyebrows']; label: string }> = [
  { id: 'defaultNatural', label: 'Natural' },
  { id: 'raisedExcitedNatural', label: 'Raised' },
  { id: 'sadConcernedNatural', label: 'Concerned' },
  { id: 'angryNatural', label: 'Angry' },
  { id: 'flatNatural', label: 'Flat' },
];

const HAIR_COLORS: Array<{ id: AvatarConfig['hairColor']; label: string; hex: string }> = [
  { id: '111827', label: 'Black', hex: '#111827' },
  { id: '0f172a', label: 'Blue Black', hex: '#0f172a' },
  { id: '3f2d20', label: 'Dark Brown', hex: '#3f2d20' },
  { id: '8b5a2b', label: 'Brown', hex: '#8b5a2b' },
  { id: 'd6b15a', label: 'Blonde', hex: '#d6b15a' },
  { id: 'b45309', label: 'Auburn', hex: '#b45309' },
  { id: '9ca3af', label: 'Gray', hex: '#9ca3af' },
  { id: 'ef4444', label: 'Red', hex: '#ef4444' },
];

const SKIN_TONES: Array<{ id: AvatarConfig['skinColor']; label: string; hex: string }> = [
  { id: 'f5d0a0', label: 'Light', hex: '#f5d0a0' },
  { id: 'f3d36b', label: 'Yellow', hex: '#f3d36b' },
  { id: 'eab38a', label: 'Warm', hex: '#eab38a' },
  { id: 'd19a74', label: 'Tan', hex: '#d19a74' },
  { id: 'b87b5a', label: 'Deep', hex: '#b87b5a' },
  { id: '8d5a3b', label: 'Rich', hex: '#8d5a3b' },
  { id: '3b2217', label: 'Black', hex: '#3b2217' },
];

const MOUTHS: Array<{ id: NonNullable<AvatarConfig['mouth']>; label: string }> = [
  { id: 'smile', label: 'Smile' },
  { id: 'default', label: 'Soft' },
  { id: 'twinkle', label: 'Twinkle' },
];

const FACIAL_HAIR: Array<{ id: NonNullable<AvatarConfig['facialHair']>; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'moustacheFancy', label: 'Mustache' },
  { id: 'moustacheMagnum', label: 'Mustache (Bold)' },
  { id: 'beardLight', label: 'Beard (Light)' },
  { id: 'beardMedium', label: 'Beard (Medium)' },
  { id: 'beardMajestic', label: 'Beard (Majestic)' },
];
const AVATAR_BG_PAIRS: [string, string][] = [
  ['#2563eb', '#1e40af'],
];

const AVATAR_CONFIG_KEY = 'bluom_avatar_config_v2';
const AVATAR_BG_KEY = 'bluom_avatar_bg_v1';

// ─────────────────────────────────────────────────────────────
// WIDGET TOGGLE SYSTEM
// ─────────────────────────────────────────────────────────────
type ProfileWidgetId = 'hero' | 'achievements' | 'stats' | 'account' | 'health' | 'tools' | 'support';
const PROFILE_WIDGETS: { id: ProfileWidgetId; emoji: string; labelKey: string }[] = [
  { id: 'hero',         emoji: '👤', labelKey: 'profile.widgets.hero' },
  { id: 'achievements', emoji: '🏆', labelKey: 'profile.widgets.achievements' },
  { id: 'stats',        emoji: '📊', labelKey: 'profile.widgets.stats' },
  { id: 'account',      emoji: '🔑', labelKey: 'profile.widgets.account' },
  { id: 'health',       emoji: '❤️', labelKey: 'profile.widgets.health' },
  { id: 'tools',        emoji: '🛠️', labelKey: 'profile.widgets.tools' },
  { id: 'support',      emoji: '💬', labelKey: 'profile.widgets.support' },
];
const PROFILE_WIDGETS_KEY = 'bluom_profile_widgets_v1';

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
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const dbAchievements = (useQuery(api.achievements.getUserAchievements, convexUser?._id ? { userId: convexUser._id } : 'skip') ?? []) as any[];
  const gardenState = useQuery(api.mindworld.getGardenState, convexUser?._id ? { userId: convexUser._id } : 'skip');
  const resetOnboarding = useMutation(api.users.resetOnboarding);
  const { t } = useTranslation();

  // ── Widget config ──
  const allProfileWidgetIds = PROFILE_WIDGETS.map(w => w.id);
  const [visibleProfileWidgets, setVisibleProfileWidgets] = useState<Set<ProfileWidgetId>>(new Set(allProfileWidgetIds));
  const [showProfileWidgetConfig, setShowProfileWidgetConfig] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(PROFILE_WIDGETS_KEY);
        if (raw) {
          const parsed: ProfileWidgetId[] = JSON.parse(raw);
          setVisibleProfileWidgets(new Set(parsed));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleProfileWidget = useCallback(async (id: ProfileWidgetId) => {
    setVisibleProfileWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      SecureStore.setItemAsync(PROFILE_WIDGETS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isPW = (id: ProfileWidgetId) => visibleProfileWidgets.has(id);

  // Avatar state — stored in SecureStore
  const defaultAvatarConfig: AvatarConfig = useMemo(() => ({
    seed: clerkUser?.id ?? 'bluom-user',
    top: 'shortFlat',
    hairColor: '111827',
    eyes: 'happy',
    eyebrows: 'defaultNatural',
    mouth: 'smile',
    facialHair: 'none',
    facialHairColor: '111827',
    skinColor: 'f5d0a0',
  }), [clerkUser?.id]);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [avatarBgIdx, setAvatarBgIdx] = useState(0); // kept for backward compatibility (always 0 for now)
  const [showAvatarPick, setShowAvatarPick] = useState(false);
  const [tempConfig, setTempConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [tempBgIdx, setTempBgIdx] = useState(0);

  const [rcInfo, setRcInfo] = useState<any>(null);
  const [rcLoading, setRcLoading] = useState(false);

  // Derived
  const name = convexUser?.name ?? clerkUser?.fullName ?? 'Athlete';
  const firstName = name.split(' ')[0];
  const email = convexUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const isPro = !!convexUser?.isPremium;
  const level = gardenState?.level ?? 1;
  const xp = gardenState?.xp ?? 0;
  const tokens = gardenState?.tokens ?? 0;
  const unlockedCount = dbAchievements.length;
  const avatarGradient = AVATAR_BG_PAIRS[0];

  // Stats — respect the user's preferred unit system
  const GOAL_PT: Record<string, string> = {
    lose_weight: 'Perder Peso',
    build_muscle: 'Ganhar Músculo',
    maintain: 'Manter',
    general_health: 'Saúde Geral',
    improve_endurance: 'Resistência',
  };
  const SEX_PT: Record<string, string> = {
    male: 'Masculino',
    female: 'Feminino',
    other: 'Outro',
  };
  const goalRaw = convexUser?.fitnessGoal ?? '';
  const goal = (GOAL_PT[goalRaw] ?? goalRaw.replace(/_/g, ' ')) || '—';
  const sexRaw = convexUser?.biologicalSex ?? '';
  const sexLabel = (SEX_PT[sexRaw] ?? sexRaw) || '—';
  const prefersLbsProfile = (convexUser?.preferredUnits?.weight ?? 'kg') === 'lbs';
  const weightRaw = convexUser?.weight ?? 0;
  const weight = weightRaw
    ? prefersLbsProfile
      ? `${(weightRaw * 2.2046).toFixed(1)} lb`
      : `${weightRaw.toFixed(1)} kg`
    : '—';
  const streak = gardenState?.meditationStreak ?? 0;

  const handleSignOut = () => Alert.alert(t('profile.signOutTitle', 'Terminar Sessão'), t('profile.signOutMsg', 'Tens a certeza?'), [
    { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
    { text: t('profile.signOut', 'Terminar Sessão'), style: 'destructive', onPress: async () => { try { await signOut(); router.replace('/login'); } catch { } } },
  ]);

  const handleReset = () => Alert.alert(
    t('profile.restartTitle', 'Reiniciar Onboarding?'),
    t('profile.restartMsg', 'Tens a certeza que queres reiniciar o onboarding? O teu objetivo e preferências atuais serão redefinidos.'),
    [
      { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
      {
        text: t('profile.restartYes', 'Sim, Reiniciar'), style: 'destructive', onPress: async () => {
          if (convexUser) { await resetOnboarding({ userId: convexUser._id }); router.replace('/onboarding'); }
        }
      },
    ]
  );

  const refreshRC = async () => {
    setRcLoading(true);
    try { setRcInfo(await getCustomerInfoSafe()); } finally { setRcLoading(false); }
  };

  useEffect(() => {
    // load saved avatar config/bg
    (async () => {
      try {
        const [cfgRaw, bgRaw] = await Promise.all([
          SecureStore.getItemAsync(AVATAR_CONFIG_KEY),
          SecureStore.getItemAsync(AVATAR_BG_KEY),
        ]);
        if (bgRaw) setAvatarBgIdx(0);
        if (cfgRaw) {
          const parsed = JSON.parse(cfgRaw);
          if (parsed && typeof parsed === 'object') {
            // migrate possible old values that included '#'
            const fixHex = (v: any) => {
              const s = String(v ?? '');
              return s.startsWith('#') ? s.slice(1) : s;
            };
            setAvatarConfig((prev) => ({
              ...prev,
              ...parsed,
              seed: parsed.seed ?? prev.seed,
              hairColor: fixHex(parsed.hairColor ?? prev.hairColor),
              skinColor: fixHex(parsed.skinColor ?? prev.skinColor),
              facialHairColor: fixHex(parsed.facialHairColor ?? prev.facialHairColor),
            }));
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [defaultAvatarConfig]);

  const saveAvatar = async () => {
    setAvatarConfig(tempConfig);
    setAvatarBgIdx(0);
    setShowAvatarPick(false);
    try {
      await Promise.all([
        SecureStore.setItemAsync(AVATAR_CONFIG_KEY, JSON.stringify(tempConfig)),
        SecureStore.setItemAsync(AVATAR_BG_KEY, '0'),
      ]);
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── WIDGET CONFIG MODAL ── */}
      <Modal visible={showProfileWidgetConfig} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProfileWidgetConfig(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.wcHeader}>
            <Text style={s.wcTitle}>{t('profile.widgets.title', 'Widget Config')}</Text>
            <TouchableOpacity onPress={() => setShowProfileWidgetConfig(false)} style={s.wcClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 0, paddingBottom: 40 }}>
            {/* Dark mode placeholder */}
            <View style={s.wcDarkRow}>
              <View style={s.wcDarkLeft}>
                <Ionicons name="moon-outline" size={18} color="#6366f1" />
                <Text style={s.wcDarkLabel}>{t('common.darkMode', 'Dark Mode')}</Text>
              </View>
              <Switch value={false} onValueChange={() => {}} trackColor={{ true: '#6366f1', false: '#e2e8f0' }} thumbColor="#fff" />
            </View>
            <View style={s.wcDivider} />
            {PROFILE_WIDGETS.map((w, i) => (
              <View key={w.id}>
                <View style={s.wcRow}>
                  <Text style={s.wcEmoji}>{w.emoji}</Text>
                  <Text style={s.wcLabel}>{t(w.labelKey, w.id)}</Text>
                  <Switch
                    value={isPW(w.id)}
                    onValueChange={() => toggleProfileWidget(w.id)}
                    trackColor={{ true: '#2563eb', false: '#e2e8f0' }}
                    thumbColor="#fff"
                  />
                </View>
                {i < PROFILE_WIDGETS.length - 1 && <View style={s.wcDivider} />}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── AVATAR PICKER MODAL ── */}
      <Modal visible={showAvatarPick} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.pickerHeader}>
            <Text style={s.pickerTitle}>{t('profile.chooseAvatar', 'Escolhe o teu Avatar')}</Text>
            <TouchableOpacity onPress={() => setShowAvatarPick(false)} style={s.pickerClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
            {/* Preview */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <LinearGradient colors={AVATAR_BG_PAIRS[tempBgIdx]} style={s.avatarLarge}>
                <Avatar config={tempConfig} size={92} />
              </LinearGradient>
            </View>

            {/* Hair */}
            <Text style={s.pickerSectionLbl}>{t('profile.hair', 'Cabelo')}</Text>
            <View style={s.chipRow}>
              {TOP_STYLES.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.chip, tempConfig.top === opt.id && s.chipActive]}
                  onPress={() => setTempConfig(prev => ({ ...prev, top: opt.id }))}
                >
                  <Text style={[s.chipTxt, tempConfig.top === opt.id && s.chipTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.pickerSectionLbl}>{t('profile.hairColor', 'Cor do Cabelo')}</Text>
            <View style={s.swatchRow}>
              {HAIR_COLORS.map(c => (
                <TouchableOpacity
                  key={c.hex}
                  onPress={() => setTempConfig(prev => ({ ...prev, hairColor: c.id }))}
                  style={[s.swatch, { backgroundColor: c.hex }, tempConfig.hairColor === c.id && s.swatchActive]}
                />
              ))}
            </View>

            {/* Face */}
            <Text style={s.pickerSectionLbl}>{t('profile.eyes', 'Olhos')}</Text>
            <View style={s.chipRow}>
              {EYES.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.chip, tempConfig.eyes === opt.id && s.chipActive]}
                  onPress={() => setTempConfig(prev => ({ ...prev, eyes: opt.id }))}
                >
                  <Text style={[s.chipTxt, tempConfig.eyes === opt.id && s.chipTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.pickerSectionLbl}>{t('profile.mouth', 'Boca')}</Text>
            <View style={s.chipRow}>
              {MOUTHS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.chip, tempConfig.mouth === opt.id && s.chipActive]}
                  onPress={() => setTempConfig(prev => ({ ...prev, mouth: opt.id }))}
                >
                  <Text style={[s.chipTxt, tempConfig.mouth === opt.id && s.chipTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.pickerSectionLbl}>{t('profile.brows', 'Sobrancelhas')}</Text>
            <View style={s.chipRow}>
              {BROWS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.chip, tempConfig.eyebrows === opt.id && s.chipActive]}
                  onPress={() => setTempConfig(prev => ({ ...prev, eyebrows: opt.id }))}
                >
                  <Text style={[s.chipTxt, tempConfig.eyebrows === opt.id && s.chipTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.pickerSectionLbl}>{t('profile.beard', 'Barba e Bigode')}</Text>
            <View style={s.chipRow}>
              {FACIAL_HAIR.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.chip, (tempConfig.facialHair ?? 'none') === opt.id && s.chipActive]}
                  onPress={() => setTempConfig(prev => ({ ...prev, facialHair: opt.id }))}
                >
                  <Text style={[s.chipTxt, (tempConfig.facialHair ?? 'none') === opt.id && s.chipTxtActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.pickerSectionLbl}>{t('profile.skinTone', 'Tom de Pele')}</Text>
            <View style={s.swatchRow}>
              {SKIN_TONES.map(c => (
                <TouchableOpacity
                  key={c.hex}
                  onPress={() => setTempConfig(prev => ({ ...prev, skinColor: c.id }))}
                  style={[s.swatch, { backgroundColor: c.hex }, tempConfig.skinColor === c.id && s.swatchActive]}
                />
              ))}
            </View>

            <TouchableOpacity style={s.saveAvatarBtn} onPress={saveAvatar}>
              <Text style={s.saveAvatarTxt}>{t('profile.saveAvatar', 'Guardar Avatar')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── PAGE HEADER ── */}
      <View style={s.pageHeader}>
        <Text style={s.pageHeaderTitle}>{t('profile.title', 'Profile')}</Text>
        <TouchableOpacity style={s.gearBtn} onPress={() => setShowProfileWidgetConfig(true)} activeOpacity={0.75}>
          <Settings2 size={17} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO CARD ── */}
        {isPW('hero') && <LinearGradient colors={['#0f172a', '#1e293b']} style={s.heroCard}>
          {/* Avatar */}
          <TouchableOpacity
            style={s.avatarWrap}
            onPress={() => { setTempConfig(avatarConfig); setTempBgIdx(0); setShowAvatarPick(true); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={avatarGradient} style={s.avatar}>
              <Avatar config={avatarConfig} size={84} />
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
              <Text style={s.proBadgeTxt}>{t('profile.proMember', 'Membro Pro')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.upgradeChip} onPress={() => router.push('/premium')} activeOpacity={0.85}>
              <Text style={s.upgradeChipTxt}>{t('profile.upgradePro', '✦ Atualizar para Pro')}</Text>
            </TouchableOpacity>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{level}</Text>
              <Text style={s.statLbl}>{t('profile.level', 'Nível')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statVal}>{xp.toLocaleString()}</Text>
              <Text style={s.statLbl}>XP</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#fcd34d' }]}>{tokens}</Text>
              <Text style={s.statLbl}>{t('profile.tokens', 'Fichas')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statVal}>{streak}</Text>
              <Text style={s.statLbl}>{t('profile.streak', 'Sequência')}</Text>
            </View>
          </View>
        </LinearGradient>}

        {/* ── ACHIEVEMENTS ── */}
        {isPW('achievements') && (convexUser?._id ? <AchievementsCard userId={convexUser._id} /> : null)}

        {/* ── QUICK STATS ── */}
        {isPW('stats') && <View style={s.quickStats}>
          {[
            { icon: '🎯', label: t('profile.goal', 'Objetivo'), value: goal },
            { icon: '⚖️', label: t('profile.weight', 'Peso'), value: weight },
            { icon: convexUser?.biologicalSex === 'female' ? '🌸' : '⚡', label: t('profile.sex', 'Sexo'), value: sexLabel },
            { icon: '😴', label: t('profile.sleep', 'Sono'), value: convexUser?.sleepHours ? `${convexUser.sleepHours}h` : '—' },
          ].map(item => (
            <View key={item.label} style={s.quickStatItem}>
              <Text style={s.quickStatEmoji}>{item.icon}</Text>
              <Text style={s.quickStatVal} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
              <Text style={s.quickStatLbl}>{item.label}</Text>
            </View>
          ))}
        </View>}

        {/* ── ACCOUNT ── */}
        {isPW('account') && <Section title={t('profile.sectionAccount', 'Conta')}>
          {!isPro && (
            <>
              <MenuRow
                icon={<Sparkles size={18} color="#f59e0b" />} iconBg="#fef3c7"
                label={t('profile.goPremium', 'Ir Premium')} sub={t('profile.goPremiumSub', 'Desbloquear todas as funcionalidades e planos IA')}
                badge={t('profile.upgrade', '✦ Atualizar')}
                onPress={() => router.push('/premium')}
              />
              <View style={s.divider} />
            </>
          )}
          <MenuRow
            icon={<Sparkles size={18} color="#6366f1" />} iconBg="#eef2ff"
            label={t('profile.myBlueprint', 'O Meu Plano')} sub={t('profile.myBlueprintSub', 'Plano de nutrição, fitness e bem-estar')}
            onPress={() => router.push('/personalized-plan')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<TrendingDown size={18} color="#ef4444" />} iconBg="#fee2e2"
            label={t('profile.sugarControl', 'Controlo de Açúcar')} sub={t('profile.sugarControlSub', 'Reset de 90 dias + check-ins diários')}
            onPress={() => router.push('/sugar-dashboard')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<RefreshCcw size={18} color="#f97316" />} iconBg="#fff7ed"
            label={t('profile.restartGoal', 'Reiniciar Objetivo')} sub={t('profile.restartGoalSub', 'Redefinir biómetràs e onboarding')}
            onPress={handleReset}
          />
        </Section>}

        {/* ── HEALTH & TRACKING ── */}
        {isPW('health') && <Section title={t('profile.sectionHealth', 'Saúde e Monitorização')}>
          <MenuRow
            icon={<Scale size={18} color="#0ea5e9" />} iconBg="#f0f9ff"
            label={t('profile.weightJourney', 'Jornada de Peso')} sub={t('profile.weightJourneySub', 'Registos, medidas e fotos de progresso')}
            onPress={() => router.push('/weightmanagement' as any)}
          />
          <View style={s.divider} />
          <MenuRow
            icon={convexUser?.biologicalSex === 'female'
              ? <Calendar size={18} color="#db2777" />
              : <Zap size={18} color="#3b82f6" />}
            iconBg={convexUser?.biologicalSex === 'female' ? '#fdf2f8' : '#eff6ff'}
            label={convexUser?.biologicalSex === 'female' ? t('profile.womensHealth', 'Saúde Feminina') : t('profile.mensHealth', 'Saúde Masculina')}
            sub={t('profile.hormonal', 'Plano hormonal e protocolos diários')}
            onPress={() => router.push(convexUser?.biologicalSex === 'female' ? '/womens-health' : '/mens-health')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Clock size={18} color="#f59e0b" />} iconBg="#fffbeb"
            label={t('profile.fastingTracker', 'Rastreador de Jejum')} sub={t('profile.fastingTrackerSub', 'Protocolos, temporizadores e sequências')}
            onPress={() => router.push('/fasting')}
          />
        </Section>}

        {/* ── TOOLS ── */}
        {isPW('tools') && <Section title={t('profile.sectionTools', 'Ferramentas')}>
          <MenuRow
            icon={<MessageSquare size={18} color="#2563eb" />} iconBg="#eff6ff"
            label={t('profile.aiCoach', 'Treinador IA')} sub={t('profile.aiCoachSub', 'O teu especialista em saúde de precisão')}
            onPress={() => router.push('/ai-coach')}
          />
          {/* Integrations - Hidden for Lite Build */}
          {/* 
          <MenuRow
            icon={<Zap size={18} color="#0ea5e9" />} iconBg="#f0f9ff"
            label="Integrations" sub="Apple Health, Strava & more"
            onPress={() => router.push('/integrations')}
          />
          <View style={s.divider} />
          */}
          <MenuRow
            icon={<Dumbbell size={18} color="#7c3aed" />} iconBg="#ede9fe"
            label={t('profile.move', 'Movimento')} sub={t('profile.moveSub', 'Treinos, passos e registo de exercício')}
            onPress={() => router.push('/move')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Utensils size={18} color="#16a34a" />} iconBg="#f0fdf4"
            label={t('profile.fuel', 'Nutrição')} sub={t('profile.fuelSub', 'Plano de refeições e registo de alimentos')}
            onPress={() => router.push('/fuel')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Heart size={18} color="#8b5cf6" />} iconBg="#f5f3ff"
            label={t('profile.wellness', 'Bem-estar')} sub={t('profile.wellnessSub', 'Humor, sono e meditação')}
            onPress={() => router.push('/wellness')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<LayoutGrid size={18} color="#0ea5e9" />} iconBg="#f0f9ff"
            label={t('profile.productivity', 'Hub de Produtividade')} sub={t('profile.productivitySub', 'Tarefas, foco e objetivos')}
            onPress={() => router.push('/todo')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<BookOpen size={18} color="#10b981" />} iconBg="#ecfdf5"
            label={t('profile.library', 'Biblioteca Bluom')} sub={t('profile.librarySub', 'Conhecimento curado e protocolos')}
            onPress={() => router.push('/library')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Trophy size={18} color="#d97706" />} iconBg="#fffbeb"
            label={t('profile.achievements', 'Conquistas')} sub={`${unlockedCount} ${t('profile.achievementsUnlocked', 'desbloqueadas')} · ${t('profile.level', 'Nível')} ${level}`}
            onPress={() => router.push('/achievements' as any)}
          />
        </Section>}

        {/* ── SUPPORT ── */}
        {isPW('support') && <Section title={t('profile.sectionSupport', 'Suporte')}>
          <MenuRow
            icon={<Bug size={18} color="#64748b" />} iconBg="#f1f5f9"
            label={t('profile.helpFeedback', 'Ajuda e Feedback')}
            onPress={() => router.push('/support')}
          />
          <View style={s.divider} />
          <MenuRow
            icon={<Settings size={18} color="#2563eb" />} iconBg="#eff6ff"
            label={t('profile.settings', 'Definições')} sub={t('profile.settingsSub', 'Unidades, objetivos, notificações')}
            onPress={() => router.push('/settings')}
          />
        </Section>}

        {/* ── ADMIN DEBUG ── */}
        {convexUser?.isAdmin && (
          <Section title={t('profile.sectionAdmin', 'Debug Admin')}>
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
            <Text style={s.signOutTxt}>{t('profile.signOut', 'Terminar Sessão')}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Image source={require('../../assets/images/logo.png')} style={s.footerLogo} resizeMode="contain" />
          <Text style={s.footerTxt}>Bluom · {t('profile.footer', 'Vida Optimizada')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  pageHeaderTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  gearBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

  // Widget config modal
  wcHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  wcTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  wcClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  wcRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  wcEmoji: { fontSize: 20 },
  wcLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  wcDivider: { height: 1, backgroundColor: '#f1f5f9' },
  wcDarkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  wcDarkLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  wcDarkLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },

  // Hero
  heroCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 14, overflow: 'hidden' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 40 },
  editBadge: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1e293b' },
  heroName: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 12 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  proBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  upgradeChip: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  upgradeChipTxt: { fontSize: 12, fontWeight: '800', color: '#fcd34d' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Achievements teaser
  achievCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, gap: 10 },
  achievLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achievTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  achievSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  achievBadges: { flexDirection: 'row', gap: 6 },
  miniBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  miniBadgeEmoji: { fontSize: 18 },
  achievNone: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  achievBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  achievBarFill: { height: '100%', backgroundColor: '#d97706', borderRadius: 2 },

  // Quick stats
  quickStats: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, gap: 0 },
  quickStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  quickStatEmoji: { fontSize: 18 },
  quickStatVal: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  quickStatLbl: { fontSize: 9, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },

  // Sections
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 2 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  divider: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 16 },

  // Menu rows
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  menuSub: { fontSize: 11, color: '#94a3b8', marginTop: 1, fontWeight: '500' },
  menuBadge: { backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  menuBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#d97706' },

  // Sign out
  signOutBtn: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#fecaca' },
  signOutTxt: { fontSize: 15, fontWeight: '700', color: '#ef4444' },

  // Debug
  debugBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, margin: 14 },
  debugTxt: { fontSize: 10, color: '#475569', fontFamily: 'monospace' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  footerLogo: { width: 72, height: 22 },
  footerTxt: { fontSize: 11, color: '#cbd5e1', fontWeight: '600' },

  // Avatar picker modal
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  pickerClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  pickerSectionLbl: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  avatarLarge: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipTxtActive: { color: '#1d4ed8' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#0f172a', transform: [{ scale: 1.08 }] },
  bgRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  bgSwatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  bgSwatchActive: { borderColor: '#0f172a', transform: [{ scale: 1.1 }] },
  bgSwatchGrad: { flex: 1 },
  saveAvatarBtn: { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveAvatarTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
