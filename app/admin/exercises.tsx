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
import { Image } from 'expo-image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Dumbbell,
    Plus,
    Search,
    Trash2,
    Edit3,
    X,
    ChevronDown,
    Image as ImageIcon,
} from 'lucide-react-native';
import { R2_CONFIG } from '@/utils/r2Config';

const CATEGORIES = ['All', 'Strength', 'Cardio', 'HIIT', 'Yoga', 'Flexibility'];
const MUSCLE_GROUPS = [
    'All', 'Chest', 'Back', 'Biceps', 'Triceps',
    'Shoulders', 'Legs', 'Core', 'Glutes', 'Abs', 'Forearms', 'Calves',
];
const TYPES = ['strength', 'cardio', 'hiit', 'yoga'];
const PAGE_SIZE = 50;

const EMPTY_FORM = {
    name: '',
    category: 'Strength',
    type: 'strength',
    met: '6.0',
    caloriesPerMinute: '0',
    muscleGroups: '',
    description: '',
    thumbnailUrl: '',
};

export default function ExerciseLibraryManager() {
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterMuscle, setFilterMuscle] = useState('All');
    const [page, setPage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const allExercises = useQuery(api.exercises.listAll, {
        search: search || undefined,
        category: filterCategory !== 'All' ? filterCategory : undefined,
        muscleGroup: filterMuscle !== 'All' ? filterMuscle : undefined,
    });

    const createExercise = useMutation(api.exercises.createExercise);
    const updateExercise = useMutation(api.exercises.updateExercise);
    const deleteExercise = useMutation(api.exercises.deleteExercise);
    const clearAll = useMutation(api.exercises.clearAll);

    // Client-side pagination
    const total = allExercises?.length ?? 0;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const paged = useMemo(() => {
        if (!allExercises) return [];
        return allExercises.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    }, [allExercises, page]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.met) {
            Alert.alert('Error', 'Exercise name and MET value are required');
            return;
        }
        try {
            const payload: any = {
                name: { en: form.name.trim() },
                category: form.category,
                type: form.type as any,
                met: parseFloat(form.met),
                caloriesPerMinute: parseFloat(form.caloriesPerMinute) || undefined,
                muscleGroups: form.muscleGroups.split(',').map(s => s.trim()).filter(Boolean),
                description: form.description.trim() || undefined,
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
            Alert.alert('Error', error?.message ?? 'Failed to save exercise');
        }
    };

    const handleDelete = (id: any, name: string) => {
        Alert.alert('Delete Exercise', `Delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExercise({ id }) },
        ]);
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear Library',
            `This will permanently delete ALL ${total} exercises. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await clearAll();
                            Alert.alert('Done', `Deleted ${(result as any).deleted} exercises.`);
                            setPage(0);
                        } catch {
                            Alert.alert('Error', 'Failed to clear library');
                        }
                    },
                },
            ]
        );
    };

    const openEdit = (ex: any) => {
        setEditingExercise(ex);
        setForm({
            name: typeof ex.name === 'object' ? ex.name.en : ex.name,
            category: ex.category ?? 'Strength',
            type: ex.type ?? 'strength',
            met: String(ex.met ?? '6.0'),
            caloriesPerMinute: String(ex.caloriesPerMinute ?? '0'),
            muscleGroups: (ex.muscleGroups ?? []).join(', '),
            description: ex.description ?? '',
            thumbnailUrl: ex.thumbnailUrl ?? '',
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingExercise(null);
        setForm({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const renderItem = ({ item }: { item: any }) => {
        const name = typeof item.name === 'object' ? item.name.en : item.name;
        return (
            <View style={styles.card}>
                {/* Thumbnail */}
                {item.thumbnailUrl ? (
                    <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.thumb}
                        contentFit="cover"
                        transition={300}
                    />
                ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <ImageIcon size={20} color="#94a3b8" />
                    </View>
                )}

                {/* Info */}
                <View style={styles.cardInfo}>
                    <Text style={styles.exName} numberOfLines={1}>{name}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                        <View style={styles.metBadge}>
                            <Text style={styles.metBadgeText}>MET {item.met}</Text>
                        </View>
                    </View>
                    <Text style={styles.muscles} numberOfLines={1}>
                        {(item.muscleGroups ?? []).join(' • ')}
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                        <Edit3 size={17} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id, name)} style={styles.actionBtn}>
                        <Trash2 size={17} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Exercise Library</Text>
                    <Text style={styles.subtitle}>
                        {allExercises === undefined ? 'Loading…' : `${total} exercises`}
                    </Text>
                </View>
                <View style={styles.headerBtns}>
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={styles.clearBtnText}>Clear All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={openNew}>
                        <Plus color="#ffffff" size={20} />
                        <Text style={styles.addButtonText}>Add Exercise</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search name or muscle…"
                    value={search}
                    onChangeText={t => { setSearch(t); setPage(0); }}
                    clearButtonMode="while-editing"
                />
            </View>

            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
                {CATEGORIES.map(c => (
                    <TouchableOpacity
                        key={c}
                        style={[styles.pill, filterCategory === c && styles.pillActive]}
                        onPress={() => { setFilterCategory(c); setPage(0); }}
                    >
                        <Text style={[styles.pillText, filterCategory === c && styles.pillTextActive]}>{c}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Muscle filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
                {MUSCLE_GROUPS.map(m => (
                    <TouchableOpacity
                        key={m}
                        style={[styles.pill, styles.pillMuscle, filterMuscle === m && styles.pillMuscleActive]}
                        onPress={() => { setFilterMuscle(m); setPage(0); }}
                    >
                        <Text style={[styles.pillText, filterMuscle === m && styles.pillTextActive]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

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
                                <Dumbbell size={48} color="#cbd5e1" />
                                <Text style={styles.emptyText}>
                                    {total === 0 ? 'Library is empty — add your first exercise' : 'No matches for current filters'}
                                </Text>
                            </View>
                        }
                    />

                    {/* Pagination */}
                    {pageCount > 1 && (
                        <View style={styles.pagination}>
                            <TouchableOpacity
                                style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <Text style={styles.pageBtnText}>← Prev</Text>
                            </TouchableOpacity>
                            <Text style={styles.pageInfo}>
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                            </Text>
                            <TouchableOpacity
                                style={[styles.pageBtn, page >= pageCount - 1 && styles.pageBtnDisabled]}
                                onPress={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                                disabled={page >= pageCount - 1}
                            >
                                <Text style={styles.pageBtnText}>Next →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* Form Modal */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingExercise ? 'Edit Exercise' : 'New Exercise'}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Exercise Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={form.name}
                            onChangeText={t => setForm(f => ({ ...f, name: t }))}
                            placeholder="e.g. Barbell Squat"
                        />

                        <Text style={styles.label}>Thumbnail URL (R2)</Text>
                        {form.thumbnailUrl ? (
                            <Image
                                source={{ uri: form.thumbnailUrl }}
                                style={styles.thumbPreview}
                                contentFit="cover"
                                transition={300}
                            />
                        ) : null}
                        <TextInput
                            style={styles.input}
                            value={form.thumbnailUrl}
                            onChangeText={t => setForm(f => ({ ...f, thumbnailUrl: t }))}
                            placeholder={`${R2_CONFIG.generalBaseUrl}/exercises/squat.gif`}
                            autoCapitalize="none"
                            keyboardType="url"
                        />

                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {CATEGORIES.filter(c => c !== 'All').map(c => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setForm(f => ({ ...f, category: c }))}
                                    style={[styles.pill, form.category === c && styles.pillActive, { marginRight: 8 }]}
                                >
                                    <Text style={[styles.pillText, form.category === c && styles.pillTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setForm(f => ({ ...f, type: t }))}
                                    style={[styles.pill, form.type === t && styles.pillActive, { marginRight: 8 }]}
                                >
                                    <Text style={[styles.pillText, form.type === t && styles.pillTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>MET Value *</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    value={form.met}
                                    onChangeText={t => setForm(f => ({ ...f, met: t }))}
                                    placeholder="6.0"
                                />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Cal/Min</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    value={form.caloriesPerMinute}
                                    onChangeText={t => setForm(f => ({ ...f, caloriesPerMinute: t }))}
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Muscle Groups (comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.muscleGroups}
                            onChangeText={t => setForm(f => ({ ...f, muscleGroups: t }))}
                            placeholder="Quads, Glutes, Hamstrings"
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            multiline
                            value={form.description}
                            onChangeText={t => setForm(f => ({ ...f, description: t }))}
                            placeholder="Instructions or details…"
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
    headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 },
    addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff0f0', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#fecaca' },
    clearBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e293b' },
    filterRow: { marginTop: 8 },
    filterRowContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
    pillActive: { backgroundColor: '#2563eb' },
    pillMuscle: { backgroundColor: '#f0fdf4' },
    pillMuscleActive: { backgroundColor: '#059669' },
    pillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    pillTextActive: { color: '#ffffff' },
    list: { padding: 16, gap: 10 },
    card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
    thumb: { width: 56, height: 56, borderRadius: 10 },
    thumbPlaceholder: { backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    cardInfo: { flex: 1, minWidth: 0 },
    exName: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    categoryBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    categoryBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
    metBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    metBadgeText: { fontSize: 10, fontWeight: '800', color: '#d97706' },
    muscles: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 6 },
    actionBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
    empty: { padding: 48, alignItems: 'center', gap: 12 },
    emptyText: { color: '#94a3b8', fontWeight: '600', textAlign: 'center', fontSize: 14 },
    pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    pageBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    pageBtnDisabled: { backgroundColor: '#e2e8f0' },
    pageBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
    pageInfo: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    modal: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    saveBtn: { color: '#10b981', fontWeight: '800', fontSize: 16 },
    form: { padding: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 14 },
    col: { flex: 1 },
    thumbPreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 8, backgroundColor: '#f1f5f9' },
});
