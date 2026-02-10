import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface AIRoutineModalProps {
    visible: boolean;
    onClose: () => void;
}

const workoutCategories = ['All', 'Strength', 'Cardio', 'HIIT', 'Flexibility'] as const;

export default function AIRoutineModal({ visible, onClose }: AIRoutineModalProps) {
    const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');

    // AI State
    const [goal, setGoal] = useState('');
    const [duration, setDuration] = useState('');
    const [equipment, setEquipment] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedRoutine, setGeneratedRoutine] = useState<any>(null);

    // Manual State
    const [manualName, setManualName] = useState('');
    const [manualDesc, setManualDesc] = useState('');
    const [manualExercises, setManualExercises] = useState<any[]>([]);

    // Exercise Picker State
    const [showPicker, setShowPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Convex Hooks
    const generateRoutine = useAction(api.routine_agent.generateRoutine);
    const createRoutine = useMutation(api.routines.createRoutine);
    const exerciseLibrary = useQuery(api.exercises.list, {
        search: searchQuery || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory
    }) || [];

    const handleGenerate = async () => {
        if (!goal.trim()) {
            Alert.alert("Goal Required", "Please enter a fitness goal (e.g. 'Weight Loss').");
            return;
        }

        setIsGenerating(true);
        setGeneratedRoutine(null);

        try {
            const result = await generateRoutine({
                goal,
                duration: duration || undefined,
                equipment: equipment || undefined,
            });
            setGeneratedRoutine(result);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to generate routine.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (routineData: any) => {
        try {
            await createRoutine({
                name: routineData.name,
                description: routineData.description,
                plannedVolume: routineData.plannedVolume,
                estimatedDuration: routineData.estimatedDuration,
                estimatedCalories: routineData.estimatedCalories,
                exercises: routineData.exercises,
            });
            Alert.alert("Success", "Routine saved successfully!");
            onClose();
            // Reset state
            setGeneratedRoutine(null);
            setGoal('');
            setManualName('');
            setManualExercises([]);
            setManualDesc('');
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to save routine.");
        }
    };

    const addManualExercise = (exercise: any) => {
        setManualExercises([...manualExercises, {
            name: typeof exercise.name === 'object' ? exercise.name.en : exercise.name,
            sets: 3,
            reps: '10',
            weight: '',
            rest: 60,
            _id: exercise._id
        }]);
        setShowPicker(false);
    };

    const updateManualExercise = (index: number, field: string, value: any) => {
        const updated = [...manualExercises];
        updated[index] = { ...updated[index], [field]: value };
        setManualExercises(updated);
    };

    const removeManualExercise = (index: number) => {
        const updated = [...manualExercises];
        updated.splice(index, 1);
        setManualExercises(updated);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Routine Builder</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
                            onPress={() => setActiveTab('ai')}
                        >
                            <Ionicons name="sparkles" size={16} color={activeTab === 'ai' ? '#fff' : '#64748b'} />
                            <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>AI Builder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
                            onPress={() => setActiveTab('manual')}
                        >
                            <Ionicons name="create" size={16} color={activeTab === 'manual' ? '#fff' : '#64748b'} />
                            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Manual</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                        {activeTab === 'ai' ? (
                            <View>
                                {!generatedRoutine ? (
                                    <>
                                        <Text style={styles.label}>What is your goal?</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Build muscle, 5k run prep..."
                                            value={goal}
                                            onChangeText={setGoal}
                                        />

                                        <Text style={styles.label}>Duration (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. 45 mins"
                                            value={duration}
                                            onChangeText={setDuration}
                                        />

                                        <Text style={styles.label}>Equipment (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Dumbbells, Bodyweight only..."
                                            value={equipment}
                                            onChangeText={setEquipment}
                                        />

                                        <TouchableOpacity
                                            style={[styles.button, styles.buttonDisabled]} // Always disabled style
                                            onPress={() => {
                                                Alert.alert("Coming Soon", "We are fine-tuning our AI engine to bring you the best routines. Check back soon!", [{ text: "OK" }]);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.buttonText}>Generate with Gemini (Coming Soon)</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View>
                                        <View style={styles.resultCard}>
                                            <Text style={styles.resultTitle}>{generatedRoutine.name}</Text>
                                            <Text style={styles.resultDesc}>{generatedRoutine.description}</Text>

                                            <View style={styles.metaRow}>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="time-outline" size={14} color="#64748b" />
                                                    <Text style={styles.metaText}>{generatedRoutine.estimatedDuration} min</Text>
                                                </View>
                                                <View style={styles.metaItem}>
                                                    <Ionicons name="flame-outline" size={14} color="#64748b" />
                                                    <Text style={styles.metaText}>{generatedRoutine.estimatedCalories} kcal</Text>
                                                </View>
                                            </View>

                                            <View style={styles.divider} />

                                            <Text style={styles.sectionHeader}>Exercises</Text>
                                            {generatedRoutine.exercises.map((ex: any, idx: number) => (
                                                <View key={idx} style={styles.exerciseRow}>
                                                    <Text style={styles.exerciseName}>{ex.name}</Text>
                                                    <Text style={styles.exerciseDetails}>
                                                        {ex.sets} sets × {ex.reps} • {ex.rest}s rest
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.actionRow}>
                                            <TouchableOpacity
                                                style={[styles.button, styles.secondaryButton]}
                                                onPress={() => setGeneratedRoutine(null)}
                                            >
                                                <Text style={styles.secondaryButtonText}>Discard</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.button, { flex: 1 }]}
                                                onPress={() => handleSave(generatedRoutine)}
                                            >
                                                <Text style={styles.buttonText}>Save Routine</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View>
                                {showPicker ? (
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 8 }}>
                                                <Ionicons name="arrow-back" size={24} color="#1e293b" />
                                            </TouchableOpacity>
                                            <Text style={styles.sectionHeader}>Select Exercise</Text>
                                        </View>

                                        <TextInput
                                            style={[styles.input, { marginBottom: 12 }]}
                                            placeholder="Search exercises..."
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 12 }}>
                                            {workoutCategories.map(cat => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                                                    onPress={() => setSelectedCategory(cat)}
                                                >
                                                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

                                        <ScrollView style={{ maxHeight: 400 }}>
                                            {exerciseLibrary?.map((ex: any) => (
                                                <TouchableOpacity
                                                    key={ex._id}
                                                    style={styles.exerciseResultItem}
                                                    onPress={() => addManualExercise(ex)}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.exerciseName}>{typeof ex.name === 'object' ? ex.name.en : ex.name}</Text>
                                                        <Text style={styles.exerciseDetails}>{ex.category} • {ex.muscleGroups?.join(', ')}</Text>
                                                    </View>
                                                    <Ionicons name="add-circle" size={24} color="#2563eb" />
                                                </TouchableOpacity>
                                            ))}
                                            {exerciseLibrary?.length === 0 && (
                                                <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No exercises found.</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={styles.label}>Routine Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. My Upper Body Blast"
                                            value={manualName}
                                            onChangeText={setManualName}
                                        />

                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Optional description..."
                                            value={manualDesc}
                                            onChangeText={setManualDesc}
                                        />

                                        <Text style={styles.sectionHeader}>Exercises</Text>
                                        {manualExercises.map((ex, idx) => (
                                            <View key={idx} style={styles.manualExerciseCard}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <Text style={{ fontWeight: '600', fontSize: 16 }}>{ex.name}</Text>
                                                    <TouchableOpacity onPress={() => removeManualExercise(idx)}>
                                                        <Ionicons name="trash" size={18} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.metaText}>Sets</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder="Sets"
                                                            keyboardType="numeric"
                                                            value={String(ex.sets)}
                                                            onChangeText={(v) => updateManualExercise(idx, 'sets', Number(v))}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.metaText}>Reps</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder="Reps"
                                                            value={ex.reps}
                                                            onChangeText={(v) => updateManualExercise(idx, 'reps', v)}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.metaText}>Weight</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder="kg"
                                                            value={ex.weight}
                                                            onChangeText={(v) => updateManualExercise(idx, 'weight', v)}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        ))}

                                        <TouchableOpacity style={styles.addButton} onPress={() => setShowPicker(true)}>
                                            <Ionicons name="search" size={20} color="#2563eb" />
                                            <Text style={styles.addButtonText}>Find Exercise</Text>
                                        </TouchableOpacity>

                                        <View style={{ height: 20 }} />

                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={() => {
                                                if (!manualName.trim()) {
                                                    Alert.alert("Error", "Please enter a routine name.");
                                                    return;
                                                }
                                                const calculatedDuration = manualExercises.reduce((acc, ex) => acc + ((ex.sets || 1) * 3), 0); // ~3 mins per set
                                                const calculatedCalories = manualExercises.reduce((acc, ex) => {
                                                    const sets = ex.sets || 1;
                                                    const met = ex.met || 4; // Default MET
                                                    // Est: MET * 3.5 * 70kg / 200 * duration(mins)
                                                    // Simplified: sets * 3mins * met * 1.2
                                                    return acc + (sets * 3 * met * 1.2);
                                                }, 0);

                                                handleSave({
                                                    name: manualName,
                                                    description: manualDesc,
                                                    exercises: manualExercises,
                                                    plannedVolume: manualExercises.reduce((acc, ex) => acc + (ex.sets || 0), 0),
                                                    estimatedDuration: Math.round(calculatedDuration),
                                                    estimatedCalories: Math.round(calculatedCalories),
                                                });
                                            }}
                                        >
                                            <Text style={styles.buttonText}>Save Manual Routine</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: height * 0.85,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    tabs: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#2563eb', // Indigo-600 like or Blue
    },
    tabText: {
        fontWeight: '600',
        color: '#64748b',
    },
    activeTabText: {
        color: '#fff',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#0f172a',
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: "#2563eb",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: '#ef4444', // Red for discard
        marginRight: 12,
        flex: 0.4,
        shadowColor: "#ef4444",
    },
    secondaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    resultCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    resultDesc: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 16,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
        marginTop: 4,
    },
    exerciseRow: {
        marginBottom: 12,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    exerciseDetails: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    manualExerciseCard: {
        marginBottom: 12,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        borderRadius: 12,
        backgroundColor: '#eff6ff',
    },
    addButtonText: {
        color: '#2563eb',
        fontWeight: '600',
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: '#2563eb',
    },
    categoryChipText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    categoryChipTextActive: {
        color: '#ffffff',
    },
    exerciseResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
});
