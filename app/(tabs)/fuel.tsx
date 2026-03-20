import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

import { getCurrentWeekRange, getTodayISO } from '@/utils/dates';
import { getBottomContentPadding } from '@/utils/layout';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useCelebration } from '@/context/CelebrationContext';
import { useUser as useAppUser } from '@/context/UserContext';
import { sendHydrationReminder, sendMealReminder } from '@/utils/notifications';
import { useAccessControl } from '@/hooks/useAccessControl';

import CoachMark from '@/components/CoachMark';
import PhotoRecognitionModal from '@/components/PhotoRecognitionModal';

// New Components
import CalorieSummary from '@/components/fuel/CalorieSummary';
import MacroCards from '@/components/fuel/MacroCards';
import DayStrip from '@/components/fuel/DayStrip';
import MealCard from '@/components/fuel/MealCard';
import WaterTracker from '@/components/fuel/WaterTracker';
import { QuickActions, UtilityCards } from '@/components/fuel/QuickActions';

// Modals
import AddFoodModal from '@/components/fuel/modals/AddFoodModal';
import CreateRecipeModal from '@/components/fuel/modals/CreateRecipeModal';
import LogRecipeModal from '@/components/fuel/modals/LogRecipeModal';
import FoodSearchModal from '@/components/fuel/modals/FoodSearchModal';
import MonthlyMealsModal from '@/components/fuel/modals/MonthlyMealsModal';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'premium_slot';

function toMealTypeLower(meal: MealName): MealTypeLower {
  return meal.toLowerCase() as MealTypeLower;
}

function titleFromMealType(mealType: MealTypeLower): MealName {
  switch (mealType) {
    case 'breakfast': return 'Breakfast';
    case 'lunch': return 'Lunch';
    case 'dinner': return 'Dinner';
    default: return 'Snack';
  }
}

export default function FuelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;
  const tabletMaxWidth = Math.min(1000, Math.max(0, windowWidth - 32));

  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  
  const celebration = useCelebration();
  const appUser = useAppUser();
  const { isPro: isProAccess } = useAccessControl();

  const todayISO = useMemo(() => getTodayISO(), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  // Keep these explicit to avoid "Cannot find name" regressions during refactors.
  const currentDate = selectedDate;
  const isPro = !!(isProAccess || appUser?.isPro || appUser?.isAdmin);

  const { startDate: weekStart, endDate: weekEnd } = useMemo(() => getCurrentWeekRange(), []);
  
  // We just need week entries to grab what days are "used" if we want to show dots, 
  // but DayStrip currently doesn't use the usage dots conceptually. We'll keep the query for parity.
  const weekEntries = useQuery(
    api.food.getFoodEntriesInRange,
    convexUser?._id ? { userId: convexUser._id, startDate: weekStart, endDate: weekEnd } : 'skip'
  );

  const dateEntries = useQuery(
    api.food.getFoodEntriesByDate,
    convexUser?._id ? { userId: convexUser._id, date: selectedDate } : 'skip'
  );

  const daily = useQuery(
    api.daily.getDailyMacros,
    convexUser?._id ? { userId: convexUser._id, date: selectedDate } : 'skip'
  );

  const activeFastingLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const activePlans = useQuery(
    api.plans.getActivePlans,
    convexUser?._id ? {} : 'skip'
  );

  const logFoodEntry = useMutation(api.food.logFoodEntry);
  const deleteFoodEntry = useMutation(api.food.deleteFoodEntry);
  const addWaterOz = useMutation(api.daily.addWaterOz);
  const upsertExternalFood = useMutation(api.foodCatalog.upsertExternalFood);

  // Modals & State
  const [selectedMeal, setSelectedMeal] = useState<MealName>('Lunch');
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showMonthlyPlan, setShowMonthlyPlan] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  
  // Log Recipe Modal
  const [showLogRecipeModal, setShowLogRecipeModal] = useState(false);
  const [logRecipe, setLogRecipe] = useState<any>(null);
  const [logMeal, setLogMeal] = useState<MealName>('Lunch');
  const [logQuantity, setLogQuantity] = useState(1);
  const [logSuccess, setLogSuccess] = useState(false);

  const [showTooltip, setShowTooltip] = useState(false);

  // Loading
  const isLoading =
    !isClerkLoaded ||
    (clerkUser && convexUser === undefined) ||
    (convexUser?._id && (dateEntries === undefined || daily === undefined));

  const isMetric = (convexUser?.preferredUnits?.volume ?? 'ml') === 'ml';

  // Format the dates for DayStrip
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const fullDate = d.toISOString().split('T')[0];
      arr.push({
        short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: d.getDate(),
        fullDate,
      });
    }
    return arr;
  }, []);

  const todayTotals = useMemo(() => daily?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, [daily]);
  
  const addFoodFromCatalog = useCallback(async (food: any, meal: MealName) => {
    if (!convexUser?._id) return;

    if (!convexUser.isPremium) {
      const uniqueMeals = new Set((dateEntries ?? []).map((e) => titleFromMealType(e.mealType)));
      if (uniqueMeals.size >= 4 && !uniqueMeals.has(meal)) {
        Alert.alert(
          "Limit Reached",
          "You strictly need to upgrade to scan more than 4 unique meals/day.",
          [
            { text: "Cancel", style: 'cancel' },
            { text: "Upgrade", onPress: () => router.push('/premium') },
          ]
        );
        return;
      }
    }

    let calories = Number(food.calories ?? 0);
    let protein = Number(food.protein ?? 0);
    let carbs = Number(food.carbs ?? 0);
    let fat = Number(food.fat ?? 0);
    let persistedFoodId = food?._id ? String(food._id) : undefined;

    if (food?.kind === 'external' && food?.externalId && food?.source) {
      const savedId = await upsertExternalFood({
        userId: convexUser._id,
        source: String(food.source),
        externalId: String(food.externalId),
        name: String(food.name ?? 'Food'),
        brand: food.brand ?? undefined,
        servingSize: String(food.servingSize ?? '1 serving'),
        calories, protein, carbs, fat,
      });
      persistedFoodId = String(savedId);
    }

    await logFoodEntry({
      userId: convexUser._id,
      foodId: persistedFoodId,
      foodName: typeof food.name === 'string' ? food.name : (food.name?.en || 'Food'),
      calories, protein, carbs, fat,
      servingSize: food.servingSize ?? '1 serving',
      mealType: toMealTypeLower(meal),
      date: selectedDate,
    });

    triggerSound(SoundEffect.LOG_MEAL);
    setShowFoodSearch(false);
  }, [convexUser, dateEntries, upsertExternalFood, logFoodEntry, selectedDate, router]);

  async function handleAddWater(ozAmount: number) {
    if (!convexUser?._id) return;
    const next = await addWaterOz({
      userId: convexUser._id,
      date: selectedDate,
      deltaOz: ozAmount,
    });
    triggerSound(SoundEffect.LOG_WATER);
    celebration.trigger('confetti');
    
    const weightKg = convexUser.weight ?? 0;
    const waterGoal = weightKg > 0 ? Math.round(weightKg * 30 * 0.033814) : 64; 
    sendHydrationReminder(next, waterGoal);
  }

  // Effect to handle params hook (e.g. from Home linking to templates)
  useEffect(() => {
    if ((params as any)?.openRecipes) {
      setShowFoodSearch(true);
      try { router.setParams({ openRecipes: undefined } as any); } catch {}
    }
  }, [params, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!clerkUser || !convexUser) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Text style={{ color: '#64748b' }}>Profile not found or loading...</Text>
      </SafeAreaView>
    );
  }

  const mealConfigs = [
    { name: 'Breakfast' as MealName, icon: 'partly-sunny-outline' as const },
    { name: 'Lunch' as MealName, icon: 'sunny-outline' as const },
    { name: 'Dinner' as MealName, icon: 'moon-outline' as const },
    { name: 'Snack' as MealName, icon: 'nutrition-outline' as const },
  ];

  const macroCardsData = [
    {
      name: 'Protein',
      emoji: '🥩',
      current: todayTotals.protein,
      goal: daily?.target?.protein ?? 150,
      color: '#ef4444',
      trackColor: 'rgba(239, 68, 68, 0.15)',
    },
    {
      name: 'Carbs',
      emoji: '🥖',
      current: todayTotals.carbs,
      goal: daily?.target?.carbs ?? 225,
      color: '#3b82f6',
      trackColor: 'rgba(59, 130, 246, 0.15)',
    },
    {
      name: 'Fat',
      emoji: '🥑',
      current: todayTotals.fat,
      goal: daily?.target?.fat ?? 67,
      color: '#eab308',
      trackColor: 'rgba(234, 179, 8, 0.15)',
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: getBottomContentPadding(insets.bottom, 20),
            ...(isTablet ? { alignItems: 'center' as const } : {}),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isTablet ? { width: '100%', maxWidth: tabletMaxWidth, alignSelf: 'center' } : undefined}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Fuel</Text>
            <CoachMark
              visible={showTooltip}
              message="Snap a photo to track macros instantly."
              onClose={() => { setShowTooltip(false); SecureStore.deleteItemAsync('bluom_show_coach_marks'); }}
              position="bottom"
            />
          </View>

          <DayStrip 
            days={weekDates} 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate} 
          />

          <View style={styles.section}>
             <CalorieSummary 
               consumed={todayTotals.calories} 
               goal={daily?.target?.calories ?? 2000} 
             />
          </View>

          <View style={styles.section}>
            <MacroCards macros={macroCardsData} />
          </View>

          <View style={styles.section}>
            <WaterTracker 
               currentOz={daily?.waterOz ?? 0}
               goalOz={64}
               isMetric={isMetric}
               onAddWater={handleAddWater}
            />
          </View>

          {activeFastingLog ? (
            <View style={styles.fastingBanner}>
              <View style={styles.fastingBlob} />
              <View style={styles.fastingHeader}>
                <Ionicons name="hourglass" size={20} color="#60a5fa" />
                <Text style={styles.fastingTitle}>Fasting In Progress</Text>
              </View>
              <Text style={styles.fastingTime}>
                  {(() => {
                    const protocol = activeFastingLog.protocol || '16:8';
                    const targetHours = parseInt(protocol.split(':')[0]);
                    const startTime = activeFastingLog.startTime;
                    const endTime = startTime + targetHours * 60 * 60 * 1000;
                    const remainingMs = Math.max(0, endTime - Date.now());
                    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                    return remainingMs > 0 ? `${hours}h ${mins}m until feeding` : "Window Open";
                  })()}
              </Text>
              <Text style={styles.fastingSubtitle}>Don't break your fast! Keep going!</Text>
            </View>
          ) : (
            <View style={styles.mealsSection}>
              {mealConfigs.map(m => {
                 const typeLower = toMealTypeLower(m.name);
                 const mealEntries = (dateEntries ?? []).filter(e => e.mealType === typeLower);
                 const foods = mealEntries.map(e => ({
                   id: e._id,
                   name: String(e.foodName),
                   cal: e.calories ?? 0,
                   protein: e.protein ?? 0,
                   carbs: e.carbs ?? 0,
                   fat: e.fat ?? 0,
                 }));

                 return (
                   <MealCard 
                     key={m.name}
                     title={m.name}
                     icon={m.icon}
                     foods={foods}
                     onAddPress={() => {
                        setSelectedMeal(m.name);
                        setShowFoodSearch(true);
                     }}
                     onDeletePress={(id) => deleteFoodEntry({ entryId: id as any })}
                   />
                 );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <QuickActions 
              onPhoto={() => setShowPhotoCapture(true)}
              onVoice={() => Alert.alert('Coming Soon', 'Voice tracking is on its way!')}
              onSearch={() => { setSelectedMeal('Lunch'); setShowFoodSearch(true); }}
              onManual={() => setShowAddFoodModal(true)}
            />
            
            <Text style={styles.sectionTitle}>Utilities</Text>
            <UtilityCards 
              onLibrary={() => router.push('/recipes')} 
              onMyRecipes={() => router.push('/recipes?tab=my_recipes')}
              onShoppingList={() => router.push('/shopping-list')}
              onAiChef={() => router.push('/recipes?open=aichef')}
              onMonthlyPlan={() => setShowMonthlyPlan(true)}
            />
          </View>

        </View>
      </ScrollView>

      {/* Modals placed here */}
      <MonthlyMealsModal
        visible={showMonthlyPlan}
        onClose={() => setShowMonthlyPlan(false)}
        userId={convexUser?._id}
        nutritionPlan={activePlans?.nutritionPlan}
        currentDate={selectedDate}
        isPro={!!(isProAccess || appUser?.isPro || appUser?.isAdmin)}
        onUpgradePress={() => router.push('/premium')}
      />
      <FoodSearchModal
        visible={showFoodSearch}
        meal={selectedMeal}
        onClose={() => setShowFoodSearch(false)}
        userId={convexUser._id}
        onLogFood={(food) => addFoodFromCatalog(food, selectedMeal)}
        onLogRecipe={(recipe) => {
           setLogRecipe(recipe);
           setShowFoodSearch(false);
           setLogMeal(selectedMeal);
           setLogQuantity(1);
           setLogSuccess(false);
           setShowLogRecipeModal(true);
        }}
        onOpenAddFood={() => { setShowFoodSearch(false); setShowAddFoodModal(true); }}
        onOpenCreateRecipe={() => { setShowFoodSearch(false); setShowRecipeModal(true); }}
      />

      <AddFoodModal 
        visible={showAddFoodModal} 
        onClose={() => setShowAddFoodModal(false)} 
        userId={convexUser._id} 
      />
      
      <CreateRecipeModal
        visible={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        userId={convexUser._id}
        onRecipeCreated={(recipe) => {
          setLogRecipe(recipe);
          setShowRecipeModal(false);
          setLogMeal('Lunch');
          setLogQuantity(1);
          setLogSuccess(false);
          setShowLogRecipeModal(true);
        }}
      />
      
      <LogRecipeModal
        visible={showLogRecipeModal}
        recipe={logRecipe}
        meal={logMeal}
        quantity={logQuantity}
        success={logSuccess}
        onMealChange={setLogMeal}
        onQuantityChange={setLogQuantity}
        onClose={() => setShowLogRecipeModal(false)}
        onCancel={() => setShowLogRecipeModal(false)}
        onSave={async () => {
          if (!logRecipe || !convexUser?._id) return;
          const perServing = logRecipe?.nutrition?.perServing ?? logRecipe?.nutrition ?? {
            calories: 0, protein: 0, carbs: 0, fat: 0,
          };

          await logFoodEntry({
            userId: convexUser._id,
            foodName: logRecipe.name || logRecipe.title,
            calories: (perServing.calories ?? 0) * logQuantity,
            protein: (perServing.protein ?? 0) * logQuantity,
            carbs: (perServing.carbs ?? 0) * logQuantity,
            fat: (perServing.fat ?? 0) * logQuantity,
            servingSize: `${logQuantity} serving(s)`,
            mealType: toMealTypeLower(logMeal),
            date: selectedDate,
          });

          triggerSound(SoundEffect.LOG_MEAL);
          setLogSuccess(true);
          setTimeout(() => {
            setShowLogRecipeModal(false);
            setLogRecipe(null);
            setLogSuccess(false);
          }, 1500);
        }}
      />

      <PhotoRecognitionModal
        visible={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        meal={selectedMeal}
        onRecognized={(item) => {
          setShowPhotoCapture(false);
          router.push({
            pathname: '/food-scan-review',
            params: {
              meal: String(selectedMeal),
              date: String(selectedDate),
              name: item.name,
              calories: String(item.calories),
              protein: String(item.protein),
              carbs: String(item.carbs),
              fat: String(item.fat),
            },
          });
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Requested new elegant white backdrop
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  mealsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  fastingBanner: {
     marginHorizontal: 20,
     marginTop: 24,
     backgroundColor: '#0f172a',
     borderRadius: 24,
     padding: 24,
     overflow: 'hidden',
  },
  fastingBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 64,
  },
  fastingHeader: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 16,
  },
  fastingTitle: {
    color: '#60a5fa', 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    letterSpacing: 1.5, 
    fontSize: 12 
  },
  fastingTime: {
    color: 'white', 
    fontWeight: '900', 
    fontSize: 26, 
    marginBottom: 4,
  },
  fastingSubtitle: {
    color: '#94a3b8', 
    fontWeight: '500', 
    fontSize: 14,
  }
});
