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
    Dimensions,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { R2_CONFIG } from '@/utils/r2Config';
import {
    Utensils,
    Plus,
    Search,
    Filter,
    Clock,
    Flame,
    ChevronRight,
    MoreVertical,
    X,
    Target,
    FilePen,
    Trash2,
    ChevronDown,
    Check
} from 'lucide-react-native';

// ─── Dropdown Field Component  ────────────────────────────────────────────────
function DropdownField({
    label,
    options,
    selected,
    onChange,
    multi = false,
    placeholder = 'Select...'
}: {
    label?: string;
    options: string[];
    selected: any;
    onChange: (v: any) => void;
    multi?: boolean;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const currentSelected = selected || (multi ? [] : '');

    let text = placeholder;
    if (multi && currentSelected.length > 0) {
        text = currentSelected.join(', ');
    } else if (!multi && currentSelected && currentSelected !== 'All') {
        text = currentSelected;
    } else if (!multi && currentSelected === 'All') {
        text = 'All';
    }

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options;
        return options.filter((o: string) => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [options, searchQuery]);

    return (
        <View style={{ marginBottom: 12 }}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 46 }]} onPress={() => { setOpen(true); setSearchQuery(''); }}>
                <Text style={{ color: (multi ? currentSelected.length === 0 : !currentSelected) ? '#94a3b8' : '#1e293b', flex: 1 }} numberOfLines={1}>
                    {text}
                </Text>
                <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>

            <Modal visible={open} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{label || placeholder}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                        </View>
                        {options.length > 10 && (
                            <TextInput
                                style={[styles.input, { marginBottom: 16 }]}
                                placeholder="Search..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                        )}
                        <FlatList
                            data={filteredOptions}
                            keyExtractor={i => i}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const isActive = multi ? currentSelected.includes(item) : currentSelected === item;
                                return (
                                    <TouchableOpacity
                                        style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                        onPress={() => {
                                            if (multi) {
                                                if (isActive) onChange(currentSelected.filter((s: string) => s !== item));
                                                else onChange([...currentSelected, item]);
                                            } else {
                                                onChange(item);
                                                setOpen(false);
                                            }
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, color: isActive ? '#2563eb' : '#1e293b', fontWeight: isActive ? '700' : '500' }}>{item}</Text>
                                        {isActive && <Check size={18} color="#2563eb" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>No results found</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default function RecipesManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

    const allRecipes = useQuery(api.publicRecipes.list, {});
    const createRecipe = useMutation(api.admin.createPublicRecipe);
    const updateRecipe = useMutation(api.admin.updatePublicRecipe);
    const deleteRecipe = useMutation(api.admin.deletePublicRecipe);

    const [filterCats, setFilterCats] = useState<string[]>([]);
    const [filterTier, setFilterTier] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const RECIPE_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts', 'Vegetarian', 'High Protein', 'Low Carb'];

    const recipes = useMemo(() => {
        if (!allRecipes) return [];
        return allRecipes.filter((r: any) => {
            const searchQ = search.toLowerCase();
            const matchSearch = !searchQ || r.title?.toLowerCase().includes(searchQ) || r.description?.toLowerCase().includes(searchQ);
            
            // Multi-category match logic
            const matchCat = filterCats.length === 0 || 
                             filterCats.includes(r.category) || 
                             (r.categories ?? []).some(c => filterCats.includes(c));

            const matchTier = filterTier === 'All' || (filterTier === 'Pro' ? r.isPremium : !r.isPremium);
            const matchStatus = filterStatus === 'All' || r.status === filterStatus;
            return matchSearch && matchCat && matchTier && matchStatus;
        });
    }, [allRecipes, search, filterCats, filterTier, filterStatus]);

    // Local state for new/edit recipe
    const [newRecipe, setNewRecipe] = useState({
        title: '',
        category: 'Breakfast',
        categories: [] as string[],
        shortDescription: '',
        imageUrl: '',
        cookTimeMinutes: '30',
        servings: '2',
        calories: '0',
        protein: '0',
        carbs: '0',
        fat: '0',
        ingredientsText: '',
        instructionsText: '',
        tags: [] as string[],
        status: 'published',
    });

    const resetForm = () => {
        setNewRecipe({
            title: '',
            category: 'Breakfast',
            categories: [],
            shortDescription: '',
            imageUrl: '',
            cookTimeMinutes: '30',
            servings: '2',
            calories: '0',
            protein: '0',
            carbs: '0',
            fat: '0',
            ingredientsText: '',
            instructionsText: '',
            tags: [],
            status: 'published',
        });
        setSelectedRecipe(null);
    };

    const handleEdit = (recipe: any) => {
        setSelectedRecipe(recipe);
        setNewRecipe({
            title: recipe.title,
            category: recipe.category || 'Breakfast',
            categories: recipe.categories || (recipe.category ? [recipe.category] : []),
            shortDescription: recipe.description || '',
            imageUrl: recipe.imageUrl || '',
            cookTimeMinutes: String(recipe.cookTimeMinutes || 30),
            servings: String(recipe.servings || 2),
            calories: String(recipe.calories || 0),
            protein: String(recipe.protein || 0),
            carbs: String(recipe.carbs || 0),
            fat: String(recipe.fat || 0),
            ingredientsText: (recipe.ingredients || []).join('\n'),
            instructionsText: (recipe.instructions || []).join('\n'),
            tags: recipe.tags || [],
            status: recipe.status || 'published',
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const title = newRecipe.title.trim();
            if (!title) {
                Alert.alert('Missing title', 'Please enter a recipe name.');
                return;
            }

            const parseLines = (s: string) =>
                s
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);

            const commonArgs = {
                title,
                category: newRecipe.category,
                categories: newRecipe.categories,
                description: newRecipe.shortDescription.trim() || undefined,
                imageUrl: newRecipe.imageUrl.trim() || undefined,
                cookTimeMinutes: Number(newRecipe.cookTimeMinutes || 0) || undefined,
                servings: Number(newRecipe.servings || 0) || 1,
                calories: Number(newRecipe.calories || 0) || 0,
                protein: Number(newRecipe.protein || 0) || 0,
                carbs: Number(newRecipe.carbs || 0) || 0,
                fat: Number(newRecipe.fat || 0) || 0,
                ingredients: parseLines(newRecipe.ingredientsText),
                instructions: parseLines(newRecipe.instructionsText),
                tags: newRecipe.tags,
                status: newRecipe.status,
                isPremium: false,
            };

            if (selectedRecipe) {
                await updateRecipe({
                    recipeId: selectedRecipe._id,
                    ...commonArgs,
                });
            } else {
                await createRecipe(commonArgs);
            }

            setIsModalOpen(false);
            resetForm();
        } catch (e: any) {
            const msg = e?.message ?? 'Could not save recipe.';
            if (Platform.OS === 'web') {
                (window as any).alert('Save failed: ' + msg);
            } else {
                Alert.alert('Save failed', msg);
            }
        }
    };

    const handleDelete = (recipeId: any, title: string) => {
        const performDelete = async () => {
            try {
                await deleteRecipe({ recipeId });
            } catch (e: any) {
                const msg = e?.message ?? 'Could not delete recipe.';
                if (Platform.OS === 'web') {
                    (window as any).alert('Delete failed: ' + msg);
                } else {
                    Alert.alert('Delete failed', msg);
                }
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = (window as any).confirm(`Delete "${title}"?`);
            if (confirmed) performDelete();
        } else {
            Alert.alert('Delete recipe', `Delete "${title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: performDelete,
                },
            ]);
        }
    };

    const renderRecipeItem = ({ item }: { item: any }) => (
        <View style={styles.recipeCard}>
            {item.imageUrl ? (
                <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.recipeImage}
                    contentFit="cover"
                    transition={500}
                />
            ) : (
                <View style={styles.recipeImagePlaceholder}>
                    <Utensils size={24} color="#cbd5e1" />
                </View>
            )}
            <View style={styles.recipeContent}>
                <View style={styles.recipeHeader}>
                    <Text style={styles.recipeTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 6 }}>
                            <FilePen size={16} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={{ padding: 6 }}>
                            <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
                {item.status === 'draft' && (
                    <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b' }}>DRAFT</Text>
                    </View>
                )}

                <View style={styles.recipeMeta}>
                    <View style={styles.metaItem}>
                        <Flame size={12} color="#f59e0b" />
                        <Text style={styles.metaText}>{item.calories} kcal</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.metaText}>{item.cookTimeMinutes} min</Text>
                    </View>
                    {item.isPremium && (
                        <View style={styles.premiumBadge}>
                            <Text style={styles.premiumText}>PRO</Text>
                        </View>
                    )}
                </View>

                <View style={styles.macroRow}>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>P: {item.protein}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>C: {item.carbs}g</Text>
                    </View>
                    <View style={styles.macroPill}>
                        <Text style={styles.macroPillText}>F: {item.fat}g</Text>
                    </View>
                </View>
            </View>
        </View>

    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Recipes Manager</Text>
                    <Text style={styles.subtitle}>Curate and manage global food content</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={{ padding: 6 }}>
                        <Search size={20} color={showSearch ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ padding: 6 }}>
                        <Filter size={20} color={(filterCats.length > 0 || filterTier !== 'All' || filterStatus !== 'All' || showFilters) ? '#2563eb' : '#64748b'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                        <Plus color="#ffffff" size={20} />
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            {showSearch && (
                <View style={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search recipes..."
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
                        <DropdownField
                            label="CATEGORY"
                            options={RECIPE_CATEGORIES}
                            selected={filterCats}
                            onChange={setFilterCats}
                            multi
                            placeholder="All Categories"
                        />
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>TIER</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                            {['All', 'Pro', 'Free'].map(t => (
                                <TouchableOpacity key={t} style={[styles.fPill, filterTier === t && styles.fPillActive]} onPress={() => setFilterTier(t)}>
                                    <Text style={[styles.fPillTxt, filterTier === t && styles.fPillTxtActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>STATUS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                            {['All', 'published', 'draft'].map(s => (
                                <TouchableOpacity key={s} style={[styles.fPill, filterStatus === s && styles.fPillActive]} onPress={() => setFilterStatus(s)}>
                                    <Text style={[styles.fPillTxt, filterStatus === s && styles.fPillTxtActive]}>{s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    {(filterCats.length > 0 || filterTier !== 'All' || filterStatus !== 'All') && (
                        <TouchableOpacity 
                            onPress={() => { setFilterCats([]); setFilterTier('All'); setFilterStatus('All'); }}
                            style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 4 }}
                        >
                            <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '800' }}>Reset Filters</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', paddingHorizontal: 4, marginTop: 4 }}>{recipes.length} recipes found</Text>
                </View>
            )}

            {!allRecipes ? (
                <ActivityIndicator color="#2563eb" size="large" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={recipes}
                    renderItem={renderRecipeItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    numColumns={width > 768 ? 2 : 1}
                    key={width > 768 ? 'grid' : 'list'}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Utensils size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No public recipes found.</Text>
                        </View>
                    }
                />
            )}

            {/* Basic New Recipe Modal - Minimal for UI Demo */}
            <Modal visible={isModalOpen} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{selectedRecipe ? 'Edit Recipe' : 'New Recipe'}</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.modalSave}>Save</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalForm}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Mediterranean Salmon"
                            value={newRecipe.title}
                            onChangeText={(t) => setNewRecipe((p) => ({ ...p, title: t }))}
                        />

                        <DropdownField
                            label="Categories"
                            options={RECIPE_CATEGORIES}
                            selected={newRecipe.categories}
                            onChange={(cats) => setNewRecipe(prev => ({
                                ...prev,
                                categories: cats,
                                category: cats[0] || 'Breakfast' // Sync primary for legacy compat
                            }))}
                            multi
                        />

                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Prep time (min)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="30"
                                    value={newRecipe.cookTimeMinutes}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, cookTimeMinutes: t }))}
                                />
                            </View>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Servings</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="2"
                                    value={newRecipe.servings}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, servings: t }))}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Short description</Text>
                        <TextInput
                            style={[styles.input, { height: 90 }]}
                            multiline
                            placeholder="One-line description users see in-app..."
                            value={newRecipe.shortDescription}
                            onChangeText={(t) => setNewRecipe((p) => ({ ...p, shortDescription: t }))}
                        />

                        <Text style={styles.label}>Image URL (R2)</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 60 }]}
                            value={newRecipe.imageUrl}
                            onChangeText={t => setNewRecipe(p => ({ ...p, imageUrl: t }))}
                            placeholder={`${R2_CONFIG.generalBaseUrl}/recipes/image.jpg`}
                            autoCapitalize="none"
                        />
                        <Text style={styles.label}>Visibility</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.typeOption, newRecipe.status === 'published' && styles.typeOptionActive]}
                                onPress={() => setNewRecipe(prev => ({ ...prev, status: 'published' }))}
                            >
                                <Text style={[styles.typeText, newRecipe.status === 'published' && styles.typeTextActive]}>Published</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeOption, newRecipe.status === 'draft' && styles.typeOptionActive]}
                                onPress={() => setNewRecipe(prev => ({ ...prev, status: 'draft' }))}
                            >
                                <Text style={[styles.typeText, newRecipe.status === 'draft' && styles.typeTextActive]}>Draft</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Nutrition facts</Text>
                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Calories</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="0"
                                    value={newRecipe.calories}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, calories: t }))}
                                />
                            </View>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Protein (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="0"
                                    value={newRecipe.protein}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, protein: t }))}
                                />
                            </View>
                        </View>
                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Carbs (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="0"
                                    value={newRecipe.carbs}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, carbs: t }))}
                                />
                            </View>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Fat (g)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                    placeholder="0"
                                    value={newRecipe.fat}
                                    onChangeText={(t) => setNewRecipe((p) => ({ ...p, fat: t }))}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Ingredients (one per line)</Text>
                        <TextInput
                            style={[styles.input, { height: 150 }]}
                            multiline
                            placeholder={'2 Eggs\n1 Avocado\n...'}
                            value={newRecipe.ingredientsText}
                            onChangeText={(t) => setNewRecipe((p) => ({ ...p, ingredientsText: t }))}
                        />

                        <Text style={styles.label}>Instructions (one step per line)</Text>
                        <TextInput
                            style={[styles.input, { height: 150 }]}
                            multiline
                            placeholder={'1) Preheat oven...\n2) Season salmon...\n...'}
                            value={newRecipe.instructionsText}
                            onChangeText={(t) => setNewRecipe((p) => ({ ...p, instructionsText: t }))}
                        />



                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const { width } = Dimensions.get('window');

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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        marginBottom: 24,
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
    filterButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 24,
        paddingTop: 0,
        gap: 16,
    },
    recipeCard: {
        flex: 1,
        margin: 8,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    recipeImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recipeImage: {
        width: 80,
        height: 80,
        borderRadius: 14,
    },
    recipeContent: {
        flex: 1,
        marginLeft: 16,
    },
    recipeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    recipeTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
    },
    recipeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    premiumBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    premiumText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#d97706',
    },
    macroRow: {
        flexDirection: 'row',
        gap: 6,
    },
    macroPill: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    macroPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 15,
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
    modalSave: {
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 16,
    },
    modalForm: {
        padding: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
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
    inputGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    inputField: {
        flex: 1,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    categoryChipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    categoryChipTextActive: {
        color: '#ffffff',
    },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    chipSelected: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    chipText: { fontSize: 13, color: '#64748b' },
    chipTextSelected: { color: '#2563eb', fontWeight: '600' },
    typeOption: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    typeOptionActive: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    typeTextActive: {
        color: '#3b82f6',
    },

    // Filters
    filterBlock: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    filterRow: { gap: 4 },
    filterLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    pillRow: { flexDirection: 'row', gap: 6, paddingRight: 32 },
    fPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
    fPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    fPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    fPillTxtActive: { color: '#ffffff' },
});
