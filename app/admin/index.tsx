import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Users,
    TrendingUp,
    DollarSign,
    Activity,
    Zap,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react-native';
import { motion } from 'framer-motion';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Icon color={color} size={20} />
            </View>
            {trend && trendValue != null ? (
                <View style={[styles.trendContainer, { backgroundColor: trend === 'up' ? '#ecfdf5' : '#fef2f2' }]}>
                    <Text style={[styles.trendText, { color: trend === 'up' ? '#10b981' : '#ef4444' }]}>
                        {trend === 'up' ? '+' : '-'}{trendValue}%
                    </Text>
                </View>
            ) : null}
        </View>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
    </View>
);

export default function AdminDashboard() {
    const stats = useQuery(api.admin.getDashboardStats);

    if (!stats) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>System Overview</Text>
                    <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                </View>
                <View style={styles.badge}>
                    <View style={styles.dot} />
                    <Text style={styles.badgeText}>Live Systems</Text>
                </View>
            </View>

            {/* Primary Stats */}
            <View style={styles.statGrid}>
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers.toLocaleString()}
                    icon={Users}
                    color="#3b82f6"
                />
                <StatCard
                    title="Active Users (DAU)"
                    value={stats.dau.toLocaleString()}
                    icon={Activity}
                    color="#10b981"
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="#f59e0b"
                />
                <StatCard
                    title="User Records"
                    value={`${(stats.totalUserRecords ?? stats.totalUsers).toLocaleString()}`}
                    icon={Zap}
                    color="#8b5cf6"
                />
            </View>

            <View style={styles.sectionRow}>
                <View style={[styles.card, { flex: 2 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>User Growth</Text>
                        <TrendingUp size={18} color="#94a3b8" />
                    </View>
                    <View style={styles.chartPlaceholder}>
                        {/* Simple Visual for Chart */}
                        <View style={styles.barContainer}>
                            {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                <View key={i} style={[styles.bar, { height: `${h}%` }]} />
                            ))}
                        </View>
                        <View style={styles.chartLabels}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l) => (
                                <Text key={l} style={styles.chartLabel}>{l}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Insights</Text>
                    </View>
                    <View style={styles.insightItem}>
                        <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.insightText}>{stats.premiumUsers.toLocaleString()} premium users</Text>
                    </View>
                    <View style={styles.insightItem}>
                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.insightText}>{stats.totalRecipes.toLocaleString()} public recipes</Text>
                    </View>
                    <View style={styles.insightItem}>
                        <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.insightText}>{stats.totalWorkouts.toLocaleString()} workouts logged</Text>
                    </View>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1e293b',
    },
    dateText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 24,
    },
    card: {
        flex: 1,
        minWidth: 240,
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    trendContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sectionRow: {
        flexDirection: 'row',
        gap: 24,
        flexWrap: 'wrap',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    chartPlaceholder: {
        height: 200,
        justifyContent: 'flex-end',
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 160,
        paddingBottom: 8,
    },
    bar: {
        width: 32,
        backgroundColor: '#eff6ff', // Light blue default
        borderRadius: 8,
        // Active simulation
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    chartLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        width: 32,
        textAlign: 'center',
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    insightText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
});
