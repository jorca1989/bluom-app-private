import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Purchases from 'react-native-purchases';
import {
  configureRevenueCat,
  pickProOffering,
  pickMonthlyAndAnnualPackages,
  purchasePackageSafe,
} from '@/utils/revenuecat';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const HERO_IMAGE_URL = 'https://pub-df4415ed308d4c5c9617037ae2ddcbe9.r2.dev/Premiun.tsx%20hero.png';

// ─── Feature list ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🧠', title: 'AI Biological Coach', desc: '24/7 personalized guidance built around your metabolism, cycle & sleep data' },
  { icon: '👁️', title: 'AI Vision Tracking', desc: 'Point your camera at any meal for instant macro analysis' },
  { icon: '🎬', title: 'Guided Video Workouts', desc: 'Pro-led sessions from HIIT to Yoga, tailored to your goal' },
  { icon: '📊', title: 'Advanced Bio-Analytics', desc: 'Deep recovery, metabolic trends & readiness scoring' },
  { icon: '🌸', title: 'Hormonal Optimization', desc: 'Full Women\'s & Men\'s Health Hubs with cycle-based recommendations' },
  { icon: '⚡', title: 'Fasting Intelligence', desc: 'Live autophagy tracking and fat-burning phase alerts' },
  { icon: '🏠', title: 'Household Assistant', desc: 'Shared grocery lists, family schedules & everyone\'s health in one place' },
  { icon: '🧪', title: 'Cognitive Lab', desc: 'Unlimited brain training & stress-reduction protocols' },
];

// ─── Currency helpers ─────────────────────────────────────────────────────────
function getTreatItems(code: string | null) {
  if (code === 'USD') return { a: { icon: '🧋', label: 'Frappuccino', amount: 7.0 }, b: { icon: '🍨', label: 'McFlurry', amount: 5.25 } };
  if (code === 'EUR') return { a: { icon: '🍺', label: 'Craft Beer', amount: 6.0 }, b: { icon: '🍨', label: 'Gelato', amount: 5.0 } };
  if (code === 'GBP') return { a: { icon: '🍺', label: 'Pub Pint', amount: 6.5 }, b: { icon: '🥐', label: 'Pastry', amount: 3.0 } };
  if (code === 'BRL') return { a: { icon: '🍕', label: 'Pizza', amount: 35.0 }, b: { icon: '🧋', label: 'Iced Coffee', amount: 15.0 } };
  return { a: { icon: '🧋', label: 'Frappuccino', amount: 0 }, b: { icon: '🍨', label: 'McFlurry', amount: 0 } };
}

function fmt(amount: number, code: string | null) {
  if (!code || amount === 0) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount); } catch { return String(amount); }
}


// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ title, subtitle, price, priceNote, popular, disabled, onPress }: {
  title: string; subtitle: string; price: string; priceNote: string | null;
  popular: boolean; disabled: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => { Animated.sequence([Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }), Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true })]).start(); onPress(); };

  return (
    <Animated.View style={[styles.planCard, popular && styles.planCardPopular, disabled && { opacity: 0.5 }, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={press} disabled={disabled} activeOpacity={1} style={styles.planInner}>
        {popular && (
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>✦ BEST VALUE</Text>
          </View>
        )}
        <View style={styles.planRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{title}</Text>
            <Text style={styles.planSub}>{subtitle}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.planPrice, popular && styles.planPriceGold]}>{price}</Text>
            {priceNote ? <Text style={styles.planNote}>{priceNote}</Text> : null}
          </View>
        </View>
        <View style={[styles.planCta, popular && styles.planCtaGold]}>
          <Text style={[styles.planCtaText, popular && styles.planCtaTextDark]}>
            {popular ? '✦ Start Annual Pro' : 'Start Monthly'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Feature row ──────────────────────────────────────────────────────────────
function FeatureRow({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.featureRow, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.featureIconWrap}>
        <Text style={styles.featureEmoji}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
      <View style={styles.featureCheck}>
        <Ionicons name="checkmark" size={14} color="#d4af37" />
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const scrollY = useRef(new Animated.Value(0)).current;

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const updateUser = useMutation(api.users.updateUser);

  const isPro = useMemo(() => (
    convexUser?.subscriptionStatus === 'pro' || convexUser?.isPremium ||
    convexUser?.isAdmin || convexUser?.role === 'admin' || convexUser?.role === 'super_admin'
  ), [convexUser]);

  const [offerings, setOfferings] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isClerkLoaded || !clerkUser?.id) return;
      await configureRevenueCat(clerkUser.id);
      try {
        const o = await Purchases.getOfferings();
        if (mounted) setOfferings(o);
      } catch (e) { console.error('Offerings error:', e); }
      if (mounted) setLoadingOfferings(false);
    })();
    return () => { mounted = false; };
  }, [isClerkLoaded, clerkUser?.id]);

  const offering = useMemo(() => pickProOffering(offerings), [offerings]);
  const pkgs = useMemo(() => pickMonthlyAndAnnualPackages(offering), [offering]);
  const currencyCode = pkgs?.monthly?.product?.currencyCode ?? pkgs?.annual?.product?.currencyCode ?? null;
  const treats = getTreatItems(currencyCode);

  let annualMonthlyNote: string | null = null;
  let annualWeeklyNote: string | null = null;
  if (pkgs?.annual?.product) {
    annualMonthlyNote = fmt(pkgs.annual.product.price / 12, pkgs.annual.product.currencyCode);
    annualWeeklyNote = fmt(pkgs.annual.product.price / 52, pkgs.annual.product.currencyCode);
  }

  async function handleDismiss() {
    try { await SecureStore.deleteItemAsync('bluom_show_premium'); } catch { }
    router.replace('/(tabs)');
  }

  async function purchase(kind: 'monthly' | 'annual') {
    const pkg = kind === 'annual' ? pkgs?.annual : pkgs?.monthly;
    if (!pkg) { Alert.alert('Unavailable', 'Please check your connection and try again.'); return; }
    setUpgrading(true);
    try {
      const info = await purchasePackageSafe(pkg);
      if (!info) return;
      Alert.alert('Welcome to Pro ✦', 'Your journey just levelled up. Full access is now unlocked.');
      handleDismiss();
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally { setUpgrading(false); }
  }

  // Hero image parallax
  const heroScale = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.15, 1], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [1, 0.3], extrapolate: 'clamp' });
  const heroTranslateY = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -60], extrapolate: 'clamp' });

  if (!isClerkLoaded || convexUser === undefined) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color="#d4af37" size="large" /></View>;
  }

  return (
    <View style={styles.root}>
      {/* ── Hero image (fixed behind scroll) ── */}
      <Animated.View style={[styles.heroContainer, { transform: [{ scale: heroScale }, { translateY: heroTranslateY }], opacity: heroOpacity }]}>
        <Image source={{ uri: HERO_IMAGE_URL }} style={styles.heroImage} resizeMode="cover" />
        
        {/* Semi-dark overall overlay + fade-to-background transition */}
        <LinearGradient
          colors={['rgba(15,23,42,0.3)', 'rgba(15,23,42,0.45)', 'rgba(15,23,42,0.75)', BG]}
          locations={[0, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Close button — always on top */}
      <View style={[styles.closeBtn, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtnInner} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Spacer so content starts below hero */}
        <View style={styles.heroSpacer}>
          {/* Hero text overlay */}
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroEyebrow}>✦ BLUOM PRO</Text>
            <Text style={styles.heroHeadline}>Your Biology,{'\n'}Fully Unlocked.</Text>
            <Text style={styles.heroSub}>The complete system for peak human performance.</Text>
          </View>
        </View>

        {/* ── Main content card ── */}
        <View style={styles.contentCard}>

          {isPro ? (
            <View style={styles.proAlready}>
              <Text style={styles.proAlreadyTitle}>✦ You're already Pro</Text>
              <Text style={styles.proAlreadySub}>Full access is active. Keep optimizing.</Text>
              <TouchableOpacity style={styles.goldBtn} onPress={handleDismiss}>
                <Text style={styles.goldBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Value comparison ── */}
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>THE MATH</Text>
                <Text style={styles.sectionTitle}>Less than your daily treat</Text>
                <View style={styles.compareRow}>
                  <View style={styles.compareItem}>
                    <Text style={styles.compareEmoji}>{treats.a.icon}</Text>
                    <Text style={styles.compareAmount}>{fmt(treats.a.amount, currencyCode)}</Text>
                    <Text style={styles.compareLabel}>{treats.a.label}</Text>
                  </View>
                  <View style={styles.comparePlus}>
                    <Text style={styles.comparePlusText}>+</Text>
                  </View>
                  <View style={styles.compareItem}>
                    <Text style={styles.compareEmoji}>{treats.b.icon}</Text>
                    <Text style={styles.compareAmount}>{fmt(treats.b.amount, currencyCode)}</Text>
                    <Text style={styles.compareLabel}>{treats.b.label}</Text>
                  </View>
                  <View style={styles.compareEquals}>
                    <Text style={styles.compareEqualsText}>=</Text>
                  </View>
                  <View style={[styles.compareItem, styles.compareHighlight]}>
                    <Text style={styles.compareEmoji}>💎</Text>
                    <Text style={[styles.compareAmount, { color: '#d4af37' }]}>Pro</Text>
                    <Text style={[styles.compareLabel, { color: '#d4af37' }]}>Forever</Text>
                  </View>
                </View>
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Pricing plans ── */}
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>CHOOSE YOUR PLAN</Text>
                <PlanCard
                  title="Annual Pro"
                  subtitle={annualWeeklyNote ? `Only ${annualWeeklyNote}/week — save 50%` : 'Best value, cancel anytime'}
                  price={pkgs?.annual?.product?.priceString ?? '—'}
                  priceNote={annualMonthlyNote ? `${annualMonthlyNote} / month` : null}
                  popular={true}
                  disabled={upgrading || !pkgs?.annual}
                  onPress={() => purchase('annual')}
                />
                <PlanCard
                  title="Monthly Pro"
                  subtitle="Full access, billed monthly"
                  price={pkgs?.monthly?.product?.priceString ?? '—'}
                  priceNote={null}
                  popular={false}
                  disabled={upgrading || !pkgs?.monthly}
                  onPress={() => purchase('monthly')}
                />
                {upgrading && (
                  <View style={styles.upgradingRow}>
                    <ActivityIndicator color="#d4af37" size="small" />
                    <Text style={styles.upgradingText}>Processing…</Text>
                  </View>
                )}
              </View>

              {/* ── Social proof ── */}
              <View style={styles.socialProof}>
                <Text style={styles.socialProofText}>🔥 10,000+ humans already optimizing their biology</Text>
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Features ── */}
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>EVERYTHING INCLUDED</Text>
                <Text style={styles.sectionTitle}>The Pro edge</Text>
                {FEATURES.map((f, i) => <FeatureRow key={f.title} {...f} index={i} />)}
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Secondary actions ── */}
              <TouchableOpacity style={styles.ghostBtn} onPress={handleDismiss} activeOpacity={0.7}>
                <Text style={styles.ghostBtnText}>Continue with free version</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                disabled={restoring}
                activeOpacity={0.7}
                onPress={async () => {
                  setRestoring(true);
                  try {
                    const info = await Purchases.restorePurchases();
                    const active = info?.entitlements?.active;
                    const hasPro = active && (active['pro'] || active['premium'] || Object.keys(active).length > 0);
                    if (hasPro && convexUser?._id) {
                      await updateUser({ userId: convexUser._id, updates: { isPremium: true } });
                      Alert.alert('Restored ✦', 'Pro access has been restored.');
                      handleDismiss();
                    } else {
                      Alert.alert('Nothing to restore', 'No previous Pro purchase found on this account.');
                    }
                  } catch (e: any) {
                    Alert.alert('Restore failed', e?.message ?? 'Please try again.');
                  } finally { setRestoring(false); }
                }}
              >
                <Text style={[styles.ghostBtnText, { color: '#d4af37' }]}>
                  {restoring ? 'Restoring…' : 'Restore purchases'}
                </Text>
              </TouchableOpacity>

              {/* ── Legal footer ── */}
              <View style={styles.legal}>
                <Text style={styles.legalText}>
                  {Platform.OS === 'ios'
                    ? 'Payment charged to Apple ID at purchase confirmation. Subscription auto-renews unless cancelled 24+ hours before period end. Manage in App Store settings.'
                    : 'Payment charged to Google Play at purchase confirmation. Subscription auto-renews unless cancelled 24+ hours before period end. Manage in Google Play settings.'}
                </Text>
                <View style={styles.legalLinks}>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.bluom.app/legal/privacy')}>
                    <Text style={styles.legalLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <Text style={styles.legalDot}> · </Text>
                  <TouchableOpacity onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' : 'https://www.bluom.app/legal/terms')}>
                    <Text style={styles.legalLink}>Terms{Platform.OS === 'ios' ? ' (EULA)' : ''}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const HERO_HEIGHT = height * 0.52;
const GOLD = '#d4af37';
const GOLD_LIGHT = '#f0d060';
const BG = '#f8fafc';
const CARD = '#ffffff';
const BORDER = '#e2e8f0';
const TEXT = '#0f172a';
const MUTED = '#64748b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: HERO_HEIGHT,
    zIndex: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  heroSpacer: {
    height: HERO_HEIGHT - 180,
    justifyContent: 'flex-end',
  },
  heroTextWrap: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 3,
    marginBottom: 10,
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 44,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },

  // Wave (removed, integrated into gradient)

  // Close button
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  closeBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Content card
  contentCard: {
    backgroundColor: BG,
    zIndex: 2,
    paddingTop: 8,
  },

  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 3,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: TEXT,
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 24,
  },

  // Compare
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  compareHighlight: {
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  compareEmoji: { fontSize: 24, marginBottom: 6 },
  compareAmount: { fontSize: 13, fontWeight: '900', color: TEXT, marginBottom: 2 },
  compareLabel: { fontSize: 10, fontWeight: '700', color: MUTED },
  comparePlus: { alignItems: 'center' },
  comparePlusText: { fontSize: 18, fontWeight: '300', color: MUTED },
  compareEquals: { alignItems: 'center' },
  compareEqualsText: { fontSize: 18, fontWeight: '300', color: MUTED },

  // Plan cards
  planCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    marginBottom: 12,
    overflow: 'hidden',
  },
  planCardPopular: {
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  planInner: { padding: 20 },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '900', color: '#0a0a0f', letterSpacing: 1.5 },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  planTitle: { fontSize: 17, fontWeight: '900', color: TEXT, marginBottom: 4 },
  planSub: { fontSize: 12, fontWeight: '600', color: MUTED, lineHeight: 16 },
  planPrice: { fontSize: 20, fontWeight: '900', color: TEXT },
  planPriceGold: { color: GOLD_LIGHT },
  planNote: { fontSize: 11, fontWeight: '700', color: GOLD, marginTop: 2 },
  planCta: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  planCtaGold: {
    backgroundColor: GOLD,
  },
  planCtaText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  planCtaTextDark: { color: '#0f172a' },

  upgradingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  upgradingText: { fontSize: 13, color: MUTED },

  // Social proof
  socialProof: { alignItems: 'center', paddingVertical: 16 },
  socialProofText: { fontSize: 13, fontWeight: '700', color: GOLD },

  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  featureEmoji: { fontSize: 20 },
  featureTitle: { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: MUTED, lineHeight: 16 },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },

  // Ghost buttons
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 24,
    marginTop: 8,
  },
  ghostBtnText: { fontSize: 13, fontWeight: '700', color: MUTED },

  // Gold button
  goldBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  goldBtnText: { fontSize: 15, fontWeight: '900', color: '#0a0a0f' },

  // Pro already
  proAlready: { padding: 32, alignItems: 'center' },
  proAlreadyTitle: { fontSize: 22, fontWeight: '900', color: GOLD, marginBottom: 8 },
  proAlreadySub: { fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 8 },

  // Legal
  legal: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  legalText: { fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 15, marginBottom: 12 },
  legalLinks: { flexDirection: 'row', alignItems: 'center' },
  legalLink: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  legalDot: { color: MUTED, paddingHorizontal: 4 },

});