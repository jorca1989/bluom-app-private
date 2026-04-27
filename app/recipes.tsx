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
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { triggerSound, SoundEffect } from '@/utils/soundEffects';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser as useAppUser } from '@/context/UserContext';
import { getTodayISO } from '@/utils/dates'; // ← ADD THIS IMPORT
import { getLocalizedField } from '@/utils/localize';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

// ─── Meal types (mirrors Fuel screen) ────────────────────────
type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_CONFIGS: Record<MealName, { icon: string; color: string; iconColor: string }> = {
  Breakfast: { icon: 'sunny', color: '#fed7aa', iconColor: '#2563eb' },
  Lunch: { icon: 'sunny-outline', color: '#fef3c7', iconColor: '#d97706' },
  Dinner: { icon: 'moon', color: '#e9d5ff', iconColor: '#9333ea' },
  Snack: { icon: 'restaurant', color: '#fce7f3', iconColor: '#db2777' },
};
const MEAL_NAMES: MealName[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// ─── Image helpers (unchanged) ────────────────────────────────
const RECIPE_IMAGE_OVERRIDES: Record<string, string> = {
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
  'All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks',
  'Desserts', 'Vegetarian', 'High Protein', 'Low Carb',
] as const;

// ─── Log as Meal picker modal ─────────────────────────────────
function LogMealModal({
  visible,
  recipe,
  onClose,
  onLogged,
}: {
  visible: boolean;
  recipe: any | null;
  onClose: () => void;
  onLogged: (meal: MealName) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [selectedMeal, setSelectedMeal] = useState<MealName>('Lunch');
  const [saving, setSaving] = useState(false);

  if (!visible || !recipe) return null;

  const n = (v: unknown, fb = 0) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : fb;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={lmStyles.overlay}>
        <View style={lmStyles.sheet}>
          {/* Handle bar */}
          <View style={lmStyles.handle} />

          <Text style={lmStyles.title}>{t('recipes.logToMeal', 'Log to Meal') as string}</Text>
          <Text style={lmStyles.subtitle} numberOfLines={2}>{getLocalizedField(recipe, 'title', lang)}</Text>

          {/* Macro summary */}
          <View style={lmStyles.macroRow}>
            <View style={lmStyles.macroItem}>
              <Text style={[lmStyles.macroVal, { color: '#2563eb' }]}>{Math.round(n(recipe.calories))}</Text>
              <Text style={lmStyles.macroLabel}>{t('fuel.caloriesShort', 'cal')}</Text>
            </View>
            <View style={lmStyles.macroDivider} />
            <View style={lmStyles.macroItem}>
              <Text style={[lmStyles.macroVal, { color: '#dc2626' }]}>{Math.round(n(recipe.protein))}g</Text>
              <Text style={lmStyles.macroLabel}>{t('fuel.protein', 'protein')}</Text>
            </View>
            <View style={lmStyles.macroDivider} />
            <View style={lmStyles.macroItem}>
              <Text style={[lmStyles.macroVal, { color: '#16a34a' }]}>{Math.round(n(recipe.carbs))}g</Text>
              <Text style={lmStyles.macroLabel}>{t('fuel.carbs', 'carbs')}</Text>
            </View>
            <View style={lmStyles.macroDivider} />
            <View style={lmStyles.macroItem}>
              <Text style={[lmStyles.macroVal, { color: '#d97706' }]}>{Math.round(n(recipe.fat))}g</Text>
              <Text style={lmStyles.macroLabel}>{t('fuel.fat', 'fat')}</Text>
            </View>
          </View>

          {/* Meal picker */}
          <Text style={lmStyles.pickerLabel}>{t('recipes.chooseAMeal', 'Choose a meal')}</Text>
          <View style={lmStyles.mealGrid}>
            {MEAL_NAMES.map((meal) => {
              const cfg = MEAL_CONFIGS[meal];
              const active = selectedMeal === meal;
              return (
                <TouchableOpacity
                  key={meal}
                  style={[lmStyles.mealTile, active && lmStyles.mealTileActive]}
                  onPress={() => setSelectedMeal(meal)}
                  activeOpacity={0.75}
                >
                  <View style={[lmStyles.mealIcon, { backgroundColor: cfg.color }]}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.iconColor} />
                  </View>
                  <Text style={[lmStyles.mealName, active && lmStyles.mealNameActive]}>{t(`common.${meal.toLowerCase()}`, meal)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={lmStyles.actions}>
            <TouchableOpacity style={lmStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={lmStyles.cancelText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[lmStyles.logBtn, saving && { opacity: 0.6 }]}
              onPress={async () => {
                if (saving) return;
                setSaving(true);
                try {
                  await onLogged(selectedMeal);
                } finally {
                  setSaving(false);
                }
              }}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={lmStyles.logText}>{t('recipes.logToMealBtn', 'Log to {{meal}}', { meal: t(`common.${selectedMeal.toLowerCase()}`, selectedMeal) })}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const lmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  macroRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 18, fontWeight: '700' },
  macroLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  macroDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  mealTile: {
    width: (width - 76) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fafafa',
  },
  mealTileActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  mealNameActive: { color: '#1d4ed8' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  logBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const appUser = useAppUser();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // ── NEW: Log as Meal state ──────────────────────────────────
  const [showLogModal, setShowLogModal] = useState(false);

  const recipes = useQuery(api.publicRecipes.list, {
    search: searchQuery || undefined,
    category: selectedCategory,
    limit: 50,
  });

  const addRecipeIngredients = useMutation(api.shoppingList.addRecipeIngredients);
  // ── NEW: food logging mutation ──────────────────────────────
  const logFoodEntry = useMutation(api.food.logFoodEntry);

  const loading = !isClerkLoaded || (clerkUser && convexUser === undefined) || recipes === undefined;
  const isPro = appUser.isPro || appUser.isAdmin;
  const gridItemWidth = useMemo(() => (width - 64) / 2, []);

  // Pre-compute image sources once per recipe list to maintain stable object
  // references across renders — React Native's image cache keyed by reference.
  const imageSources = useMemo(() => {
    const map = new Map<string, any>();
    (recipes ?? []).forEach(r => {
      const src = getRecipeImageSource(r);
      if (src) map.set(r._id, src);
    });
    return map;
  }, [recipes]);

  const n = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  // ── NEW: handle log confirmed ───────────────────────────────
  const handleLogToMeal = async (meal: MealName) => {
    if (!convexUser?._id || !selectedRecipe) return;

    const mealType = meal.toLowerCase() as MealTypeLower;
    const today = getTodayISO();

    try {
      await logFoodEntry({
        userId: convexUser._id,
        foodName: selectedRecipe.title ?? 'Recipe',
        calories: n(selectedRecipe.calories),
        protein: n(selectedRecipe.protein),
        carbs: n(selectedRecipe.carbs),
        fat: n(selectedRecipe.fat),
        servingSize: `1 serving (${Math.round(n(selectedRecipe.servings, 1))} total)`,
        mealType,
        date: today,
      });

      triggerSound(SoundEffect.LOG_MEAL);
      setShowLogModal(false);

      Alert.alert(
        t('recipes.loggedTitle', '✅ Logged!'),
        t('recipes.loggedMsg', '{{title}} added to {{meal}} for today.', { title: selectedRecipe.title, meal: t(`common.${meal.toLowerCase()}`, meal) }),
        [
          { text: t('recipes.stayHere', 'Stay here'), style: 'cancel' },
          {
            text: t('recipes.viewFuel', 'View Fuel'),
            onPress: () => {
              setSelectedRecipe(null);
              router.push('/(tabs)/fuel');
            },
          },
        ]
      );
    } catch (e: any) {
      const msg = e?.message ?? t('recipes.logError', 'Could not log recipe. Please try again.');
      Alert.alert(t('common.error', 'Error'), msg);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: getBottomContentPadding(insets.bottom),
          paddingTop: Platform.OS === 'android'
            ? Math.max(insets.top, StatusBar.currentHeight || 24) + 24
            : Math.max(insets.top, 12) + 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
            <Text style={styles.backText}>{t('common.back', 'Back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('recipes.title', 'Recipes')}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('recipes.searchPlaceholder', 'Search recipes...')}
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
                  {t(`recipes.categories.${category}`, category) as string}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{t('recipes.loadingRecipes', 'Loading recipes...') as string}</Text>
          </View>
        )}

        {!loading && (!recipes || recipes.length === 0) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>{t('recipes.noRecipes', 'No recipes yet') as string}</Text>
            <Text style={styles.emptySubtext}>
              {t('recipes.noRecipesDesc', 'Admin recipes will appear here once they are added.') as string}
            </Text>
          </View>
        )}

        {!loading && recipes && recipes.length > 0 && (
          <View style={styles.recipesGrid}>
            {recipes.map((recipe) => {
              const imageSource = imageSources.get(recipe._id);
              return (
                <TouchableOpacity
                  key={recipe._id}
                  style={[styles.recipeCard, { width: gridItemWidth }]}
                  onPress={() => setSelectedRecipe(recipe)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recipeCardImageContainer}>
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={styles.recipeCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recipeCardImagePlaceholder}>
                        <Ionicons name="restaurant" size={32} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                  <View style={styles.recipeCardContent}>
                    <Text style={styles.recipeCardTitle} numberOfLines={2}>{getLocalizedField(recipe, 'title', lang)}</Text>
                    <View style={styles.recipeCardMacros}>
                      <Text style={styles.macro}>{Math.round(n(recipe.calories))} {t('recipes.kcal', 'cal')}</Text>
                      <Text style={styles.macro}>{Math.round(n(recipe.protein))}g {t('fuel.mealCard.p', 'P')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Detail modal ───────────────────────────────────── */}
      {selectedRecipe ? (
        <Modal visible animationType="slide" onRequestClose={() => setSelectedRecipe(null)}>
          <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={{
                paddingBottom: getBottomContentPadding(insets.bottom),
                paddingTop: Platform.OS === 'android'
                  ? Math.max(insets.top, StatusBar.currentHeight || 24) + 24
                  : Math.max(insets.top, 12) + 16,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={styles.backButton} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
                  <Text style={styles.backText}>{t('recipes.backToList', 'Back to Recipes')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recipeImageContainer}>
                {(() => {
                  const detailImg = getRecipeImageSource(selectedRecipe);
                  return detailImg ? (
                    <Image source={detailImg} style={styles.recipeImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.recipeImagePlaceholder}>
                      <Ionicons name="restaurant" size={48} color="#94a3b8" />
                    </View>
                  );
                })()}
              </View>

              <View style={styles.card}>
                <Text style={styles.recipeTitle}>{getLocalizedField(selectedRecipe, 'title', lang) || selectedRecipe.title}</Text>
                  <Text style={styles.recipeDescription}>{getLocalizedField(selectedRecipe, 'description', lang) || String(selectedRecipe.description ?? '')}</Text>

                <View style={styles.metaRow}>
                  {selectedRecipe.cookTimeMinutes ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#64748b" />
                      <Text style={styles.metaText}>{Math.round(n(selectedRecipe.cookTimeMinutes))} {t('recipes.min', 'min')}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{Math.max(1, Math.round(n(selectedRecipe.servings, 1)))} {t('recipes.servings', 'servings')}</Text>
                  </View>
                </View>

                {/* ── ACTION BUTTONS ROW ───────────────────── */}
                <View style={styles.actionButtonsRow}>
                  {/* Log as Meal – always available (no pro gate needed, it's just logging macros) */}
                  <TouchableOpacity
                    style={styles.logMealButton}
                    onPress={() => {
                      if (!convexUser?._id) {
                        Alert.alert(t('common.notReady', 'Not ready'), t('onboarding.completePrompt', 'Please complete onboarding first.'));
                        return;
                      }
                      setShowLogModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="restaurant-outline" size={18} color="#ffffff" />
                    <Text style={styles.logMealButtonText}>{t('recipes.logAsMeal', 'Log as Meal')}</Text>
                  </TouchableOpacity>

                  {/* Add to Shopping List – pro only */}
                  <TouchableOpacity
                    style={styles.addToListButton}
                    onPress={async () => {
                      if (!convexUser?._id) {
                        Alert.alert(t('common.notReady', 'Not ready'), t('onboarding.completePromptShopping', 'Please complete onboarding to use Shopping List.'));
                        return;
                      }
                      if (!isPro) { setShowUpgrade(true); return; }
                      const ingredients: string[] = Array.isArray(selectedRecipe.ingredients)
                        ? selectedRecipe.ingredients : [];
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
                          t('shopping.addedTitle', 'Added to Shopping List'),
                          t('shopping.addedMsg', 'Added {{created}} new item(s) and merged {{merged}} item(s).', { created: res?.created ?? 0, merged: res?.merged ?? 0 }),
                          [
                            { text: t('recipes.keepBrowsing', 'Keep browsing'), style: 'cancel' },
                            { text: t('recipes.viewList', 'View list'), onPress: () => { setSelectedRecipe(null); router.push('/shopping-list'); } },
                          ]
                        );
                      } catch {
                        Alert.alert(t('common.error', 'Error'), t('shopping.errorAdd', 'Could not add ingredients. Please try again.'));
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cart-outline" size={18} color="#3b82f6" />
                    <Text style={styles.addToListText}>{t('recipes.shoppingList', 'Shopping List')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nutrition facts */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('recipes.nutritionFacts', 'Nutrition Facts (per serving)')}</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#2563eb' }]}>{Math.round(n(selectedRecipe.calories))}</Text>
                    <Text style={styles.nutritionLabel}>{t('recipes.calories', 'Calories')}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#dc2626' }]}>{Math.round(n(selectedRecipe.protein))}g</Text>
                    <Text style={styles.nutritionLabel}>{t('recipes.protein', 'Protein')}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#16a34a' }]}>{Math.round(n(selectedRecipe.carbs))}g</Text>
                    <Text style={styles.nutritionLabel}>{t('recipes.carbs', 'Carbs')}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={[styles.nutritionValue, { color: '#d97706' }]}>{Math.round(n(selectedRecipe.fat))}g</Text>
                    <Text style={styles.nutritionLabel}>{t('recipes.fat', 'Fat')}</Text>
                  </View>
                </View>
              </View>

              {/* Ingredients – pro gated */}
              {!!selectedRecipe.ingredients?.length && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('recipes.ingredients', 'Ingredients')}</Text>
                  <View style={!isPro ? { opacity: 0.25 } : undefined}>
                    {selectedRecipe.ingredients.map((ingredient: string, idx: number) => (
                      <View key={`${ingredient}-${idx}`} style={styles.ingredientItem}>
                        <View style={styles.ingredientDot} />
                        <Text style={styles.ingredientText}>{t(`db.${ingredient.replace(/\s+/g, '')}`, ingredient)}</Text>
                      </View>
                    ))}
                  </View>
                  {!isPro ? (
                    <View style={styles.lockedAbsolute}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={18} color="#f59e0b" />
                        <Text style={styles.lockedTitle}>{t('recipes.ingredientsLocked', 'Ingredients locked')}</Text>
                        <Text style={styles.lockedText}>{t('recipes.ingredientsLockedDesc', 'Upgrade to Pro to unlock ingredients and shopping list.')}</Text>
                        <TouchableOpacity style={styles.lockedBtn} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                          <Text style={styles.lockedBtnText}>{t('modals.pro.goPro', 'View Pro Plans')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Instructions – pro gated */}
              {!!selectedRecipe.instructions?.length && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('recipes.instructions', 'Instructions')}</Text>
                  <View style={!isPro ? { opacity: 0.25 } : undefined}>
                    {selectedRecipe.instructions.map((instruction: string, idx: number) => (
                      <View key={`${idx}`} style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                          <Text style={styles.instructionNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.instructionText}>{t(`db.${instruction.replace(/\s+/g, '')}`, instruction)}</Text>
                      </View>
                    ))}
                  </View>
                  {!isPro ? (
                    <View style={styles.lockedAbsolute}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]} />
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={18} color="#f59e0b" />
                        <Text style={styles.lockedTitle}>{t('recipes.instructionsLocked', 'Instructions locked')}</Text>
                        <Text style={styles.lockedText}>{t('recipes.instructionsLockedDesc', 'Upgrade to Pro to unlock cooking steps.')}</Text>
                        <TouchableOpacity style={styles.lockedBtn} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                          <Text style={styles.lockedBtnText}>{t('modals.pro.goPro', 'View Pro Plans')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>

          {/* ── Log as Meal modal (rendered inside detail Modal so z-order is correct) */}
          <LogMealModal
            visible={showLogModal}
            recipe={selectedRecipe}
            onClose={() => setShowLogModal(false)}
            onLogged={handleLogToMeal}
          />
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
        title={t('modals.pro.title', 'Upgrade to Pro')}
        message={t('recipes.proUpsell', 'Upgrade to Pro to unlock recipe ingredients, instructions, and Shopping List.')}
        upgradeLabel={t('modals.pro.goPro', 'View Pro Plans')}
      />
    </SafeAreaView>
  );
}

// ─── Styles (original + new additions) ───────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },
  detailContainer: { flex: 1, backgroundColor: '#F5F4F0' },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 10, // Reduced from 14 (moved up 3-4mm)
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
    borderRadius: 20, // Increased border radius
    borderWidth: 1, // Added border for definition on white
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Lighter shadow on white
    shadowRadius: 12,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14, // Slightly increased
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b' },
  categoriesScroll: { marginHorizontal: -4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryChipText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  categoryChipTextActive: { color: '#ffffff', fontWeight: '700' },
  loadingContainer: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  emptyContainer: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },

  // ── REFACTORED GALLERY ──────────────────────────────────────
  recipesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 16, // Better spacing
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20, // More rounded
    marginBottom: 0, // Using gap instead
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, // Stronger for visibility
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 2, // Thicker border
    borderColor: '#cbd5e1', // Darker border for better visibility
  },
  recipeCardImageContainer: {
    width: '100%',
    height: 180, // Increased from 160 for better visuals
    position: 'relative',
  },
  recipeCardImage: {
    width: '100%',
    height: '100%',
  },
  recipeCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9', // Lighter placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeCardContent: {
    padding: 14, // Increased padding
    backgroundColor: '#ffffff',
  },
  recipeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    lineHeight: 20,
  },
  recipeCardMacros: {
    flexDirection: 'row',
    gap: 12, // Better spacing
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  macro: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  recipeImageContainer: { width: '100%', height: 240, marginBottom: 16, paddingHorizontal: 24 },
  recipeImage: { width: '100%', height: '100%', borderRadius: 16 },
  recipeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  ingredientText: { fontSize: 14, color: '#1e293b', flex: 1 },
  instructionItem: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  instructionNumberText: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  instructionText: { fontSize: 14, color: '#1e293b', flex: 1, paddingTop: 6 },

  // ── NEW: Action buttons row ──────────────────────────────────
  actionButtonsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
  // "Log as Meal" – primary, orange fill
  logMealButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logMealButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  // "Shopping List" – secondary, outline style
  addToListButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  addToListText: { color: '#3b82f6', fontSize: 14, fontWeight: '800' },

  // Lock overlays (unchanged)
  lockedAbsolute: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
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
    backgroundColor: '#3b82f6',
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
