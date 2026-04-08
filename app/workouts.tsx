import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal,
    Dimensions,
    Alert
} from 'react-native';
import { Image } from 'expo-image';
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
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const [listTab, setListTab] = useState<'browse' | 'muscles' | 'saved'>('browse');

    const convexUser = useQuery(
        api.users.getUserByClerkId,
        clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
    );
    const appUser = useAppUser();
    const isPro = appUser.isPro || appUser.isAdmin;

    // User's biological sex — used for gender-aware video selection
    const userSex = (convexUser as any)?.biologicalSex as 'male' | 'female' | undefined;

    const workouts = useQuery(api.videoWorkouts.list, {
        search: search || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory
    });

    // Muscle group images from DB (admin-managed via admin/media.tsx)
    const muscleGroupImagesDb = useQuery(api.muscleGroupImages.listAll);

    const FALLBACK_MUSCLE_CARDS = [
        { title: 'Chest', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=400' },
        { title: 'Back', image: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?auto=format&fit=crop&q=80&w=400' },
        { title: 'Shoulders', image: 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?auto=format&fit=crop&q=80&w=400' },
        { title: 'Biceps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=400' },
        { title: 'Triceps', image: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&q=80&w=400' },
        { title: 'Legs', image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=400' },
        { title: 'Glutes', image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&q=80&w=400' },
        { title: 'Core', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=400' },
        { title: 'Abs', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=400' },
        { title: 'Cardio', image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80&w=400' },
    ];

    const categories = ['All', 'Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core', 'Women', 'Functional/Mobility', 'Warm-up/Activation', 'Calisthenics/Bodyweight', 'Plyometrics', 'Balance'];
    const muscleGroups = ['All', 'Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Legs', 'Core', 'Glutes', 'Abs', 'Pelvic Floor', 'Serratus'];

    // Merge DB images with fallbacks — must be before any early return (Rules of Hooks)
    const MUSCLE_CARDS = useMemo(() => {
        return FALLBACK_MUSCLE_CARDS.map(fc => {
            const dbEntry = muscleGroupImagesDb?.find(r => r.name === fc.title);
            return { title: fc.title, image: dbEntry?.imageUrl || fc.image };
        });
    }, [muscleGroupImagesDb]);

    // Client-side muscle group filter — uses muscleGroupTags when set, falls back to exercises[].primaryMuscles
    const filteredWorkouts = useMemo(() => {
        if (!workouts) return [];
        if (selectedMuscle === 'All') return workouts;
        const m = selectedMuscle.toLowerCase();
        return workouts.filter((w: any) => {
            // Prefer the explicit tag array set in admin
            if (w.muscleGroupTags?.length > 0) {
                return w.muscleGroupTags.some((t: string) => t.toLowerCase() === m);
            }
            // Fallback: scan exercise muscles
            return w.exercises?.some((ex: any) =>
                ex.primaryMuscles?.some((pm: string) => pm.toLowerCase().includes(m)) ||
                ex.secondaryMuscles?.some((sm: string) => sm.toLowerCase().includes(m))
            );
        });
    }, [workouts, selectedMuscle]);

    // All saved workouts — used for the Saved tab and per-card bookmark state
    const savedWorkouts = useQuery(
        api.savedWorkouts.getSavedWorkouts,
        convexUser?._id ? { userId: convexUser._id } : 'skip'
    );
    const savedIds = useMemo(
        () => new Set((savedWorkouts ?? []).map((w: any) => w._id)),
        [savedWorkouts]
    );

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
    const logExerciseEntry = useMutation(api.exercise.logExerciseEntry);

    const handleToggleSave = async () => {
        if (!convexUser?._id || !selectedWorkout?._id) return;
        try {
            await toggleSave({ userId: convexUser._id, workoutId: selectedWorkout._id });
        } catch {
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    // Toggle save directly from a card (without opening the workout)
    const handleCardToggleSave = async (workoutId: any) => {
        if (!convexUser?._id) return;
        try {
            await toggleSave({ userId: convexUser._id, workoutId });
        } catch {
            Alert.alert('Error', 'Could not update saved workout');
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

            // Double log to the main exercise entries so it shows up in "Today's Activities" and KPI counters!
            await logExerciseEntry({
                userId: convexUser._id,
                exerciseName: selectedExerciseForLog.name,
                exerciseType: (selectedExerciseForLog.exerciseType || 'strength') as "strength" | "cardio" | "hiit" | "yoga",
                duration: data.duration || 30, // fallback average 30m if not provided
                met: selectedExerciseForLog.exerciseType === 'cardio' ? 7.0 : 5.0, // base average MET
                sets: data.sets?.length || 0,
                date: today,
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
                        <Image
                            source={{ uri: (userSex === 'male' ? selectedWorkout.thumbnailMale : userSex === 'female' ? selectedWorkout.thumbnailFemale : null) || selectedWorkout.thumbnail }}
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
                                <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{selectedWorkout.difficulty}</Text>
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
                            </View>
                        </View>

                        {/* Equipment */}
                        {(selectedWorkout.equipment?.length > 0 || selectedWorkout.optionalEquipment?.length > 0) && (
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Equipment</Text>
                                <View style={styles.equipmentList}>
                                    {selectedWorkout.equipment?.map((eq: string, i: number) => (
                                        <View key={i} style={styles.equipmentItem}>
                                            <View style={styles.equipmentDot} />
                                            <Text style={styles.equipmentText}>{eq}</Text>
                                        </View>
                                    ))}
                                    {selectedWorkout.optionalEquipment?.length > 0 && (
                                        <>
                                            <Text style={styles.equipmentOrLabel}>or alternatively:</Text>
                                            {selectedWorkout.optionalEquipment.map((eq: string, i: number) => (
                                                <View key={`opt-${i}`} style={styles.equipmentItem}>
                                                    <View style={[styles.equipmentDot, styles.equipmentDotOptional]} />
                                                    <Text style={[styles.equipmentText, styles.equipmentTextOptional]}>{eq}</Text>
                                                </View>
                                            ))}
                                        </>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* ── Exercise Details ── */}
                        {hasExercises && (
                            <View style={styles.infoSection}>
                                <Text style={styles.sectionTitle}>Exercise Details</Text>
                                {selectedWorkout.exercises.map((ex: any, idx: number) => (
                                    <View key={idx} style={styles.exerciseDetailCard}>
                                        {/* Instructions — Pro only */}
                                        {isPro && ex.instructions && ex.instructions.length > 0 && (
                                            <View style={styles.instructionsBox}>
                                                <Text style={styles.instructionsTitle}>Instructions</Text>
                                                {ex.instructions.map((step: string, i: number) => (
                                                    <View key={i} style={styles.instructionRow}>
                                                        <View style={styles.instructionNumWrap}>
                                                            <Text style={styles.instructionNum}>{i + 1}</Text>
                                                            <View style={styles.instructionNumUnderline} />
                                                        </View>
                                                        <Text style={styles.instructionItem}>{step}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* Muscles */}
                                        {(ex.primaryMuscles?.length > 0 || (isPro && ex.secondaryMuscles?.length > 0)) && (
                                            <View style={styles.musclesBox}>
                                                {ex.primaryMuscles?.length > 0 && (
                                                    <View style={styles.muscleGroup}>
                                                        <Text style={styles.muscleGroupTitle}>Primary Muscles</Text>
                                                        {ex.primaryMuscles.map((m: string, i: number) => (
                                                            <Text key={i} style={styles.muscleItem}>• {m}</Text>
                                                        ))}
                                                    </View>
                                                )}
                                                {isPro && ex.secondaryMuscles?.length > 0 && (
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

                {/* Bottom action — log the first/only exercise */}
                {hasExercises && (
                    <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => handleLogExercise(selectedWorkout.exercises[0])}
                        >
                            <Dumbbell size={22} color="#ffffff" />
                            <Text style={styles.startButtonText}>Log Exercise</Text>
                        </TouchableOpacity>
                    </View>
                )}

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

                            {(() => {
                                // Gender-aware video selection:
                                // 1. Prefer gender-specific variant based on user's biologicalSex
                                // 2. Fall back to the universal videoUrl
                                const genderUrl = userSex === 'male'
                                    ? selectedWorkout.videoUrlMale
                                    : userSex === 'female'
                                        ? selectedWorkout.videoUrlFemale
                                        : undefined;
                                const resolvedUrl = genderUrl || selectedWorkout.videoUrl;
                                return resolvedUrl ? (
                                    resolvedUrl.toLowerCase().endsWith('.gif') ? (
                                        <Image
                                            source={{ uri: resolvedUrl }}
                                            style={styles.videoPlayer}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Video
                                            source={{ uri: resolvedUrl }}
                                            style={styles.videoPlayer}
                                            useNativeControls
                                            resizeMode={ResizeMode.CONTAIN}
                                            isLooping
                                            shouldPlay
                                        />
                                    )
                                ) : (
                                    <View style={styles.videoPlayerPlaceholder}>
                                        <Play size={48} color="rgba(255,255,255,0.5)" />
                                        <Text style={styles.videoPlaceholderText}>No video URL configured</Text>
                                        <Text style={styles.videoPlaceholderSub}>Add a Video URL in the admin panel</Text>
                                    </View>
                                );
                            })()}
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

            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Workouts</Text>
                    <Text style={styles.subtitle}>Guided video routines</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerCircle}>
                    <X size={20} color="#1e293b" />
                </TouchableOpacity>
            </View>

            {/* ── Search Bar ── */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        placeholder="Search workouts..."
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={18} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Tabs: Browse / Muscles / Saved ── */}
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tabItem, listTab === 'browse' && styles.tabItemActive]}
                    onPress={() => setListTab('browse')}
                >
                    <Dumbbell size={15} color={listTab === 'browse' ? '#2563eb' : '#94a3b8'} />
                    <Text style={[styles.tabText, listTab === 'browse' && styles.tabTextActive]}>Browse</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, listTab === 'muscles' && styles.tabItemActive]}
                    onPress={() => setListTab('muscles')}
                >
                    <Zap size={15} color={listTab === 'muscles' ? '#2563eb' : '#94a3b8'} />
                    <Text style={[styles.tabText, listTab === 'muscles' && styles.tabTextActive]}>
                        Muscles{selectedMuscle !== 'All' ? ` · ${selectedMuscle}` : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, listTab === 'saved' && styles.tabItemActive]}
                    onPress={() => setListTab('saved')}
                >
                    <Bookmark
                        size={15}
                        color={listTab === 'saved' ? '#2563eb' : '#94a3b8'}
                        fill={listTab === 'saved' ? '#2563eb' : 'transparent'}
                    />
                    <Text style={[styles.tabText, listTab === 'saved' && styles.tabTextActive]}>
                        Saved{savedWorkouts?.length ? ` · ${savedWorkouts.length}` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ══ BROWSE TAB ══ */}
            {listTab === 'browse' && (
                <>
                    {/* Type filter chips */}
                    <View style={styles.filterRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.filterPill, selectedCategory === c && styles.filterPillActive]}
                                    onPress={() => setSelectedCategory(c)}
                                >
                                    <Text style={[styles.filterPillText, selectedCategory === c && styles.filterPillTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {!workouts ? (
                        <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                            {filteredWorkouts.map(item => {
                                const isItemSaved = savedIds.has(item._id);
                                return (
                                    <TouchableOpacity
                                        key={item._id}
                                        style={styles.workoutCard}
                                        activeOpacity={0.9}
                                        onPress={() => setSelectedWorkout(item)}
                                    >
                                        <Image
                                            source={{ uri: (userSex === 'male' ? item.thumbnailMale : userSex === 'female' ? item.thumbnailFemale : null) || item.thumbnail }}
                                            style={styles.cardImage}
                                        />
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.cardGradient} />
                                        {/* Save icon — top right */}
                                        <TouchableOpacity
                                            style={styles.cardSaveBtn}
                                            onPress={() => handleCardToggleSave(item._id)}
                                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                        >
                                            <Bookmark
                                                size={18}
                                                color="#ffffff"
                                                fill={isItemSaved ? '#ffffff' : 'transparent'}
                                            />
                                        </TouchableOpacity>
                                        <View style={styles.cardContent}>
                                            <View style={styles.cardBottom}>
                                                <Text style={styles.cardTitle}>{item.title}</Text>
                                                <View style={styles.cardStats}>
                                                    <View style={styles.cardStat}>
                                                        <Dumbbell size={12} color="#ffffff" />
                                                        <Text style={styles.cardStatText}>{item.category}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {filteredWorkouts.length === 0 && (
                                <View style={styles.empty}>
                                    <Dumbbell size={64} color="#e2e8f0" />
                                    <Text style={styles.emptyText}>No routines found</Text>
                                    <Text style={styles.emptySubText}>Try a different type or clear the muscle filter</Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </>
            )}

            {/* ══ MUSCLES TAB ══ */}
            {listTab === 'muscles' && (
                <ScrollView contentContainerStyle={styles.muscleGridContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.muscleSectionHeader}>Browse by Muscle Group</Text>
                    <View style={styles.muscleImageGrid}>
                        {MUSCLE_CARDS.map(mc => {
                            const isActive = selectedMuscle === mc.title;
                            return (
                                <TouchableOpacity
                                    key={mc.title}
                                    style={[styles.muscleImageCard, isActive && styles.muscleImageCardActive]}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setSelectedMuscle(isActive ? 'All' : mc.title);
                                        setListTab('browse');
                                    }}
                                >
                                    <Image source={{ uri: mc.image }} style={styles.muscleCardImage} />
                                    <LinearGradient
                                        colors={isActive ? ['rgba(37,99,235,0.7)', 'rgba(37,99,235,0.9)'] : ['transparent', 'rgba(0,0,0,0.65)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    {isActive && (
                                        <View style={styles.muscleCheckBadge}>
                                            <ChevronRight size={14} color="#ffffff" />
                                        </View>
                                    )}
                                    <Text style={styles.muscleCardLabel}>{mc.title}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* All muscles reset */}
                    {selectedMuscle !== 'All' && (
                        <TouchableOpacity style={styles.clearMuscleBtn} onPress={() => setSelectedMuscle('All')}>
                            <X size={14} color="#2563eb" />
                            <Text style={styles.clearMuscleBtnText}>Clear filter: {selectedMuscle}</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}

            {/* ══ SAVED TAB ══ */}
            {listTab === 'saved' && (
                <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
                    {!savedWorkouts ? (
                        <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
                    ) : savedWorkouts.length === 0 ? (
                        <View style={styles.empty}>
                            <Bookmark size={64} color="#e2e8f0" />
                            <Text style={styles.emptyText}>No saved workouts yet</Text>
                            <Text style={styles.emptySubText}>Tap the bookmark icon on any workout to save it here</Text>
                        </View>
                    ) : (
                        savedWorkouts.map((item: any) => {
                            const isItemSaved = true; // always saved in this tab
                            return (
                                <TouchableOpacity
                                    key={item._id}
                                    style={styles.workoutCard}
                                    activeOpacity={0.9}
                                    onPress={() => setSelectedWorkout(item)}
                                >
                                    <Image
                                        source={{ uri: (userSex === 'male' ? item.thumbnailMale : userSex === 'female' ? item.thumbnailFemale : null) || item.thumbnail }}
                                        style={styles.cardImage}
                                    />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.cardGradient} />
                                    <TouchableOpacity
                                        style={styles.cardSaveBtn}
                                        onPress={() => handleCardToggleSave(item._id)}
                                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                    >
                                        <Bookmark size={18} color="#ffffff" fill="#ffffff" />
                                    </TouchableOpacity>
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardBottom}>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <View style={styles.cardStats}>
                                                <View style={styles.cardStat}>
                                                    <Dumbbell size={12} color="#ffffff" />
                                                    <Text style={styles.cardStatText}>{item.category}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // List screen
    container: { flex: 1, backgroundColor: '#F5F4F0' },
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
    // Tabs
    tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 16, backgroundColor: '#ffffff' },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderBottomWidth: 3, borderBottomColor: 'transparent', gap: 6 },
    tabItemActive: { borderBottomColor: '#2563eb' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    tabTextActive: { color: '#2563eb' },
    // Type filter pills row
    filterRow: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 10, backgroundColor: '#ffffff' },
    filterScroll: { paddingHorizontal: 16, gap: 8 },
    filterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    filterPillActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
    filterPillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterPillTextActive: { color: '#ffffff' },
    listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    workoutCard: { width: (width - 44) / 2, height: 220, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 6, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0' },
    cardImage: { width: '100%', height: '100%' },
    cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
    cardContent: { position: 'absolute', inset: 0, padding: 14, justifyContent: 'flex-end' },
    cardSaveBtn: {
        position: 'absolute', top: 10, right: 10,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center', alignItems: 'center',
    },
    cardBottom: {},
    cardTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', marginBottom: 6, lineHeight: 18 },
    cardStats: { flexDirection: 'row', gap: 8 },
    cardStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardStatText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12, width: '100%' },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
    emptySubText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500', textAlign: 'center' },
    // Muscle image grid
    muscleGridContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    muscleSectionHeader: { fontSize: 16, fontWeight: '800', color: '#1e293b', paddingVertical: 14 },
    muscleImageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    muscleImageCard: {
        width: (width - 44) / 2,
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    muscleImageCardActive: { borderColor: '#2563eb' },
    muscleCardImage: { ...StyleSheet.absoluteFillObject as any, width: '100%', height: '100%' },
    muscleCardLabel: { color: '#ffffff', fontWeight: '900', fontSize: 18, padding: 12 },
    muscleCheckBadge: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: '#2563eb',
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    clearMuscleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 8, paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: '#eff6ff', borderRadius: 12,
        borderWidth: 1, borderColor: '#bfdbfe',
        alignSelf: 'flex-start',
    },
    clearMuscleBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },

    // Detail screen
    detailContainer: { flex: 1, backgroundColor: '#F5F4F0' },
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
    // Equipment list
    equipmentList: { gap: 8 },
    equipmentItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    equipmentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', flexShrink: 0 },
    equipmentDotOptional: { backgroundColor: '#94a3b8' },
    equipmentText: { fontSize: 15, color: '#1e293b', fontWeight: '600', flex: 1 },
    equipmentTextOptional: { color: '#64748b', fontWeight: '500' },
    equipmentOrLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4, marginBottom: 2 },
    // Instructions
    instructionsBox: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginTop: 8 },
    instructionsTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
    instructionRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
    instructionNumWrap: { alignItems: 'center', width: 22, flexShrink: 0, paddingTop: 2 },
    instructionNum: { fontSize: 13, fontWeight: '900', color: '#2563eb', lineHeight: 18 },
    instructionNumUnderline: { width: 14, height: 3, borderRadius: 2, backgroundColor: '#2563eb', marginTop: 2 },
    instructionItem: { fontSize: 13, color: '#475569', lineHeight: 20, flex: 1 },
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

    // Video modal — portrait (9 : 16) for exercisematic vertical videos
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    videoModal: { width: width * 0.72, alignItems: 'stretch' },
    videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    videoTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', flex: 1, marginRight: 12 },
    videoPlayer: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000000', borderRadius: 20 },
    videoPlayerPlaceholder: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#1e293b', borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 12 },
    videoPlaceholderText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    videoPlaceholderSub: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
});
