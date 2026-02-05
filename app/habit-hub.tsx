import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Dimensions,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SparkleEffect } from '../components/MicroInteractions';
import { Id } from '../convex/_generated/dataModel';
import { triggerSound, SoundEffect } from '../utils/soundEffects';

const { width } = Dimensions.get('window');

// --- Types & Constants for Build Tab ---
const habitCategories = ['health', 'fitness', 'mindfulness', 'social', 'learning'] as const;
type HabitCategory = (typeof habitCategories)[number];
const categoryLabels: Record<string, string> = {
    health: 'Health',
    fitness: 'Fitness',
    mindfulness: 'Mindfulness',
    social: 'Social',
    learning: 'Learning',
};

function toDisplayCategory(cat: string): HabitCategory {
    if (cat === 'routine') return 'health';
    if (cat === 'physical') return 'fitness';
    if (cat === 'mental') return 'mindfulness';
    if (habitCategories.includes(cat as HabitCategory)) return cat as HabitCategory;
    return 'health';
}

function displayToBackendCategory(cat: HabitCategory): 'routine' | 'physical' | 'mental' {
    if (cat === 'fitness') return 'physical';
    if (cat === 'mindfulness' || cat === 'social' || cat === 'learning') return 'mental';
    return 'routine';
}

const iconOptions = [
    { name: 'Target', iconName: 'locate' },
    { name: 'Droplets', iconName: 'water' },
    { name: 'Pill', iconName: 'medical' },
    { name: 'Book', iconName: 'book' },
    { name: 'Leaf', iconName: 'leaf' },
    { name: 'Zap', iconName: 'flash' },
    { name: 'Coffee', iconName: 'cafe' },
    { name: 'Apple', iconName: 'nutrition' },
    { name: 'Dumbbell', iconName: 'barbell' },
    { name: 'Phone', iconName: 'phone-portrait' },
    { name: 'Users', iconName: 'people' },
    { name: 'Music', iconName: 'musical-notes' },
    { name: 'Camera', iconName: 'camera' },
    { name: 'Heart', iconName: 'heart' },
    { name: 'Brain', iconName: 'fitness' },
    { name: 'Sun', iconName: 'sunny' },
    { name: 'Moon', iconName: 'moon' }
];

const DEFAULT_HABITS: Array<{
    name: string;
    icon: string;
    displayCategory: HabitCategory;
    backendCategory: 'routine' | 'physical' | 'mental';
    targetDaysPerWeek: number;
}> = [
        { name: 'Drink 8 glasses of water', icon: 'Droplets', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
        { name: 'Take daily vitamins', icon: 'Pill', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
        { name: 'Spend time in nature', icon: 'Leaf', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 5 },
        { name: 'Get 8 hours of sleep', icon: 'Moon', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
        { name: 'Limit screen time', icon: 'Phone', displayCategory: 'health', backendCategory: 'routine', targetDaysPerWeek: 7 },
        { name: 'Exercise for 30 minutes', icon: 'Dumbbell', displayCategory: 'fitness', backendCategory: 'physical', targetDaysPerWeek: 4 },
        { name: 'Meditate for 10 minutes', icon: 'Brain', displayCategory: 'mindfulness', backendCategory: 'mental', targetDaysPerWeek: 5 },
        { name: 'Practice gratitude', icon: 'Heart', displayCategory: 'mindfulness', backendCategory: 'mental', targetDaysPerWeek: 5 },
        { name: 'Connect with friends/family', icon: 'Users', displayCategory: 'social', backendCategory: 'mental', targetDaysPerWeek: 3 },
        { name: 'Read for 30 minutes', icon: 'Book', displayCategory: 'learning', backendCategory: 'mental', targetDaysPerWeek: 4 },
    ];

export default function HabitHubScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useUser();
    const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

    const [activeTab, setActiveTab] = useState<'build' | 'break'>('build');

    // --- Build Tab Logic ---
    const today = new Date().toISOString().split('T')[0];
    const habits = useQuery(api.habits.getUserHabitsForDate, user ? { userId: user._id, date: today } : "skip");
    const toggleHabit = useMutation(api.habits.toggleHabitForDate);
    const createHabit = useMutation(api.habits.createHabit);
    const deleteHabitMutation = useMutation(api.habits.deleteHabit);

    const [showHabitModal, setShowHabitModal] = useState(false);
    const [showBreakHabitModal, setShowBreakHabitModal] = useState(false);
    const [newHabit, setNewHabit] = useState({
        name: '',
        icon: 'Target',
        category: 'health' as typeof habitCategories[number],
        targetDays: 7
    });
    const [newBreakHabit, setNewBreakHabit] = useState({
        name: '',
        costPerDay: '',
        icon: '🚭'
    });
    const [sparkleTrigger, setSparkleTrigger] = useState<string | null>(null);

    // Seed defaults
    useEffect(() => {
        if (!user?._id) return;
        if (!habits) return;
        if (habits.length > 0) return;

        (async () => {
            try {
                for (const h of DEFAULT_HABITS) {
                    await createHabit({
                        userId: user._id,
                        name: h.name,
                        icon: h.icon,
                        category: h.backendCategory as any,
                        targetDaysPerWeek: h.targetDaysPerWeek,
                    });
                }
            } catch { }
        })();
    }, [user?._id, habits]);

    const completedHabitsToday = habits ? habits.filter(h => h.completedToday).length : 0;
    const totalHabits = habits ? habits.length : 0;
    const completionPercentage = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0;

    const handleToggleHabit = async (habitId: Id<"habits">) => {
        try {
            const res = await toggleHabit({ habitId, date: today });
            if (res.completed) {
                setSparkleTrigger(habitId);
                setTimeout(() => setSparkleTrigger(null), 1000);
                triggerSound(SoundEffect.WELLNESS_LOG);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to toggle habit');
        }
    };

    const handleAddCustomHabit = async () => {
        if (!user || !newHabit.name.trim()) return;
        try {
            await createHabit({
                userId: user._id,
                name: newHabit.name,
                icon: newHabit.icon,
                category: displayToBackendCategory(newHabit.category) as any,
                targetDaysPerWeek: newHabit.targetDays
            });
            setNewHabit({ name: '', icon: 'Target', category: 'health', targetDays: 7 });
            setShowHabitModal(false);
            Alert.alert('Success', 'Habit added!');
        } catch (e) {
            Alert.alert('Error', 'Failed to add habit');
        }
    };

    const handleAddBreakHabit = async () => {
        if (!user || !newBreakHabit.name.trim()) return;
        const cost = parseFloat(newBreakHabit.costPerDay);
        if (isNaN(cost) || cost < 0) {
            Alert.alert('Error', 'Please enter a valid cost per day');
            return;
        }
        try {
            await createQuittingHabit({
                userId: user._id,
                name: newBreakHabit.name,
                costPerDay: cost,
                icon: newBreakHabit.icon
            });
            setNewBreakHabit({ name: '', costPerDay: '', icon: '🚭' });
            setShowBreakHabitModal(false);
            Alert.alert('Success', 'Habit to break added!');
        } catch (e) {
            Alert.alert('Error', 'Failed to add habit to break');
        }
    };

    const handleDeleteHabit = (habitId: Id<"habits">) => {
        Alert.alert('Delete Habit', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteHabitMutation({ habitId }) }
        ]);
    };

    const getIconName = (iconName: string) => {
        const iconOption = iconOptions.find(option => option.name === iconName);
        return iconOption ? iconOption.iconName : 'locate';
    };

    // --- Break Tab Logic (Quitting Habits) ---
    const quittingHabits = useQuery(api.habits.getUserQuittingHabits, user ? { userId: user._id } : "skip");
    const createQuittingHabit = useMutation(api.habits.createQuittingHabit);
    const relapseHabit = useMutation(api.habits.relapseHabit);

    // Freedom Clock Logic
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const getFreedomTime = (startDate: number) => {
        const diff = now - startDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    };

    const getSavings = (startDate: number, costPerDay: number) => {
        const days = (now - startDate) / (1000 * 60 * 60 * 24);
        return (days * costPerDay).toFixed(2);
    };

    const handleRelapse = (habitId: Id<"quittingHabits">, name: string) => {
        Alert.alert(
            'Reset Timer?',
            `Are you sure you want to reset your progress for ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Relapse',
                    style: 'destructive',
                    onPress: async () => {
                        await relapseHabit({ habitId });
                        triggerSound(SoundEffect.ERROR); // Or some somber sound
                    }
                }
            ]
        );
    };

    const handleEmergency = (habitName: string) => {
        router.push({
            pathname: "/ai-coach",
            params: { initialPrompt: `I am having a craving for ${habitName}, help me stay on track!` }
        });
    };

    // --- Render ---

    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>Behavioral Hub</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.segmentedControl}>
                <TouchableOpacity
                    style={[styles.segment, activeTab === 'build' && styles.activeSegment]}
                    onPress={() => setActiveTab('build')}
                >
                    <Text style={[styles.segmentText, activeTab === 'build' && styles.activeSegmentText]}>Build Habits</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segment, activeTab === 'break' && styles.activeSegment]}
                    onPress={() => setActiveTab('break')}
                >
                    <Text style={[styles.segmentText, activeTab === 'break' && styles.activeSegmentText]}>Break Habits</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === 'build' ? (
                    <View>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.cardTitle}>Daily Habits</Text>
                                <Text style={styles.habitsSubtitle}>{completedHabitsToday} of {totalHabits} completed</Text>
                            </View>
                            <TouchableOpacity style={styles.addHabitButton} onPress={() => setShowHabitModal(true)}>
                                <Ionicons name="add" size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarLabel}>
                                <Text style={styles.progressBarText}>Today's Progress</Text>
                                <Text style={styles.progressBarText}>{completionPercentage}%</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
                            </View>
                        </View>

                        <View style={styles.habitsList}>
                            {habitCategories.map(category => {
                                const categoryHabits = (habits?.filter(h => toDisplayCategory(h.category) === category) ?? []);
                                if (categoryHabits.length === 0) return null;

                                return (
                                    <View key={category} style={styles.categorySection}>
                                        <Text style={styles.categoryTitle}>{categoryLabels[category].toUpperCase()}</Text>
                                        {categoryHabits.map((habit) => (
                                            <View key={habit._id} style={styles.habitItem}>
                                                <View style={styles.habitLeft}>
                                                    <TouchableOpacity
                                                        style={[styles.habitCheckbox, habit.completedToday && styles.habitCheckboxCompleted]}
                                                        onPress={() => handleToggleHabit(habit._id)}
                                                    >
                                                        {habit.completedToday && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                                                        <SparkleEffect visible={sparkleTrigger === habit._id} />
                                                    </TouchableOpacity>
                                                    <View style={[styles.habitIconContainer, { backgroundColor: '#dbeafe' }]}>
                                                        <Ionicons name={getIconName(habit.icon) as any} size={16} color="#2563eb" />
                                                    </View>
                                                    <View style={styles.habitInfo}>
                                                        <Text style={styles.habitName}>{habit.name}</Text>
                                                        <Text style={styles.habitStreak}>{habit.streak} day streak</Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity onPress={() => handleDeleteHabit(habit._id)}>
                                                    <Ionicons name="trash" size={16} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <View>
                        {quittingHabits?.map((habit) => {
                            const time = getFreedomTime(habit.startDate);
                            const saved = getSavings(habit.startDate, habit.costPerDay);

                            return (
                                <View key={habit._id} style={styles.breakCard}>
                                    <View style={styles.breakCardHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={styles.breakIconContainer}>
                                                <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
                                            </View>
                                            <Text style={styles.breakTitle}>{habit.name}</Text>
                                        </View>
                                        <View style={styles.statusBadge}>
                                            <View style={[styles.statusDot, { backgroundColor: habit.status === 'relapsed' ? '#ef4444' : '#22c55e' }]} />
                                            <Text style={styles.statusText}>{habit.status === 'active' ? 'Free' : 'Relapsed'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.freedomClockContainer}>
                                        <Text style={styles.freedomLabel}>FREEDOM CLOCK</Text>
                                        <View style={styles.clockRow}>
                                            <View style={styles.clockItem}>
                                                <Text style={styles.clockValue}>{time.days}</Text>
                                                <Text style={styles.clockUnit}>DAYS</Text>
                                            </View>
                                            <Text style={styles.clockSeparator}>:</Text>
                                            <View style={styles.clockItem}>
                                                <Text style={styles.clockValue}>{time.hours}</Text>
                                                <Text style={styles.clockUnit}>HRS</Text>
                                            </View>
                                            <Text style={styles.clockSeparator}>:</Text>
                                            <View style={styles.clockItem}>
                                                <Text style={styles.clockValue}>{time.minutes}</Text>
                                                <Text style={styles.clockUnit}>MINS</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.impactRow}>
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactLabel}>Money Saved</Text>
                                            <Text style={styles.impactValue}>${saved}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.emergencyButton}
                                            onPress={() => handleEmergency(habit.name)}
                                        >
                                            <Ionicons name="warning" size={16} color="#fff" />
                                            <Text style={styles.emergencyText}>SOS Help</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.relapseButton}
                                        onPress={() => handleRelapse(habit._id, habit.name)}
                                    >
                                        <Text style={styles.relapseText}>I Relapsed</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {(!quittingHabits || quittingHabits.length === 0) && (
                            <View style={styles.emptyState}>
                                <Ionicons name="shield-checkmark" size={48} color="#cbd5e1" />
                                <Text style={styles.emptyStateText}>No bad habits tracked yet.</Text>
                                <TouchableOpacity style={styles.addBreakHabitButton} onPress={() => setShowBreakHabitModal(true)}>
                                    <Text style={styles.addBreakHabitText}>Add Habit to Break</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Add Habit Modal */}
            <Modal visible={showHabitModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHabitModal(false)}>
                <SafeAreaView style={styles.modalContent} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add New Habit</Text>
                        <TouchableOpacity onPress={() => setShowHabitModal(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalScroll}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Habit Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Drink water"
                                value={newHabit.name}
                                onChangeText={(t) => setNewHabit({ ...newHabit, name: t })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Target Days per Week</Text>
                            <View style={styles.daysSelector}>
                                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.dayOption, newHabit.targetDays === d && styles.dayOptionSelected]}
                                        onPress={() => setNewHabit({ ...newHabit, targetDays: d })}
                                    >
                                        <Text style={[styles.dayOptionText, newHabit.targetDays === d && styles.dayOptionTextSelected]}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categorySelector}>
                                {habitCategories.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.categoryOption, newHabit.category === c && styles.categoryOptionSelected]}
                                        onPress={() => setNewHabit({ ...newHabit, category: c })}
                                    >
                                        <Text style={[styles.categoryOptionText, newHabit.category === c && styles.categoryOptionTextSelected]}>{categoryLabels[c]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#3b82f6', marginTop: 20 }]} onPress={handleAddCustomHabit}>
                            <Text style={styles.modalButtonText}>Create Habit</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Add Break Habit Modal */}
            <Modal visible={showBreakHabitModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBreakHabitModal(false)}>
                <SafeAreaView style={styles.modalContent} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Habit to Break</Text>
                        <TouchableOpacity onPress={() => setShowBreakHabitModal(false)}>
                            <Ionicons name="close" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalScroll}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Habit Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Smoking, Junk Food"
                                value={newBreakHabit.name}
                                onChangeText={(t) => setNewBreakHabit({ ...newBreakHabit, name: t })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Cost Per Day ($)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 5.50"
                                value={newBreakHabit.costPerDay}
                                onChangeText={(t) => setNewBreakHabit({ ...newBreakHabit, costPerDay: t })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.helperText}>How much you spend on this habit daily</Text>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Icon/Emoji</Text>
                            <View style={styles.iconSelector}>
                                {['🚭', '🍔', '🍺', '📱', '🎰', '☕', '🍬', '🚗'].map((icon) => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[styles.iconOption, newBreakHabit.icon === icon && styles.iconOptionSelected]}
                                        onPress={() => setNewBreakHabit({ ...newBreakHabit, icon })}
                                    >
                                        <Text style={styles.iconText}>{icon}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ef4444', marginTop: 20 }]} onPress={handleAddBreakHabit}>
                            <Text style={styles.modalButtonText}>Start Breaking This Habit</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    segmentedControl: {
        flexDirection: 'row',
        margin: 20,
        backgroundColor: '#e2e8f0',
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeSegment: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    activeSegmentText: {
        color: '#0f172a',
        fontWeight: '700',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    placeholderText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#94a3b8',
        fontSize: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    habitsSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    addHabitButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressBarContainer: {
        marginBottom: 20,
    },
    progressBarLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressBarText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 4,
    },
    habitsList: {
        gap: 16,
    },
    categorySection: {
        marginBottom: 8,
    },
    categoryTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    habitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    habitLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    habitCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    habitCheckboxCompleted: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    habitIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    habitInfo: {
        flex: 1,
    },
    habitName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    habitStreak: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    modalScroll: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        fontSize: 16,
        color: '#0f172a',
    },
    modalButton: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    categorySelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
    },
    categoryOptionSelected: {
        backgroundColor: '#2563eb',
    },
    categoryOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    categoryOptionTextSelected: {
        color: '#ffffff',
    },
    daysSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    dayOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayOptionSelected: {
        backgroundColor: '#3b82f6',
    },
    dayOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    dayOptionTextSelected: {
        color: '#ffffff',
    },
    breakCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    breakCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    breakIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    breakTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    freedomClockContainer: {
        backgroundColor: '#0f172a',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    freedomLabel: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    clockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    clockItem: {
        alignItems: 'center',
    },
    clockValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#ffffff',
        fontVariant: ['tabular-nums'],
    },
    clockUnit: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        marginTop: -2,
    },
    clockSeparator: {
        fontSize: 28,
        fontWeight: '300',
        color: '#475569',
        marginBottom: 12,
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#334155',
        borderRadius: 12,
        padding: 12,
    },
    impactItem: {
        flex: 1,
    },
    impactLabel: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    impactValue: {
        color: '#22c55e',
        fontSize: 18,
        fontWeight: '800',
    },
    emergencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    emergencyText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
    },
    relapseButton: {
        alignSelf: 'center',
    },
    relapseText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 16,
        marginBottom: 24,
    },
    addBreakHabitButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    addBreakHabitText: {
        color: '#ffffff',
        fontWeight: '700',
    },
    helperText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        fontStyle: 'italic',
    },
    iconSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    iconOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconOptionSelected: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
    },
    iconText: {
        fontSize: 20,
    },
});
