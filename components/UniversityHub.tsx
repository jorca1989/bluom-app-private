import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BookOpen, Microscope, BarChart, Brain, Heart, Zap, Moon } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface UniversityHubProps {
    onClose: () => void;
}

const PROTOCOLS = [
    { id: 'sleep', title: 'Sleep Optimization', icon: Moon, color: '#6366f1', desc: 'Circadian rhythm alignment and hygiene.', duration: '5 min read' },
    { id: 'nutrition', title: 'Metabolic Fuel', icon: Zap, color: '#f59e0b', desc: 'Understanding macros, timing, and hydration.', duration: '8 min read' },
    { id: 'mindset', title: 'Stoic Resilience', icon: Brain, color: '#8b5cf6', desc: 'Building mental fortitude and clarity.', duration: '6 min read' },
    { id: 'recovery', title: 'Active Recovery', icon: Heart, color: '#10b981', desc: 'Stretching, sauna, and cold exposure.', duration: '4 min read' },
];

export default function UniversityHub({ onClose }: UniversityHubProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: 20 }]}>
                    <View>
                        <Text style={styles.headerTitle}>Bluom University</Text>
                        <Text style={styles.headerSubtitle}>Master your biology & psychology</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {/* Featured Section */}
                    <View style={styles.featuredCard}>
                        <View style={styles.featuredContent}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>NEW</Text>
                            </View>
                            <Text style={styles.featuredTitle}>The Dopamine Protocol</Text>
                            <Text style={styles.featuredDesc}>Regulate your motivation and focus with scientifically backed habits.</Text>
                            <TouchableOpacity style={styles.readButton}>
                                <Text style={styles.readButtonText}>Read Now</Text>
                            </TouchableOpacity>
                        </View>
                        <Microscope size={80} color="#fff" style={{ opacity: 0.2, position: 'absolute', right: -20, bottom: -20 }} />
                    </View>

                    {/* Protocols Grid */}
                    <Text style={styles.sectionTitle}>Core Protocols</Text>
                    <View style={styles.grid}>
                        {PROTOCOLS.map(p => (
                            <TouchableOpacity key={p.id} style={styles.protocolCard}>
                                <View style={[styles.iconCircle, { backgroundColor: p.color + '20' }]}>
                                    <p.icon size={24} color={p.color} />
                                </View>
                                <Text style={styles.protocolTitle}>{p.title}</Text>
                                <Text style={styles.protocolDesc} numberOfLines={2}>{p.desc}</Text>
                                <View style={styles.metaRow}>
                                    <BookOpen size={12} color="#94a3b8" />
                                    <Text style={styles.metaText}>{p.duration}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    headerSubtitle: { fontSize: 14, color: '#64748b' },
    closeButton: { padding: 4 },

    content: { flex: 1, padding: 20 },

    featuredCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, marginBottom: 30, overflow: 'hidden' },
    featuredContent: { zIndex: 1 },
    badge: { backgroundColor: '#3b82f6', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 12 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    featuredTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    featuredDesc: { fontSize: 14, color: '#cbd5e1', marginBottom: 16, lineHeight: 20 },
    readButton: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignSelf: 'flex-start' },
    readButtonText: { color: '#0f172a', fontWeight: '600' },

    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    protocolCard: { width: (width - 52) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    protocolTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
    protocolDesc: { fontSize: 12, color: '#64748b', marginBottom: 12, height: 32 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#94a3b8' },
});
