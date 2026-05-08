import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import client from '@/utils/shopify';

interface ShopCollection {
    id: string;
    title: string;
    products: any[];
}

export default function ShopScreen() {
    const router = useRouter();
    const [collections, setCollections] = useState<ShopCollection[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null); // null = "All"
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            // Fetch all collections with their products
            const result = await (client.collection as any).fetchAllWithProducts();

            const parsed: ShopCollection[] = result
                .map((col: any) => ({
                    id: col.id,
                    title: col.title,
                    products: col.products ?? [],
                }))
                .filter((c: ShopCollection) => c.products.length > 0); // Hide empty collections

            setCollections(parsed);
        } catch (error) {
            console.error('Error fetching collections from Shopify:', error);
            // Fallback: fetch all products as a single "All" collection
            try {
                const products = await client.product.fetchAll();
                setCollections([{ id: '__all__', title: 'All', products: products as any[] }]);
            } catch (fallbackError) {
                console.error('Fallback product fetch failed:', fallbackError);
            }
        } finally {
            setLoading(false);
        }
    };

    // Derive the product list based on selection
    const allProducts = useMemo(() => {
        const seen = new Set<string>();
        const list: any[] = [];
        for (const col of collections) {
            for (const p of col.products) {
                const pid = String(p.id);
                if (!seen.has(pid)) {
                    seen.add(pid);
                    list.push(p);
                }
            }
        }
        return list;
    }, [collections]);

    const displayedProducts = useMemo(() => {
        if (!selectedId) return allProducts;
        const col = collections.find(c => c.id === selectedId);
        return col ? col.products : allProducts;
    }, [selectedId, collections, allProducts]);

    const openProduct = async (webUrl: string) => {
        if (webUrl) {
            await WebBrowser.openBrowserAsync(webUrl);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Shop...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>Bluom Shop</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Collection Pills */}
            {collections.length > 1 && (
                <View style={{ height: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pillBar}
                    >
                        <TouchableOpacity
                            style={[styles.pill, !selectedId && styles.pillActive]}
                            onPress={() => setSelectedId(null)}
                        >
                            <Ionicons name="grid-outline" size={14} color={!selectedId ? '#fff' : '#64748b'} />
                            <Text style={[styles.pillText, !selectedId && styles.pillTextActive]}>All</Text>
                        </TouchableOpacity>
                        {collections.map(col => {
                            const active = selectedId === col.id;
                            return (
                                <TouchableOpacity
                                    key={col.id}
                                    style={[styles.pill, active && styles.pillActive]}
                                    onPress={() => setSelectedId(col.id)}
                                >
                                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{col.title}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Products Grid */}
            <FlatList
                data={displayedProducts}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const image = item.images && item.images[0] ? item.images[0].src : null;
                    const variant = item.variants && item.variants[0];
                    const price = variant?.price?.amount ?? '—';
                    const currency = variant?.price?.currencyCode ?? '';

                    return (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => openProduct(item.onlineStoreUrl || item.webUrl)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.imageContainer}>
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.productImage, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.productTitle} numberOfLines={2}>{item.title ?? 'Untitled Product'}</Text>
                                <Text style={styles.productPrice}>{price} {currency}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="bag-handle-outline" size={48} color="#94a3b8" />
                        <Text style={styles.emptyText}>No products found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#f1f5f9' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },

    // Collection pills
    pillBar: { paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', gap: 8, flex: 1 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    pillText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    pillTextActive: { color: '#ffffff' },

    // Product grid
    listContent: { padding: 16 },
    row: { justifyContent: 'space-between' },
    card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
    imageContainer: { height: 160, width: '100%', backgroundColor: '#f8fafc' },
    productImage: { width: '100%', height: '100%' },
    cardBody: { padding: 12 },
    productTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4, height: 36 },
    productPrice: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#64748b', fontSize: 16 },
});
