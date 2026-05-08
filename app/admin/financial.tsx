import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    CreditCard,
    TrendingUp,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    ArrowRight
} from 'lucide-react-native';

const StatBox = ({ title, value, sub, trend }: any) => (
    <View style={styles.statBox}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <View style={styles.statFooter}>
            {sub ? <Text style={[styles.statSub, { color: trend === 'up' ? '#10b981' : '#64748b' }]}>{sub}</Text> : null}
        </View>
    </View>
);

export default function FinancialManager() {
    const stats = useQuery(api.admin.getDashboardStats);
    const plans = useQuery(api.admin.getPricingPlans, { onlyActive: true });
    const recentTx = useQuery(api.admin.getRecentTransactions, { limit: 20 });

    const hasPlans = Array.isArray(plans) && plans.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Financial Performance</Text>
                    <Text style={styles.subtitle}>Subscriptions, Pricing, and Revenue</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Create Plan</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statRow}>
                    <StatBox title="Total Revenue" value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`} sub="Succeeded transactions" trend="up" />
                    <StatBox title="Active Subs" value={(stats?.premiumUsers ?? 0).toString()} sub="From user premium status" trend="up" />
                    <StatBox title="Refund Rate" value="—" sub="" trend="up" />
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Pricing Plans</Text>
                    </View>

                    {!plans ? (
                        <ActivityIndicator color="#2563eb" />
                    ) : hasPlans ? (
                        <View style={styles.plansGrid}>
                            {plans.map((p: any) => (
                                <View key={String(p._id)} style={styles.planCard}>
                                    <View style={styles.planHeader}>
                                        <Text style={styles.planName}>{String(p.name ?? 'Plan')}</Text>
                                        {p.isActive ? (
                                            <View style={styles.activePill}>
                                                <Text style={styles.activePillText}>ACTIVE</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.planPrice}>
                                        ${Number(p.priceMonthly ?? 0).toFixed(2)}
                                        <Text style={styles.planPeriod}>/mo</Text>
                                    </Text>
                                    <Text style={styles.planDescription}>{String(p.description ?? '')}</Text>
                                    <View style={styles.planDivider} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: '#64748b', fontWeight: '700' }}>
                                            Yearly: ${Number(p.priceYearly ?? 0).toFixed(2)}/yr
                                        </Text>
                                        <TouchableOpacity style={styles.editPlanButton}>
                                            <Text style={styles.editPlanText}>View</Text>
                                            <ArrowRight size={14} color="#2563eb" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.transactionsCard}>
                            <Text style={styles.emptyText}>No active pricing plans found in Convex.</Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.transactionsCard}>
                        {!recentTx ? (
                            <ActivityIndicator color="#2563eb" />
                        ) : recentTx.length === 0 ? (
                            <View style={styles.emptyTransactions}>
                                <CreditCard size={32} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No recent transactions to display.</Text>
                            </View>
                        ) : (
                            <View style={{ width: '100%' }}>
                                {recentTx.map((t: any) => (
                                    <View key={String(t._id)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <Text style={{ fontWeight: '900', color: '#0f172a' }}>
                                            {t.status?.toUpperCase?.() ?? 'UNKNOWN'} • {String(t.provider ?? 'provider')}
                                        </Text>
                                        <Text style={{ color: '#64748b', fontWeight: '700', marginTop: 2 }}>
                                            ${Number(t.amount ?? 0).toFixed(2)} {String(t.currency ?? '').toUpperCase()} • {new Date(Number(t.createdAt ?? 0)).toLocaleString()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 0,
        gap: 24,
    },
    statRow: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
    },
    statBox: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    statTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
    },
    statFooter: {
        marginTop: 10,
    },
    statSub: {
        fontSize: 11,
        fontWeight: '800',
    },
    section: {
        gap: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563eb',
    },
    plansGrid: {
        flexDirection: 'row',
        gap: 20,
        flexWrap: 'wrap',
    },
    planCard: {
        flex: 1,
        minWidth: 300,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1e293b',
    },
    activePill: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activePillText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#10b981',
    },
    planPrice: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 8,
    },
    planPeriod: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '600',
    },
    planDescription: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: 20,
    },
    planDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 16,
    },
    editPlanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editPlanText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2563eb',
    },
    transactionsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    emptyTransactions: {
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 14,
    }
});
