import React, { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
    Trash2
} from 'lucide-react-native';

export default function RecipesManager() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

    const recipes = useQuery(api.publicRecipes.list, {});
    const createRecipe = useMutation(api.admin.createPublicRecipe);
    const updateRecipe = useMutation(api.admin.updatePublicRecipe);
    const deleteRecipe = useMutation(api.admin.deletePublicRecipe);

    // Local state for new/edit recipe
    const [newRecipe, setNewRecipe] = useState({
        title: '',
        category: 'Breakfast',
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
    });

    const resetForm = () => {
        setNewRecipe({
            title: '',
            category: 'Breakfast',
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
        });
        setSelectedRecipe(null);
    };

    const handleEdit = (recipe: any) => {
        setSelectedRecipe(recipe);
        setNewRecipe({
            title: recipe.title,
            category: recipe.category || 'Breakfast',
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
            Alert.alert('Save failed', e?.message ?? 'Could not save recipe.');
        }
    };

    const handleDelete = (recipeId: any, title: string) => {
        Alert.alert('Delete recipe', `Delete "${title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteRecipe({ recipeId });
                    } catch (e: any) {
                        Alert.alert('Delete failed', e?.message ?? 'Could not delete recipe.');
                    }
                },
            },
        ]);
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
                <View>
                    <Text style={styles.title}>Recipes Manager</Text>
                    <Text style={styles.subtitle}>Curate and manage global food content</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus color="#ffffff" size={20} />
                    <Text style={styles.addButtonText}>Add Recipe</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search recipes..."
                    value={search}
                    onChangeText={setSearch}
                />
                <TouchableOpacity style={styles.filterButton}>
                    <Filter size={18} color="#64748b" />
                </TouchableOpacity>
            </View>

            {!recipes ? (
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

                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts', 'Vegetarian', 'High Protein', 'Low Carb'].map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        newRecipe.category === cat && styles.categoryChipActive
                                    ]}
                                    onPress={() => setNewRecipe(prev => ({ ...prev, category: cat }))}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        newRecipe.category === cat && styles.categoryChipTextActive
                                    ]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Prep time (min)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
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

                        <Text style={styles.label}>Image URL (optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https://..."
                            value={newRecipe.imageUrl}
                            onChangeText={(t) => setNewRecipe((p) => ({ ...p, imageUrl: t }))}
                        />

                        <Text style={styles.label}>Nutrition facts</Text>
                        <View style={styles.inputGrid}>
                            <View style={styles.inputField}>
                                <Text style={styles.label}>Calories</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
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
});
