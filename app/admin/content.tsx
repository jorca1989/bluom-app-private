import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    FileText,
    HelpCircle,
    Shield,
    Plus,
    MoreVertical,
    Calendar,
    MessageSquare,
    Image as ImageIcon
} from 'lucide-react-native';

const TabButton = ({ label, icon: Icon, active, onPress }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={[styles.tabButton, active && styles.tabButtonActive]}
    >
        <Icon size={18} color={active ? '#2563eb' : '#64748b'} />
        <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export default function ContentCMS() {
    const [activeTab, setActiveTab] = useState('blog');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const articles = useQuery(api.admin.getArticles);
    const createArticle = useMutation(api.admin.createArticle);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('Wellness');

    const handleCreateArticle = async () => {
        if (!title || !content) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            await createArticle({
                title,
                content,
                category,
                slug: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                status: 'PUBLISHED',
            });
            setIsModalOpen(false);
            setTitle('');
            setContent('');
            Alert.alert('Success', 'Article published successfully');
        } catch (err) {
            Alert.alert('Error', 'Failed to publish article');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Content Management</Text>
                    <Text style={styles.subtitle}>Articles, FAQs, and Documentation</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsModalOpen(true)}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>New Article</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TabButton label="Blog" icon={FileText} active={activeTab === 'blog'} onPress={() => setActiveTab('blog')} />
                <TabButton label="FAQs" icon={HelpCircle} active={activeTab === 'faqs'} onPress={() => setActiveTab('faqs')} />
                <TabButton label="Legal" icon={Shield} active={activeTab === 'legal'} onPress={() => setActiveTab('legal')} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {activeTab === 'blog' && (
                    <View style={styles.grid}>
                        {!articles ? (
                            <ActivityIndicator color="#2563eb" />
                        ) : articles.length === 0 ? (
                            <Text style={styles.emptyText}>No articles yet.</Text>
                        ) : (
                            articles.map((item) => (
                                <View key={item._id} style={styles.articleCard}>
                                    <View style={styles.articleImagePlaceholder}>
                                        <ImageIcon size={32} color="#cbd5e1" />
                                    </View>
                                    <View style={styles.articleInfo}>
                                        <View style={styles.articleMeta}>
                                            <Text style={styles.categoryBadge}>{item.category}</Text>
                                            <Text style={styles.statusBadge}>{item.status}</Text>
                                        </View>
                                        <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                                        <View style={styles.articleFooter}>
                                            <View style={styles.metaRow}>
                                                <Calendar size={12} color="#94a3b8" />
                                                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                            </View>
                                            <TouchableOpacity>
                                                <MoreVertical size={16} color="#94a3b8" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'faqs' && (
                    <View style={styles.card}>
                        <Text style={styles.placeholderText}>FAQ Manager loading...</Text>
                    </View>
                )}
            </ScrollView>

            {/* New Article Modal */}
            <Modal visible={isModalOpen} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Article</Text>
                        <TouchableOpacity onPress={handleCreateArticle}>
                            <Text style={styles.modalAction}>Publish</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalForm}>
                        <Text style={styles.label}>Article Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 5 Tips for Better Sleep"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Category</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Wellness"
                            value={category}
                            onChangeText={setCategory}
                        />

                        <Text style={styles.label}>Content (HTML/Markdown)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Write your content here..."
                            multiline
                            numberOfLines={10}
                            value={content}
                            onChangeText={setContent}
                            textAlignVertical="top"
                        />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tabButtonActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    tabButtonTextActive: {
        color: '#2563eb',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 0,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    articleCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    articleImagePlaceholder: {
        height: 160,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    articleInfo: {
        padding: 16,
    },
    articleMeta: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    categoryBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#10b981',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    articleTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        lineHeight: 22,
        marginBottom: 12,
    },
    articleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
        marginTop: 40,
    },
    card: {
        backgroundColor: '#ffffff',
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#94a3b8',
        fontWeight: '600',
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e293b',
    },
    modalCancel: {
        color: '#64748b',
        fontWeight: '600',
    },
    modalAction: {
        color: '#2563eb',
        fontWeight: '800',
    },
    modalForm: {
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    textArea: {
        height: 300,
    }
});
