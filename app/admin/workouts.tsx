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
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── FIELD GUIDE ──────────────────────────────────────────────────────────────
// Unified form — each entry is ONE exercise that doubles as its own workout card.
//
//   Exercise Name        → displayed as card title + exercise name
//   Exercise Description → shown on the detail screen
//   Exercise Type        → Strength / Cardio / HIIT / Yoga / Stretching
//   Instructions         → numbered steps (one per line)
//   Primary Muscles      → comma-separated
//   Secondary Muscles    → comma-separated
//   Equipment            → comma-separated
//   Difficulty           → Beginner / Intermediate / Advanced
//   Thumbnail URL (R2)   → card image
//   Video URL (R2)       → optional, played on the detail screen
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    exerciseName: '',
    exerciseDescription: '',
    exerciseType: 'Strength',
    instructions: '',
    primaryMuscles: '',
    secondaryMuscles: '',
    equipment: '',
    difficulty: 'Beginner',
    thumbnail: '',
    videoUrl: '',
};

const EXERCISE_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Stretching'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

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
    // Maps the unified form into the backend schema which keeps workout + exercise
    // as separate levels.
    const buildPayload = () => {
        const equipmentArray = form.equipment
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);

        const exercises = form.exerciseName.trim()
            ? [{
                name: form.exerciseName.trim(),
                description: form.exerciseDescription.trim(),
                duration: 0,
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
            title: form.exerciseName.trim(),          // exercise name = workout title
            description: form.exerciseDescription.trim(),
            thumbnail: form.thumbnail.trim(),
            videoUrl: form.videoUrl.trim() || undefined,
            duration: 0,
            calories: 0,
            difficulty: form.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
            category: form.exerciseType,              // exercise type = category
            equipment: equipmentArray,
            instructor: 'Bluom Coach',
            isPremium: true,
            exercises,
        };
    };

    const handleSave = async () => {
        if (!form.exerciseName.trim()) {
            Alert.alert('Error', 'Exercise Name is required');
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
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Failed to save exercise');
            console.error('Save error:', error);
        }
    };

    const handleDelete = (id: any) => {
        Alert.alert('Delete Exercise', 'Remove this exercise from the library?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout({ id }) }
        ]);
    };

    const openEdit = (w: any) => {
        const ex = w.exercises?.[0] ?? {};
        setEditingWorkout(w);
        setForm({
            exerciseName: ex.name ?? w.title ?? '',
            exerciseDescription: ex.description ?? w.description ?? '',
            exerciseType: ex.exerciseType ?? w.category ?? 'Strength',
            instructions: (ex.instructions ?? []).join('\n'),
            primaryMuscles: (ex.primaryMuscles ?? []).join(', '),
            secondaryMuscles: (ex.secondaryMuscles ?? []).join(', '),
            equipment: (w.equipment ?? []).join(', '),
            difficulty: w.difficulty ?? 'Beginner',
            thumbnail: w.thumbnail ?? '',
            videoUrl: w.videoUrl ?? '',
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
                        }]}>{item.difficulty?.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.instructorName} numberOfLines={1}>
                    {item.category} • {(item.equipment ?? []).join(', ') || 'Bodyweight'}
                </Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Dumbbell size={13} color="#6366f1" />
                        <Text style={styles.statText}>
                            {item.exercises?.[0]?.primaryMuscles?.join(', ') || '—'}
                        </Text>
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
                    <Text style={styles.title}>Exercise Library</Text>
                    <Text style={styles.subtitle}>Manage exercises for workout plans</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={openNew}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>New Exercise</Text>
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
                            <Text style={{ color: '#94a3b8', fontSize: 15 }}>No exercises yet</Text>
                        </View>
                    }
                />
            )}

            {/* ── Modal ──────────────────────────────────────────────────────── */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modal}>
                    {/* Modal header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingWorkout ? 'Edit Exercise' : 'New Exercise'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">

                        {/* Exercise Name */}
                        <Text style={styles.label}>Exercise Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={form.exerciseName}
                            onChangeText={t => setField('exerciseName', t)}
                            placeholder="e.g. Ab Wheel Rollout, Barbell Squat"
                        />

                        {/* Exercise Description */}
                        <Text style={styles.label}>Exercise Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            value={form.exerciseDescription}
                            onChangeText={t => setField('exerciseDescription', t)}
                            placeholder="What does this exercise target? Brief description."
                        />

                        {/* Exercise Type */}
                        <Text style={styles.label}>Exercise Type</Text>
                        <PillRow field="exerciseType" options={EXERCISE_TYPES} />

                        {/* Instructions */}
                        <Text style={styles.label}>Instructions — one step per line</Text>
                        <Text style={styles.fieldHint}>These appear as a numbered list in the app</Text>
                        <TextInput
                            style={[styles.input, { height: 130, marginTop: 6 }]}
                            multiline
                            value={form.instructions}
                            onChangeText={t => setField('instructions', t)}
                            placeholder={"Kneel and grip the wheel shoulder-width\nBrace core and exhale\nRoll forward until hips extend\nPull back slowly to start"}
                        />

                        {/* Primary Muscles */}
                        <Text style={styles.label}>Primary Muscles (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.primaryMuscles}
                            onChangeText={t => setField('primaryMuscles', t)}
                            placeholder="e.g. Abs, Core, Obliques"
                        />

                        {/* Secondary Muscles */}
                        <Text style={styles.label}>Secondary Muscles (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.secondaryMuscles}
                            onChangeText={t => setField('secondaryMuscles', t)}
                            placeholder="e.g. Lower Back, Hip Flexors"
                        />

                        {/* Equipment */}
                        <Text style={styles.label}>Equipment (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.equipment}
                            onChangeText={t => setField('equipment', t)}
                            placeholder="e.g. Dumbbells, Yoga mat  (leave empty for bodyweight)"
                        />

                        {/* Difficulty */}
                        <Text style={styles.label}>Difficulty</Text>
                        <PillRow field="difficulty" options={LEVELS} />

                        {/* Thumbnail URL */}
                        <Text style={styles.label}>Thumbnail URL (R2)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.thumbnail}
                            onChangeText={t => setField('thumbnail', t)}
                            placeholder="https://pub-xxx.r2.dev/workouts/thumb.jpg"
                            autoCapitalize="none"
                        />

                        {/* Video URL */}
                        <Text style={styles.label}>Video URL (R2) — optional</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 60 }]}
                            value={form.videoUrl}
                            onChangeText={t => setField('videoUrl', t)}
                            placeholder="https://pub-xxx.r2.dev/workouts/video.mp4"
                            autoCapitalize="none"
                        />

                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F4F0' },
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
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    pillTextActive: { color: '#ffffff' },
});