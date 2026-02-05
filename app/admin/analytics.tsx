import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    BarChart3,
    PieChart,
    Activity,
    RefreshCcw,
    Users,
    Clock,
    Zap
} from 'lucide-react-native';

const MetricTile = ({ label, value, sub, color }: any) => (
    <View style={styles.tile}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={[styles.tileValue, { color }]}>{value}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
    </View>
);

export default function AnalyticsDeepDive() {
    const stats = useQuery(api.admin.getDashboardStats);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Advanced Analytics</Text>
                <Text style={styles.subtitle}>Deep dive into user retention and platform health</Text>
            </View>

            <View style={styles.grid}>
                <MetricTile label="7-Day Retention" value="42%" sub="Industry avg: 15%" color="#3b82f6" />
                <MetricTile label="30-Day Retention" value="28%" sub="Above target" color="#10b981" />
                <MetricTile label="Avg Session Time" value="14.2m" sub="+2.1m vs Oct" color="#f59e0b" />
                <MetricTile label="Churn Rate" value="3.4%" sub="Monthly average" color="#ef4444" />
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cohort Analysis (Day 0 - Day 30)</Text>
                    <BarChart3 size={20} color="#94a3b8" />
                </View>
                <View style={styles.cohortTable}>
                    {[100, 75, 60, 52, 45, 42].map((val, i) => (
                        <View key={i} style={styles.cohortRow}>
                            <Text style={styles.cohortLabel}>Day {i * 5}</Text>
                            <View style={styles.cohortTrack}>
                                <View style={[styles.cohortBar, { width: `${val}%` }]} />
                            </View>
                            <Text style={styles.cohortVal}>{val}%</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>System Health</Text>
                    <Activity size={20} color="#10b981" />
                </View>
                <View style={styles.healthItem}>
                    <Text style={styles.healthLabel}>API Response Time</Text>
                    <Text style={styles.healthValue}>42ms</Text>
                </View>
                <View style={styles.healthItem}>
                    <Text style={styles.healthLabel}>Database Load</Text>
                    <Text style={styles.healthValue}>12%</Text>
                </View>
                <View style={styles.healthItem}>
                    <Text style={styles.healthLabel}>Action Queue</Text>
                    <Text style={styles.healthValue}>Idle</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        gap: 24,
    },
    header: {
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    tile: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tileLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    tileValue: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
    },
    tileSub: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    cohortTable: {
        gap: 12,
    },
    cohortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cohortLabel: {
        width: 60,
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    cohortTrack: {
        flex: 1,
        height: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 6,
        overflow: 'hidden',
    },
    cohortBar: {
        height: '100%',
        backgroundColor: '#3b82f6',
        borderRadius: 6,
    },
    cohortVal: {
        width: 40,
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'right',
    },
    healthItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    healthLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    healthValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
    },
});
