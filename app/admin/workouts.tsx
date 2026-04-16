import React, { useState, useMemo } from 'react';
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
    Alert,
    Switch,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
    Dumbbell,
    Plus,
    Flame,
    Search,
    Trash2,
    Edit3,
    X,
    Image as ImageIcon,
    Users,
    Tag,
    Filter,
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { R2_CONFIG } from '@/utils/r2Config';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXERCISE_TYPES = ['Strength', 'Powerlifting', 'Hypertrophy', 'Isolation', 'Compound', 'Unilateral', 'Cardio', 'Conditioning', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core', 'Women', 'Functional/Mobility', 'Warm-up/Activation', 'Post-workout Stretch', 'Calisthenics/Bodyweight', 'Plyometrics', 'Balance', 'Rehab', 'Posture', 'Stability', 'Anti-Extension'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const ALL_MUSCLE_GROUPS = [
    'Full Body', 'Upper Body', 'Lower Body',
    'Chest', 'Pectoralis Major', 'Pectoralis Minor', 'Upper Chest', 'Lower Chest',
    'Back', 'Upper Back', 'Mid Back', 'Lower Back', 'Latissimus Dorsi', 'Lats', 'Trapezius', 'Traps', 'Rhomboids', 'Erector Spinae', 'Teres Major', 'Teres Minor', 'Infraspinatus', 'Posterior Chain',
    'Shoulders', 'Anterior Deltoid', 'Lateral Deltoid', 'Posterior Deltoid', 'Rotator Cuff', 'Supraspinatus', 'Subscapularis',
    'Biceps', 'Short Head Biceps', 'Long Head Biceps', 'Triceps', 'Long Head Triceps', 'Lateral Head Triceps', 'Medial Head Triceps', 'Forearms', 'Brachialis',
    'Legs', 'Quads', 'Hamstrings', 'Calves', 'Tibialis Anterior',
    'Glutes', 'Gluteus Maximus', 'Gluteus Medius', 'Gluteus Minimus', 'Piriformis', 'Hip Flexors', 'Adductors', 'Abductors', 'Psoas',
    'Core', 'Abs', 'Obliques', 'Internal Obliques', 'External Obliques', 'Rectus Abdominis', 'Transverse Abdominis', 'Quadratus Lumborum', 'Pelvic Floor',
    'Neck', 'Serratus'
];

const EMPTY_FORM = {
    exerciseName: '',
    exerciseDescription: '',
    // Multi-select types — stored as array
    exerciseTypes: ['Strength'] as string[],
    instructions: '',
    primaryMuscles: '',
    secondaryMuscles: '',
    // Muscle group filter tags for workouts.tsx Browse by Muscle Group
    muscleGroupTags: [] as string[],
    equipment: '',
    optionalEquipment: '',
    difficulty: 'Beginner',
    // Universal fallback thumbnail
    thumbnail: '',
    // Gender-specific thumbnails (for browse cards)
    thumbnailMale: '',
    thumbnailFemale: '',
    // Universal fallback video
    videoUrl: '',
    // Gender-specific variants
    videoUrlMale: '',
    videoUrlFemale: '',
    hasGenderVariants: false,
};

// ─── Multi-select pill component ──────────────────────────────────────────────
function MultiPillPicker({
    label,
    options,
    selected,
    onChange,
    activeColor = '#2563eb',
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (v: string[]) => void;
    activeColor?: string;
}) {
    const toggle = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };
    return (
        <View>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.pillRow}>
                {options.map(opt => {
                    const active = selected.includes(opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            onPress={() => toggle(opt)}
                            style={[styles.pill, active && { backgroundColor: activeColor, borderColor: activeColor, borderWidth: 1 }]}
                        >
                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

// ─── Single-select pill row ───────────────────────────────────────────────────
function SinglePillRow({
    label,
    options,
    value,
    onChange,
    activeColor = '#7c3aed',
}: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
    activeColor?: string;
}) {
    return (
        <View>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.pillRow}>
                {options.map(opt => {
                    const active = value === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            onPress={() => onChange(opt)}
                            style={[styles.pill, active && { backgroundColor: activeColor, borderColor: activeColor, borderWidth: 1 }]}
                        >
                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

export default function WorkoutsManager() {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterLevel, setFilterLevel] = useState('All');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const allWorkouts = useQuery(api.videoWorkouts.list, { search });
    const workouts = useMemo(() => {
        if (!allWorkouts) return allWorkouts;
        return allWorkouts.filter((w: any) => {
            const typeOk = filterType === 'All' || w.category === filterType ||
                (w.categories ?? []).includes(filterType);
            const levelOk = filterLevel === 'All' || w.difficulty === filterLevel;
            return typeOk && levelOk;
        });
    }, [allWorkouts, filterType, filterLevel]);

    const createWorkout = useMutation(api.videoWorkouts.createWorkout);
    const updateWorkout = useMutation(api.videoWorkouts.updateWorkout);
    const deleteWorkout = useMutation(api.videoWorkouts.deleteWorkout);

    const setField = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    // ── Build payload ────────────────────────────────────────────────────────
    const buildPayload = () => {
        const types = form.exerciseTypes.length ? form.exerciseTypes : ['Strength'];
        const primaryCategory = types[0]; // backward-compat primary

        const equipmentArray = form.equipment
            .split(',').map(e => e.trim()).filter(e => e.length > 0);
        const optionalEquipmentArray = form.optionalEquipment
            .split(',').map(e => e.trim()).filter(e => e.length > 0);

        const exercises = form.exerciseName.trim()
            ? [{
                name: form.exerciseName.trim(),
                description: form.exerciseDescription.trim(),
                duration: 0,
                instructions: form.instructions
                    .split('\n').map(i => i.trim()).filter(i => i.length > 0),
                primaryMuscles: form.primaryMuscles
                    .split(',').map(m => m.trim()).filter(m => m.length > 0),
                secondaryMuscles: form.secondaryMuscles
                    .split(',').map(m => m.trim()).filter(m => m.length > 0),
                exerciseType: primaryCategory,
                exerciseTypes: types,
                reps: undefined,
                sets: undefined,
            }]
            : [];

        return {
            title: form.exerciseName.trim(),
            description: form.exerciseDescription.trim(),
            thumbnail: form.thumbnail.trim(),
            thumbnailMale: form.hasGenderVariants ? (form.thumbnailMale.trim() || undefined) : undefined,
            thumbnailFemale: form.hasGenderVariants ? (form.thumbnailFemale.trim() || undefined) : undefined,
            videoUrl: form.videoUrl.trim() || undefined,
            videoUrlMale: form.hasGenderVariants ? (form.videoUrlMale.trim() || undefined) : undefined,
            videoUrlFemale: form.hasGenderVariants ? (form.videoUrlFemale.trim() || undefined) : undefined,
            duration: 0,
            calories: 0,
            difficulty: form.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
            category: primaryCategory,
            categories: types,
            muscleGroupTags: form.muscleGroupTags,
            equipment: equipmentArray,
            optionalEquipment: optionalEquipmentArray.length > 0 ? optionalEquipmentArray : undefined,
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
        }
    };

    const handleDelete = async (id: any, title: string) => {
        // On web (admin panel) Alert.alert maps to window.confirm which is unreliable
        // with multiple buttons — use window.confirm directly on web.
        const confirmed = Platform.OS === 'web'
            ? (window as any).confirm(`Delete "${title}"?\n\nThis cannot be undone.`)
            : await new Promise<boolean>(resolve =>
                Alert.alert(
                    'Delete Exercise',
                    `Delete "${title}"? This cannot be undone.`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
                    ]
                )
            );
        if (!confirmed) return;
        try {
            await deleteWorkout({ id });
        } catch (err: any) {
            const msg = err?.message ?? 'Could not delete exercise';
            if (Platform.OS === 'web') {
                (window as any).alert('Delete failed: ' + msg);
            } else {
                Alert.alert('Delete failed', msg);
            }
        }
    };

    const openEdit = (w: any) => {
        const ex = w.exercises?.[0] ?? {};
        setEditingWorkout(w);
        setForm({
            exerciseName: ex.name ?? w.title ?? '',
            exerciseDescription: ex.description ?? w.description ?? '',
            exerciseTypes: w.categories ?? (ex.exerciseTypes ?? (ex.exerciseType ? [ex.exerciseType] : ['Strength'])),
            instructions: (ex.instructions ?? []).join('\n'),
            primaryMuscles: (ex.primaryMuscles ?? []).join(', '),
            secondaryMuscles: (ex.secondaryMuscles ?? []).join(', '),
            muscleGroupTags: w.muscleGroupTags ?? [],
            equipment: (w.equipment ?? []).join(', '),
            optionalEquipment: (w.optionalEquipment ?? []).join(', '),
            difficulty: w.difficulty ?? 'Beginner',
            thumbnail: w.thumbnail ?? '',
            thumbnailMale: w.thumbnailMale ?? '',
            thumbnailFemale: w.thumbnailFemale ?? '',
            videoUrl: w.videoUrl ?? '',
            videoUrlMale: w.videoUrlMale ?? '',
            videoUrlFemale: w.videoUrlFemale ?? '',
            hasGenderVariants: !!(w.videoUrlMale || w.videoUrlFemale || w.thumbnailMale || w.thumbnailFemale),
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
            {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.workoutThumb} contentFit="cover" transition={300} />
            ) : (
                <View style={[styles.workoutThumb, styles.thumbnailPlaceholder]}>
                    <ImageIcon size={22} color="#94a3b8" />
                </View>
            )}
            <View style={styles.workoutInfo}>
                <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        {(item.videoUrlMale || item.videoUrlFemale) && (
                            <View style={styles.genderBadge}>
                                <Users size={10} color="#8b5cf6" />
                                <Text style={styles.genderBadgeText}>♂♀</Text>
                            </View>
                        )}
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
                </View>
                <Text style={styles.instructorName} numberOfLines={1}>
                    {(item.categories ?? [item.category]).join(' · ')} {item.equipment?.length ? `• ${item.equipment.join(', ')}` : '• Bodyweight'}
                </Text>
                {(item.muscleGroupTags?.length > 0) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {item.muscleGroupTags.slice(0, 4).map((t: string) => (
                            <View key={t} style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{t}</Text>
                            </View>
                        ))}
                        {item.muscleGroupTags.length > 4 && (
                            <View style={styles.tagChip}>
                                <Text style={styles.tagChipText}>+{item.muscleGroupTags.length - 4}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Edit3 size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={styles.actionBtn}>
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Exercise Library</Text>
                    <Text style={styles.subtitle}>Manage exercises for workout plans</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={{ padding: 6 }}>
                        <Search size={20} color={showSearch ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ padding: 6 }}>
                        <Filter size={20} color={(filterType !== 'All' || filterLevel !== 'All' || showFilters) ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={openNew}>
                        <Plus color="#ffffff" size={20} />
                        <Text style={styles.addButtonText}>New</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            {showSearch && (
                <View style={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search library..."
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                    {(filterType !== 'All' || filterLevel !== 'All') && (
                        <TouchableOpacity onPress={() => { setFilterType('All'); setFilterLevel('All'); }}>
                            <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 12 }}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Filters Drawer */}
            {showFilters && (
                <View style={{ backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    {/* Type filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>TYPE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                            {['All', ...EXERCISE_TYPES].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.filterPill, filterType === t && styles.filterPillActive]}
                                    onPress={() => setFilterType(t)}
                                >
                                    <Text style={[styles.filterPillTxt, filterType === t && styles.filterPillTxtActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Difficulty filter */}
                    <View style={[styles.filterSection, { marginBottom: 8 }]}>
                        <Text style={styles.filterLabel}>DIFFICULTY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                            {['All', ...LEVELS].map(l => (
                                <TouchableOpacity
                                    key={l}
                                    style={[styles.filterPill, filterLevel === l && { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }]}
                                    onPress={() => setFilterLevel(l)}
                                >
                                    <Text style={[styles.filterPillTxt, filterLevel === l && styles.filterPillTxtActive]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            <Text style={{ paddingHorizontal: 24, paddingBottom: 8, fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
                {workouts ? `${workouts.length} results` : ''}
            </Text>

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

                        {/* Exercise Type — multi-select */}
                        <MultiPillPicker
                            label="Exercise Type (select all that apply)"
                            options={EXERCISE_TYPES}
                            selected={form.exerciseTypes}
                            onChange={v => setField('exerciseTypes', v)}
                            activeColor="#2563eb"
                        />
                        {form.exerciseTypes.length > 1 && (
                            <Text style={styles.fieldHint}>
                                Primary: {form.exerciseTypes[0]} — tap to reorder (first selected = primary category)
                            </Text>
                        )}

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

                        {/* Muscle Group Tags — for the Browse by Muscle Group filter cards */}
                        <View style={styles.sectionSeparator}>
                            <Tag size={14} color="#64748b" />
                            <Text style={styles.sectionSeparatorText}>MUSCLE GROUP FILTER TAGS</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                            These tag this exercise to the Browse by Muscle Group cards in the Workouts tab.
                        </Text>
                        <MultiPillPicker
                            label=""
                            options={ALL_MUSCLE_GROUPS}
                            selected={form.muscleGroupTags}
                            onChange={v => setField('muscleGroupTags', v)}
                            activeColor="#10b981"
                        />

                        {/* Equipment */}
                        <Text style={styles.label}>Required Equipment (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.equipment}
                            onChangeText={t => setField('equipment', t)}
                            placeholder="e.g. Hyperextension bench, Roman chair"
                        />
                        <Text style={styles.label}>Optional / Alternative Equipment (comma-separated)</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, marginTop: -4 }}>
                            Items listed here appear as "or:" alternatives in the app
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={form.optionalEquipment}
                            onChangeText={t => setField('optionalEquipment', t)}
                            placeholder="e.g. Body weight, Dumbbell, Weight plate"
                        />

                        {/* Difficulty */}
                        <SinglePillRow
                            label="Difficulty"
                            options={LEVELS}
                            value={form.difficulty}
                            onChange={v => setField('difficulty', v)}
                            activeColor="#7c3aed"
                        />

                        {/* Thumbnail URL */}
                        <Text style={styles.label}>Thumbnail URL — Fallback / Unisex (R2)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.thumbnail}
                            onChangeText={t => setField('thumbnail', t)}
                            placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/thumb.jpg (or .gif)`}
                            autoCapitalize="none"
                        />
                        {!!form.thumbnail && (
                            <Image source={{ uri: form.thumbnail }} style={styles.thumbPreview} contentFit="cover" />
                        )}

                        {/* ── Gender Thumbnails & Videos — always visible ── */}
                        <View style={styles.sectionSeparator}>
                            <Users size={14} color="#8b5cf6" />
                            <Text style={[styles.sectionSeparatorText, { color: '#8b5cf6' }]}>THUMBNAILS &amp; VIDEOS BY GENDER</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                            Enable the toggle to upload separate ♂ Male and ♀ Female thumbnails and videos.
                            The app picks the right version based on the user's profile. Leave blank to use the fallback above.
                        </Text>

                        {/* Gender variants toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>Has gender variants (♂ / ♀)</Text>
                            </View>
                            <Switch
                                value={form.hasGenderVariants}
                                onValueChange={v => setField('hasGenderVariants', v)}
                                trackColor={{ true: '#8b5cf6' }}
                            />
                        </View>

                        {/* ── Male block — always shown so the fields are visible ── */}
                        <View style={[styles.genderVideoRow, { marginTop: 10 }]}>
                            <View style={{ flex: 1, backgroundColor: form.hasGenderVariants ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: form.hasGenderVariants ? '#bfdbfe' : '#e2e8f0' }}>
                                <Text style={[styles.label, { marginTop: 0, color: form.hasGenderVariants ? '#2563eb' : '#94a3b8' }]}>♂ Male Thumbnail (R2)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.thumbnailMale}
                                    onChangeText={t => setField('thumbnailMale', t)}
                                    placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/squat-male-thumb.jpg`}
                                    autoCapitalize="none"
                                    editable={form.hasGenderVariants}
                                />
                                {!!form.thumbnailMale && (
                                    <Image source={{ uri: form.thumbnailMale }} style={[styles.thumbPreview, { height: 80 }]} contentFit="cover" />
                                )}
                                <Text style={[styles.label, { marginTop: 4, color: form.hasGenderVariants ? '#2563eb' : '#94a3b8' }]}>♂ Male Video URL (R2)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.videoUrlMale}
                                    onChangeText={t => setField('videoUrlMale', t)}
                                    placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/squat-male.mp4`}
                                    autoCapitalize="none"
                                    editable={form.hasGenderVariants}
                                />
                            </View>
                        </View>

                        {/* ── Female block ── */}
                        <View style={[styles.genderVideoRow, { marginTop: 10 }]}>
                            <View style={{ flex: 1, backgroundColor: form.hasGenderVariants ? '#fdf4ff' : '#f8fafc', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: form.hasGenderVariants ? '#e9d5ff' : '#e2e8f0' }}>
                                <Text style={[styles.label, { marginTop: 0, color: form.hasGenderVariants ? '#9333ea' : '#94a3b8' }]}>♀ Female Thumbnail (R2)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.thumbnailFemale}
                                    onChangeText={t => setField('thumbnailFemale', t)}
                                    placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/squat-female-thumb.jpg`}
                                    autoCapitalize="none"
                                    editable={form.hasGenderVariants}
                                />
                                {!!form.thumbnailFemale && (
                                    <Image source={{ uri: form.thumbnailFemale }} style={[styles.thumbPreview, { height: 80 }]} contentFit="cover" />
                                )}
                                <Text style={[styles.label, { marginTop: 4, color: form.hasGenderVariants ? '#9333ea' : '#94a3b8' }]}>♀ Female Video URL (R2)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.videoUrlFemale}
                                    onChangeText={t => setField('videoUrlFemale', t)}
                                    placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/squat-female.mp4`}
                                    autoCapitalize="none"
                                    editable={form.hasGenderVariants}
                                />
                            </View>
                        </View>

                        {/* Unisex video fallback */}
                        <Text style={[styles.label, { marginTop: 16 }]}>Fallback / Unisex Video URL (R2)</Text>
                        <Text style={styles.fieldHint}>Shown when no gender variant exists or as default.</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 60 }]}
                            value={form.videoUrl}
                            onChangeText={t => setField('videoUrl', t)}
                            placeholder={`${R2_CONFIG.workoutBaseUrl}/workouts/video.mp4 (or .gif)`}
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
    workoutThumb: { width: 72, height: 72, borderRadius: 12 },
    thumbnailPlaceholder: {
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    workoutInfo: { flex: 1, marginLeft: 14 },
    workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    workoutTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
    levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
    levelText: { fontSize: 9, fontWeight: '900' },
    genderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
    },
    genderBadgeText: { fontSize: 9, fontWeight: '900', color: '#8b5cf6' },
    instructorName: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
    tagChip: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    tagChipText: { fontSize: 10, fontWeight: '700', color: '#10b981' },
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
    fieldHint: { fontSize: 11, color: '#94a3b8', marginBottom: 2, marginTop: 2 },
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
    thumbPreview: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginTop: 8,
        backgroundColor: '#f1f5f9',
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pillActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    pillTextActive: { color: '#ffffff' },

    // Section separators
    sectionSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 24,
        marginBottom: 4,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    sectionSeparatorText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Gender video
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        padding: 14,
        backgroundColor: '#faf5ff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    toggleLabel: { fontSize: 14, fontWeight: '700', color: '#6b21a8', marginBottom: 2 },
    genderVideoRow: { marginTop: 6 },

    // List filters
    filterSection: { marginBottom: 4 },
    filterLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, paddingHorizontal: 16 },
    filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingRight: 32 },
    filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    filterPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    filterPillTxtActive: { color: '#ffffff' },
});
