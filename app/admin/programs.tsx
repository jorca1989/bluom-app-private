import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Switch,
    Image,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Plus,
    X,
    Trash2,
    Calendar,
    FileText,
    Headphones,
    ChevronDown,
    ChevronUp
} from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';

export default function ProgramManager() {
    const { user } = useUser();
    const canManage = true;

    const programs = useQuery(api.programs.getAll) || [];
    const createProgram = useMutation(api.programs.create);

    // We need meditations for the picker
    const meditations = useQuery(api.meditation.getSessions, {}) || [];
    // If we had articles, we'd query them too: const articles = useQuery(api.blog.getArticles) || [];

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        coverImage: '',
        tags: [] as string[],
        isPremium: false,
        contentList: [] as { day: number, type: 'meditation' | 'article' | 'exercise' | 'recipe', contentId: string }[]
    });

    const TAGS = [
        'Biohacking', 'Stoicism', 'Psychology', 'Charisma', 'Modern Man',
        'Modern Woman', 'Shadow Work', 'Frame Control', 'Weight Loss', 'Muscle'
    ];

    const resetForm = () => {
        setForm({
            title: '',
            description: '',
            coverImage: '',
            tags: [],
            isPremium: false,
            contentList: []
        });
    };

    const handleSave = async () => {
        if (!form.title || !form.description) {
            Alert.alert('Error', 'Title and description are required.');
            return;
        }

        try {
            await createProgram({
                title: form.title,
                description: form.description,
                coverImage: form.coverImage || undefined,
                tags: form.tags,
                isPremium: form.isPremium,
                contentList: form.contentList as any,
            });
            setIsModalOpen(false);
            resetForm();
            Alert.alert('Success', 'Program created successfully.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to create program.');
        }
    };

    const addDay = () => {
        const nextDay = form.contentList.length > 0
            ? Math.max(...form.contentList.map(c => c.day)) + 1
            : 1;

        setForm(p => ({
            ...p,
            contentList: [
                ...p.contentList,
                { day: nextDay, type: 'meditation', contentId: '' }
            ]
        }));
    };

    const updateDay = (index: number, field: string, value: any) => {
        const newList = [...form.contentList];
        newList[index] = { ...newList[index], [field]: value };
        setForm(p => ({ ...p, contentList: newList }));
    };

    const removeDay = (index: number) => {
        const newList = [...form.contentList];
        newList.splice(index, 1);
        setForm(p => ({ ...p, contentList: newList }));
    };

    const renderProgram = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.programTitle}>{item.title}</Text>
                    <Text style={styles.programDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.tagRow}>
                        {item.tags?.map((t: string) => (
                            <Text key={t} style={styles.tag}>{t}</Text>
                        ))}
                    </View>
                </View>
                {item.isPremium && <Text style={styles.premiumBadge}>PRO</Text>}
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.footerText}>{item.contentList?.length || 0} Days</Text>
            </View>
        </View>
    );

    if (!canManage) {
        return (
            <View style={styles.center}>
                <Text>Access Denied</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Program Manager</Text>
                    <Text style={styles.subtitle}>Create multi-day Master Plans</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus color="#fff" size={20} />
                    <Text style={styles.btnText}>New Program</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={programs}
                renderItem={renderProgram}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.list}
            />

            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Program</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formScroller}>
                        <Text style={styles.label}>Program Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 14-Day Alpha Reset"
                            value={form.title}
                            onChangeText={t => setForm(p => ({ ...p, title: t }))}
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            multiline
                            placeholder="Description..."
                            value={form.description}
                            onChangeText={t => setForm(p => ({ ...p, description: t }))}
                        />

                        <Text style={styles.label}>Cover Image URL</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https://..."
                            value={form.coverImage}
                            onChangeText={t => setForm(p => ({ ...p, coverImage: t }))}
                        />

                        <Text style={styles.label}>Tags</Text>
                        <View style={styles.tagContainer}>
                            {TAGS.map(tag => {
                                const selected = form.tags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.chip, selected && styles.chipSelected]}
                                        onPress={() => {
                                            if (selected) setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));
                                            else setForm(p => ({ ...p, tags: [...p.tags, tag] }));
                                        }}
                                    >
                                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Premium Only</Text>
                            <Switch value={form.isPremium} onValueChange={v => setForm(p => ({ ...p, isPremium: v }))} />
                        </View>

                        <View style={styles.divider} />
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Daily Schedule</Text>
                            <TouchableOpacity onPress={addDay} style={styles.smBtn}>
                                <Plus size={16} color="#2563eb" />
                                <Text style={styles.smBtnText}>Add Day</Text>
                            </TouchableOpacity>
                        </View>

                        {form.contentList.map((item, index) => (
                            <View key={index} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayTitle}>Day {item.day}</Text>
                                    <TouchableOpacity onPress={() => removeDay(index)}>
                                        <Trash2 size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.row}>
                                    {['meditation', 'article', 'exercise', 'recipe'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.typeBtn, item.type === type && styles.typeBtnActive]}
                                            onPress={() => updateDay(index, 'type', type)}
                                        >
                                            <Text style={item.type === type ? styles.whiteText : styles.grayText}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.pickerContainer}>
                                    <Text style={styles.pickerLabel}>{item.type.toUpperCase()} ID</Text>
                                    <TextInput
                                        style={styles.inputSm}
                                        placeholder={`Paste ${item.type} ID`}
                                        value={item.contentId}
                                        onChangeText={t => updateDay(index, 'contentId', t)}
                                    />
                                </View>
                            </View>
                        ))}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b' },
    addButton: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 12, borderRadius: 12, alignItems: 'center', gap: 6 },
    btnText: { color: '#fff', fontWeight: '600' },
    list: { padding: 24, paddingTop: 0, gap: 16 },

    card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    programTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
    programDesc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { fontSize: 10, backgroundColor: '#f1f5f9', color: '#475569', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    premiumBadge: { backgroundColor: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    cardFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    footerText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    saveText: { fontSize: 16, color: '#2563eb', fontWeight: 'bold' },
    formScroller: { padding: 20 },

    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', marginTop: 16 },
    input: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },
    inputSm: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },

    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    chipSelected: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    chipText: { fontSize: 13, color: '#64748b' },
    chipTextSelected: { color: '#2563eb', fontWeight: '600' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 24 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    smBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    smBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },

    dayCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayTitle: { fontWeight: 'bold', color: '#1e293b' },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#e2e8f0' },
    typeBtnActive: { backgroundColor: '#2563eb' },
    whiteText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    grayText: { color: '#64748b', fontSize: 12, fontWeight: '600' },

    pickerContainer: { gap: 4 },
    pickerLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' }
});
