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
    Alert
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
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { BlurView } from 'expo-blur';
import { useUser as useAppUser } from '@/context/UserContext';
import SingleExerciseLogModal from '@/components/move/modals/SingleExerciseLogModal';
// expo-av for real video playback
import { Video, ResizeMode } from 'expo-av';

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
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedExerciseForLog, setSelectedExerciseForLog] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);

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

    const toggleSave = useMutation(api.savedWorkouts.toggleSaveWorkout);
    const isSaved = useQuery(
        api.savedWorkouts.isWorkoutSaved,
        convexUser?._id && selectedWorkout?._id
            ? { userId: convexUser._id, workoutId: selectedWorkout._id }
            : 'skip'
    );

    const firstExerciseName = selectedWorkout?.exercises?.[0]?.name;
    const exerciseProgress = useQuery(
        api.workoutExerciseLogs.getExerciseProgress,
        convexUser?._id && firstExerciseName
            ? { userId: convexUser._id, exerciseName: firstExerciseName }
            : 'skip'
    );
    const exerciseHistory = useQuery(
        api.workoutExerciseLogs.getExerciseHistory,
        convexUser?._id && firstExerciseName
            ? { userId: convexUser._id, exerciseName: firstExerciseName }
            : 'skip'
    );

    const logExercise = useMutation(api.workoutExerciseLogs.logExercise);

    const handleToggleSave = async () => {
        if (!convexUser?._id || !selectedWorkout?._id) return;
        try {
            await toggleSave({ userId: convexUser._id, workoutId: selectedWorkout._id });
        } catch {
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    const handleLogExercise = (exercise: any) => {
        setSelectedExerciseForLog(exercise);
        setShowLogModal(true);
    };

    const handleSaveLog = async (
        _exerciseId: string,
        data: { sets?: any[]; duration?: number; calories?: number; distanceKm?: number; pace?: number }
    ) => {
        if (!convexUser?._id || !selectedWorkout?._id || !selectedExerciseForLog) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            await logExercise({
                userId: convexUser._id,
                workoutId: selectedWorkout._id,
                exerciseName: selectedExerciseForLog.name,
                date: today,
                sets: data.sets?.map(s => ({
                    weight: parseFloat(s.weight) || 0,
                    reps: parseFloat(s.reps) || 0,
                })),
                duration: data.duration,
                notes: undefined,
            });
            setShowLogModal(false);
            setSelectedExerciseForLog(null);
            Alert.alert('Success', 'Exercise logged!');
        } catch {
            Alert.alert('Error', 'Failed to log exercise');
        }
    };

    // ─── DETAIL VIEW ──────────────────────────────────────────────────────────
    if (selectedWorkout) {
        const locked = !!selectedWorkout.isPremium && !isPro;
        const hasExercises = selectedWorkout.exercises && selectedWorkout.exercises.length > 0;

        return (
            <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
                <Stack.Screen options={{ headerShown: false }} />

                <ScrollView contentContainerStyle={styles.detailContent}>
                    {/* Hero */}
                    <View style={styles.detailHero}>
                        <Image source={{ uri: selectedWorkout.thumbnail }} style={styles.heroImage} />
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
                                if (locked) { setShowUpgrade(true); return; }
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

                    {/* Body */}
                    <View style={styles.detailBody}>
                        {locked && (
                            <View style={styles.lockNotice}>
                                <Text style={styles.lockNoticeText}>Pro required — preview only</Text>
                            </View>
                        )}

                        <View style={styles.titleRow}>
                            <Text style={styles.detailTitle}>{selectedWorkout.title}</Text>
                            <TouchableOpacity onPress={handleToggleSave}>
                                {isSaved
                                    ? <Bookmark size={24} color="#2563eb" fill="#2563eb" />
                                    : <Bookmark size={24} color="#64748b" />}
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
                                <Dumbbell size={16} color="#2563eb" />
                                <Text style={styles.statVal}>{selectedWorkout.difficulty}</Text>
                                <Text style={styles.statLab}>Level</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statVal}>{selectedWorkout.equipment?.length ?? 0}</Text>
                                <Text style={styles.statLab}>Equipment</Text>
                            </View>
                        </View>

                        {/* Details */}
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Instructor</Text>
                                    <Text style={styles.infoValue}>{selectedWorkout.instructor || 'Bluom Coach'}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Difficulty</Text>
                                    <Text style={styles.infoValue}>{selectedWorkout.difficulty}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Equipment</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedWorkout.equipment?.length > 0
                                            ? selectedWorkout.equipment.join(', ')
                                            : 'None'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* ── Exercise Details ── */}
                        {hasExercises && (
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Exercise Details</Text>
                                {selectedWorkout.exercises.map((ex: any, idx: number) => (
                                    <View key={idx} style={styles.exerciseDetailCard}>
                                        <View style={styles.exerciseHeader}>
                                            <View style={styles.exerciseIndex}>
                                                <Text style={styles.exerciseIndexText}>{idx + 1}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.exerciseName}>{ex.name}</Text>
                                                {ex.exerciseType && (
                                                    <Text style={styles.exerciseType}>{ex.exerciseType}</Text>
                                                )}
                                            </View>
                                            {/* Log button with Dumbbell icon */}
                                            <TouchableOpacity
                                                style={styles.logButton}
                                                onPress={() => handleLogExercise(ex)}
                                            >
                                                <Dumbbell size={14} color="#ffffff" />
                                                <Text style={styles.logButtonText}>Log</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {!!ex.description && (
                                            <Text style={styles.exerciseDesc}>{ex.description}</Text>
                                        )}

                                        {/* Instructions */}
                                        {ex.instructions && ex.instructions.length > 0 && (
                                            <View style={styles.instructionsBox}>
                                                <Text style={styles.instructionsTitle}>Instructions</Text>
                                                {ex.instructions.map((step: string, i: number) => (
                                                    <Text key={i} style={styles.instructionItem}>
                                                        {i + 1}. {step}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}

                                        {/* Muscles */}
                                        {(ex.primaryMuscles?.length > 0 || ex.secondaryMuscles?.length > 0) && (
                                            <View style={styles.musclesBox}>
                                                {ex.primaryMuscles?.length > 0 && (
                                                    <View style={styles.muscleGroup}>
                                                        <Text style={styles.muscleGroupTitle}>Primary Muscles</Text>
                                                        {ex.primaryMuscles.map((m: string, i: number) => (
                                                            <Text key={i} style={styles.muscleItem}>• {m}</Text>
                                                        ))}
                                                    </View>
                                                )}
                                                {ex.secondaryMuscles?.length > 0 && (
                                                    <View style={styles.muscleGroup}>
                                                        <Text style={styles.muscleGroupTitle}>Secondary Muscles</Text>
                                                        {ex.secondaryMuscles.map((m: string, i: number) => (
                                                            <Text key={i} style={styles.muscleItem}>• {m}</Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Workout Progress */}
                        {exerciseProgress && (
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Workout Progress</Text>
                                <View style={styles.progressGrid}>
                                    <View style={styles.progressCard}>
                                        <Text style={styles.progressValue}>{exerciseProgress.maxWeight} kg</Text>
                                        <Text style={styles.progressLabel}>Max Weight</Text>
                                    </View>
                                    <View style={styles.progressCard}>
                                        <Text style={styles.progressValue}>{exerciseProgress.maxVolume} kg</Text>
                                        <Text style={styles.progressLabel}>Max Volume</Text>
                                    </View>
                                    <View style={styles.progressCard}>
                                        <Text style={styles.progressValue}>{exerciseProgress.totalSessions}</Text>
                                        <Text style={styles.progressLabel}>Sessions</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Workout History — collapsible */}
                        {exerciseHistory && exerciseHistory.length > 0 && (
                            <View style={styles.infoSection}>
                                <TouchableOpacity
                                    style={styles.historySectionHeader}
                                    onPress={() => setShowHistory(v => !v)}
                                >
                                    <Text style={styles.sectionTitle}>
                                        Workout History ({exerciseHistory.length})
                                    </Text>
                                    {showHistory
                                        ? <ChevronUp size={20} color="#64748b" />
                                        : <ChevronDown size={20} color="#64748b" />}
                                </TouchableOpacity>

                                {showHistory && exerciseHistory.slice(0, 10).map((log: any, idx: number) => (
                                    <View key={idx} style={styles.historyRow}>
                                        <Text style={styles.historyDate}>{log.date}</Text>
                                        <View style={styles.historyDetails}>
                                            {log.sets && (
                                                <Text style={styles.historyText}>
                                                    {log.sets.length} sets • {log.sets.reduce((s: number, x: any) => s + x.reps, 0)} reps
                                                </Text>
                                            )}
                                            {log.duration && (
                                                <Text style={styles.historyText}>{log.duration} min</Text>
                                            )}
                                        </View>
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

                {/* Bottom action */}
                <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push('/(tabs)/move')}
                    >
                        <Play size={22} color="#ffffff" fill="#ffffff" />
                        <Text style={styles.startButtonText}>Go to Move Tab</Text>
                    </TouchableOpacity>
                </View>

                {/* ── VIDEO MODAL with expo-av ── */}
                <Modal visible={showVideoModal} animationType="fade" transparent>
                    <View style={styles.videoModalContainer}>
                        {/* Dismiss on backdrop tap */}
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowVideoModal(false)}
                        />
                        <View style={styles.videoModal}>
                            <View style={styles.videoHeader}>
                                <Text style={styles.videoTitle} numberOfLines={1}>
                                    {selectedWorkout.title}
                                </Text>
                                <TouchableOpacity onPress={() => setShowVideoModal(false)}>
                                    <X size={24} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            {selectedWorkout.videoUrl ? (
                                <Video
                                    source={{ uri: selectedWorkout.videoUrl }}
                                    style={styles.videoPlayer}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    isLooping
                                    shouldPlay
                                />
                            ) : (
                                <View style={styles.videoPlayerPlaceholder}>
                                    <Play size={48} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.videoPlaceholderText}>No video URL configured</Text>
                                    <Text style={styles.videoPlaceholderSub}>
                                        Add a Video URL in the admin panel
                                    </Text>
                                </View>
                            )}
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

                <SingleExerciseLogModal
                    visible={showLogModal}
                    exercise={selectedExerciseForLog ? {
                        id: selectedExerciseForLog.name,
                        name: selectedExerciseForLog.name,
                        type: selectedExerciseForLog.exerciseType || 'strength',
                    } : null}
                    onClose={() => { setShowLogModal(false); setSelectedExerciseForLog(null); }}
                    onSave={handleSaveLog}
                />
            </SafeAreaView>
        );
    }

    // ─── LIST VIEW ────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Workouts</Text>
                    <Text style={styles.subtitle}>Guided video routines</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerCircle}>
                    <X size={20} color="#1e293b" />
                </TouchableOpacity>
            </View>

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

            <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {categories.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.categoryPill, selectedCategory === c && styles.categoryPillActive]}
                            onPress={() => setSelectedCategory(c)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === c && styles.categoryTextActive]}>
                                {c}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

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
                                    <View style={[styles.difficultyBadge, {
                                        backgroundColor:
                                            item.difficulty === 'Beginner' ? '#10b981'
                                                : item.difficulty === 'Advanced' ? '#ef4444'
                                                    : '#f59e0b'
                                    }]}>
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
                                            <Dumbbell size={12} color="#ffffff" />
                                            <Text style={styles.cardStatText}>{item.category}</Text>
                                        </View>
                                        <View style={styles.cardStat}>
                                            <Star size={12} color="#ffffff" fill="#ffffff" />
                                            <Text style={styles.cardStatText}>{item.rating}</Text>
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
    // List screen
    container: { flex: 1, backgroundColor: '#ebf1fe' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerCircle: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 16, color: '#64748b', fontWeight: '600' },
    searchContainer: { paddingHorizontal: 24, marginBottom: 16 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
        paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12,
    },
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

    // Detail screen
    detailContainer: { flex: 1, backgroundColor: '#ebf1fe' },
    detailContent: { paddingBottom: 100 },
    detailHero: { height: 350, width: '100%' },
    heroImage: { width: '100%', height: '100%' },
    backButton: {
        position: 'absolute', left: 20, width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
    },
    playButtonLarge: {
        position: 'absolute', top: '50%', left: '50%', marginLeft: -40, marginTop: -40,
        width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(37,99,235,0.9)',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
    },
    premiumDetailBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    premiumDetailText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
    detailBody: { padding: 24, marginTop: -20, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    lockNotice: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginBottom: 12, alignItems: 'center' },
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
    exerciseDetailCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 16 },
    exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    exerciseIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    exerciseIndexText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
    exerciseName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    exerciseType: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
    exerciseDesc: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 12 },
    // Log button with Dumbbell icon
    logButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
    instructionsBox: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginTop: 8 },
    instructionsTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    instructionItem: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 4 },
    musclesBox: { flexDirection: 'row', gap: 12, marginTop: 8 },
    muscleGroup: { flex: 1, backgroundColor: '#eff6ff', padding: 12, borderRadius: 12 },
    muscleGroupTitle: { fontSize: 13, fontWeight: '800', color: '#2563eb', marginBottom: 6 },
    muscleItem: { fontSize: 12, color: '#1e40af', marginBottom: 2 },
    progressGrid: { flexDirection: 'row', gap: 12 },
    progressCard: { flex: 1, backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, alignItems: 'center' },
    progressValue: { fontSize: 24, fontWeight: '900', color: '#15803d' },
    progressLabel: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 4 },
    historySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    historyDate: { fontSize: 14, fontWeight: '700', color: '#1e293b', width: 100 },
    historyDetails: { flex: 1 },
    historyText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    blurBlock: { marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 140, justifyContent: 'center', backgroundColor: '#ffffff' },
    blurOverlay: { alignItems: 'center', padding: 18 },
    blurTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
    blurText: { color: '#475569', fontWeight: '700', textAlign: 'center', lineHeight: 18 },
    blurBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
    blurBtnText: { color: '#ffffff', fontWeight: '900' },
    bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    startButton: { backgroundColor: '#2563eb', height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
    startButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },

    // Video modal
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    videoModal: { width: '100%', aspectRatio: 16 / 9, paddingHorizontal: 20 },
    videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    videoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', flex: 1, marginRight: 12 },
    videoPlayer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000', borderRadius: 16 },
    videoPlayerPlaceholder: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    videoPlaceholderText: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginTop: 16 },
    videoPlaceholderSub: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
});