import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Clipboard
} from 'react-native';
import {
    Upload,
    File,
    Trash2,
    Copy,
    Search,
    Image as ImageIcon,
    Film,
    Music,
    FileText,
    Folder
} from 'lucide-react-native';

// NOTE: This is a placeholder UI for R2 Media Management
// Actual R2 operations would require backend integration via Convex mutations

export default function MediaManager() {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [uploading, setUploading] = useState(false);

    // Placeholder data - In production, this would come from Convex query to R2 bucket list
    const mediaItems = [
        {
            id: '1',
            name: 'hero-banner.jpg',
            type: 'image',
            url: 'https://pub-your-r2-account.r2.dev/assets/hero-banner.jpg',
            size: '2.4 MB',
            uploadedAt: '2024-01-15'
        },
        {
            id: '2',
            name: 'meditation-audio.mp3',
            type: 'audio',
            url: 'https://pub-your-r2-account.r2.dev/assets/meditation-audio.mp3',
            size: '8.1 MB',
            uploadedAt: '2024-01-14'
        },
        {
            id: '3',
            name: 'workout-video.mp4',
            type: 'video',
            url: 'https://pub-your-r2-account.r2.dev/assets/workout-video.mp4',
            size: '45.3 MB',
            uploadedAt: '2024-01-13'
        }
    ];

    const categories = [
        { id: 'all', label: 'All Assets', icon: Folder },
        { id: 'image', label: 'Images', icon: ImageIcon },
        { id: 'video', label: 'Videos', icon: Film },
        { id: 'audio', label: 'Audio', icon: Music },
        { id: 'document', label: 'Documents', icon: FileText },
    ];

    const handleCopyUrl = (url: string, name: string) => {
        Clipboard.setString(url);
        Alert.alert('Copied!', `URL for "${name}" copied to clipboard`);
    };

    const handleUpload = () => {
        Alert.alert(
            'Upload to R2',
            'To upload files to Cloudflare R2:\n\n1. Use the Cloudflare dashboard or wrangler CLI\n2. Upload to your R2 bucket\n3. Files will auto-sync here\n4. Copy URLs to use in recipes, meditations, workouts, etc.',
            [{ text: 'Got it' }]
        );
    };

    const handleDelete = (name: string) => {
        Alert.alert(
            'Delete Asset',
            `Remove "${name}" from R2 storage? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => Alert.alert('Info', 'R2 deletion requires backend integration via Convex mutations')
                }
            ]
        );
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'image': return ImageIcon;
            case 'video': return Film;
            case 'audio': return Music;
            default: return FileText;
        }
    };

    const filteredItems = mediaItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Media Library</Text>
                    <Text style={styles.subtitle}>Manage R2 assets for recipes, meditations, workouts</Text>
                </View>
                <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                    <Upload color="#ffffff" size={20} />
                    <Text style={styles.uploadButtonText}>Upload to R2</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search assets..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    const Icon = cat.icon;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Icon size={16} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                            <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Media Grid */}
            <ScrollView style={styles.content} contentContainerStyle={styles.mediaGrid}>
                {filteredItems.map((item) => {
                    const Icon = getIcon(item.type);
                    return (
                        <View key={item.id} style={styles.mediaCard}>
                            <View style={styles.mediaIconWrap}>
                                <Icon size={28} color="#64748b" />
                            </View>
                            <View style={styles.mediaInfo}>
                                <Text style={styles.mediaName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.mediaSize}>{item.size} • {item.uploadedAt}</Text>
                                <View style={styles.urlContainer}>
                                    <Text style={styles.urlText} numberOfLines={1}>{item.url}</Text>
                                </View>
                            </View>
                            <View style={styles.mediaActions}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => handleCopyUrl(item.url, item.name)}
                                >
                                    <Copy size={18} color="#2563eb" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => handleDelete(item.name)}
                                >
                                    <Trash2 size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>📦 How to use R2 Media</Text>
                    <Text style={styles.infoText}>
                        1. Upload assets to your Cloudflare R2 bucket via dashboard or CLI{'\n'}
                        2. Files appear here automatically{'\n'}
                        3. Click Copy to get the R2 URL{'\n'}
                        4. Paste URL into Recipes, Meditations, Workouts admin forms{'\n'}
                        5. Assets load directly from R2 CDN in the app
                    </Text>
                    <Text style={styles.infoFooter}>
                        💡 No need to store large files in the repo!
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    uploadButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    categoryScroll: {
        paddingHorizontal: 24,
        marginBottom: 16,
        maxHeight: 50,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginRight: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    categoryChipActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#2563eb',
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    categoryChipTextActive: {
        color: '#2563eb',
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    mediaGrid: {
        padding: 24,
        paddingTop: 0,
        gap: 12,
    },
    mediaCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        gap: 16,
    },
    mediaIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaInfo: {
        flex: 1,
    },
    mediaName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    mediaSize: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 6,
    },
    urlContainer: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    urlText: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    mediaActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    infoBox: {
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#fef3c7',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#92400e',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#78350f',
        lineHeight: 22,
        marginBottom: 12,
    },
    infoFooter: {
        fontSize: 13,
        fontWeight: '700',
        color: '#b45309',
    },
});
