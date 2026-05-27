import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface FoodSearchModalProps {
  visible: boolean;
  meal: MealName;
  initialTab?: 'search' | 'recipes' | 'create';
  onClose: () => void;
  userId: Id<"users">;
  onLogFood: (foodInfo: any) => void;
  onLogRecipe: (recipe: any) => void;
  onOpenAddFood: () => void;
  onOpenCreateRecipe: () => void;
}

export default function FoodSearchModal({
  visible,
  meal,
  initialTab = 'search',
  onClose,
  userId,
  onLogFood,
  onLogRecipe,
  onOpenAddFood,
  onOpenCreateRecipe,
}: FoodSearchModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'search' | 'recipes' | 'create'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const searchResults = useQuery(
    api.customFoods.searchLocalFoods,
    { query: debouncedQuery, limit: 50 }
  );
  const searchLoading = debouncedQuery.length > 0 && searchResults === undefined;
  const myRecipes = useQuery(api.recipes.getMyRecipes, { userId });
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const getLocalizedName = (nameField: any) => {
    if (typeof nameField !== 'object' || nameField === null) return nameField || 'Food';
    return nameField[currentLang] || nameField.en || Object.values(nameField)[0] || 'Food';
  };

  useEffect(() => {
    if (visible) setActiveTab(initialTab);
    if (visible && initialTab === 'search') {
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [initialTab, visible]);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const handleSearchSubmit = () => {
    // Queries are reactive, so we don't strictly *need* to submit unless handling local state
  };

  const calculateRecipeMacros = (recipe: any) => {
    return recipe.nutrition?.perServing || recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  };

  const getFoodEmoji = (name: string): string => {
    if (!name) return '🍽️';
    const n = name.toLowerCase();
    if (n.includes('egg')) return '🥚';
    if (n.includes('chicken') || n.includes('turkey') || n.includes('poultry')) return '🍗';
    if (n.includes('beef') || n.includes('steak') || n.includes('meat') || n.includes('pork') || n.includes('bacon')) return '🥩';
    if (n.includes('fish') || n.includes('salmon') || n.includes('tuna') || n.includes('shrimp')) return '🐟';
    if (n.includes('rice')) return '🍚';
    if (n.includes('bread') || n.includes('toast') || n.includes('bagel') || n.includes('bun')) return '🍞';
    if (n.includes('cheese')) return '🧀';
    if (n.includes('milk') || n.includes('dairy') || n.includes('yogurt')) return '🥛';
    if (n.includes('fruit') || n.includes('apple') || n.includes('banana') || n.includes('berry') || n.includes('orange')) return '🍎';
    if (n.includes('veg') || n.includes('salad') || n.includes('green') || n.includes('carrot') || n.includes('broccoli') || n.includes('spinach')) return '🥗';
    if (n.includes('potato') || n.includes('fries') || n.includes('chip')) return '🍟';
    if (n.includes('pasta') || n.includes('noodle')) return '🍝';
    if (n.includes('pizza')) return '🍕';
    if (n.includes('burger')) return '🍔';
    if (n.includes('soup') || n.includes('broth')) return '🥣';
    if (n.includes('cookie') || n.includes('cake') || n.includes('chocolate') || n.includes('sweet') || n.includes('ice cream')) return '🍪';
    if (n.includes('coffee')) return '☕';
    if (n.includes('tea')) return '🍵';
    if (n.includes('water') || n.includes('drink') || n.includes('juice') || n.includes('soda')) return '🥤';
    if (n.includes('nut') || n.includes('peanut') || n.includes('almond') || n.includes('seed')) return '🥜';
    if (n.includes('bean') || n.includes('lentil') || n.includes('chickpea')) return '🫘';
    return '🍽️';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('modals.search.addTo', 'Add to')} {t(`fuel.meals.${meal.toLowerCase()}`, meal)}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'search' && styles.tabActive]} onPress={() => setActiveTab('search')}>
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t('modals.search.searchTab', 'Search Food')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'recipes' && styles.tabActive]} onPress={() => setActiveTab('recipes')}>
            <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t('modals.search.recipesTab', 'My Recipes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'create' && styles.tabActive]} onPress={() => setActiveTab('create')}>
            <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t('modals.search.createTab', 'Create')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'search' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('modals.search.placeholder', 'Search for food...')}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>

              {searchLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : (searchResults ?? []).length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>{t('modals.search.noFoods', 'No foods found')}</Text>
                  <Text style={styles.emptySub}>{t('modals.search.trySearch', 'Try searching for something else or create a custom food.')}</Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults ?? []}
                  keyExtractor={(item) => String(item._id)}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.listItem} onPress={() => onLogFood(item)} activeOpacity={0.7}>
                      <View style={styles.listIconWrap}>
                        {item.thumbnail ? (
                          <Image source={{ uri: item.thumbnail }} style={styles.listIconImage} />
                        ) : (
                          <Text style={styles.listIconEmoji}>{getFoodEmoji(getLocalizedName(item.name))}</Text>
                        )}
                      </View>
                      <View style={styles.listBody}>
                        <Text style={styles.listTitle} numberOfLines={1}>{getLocalizedName(item.name)}</Text>
                        <Text style={styles.listSub} numberOfLines={1}>
                          {item.brand ? `${item.brand} • ` : ''}{item.servingSize ?? '100g'}
                        </Text>
                      </View>
                      <View style={styles.listRight}>
                        <Text style={styles.listCal}>{Math.round(item.macros?.calories ?? 0)}</Text>
                        <Text style={styles.listCalUnit}>kcal</Text>
                        <View style={styles.sourcePill}>
                          <Text style={styles.sourceText}>
                            {item.isVerified ? '✓ VERIFIED' : t('modals.search.saved', 'SAVED')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {activeTab === 'recipes' && (
            <View style={{ flex: 1 }}>
              {!myRecipes ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : myRecipes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={48} color="#e2e8f0" />
                  <Text style={styles.emptyText}>{t('modals.search.noRecipes', 'No recipes yet')}</Text>
                  <Text style={styles.emptySub}>{t('modals.search.createQuick', 'Create your own recipes for quick logging.')}</Text>
                </View>
              ) : (
                <FlatList
                  data={myRecipes}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const macros = calculateRecipeMacros(item);
                    return (
                      <TouchableOpacity style={styles.listItem} onPress={() => onLogRecipe(item)} activeOpacity={0.7}>
                         <View style={styles.listIconWrapRecipe}>
                           <Ionicons name="restaurant" size={20} color="#2563eb" />
                         </View>
                         <View style={styles.listBody}>
                           <Text style={styles.listTitle} numberOfLines={1}>{item.name}</Text>
                           <Text style={styles.listSub} numberOfLines={1}>
                              {item.servings} {t('modals.search.servings', 'Servings')}
                           </Text>
                         </View>
                         <View style={styles.listRight}>
                           <Text style={styles.listCal}>{Math.round(macros.calories)}</Text>
                           <Text style={styles.listCalUnit}>kcal</Text>
                         </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}

          {activeTab === 'create' && (
            <ScrollView style={styles.createScroll} contentContainerStyle={styles.createScrollContent}>
               <TouchableOpacity style={styles.actionCardRow} onPress={onOpenAddFood} activeOpacity={0.8}>
                 <View style={[styles.actionIconCard, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={{ fontSize: 24 }}>🥑</Text>
                 </View>
                 <View style={styles.actionTextWrap}>
                    <Text style={styles.actionTitle}>{t('modals.search.addCustomTitle', 'Add Custom Food')}</Text>
                    <Text style={styles.actionSub}>{t('modals.search.addCustomSub', 'Quickly add an ingredient or food that isn\'t in our database.')}</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
               </TouchableOpacity>

               <TouchableOpacity style={styles.actionCardRow} onPress={onOpenCreateRecipe} activeOpacity={0.8}>
                 <View style={[styles.actionIconCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={{ fontSize: 24 }}>🍳</Text>
                 </View>
                 <View style={styles.actionTextWrap}>
                    <Text style={styles.actionTitle}>{t('modals.search.createRecipeTitle', 'Create a Recipe')}</Text>
                    <Text style={styles.actionSub}>{t('modals.search.createRecipeSub', 'Combine multiple ingredients into one saved meal for easy tracking.')}</Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
               </TouchableOpacity>

               {/* Could add Barcode Scanner here if needed */}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: c.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: c.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: c.surfaceMuted,
    borderRadius: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: c.surfaceMuted,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: c.text,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  inlineCreateBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
  },
  inlineCreateBtnTxt: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  listContent: {
    gap: 12,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.surfaceMuted,
  },
  listIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.surfaceMuted,
  },
  listIconWrapRecipe: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconEmoji: {
    fontSize: 20,
  },
  listIconImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  listBody: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    marginBottom: 2,
  },
  listSub: {
    fontSize: 13,
    color: c.textMuted,
  },
  listRight: {
    alignItems: 'flex-end',
  },
  listCal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  listCalUnit: {
    fontSize: 11,
    color: c.textMuted,
  },
  sourcePill: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.textMuted,
    letterSpacing: 0.4,
  },
  createScroll: {
    flex: 1,
  },
  createScrollContent: {
    gap: 16,
  },
  actionCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.surfaceMuted,
  },
  actionIconCard: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 18,
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
