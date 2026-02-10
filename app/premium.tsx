import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  configureRevenueCat,
  getOfferingsSafe,
  pickProOffering,
  pickMonthlyAndAnnualPackages,
  purchasePackageSafe,
} from '@/utils/revenuecat';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const POWER_FEATURES = [
  {
    icon: '🧠',
    title: 'AI Biological Coach',
    description: '24/7 personalized voice & chat guidance that knows your blood sugar & cycle data',
    pro: true
  },
  {
    icon: '👁️',
    title: 'AI Vision',
    description: 'Photo-based calorie & macro tracking with instant metabolic analysis',
    pro: true
  },
  {
    icon: '�',
    title: 'Bluom University',
    description: 'Exclusive high-performance protocols & science-backed guides',
    pro: true
  },
  {
    icon: '🎬',
    title: 'Guided Video Workouts',
    description: 'Pro-led sessions for every goal, from HIIT to Yoga',
    pro: true
  },
  {
    icon: '📊',
    title: 'Advanced Bio-Analytics',
    description: 'Deep insights into your recovery, metabolism, and trends',
    pro: true
  },
  {
    icon: '�🌸',
    title: 'Hormonal Optimization',
    description: 'Unlock full Women\'s/Men\'s Health Hubs with cycle-based recommendations',
    pro: true
  },
  {
    icon: '⚡',
    title: 'Metabolic Fasting Intelligence',
    description: 'See exactly when you hit Autophagy & maximize fat-burning phases',
    pro: true
  },
  {
    icon: '🏠',
    title: 'Full Household Assistant',
    description: 'Sync grocery lists, family schedules, and manage everyone\'s health in one spot',
    pro: true
  },
  {
    icon: '🛒',
    title: 'Auto-Pilot Grocery Sync',
    description: 'Instant shopping lists from your meal plans',
    pro: true
  },
  {
    icon: '🧪',
    title: 'Cognitive Lab',
    description: 'Unlimited brain training games & stress-reduction logs',
    pro: true
  }
];

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const isPro = useMemo(() => {
    return (
      convexUser?.subscriptionStatus === 'pro' ||
      convexUser?.isPremium ||
      convexUser?.isAdmin ||
      convexUser?.role === 'admin' ||
      convexUser?.role === 'super_admin'
    );
  }, [convexUser?.subscriptionStatus, convexUser?.isPremium, convexUser?.isAdmin, convexUser?.role]);

  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Wait until we have a user id so we can configure Purchases first.
      if (!isClerkLoaded || !clerkUser?.id) return;
      setLoading(true);
      // Ensure Purchases is configured before calling getOfferings (prevents "no singleton instance").
      await configureRevenueCat(clerkUser.id);
      const o = await getOfferingsSafe();
      if (!mounted) return;
      setOfferings(o);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [isClerkLoaded, clerkUser?.id]);

  const offering = useMemo(() => pickProOffering(offerings), [offerings]);
  const pkgs = useMemo(() => pickMonthlyAndAnnualPackages(offering), [offering]);

  function getComparisonItem() {
    const code = pkgs?.monthly?.product?.currencyCode;
    if (code === 'USD') return 'Large Frappuccino';
    if (code === 'EUR') return '2 Craft Beers';
    if (code === 'BRL') return 'Medium Pizza';
    return 'Daily Treat';
  }

  const currencyCode =
    pkgs?.monthly?.product?.currencyCode ?? pkgs?.annual?.product?.currencyCode ?? null;

  function formatCurrency(amount: number) {
    if (!currencyCode) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch {
      // Fallback if Intl/currencyCode is unexpected on device
      return String(amount);
    }
  }

  function getTreatItems(): {
    a: { icon: string; label: string; amount: number };
    b: { icon: string; label: string; amount: number };
  } {
    if (currencyCode === 'USD') {
      return {
        a: { icon: '🧋', label: 'Frappuccino', amount: 7.0 },
        b: { icon: '🍨', label: 'McFlurry', amount: 5.25 },
      };
    }
    if (currencyCode === 'EUR') {
      return {
        a: { icon: '🍺', label: 'Craft Beer', amount: 6.0 },
        b: { icon: '🍨', label: 'Gelato', amount: 5.0 },
      };
    }
    if (currencyCode === 'GBP') {
      return {
        a: { icon: '🍺', label: 'Pub Pint', amount: 6.5 },
        b: { icon: '🥐', label: 'Pastry', amount: 3.0 },
      };
    }
    if (currencyCode === 'BRL') {
      return {
        a: { icon: '🍕', label: 'Medium Pizza', amount: 35.0 },
        b: { icon: '🧋', label: 'Iced Coffee', amount: 15.0 },
      };
    }
    if (!currencyCode) {
      return {
        a: { icon: '🧋', label: 'Frappuccino', amount: 0 },
        b: { icon: '🍨', label: 'McFlurry', amount: 0 },
      };
    }
    return {
      a: { icon: '🍪', label: 'Daily Treat', amount: 5.0 },
      b: { icon: '🧋', label: 'Coffee', amount: 4.0 },
    };
  }

  async function handleDismiss() {
    try {
      await SecureStore.deleteItemAsync('bluom_show_premium');
    } catch (e) {
      console.log('Error clearing premium flag', e);
    } finally {
      router.replace('/(tabs)');
    }
  }

  let annualMonthlyNote: string | null = null;
  let annualWeeklyNote: string | null = null;

  if (pkgs?.annual?.product) {
    // monthly cost breakdown
    const monthlyEquivalent = pkgs.annual.product.price / 12;
    annualMonthlyNote = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: pkgs.annual.product.currencyCode,
    }).format(monthlyEquivalent);

    // weekly cost breakdown
    const weeklyEquivalent = pkgs.annual.product.price / 52;
    annualWeeklyNote = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: pkgs.annual.product.currencyCode,
    }).format(weeklyEquivalent);
  }

  async function purchase(kind: 'monthly' | 'annual') {
    const pkg = kind === 'annual' ? pkgs.annual : pkgs.monthly;
    if (!pkg) {
      Alert.alert(
        'RevenueCat not configured',
        'Configure Monthly + Annual packages in RevenueCat, and add EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.'
      );
      return;
    }
    setUpgrading(true);
    try {
      const customerInfo = await purchasePackageSafe(pkg);
      // purchasePackageSafe returns null if the user cancelled
      if (!customerInfo) {
        return;
      }

      Alert.alert('Success', 'Purchase complete. Pro access may take a moment to sync.');
      handleDismiss();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase failed', e?.message ? String(e.message) : 'Please try again.');
      }
    } finally {
      setUpgrading(false);
    }
  }

  if (!isClerkLoaded || convexUser === undefined) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const treatItems = getTreatItems();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleDismiss} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Biology, Optimized</Text>
          <Text style={styles.headerSub}>For less than your morning coffee</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isPro ? (
        <View style={[styles.card, { margin: 16 }]}>
          <Text style={styles.proTitle}>You’re already Pro</Text>
          <Text style={styles.proSub}>No upgrade needed.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDismiss} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Value Comparison Section */}
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>
              Your best version for less than {getComparisonItem()}
            </Text>

            {/* 2-up treats */}
            <View style={styles.comparisonRow2}>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonIcon, { fontSize: 32 }]}>{treatItems.a.icon}</Text>
                <Text style={styles.comparisonPrice}>{formatCurrency(treatItems.a.amount)}</Text>
                <Text style={styles.comparisonLabel}>{treatItems.a.label}</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonIcon, { fontSize: 32 }]}>{treatItems.b.icon}</Text>
                <Text style={styles.comparisonPrice}>{formatCurrency(treatItems.b.amount)}</Text>
                <Text style={styles.comparisonLabel}>{treatItems.b.label}</Text>
              </View>
            </View>

            {/* Peak Biology banner */}
            <View style={styles.pricelessBanner}>
              <View style={styles.pricelessBannerLeft}>
                <Text style={styles.pricelessBannerIcon}>💎</Text>
                <View>
                  <Text style={styles.pricelessBannerTitle}>Peak Biology</Text>
                  <Text style={styles.pricelessBannerSub}>The ultimate reward</Text>
                </View>
              </View>
              <View style={styles.pricelessPill}>
                <Text style={styles.pricelessText}>Priceless</Text>
              </View>
            </View>
          </View>

          {/* Power Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>The Pro Edge</Text>
            <View style={styles.featuresGrid}>
              {POWER_FEATURES.map((feature, index) => (
                <BlurView key={index} intensity={20} style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.iconText}>{feature.icon}</Text>
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </BlurView>
              ))}
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <PlanCard
              title="Monthly Pro"
              subtitle="Full access"
              price={pkgs?.monthly?.product?.priceString ?? '—'}
              priceNote={null}
              popular={false}
              disabled={upgrading || !pkgs.monthly}
              onPress={() => purchase('monthly')}
            />
            <PlanCard
              title="Annual Pro"
              subtitle={`Save 50% — Only ${annualWeeklyNote || '$1.20'} per week`}
              price={pkgs?.annual?.product?.priceString ?? '—'}
              priceNote={annualMonthlyNote ? `(${annualMonthlyNote}/mo)` : null}
              popular={true}
              disabled={upgrading || !pkgs.annual}
              onPress={() => purchase('annual')}
            />
          </View>

          {/* Social Proof */}
          <View style={styles.socialProof}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.socialProofText}>🔥 Join 10,000+ humans optimizing their biology</Text>
            </ScrollView>
          </View>

          <TouchableOpacity onPress={handleDismiss} style={styles.notNow} activeOpacity={0.8}>
            <Text style={[styles.notNowText, { textDecorationLine: 'underline' }]}>Continue with basic version</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PlanCard(props: {
  title: string;
  subtitle: string;
  price: string;
  priceNote: string | null;
  popular: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { title, subtitle, price, priceNote, popular, disabled, onPress } = props;
  return (
    <TouchableOpacity
      style={[styles.planCard, popular && styles.planCardPopular, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      {popular ? (
        <View style={[styles.popularPill, styles.popularPillGold]}>
          <Text style={styles.popularText}>BEST VALUE</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <View>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planSub}>{subtitle}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.planPrice}>{price}</Text>
          {priceNote ? <Text style={styles.planPriceNote}>{priceNote}</Text> : null}
        </View>
      </View>
      <View style={styles.ctaRow}>
        <Ionicons name="sparkles" size={16} color="#16a34a" />
        <Text style={styles.ctaText}>Upgrade your biology</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf2fe' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  headerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748b' },

  // Value Comparison
  comparisonSection: { marginBottom: 24 },
  comparisonTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 16 },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  comparisonRow2: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  comparisonItem: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  comparisonHighlight: { backgroundColor: '#f0f9ff', borderColor: '#0ea5e9', borderWidth: 2 },
  comparisonIcon: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  comparisonPrice: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  comparisonLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  pricelessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pricelessBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pricelessBannerIcon: { fontSize: 26 },
  pricelessBannerTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  pricelessBannerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#a16207' },
  pricelessPill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  pricelessText: { color: '#0f172a', fontWeight: '900', fontSize: 14 },

  // Features
  featuresSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  featuresGrid: { gap: 12 },
  featureCard: { backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  featureIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconText: { fontSize: 20 },
  featureTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  featureDescription: { fontSize: 13, fontWeight: '700', color: '#475569', lineHeight: 18 },

  // Pricing
  pricingSection: { marginBottom: 24 },

  // Social Proof
  socialProof: { marginBottom: 20 },
  socialProofText: { fontSize: 14, fontWeight: '800', color: '#059669', paddingHorizontal: 20 },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  muted: { marginTop: 8, color: '#64748b', fontWeight: '700', textAlign: 'center' },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  planCardPopular: { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
  popularPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  popularPillGold: {
    backgroundColor: '#16a34a',
  },
  popularText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  planTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  planSub: { marginTop: 4, color: '#64748b', fontWeight: '700' },
  planPrice: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  planPriceNote: { marginTop: 2, fontSize: 12, fontWeight: '900', color: '#10b981' },
  ctaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { color: '#334155', fontWeight: '800' },
  notNow: { alignItems: 'center', paddingVertical: 12, marginTop: 20 },
  notNowText: { color: '#94a3b8', fontWeight: '700' },
  proTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  proSub: { marginTop: 6, color: '#64748b', fontWeight: '700', marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
});


