import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    ActivityIndicator,
    Modal,
    Dimensions,
    Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Search,
    Play,
    Clock,
    Zap,
    Heart,
    Star,
    Bookmark,
    ArrowLeft,
    Dumbbell,
    X,
    ChevronRight,
    MapPin,
    AlertCircle
} from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { BlurView } from 'expo-blur';
import { useUser as useAppUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

export default function WorkoutsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useClerkUser();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

    const convexUser = useQuery(
        api.users.getUserByClerkId,
        clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
    );
    const appUser = useAppUser();
    const isPro = appUser.isPro || appUser.isAdmin;

    const workouts = useQuery(api.videoWorkouts.list, {
        search: search || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory
    });

    const categories = ['All', 'Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core'];

    if (selectedWorkout) {
        const locked = !!selectedWorkout.isPremium && !isPro;
        return (
            <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
                <Stack.Screen options={{ headerShown: false }} />

                <ScrollView contentContainerStyle={styles.detailContent}>
                    {/* Header Image */}
                    <View style={styles.detailHero}>
                        <Image
                            source={{ uri: selectedWorkout.thumbnail }}
                            style={styles.heroImage}
                        />
                        <LinearGradient
                            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.4)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + 10 }]}
                            onPress={() => setSelectedWorkout(null)}
                        >
                            <ArrowLeft size={24} color="#ffffff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.playButtonLarge}
                            onPress={() => {
                                if (locked) {
                                    setShowUpgrade(true);
                                    return;
                                }
                                setShowVideoModal(true);
                            }}
                        >
                            <Play size={32} color="#ffffff" fill="#ffffff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>

                        {selectedWorkout.isPremium && (
                            <View style={styles.premiumDetailBadge}>
                                <Text style={styles.premiumDetailText}>PREMIUM</Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.detailBody}>
                        {locked && (
                            <View style={styles.lockNotice}>
                                <Text style={styles.lockNoticeText}>Pro required — preview only</Text>
                            </View>
                        )}
                        <View style={styles.titleRow}>
                            <Text style={styles.detailTitle}>{selectedWorkout.title}</Text>
                            <TouchableOpacity>
                                <Bookmark size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.detailDescription}>{selectedWorkout.description}</Text>

                        <View style={styles.statsStrip}>
                            <View style={styles.statBox}>
                                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                                <Text style={styles.statVal}>{selectedWorkout.rating}</Text>
                                <Text style={styles.statLab}>Rating</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Clock size={16} color="#2563eb" />
                                <Text style={styles.statVal}>{selectedWorkout.duration}m</Text>
                                <Text style={styles.statLab}>Duration</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Zap size={16} color="#ef4444" />
                                <Text style={styles.statVal}>{selectedWorkout.calories}</Text>
                                <Text style={styles.statLab}>Calories</Text>
                            </View>
                        </View>

                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Instructor</Text>
                                    <Text style={styles.infoValue}>{selectedWorkout.instructor}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Difficulty</Text>
                                    <Text style={styles.infoValue}>{selectedWorkout.difficulty}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Equipment</Text>
                                    <Text style={styles.infoValue}>{selectedWorkout.equipment.length > 0 ? selectedWorkout.equipment.join(', ') : 'None'}</Text>
                                </View>
                            </View>
                        </View>

                        {selectedWorkout.exercises.length > 0 && (
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Workout Breakdown</Text>
                                {selectedWorkout.exercises.map((ex: any, idx: number) => (
                                    <View key={idx} style={styles.exerciseRow}>
                                        <View style={styles.exerciseIndex}>
                                            <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                                        </View>
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{ex.name}</Text>
                                            <Text style={styles.exerciseDesc}>{ex.description}</Text>
                                        </View>
                                        <Text style={styles.exerciseDuration}>
                                            {ex.duration >= 60 ? `${Math.floor(ex.duration / 60)}m` : `${ex.duration}s`}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {locked && (
                            <View style={styles.blurBlock}>
                                <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
                                <View style={styles.blurOverlay}>
                                    <Text style={styles.blurTitle}>Upgrade to Pro</Text>
                                    <Text style={styles.blurText}>Unlock the full workout video + breakdown.</Text>
                                    <TouchableOpacity style={styles.blurBtn} onPress={() => setShowUpgrade(true)}>
                                        <Text style={styles.blurBtnText}>View Pro Plans</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push('/(tabs)/move')}
                    >
                        <Play size={24} color="#ffffff" fill="#ffffff" />
                        <Text style={styles.startButtonText}>Start Recording</Text>
                    </TouchableOpacity>
                </View>

                {/* Video Modal Placeholder */}
                <Modal visible={showVideoModal} animationType="fade" transparent>
                    <View style={styles.videoModalContainer}>
                        <View style={styles.videoModal}>
                            <View style={styles.videoHeader}>
                                <Text style={styles.videoTitle}>{selectedWorkout.title}</Text>
                                <TouchableOpacity onPress={() => setShowVideoModal(false)}>
                                    <X size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.videoPlayerPlaceholder}>
                                <Play size={48} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.videoPlaceholderText}>Video streaming starting soon...</Text>
                                <Text style={styles.videoPlaceholderSub}>Demo Interface</Text>
                            </View>
                        </View>
                    </View>
                </Modal>

                <ProUpgradeModal
                    visible={showUpgrade}
                    onClose={() => setShowUpgrade(false)}
                    onUpgrade={() => {
                        setShowUpgrade(false);
                        setSelectedWorkout(null);
                        router.push('/premium');
                    }}
                    title="Upgrade to Pro"
                    message="This workout is locked. Upgrade to Pro to access premium workout videos and full breakdowns."
                    upgradeLabel="View Pro Plans"
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Workouts</Text>
                    <Text style={styles.subtitle}>Guided video routines</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerCircle}>
                    <X size={20} color="#1e293b" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="Search for routines..."
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Categories */}
            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {categories.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.categoryPill, selectedCategory === c && styles.categoryPillActive]}
                            onPress={() => setSelectedCategory(c)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === c && styles.categoryTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {!workouts ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer}>
                    {workouts.map(item => (
                        <TouchableOpacity
                            key={item._id}
                            style={styles.workoutCard}
                            activeOpacity={0.9}
                            onPress={() => setSelectedWorkout(item)}
                        >
                            <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.7)']}
                                style={styles.cardGradient}
                            />

                            <View style={styles.cardContent}>
                                <View style={styles.cardTop}>
                                    <View style={[styles.difficultyBadge, { backgroundColor: item.difficulty === 'Beginner' ? '#10b981' : item.difficulty === 'Advanced' ? '#ef4444' : '#f59e0b' }]}>
                                        <Text style={styles.difficultyText}>{item.difficulty}</Text>
                                    </View>
                                    {item.isPremium && (
                                        <View style={styles.premiumBadge}>
                                            <Star size={10} color="#ffffff" fill="#ffffff" />
                                            <Text style={styles.premiumText}>PRO</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.cardBottom}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <View style={styles.cardStats}>
                                        <View style={styles.cardStat}>
                                            <Clock size={12} color="#ffffff" />
                                            <Text style={styles.cardStatText}>{item.duration}m</Text>
                                        </View>
                                        <View style={styles.cardStat}>
                                            <Zap size={12} color="#ffffff" />
                                            <Text style={styles.cardStatText}>{item.calories} kcal</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {workouts.length === 0 && (
                        <View style={styles.empty}>
                            <Dumbbell size={64} color="#e2e8f0" />
                            <Text style={styles.emptyText}>No routines found</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ebf1fe' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 16, color: '#64748b', fontWeight: '600' },
    searchContainer: { paddingHorizontal: 24, marginBottom: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#1e293b' },
    categoryContainer: { marginBottom: 24 },
    categoryScroll: { paddingHorizontal: 24, gap: 10 },
    categoryPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
    categoryPillActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
    categoryText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    categoryTextActive: { color: '#ffffff' },
    listContainer: { paddingHorizontal: 24, paddingBottom: 40, gap: 20 },
    workoutCard: { height: 200, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    cardImage: { width: '100%', height: '100%' },
    cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
    cardContent: { position: 'absolute', inset: 0, padding: 20, justifyContent: 'space-between' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
    difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    difficultyText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
    premiumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', gap: 4 },
    premiumText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
    cardBottom: {},
    cardTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 6 },
    cardStats: { flexDirection: 'row', gap: 16 },
    cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardStatText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 16 },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },

    // Details styles
    detailContainer: { flex: 1, backgroundColor: '#ebf1fe' },
    detailContent: { paddingBottom: 100 },
    detailHero: { height: 350, width: '100%' },
    heroImage: { width: '100%', height: '100%' },
    backButton: { position: 'absolute', left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    playButtonLarge: { position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(37,99,235,0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    premiumDetailBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    premiumDetailText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
    detailBody: { padding: 24, marginTop: -20, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    lockNotice: {
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 12,
        alignItems: 'center',
    },
    lockNoticeText: { color: '#92400e', fontWeight: '900' },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    detailTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b', flex: 1, marginRight: 12 },
    detailDescription: { fontSize: 16, color: '#64748b', lineHeight: 24, marginBottom: 24 },
    statsStrip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 32 },
    statBox: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 4 },
    statLab: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    infoSection: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
    infoGrid: { gap: 12 },
    infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    infoLabel: { fontSize: 15, color: '#64748b', fontWeight: '600' },
    infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '700' },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16 },
    exerciseIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    exerciseIndexText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
    exerciseInfo: { flex: 1 },
    exerciseName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    exerciseDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
    exerciseDuration: { fontSize: 14, fontWeight: '800', color: '#2563eb' },

    blurBlock: {
        marginTop: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minHeight: 140,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    blurOverlay: { alignItems: 'center', padding: 18 },
    blurTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
    blurText: { color: '#475569', fontWeight: '700', textAlign: 'center', lineHeight: 18 },
    blurBtn: {
        marginTop: 12,
        backgroundColor: '#2563eb',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    blurBtnText: { color: '#ffffff', fontWeight: '900' },
    bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    startButton: { backgroundColor: '#2563eb', height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
    startButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    videoModal: { width: '100%', aspectRatio: 16 / 9, padding: 20 },
    videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    videoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    videoPlayerPlaceholder: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    videoPlaceholderText: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginTop: 16 },
    videoPlaceholderSub: { color: '#94a3b8', fontSize: 14, marginTop: 4 }
});
