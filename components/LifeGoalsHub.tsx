import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Dimensions, Alert, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
// import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

type Tab = 'pending' | 'achieved' | 'savings';

interface LifeGoalsHubProps {
    userId: Id<"users">;
    onClose: () => void;
}

const CATEGORIES = ['All', 'Work', 'Travel', 'Health', 'Personal'] as const;

export default function LifeGoalsHub({ userId, onClose }: LifeGoalsHubProps) {
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('All');

    // Queries
    const goals = useQuery(api.lifeGoals.list, { userId });

    // Mutations
    const createGoal = useMutation(api.lifeGoals.create);
    const updateGoal = useMutation(api.lifeGoals.update);
    const deleteGoal = useMutation(api.lifeGoals.remove);

    // New Goal State
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCat, setNewCat] = useState('Personal');
    const [newWeblink, setNewWeblink] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newDeadline, setNewDeadline] = useState(new Date().toISOString().split('T')[0]);
    // const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSavingsGoal, setIsSavingsGoal] = useState(false);

    const filteredGoals = goals?.filter(g => {
        if (activeTab === 'pending') return g.status === 'pending';
        if (activeTab === 'achieved') return g.status === 'achieved';
        if (activeTab === 'savings') return g.status === 'savings';
        return true;
    }).filter(g => selectedCategory === 'All' || g.category === selectedCategory);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            Alert.alert("Error", "Please enter a goal title.");
            return;
        }

        try {
            await createGoal({
                userId,
                title: newTitle,
                description: newDesc,
                category: newCat,
                status: isSavingsGoal ? 'savings' : 'pending',
                weblink: newWeblink || undefined,
                targetCost: newCost ? parseFloat(newCost) : undefined,
                deadline: newDeadline,
                startDate: new Date().toISOString(),
            });
            setShowAddModal(false);
            resetForm();
            Alert.alert("Success", "Goal added successfully!");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to add goal.");
        }
    };

    const resetForm = () => {
        setNewTitle('');
        setNewDesc('');
        setNewCat('Personal');
        setNewWeblink('');
        setNewCost('');
        setNewDeadline(new Date().toISOString().split('T')[0]);
        setIsSavingsGoal(false);
    };

    const handleAchieve = async (goalId: Id<"lifeGoals">) => {
        await updateGoal({
            goalId,
            updates: {
                status: 'achieved',
                completedAt: new Date().toISOString(),
            }
        });
        // Trigger celebration or toast?
        Alert.alert("Congratulations!", "You've achieved a life goal! 🎉");
    };

    const handleDelete = (goalId: Id<"lifeGoals">) => {
        Alert.alert("Delete Goal", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteGoal({ goalId }) }
        ]);
    };

    const insets = useSafeAreaInsets();

    return (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: 20 }]}>
                    <Text style={styles.headerTitle}>Life Goals</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'savings' && styles.activeTab]}
                        onPress={() => setActiveTab('savings')}
                    >
                        <Text style={[styles.tabText, activeTab === 'savings' && styles.activeTabText]}>Savings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'achieved' && styles.activeTab]}
                        onPress={() => setActiveTab('achieved')}
                    >
                        <Text style={[styles.tabText, activeTab === 'achieved' && styles.activeTabText]}>Achieved</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilter} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Goals List */}
                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
                    {filteredGoals?.map(goal => (
                        <View key={goal._id} style={styles.goalCard}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.tag, { backgroundColor: getCategoryColor(goal.category) + '20' }]}>
                                    <Text style={[styles.tagText, { color: getCategoryColor(goal.category) }]}>{goal.category}</Text>
                                </View>
                                {goal.status !== 'achieved' && (
                                    <TouchableOpacity onPress={() => handleDelete(goal._id)}>
                                        <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={styles.goalTitle}>{goal.title}</Text>
                            {goal.description && <Text style={styles.goalDesc}>{goal.description}</Text>}

                            <View style={styles.metaRow}>
                                {goal.targetCost && (
                                    <View style={styles.metaItem}>
                                        <Ionicons name="cash-outline" size={14} color="#64748b" />
                                        <Text style={styles.metaText}>${goal.targetCost.toLocaleString()}</Text>
                                    </View>
                                )}
                                {goal.deadline && (
                                    <View style={styles.metaItem}>
                                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                                        <Text style={styles.metaText}>{new Date(goal.deadline).toLocaleDateString()}</Text>
                                    </View>
                                )}
                                {goal.weblink && (
                                    <TouchableOpacity style={styles.metaItem} onPress={() => Linking.openURL(goal.weblink!)}>
                                        <Ionicons name="link-outline" size={14} color="#3b82f6" />
                                        <Text style={[styles.metaText, { color: '#3b82f6' }]}>Link</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {goal.status !== 'achieved' && (
                                <TouchableOpacity style={styles.actionButton} onPress={() => handleAchieve(goal._id)}>
                                    <Text style={styles.actionButtonText}>Mark Achieved</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    {(!filteredGoals || filteredGoals.length === 0) && (
                        <View style={styles.emptyState}>
                            <Ionicons name="flag-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No goals found. Add one!</Text>
                        </View>
                    )}
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add" size={30} color="#fff" />
                </TouchableOpacity>

                {/* Add Modal */}
                <Modal visible={showAddModal} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Life Goal</Text>
                                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                    <Ionicons name="close" size={24} color="#1e293b" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={{ padding: 20 }}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput style={styles.input} placeholder="e.g. Visit Japan" value={newTitle} onChangeText={setNewTitle} />

                                <Text style={styles.label}>Category</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.catChip, newCat === cat && styles.catChipActive]}
                                            onPress={() => setNewCat(cat)}
                                        >
                                            <Text style={[styles.catChipText, newCat === cat && styles.catChipTextActive]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.label}>Type</Text>
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                    <TouchableOpacity
                                        style={[styles.typeButton, !isSavingsGoal && styles.typeButtonActive]}
                                        onPress={() => setIsSavingsGoal(false)}
                                    >
                                        <Text style={[styles.typeText, !isSavingsGoal && styles.typeTextActive]}>Standard Goal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeButton, isSavingsGoal && styles.typeButtonActive]}
                                        onPress={() => setIsSavingsGoal(true)}
                                    >
                                        <Text style={[styles.typeText, isSavingsGoal && styles.typeTextActive]}>Savings Goal</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Target Cost (Optional)</Text>
                                <TextInput style={styles.input} placeholder="$0.00" keyboardType="numeric" value={newCost} onChangeText={setNewCost} />

                                <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    value={newDeadline}
                                    onChangeText={setNewDeadline}
                                />

                                <Text style={styles.label}>Web Link (Optional)</Text>
                                <TextInput style={styles.input} placeholder="https://..." value={newWeblink} onChangeText={setNewWeblink} autoCapitalize="none" />

                                <Text style={styles.label}>Description (Optional)</Text>
                                <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Details..." value={newDesc} onChangeText={setNewDesc} />

                                <TouchableOpacity style={styles.mainButton} onPress={handleCreate}>
                                    <Text style={styles.mainButtonText}>Create Goal</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

function getCategoryColor(cat: string) {
    switch (cat) {
        case 'Work': return '#3b82f6';
        case 'Travel': return '#f59e0b';
        case 'Health': return '#10b981';
        case 'Personal': return '#8b5cf6';
        default: return '#64748b';
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    closeButton: { padding: 4 },

    tabsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#e2e8f0' },
    activeTab: { backgroundColor: '#1e293b' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    activeTabText: { color: '#fff' },

    catFilter: { maxHeight: 50, marginBottom: 10 },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
    catChipActive: { backgroundColor: '#f1f5f9', borderColor: '#94a3b8' },
    catChipText: { fontSize: 12, color: '#64748b' },
    catChipTextActive: { color: '#1e293b', fontWeight: '600' },

    content: { flex: 1, padding: 20 },
    goalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    goalTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
    goalDesc: { fontSize: 14, color: '#64748b', marginBottom: 12 },
    metaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#64748b' },
    actionButton: { backgroundColor: '#f1f5f9', paddingVertical: 8, borderRadius: 8, alignItems: 'center', padding: 8 },
    actionButtonText: { color: '#1e293b', fontWeight: '600', fontSize: 12 },

    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#94a3b8', marginTop: 12 },

    fab: { position: 'absolute', bottom: 30, right: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
    modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },

    typeButton: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    typeButtonActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
    typeText: { color: '#64748b' },
    typeTextActive: { color: '#2563eb', fontWeight: '600' },

    dateButton: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    mainButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 30, marginBottom: 40 },
    mainButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
