import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useHealthSync } from '@/hooks/useHealthSync';

type MetricKey =
  | 'steps'
  | 'calories'
  | 'distanceKm'
  | 'weightKg'
  | 'sleepHours'
  | 'heartRateAvg';

function sourceLabel(source: string | null | undefined) {
  if (source === 'apple_health') return 'Imported from Apple Health';
  if (source === 'google_health') return 'Health Connect';
  return 'Source unknown';
}

function sourceIcon(source: string | null | undefined) {
  if (source === 'apple_health') return { name: 'heart' as const, color: '#ef4444' };
  if (source === 'google_health') return { name: 'logo-google' as const, color: '#4285F4' };
  return { name: 'help-circle' as const, color: '#64748b' };
}

function formatMetricValue(key: MetricKey, value: any): string {
  if (value === null || value === undefined) return '—';
  switch (key) {
    case 'steps':
    case 'calories':
      return Math.round(Number(value) || 0).toLocaleString();
    case 'distanceKm':
      return `${Math.round((Number(value) || 0) * 100) / 100}`;
    case 'weightKg':
      return `${Math.round((Number(value) || 0) * 10) / 10}`;
    case 'sleepHours':
      return `${Math.round((Number(value) || 0) * 10) / 10}`;
    case 'heartRateAvg':
      return `${Math.round(Number(value) || 0)}`;
  }
}

function menstrualFlowLabel(code: number | null | undefined) {
  if (code === null || code === undefined) return '—';
  switch (Math.round(code)) {
    case 1: return 'Light';
    case 2: return 'Medium';
    case 3: return 'Heavy';
    case 0: return 'Inconclusive';
    default: return 'Unknown';
  }
}

function ovulationTestLabel(code: number | null | undefined) {
  if (code === null || code === undefined) return '—';
  switch (Math.round(code)) {
    case 1: return 'Positive';
    case 2: return 'High';
    case 3: return 'Negative';
    case 0: return 'Inconclusive';
    default: return 'Unknown';
  }
}

export default function HealthLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const [syncing, setSyncing] = useState(false);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const metrics = useQuery(
    api.integrations.getTodayMetrics,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const { connected, connect, sync } = useHealthSync();

  const rows = useMemo(() => {
    const src = (metrics as any)?.sources ?? {};
    const units = (metrics as any)?.units ?? {};
    const ts = (metrics as any)?.timestamps ?? {};

    const list: Array<{
      key: MetricKey;
      label: string;
      value: any;
      unit: string;
      source: string | null;
      timestamp: number | null;
    }> = [
      { key: 'steps',       label: 'Steps',       value: (metrics as any)?.steps ?? 0,       unit: units.steps ?? 'count',  source: src.steps ?? null,       timestamp: ts.steps ?? null },
      { key: 'calories',    label: 'Active Calories', value: (metrics as any)?.calories ?? 0, unit: units.calories ?? 'kcal', source: src.calories ?? null,    timestamp: ts.calories ?? null },
      { key: 'distanceKm',  label: 'Distance',    value: (metrics as any)?.distanceKm ?? 0,  unit: units.distanceKm ?? 'km', source: src.distanceKm ?? null,  timestamp: ts.distanceKm ?? null },
      { key: 'weightKg',    label: 'Weight',      value: (metrics as any)?.weightKg ?? null, unit: units.weightKg ?? 'kg',   source: src.weightKg ?? null,    timestamp: ts.weightKg ?? null },
      { key: 'sleepHours',  label: 'Sleep',       value: (metrics as any)?.sleepHours ?? null, unit: units.sleepHours ?? 'hours', source: src.sleepHours ?? null, timestamp: ts.sleepHours ?? null },
      { key: 'heartRateAvg',label: 'Heart Rate',  value: (metrics as any)?.heartRateAvg ?? null, unit: units.heartRateAvg ?? 'bpm', source: src.heartRateAvg ?? null, timestamp: ts.heartRateAvg ?? null },
    ];

    return list;
  }, [metrics]);

  const handleSyncNow = useCallback(async () => {
    if (!convexUser?._id) return;
    setSyncing(true);
    try {
      if (!connected) {
        const ok = await connect();
        if (!ok) {
          Alert.alert(
            'Permission Needed',
            Platform.OS === 'ios'
              ? 'Please grant Apple Health permissions in Settings → Privacy & Security → Health → Bluom.'
              : 'Please grant Health Connect permissions to sync your data.'
          );
          return;
        }
      }
      await sync(convexUser._id);
    } finally {
      setSyncing(false);
    }
  }, [convexUser?._id, connected, connect, sync]);

  const menstrualSource = (metrics as any)?.sources?.menstrualFlow ?? null;
  const ovulationSource = (metrics as any)?.sources?.ovulationTestResult ?? null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Health Log</Text>
          <Text style={s.subtitle}>Today’s imported metrics</Text>
        </View>

        <TouchableOpacity style={s.syncBtn} onPress={handleSyncNow} activeOpacity={0.85} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="sync" size={16} color="#ffffff" />
          )}
          <Text style={s.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Activity & Biometrics</Text>
          {rows.map((r) => {
            const icon = sourceIcon(r.source);
            return (
              <View key={r.key} style={s.row}>
                <View style={s.left}>
                  <Text style={s.label}>{r.label}</Text>
                  <View style={s.sourceTag}>
                    <Ionicons name={icon.name} size={12} color={icon.color} />
                    <Text style={s.sourceTagText}>{sourceLabel(r.source)}</Text>
                  </View>
                </View>
                <Text style={s.value}>
                  {formatMetricValue(r.key, r.value)} <Text style={s.unit}>{r.unit}</Text>
                </Text>
              </View>
            );
          })}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Cycle & Reproductive Health</Text>

          <View style={s.row}>
            <View style={s.left}>
              <Text style={s.label}>Menstrual Flow</Text>
              <View style={s.sourceTag}>
                <Ionicons {...sourceIcon(menstrualSource)} size={12} />
                <Text style={s.sourceTagText}>{sourceLabel(menstrualSource)}</Text>
              </View>
            </View>
            <Text style={s.value}>
              {menstrualFlowLabel((metrics as any)?.menstrualFlow)}
            </Text>
          </View>

          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={s.left}>
              <Text style={s.label}>Ovulation Test</Text>
              <View style={s.sourceTag}>
                <Ionicons {...sourceIcon(ovulationSource)} size={12} />
                <Text style={s.sourceTagText}>{sourceLabel(ovulationSource)}</Text>
              </View>
            </View>
            <Text style={s.value}>
              {ovulationTestLabel((metrics as any)?.ovulationTestResult)}
            </Text>
          </View>

          <Text style={s.note}>
            We only display data types that you grant permission for. You can manage access anytime in device settings.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: { padding: 6, marginLeft: -4 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  syncBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 14,
  },
  left: { flex: 1, gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  value: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  unit: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sourceTagText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  note: { marginTop: 10, fontSize: 11, color: '#64748b', lineHeight: 16 },
});

