import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

function typeIcon(type: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'steps': return { name: 'locate', color: '#f97316' } as any;
    case 'active_calories': return { name: 'flame', color: '#f97316' } as any;
    case 'distance_km': return { name: 'navigate', color: '#2563eb' } as any;
    case 'weight_kg': return { name: 'fitness', color: '#475569' } as any;
    case 'body_fat_pct': return { name: 'body', color: '#0891b2' } as any;
    case 'sleep_hours': return { name: 'moon', color: '#8b5cf6' } as any;
    case 'heart_rate_avg': return { name: 'heart', color: '#ef4444' } as any;
    case 'menstrual_flow': return { name: 'water', color: '#db2777' } as any;
    case 'ovulation_test_result': return { name: 'flask', color: '#16a34a' } as any;
    default: return { name: 'analytics', color: '#64748b' } as any;
  }
}

function sourceIcon(source: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (source === 'apple_health') return { name: 'heart', color: '#ef4444' } as any;
  if (source === 'google_health') return { name: 'logo-google', color: '#4285F4' } as any;
  return { name: 'help-circle', color: '#64748b' } as any;
}

function formatTimestamp(ts: number) {
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function HealthDataViewer({ userId }: { userId: Id<'users'> }) {
  const data = useQuery(api.integrations.getRecentImportedData, { userId, limit: 50 });

  const rows = useMemo(() => {
    return (data ?? []).map((d: any) => {
      const icon = typeIcon(d.type);
      const src = sourceIcon(d.source);
      return {
        id: d._id,
        type: d.type,
        value: d.value,
        unit: d.unit,
        source: d.source,
        timestamp: d.timestamp,
        icon,
        src,
      };
    });
  }, [data]);

  return (
    <View style={s.wrap}>
      {rows.length === 0 ? (
        <Text style={s.empty}>No imported data yet.</Text>
      ) : (
        rows.map((r) => (
          <View key={String(r.id)} style={s.row}>
            <View style={s.left}>
              <View style={[s.icon, { backgroundColor: r.icon.color + '18' }]}>
                <Ionicons name={r.icon.name as any} size={15} color={r.icon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.value}>
                  {Math.round((r.value ?? 0) * 100) / 100} <Text style={s.unit}>{r.unit}</Text>
                </Text>
                <Text style={s.meta}>{r.type.replace(/_/g, ' ')} · {formatTimestamp(r.timestamp)}</Text>
              </View>
            </View>
            <Ionicons name={r.src.name as any} size={16} color={r.src.color} />
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    overflow: 'hidden',
  },
  empty: { padding: 14, color: '#64748b', fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  unit: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 2 },
});

