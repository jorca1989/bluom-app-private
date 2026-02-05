import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomContentPadding } from '@/utils/layout';

export default function AdminTestUsersScreen() {
  const insets = useSafeAreaInsets();
  const rows = useQuery((api as any).testUsers?.list);

  const items = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  if (rows === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: getBottomContentPadding(insets.bottom, 18) }}>
        <Text style={styles.title}>Test Users</Text>
        <Text style={styles.subtitle}>Collected from the landing page email form.</Text>

        <View style={styles.card}>
          <Text style={styles.count}>{items.length} emails</Text>
        </View>

        {items.map((r: any) => (
          <View key={String(r._id)} style={styles.row}>
            <Text style={styles.email}>{String(r.email ?? '')}</Text>
            <Text style={styles.meta}>
              {r.createdAt ? new Date(Number(r.createdAt)).toLocaleString() : ''}
              {r.source ? ` • ${String(r.source)}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf1fe' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebf1fe' },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, color: '#475569', fontWeight: '700' },
  card: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  count: { fontWeight: '900', color: '#0f172a' },
  row: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  email: { color: '#0f172a', fontWeight: '900' },
  meta: { marginTop: 4, color: '#64748b', fontWeight: '700', fontSize: 12 },
});

