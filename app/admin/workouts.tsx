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
    ChevronRight,
    Sparkles,
    Trash2,
    Edit3,
    X,
    Play
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function WorkoutsManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);

    const workouts = useQuery(api.videoWorkouts.list, { search });
    const createWorkout = useMutation(api.videoWorkouts.createWorkout);
    const updateWorkout = useMutation(api.videoWorkouts.updateWorkout);
    const deleteWorkout = useMutation(api.videoWorkouts.deleteWorkout);

    const [form, setForm] = useState({
        title: '',
        description: '',
        thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
        videoUrl: '',
        duration: '30',
        calories: '300',
        difficulty: 'Beginner',
        category: 'Strength',
        instructor: 'Coach Sarah',
        isPremium: true
    });

    const categories = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core'];
    const levels = ['Beginner', 'Intermediate', 'Advanced'];

    const handleSave = async () => {
        if (!form.title) {
            Alert.alert('Error', 'Title is required');
            return;
        }

        try {
            const payload = {
                title: form.title,
                description: form.description,
                thumbnail: form.thumbnail,
                videoUrl: form.videoUrl || undefined,
                duration: parseFloat(form.duration),
                calories: parseFloat(form.calories),
                difficulty: form.difficulty as any,
                category: form.category,
                equipment: [], // Add tags or list later
                instructor: form.instructor,
                isPremium: form.isPremium,
                exercises: [] // Manage exercises sub-list later
            };

            if (editingWorkout) {
                await updateWorkout({ id: editingWorkout._id, updates: payload });
            } else {
                await createWorkout(payload);
            }

            setIsModalOpen(false);
            setEditingWorkout(null);
            resetForm();
        } catch (error) {
            Alert.alert('Error', 'Failed to save workout');
        }
    };

    const handleDelete = (id: any) => {
        Alert.alert('Delete Routine', 'Remove this video workout from the library?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout({ id }) }
        ]);
    };

    const resetForm = () => {
        setForm({
            title: '',
            description: '',
            thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
            videoUrl: '',
            duration: '30',
            calories: '300',
            difficulty: 'Beginner',
            category: 'Strength',
            instructor: 'Coach Sarah',
            isPremium: true
        });
    };

    const openEdit = (w: any) => {
        setEditingWorkout(w);
        setForm({
            title: w.title,
            description: w.description,
            thumbnail: w.thumbnail,
            videoUrl: w.videoUrl || '',
            duration: w.duration.toString(),
            calories: w.calories.toString(),
            difficulty: w.difficulty,
            category: w.category,
            instructor: w.instructor,
            isPremium: w.isPremium
        });
        setIsModalOpen(true);
    };

    const renderWorkoutItem = ({ item }: { item: any }) => (
        <View style={styles.workoutCard}>
            <View style={styles.thumbnailPlaceholder}>
                <Play size={24} color="#2563eb" />
            </View>
            <View style={styles.workoutInfo}>
                <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle}>{item.title}</Text>
                    <View style={[styles.levelBadge, { backgroundColor: item.difficulty === 'Advanced' ? '#fef2f2' : item.difficulty === 'Intermediate' ? '#fffbeb' : '#f0fdf4' }]}>
                        <Text style={[styles.levelText, { color: item.difficulty === 'Advanced' ? '#ef4444' : item.difficulty === 'Intermediate' ? '#f59e0b' : '#10b981' }]}>
                            {item.difficulty.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.instructorRow}>
                    <Text style={styles.instructorName}>{item.instructor} • {item.category}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Timer size={14} color="#64748b" />
                        <Text style={styles.statText}>{item.duration}m</Text>
                    </View>
                    <View style={styles.stat}>
                        <Flame size={14} color="#f59e0b" />
                        <Text style={styles.statText}>{item.calories} kcal</Text>
                    </View>
                    {item.isPremium && (
                        <View style={styles.proBadge}>
                            <Sparkles size={10} color="#6366f1" />
                            <Text style={styles.proText}>PREMIUM</Text>
                        </View>
                    )}
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Video Workouts</Text>
                    <Text style={styles.subtitle}>Curate routines and video tutorials</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => { setEditingWorkout(null); resetForm(); setIsModalOpen(true); }}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>New Workout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search video library..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {!workouts ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={workouts}
                    renderItem={renderWorkoutItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingWorkout ? 'Edit Workout' : 'New Video Routine'}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveBtn}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <Text style={styles.label}>Workout Title</Text>
                        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} />

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 80 }]} multiline value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} />

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Duration (min)</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={form.duration} onChangeText={t => setForm(f => ({ ...f, duration: t }))} />
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>Calories</Text>
                                <TextInput style={styles.input} keyboardType="numeric" value={form.calories} onChangeText={t => setForm(f => ({ ...f, calories: t }))} />
                            </View>
                        </View>

                        <Text style={styles.label}>Difficulty</Text>
                        <View style={styles.picker}>
                            {levels.map(l => (
                                <TouchableOpacity key={l} onPress={() => setForm(f => ({ ...f, difficulty: l }))} style={[styles.pill, form.difficulty === l && styles.pillActiveActive]}>
                                    <Text style={[styles.pillText, form.difficulty === l && styles.pillTextActiveActive]}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
                            {categories.map(c => (
                                <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, category: c }))} style={[styles.pill, form.category === c && styles.pillActiveActive]}>
                                    <Text style={[styles.pillText, form.category === c && styles.pillTextActiveActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Instructor</Text>
                        <TextInput style={styles.input} value={form.instructor} onChangeText={t => setForm(f => ({ ...f, instructor: t }))} />

                        <View style={styles.premiumSwitch}>
                            <Text style={styles.label}>Premium Only</Text>
                            <TouchableOpacity onPress={() => setForm(f => ({ ...f, isPremium: !f.isPremium }))}>
                                <View style={[styles.toggle, form.isPremium && styles.toggleOn]}>
                                    <View style={[styles.toggleCircle, form.isPremium && styles.toggleCircleOn]} />
                                </View>
                            </TouchableOpacity>
                        </View>
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
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 24, paddingHorizontal: 16, height: 52, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    listContent: { padding: 24, paddingTop: 0, gap: 12 },
    workoutCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    thumbnailPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    workoutInfo: { flex: 1, marginLeft: 16 },
    workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    workoutTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 },
    levelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    levelText: { fontSize: 9, fontWeight: '900' },
    instructorRow: { marginBottom: 8 },
    instructorName: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    proText: { fontSize: 9, fontWeight: '900', color: '#6366f1' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
    modal: { flex: 1, backgroundColor: '#ffffff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    saveBtn: { color: '#2563eb', fontWeight: '800', fontSize: 16 },
    form: { padding: 24 },
    label: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 16 },
    col: { flex: 1 },
    picker: { flexDirection: 'row', gap: 8, marginTop: 4 },
    pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
    pillActiveActive: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    pillTextActiveActive: { color: '#ffffff' },
    premiumSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    toggle: { width: 48, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', padding: 2 },
    toggleOn: { backgroundColor: '#2563eb' },
    toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' },
    toggleCircleOn: { marginLeft: 24 }
});
