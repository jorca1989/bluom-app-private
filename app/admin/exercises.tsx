import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Dumbbell, Plus, Search, Trash2, Edit3, X, Image as ImageIcon, Filter, ChevronDown } from 'lucide-react-native';
import { R2_CONFIG } from '@/utils/r2Config';
import { ADMIN_TRANSLATION_LANGUAGES } from '@/constants/adminLanguages';

// ─── Shared constants (must match ExerciseSearchModal + app/workouts.tsx) ────
export const EXERCISE_CATEGORIES = [
    'Strength', 'Powerlifting', 'Hypertrophy', 'Isolation', 'Compound', 'Unilateral', 'Cardio', 'Conditioning', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core', 'Women',
    'Functional/Mobility', 'Warm-up/Activation', 'Post-workout Stretch', 'Calisthenics/Bodyweight', 'Plyometrics', 'Balance', 'Proprioception', 'Rehab', 'Prehab', 'Posture', 'Stability', 'Anti-Extension', 'Anti-Lateral Flexion', 'Hip Hinge'
] as const;

export const ALL_MUSCLE_GROUPS = [
    'Full Body', 'Upper Body', 'Lower Body',
    'Chest', 'Pectoralis Major', 'Pectoralis Minor', 'Upper Chest', 'Lower Chest',
    'Back', 'Upper Back', 'Mid Back', 'Lower Back', 'Latissimus Dorsi', 'Lats', 'Trapezius', 'Traps', 'Rhomboids', 'Erector Spinae', 'Teres Major', 'Teres Minor', 'Infraspinatus', 'Posterior Chain',
    'Shoulders', 'Anterior Deltoid', 'Lateral Deltoid', 'Posterior Deltoid', 'Rotator Cuff', 'Supraspinatus', 'Subscapularis',
    'Biceps', 'Short Head Biceps', 'Long Head Biceps', 'Triceps', 'Long Head Triceps', 'Lateral Head Triceps', 'Medial Head Triceps', 'Forearms', 'Brachialis',
    'Legs', 'Quads', 'Hamstrings', 'Calves', 'Gastrocnemius', 'Soleus', 'Tibialis Anterior', 'Tibialis Posterior', 'Shin', 'Ankle', 'Extensor Digitorum Longus', 'Extensor Hallucis Longus', 'Peroneals', 'Plantar Fascia',
    'Glutes', 'Gluteus Maximus', 'Gluteus Medius', 'Gluteus Minimus', 'Piriformis', 'Hip Flexors', 'Adductors', 'Abductors', 'Psoas',
    'Core', 'Abs', 'Obliques', 'Internal Obliques', 'External Obliques', 'Rectus Abdominis', 'Transverse Abdominis', 'Quadratus Lumborum', 'Pelvic Floor',
    'Neck', 'Serratus'
] as const;

const PAGE_SIZE = 50;

const localizedEmptyFields = (prefix: string) => Object.fromEntries(
    ADMIN_TRANSLATION_LANGUAGES.map(({ code }) => [`${prefix}_${code}`, ''])
);

const EMPTY_FORM = {
    name: '',
    ...localizedEmptyFields('name'),
    categories: ['Strength'] as string[],  // multi-select
    met: '6.0',
    caloriesPerMinute: '0',
    muscleGroups: [] as string[],
    thumbnailUrl: '',
};

// ── Small helper: pill row used in the list filter bar ────────────────────────
function FilterPills({
    label, options, value, onChange, color = '#2563eb',
}: {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    color?: string;
}) {
    return (
        <View style={fp.wrap}>
            <Text style={fp.label}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fp.row}>
                <TouchableOpacity
                    style={[fp.pill, value === 'All' && { backgroundColor: color }]}
                    onPress={() => onChange('All')}
                >
                    <Text style={[fp.pillTxt, value === 'All' && fp.pillTxtActive]}>All</Text>
                </TouchableOpacity>
                {options.map(o => (
                    <TouchableOpacity
                        key={o}
                        style={[fp.pill, value === o && { backgroundColor: color }]}
                        onPress={() => onChange(value === o ? 'All' : o)}
                    >
                        <Text style={[fp.pillTxt, value === o && fp.pillTxtActive]}>{o}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const fp = StyleSheet.create({
    wrap: { paddingHorizontal: 16, marginBottom: 6 },
    label: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
    row: { flexDirection: 'row', gap: 6, paddingRight: 32 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    pillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    pillTxtActive: { color: '#ffffff' },
});

// ── Multi-select muscle group chip picker ─────────────────────────────────────
function MuscleGroupPicker({
    selected,
    onChange,
}: {
    selected: string[];
    onChange: (v: string[]) => void;
}) {
    const toggle = (m: string) => {
        if (selected.includes(m)) onChange(selected.filter(s => s !== m));
        else onChange([...selected, m]);
    };
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ALL_MUSCLE_GROUPS.map(m => {
                const active = selected.includes(m);
                return (
                    <TouchableOpacity
                        key={m}
                        onPress={() => toggle(m)}
                        style={[
                            mgStyles.chip,
                            active && mgStyles.chipActive,
                        ]}
                    >
                        <Text style={[mgStyles.chipTxt, active && mgStyles.chipTxtActive]}>{m}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const mgStyles = StyleSheet.create({
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
    chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
    chipTxt: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
    chipTxtActive: { color: '#ffffff' },
});

// ── Main component ─────────────────────────────────────────────────────────────
export default function ExerciseLibraryManager() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterMuscle, setFilterMuscle] = useState('All');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any>(null);
    const [form, setForm] = useState<any>({ ...EMPTY_FORM });
    const [selectedAdminLang, setSelectedAdminLang] = useState<string>('en');
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    const getActiveName = () => {
        if (selectedAdminLang === 'en') return form.name;
        return form[`name_${selectedAdminLang}`] ?? '';
    };

    const setActiveName = (val: string) => {
        setForm((p: any) => {
            if (selectedAdminLang === 'en') return { ...p, name: val };
            return { ...p, [`name_${selectedAdminLang}`]: val };
        });
    };

    const allExercises = useQuery(api.exercises.listAll, {
        search: search.trim() || undefined,
        category: filterCategory !== 'All' ? filterCategory : undefined,
        muscleGroup: filterMuscle !== 'All' ? filterMuscle : undefined,
    });

    const createExercise = useMutation(api.exercises.createExercise);
    const updateExercise = useMutation(api.exercises.updateExercise);
    const deleteExercise = useMutation(api.exercises.deleteExercise);
    const clearAll = useMutation(api.exercises.clearAll);

    const total = allExercises?.length ?? 0;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const paged = useMemo(() => {
        if (!allExercises) return [];
        return allExercises.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    }, [allExercises, page]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.met) {
            Alert.alert(t('common.error', 'Error'), t('admin.errorRequired', 'Exercise name and MET value are required'));
            return;
        }
        try {
            const cats = form.categories.length ? form.categories : ['Strength'];
            const nameObj: Record<string, string> = { en: form.name.trim() };
            for (const { code } of ADMIN_TRANSLATION_LANGUAGES) {
                const value = String(form[`name_${code}`] ?? '').trim();
                if (value) nameObj[code] = value;
            }
            const payload: any = {
                name: nameObj,
                category: cats[0],            // primary category (backward-compat)
                categories: cats,             // full list
                met: parseFloat(form.met),
                caloriesPerMinute: parseFloat(form.caloriesPerMinute) || undefined,
                muscleGroups: form.muscleGroups,
                thumbnailUrl: form.thumbnailUrl.trim() || undefined,
            };
            if (editingExercise) {
                await updateExercise({ id: editingExercise._id, updates: payload });
            } else {
                await createExercise(payload);
            }
            setIsModalOpen(false);
            setEditingExercise(null);
            setForm({ ...EMPTY_FORM });
        } catch (error: any) {
            Alert.alert(t('common.error', 'Error'), error?.message ?? t('admin.errorSave', 'Failed to save exercise'));
        }
    };

    const handleDelete = (id: any, name: string) => {
        Alert.alert(t('admin.deleteTitle', 'Delete Exercise'), t('admin.deleteConfirm', 'Delete "{{title}}"?', { title: name }), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('admin.delete', 'Delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteExercise({ id });
                        Alert.alert('Success', 'Exercise deleted successfully.');
                    } catch (err: any) {
                        console.error('Delete error:', err);
                        Alert.alert(t('common.error', 'Error'), err?.message || t('admin.errorDelete', 'Failed to delete exercise.'));
                    }
                }
            },
        ]);
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear Library',
            `Permanently delete ALL ${total} exercises. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result: any = await clearAll();
                            Alert.alert('Done', `Deleted ${result.deleted} exercises.`);
                            setPage(0);
                        } catch {
                            Alert.alert('Error', 'Failed to clear library');
                        }
                    },
                },
            ],
        );
    };

    const openEdit = (ex: any) => {
        setEditingExercise(ex);
        setSelectedAdminLang('en');
        setShowLangDropdown(false);
        const existingMuscles: string[] = Array.isArray(ex.muscleGroups) ? ex.muscleGroups : [];
        const nameObj = typeof ex.name === 'object' ? ex.name : { en: ex.name ?? '' };
        setForm({
            name: nameObj.en ?? '',
            ...Object.fromEntries(ADMIN_TRANSLATION_LANGUAGES.map(({ code }) => [`name_${code}`, nameObj[code] ?? ''])),
            categories: ex.categories ?? (ex.category ? [ex.category] : ['Strength']),
            met: String(ex.met ?? '6.0'),
            caloriesPerMinute: String(ex.caloriesPerMinute ?? '0'),
            muscleGroups: existingMuscles,
            thumbnailUrl: ex.thumbnailUrl ?? '',
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingExercise(null);
        setSelectedAdminLang('en');
        setShowLangDropdown(false);
        setForm({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const rawName = typeof item.name === 'object' ? item.name.en : item.name;
        const name = t(`db.${rawName?.replace(/\s+/g, '')}`, rawName) as string;
        return (
            <View style={styles.card}>
                {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" transition={300} />
                ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <ImageIcon size={18} color="#cbd5e1" />
                    </View>
                )}
                <View style={styles.cardInfo}>
                    <Text style={styles.exName} numberOfLines={1}>{name}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.catBadge}><Text style={styles.catBadgeTxt}>{t(`admin.${item.category?.toLowerCase()}`, item.category) as string}</Text></View>
                        <View style={styles.metBadge}><Text style={styles.metBadgeTxt}>MET {item.met}</Text></View>
                    </View>
                    <Text style={styles.muscles} numberOfLines={1}>{(item.muscleGroups ?? []).map((m: string) => t(`admin.${m.replace(/[\s/]/g, '').toLowerCase()}`, m) as string).join(' • ') || '—'}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}><Edit3 size={16} color="#64748b" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id, name)} style={styles.actionBtn}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{t('admin.library', 'Exercise Library')}</Text>
                    <Text style={styles.subtitle}>{allExercises === undefined ? t('home.loading', 'Loading…') : `${total} ${t('admin.results', 'exercises')}`}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={{ padding: 6 }}>
                        <Search size={20} color={showSearch ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ padding: 6 }}>
                        <Filter size={20} color={(filterCategory !== 'All' || filterMuscle !== 'All' || showFilters) ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={openNew}>
                        <Plus color="#fff" size={18} />
                        <Text style={styles.addBtnTxt}>{t('admin.new', 'Add Exercise')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            {showSearch && (
                <View style={styles.searchBar}>
                    <Search size={17} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('admin.searchLibrary', 'Search library...')}
                        value={search}
                        onChangeText={t => { setSearch(t); setPage(0); }}
                        clearButtonMode="while-editing"
                        autoFocus
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); setPage(0); }}>
                            <X size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Filters Drawer */}
            {showFilters && (
                <View style={{ backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <FilterPills
                        label={t('admin.type', 'Category')}
                        options={EXERCISE_CATEGORIES}
                        value={filterCategory}
                        onChange={v => { setFilterCategory(v); setPage(0); }}
                        color="#2563eb"
                    />
                    <FilterPills
                        label={t('admin.muscleGroup', 'Muscle Group')}
                        options={ALL_MUSCLE_GROUPS}
                        value={filterMuscle}
                        onChange={v => { setFilterMuscle(v); setPage(0); }}
                        color="#059669"
                    />
                </View>
            )}

            {/* List */}
            {allExercises === undefined ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <>
                    <FlatList
                        data={paged}
                        renderItem={renderItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Dumbbell size={44} color="#cbd5e1" />
                                <Text style={styles.emptyTxt}>{total === 0 ? t('admin.noExercisesYet', 'Library is empty — add your first exercise') : t('admin.noResults', 'No matches')}</Text>
                            </View>
                        }
                    />
                    {pageCount > 1 && (
                        <View style={styles.pagination}>
                            <TouchableOpacity style={[styles.pageBtn, page === 0 && styles.pageBtnOff]} onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                                <Text style={styles.pageBtnTxt}>← Prev</Text>
                            </TouchableOpacity>
                            <Text style={styles.pageInfo}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</Text>
                            <TouchableOpacity style={[styles.pageBtn, page >= pageCount - 1 && styles.pageBtnOff]} onPress={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>
                                <Text style={styles.pageBtnTxt}>Next →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* Form Modal */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={22} color="#64748b" /></TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingExercise ? t('admin.editExercise', 'Edit Exercise') : t('admin.newExercise', 'New Exercise')}</Text>
                        <TouchableOpacity onPress={handleSave}><Text style={styles.saveBtn}>{t('admin.save', 'Save')}</Text></TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                        {/* Language Selector Tabs */}
                        <View style={styles.langSelectorContainer}>
                            <Text style={styles.miniLangLabel}>Lang:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                                <TouchableOpacity 
                                    onPress={() => setSelectedAdminLang('en')} 
                                    style={[styles.miniLangTab, selectedAdminLang === 'en' && styles.miniLangTabActive]}
                                >
                                    <Text style={[styles.miniLangText, selectedAdminLang === 'en' && styles.miniLangTextActive]}>🇬🇧 EN</Text>
                                </TouchableOpacity>
                                {ADMIN_TRANSLATION_LANGUAGES.map(lang => {
                                    const flag = lang.code === 'pt' ? '🇧🇷' : lang.code === 'es' ? '🇪🇸' : lang.code === 'de' ? '🇩🇪' : lang.code === 'nl' ? '🇳🇱' : '🌐';
                                    const isActive = selectedAdminLang === lang.code;
                                    return (
                                        <TouchableOpacity 
                                            key={lang.code}
                                            onPress={() => setSelectedAdminLang(lang.code)} 
                                            style={[styles.miniLangTab, isActive && styles.miniLangTabActive]}
                                        >
                                            <Text style={[styles.miniLangText, isActive && styles.miniLangTextActive]}>{flag} {lang.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <Text style={styles.label}>
                            📝 {t('admin.exerciseName', 'Exercise Name *')} ({selectedAdminLang === 'en' ? 'EN - Required' : selectedAdminLang.toUpperCase()})
                        </Text>
                        <TextInput 
                            style={styles.input} 
                            value={getActiveName()} 
                            onChangeText={setActiveName} 
                            placeholder={selectedAdminLang === 'en' ? t('admin.exerciseNamePlaceholder', 'e.g. Barbell Squat') : 'Translation name...'} 
                        />

                        <Text style={styles.label}>{t('admin.thumbnailUrl', 'Thumbnail URL (R2)')}</Text>
                        {!!form.thumbnailUrl && (
                            <Image source={{ uri: form.thumbnailUrl }} style={styles.thumbPreview} contentFit="cover" transition={300} />
                        )}
                        <TextInput
                            style={styles.input}
                            value={form.thumbnailUrl}
                            onChangeText={t => setForm((f: any) => ({ ...f, thumbnailUrl: t }))}
                            placeholder={`${R2_CONFIG.exerciseLibraryBaseUrl}/exercises/squat.gif`}
                            autoCapitalize="none"
                            keyboardType="url"
                        />

                        <Text style={styles.label}>{t('admin.exerciseTypeLabel', 'Category (select all that apply)')}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                            {EXERCISE_CATEGORIES.map(c => {
                                const active = form.categories.includes(c);
                                return (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => {
                                            const next = active
                                                ? form.categories.filter((x: any) => x !== c)
                                                : [...form.categories, c];
                                            setForm((f: any) => ({ ...f, categories: next }));
                                        }}
                                        style={[styles.pill, active && styles.pillActive]}
                                    >
                                        <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{t(`admin.${c.replace(/[\s/]/g, '').toLowerCase()}`, c)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {form.categories.length > 0 && (
                            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 8 }}>
                                Primary: {form.categories[0]}
                            </Text>
                        )}

                        <View style={{ flexDirection: 'row', gap: 14 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>MET Value *</Text>
                                <TextInput style={styles.input} keyboardType="decimal-pad" value={form.met} onChangeText={t => setForm((f: any) => ({ ...f, met: t }))} placeholder="6.0" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Cal/Min</Text>
                                <TextInput style={styles.input} keyboardType="decimal-pad" value={form.caloriesPerMinute} onChangeText={t => setForm((f: any) => ({ ...f, caloriesPerMinute: t }))} placeholder="0" />
                            </View>
                        </View>

                        <Text style={styles.label}>{t('admin.muscleGroup', 'Muscle Groups')}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{t('admin.muscleGroupFilterHint', 'Tap to select — avoid typos')}</Text>
                        {form.muscleGroups.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {form.muscleGroups.map((m: any) => (
                                    <View key={m} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}>
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{m}</Text>
                                        <TouchableOpacity onPress={() => setForm((f: any) => ({ ...f, muscleGroups: f.muscleGroups.filter((x: any) => x !== m) }))}>
                                            <X size={12} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                        <MuscleGroupPicker
                            selected={form.muscleGroups}
                            onChange={v => setForm((f: any) => ({ ...f, muscleGroups: v }))}
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 },
    addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff0f0', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#fecaca' },
    clearBtnTxt: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, marginBottom: 12, paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e293b' },
    list: { padding: 16, gap: 10 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
    thumb: { width: 54, height: 54, borderRadius: 10 },
    thumbPlaceholder: { backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    cardInfo: { flex: 1, minWidth: 0 },
    exName: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    catBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    catBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
    metBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    metBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#d97706' },
    muscles: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 6 },
    actionBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
    empty: { padding: 48, alignItems: 'center', gap: 12 },
    emptyTxt: { color: '#94a3b8', fontWeight: '600', textAlign: 'center', fontSize: 14 },
    pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    pageBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    pageBtnOff: { backgroundColor: '#e2e8f0' },
    pageBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
    pageInfo: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    modal: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    saveBtn: { color: '#10b981', fontWeight: '800', fontSize: 16 },
    form: { padding: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', fontWeight: '600' },
    pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    pillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    pillTxtActive: { color: '#fff' },
    thumbPreview: { width: '100%', height: 140, borderRadius: 12, marginBottom: 8, backgroundColor: '#f1f5f9' },
    langSelectorContainer: {
        marginBottom: 16,
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniLangLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    miniLangTab: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    miniLangTabActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    miniLangText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    miniLangTextActive: {
        color: '#fff',
    },
});
