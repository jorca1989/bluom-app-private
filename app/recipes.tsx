import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { triggerSound, SoundEffect } from '@/utils/soundEffects';
import { BlurView } from 'expo-blur';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser as useAppUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

const RECIPE_IMAGE_OVERRIDES: Record<string, string> = {
  // Remote images so the app builds even if local assets aren't present.
  // (These can be swapped to local requires later once files exist in /assets.)
  'Mediterranean Salmon':
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
  'Green Power Smoothie':
    'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=1200&q=80',
};

function getRecipeImageSource(recipe: any): any | null {
  const title = String(recipe?.title ?? '');
  const override = RECIPE_IMAGE_OVERRIDES[title];
  if (override) return { uri: override };
  if (recipe?.imageUrl) return { uri: String(recipe.imageUrl) };
  return null;
}

const categories = [
  'All',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Desserts',
  'Vegetarian',
  'High Protein',
  'Low Carb',
] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const appUser = useAppUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const recipes = useQuery(api.publicRecipes.list, {
    search: searchQuery || undefined,
    category: selectedCategory,
    limit: 50,
  });

  const addRecipeIngredients = useMutation(api.shoppingList.addRecipeIngredients);

  const loading = !isClerkLoaded || (clerkUser && convexUser === undefined) || recipes === undefined;

  const isPro = appUser.isPro || appUser.isAdmin;

  const gridItemWidth = useMemo(() => (width - 64) / 2, []);

  const n = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: getBottomContentPadding(insets.bottom),
          paddingTop: Math.max(insets.top, 12) + 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Recipes</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading recipes...</Text>
          </View>
        )}

        {!loading && (!recipes || recipes.length === 0) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>
              Admin recipes will appear here once they are added.
            </Text>
          </View>
        )}

        {!loading && recipes && recipes.length > 0 && (
          <View style={styles.recipesGrid}>
            {recipes.map((recipe) => {
              return (
                <TouchableOpacity
                  key={recipe._id}
                  style={[styles.recipeCard, { width: gridItemWidth }]}
                  onPress={() => {
                    setSelectedRecipe(recipe);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.recipeCardImageContainer}>
                    {getRecipeImageSource(recipe) ? (
                      <Image source={getRecipeImageSource(recipe)} style={styles.recipeCardImage} />
                    ) : (
                      <View style={styles.recipeCardImagePlaceholder}>
                        <Ionicons name="restaurant" size={32} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                  <View style={styles.recipeCardContent}>
                    <Text style={styles.recipeCardTitle} numberOfLines={2}>
                      {recipe.title}
                    </Text>
                    <View style={styles.recipeCardMacros}>
                      <Text style={styles.macro}>{Math.round(n(recipe.calories))} cal</Text>
                      <Text style={styles.macro}>{Math.round(n(recipe.protein))}g P</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail modal */}
      {selectedRecipe ? (
        <Modal visible animationType="slide" onRequestClose={() => setSelectedRecipe(null)}>
          <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={styles.backButton} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
                  <Text style={styles.backText}>Back to Recipes</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recipeImageContainer}>
                {getRecipeImageSource(selectedRecipe) ? (
                  <Image source={getRecipeImageSource(selectedRecipe)} style={styles.recipeImage} />
                ) : (
                  <View style={styles.recipeImagePlaceholder}>
                    <Ionicons name="restaurant" size={48} color="#94a3b8" />
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.recipeTitle}>{selectedRecipe.title ?? 'Recipe'}</Text>
                {selectedRecipe.description ? (
                  <Text style={styles.recipeDescription}>{String(selectedRecipe.description)}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  {selectedRecipe.cookTimeMinutes ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#64748b" />
                      <Text style={styles.metaText}>{Math.round(n(selectedRecipe.cookTimeMinutes))} min</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{Math.max(1, Math.round(n(selectedRecipe.servings, 1)))} servings</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addToListButton}
                  onPress={async () => {
                    if (!convexUser?._id) {
                      Alert.alert('Not ready', 'Please complete onboarding to use Shopping List.');
                      return;
                    }
                    // Pro-only: Shopping list action (even for non-premium recipes)
                    if (!isPro) {
                      setShowUpgrade(true);
                      return;
                    }
                    const ingredients: string[] = Array.isArray(selectedRecipe.ingredients) ? selectedRecipe.ingredients : [];
                    if (ingredients.length === 0) {
                      Alert.alert('No ingredients', 'This recipe has no ingredients to add.');
                      return;
                    }
                    try {
                      triggerSound(SoundEffect.UI_TAP);
                      const res = await addRecipeIngredients({
                        userId: convexUser._id,
                        recipeId: selectedRecipe._id,
                        ingredients,
                      });
                      Alert.alert(
                        'Added to Shopping List',
                        `Added ${res?.created ?? 0} new item(s) and merged ${res?.merged ?? 0} item(s).`,
                        [
                          { text: 'Keep browsing', style: 'cancel' },
                          {
                            text: 'View list',
                            onPress: () => {
                              setSelectedRecipe(null);
                              router.push('/shopping-list');
                            },
                          },
                        ]
                      );
                    } catch {
                      Alert.alert('Error', 'Could not add ingredients. Please try again.');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart-outline" size={18} color="#ffffff" />
                  <Text style={styles.addToListText}>Add to Shopping List</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nutrition Facts (per serving)</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#2563eb' }]}>{Math.round(n(selectedRecipe.calories))}</Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#dc2626' }]}>{Math.round(n(selectedRecipe.protein))}g</Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#16a34a' }]}>{Math.round(n(selectedRecipe.carbs))}g</Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#d97706' }]}>{Math.round(n(selectedRecipe.fat))}g</Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {!!selectedRecipe.ingredients?.length && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Ingredients</Text>
                  <View style={!isPro ? { opacity: 0.25 } : undefined}>
                    {selectedRecipe.ingredients.map((ingredient: string, idx: number) => (
                      <View key={`${ingredient}-${idx}`} style={styles.ingredientItem}>
                        <View style={styles.ingredientDot} />
                        <Text style={styles.ingredientText}>{ingredient}</Text>
                      </View>
                    ))}
                  </View>
                  {!isPro ? (
                    <View style={styles.lockedAbsolute}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={18} color="#f59e0b" />
                        <Text style={styles.lockedTitle}>Ingredients locked</Text>
                        <Text style={styles.lockedText}>Upgrade to Pro to unlock ingredients and shopping list.</Text>
                        <TouchableOpacity style={styles.lockedBtn} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                          <Text style={styles.lockedBtnText}>View Pro Plans</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {!!selectedRecipe.instructions?.length && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Instructions</Text>
                  <View style={!isPro ? { opacity: 0.25 } : undefined}>
                    {selectedRecipe.instructions.map((instruction: string, idx: number) => (
                      <View key={`${idx}`} style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                          <Text style={styles.instructionNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.instructionText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                  {!isPro ? (
                    <View style={styles.lockedAbsolute}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={18} color="#f59e0b" />
                        <Text style={styles.lockedTitle}>Instructions locked</Text>
                        <Text style={styles.lockedText}>Upgrade to Pro to unlock cooking steps.</Text>
                        <TouchableOpacity style={styles.lockedBtn} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                          <Text style={styles.lockedBtnText}>View Pro Plans</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          setSelectedRecipe(null);
          router.push('/premium');
        }}
        title="Upgrade to Pro"
        message="Upgrade to Pro to unlock recipe ingredients, instructions, and Shopping List."
        upgradeLabel="View Pro Plans"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf1fe' },
  detailContainer: { flex: 1, backgroundColor: '#ebf1fe' },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeader: { paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, color: '#1e293b' },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b' },
  categoriesScroll: { marginHorizontal: -4 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#f97316' },
  categoryChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  categoryChipTextActive: { color: '#ffffff' },
  loadingContainer: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  emptyContainer: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  recipesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, justifyContent: 'space-between' },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  recipeCardImageContainer: { width: '100%', height: 160, position: 'relative' },
  recipeCardImage: { width: '100%', height: '100%' },
  recipeCardImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  recipeCardContent: { padding: 12 },
  recipeCardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  recipeCardMacros: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { fontSize: isSmallScreen ? 11 : 12, color: '#64748b' },
  recipeImageContainer: { width: '100%', height: 240, marginBottom: 16, paddingHorizontal: 24 },
  recipeImage: { width: '100%', height: '100%', borderRadius: 16 },
  recipeImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#e5e7eb', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  recipeTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  recipeDescription: { fontSize: 14, color: '#64748b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#64748b' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  nutritionGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  nutritionItem: { alignItems: 'center' },
  nutritionValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  nutritionLabel: { fontSize: 12, color: '#64748b' },
  ingredientItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
  ingredientText: { fontSize: 14, color: '#1e293b', flex: 1 },
  instructionItem: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  instructionNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  instructionNumberText: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  instructionText: { fontSize: 14, color: '#1e293b', flex: 1, paddingTop: 6 },

  addToListButton: {
    marginTop: 16,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addToListText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  lockedCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  lockedAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  lockedOverlay: { alignItems: 'center', gap: 8 },
  lockedTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  lockedText: { color: '#475569', fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  lockedBtn: {
    marginTop: 8,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBtnText: { color: '#ffffff', fontWeight: '900' },
});





