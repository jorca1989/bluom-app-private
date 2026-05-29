import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Utensils, Plus, Search, Trash2, Edit3, X, Check, ShieldCheck } from 'lucide-react-native';
import { ADMIN_TRANSLATION_LANGUAGES } from '@/constants/adminLanguages';

export const ADMIN_COUNTRIES = [
  { code: '', label: '🌐 Global' },
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'BR', label: '🇧🇷 Brazil' },
  { code: 'AO', label: '🇦🇴 Angola' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'MX', label: '🇲🇽 Mexico' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'PL', label: '🇵🇱 Poland' },
  { code: 'BG', label: '🇧🇬 Bulgaria' },
  { code: 'DK', label: '🇩🇰 Denmark' },
  { code: 'GR', label: '🇬🇷 Greece' },
  { code: 'LT', label: '🇱🇹 Lithuania' },
  { code: 'LV', label: '🇱🇻 Latvia' },
  { code: 'NO', label: '🇳🇴 Norway' },
  { code: 'RO', label: '🇷🇴 Romania' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'TR', label: '🇹🇷 Turkey' },
  { code: 'CN', label: '🇨🇳 Chinese' },
  { code: 'JP', label: '🇯🇵 Japanese' },
  { code: 'IN', label: '🇮🇳 Indian' },
  { code: 'TH', label: '🇹🇭 Thai' },
  { code: 'VN', label: '🇻🇳 Vietnamese' },
  { code: 'ARAB', label: '🕌 Middle Eastern / Halal' },
  { code: 'IR', label: '🇮🇷 Persian' },
];

const PAGE_SIZE = 50;

const localizedEmptyFields = (prefix: string) => Object.fromEntries(
    ADMIN_TRANSLATION_LANGUAGES.map(({ code }) => [`${prefix}_${code}`, ''])
);

const EMPTY_FORM = {
    name: '',
    ...localizedEmptyFields('name'),
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    brand: '',
    barcode: '',
    servingSize: '100g',
    thumbnail: '',
    isVerified: true,
    countryCode: '',
};

export default function AdminFoodsScreen() {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFood, setEditingFood] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    // Queries
    const searchResults = useQuery(api.customFoods.searchLocalFoods, searchText.trim() ? { query: searchText.trim(), limit: 100 } : 'skip');
    const totalCount = useQuery(api.customFoods.getCount);

    // Mutations
    const logFood = useMutation(api.customFoods.logFood);
    const updateFood = useMutation(api.customFoods.updateFood);
    const deleteFood = useMutation(api.customFoods.deleteFood);

    // When not searching, we show items from search as "all"
    const allFoods = useQuery(api.customFoods.searchLocalFoods, !searchText.trim() ? { query: 'a', limit: 200 } : 'skip');

    const displayData = searchText.trim() ? searchResults : allFoods;
    const isLoading = displayData === undefined;
    const total = totalCount ?? 0;

    const pagedData = useMemo(() => {
        if (!displayData) return [];
        const start = page * PAGE_SIZE;
        return displayData.slice(start, start + PAGE_SIZE);
    }, [displayData, page]);

    const totalPages = Math.ceil((displayData?.length ?? 0) / PAGE_SIZE);

    const updateField = (key: string, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!form.name.trim()) return Alert.alert('Error', 'Food name (EN) is required.');
        if (!form.calories) return Alert.alert('Error', 'Calories are required.');

        try {
            const nameObj: Record<string, string> = { en: form.name.trim() };
            for (const { code } of ADMIN_TRANSLATION_LANGUAGES) {
                const value = (form as any)[`name_${code}`]?.trim();
                if (value) nameObj[code] = value;
            }

            const macros: any = {
                calories: parseFloat(form.calories) || 0,
                protein: parseFloat(form.protein) || 0,
                carbs: parseFloat(form.carbs) || 0,
                fat: parseFloat(form.fat) || 0,
                fiber: parseFloat(form.fiber) || 0,
            };
            if (form.sugar !== '') {
                macros.sugar = parseFloat(form.sugar) || 0;
            }

            if (editingFood) {
                await updateFood({
                    id: editingFood._id,
                    updates: {
                        name: nameObj as any,
                        macros,
                        isVerified: form.isVerified,
                        brand: form.brand.trim() || undefined,
                        barcode: form.barcode.trim() || undefined,
                        servingSize: form.servingSize.trim() || undefined,
                        thumbnail: form.thumbnail.trim() || undefined,
                        countryCode: form.countryCode.trim() || undefined,
                    }
                });
            } else {
                await logFood({
                    name: nameObj as any,
                    macros,
                    isVerified: form.isVerified,
                    brand: form.brand.trim() || undefined,
                    barcode: form.barcode.trim() || undefined,
                    servingSize: form.servingSize.trim() || undefined,
                    thumbnail: form.thumbnail.trim() || undefined,
                    countryCode: form.countryCode.trim() || undefined,
                });
            }
            setIsModalOpen(false);
            setEditingFood(null);
            setForm({ ...EMPTY_FORM });
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Failed to save food.');
        }
    };

    const handleDelete = (id: any, name: string) => {
        Alert.alert('Delete Food', `Delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteFood({ id });
                        Alert.alert('Success', 'Food deleted.');
                    } catch (err: any) {
                        console.error('Delete error:', err);
                        Alert.alert('Error', err?.message || 'Failed to delete food.');
                    }
                }
            },
        ]);
    };

    const openEdit = (food: any) => {
        setEditingFood(food);
        const nameObj = typeof food.name === 'object' ? food.name : { en: food.name ?? '' };
        setForm({
            name: nameObj.en ?? '',
            ...Object.fromEntries(ADMIN_TRANSLATION_LANGUAGES.map(({ code }) => [`name_${code}`, nameObj[code] ?? ''])),
            calories: String(food.macros?.calories ?? ''),
            protein: String(food.macros?.protein ?? ''),
            carbs: String(food.macros?.carbs ?? ''),
            fat: String(food.macros?.fat ?? ''),
            fiber: String(food.macros?.fiber ?? ''),
            sugar: food.macros?.sugar !== undefined ? String(food.macros.sugar) : '',
            brand: food.brand ?? '',
            barcode: food.barcode ?? '',
            servingSize: food.servingSize ?? '100g',
            thumbnail: food.thumbnail ?? '',
            isVerified: food.isVerified ?? true,
            countryCode: food.countryCode ?? '',
        });
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingFood(null);
        setForm({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const getCountryFlag = (code?: string) => {
        if (!code) return null;
        const found = ADMIN_COUNTRIES.find(c => c.code === code);
        return found ? found.label.split(' ')[0] : null;
    };

    const renderFoodItem = ({ item }: { item: any }) => {
        const name = typeof item.name === 'object' ? (item.name.en || Object.values(item.name)[0] || 'Unnamed') : item.name;
        return (
            <View style={styles.foodRow}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.rowThumbnail} />
                ) : (
                    <View style={styles.rowThumbnailPlaceholder}>
                        <Utensils size={16} color="#94a3b8" />
                    </View>
                )}
                <View style={styles.foodInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.foodName} numberOfLines={1}>{name}</Text>
                        {item.countryCode ? (
                            <Text style={{ fontSize: 15, marginRight: 2 }}>{getCountryFlag(item.countryCode)}</Text>
                        ) : null}
                        {item.isVerified && <ShieldCheck size={14} color="#22c55e" />}
                    </View>
                    <Text style={styles.foodMeta}>
                        {item.macros?.calories ?? 0} kcal · P{item.macros?.protein ?? 0}g · C{item.macros?.carbs ?? 0}g · F{item.macros?.fat ?? 0}g{item.macros?.sugar !== undefined ? ` · S${item.macros.sugar}g` : ''}
                        {item.brand ? ` · ${item.brand}` : ''}
                    </Text>
                    {item.servingSize ? <Text style={styles.servingText}>Serving: {item.servingSize}</Text> : null}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                        <Edit3 size={18} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id, name)} style={styles.actionBtn}>
                        <Trash2 size={18} color="#dc2626" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Food Database</Text>
                    <Text style={styles.subtitle}>{total} foods in database</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add Food</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search foods..."
                    placeholderTextColor="#94a3b8"
                    value={searchText}
                    onChangeText={(text) => { setSearchText(text); setPage(0); }}
                />
                {searchText ? (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                        <X size={18} color="#94a3b8" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* List */}
            {isLoading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={pagedData}
                    keyExtractor={(item) => item._id}
                    renderItem={renderFoodItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Utensils size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No foods found</Text>
                        </View>
                    }
                />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <View style={styles.pagination}>
                    <TouchableOpacity
                        disabled={page === 0}
                        onPress={() => setPage(p => p - 1)}
                        style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
                    >
                        <Text style={styles.pageBtnText}>← Prev</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageInfo}>{page + 1} / {totalPages}</Text>
                    <TouchableOpacity
                        disabled={page >= totalPages - 1}
                        onPress={() => setPage(p => p + 1)}
                        style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
                    >
                        <Text style={styles.pageBtnText}>Next →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modal */}
            <Modal visible={isModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingFood ? 'Edit Food' : 'Add Food'}</Text>
                            <TouchableOpacity onPress={() => { setIsModalOpen(false); setEditingFood(null); }}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* EN Name (required) */}
                            <Text style={styles.label}>Name (EN) *</Text>
                            <TextInput style={styles.input} value={form.name} onChangeText={v => updateField('name', v)} placeholder="e.g. Chicken Breast" placeholderTextColor="#94a3b8" />

                            {/* Multilingual names */}
                            {ADMIN_TRANSLATION_LANGUAGES.map(({ code, label }) => (
                                <View key={code}>
                                    <Text style={styles.label}>Name ({label})</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={(form as any)[`name_${code}`] ?? ''}
                                        onChangeText={v => updateField(`name_${code}`, v)}
                                        placeholder={`${label} translation`}
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                            ))}

                            <View style={styles.divider} />

                            {/* Macros */}
                            <Text style={styles.sectionTitle}>Macros (per serving)</Text>
                            <View style={styles.macroGrid}>
                                {[
                                    { key: 'calories', label: 'Calories *', unit: 'kcal' },
                                    { key: 'protein', label: 'Protein', unit: 'g' },
                                    { key: 'carbs', label: 'Carbs', unit: 'g' },
                                    { key: 'fat', label: 'Fat', unit: 'g' },
                                    { key: 'fiber', label: 'Fiber', unit: 'g' },
                                    { key: 'sugar', label: 'Sugar', unit: 'g' },
                                ].map(({ key, label, unit }) => (
                                    <View key={key} style={styles.macroField}>
                                        <Text style={styles.macroLabel}>{label}</Text>
                                        <View style={styles.macroInputWrap}>
                                            <TextInput
                                                style={styles.macroInput}
                                                value={(form as any)[key]}
                                                onChangeText={v => updateField(key, v)}
                                                keyboardType="decimal-pad"
                                                placeholder="0"
                                                placeholderTextColor="#94a3b8"
                                            />
                                            <Text style={styles.macroUnit}>{unit}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.divider} />

                            {/* Details */}
                            <Text style={styles.label}>Brand</Text>
                            <TextInput style={styles.input} value={form.brand} onChangeText={v => updateField('brand', v)} placeholder="Optional" placeholderTextColor="#94a3b8" />

                            <Text style={styles.label}>Barcode</Text>
                            <TextInput style={styles.input} value={form.barcode} onChangeText={v => updateField('barcode', v)} placeholder="Optional" placeholderTextColor="#94a3b8" />

                             <Text style={styles.label}>Serving Size</Text>
                            <TextInput style={styles.input} value={form.servingSize} onChangeText={v => updateField('servingSize', v)} placeholder="e.g. 100g" placeholderTextColor="#94a3b8" />

                            <Text style={styles.label}>Thumbnail R2 URL</Text>
                            <TextInput style={styles.input} value={form.thumbnail} onChangeText={v => updateField('thumbnail', v)} placeholder="e.g. https://r2.bluom.app/foods/..." placeholderTextColor="#94a3b8" />

                            <Text style={styles.label}>Cuisine Country</Text>
                             <ScrollView 
                                 horizontal 
                                 showsHorizontalScrollIndicator={false} 
                                 contentContainerStyle={styles.countryScroll}
                             >
                                 {ADMIN_COUNTRIES.map((c) => {
                                     const isSelected = form.countryCode === c.code;
                                     return (
                                         <TouchableOpacity 
                                             key={c.code} 
                                             style={[
                                                 styles.countryPill, 
                                                 isSelected && styles.countryPillActive
                                             ]}
                                             onPress={() => updateField('countryCode', c.code)}
                                         >
                                             <Text style={[
                                                 styles.countryPillText,
                                                 isSelected && styles.countryPillTextActive
                                             ]}>
                                                 {c.label}
                                             </Text>
                                         </TouchableOpacity>
                                     );
                                 })}
                             </ScrollView>

                            {/* Verified toggle */}
                            <TouchableOpacity style={styles.verifiedToggle} onPress={() => updateField('isVerified', !form.isVerified)}>
                                <View style={[styles.checkbox, form.isVerified && styles.checkboxActive]}>
                                    {form.isVerified && <Check size={14} color="#fff" />}
                                </View>
                                <Text style={styles.verifiedLabel}>Verified food</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsModalOpen(false); setEditingFood(null); }}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>{editingFood ? 'Update' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F4F0' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24 },
    title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    foodRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    rowThumbnail: { width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: '#f1f5f9' },
    rowThumbnailPlaceholder: { width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    foodInfo: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    foodName: { fontSize: 16, fontWeight: '700', color: '#1e293b', flexShrink: 1 },
    foodMeta: { fontSize: 13, color: '#64748b' },
    servingText: { fontSize: 12, color: '#94a3b8' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f8fafc' },

    emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },

    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 16 },
    pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563eb', borderRadius: 8 },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { color: '#fff', fontWeight: '700' },
    pageInfo: { fontSize: 14, color: '#64748b', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '92%', maxWidth: 600, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    modalBody: { padding: 20 },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

    label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 12 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1e293b' },

    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    macroField: { width: '48%' },
    macroLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
    macroInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingRight: 10 },
    macroInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#1e293b' },
    macroUnit: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

    verifiedToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    verifiedLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },

    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
    cancelBtnText: { fontWeight: '700', color: '#64748b', fontSize: 15 },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#2563eb' },
    saveBtnText: { fontWeight: '700', color: '#fff', fontSize: 15 },

    countryScroll: { gap: 8, paddingVertical: 4 },
    countryPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
    countryPillActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    countryPillText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    countryPillTextActive: { color: '#2563eb' },
});
