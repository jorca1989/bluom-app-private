import React, { useState } from 'react';
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
    Alert
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Dumbbell,
    Plus,
    Search,
    Trash2,
    Edit3,
    X,
    TrendingUp,
    Briefcase
} from 'lucide-react-native';

export default function ExerciseLibraryManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any>(null);

    const exercises = useQuery(api.exercises.list, { search });
    const createExercise = useMutation(api.exercises.createExercise);
    const updateExercise = useMutation(api.exercises.updateExercise);
    const deleteExercise = useMutation(api.exercises.deleteExercise);

    const [form, setForm] = useState({
        name: '',
        category: 'Strength',
        type: 'strength',
        met: '6.0',
        caloriesPerMinute: '0',
        muscleGroups: '',
        description: ''
    });

    const categories = ['Strength', 'Cardio', 'HIIT', 'Flexibility'];
    const types = ['strength', 'cardio', 'hiit', 'yoga'];

    const handleSave = async () => {
        if (!form.name || !form.met) {
            Alert.alert('Error', 'Please fill name and MET value');
            return;
        }

        try {
            const payload = {
                name: { en: form.name },
                category: form.category,
                type: form.type as any,
                met: parseFloat(form.met),
                caloriesPerMinute: parseFloat(form.caloriesPerMinute) || undefined,
                muscleGroups: form.muscleGroups.split(',').map(s => s.trim()).filter(Boolean),
                description: form.description || undefined
            };

            if (editingExercise) {
                await updateExercise({ id: editingExercise._id, updates: payload });
            } else {
                await createExercise(payload);
            }

            setIsModalOpen(false);
            setEditingExercise(null);
            resetForm();
        } catch (error) {
            Alert.alert('Error', 'Failed to save exercise');
        }
    };

    const handleDelete = (id: any) => {
        Alert.alert('Confirm Delete', 'Delete this exercise from the library?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExercise({ id }) }
        ]);
    };

    const resetForm = () => {
        setForm({
            name: '',
            category: 'Strength',
            type: 'strength',
            met: '6.0',
            caloriesPerMinute: '0',
            muscleGroups: '',
            description: ''
        });
    };

    const openEdit = (ex: any) => {
        setEditingExercise(ex);
        setForm({
            name: typeof ex.name === 'object' ? ex.name.en : ex.name,
            category: ex.category,
            type: ex.type,
            met: ex.met.toString(),
            caloriesPerMinute: (ex.caloriesPerMinute || 0).toString(),
            muscleGroups: ex.muscleGroups.join(', '),
            description: ex.description || ''
        });
        setIsModalOpen(true);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.exName}>{typeof item.name === 'object' ? item.name.en : item.name}</Text>
                <View style={styles.badgeRow}>
                    <Text style={styles.badge}>{item.category}</Text>
                    <Text style={[styles.badge, { backgroundColor: '#fef3c7', color: '#d97706' }]}>MET: {item.met}</Text>
                </View>
                <Text style={styles.muscles}>{item.muscleGroups.join(' • ')}</Text>
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Exercise Library</Text>
                    <Text style={styles.subtitle}>Global exercise database for logging</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        setEditingExercise(null);
                        resetForm();
                        setIsModalOpen(true);
                    }}
                >
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Add Exercise</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercise library..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {!exercises ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={exercises}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Dumbbell size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No exercises found</Text>
                        </View>
                    }
                />
            )}

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

                    <ScrollView style={styles.form}>
                        <Text style={styles.label}>Exercise Name</Text>
                        <TextInput
                            style={styles.input}
                            value={form.name}
                            onChangeText={t => setForm(f => ({ ...f, name: t }))}
                            placeholder="e.g. Squats"
                        />

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
                                    {categories.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            onPress={() => setForm(f => ({ ...f, category: c }))}
                                            style={[styles.pill, form.category === c && styles.pillActive]}
                                        >
                                            <Text style={[styles.pillText, form.category === c && styles.pillTextActive]}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>MET Value</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={form.met}
                                    onChangeText={t => setForm(f => ({ ...f, met: t }))}
                                />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Cal/Min (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={form.caloriesPerMinute}
                                    onChangeText={t => setForm(f => ({ ...f, caloriesPerMinute: t }))}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Muscle Groups (comma separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.muscleGroups}
                            onChangeText={t => setForm(f => ({ ...f, muscleGroups: t }))}
                            placeholder="Quads, Glutes, Hamstrings"
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            value={form.description}
                            onChangeText={t => setForm(f => ({ ...f, description: t }))}
                            placeholder="Instructions or details..."
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 4 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 24, paddingHorizontal: 16, height: 52, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    list: { padding: 24, paddingTop: 0, gap: 12 },
    card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cardInfo: { flex: 1 },
    exName: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    badge: { fontSize: 10, fontWeight: '800', color: '#059669', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
    muscles: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
    empty: { padding: 40, alignItems: 'center', gap: 12 },
    emptyText: { color: '#94a3b8', fontWeight: '600' },
    modal: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    saveBtn: { color: '#10b981', fontWeight: '800', fontSize: 16 },
    form: { padding: 24 },
    label: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 16 },
    col: { flex: 1 },
    picker: { flexDirection: 'row', marginTop: 4 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8 },
    pillActive: { backgroundColor: '#10b981' },
    pillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    pillTextActive: { color: '#ffffff' }
});
