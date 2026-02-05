import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Link, Check, Smartphone, Watch } from 'lucide-react-native';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function IntegrationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useClerkUser();

    const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : "skip");
    // Store submission: disable any OAuth/connect flows for now
    const request = null;

    // Integrations Data
    const integrations = [
        {
            id: 'strava',
            name: 'Strava',
            icon: 'bicycle',
            type: 'Fitness',
            connected: false,
            description: 'Coming soon (disabled for store submission).',
            platform: 'all',
            action: () => {
                Alert.alert('Strava', 'Coming soon');
            }
        },
        {
            id: 'apple_health',
            name: 'Apple Health',
            icon: 'heart',
            type: 'Health',
            connected: true, // Placeholder logic for now, commonly implicitly connected on iOS if perms granted
            description: 'Sync steps, sleep, and workouts.',
            platform: 'ios',
            action: () => Alert.alert('Apple Health', 'Managed via System Settings')
        },
        {
            id: 'google_fit',
            name: 'Google Fit',
            icon: 'fitness',
            type: 'Health',
            connected: false,
            description: 'Sync steps and activity.',
            platform: 'android',
            action: () => Alert.alert('Google Fit', 'Coming soon')
        }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Integrations</Text>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>Available Apps</Text>

                {integrations.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, item.connected ? styles.iconConnected : styles.iconDisconnected]}>
                                <Ionicons name={item.icon as any} size={24} color={item.connected ? '#fff' : '#64748b'} />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <Text style={styles.cardSubtitle}>{item.description}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggleButton, item.connected ? styles.toggleConnected : styles.toggleDisconnected]}
                                onPress={item.action}
                                disabled={!request && item.id === 'strava'}
                            >
                                <Text style={[styles.toggleText, item.connected ? styles.toggleTextConnected : styles.toggleTextDisconnected]}>
                                    {item.connected ? 'Connected' : 'Connect'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#3b82f6" />
                    <Text style={styles.infoText}>
                        Connect your health data to get automatic insights and tracking.
                        We prioritize your privacy and only read data you explicitly allow.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconConnected: {
        backgroundColor: '#3b82f6',
    },
    iconDisconnected: {
        backgroundColor: '#e2e8f0',
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748b',
    },
    toggleButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    toggleConnected: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    toggleDisconnected: {
        backgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleTextConnected: {
        color: '#2563eb',
    },
    toggleTextDisconnected: {
        color: '#64748b',
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
});
