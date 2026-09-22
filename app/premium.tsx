import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Purchases from 'react-native-purchases';
import {
  configureRevenueCat,
  pickProOffering,
  pickMonthlyAndAnnualPackages,
  purchasePackageSafe,
  getTrialDuration,
} from '@/utils/revenuecat';
import { useUser as useAppUser } from '@/context/UserContext';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, type ThemeColors } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Feature list ──────────────────────────────────────────────────────────────
function getFeatures(t: any) {
  return [
    { icon: '🥗', title: t('premium.featNutritionTitle', 'Personalised Nutrition Plan'), desc: t('premium.featNutritionDesc', 'Custom macros, meals and daily protocols tailored to your goals') },
    { icon: '🏋️', title: t('premium.featFitnessTitle', 'Personalised Fitness Plan'), desc: t('premium.featFitnessDesc', '4-week progressive training programme built around your schedule') },
    { icon: '🧠', title: t('premium.featMentalTitle', 'Mental Health Plan'), desc: t('premium.featMentalDesc', 'Weekly mindset themes, stress protocols and meditation sessions') },
    { icon: '♀️', title: t('premium.featWomensHealthTitle', "Women's Health Optimisation"), desc: t('premium.featWomensHealthDesc', 'Cycle tracking, phase-based protocols and pregnancy support') },
    { icon: '♂️', title: t('premium.featMensHealthTitle', "Men's Health Optimisation"), desc: t('premium.featMensHealthDesc', 'Testosterone protocols and male performance tracking') },
    { icon: '⚡', title: t('premium.featProductivityTitle', 'Productivity Tools'), desc: t('premium.featProductivityDesc', 'Deep work timers, focus states and schedule planners') },
    { icon: '📈', title: t('premium.featHabitsTitle', 'Habits Tracker'), desc: t('premium.featHabitsDesc', 'Daily habit tracking and streak builder') },
    { icon: '😴', title: t('premium.featSleepTitle', 'Sleep Analysis'), desc: t('premium.featSleepDesc', 'Sleep protocols and circadian rhythm optimisation') },
    { icon: '🤖', title: t('premium.featAiCoachTitle', 'AI Coach'), desc: t('premium.featAiCoachDesc', 'Unlimited personalised responses') },
    { icon: '👁️', title: t('premium.featVisionTitle', 'AI Vision'), desc: t('premium.featVisionDesc', 'Scan meals with your camera') },
    { icon: '📊', title: t('premium.featAnalyticsTitle', 'Advanced Analytics'), desc: t('premium.featAnalyticsDesc', 'Deep health and performance trends') },
  ];
}

// ─── Plan Option Component ───────────────────────────────────────────────────
function PlanOptionRow({
  title,
  subtitle,
  price,
  priceNote,
  popular,
  selected,
  disabled,
  onPress,
  isLifetime,
}: {
  title: string;
  subtitle: string;
  price: string;
  priceNote: string | null;
  popular: boolean;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  isLifetime?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const styles = useMemo(() => createStyles(themeColors, theme), [themeColors, theme]);
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.98, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.6 }]}>
      <TouchableOpacity
        onPress={press}
        disabled={disabled}
        activeOpacity={0.88}
        style={[styles.planCard, selected && styles.planCardSelected]}
      >
        {popular && (
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>{t('premium.bestValue', '★ BEST VALUE')}</Text>
          </View>
        )}
        <View style={styles.planRow}>
          {/* Radio indicator */}
          <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
            {selected && <View style={styles.radioDot} />}
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.planTitle}>{isLifetime ? `♾️ ${title}` : title}</Text>
            <Text style={styles.planSub}>{subtitle}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{price}</Text>
            {priceNote ? <Text style={styles.planNote}>{priceNote}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function PremiumScreen() {
  const { colors: themeColors, theme } = useTheme();
  const isDark = themeColors.scheme === 'dark';
  const styles = useMemo(() => createStyles(themeColors, theme), [themeColors, theme]);
  const { t } = useTranslation();
  const FEATURES = useMemo(() => getFeatures(t), [t]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const updateUser = useMutation(api.users.updateUser);
  const { refresh: refreshAppUser } = useAppUser();

  const isPro = useMemo(() => (
    convexUser?.subscriptionStatus === 'pro' || convexUser?.isPremium ||
    convexUser?.isAdmin || convexUser?.role === 'admin' || convexUser?.role === 'super_admin'
  ), [convexUser]);

  const [offerings, setOfferings] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<'annual' | 'monthly' | 'lifetime'>('annual');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isClerkLoaded || !clerkUser?.id) return;
      await configureRevenueCat(clerkUser.id);
      try {
        const o = await Purchases.getOfferings();
        if (mounted) setOfferings(o);
      } catch (e) { console.error('Offerings error:', e); }
    })();
    return () => { mounted = false; };
  }, [isClerkLoaded, clerkUser?.id]);

  const offering = useMemo(() => pickProOffering(offerings), [offerings]);
  const pkgs = useMemo(() => pickMonthlyAndAnnualPackages(offering), [offering]);
  const lifetimePkg = pkgs?.lifetime;
  const trialText = getTrialDuration(pkgs?.annual) ?? '7-day free trial';

  const annualFormattedPrice = pkgs?.annual?.product?.priceString ?? '—';
  const annualPriceNumber = pkgs?.annual?.product?.price ?? 0;
  const monthlyFormattedPrice = pkgs?.monthly?.product?.priceString ?? '—';
  const monthlyPriceNumber = pkgs?.monthly?.product?.price ?? 0;
  const lifetimePriceNumber = lifetimePkg?.product?.price ?? 0;
  const currencySymbol = annualFormattedPrice.replace(/[\d.,\s]/g, '') || '$';

  const perWk = t('premium.perWeek', '/wk');
  const weeklyEquivalent = annualPriceNumber > 0
    ? `${currencySymbol}${(annualPriceNumber / 52).toFixed(2)}${perWk}`
    : '—';

  const weeklyEquivalentMonthly = monthlyPriceNumber > 0
    ? `${currencySymbol}${(monthlyPriceNumber / 4.33).toFixed(2)}${perWk}`
    : '—';

  const paidOffText = t('premium.lifetimePaidOff', 'paid off in 1 yr');
  const weeklyEquivalentLifetime = lifetimePriceNumber > 0
    ? `${currencySymbol}${(lifetimePriceNumber / 52).toFixed(2)}${perWk} (${paidOffText})`
    : '—';

  // Calculate dynamic trial dates
  const dates = useMemo(() => {
    const today = new Date();
    const day5 = new Date(today);
    day5.setDate(today.getDate() + 5);
    const day7 = new Date(today);
    day7.setDate(today.getDate() + 7);

    const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      day5Str: fmtDate(day5),
      day7Str: fmtDate(day7),
    };
  }, []);

  async function handleDismiss() {
    try { await SecureStore.deleteItemAsync('bluom_show_premium'); } catch { }
    router.replace('/(tabs)');
  }

  async function makePurchase(pkg: any) {
    if (!pkg) { 
      Alert.alert(
        t('premium.unavailableTitle', 'Unavailable'), 
        t('premium.unavailableMsg', 'Please check your connection and try again.')
      ); 
      return; 
    }
    setUpgrading(true);
    try {
      const info = await purchasePackageSafe(pkg);
      if (!info) return;
      await refreshAppUser().catch(() => {});
      Alert.alert(
        t('premium.welcomeProTitle', 'Welcome to Pro ✦'), 
        t('premium.welcomeProMsg', 'Your trial is active. Full access is unlocked!')
      );
      handleDismiss();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(
          t('premium.purchaseFailedTitle', 'Purchase failed'), 
          e?.message ?? t('premium.pleaseTryAgain', 'Please try again.')
        );
      }
    } finally { setUpgrading(false); }
  }

  const selectedPkg = useMemo(() => {
    if (selectedPlanType === 'lifetime') return lifetimePkg;
    if (selectedPlanType === 'monthly') return pkgs?.monthly;
    return pkgs?.annual;
  }, [selectedPlanType, lifetimePkg, pkgs]);

  if (!isClerkLoaded || convexUser === undefined) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color={themeColors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* ── Top Header ── */}
      <View style={styles.topNav}>
        <View />
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} activeOpacity={0.75}>
          <Ionicons name="close" size={22} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 100 }]}
      >
        {isPro ? (
          <View style={styles.proAlready}>
            <Text style={styles.proAlreadyTitle}>{t('premium.alreadyPro', "✦ You're Pro")}</Text>
            <Text style={styles.proAlreadySub}>{t('premium.alreadyProSub', 'Full access is active. Keep optimising.')}</Text>
            <TouchableOpacity style={styles.primaryCta} onPress={handleDismiss}>
              <Text style={styles.primaryCtaTxt}>{t('premium.continue', 'Continue')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Main Headline ── */}
            <View style={styles.headlineWrap}>
              <Text style={styles.headlineTitle}>
                {t('premium.trialHeader', "Here's how your free trial works")}
              </Text>
            </View>

            {/* ── Fig+ Style Trial Timeline Card ── */}
            <View style={styles.timelineCard}>
              <View style={styles.timelineLineContainer}>
                <View style={styles.timelineLine} />
              </View>

              {/* Step 1: Today */}
              <View style={styles.timelineStep}>
                <View style={[styles.iconBubble, styles.iconBubblePrimary]}>
                  <Ionicons name="lock-open-outline" size={18} color="#fff" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {t('premium.step1Title', 'Today: Start Your Free Trial')}
                  </Text>
                  <Text style={styles.stepSub}>
                    {t('premium.step1Sub', 'Get instant access to unlimited AI meal scans, custom workouts, mental health protocols & cycle intelligence.')}
                  </Text>
                </View>
              </View>

              {/* Step 2: Day 5 */}
              <View style={styles.timelineStep}>
                <View style={[styles.iconBubble, styles.iconBubbleMuted]}>
                  <Ionicons name="notifications-outline" size={18} color={themeColors.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {t('premium.step2Title', `Day 5: Trial Reminder (${dates.day5Str})`, { date: dates.day5Str })}
                  </Text>
                  <Text style={styles.stepSub}>
                    {t('premium.step2Sub', "You'll receive a push notification and email reminder that your free trial is ending soon.")}
                  </Text>
                </View>
              </View>

              {/* Step 3: Day 7 */}
              <View style={styles.timelineStep}>
                <View style={[styles.iconBubble, styles.iconBubbleGold]}>
                  <Ionicons name="star-outline" size={18} color="#fff" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>
                    {t('premium.step3Title', `Day 7: Trial Ends (${dates.day7Str})`, { date: dates.day7Str })}
                  </Text>
                  <Text style={styles.stepSub}>
                    {t('premium.step3Sub', `You'll be billed for your selected plan. Cancel anytime before in App Store / Play Store settings.`)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Featured Plan Card (Default Selected) ── */}
            <View style={styles.plansContainer}>
              <PlanOptionRow
                title={t('premium.annualTitle', 'Pro Annual')}
                subtitle={t('premium.annualSubWithPrice', 'Billed annually ({{price}})', { price: weeklyEquivalent })}
                price={annualFormattedPrice ? `${annualFormattedPrice} ${t('premium.perYear', '/ yr')}` : '—'}
                priceNote={trialText}
                popular={true}
                selected={selectedPlanType === 'annual'}
                disabled={upgrading || !pkgs?.annual}
                onPress={() => setSelectedPlanType('annual')}
              />

              {/* Expandable Other Options (Monthly / Lifetime) */}
              {showOtherOptions && (
                <View style={styles.extraPlansWrap}>
                  <PlanOptionRow
                    title={t('premium.monthlyTitle', 'Pro Monthly')}
                    subtitle={t('premium.monthlySubWithPrice', 'Full access, billed monthly ({{price}})', { price: weeklyEquivalentMonthly })}
                    price={monthlyFormattedPrice ? `${monthlyFormattedPrice} ${t('premium.perMonth', '/ mo')}` : '—'}
                    priceNote={null}
                    popular={false}
                    selected={selectedPlanType === 'monthly'}
                    disabled={upgrading || !pkgs?.monthly}
                    onPress={() => setSelectedPlanType('monthly')}
                  />

                  {lifetimePkg && (
                    <PlanOptionRow
                      title={t('premium.lifetimeTitle', 'Pro Lifetime')}
                      subtitle={t('premium.lifetimeSubWithPrice', 'Pay once, own it forever ({{price}})', { price: weeklyEquivalentLifetime })}
                      price={lifetimePkg.product?.priceString ?? '—'}
                      priceNote={t('premium.oneTimePayment', 'One-time payment')}
                      popular={false}
                      selected={selectedPlanType === 'lifetime'}
                      disabled={upgrading || !lifetimePkg}
                      onPress={() => setSelectedPlanType('lifetime')}
                      isLifetime={true}
                    />
                  )}
                </View>
              )}

              {/* Toggle secondary plan options button */}
              <TouchableOpacity
                onPress={() => setShowOtherOptions(prev => !prev)}
                style={styles.seeOtherBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.seeOtherTxt}>
                  {showOtherOptions ? t('premium.hideOtherOptions', 'Hide Other Options') : t('premium.seeOtherOptions', 'See Other Options')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Collapsible Feature Checklist Teaser ── */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>{t('premium.includedInTrial', 'Included in your trial:')}</Text>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={themeColors.primary} />
                  <Text style={styles.featureTxt}>{f.title}</Text>
                </View>
              ))}
            </View>

            {/* ── Price Comparison ── */}
            <LinearGradient 
              colors={isDark ? ['#1e1e2d', '#1a1a24'] : ['#ffffff', '#f8fafc']}
              style={styles.priceComparisonCard}
            >
              <Text style={styles.priceCompTitle}>
                {t('premium.priceCompTitle', 'Peak biology & mind for less than a daily treat')}
              </Text>
              
              {/* 2 Treat Cards Side-by-Side */}
              <View style={styles.priceCompTreatsRow}>
                <View style={styles.priceCompTreatCard}>
                  <Text style={styles.priceCompEmoji}>🍦</Text>
                  <Text style={styles.priceCompLabel}>{t('premium.gelato', 'Gelato')}</Text>
                  <Text style={styles.priceCompPrice}>{currencySymbol}5</Text>
                </View>
                <View style={styles.priceCompTreatCard}>
                  <Text style={styles.priceCompEmoji}>🍺</Text>
                  <Text style={styles.priceCompLabel}>{t('premium.pint', 'Pint')}</Text>
                  <Text style={styles.priceCompPrice}>{currencySymbol}7</Text>
                </View>
              </View>

              {/* Full Width Subcard / Highlight Banner for Bluom Pro */}
              <View style={styles.priceCompHighlightBanner}>
                <View style={styles.priceCompHighlightLeft}>
                  <Text style={styles.priceCompHighlightIcon}>✦</Text>
                  <Text style={styles.priceCompHighlightLabel}>{t('premium.bluomPro', 'Bluom Pro')}</Text>
                </View>
                <Text style={styles.priceCompHighlightPrice}>{weeklyEquivalent}</Text>
              </View>
            </LinearGradient>

            {/* ── Restore & Terms links ── */}
            <View style={styles.secondaryLinks}>
              <TouchableOpacity
                disabled={restoring}
                onPress={async () => {
                  setRestoring(true);
                  try {
                    const info = await Purchases.restorePurchases();
                    const active = info?.entitlements?.active;
                    if (active && (active['pro'] || active['premium'] || Object.keys(active).length > 0)) {
                      if (convexUser?._id) await updateUser({ userId: convexUser._id, updates: { isPremium: true } });
                      Alert.alert(
                        t('premium.restoredTitle', 'Restored ✦'), 
                        t('premium.restoredMsg', 'Pro access has been restored.')
                      );
                      handleDismiss();
                    } else {
                      Alert.alert(
                        t('premium.nothingToRestoreTitle', 'Nothing to restore'), 
                        t('premium.nothingToRestoreMsg', 'No active Pro purchase found.')
                      );
                    }
                  } catch (e: any) {
                    Alert.alert(
                      t('premium.restoreFailedTitle', 'Restore failed'), 
                      e?.message ?? t('premium.pleaseTryAgain', 'Please try again.')
                    );
                  } finally { setRestoring(false); }
                }}
              >
                <Text style={styles.secondaryTxt}>
                  {restoring ? t('premium.restoring', 'Restoring…') : t('premium.restorePurchases', 'Restore Purchases')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dotSeparator}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.bluom.app/legal/terms')}>
                <Text style={styles.secondaryTxt}>{t('premium.terms', 'Terms')}</Text>
              </TouchableOpacity>
              <Text style={styles.dotSeparator}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.bluom.app/legal/privacy')}>
                <Text style={styles.secondaryTxt}>{t('premium.privacy', 'Privacy')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Sticky Bottom CTA Bar ── */}
      {!isPro && (
        <View style={[styles.bottomCtaBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <TouchableOpacity
            style={styles.primaryCta}
            disabled={upgrading}
            activeOpacity={0.88}
            onPress={() => makePurchase(selectedPkg)}
          >
            {upgrading ? (
              <ActivityIndicator color={themeColors.onPrimary} size="small" />
            ) : (
              <Text style={styles.primaryCtaTxt}>
                {selectedPlanType === 'annual'
                  ? t('premium.startTrialAndContinue', 'Start Free Trial & Continue')
                  : selectedPlanType === 'lifetime'
                  ? t('premium.getLifetimeAccess', 'Get Lifetime Access')
                  : t('premium.subscribeMonthly', 'Subscribe Monthly')}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.noCommitmentTxt}>
            {t('premium.noCommitment', 'No commitment · Cancel anytime in Settings')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Theme Aware Styles ────────────────────────────────────────────────────────
const createStyles = (c: ThemeColors, themeName: string) => {
  const isDark = c.scheme === 'dark' || themeName === 'black' || themeName === 'navy';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    brandTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.5,
    },
    brandPlus: {
      color: c.primary,
      fontWeight: '900',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    headlineWrap: {
      alignItems: 'center',
      marginVertical: 18,
    },
    headlineTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: c.text,
      textAlign: 'center',
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    // Timeline Card
    timelineCard: {
      backgroundColor: c.surface,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 22,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    timelineLineContainer: {
      position: 'absolute',
      top: 40,
      bottom: 40,
      left: 39,
      width: 2,
      zIndex: 0,
    },
    timelineLine: {
      flex: 1,
      backgroundColor: c.border,
      borderRadius: 1,
    },
    timelineStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 10,
      zIndex: 1,
    },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    iconBubblePrimary: {
      backgroundColor: c.primary,
    },
    iconBubbleMuted: {
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    iconBubbleGold: {
      backgroundColor: '#f59e0b',
    },
    stepContent: {
      flex: 1,
      paddingTop: 2,
    },
    stepTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      marginBottom: 4,
    },
    stepSub: {
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 19,
    },
    // Plan Options
    plansContainer: {
      marginBottom: 16,
    },
    planCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    planCardSelected: {
      borderColor: c.primary,
      backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
    },
    bestBadge: {
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 8,
    },
    bestBadgeText: {
      color: c.onPrimary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radioCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: c.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    planSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    planPrice: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    planPriceSelected: {
      color: c.primary,
    },
    planNote: {
      fontSize: 11,
      fontWeight: '700',
      color: '#16a34a',
      marginTop: 2,
    },
    extraPlansWrap: {
      marginTop: 4,
    },
    seeOtherBtn: {
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    seeOtherTxt: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textMuted,
    },
    // Features Section
    featuresSection: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    featuresTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      marginBottom: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    featureTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    // Price Comparison
    priceComparisonCard: {
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    priceCompTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 21,
    },
    priceCompTreatsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      marginBottom: 10,
    },
    priceCompTreatCard: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    priceCompEmoji: {
      fontSize: 34,
      marginBottom: 4,
    },
    priceCompLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textMuted,
      marginBottom: 2,
    },
    priceCompPrice: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    priceCompHighlightBanner: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: 'rgba(99,102,241,0.35)',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    priceCompHighlightLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceCompHighlightIcon: {
      fontSize: 18,
      color: c.primary,
      fontWeight: '900',
    },
    priceCompHighlightLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
    },
    priceCompHighlightPrice: {
      fontSize: 16,
      fontWeight: '900',
      color: c.primary,
    },
    // Secondary links
    secondaryLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    secondaryTxt: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '600',
    },
    dotSeparator: {
      color: c.textMuted,
      fontSize: 12,
    },
    // Bottom Sticky CTA
    bottomCtaBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.surface,
      paddingHorizontal: 24,
      paddingTop: 14,
      borderTopWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 12,
    },
    primaryCta: {
      backgroundColor: c.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryCtaTxt: {
      color: c.onPrimary,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    noCommitmentTxt: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 8,
      fontWeight: '600',
    },
    proAlready: {
      padding: 30,
      alignItems: 'center',
    },
    proAlreadyTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: c.text,
      marginBottom: 8,
    },
    proAlreadySub: {
      fontSize: 14,
      color: c.textMuted,
      marginBottom: 24,
    },
  });
};
