import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import {
    Plus,
    Clock,
    Play,
    X,
    FilePen,
    Video,
    Music,
} from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function MeditationsManager() {
    const { user } = useUser();

    const sessions = useQuery(api.meditation.getSessions, {});
    const createSession = useMutation(api.admin.createMeditationSession);
    const updateSession = useMutation(api.admin.updateMeditationSession);
    const deleteSession = useMutation(api.admin.deleteMeditationSession);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const CATEGORIES = [
        { id: 'sleep', name: 'Better Sleep', emoji: '🌙', color: '#6366f1' },
        { id: 'morning', name: 'Morning Boost', emoji: '☀️', color: '#f59e0b' },
        { id: 'focus', name: 'Focus', emoji: '🎯', color: '#3b82f6' },
        { id: 'self-love', name: 'Self-Love', emoji: '💗', color: '#ec4899' },
        { id: 'anxiety', name: 'Anxiety Relief', emoji: '🛡️', color: '#10b981' },
        { id: 'sovereignty', name: 'Sovereignty & Power', emoji: '👑', color: '#b45309' },
        { id: 'strategic-mindset', name: 'Strategic Mindset', emoji: '🧠', color: '#7c3aed' },
        { id: 'breathwork', name: 'Breathwork', emoji: '💨', color: '#0d9488' },
    ];

    const TAGS = [
        'Biohacking', 'Stoicism', 'Psychology', 'Charisma', 'Modern Man',
        'Modern Woman', 'Shadow Work', 'Frame Control', 'Sleep', 'Anxiety',
        'Focus', 'Morning', 'Evening', 'Weight Loss', 'Muscle',
        'Machiavelli', 'Dark Psychology',
    ];

    const emptyForm = {
        title: '',
        category: CATEGORIES[0].id,
        duration: '10',
        description: '',
        audioUrl: '',
        videoUrl: '',   // ← NEW
        coverImage: '',
        tags: [] as string[],
        status: 'published',
        isPremium: false,
    };

    const [form, setForm] = useState(emptyForm);

    const items = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);

    const resetForm = () => { setForm(emptyForm); setSelectedSession(null); };

    const handleEdit = (session: any) => {
        setSelectedSession(session);
        setForm({
            title: session.title,
            category: session.category,
            duration: String(session.duration || 10),
            description: session.description || '',
            audioUrl: session.audioUrl || '',
            videoUrl: session.videoUrl || '',   // ← NEW
            coverImage: session.coverImage || '',
            tags: session.tags || [],
            status: session.status || 'published',
            isPremium: session.isPremium || false,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const title = form.title.trim();
            const category = form.category.trim();
            const duration = Number(form.duration || 0);
            const description = form.description.trim();
            if (!title || !category || !description || !duration) {
                Alert.alert('Missing fields', 'Title, category, duration, and description are required.');
                return;
            }
            const commonArgs = {
                title, category, duration, description,
                audioUrl: form.audioUrl.trim() || undefined,
                videoUrl: form.videoUrl.trim() || undefined,   // ← NEW
                coverImage: form.coverImage.trim() || undefined,
                tags: form.tags,
                status: form.status,
                isPremium: !!form.isPremium,
            };
            if (selectedSession) {
                await updateSession({ sessionId: selectedSession._id, ...commonArgs });
            } else {
                await createSession(commonArgs);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (e: any) {
            Alert.alert('Save failed', e?.message ?? 'Could not save session.');
        }
    };

    const handleDelete = (sessionId: any, title: string) => {
        Alert.alert('Delete Session', `Are you sure you want to delete "${title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try { await deleteSession({ sessionId }); }
                    catch { Alert.alert('Error', 'Failed to delete session'); }
                },
            },
        ]);
    };

    const hasVideo = (item: any) => !!(item.videoUrl);
    const hasAudio = (item: any) => !!(item.audioUrl);

    const renderMeditation = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handleEdit(item)}>
            <View style={styles.iconBox}>
                <Text style={{ fontSize: 24 }}>{CATEGORIES.find(c => c.id === item.category)?.emoji || '🧘'}</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.medTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.catBadge, { color: CATEGORIES.find(c => c.id === item.category)?.color ?? '#8b5cf6' }]}>
                        {(CATEGORIES.find(c => c.id === item.category)?.name ?? item.category).toUpperCase()}
                    </Text>
                </View>
                {item.tags && item.tags.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        {item.tags.map((t: string) => (
                            <Text key={t} style={{ fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, overflow: 'hidden' }}>
                                {t}
                            </Text>
                        ))}
                    </ScrollView>
                )}
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#94a3b8" />
                        <Text style={styles.metaText}>{Number(item.duration ?? 0)} min</Text>
                    </View>
                    {/* Media type indicators */}
                    {hasVideo(item) && (
                        <View style={styles.metaItem}>
                            <Video size={12} color="#6366f1" />
                            <Text style={[styles.metaText, { color: '#6366f1' }]}>Video</Text>
                        </View>
                    )}
                    {hasAudio(item) && !hasVideo(item) && (
                        <View style={styles.metaItem}>
                            <Music size={12} color="#3b82f6" />
                            <Text style={[styles.metaText, { color: '#3b82f6' }]}>Audio</Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <Play size={10} color="#94a3b8" />
                        <Text style={styles.metaText}>{item.isPremium ? 'PRO' : 'Free'}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.actionBtn}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {item.status === 'draft' && (
                        <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b' }}>DRAFT</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => handleEdit(item)}><FilePen size={20} color="#64748b" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id, item.title)}><X size={20} color="#ef4444" /></TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Meditations Hub</Text>
                    <Text style={styles.subtitle}>Curate audio & video wellness sessions</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Add Session</Text>
                </TouchableOpacity>
            </View>

            {!sessions ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderMeditation}
                    keyExtractor={item => String(item._id)}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <View style={styles.statsSummary}>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.length}</Text>
                                <Text style={styles.summaryLabel}>Total</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.isPremium).length}</Text>
                                <Text style={styles.summaryLabel}>Pro</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.videoUrl).length}</Text>
                                <Text style={styles.summaryLabel}>Video</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.audioUrl && !i.videoUrl).length}</Text>
                                <Text style={styles.summaryLabel}>Audio</Text>
                            </View>
                        </View>
                    }
                />
            )}

            {/* ── Edit / Create modal ── */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                        <Text style={styles.modalTitle}>{selectedSession ? 'Edit Session' : 'New Session'}</Text>
                        <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">

                        <Text style={styles.label}>Title</Text>
                        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} placeholder="e.g. Deep Sleep Journey" />

                        <Text style={styles.label}>Category</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setForm(p => ({ ...p, category: cat.id }))}
                                    style={{ borderWidth: 1, borderColor: form.category === cat.id ? cat.color : '#e2e8f0', backgroundColor: form.category === cat.id ? `${cat.color}15` : '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                >
                                    <Text>{cat.emoji}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: form.category === cat.id ? cat.color : '#64748b' }}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Tags</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {TAGS.map(tag => {
                                const sel = form.tags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        onPress={() => setForm(p => ({ ...p, tags: sel ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))}
                                        style={{ borderWidth: 1, borderColor: sel ? '#8b5cf6' : '#e2e8f0', backgroundColor: sel ? '#f5f3ff' : '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? '#8b5cf6' : '#64748b' }}>{tag}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Duration (minutes)</Text>
                        <TextInput style={styles.input} value={form.duration} onChangeText={t => setForm(p => ({ ...p, duration: t }))} keyboardType="numeric" placeholder="10" />

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} placeholder="What this session helps with..." />

                        {/* Audio URL */}
                        <View style={styles.mediaSection}>
                            <View style={styles.mediaSectionHeader}>
                                <Music size={16} color="#3b82f6" />
                                <Text style={[styles.label, { margin: 0, color: '#3b82f6' }]}>Audio URL (MP3 / AAC)</Text>
                            </View>
                            <TextInput style={styles.input} value={form.audioUrl} onChangeText={t => setForm(p => ({ ...p, audioUrl: t }))} placeholder="https://cdn.example.com/audio.mp3" autoCapitalize="none" keyboardType="url" />
                        </View>

                        {/* Video URL — NEW */}
                        <View style={[styles.mediaSection, { borderColor: '#6366f1' }]}>
                            <View style={styles.mediaSectionHeader}>
                                <Video size={16} color="#6366f1" />
                                <Text style={[styles.label, { margin: 0, color: '#6366f1' }]}>Video URL (MP4)</Text>
                                <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1' }}>NEW</Text>
                                </View>
                            </View>
                            <TextInput
                                style={styles.input}
                                value={form.videoUrl}
                                onChangeText={t => setForm(p => ({ ...p, videoUrl: t }))}
                                placeholder="https://pub-xxx.r2.dev/video.mp4  or  https://youtu.be/xxxxx"
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                Supports Cloudflare R2 (.mp4/.webm) and YouTube links (watch, youtu.be, embed). Video takes priority over cover image in the player.
                            </Text>
                        </View>

                        <Text style={styles.label}>Cover Image URL</Text>
                        <TextInput style={styles.input} value={form.coverImage} onChangeText={t => setForm(p => ({ ...p, coverImage: t }))} placeholder="https://..." autoCapitalize="none" keyboardType="url" />

                        <Text style={styles.label}>Visibility</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {['published', 'draft'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.typeOption, form.status === s && styles.typeOptionActive]}
                                    onPress={() => setForm(p => ({ ...p, status: s }))}
                                >
                                    <Text style={[styles.typeText, form.status === s && styles.typeTextActive]}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 }}>
                            <Text style={{ fontWeight: '800', color: '#64748b', textTransform: 'uppercase', fontSize: 13 }}>Pro only</Text>
                            <Switch value={form.isPremium} onValueChange={v => setForm(p => ({ ...p, isPremium: v }))} />
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
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    list: { padding: 24, paddingTop: 0, gap: 12 },
    statsSummary: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    summaryBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    summaryVal: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, marginBottom: 10 },
    iconBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, marginLeft: 14 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    medTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 6 },
    catBadge: { fontSize: 9, fontWeight: '900', backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
    actionBtn: { padding: 8 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    modalSave: { color: '#2563eb', fontWeight: '800', fontSize: 16 },
    modalForm: { padding: 24 },
    label: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    typeOption: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    typeOptionActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    typeText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    typeTextActive: { color: '#3b82f6' },

    // Media sections
    mediaSection: { marginTop: 20, borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 14, padding: 14 },
    mediaSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
});