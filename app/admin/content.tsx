import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  FileText, HelpCircle, Shield, Plus, Pencil, Trash2,
  Calendar, Image as ImageIcon, ChevronDown, ChevronUp, Bold,
  List, Heading1, RefreshCw,
} from 'lucide-react-native';
import { R2_CONFIG } from '@/utils/r2Config';

const CATEGORIES = ['Wellness', "Men's Health", "Women's Health", 'Nutrition', 'Fitness', 'Fasting', 'Hormones', 'Mental Health', 'Health'];
const LANGS = [
  { code: 'en', label: '🇬🇧 EN', required: true },
  { code: 'pt', label: '🇵🇹 PT', required: false },
  { code: 'es', label: '🇪🇸 ES', required: false },
  { code: 'fr', label: '🇫🇷 FR', required: false },
  { code: 'de', label: '🇩🇪 DE', required: false },
  { code: 'nl', label: '🇳🇱 NL', required: false },
];

const langKey = (base: string, code: string) =>
  code === 'en' ? base : `${base}${code.charAt(0).toUpperCase()}${code.slice(1)}`;

const TabButton = ({ label, icon: Icon, active, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
    <Icon size={18} color={active ? '#2563eb' : '#64748b'} />
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ── Accordion ──────────────────────────────────────────────
function AccordionSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={() => setOpen(o => !o)}>
        <Text style={styles.accordionTitle}>{title}</Text>
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ── Markdown Toolbar ───────────────────────────────────────
function MarkdownToolbar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const insert = (snippet: string) => onChange(value + (value && !value.endsWith('\n') ? '\n' : '') + snippet);
  return (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.toolbarBtn} onPress={() => insert('**Bold text**')}>
        <Bold size={14} color="#475569" />
        <Text style={styles.toolbarTxt}>Bold</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={() => insert('## Heading')}>
        <Heading1 size={14} color="#475569" />
        <Text style={styles.toolbarTxt}>H2</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={() => insert('• Item')}>
        <List size={14} color="#475569" />
        <Text style={styles.toolbarTxt}>Bullet</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={() => insert('\n---\n')}>
        <Text style={[styles.toolbarTxt, { fontSize: 16 }]}>—</Text>
        <Text style={styles.toolbarTxt}>HR</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Empty form factory ─────────────────────────────────────
const emptyForm = () => ({
  title: '', titlePt: '', titleEs: '', titleFr: '', titleDe: '', titleNl: '',
  content: '', contentPt: '', contentEs: '', contentFr: '', contentDe: '', contentNl: '',
  category: 'Wellness', featuredImage: '', status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT',
});

export default function ContentCMS() {
  const [activeTab, setActiveTab] = useState('blog');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [activeLang, setActiveLang] = useState('en');

  const articles = useQuery(api.admin.getArticles);
  const createArticle = useMutation(api.admin.createArticle);
  const updateArticle = useMutation(api.admin.updateArticle);
  const deleteArticle = useMutation(api.admin.deleteArticle);
  const legalDocs = useQuery(
    api.admin.getLegalDocuments,
    activeTab !== 'legal' ? 'skip' : {}
  );

  const setF = (key: keyof ReturnType<typeof emptyForm>) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const openNew = () => { setEditId(null); setForm(emptyForm()); setActiveLang('en'); setIsModalOpen(true); };
  const openEdit = (item: any) => {
    setEditId(item._id);
    setForm({
      title: item.title ?? '',
      titlePt: item.titlePt ?? '',
      titleEs: item.titleEs ?? '',
      titleFr: item.titleFr ?? '',
      titleDe: item.titleDe ?? '',
      titleNl: item.titleNl ?? '',
      content: item.content ?? '',
      contentPt: item.contentPt ?? '',
      contentEs: item.contentEs ?? '',
      contentFr: item.contentFr ?? '',
      contentDe: item.contentDe ?? '',
      contentNl: item.contentNl ?? '',
      category: item.category ?? 'Wellness',
      featuredImage: item.featuredImage ?? '',
      status: item.status ?? 'PUBLISHED',
    });
    setActiveLang('en');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Error', 'Title and content (EN) are required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      status: form.status,
      category: form.category,
      featuredImage: form.featuredImage.trim() || undefined,
      titlePt: form.titlePt.trim() || undefined,
      titleEs: form.titleEs.trim() || undefined,
      titleFr: form.titleFr.trim() || undefined,
      titleDe: form.titleDe.trim() || undefined,
      titleNl: form.titleNl.trim() || undefined,
      contentPt: form.contentPt.trim() || undefined,
      contentEs: form.contentEs.trim() || undefined,
      contentFr: form.contentFr.trim() || undefined,
      contentDe: form.contentDe.trim() || undefined,
      contentNl: form.contentNl.trim() || undefined,
    };
    try {
      if (editId) {
        await updateArticle({ articleId: editId as any, ...payload });
      } else {
        const slug = form.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        await createArticle({ slug, ...payload });
      }
      setIsModalOpen(false);
      Alert.alert('Saved', editId ? 'Article updated.' : 'Article published.');
    } catch (e) {
      Alert.alert('Error', 'Could not save article.');
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Article', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteArticle({ articleId: id as any }) },
    ]);
  };

  // ── Current lang content key helpers ──
  const titleKey = langKey('title', activeLang) as keyof ReturnType<typeof emptyForm>;
  const contentKey = langKey('content', activeLang) as keyof ReturnType<typeof emptyForm>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Content Management</Text>
          <Text style={styles.subtitle}>Blog posts, FAQs & Legal</Text>
        </View>
        {activeTab === 'blog' && (
          <TouchableOpacity style={styles.addButton} onPress={openNew}>
            <Plus color="#ffffff" size={20} />
            <Text style={styles.addButtonText}>New Post</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <TabButton label="Blog" icon={FileText} active={activeTab === 'blog'} onPress={() => setActiveTab('blog')} />
        <TabButton label="FAQs" icon={HelpCircle} active={activeTab === 'faqs'} onPress={() => setActiveTab('faqs')} />
        <TabButton label="Legal" icon={Shield} active={activeTab === 'legal'} onPress={() => setActiveTab('legal')} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Blog Tab ── */}
        {activeTab === 'blog' && (
          <>
            {!articles ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
            ) : articles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📭</Text>
                <Text style={styles.emptyText}>No articles yet. Tap "New Post" to start.</Text>
              </View>
            ) : (
              articles.map((item) => (
                <View key={item._id} style={styles.articleCard}>
                  {item.featuredImage ? (
                    <Image source={{ uri: item.featuredImage }} style={styles.articleImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.articleImagePlaceholder}><ImageIcon size={28} color="#cbd5e1" /></View>
                  )}
                  <View style={styles.articleInfo}>
                    <View style={styles.articleMeta}>
                      <Text style={styles.categoryBadge}>{item.category}</Text>
                      <Text style={[styles.statusBadge, item.status === 'PUBLISHED' && { color: '#10b981', backgroundColor: '#d1fae5' }]}>{item.status}</Text>
                    </View>
                    <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.articleFooter}>
                      <View style={styles.metaRow}>
                        <Calendar size={11} color="#94a3b8" />
                        <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => openEdit(item)}>
                          <Pencil size={15} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item._id, item.title)}>
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ── FAQs Tab ── */}
        {activeTab === 'faqs' && (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>FAQ Manager — coming soon.</Text>
          </View>
        )}

        {/* ── Legal Tab ── */}
        {activeTab === 'legal' && (
          !legalDocs ? (
            <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} />
          ) : legalDocs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📄</Text>
              <Text style={styles.emptyText}>No legal documents found in the database.</Text>
            </View>
          ) : (
            legalDocs.map((doc: any) => (
              <View key={doc._id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.legalDocTitle}>{doc.type === 'terms' ? '📜 Terms of Service' : '🔒 Privacy Policy'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={styles.legalVersion}>v{doc.version}</Text>
                    {doc.isActive && <View style={styles.legalActiveBadge}><Text style={styles.legalActiveTxt}>ACTIVE</Text></View>}
                  </View>
                </View>
                <Text style={styles.legalPreview} numberOfLines={3}>{doc.content}</Text>
                <Text style={styles.legalDate}>Updated: {new Date(doc.createdAt).toLocaleDateString()}</Text>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* ── Create / Edit Modal ── */}
      <Modal visible={isModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editId ? 'Edit Post' : 'New Post'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalAction}>{editId ? 'Update' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">

            {/* Status */}
            <Text style={styles.label}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['PUBLISHED', 'DRAFT'] as const).map(s => (
                <TouchableOpacity key={s} onPress={() => setForm(f => ({ ...f, status: s }))} style={[styles.statusPill, form.status === s && styles.statusPillActive]}>
                  <Text style={[styles.statusPillText, form.status === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, category: c }))} style={[styles.catPill, form.category === c && styles.catPillActive]}>
                  <Text style={[styles.catPillText, form.category === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Featured Image */}
            <Text style={styles.label}>🖼 Featured Image URL (R2)</Text>
            <TextInput
              style={styles.input}
              placeholder={`${R2_CONFIG.generalBaseUrl}/articles/cover.jpg`}
              value={form.featuredImage}
              onChangeText={setF('featuredImage')}
              autoCapitalize="none"
              keyboardType="url"
            />
            {form.featuredImage ? (
              <Image source={{ uri: form.featuredImage }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16 }} resizeMode="cover" />
            ) : null}

            {/* Language selector */}
            <Text style={styles.label}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {LANGS.map(l => (
                <TouchableOpacity key={l.code} onPress={() => setActiveLang(l.code)} style={[styles.catPill, activeLang === l.code && { backgroundColor: '#8b5cf6' }]}>
                  <Text style={[styles.catPillText, activeLang === l.code && { color: '#fff' }]}>{l.label}{l.required ? ' *' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title for active lang */}
            <Text style={styles.label}>Title ({activeLang.toUpperCase()}){activeLang === 'en' ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Article title in ${activeLang.toUpperCase()}`}
              value={(form as any)[titleKey] ?? ''}
              onChangeText={setF(titleKey)}
            />

            {/* Markdown toolbar + Content for active lang */}
            <Text style={styles.label}>Content ({activeLang.toUpperCase()}){activeLang === 'en' ? ' *' : ''}</Text>
            <Text style={styles.hint}>Supports: **Bold**, ## Heading, • Bullet</Text>
            <MarkdownToolbar
              value={(form as any)[contentKey] ?? ''}
              onChange={setF(contentKey)}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={`Write content in ${activeLang.toUpperCase()}...\n\n**Bold heading**\n• Bullet point\nParagraph text`}
              multiline
              value={(form as any)[contentKey] ?? ''}
              onChangeText={setF(contentKey)}
              textAlignVertical="top"
            />

            {/* Completion summary */}
            <View style={styles.langProgress}>
              {LANGS.map(l => {
                const hasTitle = !!((form as any)[langKey('title', l.code)] ?? '').trim();
                const hasContent = !!((form as any)[langKey('content', l.code)] ?? '').trim();
                const done = hasTitle && hasContent;
                return (
                  <TouchableOpacity key={l.code} onPress={() => setActiveLang(l.code)} style={[styles.langDot, { backgroundColor: done ? '#10b981' : l.required ? '#ef4444' : '#e2e8f0' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: done || l.required ? '#fff' : '#94a3b8' }}>{l.label.slice(0, 2)}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.langProgressTxt}>Tap to switch language</Text>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  tabButtonActive: { backgroundColor: '#eff6ff' },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabButtonTextActive: { color: '#2563eb' },

  scrollContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12 },
  placeholderText: { color: '#94a3b8', fontStyle: 'italic' },

  articleCard: { backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  articleImage: { width: 90, height: 90 },
  articleImagePlaceholder: { width: 90, height: 90, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  articleInfo: { flex: 1, padding: 12 },
  articleMeta: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  categoryBadge: { fontSize: 10, fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, textTransform: 'uppercase' },
  statusBadge: { fontSize: 10, fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  articleTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 18, marginBottom: 8 },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#94a3b8' },

  legalDocTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  legalVersion: { fontSize: 11, fontWeight: '700', color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  legalActiveBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  legalActiveTxt: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  legalPreview: { fontSize: 12, color: '#64748b', lineHeight: 18, marginTop: 8 },
  legalDate: { fontSize: 11, color: '#94a3b8', marginTop: 8 },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  modalCancel: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  modalAction: { fontSize: 15, color: '#2563eb', fontWeight: '800' },
  modalForm: { padding: 20 },

  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 6, marginTop: 4 },
  hint: { fontSize: 11, color: '#94a3b8', marginBottom: 6, marginTop: -4 },
  input: { backgroundColor: '#f8fafc', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 14, marginBottom: 8 },
  textArea: { height: 220, textAlignVertical: 'top' },

  toolbar: { flexDirection: 'row', gap: 6, marginBottom: 6, backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  toolbarTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },

  statusPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  statusPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusPillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  catPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  catPillActive: { backgroundColor: '#2563eb' },
  catPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },

  accordion: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#f8fafc' },
  accordionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  accordionBody: { padding: 14, backgroundColor: '#fff' },

  langProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  langDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  langProgressTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});
