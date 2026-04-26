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
import { useTranslation } from 'react-i18next';
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
const EXERCISE_TYPES = ['Strength', 'Powerlifting', 'Hypertrophy', 'Isolation', 'Compound', 'Unilateral', 'Cardio', 'Conditioning', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core', 'Women', 'Functional/Mobility', 'Warm-up/Activation', 'Post-workout Stretch', 'Calisthenics/Bodyweight', 'Plyometrics', 'Balance', 'Proprioception', 'Rehab', 'Prehab', 'Posture', 'Stability', 'Anti-Extension', 'Anti-Lateral Flexion', 'Hip Hinge'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const ALL_MUSCLE_GROUPS = [
    'Full Body', 'Upper Body', 'Lower Body',
    'Chest', 'Pectoralis Major', 'Pectoralis Minor', 'Upper Chest', 'Lower Chest',
    'Back', 'Upper Back', 'Mid Back', 'Lower Back', 'Latissimus Dorsi', 'Lats', 'Trapezius', 'Traps', 'Rhomboids', 'Erector Spinae', 'Teres Major', 'Teres Minor', 'Infraspinatus', 'Posterior Chain',
    'Shoulders', 'Anterior Deltoid', 'Lateral Deltoid', 'Posterior Deltoid', 'Rotator Cuff', 'Supraspinatus', 'Subscapularis',
    'Biceps', 'Short Head Biceps', 'Long Head Biceps', 'Triceps', 'Long Head Triceps', 'Lateral Head Triceps', 'Medial Head Triceps', 'Forearms', 'Brachialis',
    'Legs', 'Quads', 'Hamstrings', 'Calves', 'Gastrocnemius', 'Soleus', 'Tibialis Anterior', 'Tibialis Posterior', 'Shin', 'Ankle', 'Extensor Digitorum Longus', 'Extensor Hallucis Longus', 'Peroneals', 'Plantar Fascia',
    'Glutes', 'Gluteus Maximus', 'Gluteus Medius', 'Gluteus Minimus', 'Piriformis', 'Hip Flexors', 'Adductors', 'Abductors', 'Psoas',
    'Core', 'Abs', 'Obliques', 'Internal Obliques', 'External Obliques', 'Rectus Abdominis', 'Transverse Abdominis', 'Quadratus Lumborum', 'Pelvic Floor',
    'Neck', 'Serratus'
];

const EMPTY_FORM = {
    exerciseName: '',
    title_pt: '', title_es: '', title_fr: '', title_de: '', title_nl: '',
    exerciseDescription: '',
    desc_pt: '', desc_es: '', desc_fr: '', desc_de: '', desc_nl: '',
    // Multi-select types — stored as array
    exerciseTypes: ['Strength'] as string[],
    instructions: '',
    instr_pt: '', instr_es: '', instr_fr: '', instr_de: '', instr_nl: '',
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

// ─── Dropdown Field Component  ────────────────────────────────────────────────
function DropdownField({
    label,
    options,
    selected,
    onChange,
    multi = false,
    placeholder = 'Select...'
}: {
    label?: string;
    options: string[];
    selected: any;
    onChange: (v: any) => void;
    multi?: boolean;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const currentSelected = selected || (multi ? [] : '');
    
    let text = placeholder;
    if (multi && currentSelected.length > 0) {
        text = currentSelected.join(', ');
    } else if (!multi && currentSelected && currentSelected !== 'All') {
        text = currentSelected;
    } else if (!multi && currentSelected === 'All') {
        text = 'All';
    }

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options;
        return options.filter((o: string) => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [options, searchQuery]);

    return (
        <View style={multi ? { marginBottom: 12 } : undefined}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 46 }]} onPress={() => { setOpen(true); setSearchQuery(''); }}>
                <Text style={{ color: (multi ? currentSelected.length === 0 : !currentSelected) ? '#94a3b8' : '#1e293b', flex: 1 }} numberOfLines={1}>
                    {text}
                </Text>
                <Text style={{ color: '#64748b', marginLeft: 8, fontSize: 10 }}>▼</Text>
            </TouchableOpacity>

            <Modal visible={open} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                             <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{label || placeholder}</Text>
                             <TouchableOpacity onPress={() => setOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                         </View>
                         {options.length > 10 && (
                            <TextInput 
                                style={[styles.input, { marginBottom: 16 }]}
                                placeholder="Search..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                         )}
                         <FlatList 
                             data={filteredOptions}
                             keyExtractor={i => i}
                             keyboardShouldPersistTaps="handled"
                             renderItem={({item}) => {
                                 const isActive = multi ? currentSelected.includes(item) : currentSelected === item;
                                 return (
                                     <TouchableOpacity 
                                         style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                         onPress={() => {
                                            if (multi) {
                                                if (isActive) onChange(currentSelected.filter((s: string) => s !== item));
                                                else onChange([...currentSelected, item]);
                                            } else {
                                                onChange(item);
                                                setOpen(false);
                                            }
                                         }}
                                     >
                                         <Text style={{ fontSize: 16, color: isActive ? '#2563eb' : '#1e293b', fontWeight: isActive ? '700' : '500' }}>{item}</Text>
                                         {isActive && <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 18 }}>✓</Text>}
                                     </TouchableOpacity>
                                 );
                             }}
                             ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>No results found</Text>}
                         />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default function WorkoutsManager() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterLevel, setFilterLevel] = useState('All');
    const [filterMuscle, setFilterMuscle] = useState('All');
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
            const muscleOk = filterMuscle === 'All' || (w.muscleGroupTags ?? []).includes(filterMuscle);
            return typeOk && levelOk && muscleOk;
        });
    }, [allWorkouts, filterType, filterLevel, filterMuscle]);

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

        const buildLocalizations = (pt: string, es: string, fr: string, de: string, nl: string) => {
            const obj: Record<string, string> = {};
            if (pt.trim()) obj.pt = pt.trim();
            if (es.trim()) obj.es = es.trim();
            if (fr.trim()) obj.fr = fr.trim();
            if (de.trim()) obj.de = de.trim();
            if (nl.trim()) obj.nl = nl.trim();
            return Object.keys(obj).length > 0 ? obj : undefined;
        };

        const parseLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

        const buildListLocalizations = (pt: string, es: string, fr: string, de: string, nl: string) => {
            const obj: Record<string, string[]> = {};
            if (pt.trim()) obj.pt = parseLines(pt);
            if (es.trim()) obj.es = parseLines(es);
            if (fr.trim()) obj.fr = parseLines(fr);
            if (de.trim()) obj.de = parseLines(de);
            if (nl.trim()) obj.nl = parseLines(nl);
            return Object.keys(obj).length > 0 ? obj : undefined;
        };

        const exercises = form.exerciseName.trim()
            ? [{
                name: form.exerciseName.trim(),
                description: form.exerciseDescription.trim(),
                duration: 0,
                instructions: form.instructions
                    .split('\n').map(i => i.trim()).filter(i => i.length > 0),
                instructionsLocalizations: buildListLocalizations(form.instr_pt, form.instr_es, form.instr_fr, form.instr_de, form.instr_nl),
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
            titleLocalizations: buildLocalizations(form.title_pt, form.title_es, form.title_fr, form.title_de, form.title_nl),
            description: form.exerciseDescription.trim(),
            descriptionLocalizations: buildLocalizations(form.desc_pt, form.desc_es, form.desc_fr, form.desc_de, form.desc_nl),
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
            Alert.alert(t('common.error', 'Error'), t('admin.errorRequiredName', 'Exercise Name is required'));
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
            Alert.alert(t('common.error', 'Error'), error?.message ?? t('admin.errorSave', 'Failed to save exercise'));
        }
    };

    const handleDelete = async (id: any, title: string) => {
        // On web (admin panel) Alert.alert maps to window.confirm which is unreliable
        // with multiple buttons — use window.confirm directly on web.
        const confirmed = Platform.OS === 'web'
            ? (window as any).confirm(t('admin.deleteConfirm', 'Delete "{{title}}"? This cannot be undone.', { title }))
            : await new Promise<boolean>(resolve =>
                Alert.alert(
                    t('admin.deleteTitle', 'Delete Exercise'),
                    t('admin.deleteConfirm', 'Delete "{{title}}"? This cannot be undone.', { title }),
                    [
                        { text: t('common.cancel', 'Cancel'), style: 'cancel', onPress: () => resolve(false) },
                        { text: t('admin.delete', 'Delete'), style: 'destructive', onPress: () => resolve(true) },
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
        const tl = w.titleLocalizations || {};
        const dl = w.descriptionLocalizations || {};
        setEditingWorkout(w);
        setForm({
            exerciseName: ex.name ?? w.title ?? '',
            title_pt: tl.pt || '', title_es: tl.es || '', title_fr: tl.fr || '', title_de: tl.de || '', title_nl: tl.nl || '',
            exerciseDescription: ex.description ?? w.description ?? '',
            desc_pt: dl.pt || '', desc_es: dl.es || '', desc_fr: dl.fr || '', desc_de: dl.de || '', desc_nl: dl.nl || '',
            exerciseTypes: w.categories ?? (ex.exerciseTypes ?? (ex.exerciseType ? [ex.exerciseType] : ['Strength'])),
            instructions: (ex.instructions ?? []).join('\n'),
            instr_pt: (ex.instructionsLocalizations?.pt ?? []).join('\n'),
            instr_es: (ex.instructionsLocalizations?.es ?? []).join('\n'),
            instr_fr: (ex.instructionsLocalizations?.fr ?? []).join('\n'),
            instr_de: (ex.instructionsLocalizations?.de ?? []).join('\n'),
            instr_nl: (ex.instructionsLocalizations?.nl ?? []).join('\n'),
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
                    <Text style={styles.workoutTitle} numberOfLines={1}>{t(`db.${item.title?.replace(/\s+/g, '')}`, item.title) as string}</Text>
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
                            }]}>{(t(`admin.${item.difficulty?.toLowerCase()}`, item.difficulty) as string).toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
                <Text style={styles.instructorName} numberOfLines={1}>
                    {(item.categories ?? [item.category]).map((c: string) => t(`admin.${c.replace(/[\s/]/g, '').toLowerCase()}`, c) as string).join(' · ')} {item.equipment?.length ? `• ${item.equipment.map((e: string) => t(`db.${e.replace(/\s+/g, '')}`, e) as string).join(', ')}` : `• ${t('admin.calisthenicsBodyweight', 'Bodyweight') as string}`}
                </Text>
                {(item.muscleGroupTags?.length > 0) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                        {item.muscleGroupTags.slice(0, 4).map((mt: string) => (
                            <View key={mt} style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{t(`admin.${mt.replace(/[\s/]/g, '').toLowerCase()}`, mt) as string}</Text>
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
                    <Text style={styles.title}>{t('admin.library', 'Exercise Library')}</Text>
                    <Text style={styles.subtitle}>{t('admin.manageExercises', 'Manage exercises for workout plans')}</Text>
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
                        <Text style={styles.addButtonText}>{t('admin.new', 'New')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            {showSearch && (
                <View style={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('admin.searchLibrary', 'Search library...')}
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                    {(filterType !== 'All' || filterLevel !== 'All' || filterMuscle !== 'All') && (
                        <TouchableOpacity onPress={() => { setFilterType('All'); setFilterLevel('All'); setFilterMuscle('All'); }}>
                            <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 12 }}>{t('admin.reset', 'Reset')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Filters Drawer */}
            {showFilters && (
                <View style={{ backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: '30%', marginBottom: 8 }}>
                        <DropdownField 
                            label={t('admin.type', 'TYPE')}
                            options={['All', ...EXERCISE_TYPES]}
                            selected={filterType}
                            onChange={setFilterType}
                            multi={false}
                        />
                    </View>
                    <View style={{ flex: 1, minWidth: '30%', marginBottom: 8 }}>
                        <DropdownField 
                            label={t('admin.difficulty', 'DIFFICULTY')}
                            options={['All', ...LEVELS]}
                            selected={filterLevel}
                            onChange={setFilterLevel}
                            multi={false}
                        />
                    </View>
                    <View style={{ width: '100%' }}>
                        <DropdownField 
                            label={t('admin.muscleGroup', 'MUSCLE GROUP')}
                            options={['All', ...ALL_MUSCLE_GROUPS]}
                            selected={filterMuscle}
                            onChange={setFilterMuscle}
                            multi={false}
                        />
                    </View>
                </View>
            )}

            <Text style={{ paddingHorizontal: 24, paddingBottom: 8, fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
                {workouts ? `${workouts.length} ${t('admin.results', 'results')}` : ''}
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
                            <Text style={{ color: '#94a3b8', fontSize: 15 }}>{t('admin.noExercisesYet', 'No exercises yet')}</Text>
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
                            {editingWorkout ? t('admin.editExercise', 'Edit Exercise') : t('admin.newExercise', 'New Exercise')}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>{t('admin.save', 'Save')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">

                        {/* Exercise Name */}
                        <Text style={styles.label}>{t('admin.exerciseName', 'Exercise Name *')} (EN)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.exerciseName}
                            onChangeText={t => setField('exerciseName', t)}
                            placeholder={t('admin.exerciseNamePlaceholder', 'e.g. Ab Wheel Rollout, Barbell Squat')}
                        />
                        <Text style={styles.label}>Name (PT)</Text>
                        <TextInput style={styles.input} placeholder="ex. Rolo Abdominal" value={form.title_pt} onChangeText={v => setField('title_pt', v)} />
                        <Text style={styles.label}>Name (ES)</Text>
                        <TextInput style={styles.input} placeholder="ej. Rodillo Abdominal" value={form.title_es} onChangeText={v => setField('title_es', v)} />
                        <Text style={styles.label}>Name (FR)</Text>
                        <TextInput style={styles.input} placeholder="ex. Rouleau Abdominal" value={form.title_fr} onChangeText={v => setField('title_fr', v)} />
                        <Text style={styles.label}>Name (DE)</Text>
                        <TextInput style={styles.input} placeholder="z.B. Bauchroller" value={form.title_de} onChangeText={v => setField('title_de', v)} />
                        <Text style={styles.label}>Name (NL)</Text>
                        <TextInput style={styles.input} placeholder="bijv. Buikrol" value={form.title_nl} onChangeText={v => setField('title_nl', v)} />

                        {/* Exercise Description */}
                        <Text style={styles.label}>{t('admin.exerciseDescription', 'Exercise Description')} (EN)</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            value={form.exerciseDescription}
                            onChangeText={t => setField('exerciseDescription', t)}
                            placeholder={t('admin.exerciseDescriptionPlaceholder', 'What does this exercise target? Brief description.')}
                        />
                        <Text style={styles.label}>Description (PT)</Text>
                        <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Descrição em português..." value={form.desc_pt} onChangeText={v => setField('desc_pt', v)} />
                        <Text style={styles.label}>Description (ES)</Text>
                        <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Descripción en español..." value={form.desc_es} onChangeText={v => setField('desc_es', v)} />
                        <Text style={styles.label}>Description (FR)</Text>
                        <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Description en français..." value={form.desc_fr} onChangeText={v => setField('desc_fr', v)} />
                        <Text style={styles.label}>Description (DE)</Text>
                        <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Beschreibung auf Deutsch..." value={form.desc_de} onChangeText={v => setField('desc_de', v)} />
                        <Text style={styles.label}>Description (NL)</Text>
                        <TextInput style={[styles.input, { height: 70 }]} multiline placeholder="Beschrijving in het Nederlands..." value={form.desc_nl} onChangeText={v => setField('desc_nl', v)} />

                        {/* Exercise Type — multi-select */}
                        <DropdownField
                            label={t('admin.exerciseTypeLabel', 'Exercise Type (select all that apply)')}
                            options={EXERCISE_TYPES}
                            selected={form.exerciseTypes}
                            onChange={(v: string[]) => setField('exerciseTypes', v)}
                            multi={true}
                        />
                        {form.exerciseTypes.length > 1 && (
                            <Text style={styles.fieldHint}>
                                Primary: {form.exerciseTypes[0]} — tap to reorder (first selected = primary category)
                            </Text>
                        )}

                        {/* Instructions */}
                        <Text style={styles.label}>{t('admin.instructionsLabel', 'Instructions — one step per line')} (EN)</Text>
                        <Text style={styles.fieldHint}>{t('admin.instructionsHint', 'These appear as a numbered list in the app')}</Text>
                        <TextInput
                            style={[styles.input, { height: 130, marginTop: 6 }]}
                            multiline
                            value={form.instructions}
                            onChangeText={t => setField('instructions', t)}
                            placeholder={t('admin.instructionsPlaceholder', "Kneel and grip the wheel shoulder-width\nBrace core and exhale\nRoll forward until hips extend\nPull back slowly to start")}
                        />
                        <Text style={styles.label}>Instructions (PT)</Text>
                        <TextInput style={[styles.input, { height: 110 }]} multiline value={form.instr_pt} onChangeText={v => setField('instr_pt', v)} placeholder={"Ajoelhe e segure o volante...\nContraia o core...\n..."} />
                        <Text style={styles.label}>Instructions (ES)</Text>
                        <TextInput style={[styles.input, { height: 110 }]} multiline value={form.instr_es} onChangeText={v => setField('instr_es', v)} placeholder={"Arrodíllate y sujeta la rueda...\nContraer el core...\n..."} />
                        <Text style={styles.label}>Instructions (FR)</Text>
                        <TextInput style={[styles.input, { height: 110 }]} multiline value={form.instr_fr} onChangeText={v => setField('instr_fr', v)} placeholder={"Agenouillez-vous et saisissez la roue...\nContracter le core...\n..."} />
                        <Text style={styles.label}>Instructions (DE)</Text>
                        <TextInput style={[styles.input, { height: 110 }]} multiline value={form.instr_de} onChangeText={v => setField('instr_de', v)} placeholder={"Knien Sie und greifen Sie das Rad...\nCore anspannen...\n..."} />
                        <Text style={styles.label}>Instructions (NL)</Text>
                        <TextInput style={[styles.input, { height: 110 }]} multiline value={form.instr_nl} onChangeText={v => setField('instr_nl', v)} placeholder={"Kniel neer en grijp het wiel...\nCore aanspannen...\n..."} />

                        {/* Primary Muscles */}
                        <Text style={styles.label}>{t('admin.primaryMuscles', 'Primary Muscles (comma-separated)')}</Text>
                        <TextInput
                            style={styles.input}
                            value={form.primaryMuscles}
                            onChangeText={t => setField('primaryMuscles', t)}
                            placeholder="e.g. Abs, Core, Obliques"
                        />

                        {/* Secondary Muscles */}
                        <Text style={styles.label}>{t('admin.secondaryMuscles', 'Secondary Muscles (comma-separated)')}</Text>
                        <TextInput
                            style={styles.input}
                            value={form.secondaryMuscles}
                            onChangeText={t => setField('secondaryMuscles', t)}
                            placeholder="e.g. Lower Back, Hip Flexors"
                        />

                        {/* Muscle Group Tags — for the Browse by Muscle Group filter cards */}
                        <View style={styles.sectionSeparator}>
                            <Tag size={14} color="#64748b" />
                            <Text style={styles.sectionSeparatorText}>{t('admin.muscleGroupFilterTags', 'MUSCLE GROUP FILTER TAGS')}</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                            {t('admin.muscleGroupFilterHint', 'These tag this exercise to the Browse by Muscle Group cards in the Workouts tab.')}
                        </Text>
                        <DropdownField
                            label=""
                            options={ALL_MUSCLE_GROUPS}
                            selected={form.muscleGroupTags}
                            onChange={(v: string[]) => setField('muscleGroupTags', v)}
                            multi={true}
                        />

                        {/* Equipment */}
                        <Text style={styles.label}>{t('admin.requiredEquipment', 'Required Equipment (comma-separated)')}</Text>
                        <TextInput
                            style={styles.input}
                            value={form.equipment}
                            onChangeText={t => setField('equipment', t)}
                            placeholder="e.g. Hyperextension bench, Roman chair"
                        />
                        <Text style={styles.label}>{t('admin.optionalEquipment', 'Optional / Alternative Equipment (comma-separated)')}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, marginTop: -4 }}>
                            {t('admin.optionalEquipmentHint', 'Items listed here appear as "or:" alternatives in the app')}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={form.optionalEquipment}
                            onChangeText={t => setField('optionalEquipment', t)}
                            placeholder="e.g. Body weight, Dumbbell, Weight plate"
                        />

                        {/* Difficulty */}
                        <DropdownField
                            label={t('admin.difficultyLabel', 'Difficulty')}
                            options={LEVELS}
                            selected={form.difficulty}
                            onChange={(v: string) => setField('difficulty', v)}
                            multi={false}
                        />

                        {/* Thumbnail URL */}
                        <Text style={styles.label}>{t('admin.thumbnailUrl', 'Thumbnail URL — Fallback / Unisex (R2)')}</Text>
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
                            <Text style={[styles.sectionSeparatorText, { color: '#8b5cf6' }]}>{t('admin.thumbnailsVideosGender', 'THUMBNAILS & VIDEOS BY GENDER')}</Text>
                        </View>
                        <Text style={styles.fieldHint}>
                            {t('admin.genderToggleHint', 'Enable the toggle to upload separate ♂ Male and ♀ Female thumbnails and videos. The app picks the right version based on the user\'s profile. Leave blank to use the fallback above.')}
                        </Text>

                        {/* Gender variants toggle */}
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleLabel}>{t('admin.hasGenderVariants', 'Has gender variants (♂ / ♀)')}</Text>
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
                                <Text style={[styles.label, { marginTop: 0, color: form.hasGenderVariants ? '#2563eb' : '#94a3b8' }]}>{t('admin.maleThumbnail', '♂ Male Thumbnail (R2)')}</Text>
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
                                <Text style={[styles.label, { marginTop: 4, color: form.hasGenderVariants ? '#2563eb' : '#94a3b8' }]}>{t('admin.maleVideo', '♂ Male Video URL (R2)')}</Text>
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
                                <Text style={[styles.label, { marginTop: 0, color: form.hasGenderVariants ? '#9333ea' : '#94a3b8' }]}>{t('admin.femaleThumbnail', '♀ Female Thumbnail (R2)')}</Text>
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
                                <Text style={[styles.label, { marginTop: 4, color: form.hasGenderVariants ? '#9333ea' : '#94a3b8' }]}>{t('admin.femaleVideo', '♀ Female Video URL (R2)')}</Text>
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
                        <Text style={[styles.label, { marginTop: 16 }]}>{t('admin.fallbackVideo', 'Fallback / Unisex Video URL (R2)')}</Text>
                        <Text style={styles.fieldHint}>{t('admin.fallbackVideoHint', 'Shown when no gender variant exists or as default.')}</Text>
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
