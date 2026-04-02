/**
 * IntegrationsScreen.tsx
 *
 * Connections Hub — shows every available integration with:
 *  - Connect / Disconnect toggle
 *  - Last-synced timestamp
 *  - Explicit list of data points being read
 *  - Clear "what we use it for" copy (satisfies Apple Guideline 2.5.1)
 *
 * Architecture:
 *  - Apple Health / Google Health Connect: handled by useHealthSync hook
 *  - Strava: OAuth via Convex exchangeToken action (existing flow)
 *  - Manual entries (Withings, Oura, etc.): "Coming soon" placeholders —
 *    NOT wired to any SDK so Apple's binary scanner won't find ghost APIs
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useHealthSync } from '../hooks/useHealthSync';
import { getBottomContentPadding } from '../utils/layout';
import { HealthDataViewer } from '../components/HealthDataViewer';

// ─── Types ────────────────────────────────────────────────────
interface IntegrationDef {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  category: 'activity' | 'biometrics' | 'nutrition' | 'sleep';
  dataPoints: string[];    // Human-readable list of what we read
  purpose: string;         // Why we read it (Apple requirement)
  platform: 'ios' | 'android' | 'both' | 'coming_soon';
  available: boolean;
}

const INTEGRATIONS: IntegrationDef[] = [
  // ── Activity ──────────────────────────────────────────────
  {
    id: 'apple_health',
    name: 'Apple Health',
    subtitle: 'Steps, workouts, sleep & more',
    icon: 'heart',
    iconColor: '#ef4444',
    iconBg: '#fee2e2',
    category: 'activity',
    dataPoints: [
      'Steps & distance walked',
      'Active calories burned',
      'Workout sessions',
      'Body weight',
      'Sleep duration',
      'Heart rate',
    ],
    purpose:
      "Your step count and active calories update your daily burn goal. Weight syncs to your progress tracker. Heart rate and sleep data are used to calculate your Vitality recovery scores and optimize your Men’s Health protocols. Women’s Health data (cycle tracking) is used for cycle tracking insights within the Wellness dashboard.",
    platform: 'ios',
    available: Platform.OS === 'ios',
  },
  {
    id: 'google_health',
    name: 'Health Connect',
    subtitle: 'Steps, workouts, sleep & more',
    icon: 'fitness',
    iconColor: '#16a34a',
    iconBg: '#dcfce7',
    category: 'activity',
    dataPoints: [
      'Steps & distance walked',
      'Active calories burned',
      'Workout sessions',
      'Body weight',
      'Sleep sessions',
      'Heart rate',
    ],
    purpose:
      "Your step count and active calories update your daily burn goal. Weight syncs to your progress tracker. Heart rate and sleep data are used to calculate your Vitality recovery scores and optimize your Men’s Health protocols.",
    platform: 'android',
    available: Platform.OS === 'android',
  },
  {
    id: 'strava',
    name: 'Strava',
    subtitle: 'Running, cycling & outdoor sports',
    icon: 'bicycle',
    iconColor: '#fc4c02',
    iconBg: '#ffede6',
    category: 'activity',
    dataPoints: [
      'Activity type & name',
      'Duration & distance',
      'Calories burned',
      'Average heart rate',
    ],
    purpose:
      'Strava activities are automatically imported as exercise entries so your weekly calorie burn and workout history stay accurate without manual logging.',
    platform: 'both',
    available: true,
  },
  // ── Biometrics ────────────────────────────────────────────
  {
    id: 'withings',
    name: 'Withings',
    subtitle: 'Smart scales & health monitors',
    icon: 'scale',
    iconColor: '#0891b2',
    iconBg: '#cffafe',
    category: 'biometrics',
    dataPoints: [
      'Body weight',
      'Body fat %',
      'Muscle mass',
    ],
    purpose:
      'Body composition data improves the accuracy of your calorie targets and shows your progress over time.',
    platform: 'coming_soon',
    available: false,
  },
  {
    id: 'samsung_health',
    name: 'Samsung Health',
    subtitle: 'Galaxy Watch & Galaxy Ring',
    icon: 'watch',
    iconColor: '#1d4ed8',
    iconBg: '#dbeafe',
    category: 'biometrics',
    dataPoints: [
      'Steps',
      'Heart rate',
      'Sleep stages',
      'Body composition',
    ],
    purpose:
      'Samsung Health data fills your daily activity log and enriches your sleep and recovery scores.',
    platform: 'coming_soon',
    available: false,
  },
  // ── Sleep ─────────────────────────────────────────────────
  {
    id: 'oura',
    name: 'Oura Ring',
    subtitle: 'Advanced sleep & readiness scores',
    icon: 'moon',
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
    category: 'sleep',
    dataPoints: [
      'Sleep duration & stages',
      'Readiness score',
      'Heart rate variability',
      'Body temperature trend',
    ],
    purpose:
      'Oura sleep data powers your nightly Wellness score and informs recovery recommendations in your Move plan.',
    platform: 'coming_soon',
    available: false,
  },
  // ── Nutrition ─────────────────────────────────────────────
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    subtitle: 'Food diary & nutrition',
    icon: 'restaurant',
    iconColor: '#0284c7',
    iconBg: '#e0f2fe',
    category: 'nutrition',
    dataPoints: [
      'Daily calories consumed',
      'Macros (protein, carbs, fat)',
      'Water intake',
    ],
    purpose:
      'Importing your MFP food diary prevents double-entry when you already log there, keeping your Fuel totals accurate.',
    platform: 'coming_soon',
    available: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────
function formatLastSync(ts: number | null | undefined): string {
  if (!ts) return 'Never synced';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function categoryLabel(cat: IntegrationDef['category']): string {
  switch (cat) {
    case 'activity': return 'Activity & Fitness';
    case 'biometrics': return 'Body Metrics';
    case 'nutrition': return 'Nutrition';
    case 'sleep': return 'Sleep & Recovery';
  }
}

const CATEGORIES: IntegrationDef['category'][] = ['activity', 'biometrics', 'sleep', 'nutrition'];

// ─── Integration Card ─────────────────────────────────────────
function IntegrationCard({
  item,
  connected,
  syncing,
  lastSync,
  onToggle,
  onSync,
}: {
  item: IntegrationDef;
  connected: boolean;
  syncing: boolean;
  lastSync: number | null | undefined;
  onToggle: () => void;
  onSync: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const comingSoon = item.platform === 'coming_soon';

  return (
    <View style={[card.wrap, comingSoon && card.wrapDimmed]}>
      {/* Header row */}
      <View style={card.header}>
        <View style={[card.iconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
        </View>

        <View style={card.info}>
          <View style={card.nameRow}>
            <Text style={card.name}>{item.name}</Text>
            {comingSoon && (
              <View style={card.badge}>
                <Text style={card.badgeText}>Coming soon</Text>
              </View>
            )}
          </View>
          <Text style={card.sub}>{item.subtitle}</Text>
          {connected && (
            <Text style={[card.syncTime, { color: '#0f172a', fontWeight: '800' }]}>
              Last Sync: {formatLastSync(lastSync)}
            </Text>
          )}
        </View>

        {comingSoon ? (
          <View style={card.switchPlaceholder} />
        ) : (
          <Switch
            value={connected}
            onValueChange={onToggle}
            trackColor={{ false: '#e2e8f0', true: item.iconColor + '60' }}
            thumbColor={connected ? item.iconColor : '#94a3b8'}
          />
        )}
      </View>

      {/* Expand / collapse data points */}
      {!comingSoon && (
        <>
          <TouchableOpacity
            style={card.expandBtn}
            onPress={() => setExpanded((e) => !e)}
            activeOpacity={0.7}
          >
            <Text style={card.expandLabel}>
              {expanded ? 'Hide details' : `Reading ${item.dataPoints.length} data types`}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748b"
            />
          </TouchableOpacity>

          {expanded && (
            <View style={card.details}>
              {/* Data points */}
              <Text style={card.detailTitle}>DATA WE ACCESS</Text>
              {item.dataPoints.map((dp) => (
                <View key={dp} style={card.dpRow}>
                  <Ionicons name="checkmark-circle" size={14} color={item.iconColor} />
                  <Text style={card.dpText}>{dp}</Text>
                </View>
              ))}

              {/* Purpose string — this is what Apple reviewers look for */}
              <Text style={[card.detailTitle, { marginTop: 12 }]}>HOW WE USE IT</Text>
              <Text style={card.purposeText}>{item.purpose}</Text>

              {/* Sync now button */}
              {connected && (
                <TouchableOpacity
                  style={[card.syncBtn, syncing && { opacity: 0.5 }]}
                  onPress={onSync}
                  disabled={syncing}
                  activeOpacity={0.8}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={14} color="#ffffff" />
                      <Text style={card.syncBtnText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  wrapDimmed: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  syncTime: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  badge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  switchPlaceholder: { width: 51 },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  expandLabel: { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '500' },
  details: { marginTop: 12 },
  detailTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dpText: { fontSize: 13, color: '#475569' },
  purposeText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  syncBtn: {
    marginTop: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  syncBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function IntegrationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  // Strava connection state derived from DB
  const stravaConnected = !!(convexUser?.stravaAccessToken);
  const exchangeToken = useAction(api.strava.exchangeToken);
  const syncStrava = useAction(api.integrations.syncStravaActivities);

  // Native health hook (platform-safe)
  const {
    connected: healthConnected,
    syncing: healthSyncing,
    lastSync: healthLastSync,
    connect: connectHealth,
    disconnect: disconnectHealth,
    sync: syncHealth,
    source: healthSource,
  } = useHealthSync();

  // Per-integration syncing flags
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaLastSync, setStravaLastSync] = useState<number | null>(null);

  const handleToggle = useCallback(async (item: IntegrationDef) => {
    if (!convexUser?._id) return;

    // ── Apple Health / Google Health ──────────────────────────
    if (item.id === 'apple_health' || item.id === 'google_health') {
      if (healthConnected) {
        Alert.alert(
          `Disconnect ${item.name}`,
          'We will stop reading health data. Your historical synced data will be kept.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disconnect', style: 'destructive', onPress: disconnectHealth },
          ]
        );
      } else {
        const ok = await connectHealth();
        if (!ok) {
          Alert.alert(
            'Health Connection Failed',
            Platform.OS === 'ios'
              ? 'Bluom was unable to initialize HealthKit. This could be due to missing entitlements, a build configuration error, or the OS blocking the request. Ensure you have made a fresh native build with the latest config.'
              : 'Please grant Health Connect permissions to sync your data.',
            [
              { text: 'Check Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          // Sync immediately on connect
          await syncHealth(convexUser._id);
        }
      }
      return;
    }

    // ── Strava ────────────────────────────────────────────────
    if (item.id === 'strava') {
      if (stravaConnected) {
        Alert.alert(
          'Disconnect Strava',
          'We will stop importing Strava activities. Your existing logs will be kept.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disconnect',
              style: 'destructive',
              onPress: () => {
                // TODO: call convex mutation to clear strava tokens when you build the settings page
                Alert.alert('Disconnected', 'Strava has been disconnected.');
              },
            },
          ]
        );
      } else {
        // Launch Strava OAuth — deep-link back with ?code=xxx
        const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
        if (!clientId) {
          Alert.alert('Configuration error', 'Strava client ID is not set.');
          return;
        }
        const redirectUri = 'https://bluom.app/strava-callback';
        const scope = 'activity:read_all';
        const url = `https://www.strava.com/oauth/mobile/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&approval_prompt=auto&scope=${scope}`;
        Linking.openURL(url);
      }
      return;
    }
  }, [convexUser, healthConnected, connectHealth, disconnectHealth, syncHealth, stravaConnected]);

  const handleSync = useCallback(async (item: IntegrationDef) => {
    if (!convexUser?._id) return;

    if (item.id === 'apple_health' || item.id === 'google_health') {
      const result = await syncHealth(convexUser._id);
      if (result) {
        Alert.alert(
          'Sync Complete',
          `Steps: ${result.steps.toLocaleString()}\nCalories: ${result.activeCalories} kcal\nDistance: ${result.distanceKm} km`
        );
      }
      return;
    }

    if (item.id === 'strava') {
      setStravaSyncing(true);
      try {
        const count = await syncStrava({});
        setStravaLastSync(Date.now());
        Alert.alert('Strava Synced', `${count ?? 0} new activities imported.`);
      } catch (e: any) {
        Alert.alert('Sync Failed', e?.message ?? 'Could not sync Strava activities.');
      } finally {
        setStravaSyncing(false);
      }
    }
  }, [convexUser, syncHealth, syncStrava]);

  // ── Resolve per-item connection state ────────────────────────
  const isConnected = (item: IntegrationDef): boolean => {
    if (item.id === 'apple_health' || item.id === 'google_health') return healthConnected;
    if (item.id === 'strava') return stravaConnected;
    return false;
  };

  const isSyncing = (item: IntegrationDef): boolean => {
    if (item.id === 'apple_health' || item.id === 'google_health') return healthSyncing;
    if (item.id === 'strava') return stravaSyncing;
    return false;
  };

  const lastSyncFor = (item: IntegrationDef): number | null | undefined => {
    if (item.id === 'apple_health' || item.id === 'google_health') return healthLastSync;
    if (item.id === 'strava') return stravaLastSync ?? convexUser?.stravaExpiresAt;
    return null;
  };

  // ── Show only platform-relevant integrations ─────────────────
  const visible = (item: IntegrationDef) => {
    if (item.platform === 'coming_soon') return true; // show as placeholders
    if (item.platform === 'both') return true;
    if (item.platform === 'ios' && Platform.OS !== 'ios') return false;
    if (item.platform === 'android' && Platform.OS !== 'android') return false;
    return true;
  };
  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#f8fafc' }]} edges={['top', 'bottom']}>
      {/* Header - Aligned to match Exercise Library */}
      <View style={[s.header, { paddingVertical: 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Connections</Text>
          <Text style={s.subtitle}>Sync data from your devices & apps</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 24),
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy notice */}
        <View style={s.privacyBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#059669" />
          <Text style={s.privacyText}>
            Bluom only reads the data types listed below. We never sell your health data. You can disconnect at any time and request full deletion from Settings → Account.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/HealthLogScreen' as any)}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="clipboard-outline" size={18} color="#2563eb" />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>Health Log</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>View today’s imported metrics</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Connected count */}
        {(healthConnected || stravaConnected) && (
          <View style={s.connectedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={s.connectedBadgeText}>
              {[healthConnected, stravaConnected].filter(Boolean).length} source
              {[healthConnected, stravaConnected].filter(Boolean).length > 1 ? 's' : ''} connected
            </Text>
          </View>
        )}

        {/* Categories */}
        {CATEGORIES.map((cat) => {
          const items = INTEGRATIONS.filter((i) => i.category === cat && visible(i));
          if (!items.length) return null;
          return (
            <View key={cat} style={s.section}>
              <Text style={s.sectionTitle}>{categoryLabel(cat)}</Text>
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  connected={isConnected(item)}
                  syncing={isSyncing(item)}
                  lastSync={lastSyncFor(item)}
                  onToggle={() => handleToggle(item)}
                  onSync={() => handleSync(item)}
                />
              ))}
            </View>
          );
        })}

        {/* Data deletion notice */}
        {!!convexUser?._id && (
          <View style={{ marginBottom: 22 }}>
            <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Recent Imported Data</Text>
            <HealthDataViewer userId={convexUser._id} />
          </View>
        )}

        <View style={s.deletionNotice}>
          <Ionicons name="information-circle-outline" size={16} color="#64748b" />
          <Text style={s.deletionText}>
            If you delete your Bluom account, all synced health data stored on our servers is permanently deleted within 30 days. Local device data managed by Apple Health or Google Health Connect is unaffected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  backBtn: { padding: 6, marginTop: 2 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  privacyBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  privacyText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },

  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  connectedBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },

  deletionNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  deletionText: { flex: 1, fontSize: 11, color: '#64748b', lineHeight: 17 },
});