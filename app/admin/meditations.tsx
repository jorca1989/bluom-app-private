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
import { Image } from 'expo-image';
import {
    Plus,
    Clock,
    Play,
    X,
    FilePen,
    Video,
    Music,
    Image as ImageIcon,
    Filter,
    Search,
} from 'lucide-react-native';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { MEDITATION_FILTERS } from '@/constants/meditationFilters';
import { R2_CONFIG } from '@/utils/r2Config';

export default function MeditationsManager() {
    const { t } = useTranslation();
    const { user } = useUser();

    const sessions = useQuery(api.meditation.getSessions, {});
    const createSession = useMutation(api.admin.createMeditationSession);
    const updateSession = useMutation(api.admin.updateMeditationSession);
    const deleteSession = useMutation(api.admin.deleteMeditationSession);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const emptyForm = {
        title: '',
        filters: [MEDITATION_FILTERS[0].id] as string[],
        duration: '10',
        description: '',
        audioUrl: '',
        videoUrl: '',
        coverImage: '',
        coverImageLandscape: '',
        status: 'published',
        isPremium: false,
        isFeatured: false,
        type: 'meditation' as 'meditation' | 'soundscape',
    };

    const [form, setForm] = useState(emptyForm);
    const [filterCat, setFilterCat] = useState('All');
    const [filterType, setFilterType] = useState('All'); // meditation | soundscape | All
    const [filterTier, setFilterTier] = useState('All'); // All | Pro | Free
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const allItems = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);

    const items = useMemo(() => {
        const searchQ = search.toLowerCase();
        return allItems.filter((s: any) => {
            const matchSearch = !searchQ || s.title?.toLowerCase().includes(searchQ) || s.description?.toLowerCase().includes(searchQ);
            const catOk = filterCat === 'All' || s.category === filterCat || (s.tags ?? []).includes(filterCat);
            const typeOk = filterType === 'All' || s.type === filterType;
            const tierOk = filterTier === 'All' || (filterTier === 'Pro' ? s.isPremium : !s.isPremium);
            return matchSearch && catOk && typeOk && tierOk;
        });
    }, [allItems, search, filterCat, filterType, filterTier]);

    const resetForm = () => { setForm(emptyForm); setSelectedSession(null); };

    const handleEdit = (session: any) => {
        setSelectedSession(session);
        setForm({
            title: session.title,
            filters: [session.category, ...(session.tags || [])].filter(Boolean),
            duration: String(session.duration || 10),
            description: session.description || '',
            audioUrl: session.audioUrl || '',
            videoUrl: session.videoUrl || '',
            coverImage: session.coverImage || '',
            coverImageLandscape: session.coverImageLandscape || '',
            status: session.status || 'published',
            isPremium: session.isPremium || false,
            isFeatured: session.isFeatured || false,
            type: session.type || 'meditation',
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const title = form.title.trim();
            const primaryCategory = form.filters[0] || 'uncategorized';
            const secondaryTags = form.filters.slice(1);
            const duration = Number(form.duration || 0);
            const description = form.description.trim();
            
            if (!title) {
                Alert.alert('Missing field', 'Title is required.');
                return;
            }
            if (form.type === 'meditation' && form.filters.length === 0) {
                Alert.alert('Missing fields', 'At least one Category/Tag is required for meditations.');
                return;
            }
            if (form.type === 'meditation' && !duration) {
                Alert.alert('Missing duration', 'Duration is required for meditations.');
                return;
            }
            
            const commonArgs = {
                title, 
                category: form.type === 'soundscape' ? 'soundscape' : primaryCategory, 
                duration: form.type === 'soundscape' ? 0 : duration, 
                description,
                audioUrl: form.audioUrl.trim() || undefined,
                videoUrl: form.videoUrl.trim() || undefined,
                coverImage: form.coverImage.trim() || undefined,
                coverImageLandscape: form.coverImageLandscape.trim() || undefined,
                tags: form.type === 'soundscape' ? [] : secondaryTags,
                status: form.status,
                isPremium: !!form.isPremium,
                isFeatured: !!form.isFeatured,
                type: form.type,
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
        Alert.alert(t('admin.deleteSession', 'Delete Session'), t('admin.deleteConfirm', 'Are you sure you want to delete "{{title}}"?', { title }), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('admin.delete', 'Delete'), style: 'destructive',
                onPress: async () => {
                    try { await deleteSession({ sessionId }); }
                    catch { Alert.alert(t('common.error', 'Error'), t('admin.errorDelete', 'Failed to delete session')); }
                },
            },
        ]);
    };

    const hasVideo = (item: any) => !!(item.videoUrl);
    const hasAudio = (item: any) => !!(item.audioUrl);

    const renderMeditation = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handleEdit(item)}>
            {item.coverImage ? (
                <Image
                    source={{ uri: item.coverImage }}
                    style={styles.coverThumb}
                    contentFit="cover"
                    transition={300}
                />
            ) : (
                <View style={[styles.coverThumb, styles.iconBox]}>
                    <Text style={{ fontSize: 22 }}>{MEDITATION_FILTERS.find(c => c.id === item.category)?.emoji || '🧘'}</Text>
                </View>
            )}
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.medTitle} numberOfLines={1}>{t(`db.${item.title?.replace(/\s+/g, '')}`, item.title) as string}</Text>
                    <Text style={[styles.catBadge, { color: MEDITATION_FILTERS.find(c => c.id === item.category)?.color ?? '#8b5cf6' }]}>
                        {(t(`wellness.meditationHub.categories.${item.category}`, MEDITATION_FILTERS.find(c => c.id === item.category)?.name ?? item.category) as string).toUpperCase()}
                    </Text>
                </View>
                {item.tags && item.tags.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        {item.tags.map((tg: string) => (
                            <Text key={tg} style={{ fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, overflow: 'hidden' }}>
                                {t(`wellness.meditationHub.categories.${tg}`, tg) as string}
                            </Text>
                        ))}
                    </ScrollView>
                )}
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#94a3b8" />
                        <Text style={styles.metaText}>{Number(item.duration ?? 0)} {t('common.minShort', 'min')}</Text>
                    </View>
                    {/* Media type indicators */}
                    {hasVideo(item) && (
                        <View style={styles.metaItem}>
                            <Video size={12} color="#6366f1" />
                            <Text style={[styles.metaText, { color: '#6366f1' }]}>{t('admin.video', 'Video')}</Text>
                        </View>
                    )}
                    {hasAudio(item) && !hasVideo(item) && (
                        <View style={styles.metaItem}>
                            <Music size={12} color="#3b82f6" />
                            <Text style={[styles.metaText, { color: '#3b82f6' }]}>{t('admin.audio', 'Audio')}</Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <Play size={10} color="#94a3b8" />
                        <Text style={styles.metaText}>{item.isPremium ? t('common.pro', 'PRO') : t('common.free', 'Free')}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.actionBtn}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {item.status === 'draft' && (
                        <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b' }}>{t('admin.draft', 'DRAFT')}</Text>
                        </View>
                    )}
                    {item.isFeatured && (
                        <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#d97706' }}>✦ {t('admin.featured', 'FEATURED')}</Text>
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
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Meditations Hub</Text>
                    <Text style={styles.subtitle}>Curate audio & video wellness sessions</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={{ padding: 6 }}>
                        <Search size={20} color={showSearch ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ padding: 6 }}>
                        <Filter size={20} color={(filterCat !== 'All' || filterType !== 'All' || filterTier !== 'All' || showFilters) ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                        <Plus color="#ffffff" size={20} />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {showSearch && (
                <View style={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('admin.searchSessions', 'Search sessions...')}
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* ── Filters Drawer ── */}
            {showFilters && (
                <View style={styles.filterBlock}>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>{t('admin.type', 'TYPE')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                        {['All', 'meditation', 'soundscape'].map(ty => (
                            <TouchableOpacity key={ty} style={[styles.fPill, filterType === ty && styles.fPillActive]} onPress={() => setFilterType(ty)}>
                                <Text style={[styles.fPillTxt, filterType === ty && styles.fPillTxtActive]}>{ty === 'All' ? t('admin.all', 'All') : t(`admin.${ty}`, ty).charAt(0).toUpperCase() + t(`admin.${ty}`, ty).slice(1)}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>{t('admin.tier', 'TIER')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                        {['All', 'Pro', 'Free'].map(ti => (
                            <TouchableOpacity key={ti} style={[styles.fPill, filterTier === ti && styles.fPillActive]} onPress={() => setFilterTier(ti)}>
                                <Text style={[styles.fPillTxt, filterTier === ti && styles.fPillTxtActive]}>{t(`admin.${ti.toLowerCase()}`, ti)}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>{t('admin.category', 'CATEGORY')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                        <TouchableOpacity style={[styles.fPill, filterCat === 'All' && styles.fPillCatActive]} onPress={() => setFilterCat('All')}>
                            <Text style={[styles.fPillTxt, filterCat === 'All' && styles.fPillTxtActive]}>{t('admin.all', 'All')}</Text>
                        </TouchableOpacity>
                        {MEDITATION_FILTERS.map(f => (
                            <TouchableOpacity key={f.id} style={[styles.fPill, filterCat === f.id && { backgroundColor: f.color, borderColor: f.color }]} onPress={() => setFilterCat(filterCat === f.id ? 'All' : f.id)}>
                                <Text style={[styles.fPillTxt, filterCat === f.id && styles.fPillTxtActive]}>{f.emoji} {t(`wellness.meditationHub.categories.${f.id}`, f.name)}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', paddingHorizontal: 4 }}>{items.length} {t('admin.sessions', 'sessions')}</Text>
                </View>
            )}

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
                                <Text style={styles.summaryLabel}>{t('admin.total', 'Total')}</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.isPremium).length}</Text>
                                <Text style={styles.summaryLabel}>{t('common.pro', 'Pro')}</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.videoUrl).length}</Text>
                                <Text style={styles.summaryLabel}>{t('admin.video', 'Video')}</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryVal}>{items.filter((i: any) => i.audioUrl && !i.videoUrl).length}</Text>
                                <Text style={styles.summaryLabel}>{t('admin.audio', 'Audio')}</Text>
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
                        <Text style={styles.modalTitle}>{selectedSession ? t('admin.editSession', 'Edit Session') : t('admin.newSession', 'New Session')}</Text>
                        <TouchableOpacity onPress={handleSave}><Text style={styles.modalSave}>{t('admin.save', 'Save')}</Text></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">

                        <Text style={styles.label}>{t('admin.type', 'Type')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                            {['meditation', 'soundscape'].map(ty => (
                                <TouchableOpacity
                                    key={ty}
                                    style={[styles.typeOption, form.type === ty && styles.typeOptionActive]}
                                    onPress={() => setForm(p => ({ ...p, type: ty as any }))}
                                >
                                    <Text style={[styles.typeText, form.type === ty && styles.typeTextActive]}>
                                        {t(`admin.${ty}`, ty).charAt(0).toUpperCase() + t(`admin.${ty}`, ty).slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>{t('admin.titleLabel', 'Title')}</Text>
                        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} placeholder={t('admin.titlePlaceholder', 'e.g. Deep Sleep Journey')} />

                        {form.type === 'meditation' && (
                            <>
                                <Text style={styles.label}>{t('admin.categoriesTags', 'Categories & Tags')}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {MEDITATION_FILTERS.map(filter => {
                                        const sel = form.filters.includes(filter.id);
                                        return (
                                            <TouchableOpacity
                                                key={filter.id}
                                                onPress={() => setForm(p => ({ ...p, filters: sel ? p.filters.filter(t => t !== filter.id) : [...p.filters, filter.id] }))}
                                                style={{ borderWidth: 1, borderColor: sel ? filter.color : '#e2e8f0', backgroundColor: sel ? `${filter.color}15` : '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                            >
                                                <Text>{filter.emoji}</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? filter.color : '#64748b' }}>{t(`wellness.meditationHub.categories.${filter.id}`, filter.name)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {form.type === 'meditation' && (
                            <>
                                <Text style={styles.label}>{t('admin.durationMinutes', 'Duration (minutes)')}</Text>
                                <TextInput style={styles.input} value={form.duration} onChangeText={t => setForm(p => ({ ...p, duration: t }))} keyboardType="numeric" placeholder="10" />
                            </>
                        )}

                        <Text style={styles.label}>{t('admin.description', 'Description')} {form.type === 'soundscape' && t('admin.optional', '(Optional)')}</Text>
                        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} placeholder={t('admin.descriptionPlaceholder', 'What this session helps with...')} />

                        {/* Audio URL */}
                        <View style={styles.mediaSection}>
                            <View style={styles.mediaSectionHeader}>
                                <Music size={16} color="#3b82f6" />
                                <Text style={[styles.label, { margin: 0, color: '#3b82f6' }]}>{t('admin.audioUrlLabel', 'Audio URL (MP3 / AAC)')}</Text>
                            </View>
                            <TextInput style={styles.input} value={form.audioUrl} onChangeText={t => setForm(p => ({ ...p, audioUrl: t }))} placeholder={`${R2_CONFIG.generalBaseUrl}/meditations/track.mp3`} autoCapitalize="none" keyboardType="url" />
                        </View>

                        {/* Video URL — NEW */}
                        <View style={[styles.mediaSection, { borderColor: '#6366f1' }]}>
                            <View style={styles.mediaSectionHeader}>
                                <Video size={16} color="#6366f1" />
                                <Text style={[styles.label, { margin: 0, color: '#6366f1' }]}>{t('admin.videoUrlLabel', 'Video URL (MP4)')}</Text>
                                <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1' }}>NEW</Text>
                                </View>
                            </View>
                            <TextInput
                                style={styles.input}
                                value={form.videoUrl}
                                onChangeText={t => setForm(p => ({ ...p, videoUrl: t }))}
                                placeholder={`${R2_CONFIG.workoutBaseUrl}/meditations/video.mp4`}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                {t('admin.videoUrlHint', 'Supports Cloudflare R2 (.mp4/.webm) and YouTube links (watch, youtu.be, embed). Video takes priority over cover image in the player.')}
                            </Text>
                        </View>

                        <Text style={styles.label}>{t('admin.coverImageSquare', 'Cover Image Square URL')}</Text>
                        <TextInput style={styles.input} value={form.coverImage} onChangeText={t => setForm(p => ({ ...p, coverImage: t }))} placeholder={`${R2_CONFIG.generalBaseUrl}/meditations/square.png`} autoCapitalize="none" keyboardType="url" />

                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.label, { marginTop: 0 }]}>{t('admin.coverImageLandscape', 'Cover Image Landscape URL')}</Text>
                            <TextInput style={styles.input} value={form.coverImageLandscape} onChangeText={t => setForm(p => ({ ...p, coverImageLandscape: t }))} placeholder={`${R2_CONFIG.generalBaseUrl}/meditations/landscape.png`} autoCapitalize="none" keyboardType="url" />
                            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{t('admin.landscapeHint', 'Used exclusively for the massive Recommended/Featured hero card in the Hub.')}</Text>
                        </View>

                        <Text style={styles.label}>{t('admin.visibility', 'Visibility')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {['published', 'draft'].map(st => (
                                <TouchableOpacity
                                    key={st}
                                    style={[styles.typeOption, form.status === st && styles.typeOptionActive]}
                                    onPress={() => setForm(p => ({ ...p, status: st }))}
                                >
                                    <Text style={[styles.typeText, form.status === st && styles.typeTextActive]}>
                                        {t(`admin.${st}`, st).charAt(0).toUpperCase() + t(`admin.${st}`, st).slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            <Text style={{ fontWeight: '800', color: '#64748b', textTransform: 'uppercase', fontSize: 13 }}>{t('admin.proOnly', 'Pro only')}</Text>
                            <Switch value={form.isPremium} onValueChange={v => setForm(p => ({ ...p, isPremium: v }))} trackColor={{ true: '#2563eb' }} />
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 40 }}>
                            <View>
                                <Text style={{ fontWeight: '800', color: '#64748b', textTransform: 'uppercase', fontSize: 13 }}>{t('admin.featuredLabel', 'Featured ✨')}</Text>
                                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t('admin.featuredHint', 'Pin to the swipable Featured carousel at top of Hub')}</Text>
                            </View>
                            <Switch value={form.isFeatured} onValueChange={v => setForm(p => ({ ...p, isFeatured: v }))} trackColor={{ true: '#f59e0b' }} />
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
    subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 24, paddingHorizontal: 16, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    list: { padding: 24, paddingTop: 0, gap: 12 },
    statsSummary: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    summaryBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    summaryVal: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, marginBottom: 10 },
    coverThumb: { width: 64, height: 64, borderRadius: 14 },
    iconBox: { backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
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

    // Filters
    filterBlock: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    filterRow: { gap: 6 },
    filterLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    pillRow: { flexDirection: 'row', gap: 6, paddingRight: 32 },
    fPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    fPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    fPillCatActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    fPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    fPillTxtActive: { color: '#ffffff' },
});
