import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import {
    Dumbbell,
    Plus,
    Timer,
    Flame,
    Search,
    Trash2,
    Edit3,
    X,
    Play,
    Info
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── FIELD GUIDE ──────────────────────────────────────────────────────────────
// This form manages ONE video workout entry that contains ONE main exercise.
//
// WORKOUT-LEVEL (top section):  metadata shown on the browse/list card
//   • Workout Title       → displayed as the card title in the app
//   • Workout Description → shown under the title on the detail screen
//   • Thumbnail URL       → card image (R2 public URL)
//   • Video URL           → played when user taps the play button
//   • Duration            → shown in stats strip (minutes)
//   • Calories            → shown in stats strip
//   • Difficulty / Category / Equipment / Instructor / Premium toggle
//
// EXERCISE-LEVEL (bottom section): what the user sees inside the workout detail
//   • Exercise Name        → the actual move being performed
//   • Exercise Description → short cue shown under the exercise name
//   • Exercise Type        → Strength / Cardio / HIIT / Yoga / Stretching
//   • Instructions         → numbered steps (one per line)
//   • Primary Muscles      → comma-separated, e.g. "Abs, Core"
//   • Secondary Muscles    → comma-separated, e.g. "Lower Back"
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    // Workout-level
    title: '',
    description: '',
    thumbnail: '',
    videoUrl: '',
    duration: '30',
    calories: '300',
    difficulty: 'Beginner',
    category: 'Strength',
    equipment: '',
    instructor: '',
    isPremium: true,
    // Exercise-level
    exerciseName: '',
    exerciseDescription: '',
    exerciseType: 'Strength',
    instructions: '',
    primaryMuscles: '',
    secondaryMuscles: '',
};

const CATEGORIES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const EXERCISE_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Stretching'];

export default function WorkoutsManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const workouts = useQuery(api.videoWorkouts.list, { search });
    const createWorkout = useMutation(api.videoWorkouts.createWorkout);
    const updateWorkout = useMutation(api.videoWorkouts.updateWorkout);
    const deleteWorkout = useMutation(api.videoWorkouts.deleteWorkout);

    const setField = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    // ── Build payload ────────────────────────────────────────────────────────
    const buildPayload = () => {
        const equipmentArray = form.equipment
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);

        const exercises = form.exerciseName.trim()
            ? [{
                name: form.exerciseName.trim(),
                description: form.exerciseDescription.trim(),
                duration: parseFloat(form.duration) * 60, // convert minutes → seconds
                instructions: form.instructions
                    .split('\n')
                    .map(i => i.trim())
                    .filter(i => i.length > 0),
                primaryMuscles: form.primaryMuscles
                    .split(',')
                    .map(m => m.trim())
                    .filter(m => m.length > 0),
                secondaryMuscles: form.secondaryMuscles
                    .split(',')
                    .map(m => m.trim())
                    .filter(m => m.length > 0),
                exerciseType: form.exerciseType,
                reps: undefined,
                sets: undefined,
            }]
            : [];

        return {
            title: form.title.trim(),
            description: form.description.trim(),
            thumbnail: form.thumbnail.trim(),
            videoUrl: form.videoUrl.trim() || undefined,
            duration: parseFloat(form.duration) || 30,
            calories: parseFloat(form.calories) || 300,
            difficulty: form.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
            category: form.category,
            equipment: equipmentArray,
            instructor: form.instructor.trim() || 'Bluom Coach',
            isPremium: form.isPremium,
            exercises,
        };
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            Alert.alert('Error', 'Workout Title is required');
            return;
        }
        try {
            const payload = buildPayload();
            if (editingWorkout) {
                await updateWorkout({ id: editingWorkout._id, updates: payload });
            } else {
                await createWorkout(payload);
            }
            setIsModalOpen(false);
            setEditingWorkout(null);
            setForm({ ...EMPTY_FORM });
        } catch (error) {
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    const handleDelete = (id: any) => {
        Alert.alert('Delete Workout', 'Remove this video workout from the library?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout({ id }) }
        ]);
    };

    const openEdit = (w: any) => {
        const ex = w.exercises?.[0] ?? {};
        setEditingWorkout(w);
        setForm({
            title: w.title ?? '',
            description: w.description ?? '',
            thumbnail: w.thumbnail ?? '',
            videoUrl: w.videoUrl ?? '',
            duration: String(w.duration ?? 30),
            calories: String(w.calories ?? 300),
            difficulty: w.difficulty ?? 'Beginner',
            category: w.category ?? 'Strength',
            equipment: (w.equipment ?? []).join(', '),
            instructor: w.instructor ?? '',
            isPremium: w.isPremium ?? true,
            exerciseName: ex.name ?? '',
            exerciseDescription: ex.description ?? '',
            exerciseType: ex.exerciseType ?? 'Strength',
            instructions: (ex.instructions ?? []).join('\n'),
            primaryMuscles: (ex.primaryMuscles ?? []).join(', '),
            secondaryMuscles: (ex.secondaryMuscles ?? []).join(', '),
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingWorkout(null);
        setForm({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    // ── List item ────────────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.workoutCard}>
            <View style={styles.thumbnailPlaceholder}>
                <Play size={24} color="#2563eb" />
            </View>
            <View style={styles.workoutInfo}>
                <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.levelBadge, {
                        backgroundColor: item.difficulty === 'Advanced' ? '#fef2f2'
                            : item.difficulty === 'Intermediate' ? '#fffbeb' : '#f0fdf4'
                    }]}>
                        <Text style={[styles.levelText, {
                            color: item.difficulty === 'Advanced' ? '#ef4444'
                                : item.difficulty === 'Intermediate' ? '#f59e0b' : '#10b981'
                        }]}>{item.difficulty.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.instructorName}>
                    {item.instructor || 'Bluom Coach'} • {item.category}
                </Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Timer size={13} color="#64748b" />
                        <Text style={styles.statText}>{item.duration}m</Text>
                    </View>
                    <View style={styles.stat}>
                        <Flame size={13} color="#f59e0b" />
                        <Text style={styles.statText}>{item.calories} kcal</Text>
                    </View>
                    <View style={styles.stat}>
                        <Dumbbell size={13} color="#6366f1" />
                        <Text style={styles.statText}>{item.exercises?.length ?? 0} exercise(s)</Text>
                    </View>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Edit3 size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Pill selector helper ─────────────────────────────────────────────────
    const PillRow = ({ field, options }: { field: string; options: string[] }) => (
        <View style={styles.pillRow}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    onPress={() => setField(field, opt)}
                    style={[styles.pill, (form as any)[field] === opt && styles.pillActive]}
                >
                    <Text style={[styles.pillText, (form as any)[field] === opt && styles.pillTextActive]}>
                        {opt}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Video Workouts</Text>
                    <Text style={styles.subtitle}>Manage workout library</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={openNew}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>New Workout</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search library..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* List */}
            {!workouts ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={workouts}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 15 }}>No workouts yet</Text>
                        </View>
                    }
                />
            )}

            {/* Modal */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modal}>
                    {/* Modal header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingWorkout ? 'Edit Workout' : 'New Video Workout'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">

                        {/* ── SECTION 1: WORKOUT METADATA ─────────────────── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionEmoji}>📋</Text>
                            <View>
                                <Text style={styles.sectionTitle}>Workout Metadata</Text>
                                <Text style={styles.sectionHint}>Displayed on browse cards and detail screens</Text>
                            </View>
                        </View>

                        <Text style={styles.label}>Workout Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={form.title}
                            onChangeText={t => setField('title', t)}
                            placeholder="e.g. Ab Wheel Blast, Full Body HIIT"
                        />

                        <Text style={styles.label}>Workout Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            value={form.description}
                            onChangeText={t => setField('description', t)}
                            placeholder="What does this workout help with? What makes it special?"
                        />

                        <Text style={styles.label}>Thumbnail URL (R2)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.thumbnail}
                            onChangeText={t => setField('thumbnail', t)}
                            placeholder="https://pub-xxx.r2.dev/workouts/thumb.jpg"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Video URL (R2) — optional</Text>
                        <TextInput
                            style={styles.input}
                            value={form.videoUrl}
                            onChangeText={t => setField('videoUrl', t)}
                            placeholder="https://pub-xxx.r2.dev/workouts/video.mp4"
                            autoCapitalize="none"
                        />

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Duration (min)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={form.duration}
                                    onChangeText={t => setField('duration', t)}
                                />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Calories (est.)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={form.calories}
                                    onChangeText={t => setField('calories', t)}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Difficulty</Text>
                        <PillRow field="difficulty" options={LEVELS} />

                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.pillRow}>
                                {CATEGORIES.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => setField('category', c)}
                                        style={[styles.pill, form.category === c && styles.pillActive]}
                                    >
                                        <Text style={[styles.pillText, form.category === c && styles.pillTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Text style={styles.label}>Equipment (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.equipment}
                            onChangeText={t => setField('equipment', t)}
                            placeholder="e.g. Dumbbells, Yoga mat  (leave empty for bodyweight)"
                        />

                        <Text style={styles.label}>Instructor (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.instructor}
                            onChangeText={t => setField('instructor', t)}
                            placeholder="Leave empty → defaults to 'Bluom Coach'"
                        />

                        <View style={styles.premiumRow}>
                            <View>
                                <Text style={styles.label}>Premium Only</Text>
                                <Text style={styles.fieldHint}>Locks content behind Pro subscription</Text>
                            </View>
                            <TouchableOpacity onPress={() => setField('isPremium', !form.isPremium)}>
                                <View style={[styles.toggle, form.isPremium && styles.toggleOn]}>
                                    <View style={[styles.toggleCircle, form.isPremium && styles.toggleCircleOn]} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ── SECTION 2: EXERCISE DETAILS ──────────────────── */}
                        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                            <Text style={styles.sectionEmoji}>💪</Text>
                            <View>
                                <Text style={styles.sectionTitle}>Exercise Details</Text>
                                <Text style={styles.sectionHint}>Shown inside the workout — enables the Log button and muscle info</Text>
                            </View>
                        </View>

                        <View style={styles.infoBox}>
                            <Info size={14} color="#2563eb" />
                            <Text style={styles.infoText}>
                                Fill in Exercise Name at minimum. Without it, the app shows no exercise card or Log button.
                            </Text>
                        </View>

                        <Text style={styles.label}>Exercise Name</Text>
                        <TextInput
                            style={styles.input}
                            value={form.exerciseName}
                            onChangeText={t => setField('exerciseName', t)}
                            placeholder="e.g. Ab Wheel Rollout, Barbell Squat"
                        />

                        <Text style={styles.label}>Exercise Description</Text>
                        <TextInput
                            style={[styles.input, { height: 64 }]}
                            multiline
                            value={form.exerciseDescription}
                            onChangeText={t => setField('exerciseDescription', t)}
                            placeholder="Short cue shown beneath the exercise name"
                        />

                        <Text style={styles.label}>Exercise Type</Text>
                        <PillRow field="exerciseType" options={EXERCISE_TYPES} />

                        <Text style={styles.label}>Instructions — one step per line</Text>
                        <Text style={styles.fieldHint}>These appear as a numbered list inside the workout</Text>
                        <TextInput
                            style={[styles.input, { height: 130, marginTop: 6 }]}
                            multiline
                            value={form.instructions}
                            onChangeText={t => setField('instructions', t)}
                            placeholder={"Kneel and grip the wheel shoulder-width\nBrace core and exhale\nRoll forward until hips extend\nPull back slowly to start"}
                        />

                        <Text style={styles.label}>Primary Muscles (comma-separated)</Text>
                        <Text style={styles.fieldHint}>Main muscles targeted — shown highlighted in blue</Text>
                        <TextInput
                            style={[styles.input, { marginTop: 6 }]}
                            value={form.primaryMuscles}
                            onChangeText={t => setField('primaryMuscles', t)}
                            placeholder="e.g. Abs, Core, Obliques"
                        />

                        <Text style={styles.label}>Secondary Muscles (comma-separated)</Text>
                        <Text style={styles.fieldHint}>Supporting muscles — shown in lighter box</Text>
                        <TextInput
                            style={[styles.input, { marginTop: 6, marginBottom: 40 }]}
                            value={form.secondaryMuscles}
                            onChangeText={t => setField('secondaryMuscles', t)}
                            placeholder="e.g. Lower Back, Hip Flexors"
                        />

                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        margin: 16,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
    workoutCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    thumbnailPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutInfo: { flex: 1, marginLeft: 14 },
    workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    workoutTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
    levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
    levelText: { fontSize: 9, fontWeight: '900' },
    instructorName: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 6 },
    statsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    actions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
    actionBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },

    // Modal
    modal: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    saveBtn: { color: '#2563eb', fontWeight: '800', fontSize: 16 },
    form: { flex: 1, paddingHorizontal: 20 },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        marginTop: 24,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionEmoji: { fontSize: 22, marginTop: 1 },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
    sectionHint: { fontSize: 12, color: '#64748b', marginTop: 2 },

    // Info box
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        padding: 12,
        marginTop: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },

    // Fields
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 6,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldHint: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '600',
    },
    row: { flexDirection: 'row', gap: 14 },
    col: { flex: 1 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    pillTextActive: { color: '#ffffff' },
    premiumRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        padding: 14,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    toggle: { width: 48, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0', padding: 3 },
    toggleOn: { backgroundColor: '#2563eb' },
    toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' },
    toggleCircleOn: { marginLeft: 22 },
});