import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getCurrentWeekRange, getTodayISO } from '@/utils/dates';
import { getBottomContentPadding, getWeekCalendarItemSize } from '@/utils/layout';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { useCelebration } from '@/context/CelebrationContext';
import { sendHydrationReminder, sendMealReminder } from '@/utils/notifications';



import PhotoRecognitionModal from '@/components/PhotoRecognitionModal';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealTypeLower = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'premium_slot';

function toMealTypeLower(meal: MealName): MealTypeLower {
  return meal.toLowerCase() as MealTypeLower;
}

function titleFromMealType(mealType: MealTypeLower): MealName {
  switch (mealType) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    default:
      return 'Snack';
  }
}

// Pie Chart Component - Uniform size 64 to match Home page
const PieChart = ({
  value,
  max,
  color,
  size = 64,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
}) => {
  const percentage = Math.min((value / Math.max(1, max)) * 100, 100);
  const radius = 18; // Adjusted for size 64
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={center} cy={center} r={radius} stroke="#e5e7eb" strokeWidth="5" fill="transparent" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth="5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{Math.round(value)}</Text>
    </View>
  );
};

export default function FuelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();


  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const celebration = useCelebration();

  const todayISO = useMemo(() => getTodayISO(), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);

  const { startDate: weekStart, endDate: weekEnd } = useMemo(() => getCurrentWeekRange(), []);
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

  const logFoodEntry = useMutation(api.food.logFoodEntry);
  const deleteFoodEntry = useMutation(api.food.deleteFoodEntry);
  const addWaterOz = useMutation(api.daily.addWaterOz);
  const deleteRecipe = useMutation(api.recipes.deleteRecipe);
  const upsertExternalFood = useMutation(api.foodCatalog.upsertExternalFood);
  const searchExternalFoods = useAction(api.externalFoods.searchFoods);

  const [selectedMeal, setSelectedMeal] = useState<MealName | null>(null);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [waterAmount, setWaterAmount] = useState('');
  const [waterUnit, setWaterUnit] = useState<string>(''); // Will set in effect based on preferences

  const [foodSearchTab, setFoodSearchTab] = useState<'myrecipes' | 'search' | 'addrecipe'>('search');

  const activeFastingLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const myRecipes = useQuery(api.recipes.getMyRecipes, convexUser?._id ? { userId: convexUser._id } : 'skip');
  const [showLogRecipeModal, setShowLogRecipeModal] = useState(false);
  const [logRecipe, setLogRecipe] = useState<any>(null);
  const [logMeal, setLogMeal] = useState<MealName>('Lunch');
  const [logQuantity, setLogQuantity] = useState(1);
  const [logSuccess, setLogSuccess] = useState(false);

  const isLoading =
    !isClerkLoaded ||
    (clerkUser && convexUser === undefined) ||
    (convexUser?._id && (dateEntries === undefined || daily === undefined || weekEntries === undefined));

  const isMetric = (convexUser?.preferredUnits?.volume ?? 'ml') === 'ml';

  const waterUnits = useMemo(
    () => isMetric ? [
      { value: '250ml' as const, label: 'Small Glass (250ml)', ml: 250 },
      { value: '500ml' as const, label: 'Large Glass (500ml)', ml: 500 },
      { value: '1000ml' as const, label: 'Bottle (1L)', ml: 1000 },
    ] : [
      { value: '8oz' as const, label: 'Cup (8 fl oz)', ml: 237 },
      { value: '16oz' as const, label: 'Bottle (16 fl oz)', ml: 473 },
      { value: '32oz' as const, label: 'Large Bottle (32 fl oz)', ml: 946 },
    ],
    [isMetric]
  );

  useEffect(() => {
    if (!waterUnit && waterUnits.length > 0) {
      setWaterUnit(waterUnits[0].value);
    }
  }, [waterUnit, waterUnits]);

  const mealConfigs = useMemo(
    () => ({
      Breakfast: { icon: 'sunny', color: '#fed7aa', iconColor: '#ea580c' },
      Lunch: { icon: 'sunny-outline', color: '#fef3c7', iconColor: '#d97706' },
      Dinner: { icon: 'moon', color: '#e9d5ff', iconColor: '#9333ea' },
      Snack: { icon: 'restaurant', color: '#fce7f3', iconColor: '#db2777' },
    }),
    []
  );

  const defaultMeals = useMemo(() => ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const, []);

  // Week dates for the calendar card
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

    const arr: { day: string; date: number; fullDate: string; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const fullDate = d.toISOString().split('T')[0];
      arr.push({
        day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        date: d.getDate(),
        fullDate,
        isToday: fullDate === todayISO,
      });
    }
    return arr;
  }, [todayISO]);

  // Used days: any day in the current week that has at least one food entry
  const usedDays = useMemo(() => {
    if (!weekEntries) return [];
    const set = new Set<string>();
    for (const e of weekEntries) set.add(e.date);
    return [...set];
  }, [weekEntries]);

  // Totals/remaining from Convex daily macro summary
  const todayTotals = useMemo(() => daily?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, [daily]);
  const remaining = useMemo(() => daily?.remaining ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, [daily]);

  // Debounced food search (Convex)
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!convexUser?._id) return;
      if (!searchQuery.trim() || foodSearchTab !== 'search') {
        if (!cancelled) setSearchResults([]);
        return;
      }
      setLoadingSearch(true);
      try {
        const results = await searchExternalFoods({ userId: convexUser._id, query: searchQuery, limit: 50 });
        if (!cancelled) setSearchResults(results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [convexUser?._id, foodSearchTab, searchQuery, searchExternalFoods]);

  // If a param requests opening recipes, open the modal on My Recipes tab
  useEffect(() => {
    if ((params as any)?.openRecipes) {
      setShowFoodSearch(true);
      setFoodSearchTab('myrecipes');
      // clear param
      try {
        router.setParams({ openRecipes: undefined } as any);
      } catch {
        // ignore
      }
    }
  }, [params, router]);

  async function addFoodFromCatalog(food: any, meal: MealName) {
    if (!convexUser?._id) return;

    // Free users: keep the existing “4 unique meals per day” gating.
    if (!convexUser.isPremium) {
      const uniqueMeals = new Set((dateEntries ?? []).map((e) => titleFromMealType(e.mealType)));
      if (uniqueMeals.size >= 4 && !uniqueMeals.has(meal)) {
        Alert.alert(
          "Limit Reached",
          "You strictly need to upgrade to scan more than 4 unique meals/day. We gotta keep the servers running!",
          [
            { text: "Cancel", style: 'cancel' },
            {
              text: "Upgrade",
              onPress: () => {
                router.push('/premium');
              },
            },
          ]
        );
        return;
      }
    }

    let calories = Number(food.calories ?? 0);
    let protein = Number(food.protein ?? 0);
    let carbs = Number(food.carbs ?? 0);
    let fat = Number(food.fat ?? 0);
    let persistedFoodId: string | undefined = undefined;

    // Persist external foods into Convex `foods` table before logging (per repo rules).
    if (food?.kind === 'external' && food?.externalId && food?.source) {
      const savedId = await upsertExternalFood({
        userId: convexUser._id,
        source: String(food.source),
        externalId: String(food.externalId),
        name: String(food.name ?? 'Food'),
        brand: food.brand ?? undefined,
        barcode: food.barcode ?? undefined,
        servingSize: String(food.servingSize ?? '1 serving'),
        calories,
        protein,
        carbs,
        fat,
      });
      persistedFoodId = String(savedId);
    } else if (food?._id) {
      persistedFoodId = String(food._id);
    }

    await logFoodEntry({
      userId: convexUser._id,
      foodId: persistedFoodId,
      foodName: typeof food.name === 'string' ? food.name : (food.name?.en || 'Food'),
      calories,
      protein,
      carbs,
      fat,
      servingSize: food.servingSize ?? '1 serving',
      mealType: toMealTypeLower(meal),
      date: selectedDate,
    });

    triggerSound(SoundEffect.LOG_MEAL);

    setTimeout(() => {
      const uniqueMeals = new Set((dateEntries ?? []).map((e) => titleFromMealType(e.mealType)));
      sendMealReminder(uniqueMeals.size);
    }, 250);

    setShowFoodSearch(false);
    setSearchQuery('');
    setSelectedMeal(null);
  }

  function getMealTotals(meal: MealName) {
    const mealType = toMealTypeLower(meal);
    return (dateEntries ?? [])
      .filter((e) => e.mealType === mealType)
      .reduce(
        (total: any, e: any) => ({
          calories: total.calories + (e.calories ?? 0),
          protein: total.protein + (e.protein ?? 0),
          carbs: total.carbs + (e.carbs ?? 0),
          fat: total.fat + (e.fat ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
  }

  async function addWater() {
    if (!convexUser?._id) return;
    if (!waterAmount) return;

    const unit = waterUnits.find((u) => u.value === waterUnit);
    const mlAmount = (unit?.ml ?? 237) * (parseFloat(waterAmount) || 0);
    const ozAmount = mlAmount / 29.5735;

    const next = await addWaterOz({
      userId: convexUser._id,
      date: selectedDate,
      deltaOz: ozAmount,
    });

    triggerSound(SoundEffect.LOG_WATER);
    celebration.trigger('confetti');

    const weightKg = convexUser.weight ?? 0;
    const waterGoal = weightKg > 0 ? Math.round(weightKg * 30 * 0.033814) : 64; // ~30ml/kg
    sendHydrationReminder(next, waterGoal);

    setWaterAmount('');
    setShowWaterModal(false);
  }

  const calendarItemSize = useMemo(() => getWeekCalendarItemSize(width), []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.screenLoadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!clerkUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.screenLoadingContainer}>
          <Text style={styles.errorText}>Please sign in to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!convexUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.screenLoadingContainer}>
          <Text style={styles.errorText}>Profile not found. Please complete onboarding.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/onboarding')}>
            <Text style={styles.primaryButtonText}>Go to Onboarding</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Fuel</Text>
              <Text style={styles.subtitle}>Track your nutrition</Text>
            </View>
            <View style={styles.headerButtons}>
              {/* Removed diamond icon */}
              <TouchableOpacity
                style={[styles.headerButton, styles.plusButton]}
                onPress={() => setShowPlusMenu(!showPlusMenu)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plus Menu */}
        {showPlusMenu && (
          <View style={styles.plusMenu}>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                triggerSound(SoundEffect.UI_TAP);
                setShowFoodSearch(true);
                setFoodSearchTab('search');
              }}
            >
              <Ionicons name="search" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Search Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowAddFoodModal(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Add Custom Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowRecipeModal(true);
              }}
            >
              <Ionicons name="restaurant" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Create Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowPhotoCapture(true);
              }}
            >
              <Ionicons name="camera" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Photo Calorie Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                router.push('/recipes');
              }}
            >
              <Ionicons name="book" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Browse Recipes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                triggerSound(SoundEffect.UI_TAP);
                router.push('/shopping-list');
              }}
            >
              <Ionicons name="cart" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>Shopping List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plusMenuItem}
              onPress={() => {
                setShowPlusMenu(false);
                setShowFoodSearch(true);
                setFoodSearchTab('myrecipes');
              }}
            >
              <Ionicons name="restaurant-outline" size={20} color="#1e293b" />
              <Text style={styles.plusMenuText}>My Recipes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekly Calendar */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>This Week</Text>
            <Ionicons name="calendar" size={24} color="#2563eb" />
          </View>

          <View style={styles.calendarContainer}>
            {/* Day names */}
            <View style={styles.calendarRow}>
              {weekDates.map((day, index) => (
                <View key={`day-${index}`} style={styles.calendarItem}>
                  <Text style={styles.calendarDay}>{day.day}</Text>
                </View>
              ))}
            </View>

            {/* Day numbers */}
            <View style={styles.calendarRow}>
              {weekDates.map((day, index) => (
                <TouchableOpacity
                  key={`date-${index}`}
                  style={[
                    styles.calendarDateButton,
                    { width: calendarItemSize, height: calendarItemSize, borderRadius: calendarItemSize / 2 },
                    day.fullDate === selectedDate && styles.calendarDateButtonSelected,
                  ]}
                  onPress={() => setSelectedDate(day.fullDate)}
                >
                  <Text
                    style={[
                      styles.calendarDateText,
                      day.fullDate === selectedDate && styles.calendarDateTextSelected,
                    ]}
                  >
                    {day.date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Usage dots */}
            <View style={styles.calendarRow}>
              {weekDates.map((day, index) => (
                <View key={`dot-${index}`} style={styles.calendarItem}>
                  <View style={[styles.calendarDot, usedDays.includes(day.fullDate) && styles.calendarDotActive]} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Today's Nutrition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutrition</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <PieChart value={todayTotals.calories} max={daily?.target?.calories ?? 2000} color="#3b82f6" size={64} />
              <Text style={styles.nutritionLabel} numberOfLines={1} adjustsFontSizeToFit>
                Calories
              </Text>
              <Text style={styles.nutritionRemaining} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(remaining.calories)} left
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <PieChart value={todayTotals.protein} max={daily?.target?.protein ?? 150} color="#ef4444" size={64} />
              <Text style={styles.nutritionLabel} numberOfLines={1} adjustsFontSizeToFit>
                Protein
              </Text>
              <Text style={styles.nutritionRemaining} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(remaining.protein)}g left
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <PieChart value={todayTotals.carbs} max={daily?.target?.carbs ?? 225} color="#3b82f6" size={64} />
              <Text style={styles.nutritionLabel} numberOfLines={1} adjustsFontSizeToFit>
                Carbs
              </Text>
              <Text style={styles.nutritionRemaining} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(remaining.carbs)}g left
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <PieChart value={todayTotals.fat} max={daily?.target?.fat ?? 67} color="#eab308" size={64} />
              <Text style={styles.nutritionLabel} numberOfLines={1} adjustsFontSizeToFit>
                Fat
              </Text>
              <Text style={styles.nutritionRemaining} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round(remaining.fat)}g left
              </Text>
            </View>
          </View>
        </View>

        {/* Water Tracking */}
        <View style={styles.card}>
          <View style={styles.waterHeader}>
            <View style={styles.waterHeaderLeft}>
              <View style={styles.waterIconContainer}>
                <Ionicons name="water" size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.waterTitle}>Water</Text>
                <Text style={styles.waterSubtitle}>
                  {isMetric ? (
                    (() => {
                      const ml = (daily?.waterOz ?? 0) * 29.5735;
                      return ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${Math.round(ml)}ml`;
                    })()
                  ) : (
                    `${Math.round(daily?.waterOz ?? 0)}oz`
                  )}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addWaterButton} onPress={() => setShowWaterModal(true)} activeOpacity={0.7}>
              <Text style={styles.addWaterButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.waterProgress}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((glass) => (
              <View
                key={glass}
                style={[
                  styles.waterGlass,
                  glass <= Math.floor((daily?.waterOz ?? 0) / 8) && styles.waterGlassFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Fasting Banner or Meals Section */}
        {activeFastingLog ? (
          <View style={{
            marginHorizontal: 16,
            marginTop: 24,
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5
          }}>
            {/* Background decorative blob - simplified */}
            <View style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 128,
              height: 128,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 64,
              marginRight: -40,
              marginTop: -40,
            }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Ionicons name="hourglass" size={20} color="#60a5fa" />
              <Text style={{ color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 12 }}>Fasting In Progress</Text>
            </View>

            <View>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 30, marginBottom: 4 }}>
                {(() => {
                  const protocol = activeFastingLog.protocol || '16:8';
                  const targetHours = parseInt(protocol.split(':')[0]);
                  const startTime = activeFastingLog.startTime;
                  const endTime = startTime + targetHours * 60 * 60 * 1000;
                  const remainingMs = Math.max(0, endTime - Date.now());
                  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                  return remainingMs > 0
                    ? `${hours}h ${minutes}m until feeding`
                    : "Window Open";
                })()}
              </Text>
              <Text style={{ color: '#94a3b8', fontWeight: '500', fontSize: 14 }}>
                Don't break your fast! Keep going!
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Ionicons name="leaf" size={12} color="#4ade80" />
              <Text style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 12 }}>Metabolic Switch Active</Text>
            </View>
          </View>
        ) : (
          /* Meals Section */
          <View style={styles.mealsSection}>
            {defaultMeals.map((meal) => {
              const mealTotals = getMealTotals(meal);
              const mealConfig = mealConfigs[meal];
              const mealEntries = (dateEntries ?? []).filter((e) => titleFromMealType(e.mealType) === meal);

              return (
                <View key={meal} style={styles.mealCard}>
                  <View style={styles.mealCardHeader}>
                    <View style={styles.mealCardHeaderLeft}>
                      <View style={[styles.mealIconContainer, { backgroundColor: mealConfig.color }]}>
                        <Ionicons name={mealConfig.icon as any} size={24} color={mealConfig.iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.mealName}>{meal}</Text>
                          <TouchableOpacity
                            style={styles.mealAddButton}
                            onPress={() => {
                              setSelectedMeal(meal);
                              setShowFoodSearch(true);
                              setFoodSearchTab('search');
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={18} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.mealTotals} numberOfLines={1} adjustsFontSizeToFit>
                          {Math.round(mealTotals.calories)} cal • {Math.round(mealTotals.protein)}g P •{' '}
                          {Math.round(mealTotals.carbs)}g C • {Math.round(mealTotals.fat)}g F
                        </Text>
                      </View>
                    </View>
                  </View>

                  {mealEntries.length > 0 ? (
                    <View style={styles.mealEntries}>
                      {mealEntries.map((entry) => (
                        <View key={entry._id} style={styles.mealEntry}>
                          <View style={styles.mealEntryLeft}>
                            <Text style={styles.mealEntryName}>{entry.foodName}</Text>
                            <View style={styles.mealEntrySubline}>
                              <Text style={styles.mealEntryQuantity}>{`1x • ${Math.round(entry.calories ?? 0)} cal`}</Text>
                              <View style={styles.macroRowHorizontal}>
                                <Text style={styles.mealEntryMacros}>{Math.round(entry.protein ?? 0)}g P</Text>
                                <Text style={styles.mealEntryMacros}>{Math.round(entry.carbs ?? 0)}g C</Text>
                                <Text style={styles.mealEntryMacros}>{Math.round(entry.fat ?? 0)}g F</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.mealEntryRight}>
                            <TouchableOpacity
                              style={styles.deleteEntryButton}
                              onPress={() => deleteFoodEntry({ entryId: entry._id })}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash" size={16} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyMeal}>
                      <Text style={styles.emptyMealText}>No food logged today</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Meal Slot Button (Premium) */}
            <TouchableOpacity
              style={[styles.mealCard, {
                opacity: 0.95,
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: '#fbbf24',
                backgroundColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                shadowColor: '#fbbf24',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              }]}
              onPress={() => router.push('/premium')}
              activeOpacity={0.8}
            >
              <View style={[styles.mealCardHeader, { borderBottomWidth: 0 }]}>
                <View style={styles.mealCardHeaderLeft}>
                  <View style={[styles.mealIconContainer, {
                    backgroundColor: '#fbbf24',
                    shadowColor: '#f59e0b',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 3
                  }]}>
                    <Ionicons name="lock-closed" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.mealName, {
                        color: '#92400e',
                        fontWeight: '800',
                        fontSize: 16
                      }]}>Add Meal</Text>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#fbbf24',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 16,
                        shadowColor: '#f59e0b',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.5,
                        shadowRadius: 4,
                        elevation: 2
                      }}>
                        <Ionicons name="star" size={12} color="#ffffff" />
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: '#ffffff',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>PRO</Text>
                        <Ionicons name="star" size={12} color="#ffffff" />
                      </View>
                    </View>
                    <Text style={[styles.mealTotals, {
                      color: '#92400e',
                      fontWeight: '600',
                      fontSize: 13
                    }]}>
                      Unlock unlimited meals
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Food Search Modal */}
      < Modal visible={showFoodSearch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFoodSearch(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Food</Text>
            <TouchableOpacity onPress={() => setShowFoodSearch(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tab, foodSearchTab === 'myrecipes' && styles.tabActive]} onPress={() => setFoodSearchTab('myrecipes')}>
              <Text style={[styles.tabText, foodSearchTab === 'myrecipes' && styles.tabTextActive]}>My Recipes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, foodSearchTab === 'search' && styles.tabActive]} onPress={() => setFoodSearchTab('search')}>
              <Text style={[styles.tabText, foodSearchTab === 'search' && styles.tabTextActive]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, foodSearchTab === 'addrecipe' && styles.tabActive]} onPress={() => setFoodSearchTab('addrecipe')}>
              <Text style={[styles.tabText, foodSearchTab === 'addrecipe' && styles.tabTextActive]}>Add Recipe</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}>
            {foodSearchTab === 'myrecipes' && (
              <>
                {!myRecipes ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading...</Text>
                  </View>
                ) : myRecipes.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No recipes yet. Create one!</Text>
                  </View>
                ) : (
                  <View style={styles.recipesList}>
                    {myRecipes.map((recipe: any) => {
                      let nutrition: any = null;
                      try {
                        nutrition = recipe.nutritionJson ? JSON.parse(recipe.nutritionJson) : null;
                      } catch {
                        nutrition = null;
                      }
                      const perServing = nutrition?.perServing ?? nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
                      return (
                        <TouchableOpacity
                          key={recipe._id}
                          style={styles.recipeItem}
                          onPress={() =>
                            addFoodFromCatalog(
                              {
                                name: recipe.name,
                                calories: perServing.calories ?? 0,
                                protein: perServing.protein ?? 0,
                                carbs: perServing.carbs ?? 0,
                                fat: perServing.fat ?? 0,
                                servingSize: '1 serving',
                              },
                              (selectedMeal ?? 'Snack') as MealName
                            )
                          }
                        >
                          <View style={styles.recipeItemContent}>
                            <Text style={styles.recipeItemName}>{recipe.name}</Text>
                            <Text style={styles.recipeItemServings}>Servings: {recipe.servings}</Text>
                            <View style={styles.recipeItemMacros}>
                              <Text style={styles.recipeItemMacro}>Cal: {Math.round(perServing.calories ?? 0)}</Text>
                              <Text style={styles.recipeItemMacro}>P: {Math.round(perServing.protein ?? 0)} g</Text>
                              <Text style={styles.recipeItemMacro}>C: {Math.round(perServing.carbs ?? 0)} g</Text>
                              <Text style={styles.recipeItemMacro}>F: {Math.round(perServing.fat ?? 0)} g</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteRecipeButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert('Delete Recipe', 'Are you sure?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: async () => {
                                    await deleteRecipe({ recipeId: recipe._id });
                                  },
                                },
                              ]);
                            }}
                          >
                            <Ionicons name="trash" size={20} color="#dc2626" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {foodSearchTab === 'search' && (
              <>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>

                {loadingSearch ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Searching foods...</Text>
                  </View>
                ) : (
                  <View style={styles.searchResults}>
                    {searchResults.map((food) => (
                      <TouchableOpacity
                        key={food.kind === 'external' ? `${food.source}:${food.externalId}` : String(food._id)}
                        style={styles.foodItem}
                        onPress={() => addFoodFromCatalog(food, (selectedMeal ?? 'Snack') as MealName)}
                      >
                        <View style={styles.foodItemContent}>
                          <Text style={styles.foodItemName}>
                            {typeof food.name === 'object'
                              ? (food.name as any).en || 'Food'
                              : food.name}
                          </Text>
                          <Text style={styles.foodItemBrand}>{food.brand ?? '—'} • {food.servingSize ?? '100g'}</Text>
                          <Text style={styles.foodItemNutrition}>
                            {Math.round(food.calories ?? 0)} cal • {Math.round(food.protein ?? 0)}g protein • {Math.round(food.carbs ?? 0)}g carbs • {Math.round(food.fat ?? 0)}g fat
                          </Text>
                        </View>
                        <View style={styles.foodItemAdd}>
                          <Ionicons name="add-circle" size={24} color="#3b82f6" />
                        </View>
                      </TouchableOpacity>
                    ))}
                    {!loadingSearch && searchQuery && searchResults.length === 0 && (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No foods found for "{searchQuery}"</Text>
                        <Text style={styles.emptySubtext}>Try a different search term</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {foodSearchTab === 'addrecipe' && (
              <View style={styles.addRecipeContainer}>
                <TouchableOpacity
                  style={styles.createRecipeButton}
                  onPress={() => {
                    setShowFoodSearch(false);
                    setShowRecipeModal(true);
                  }}
                >
                  <Text style={styles.createRecipeButtonText}>Create a New Recipe</Text>
                </TouchableOpacity>
                <Text style={styles.createRecipeSubtext}>Build your own recipe and log it to a meal.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal >

      {/* Water Modal */}
      < Modal visible={showWaterModal} animationType="slide" transparent >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.waterModalContent} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Water</Text>
              <TouchableOpacity onPress={() => setShowWaterModal(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <View style={[styles.waterModalBody, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
              <Text style={styles.waterModalLabel}>Amount</Text>
              <TextInput
                style={styles.waterModalInput}
                placeholder="1"
                value={waterAmount}
                onChangeText={setWaterAmount}
                keyboardType="numeric"
              />

              <Text style={styles.waterModalLabel}>Unit</Text>
              <View style={styles.waterUnitGrid}>
                {waterUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit.value}
                    style={[styles.waterUnitButton, waterUnit === unit.value && styles.waterUnitButtonSelected]}
                    onPress={() => setWaterUnit(unit.value)}
                  >
                    <Text style={[styles.waterUnitButtonText, waterUnit === unit.value && styles.waterUnitButtonTextSelected]}>
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {waterAmount && (
                <View style={styles.waterPreview}>
                  <Text style={styles.waterPreviewText}>
                    {(() => {
                      const unit = waterUnits.find((u) => u.value === waterUnit);
                      const ml = (unit?.ml ?? 237) * (parseFloat(waterAmount) || 0);
                      if (isMetric) {
                        return `Adding: ${waterAmount} × ${unit?.label ?? ''} = ${Math.round(ml)}ml`;
                      }
                      return `Adding: ${waterAmount} × ${unit?.label ?? ''} = ${Math.round(ml / 29.5735)} fl oz`;
                    })()}
                  </Text>
                </View>
              )}

              <View style={styles.waterModalButtons}>
                <TouchableOpacity
                  style={styles.waterModalCancelButton}
                  onPress={() => {
                    setShowWaterModal(false);
                    setWaterAmount('');
                  }}
                >
                  <Text style={styles.waterModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.waterModalAddButton, !waterAmount && styles.waterModalAddButtonDisabled]}
                  onPress={addWater}
                  disabled={!waterAmount}
                >
                  <Text style={styles.waterModalAddText}>Add Water</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal >

      {/* Photo Recognition Modal (Gemini via Convex action; capture flow can be added later) */}
      < PhotoRecognitionModal
        visible={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        meal={selectedMeal ?? 'Lunch'}
        onRecognized={(item) => {
          setShowPhotoCapture(false);
          // Replace popup flow with an editable review screen.
          router.push({
            pathname: '/food-scan-review',
            params: {
              meal: String(selectedMeal ?? 'Lunch'),
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

      {/* Create Recipe Modal */}
      <CreateRecipeModal
        visible={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        userId={convexUser._id}
        onRecipeCreated={(recipe) => {
          setLogRecipe(recipe);
          setShowLogRecipeModal(true);
          setLogMeal('Lunch');
          setLogQuantity(1);
          setLogSuccess(false);
          setShowRecipeModal(false);
        }}
      />

      {/* Add Food Modal */}
      <AddFoodModal visible={showAddFoodModal} onClose={() => setShowAddFoodModal(false)} userId={convexUser._id} />

      {/* Log Recipe Modal */}
      <LogRecipeModal
        visible={showLogRecipeModal}
        recipe={logRecipe}
        meal={logMeal}
        quantity={logQuantity}
        success={logSuccess}
        onMealChange={setLogMeal}
        onQuantityChange={setLogQuantity}
        onSave={async () => {
          if (!logRecipe || !convexUser?._id) return;
          const perServing = logRecipe?.nutrition?.perServing ?? logRecipe?.nutrition ?? {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };

          await logFoodEntry({
            userId: convexUser._id,
            foodName: logRecipe.name,
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
            setLogMeal('Lunch');
            setLogQuantity(1);
            setLogSuccess(false);
          }, 1500);
        }}
        onCancel={() => {
          setShowLogRecipeModal(false);
          setLogRecipe(null);
          setLogMeal('Lunch');
          setLogQuantity(1);
          setLogSuccess(false);
        }}
        onClose={() => {
          setShowLogRecipeModal(false);
          setLogRecipe(null);
          setLogMeal('Lunch');
          setLogQuantity(1);
          setLogSuccess(false);
        }}
      />
    </SafeAreaView >
  );
}

function AddFoodModal({
  visible,
  onClose,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  userId: any;
}) {
  const createFood = useMutation(api.foodCatalog.createFood);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    servingSize: '100g',
    calories: '',
    totalCarbs: '',
    totalFat: '',
    protein: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value } as any);
  };

  const handleSave = async () => {
    if (!form.name || !form.calories || !form.totalFat || !form.totalCarbs || !form.protein) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createFood({
        userId,
        name: form.name,
        brand: form.brand || undefined,
        servingSize: form.servingSize,
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.totalCarbs) || 0,
        fat: parseFloat(form.totalFat) || 0,
      });

      Alert.alert('Success', 'Food/ingredient added!');
      onClose();
      setStep(1);
      setForm({ name: '', brand: '', servingSize: '100g', calories: '', totalCarbs: '', totalFat: '', protein: '' });
    } catch {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.addFoodModalContent} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Food / Ingredient</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.addFoodModalScroll} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View style={styles.addFoodStep}>
              <Text style={styles.addFoodStepTitle}>Basic Information</Text>
              <TextInput style={styles.addFoodInput} placeholder="Food Name*" value={form.name} onChangeText={(v) => handleChange('name', v)} />
              <TextInput style={styles.addFoodInput} placeholder="Brand (optional)" value={form.brand} onChangeText={(v) => handleChange('brand', v)} />

              <View style={styles.addFoodSelectContainer}>
                <Text style={styles.addFoodLabel}>Serving Size:</Text>
                <View style={styles.addFoodSelect}>
                  {['100g', '100ml', '1cup'].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.addFoodSelectOption, form.servingSize === size && styles.addFoodSelectOptionActive]}
                      onPress={() => handleChange('servingSize', size)}
                    >
                      <Text style={[styles.addFoodSelectOptionText, form.servingSize === size && styles.addFoodSelectOptionTextActive]}>
                        per {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.addFoodButton, !form.name && styles.addFoodButtonDisabled]} onPress={() => setStep(2)} disabled={!form.name}>
                <Text style={styles.addFoodButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.addFoodStep}>
              <Text style={styles.addFoodStepTitle}>Nutrition Information</Text>
              <View style={styles.addFoodGrid}>
                <TextInput style={styles.addFoodGridInput} placeholder="Calories (kcal)*" value={form.calories} onChangeText={(v) => handleChange('calories', v)} keyboardType="numeric" />
                <TextInput style={styles.addFoodGridInput} placeholder="Total Fat (g)*" value={form.totalFat} onChangeText={(v) => handleChange('totalFat', v)} keyboardType="numeric" />
                <TextInput style={styles.addFoodGridInput} placeholder="Total Carbs (g)*" value={form.totalCarbs} onChangeText={(v) => handleChange('totalCarbs', v)} keyboardType="numeric" />
                <TextInput style={styles.addFoodGridInput} placeholder="Protein (g)*" value={form.protein} onChangeText={(v) => handleChange('protein', v)} keyboardType="numeric" />
              </View>
              <View style={styles.addFoodButtons}>
                <TouchableOpacity style={styles.addFoodButtonSecondary} onPress={() => setStep(1)}>
                  <Text style={styles.addFoodButtonSecondaryText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addFoodButton, (!form.calories || !form.totalFat || !form.totalCarbs || !form.protein) && styles.addFoodButtonDisabled]}
                  onPress={() => setStep(3)}
                  disabled={!form.calories || !form.totalFat || !form.totalCarbs || !form.protein}
                >
                  <Text style={styles.addFoodButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.addFoodStep}>
              <Text style={styles.addFoodStepTitle}>Review & Save</Text>
              <View style={styles.addFoodReview}>
                <Text style={styles.addFoodReviewName}>{form.name}</Text>
                {form.brand && <Text style={styles.addFoodReviewText}>Brand: {form.brand}</Text>}
                <Text style={styles.addFoodReviewText}>Serving Size: {form.servingSize}</Text>
              </View>

              {error && <Text style={styles.addFoodError}>{error}</Text>}
              <View style={styles.addFoodButtons}>
                <TouchableOpacity style={styles.addFoodButtonSecondary} onPress={() => setStep(2)}>
                  <Text style={styles.addFoodButtonSecondaryText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addFoodButton, saving && styles.addFoodButtonDisabled]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.addFoodButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CreateRecipeModal({
  visible,
  onClose,
  onRecipeCreated,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: any) => void;
  userId: any;
}) {
  const insets = useSafeAreaInsets();
  const createRecipe = useMutation(api.recipes.createRecipe);
  const upsertExternalFood = useMutation(api.foodCatalog.upsertExternalFood);
  const matchIngredientLines = useAction(api.externalFoods.matchIngredientLines);

  const [step, setStep] = useState(1);
  const [recipeForm, setRecipeForm] = useState({ name: '', servings: 1 });
  const [bulkImportEnabled, setBulkImportEnabled] = useState(false);
  const [bulkIngredients, setBulkIngredients] = useState('');
  const [matchedIngredients, setMatchedIngredients] = useState<any[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const UNIT_OPTIONS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'piece'] as const;

  const getGramsPerServing = (servingSize: string, name: string) => {
    const known = [
      { name: /rice/i, unit: 'cup', grams: 158 },
      { name: /oats/i, unit: 'cup', grams: 81 },
      { name: /black beans/i, unit: 'cup', grams: 172 },
      { name: /chicken breast/i, unit: 'piece', grams: 120 },
    ];
    for (const k of known) {
      if (name.match(k.name) && servingSize.includes(k.unit)) return k.grams;
    }
    const match = servingSize.match(/(\d+\.?\d*)\s*(g|ml|cup|tbsp|tsp|piece)/i);
    if (match) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'g' || unit === 'ml') return amount;
      if (unit === 'cup') return 240 * amount;
      if (unit === 'tbsp') return 15 * amount;
      if (unit === 'tsp') return 5 * amount;
      if (unit === 'piece') return 50 * amount;
    }
    return 100;
  };

  const autoMatchIngredients = async () => {
    setMatchingLoading(true);
    const lines = bulkIngredients.split('\n').map((l) => l.trim()).filter(Boolean);
    try {
      const matches = await matchIngredientLines({ userId, lines });
      setMatchedIngredients(matches);
    } catch {
      setMatchedIngredients(lines.map((l) => ({ name: l, unmatched: true, quantity: 1, unit: 'g' })));
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleNextStep1 = async () => {
    if (bulkImportEnabled) {
      await autoMatchIngredients();
    }
    setStep(2);
  };

  const updateMatchedIngredient = (idx: number, newData: any) => {
    setMatchedIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...newData } : ing)));
  };

  const removeMatchedIngredient = (idx: number) => {
    setMatchedIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleManualSearch = async (idx: number, query: string) => {
    try {
      const matches = await matchIngredientLines({ userId, lines: [query] });
      const first = matches?.[0];
      if (first && !first.unmatched) {
        updateMatchedIngredient(idx, { ...first, unmatched: false });
      } else {
        updateMatchedIngredient(idx, { name: query, unmatched: true });
      }
    } catch {
      updateMatchedIngredient(idx, { name: query, unmatched: true });
    }
  };

  const calculateMacros = (ings: any[] = matchedIngredients) => {
    return ings.reduce(
      (total, ing) => {
        if (ing.unmatched) return total;
        const userUnit =
          ing.unit ||
          (ing.servingSize && String(ing.servingSize).match(/ml|g|cup|tbsp|tsp|piece/i)?.[0]?.toLowerCase()) ||
          'g';
        const userQty = ing.quantity ?? 1;
        const gramsPerServing = getGramsPerServing(ing.servingSize || '', ing.name || '');
        let factor = 1;
        if (userUnit === 'g' || userUnit === 'ml') factor = userQty / gramsPerServing;
        else if (userUnit === 'cup') factor = (userQty * 240) / gramsPerServing;
        else if (userUnit === 'tbsp') factor = (userQty * 15) / gramsPerServing;
        else if (userUnit === 'tsp') factor = (userQty * 5) / gramsPerServing;
        else if (userUnit === 'piece') factor = (userQty * 50) / gramsPerServing;
        else factor = userQty / 100;

        return {
          calories: total.calories + (ing.calories || 0) * factor,
          protein: total.protein + (ing.protein || 0) * factor,
          carbs: total.carbs + (ing.carbs || 0) * factor,
          fat: total.fat + (ing.fat || 0) * factor,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const computeIngredientTotals = (ing: any) => {
    if (!ing || ing.unmatched) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const userUnit =
      ing.unit ||
      (ing.servingSize && String(ing.servingSize).match(/ml|g|cup|tbsp|tsp|piece/i)?.[0]?.toLowerCase()) ||
      'g';
    const userQty = Number(ing.quantity ?? 1) || 1;
    const gramsPerServing = getGramsPerServing(String(ing.servingSize ?? ''), String(ing.name ?? ''));
    let factor = 1;
    if (userUnit === 'g' || userUnit === 'ml') factor = userQty / gramsPerServing;
    else if (userUnit === 'cup') factor = (userQty * 240) / gramsPerServing;
    else if (userUnit === 'tbsp') factor = (userQty * 15) / gramsPerServing;
    else if (userUnit === 'tsp') factor = (userQty * 5) / gramsPerServing;
    else if (userUnit === 'piece') factor = (userQty * 50) / gramsPerServing;
    else factor = userQty / 100;

    const calories = Number(ing.calories ?? 0) * factor;
    const protein = Number(ing.protein ?? 0) * factor;
    const carbs = Number(ing.carbs ?? 0) * factor;
    const fat = Number(ing.fat ?? 0) * factor;
    return { calories, protein, carbs, fat };
  };

  const handleSaveRecipe = async () => {
    setSaveLoading(true);
    try {
      // Persist any matched external foods so recipe ingredients are anchored to Convex foods.
      const withPersisted = [];
      for (const ing of matchedIngredients) {
        if (ing?.kind === 'external' && ing?.externalId && ing?.source) {
          const savedId = await upsertExternalFood({
            userId,
            source: String(ing.source),
            externalId: String(ing.externalId),
            name: String(ing.name ?? 'Food'),
            brand: ing.brand ?? undefined,
            barcode: ing.barcode ?? undefined,
            servingSize: String(ing.servingSize ?? '100g'),
            calories: Number(ing.calories ?? 0),
            protein: Number(ing.protein ?? 0),
            carbs: Number(ing.carbs ?? 0),
            fat: Number(ing.fat ?? 0),
          });
          withPersisted.push({ ...ing, foodId: String(savedId) });
        } else if (ing?._id) {
          withPersisted.push({ ...ing, foodId: String(ing._id) });
        } else {
          withPersisted.push(ing);
        }
      }

      const totalMacros = calculateMacros(withPersisted);
      const servings = recipeForm.servings || 1;
      const perServing = {
        calories: totalMacros.calories / servings,
        protein: totalMacros.protein / servings,
        carbs: totalMacros.carbs / servings,
        fat: totalMacros.fat / servings,
      };
      const nutrition = { total: totalMacros, perServing };

      const ingredientsJson = JSON.stringify(
        withPersisted.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? 1,
          unit: ing.unit ?? 'g',
          calories: ing.calories ?? 0,
          protein: ing.protein ?? 0,
          carbs: ing.carbs ?? 0,
          fat: ing.fat ?? 0,
          servingSize: ing.servingSize ?? '',
          foodId: ing.foodId ?? undefined,
          source: ing.source ?? undefined,
          externalId: ing.externalId ?? undefined,
        }))
      );

      const nutritionJson = JSON.stringify(nutrition);

      const id = await createRecipe({
        userId,
        name: recipeForm.name,
        servings: recipeForm.servings,
        ingredientsJson,
        nutritionJson,
      });

      onRecipeCreated({
        _id: id,
        name: recipeForm.name,
        servings: recipeForm.servings,
        ingredientsJson,
        nutritionJson,
        nutrition,
      });

      setRecipeForm({ name: '', servings: 1 });
      setBulkIngredients('');
      setMatchedIngredients([]);
      setStep(1);
      setBulkImportEnabled(false);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save recipe.');
    } finally {
      setSaveLoading(false);
    }
  };

  const servings = recipeForm.servings || 1;
  const macros = calculateMacros();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.createRecipeModalContent} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Recipe</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.createRecipeScroll}
          contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 20) }}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.createRecipeForm}>
              <Text style={styles.createRecipeLabel}>Recipe Name*</Text>
              <TextInput
                style={styles.createRecipeInput}
                placeholder="e.g. Chicken Stir Fry"
                value={recipeForm.name}
                onChangeText={(v) => setRecipeForm({ ...recipeForm, name: v })}
              />

              <Text style={styles.createRecipeLabel}>Servings*</Text>
              <TextInput
                style={styles.createRecipeInput}
                placeholder="e.g. 4"
                value={String(recipeForm.servings)}
                onChangeText={(v) => setRecipeForm({ ...recipeForm, servings: parseInt(v) || 1 })}
                keyboardType="numeric"
              />

              <View style={styles.createRecipeCheckboxContainer}>
                <Text style={styles.createRecipeLabel}>Bulk Ingredients Import</Text>
                <TouchableOpacity style={styles.createRecipeCheckbox} onPress={() => setBulkImportEnabled(!bulkImportEnabled)}>
                  {bulkImportEnabled ? (
                    <Ionicons name="checkbox" size={24} color="#f97316" />
                  ) : (
                    <Ionicons name="square-outline" size={24} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>

              {bulkImportEnabled && (
                <View style={styles.createRecipeBulkContainer}>
                  <Text style={styles.createRecipeLabel}>Paste or type your ingredients (one per line):</Text>
                  <TextInput
                    style={styles.createRecipeTextArea}
                    placeholder="e.g. 2 chicken breasts\n1 cup broccoli\n1 tbsp olive oil"
                    value={bulkIngredients}
                    onChangeText={setBulkIngredients}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <Text style={styles.createRecipeNote}>We&apos;ll match them to foods in your database.</Text>
                </View>
              )}

              <View style={styles.createRecipeButtons}>
                <TouchableOpacity style={styles.createRecipeCancelButton} onPress={onClose}>
                  <Text style={styles.createRecipeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createRecipeSaveButton, (!recipeForm.name || !recipeForm.servings) && styles.createRecipeSaveButtonDisabled]}
                  onPress={handleNextStep1}
                  disabled={!recipeForm.name || !recipeForm.servings}
                >
                  <Text style={styles.createRecipeSaveText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.createRecipeForm}>
              <Text style={styles.createRecipeSectionTitle}>Ingredients</Text>
              {matchingLoading ? (
                <View style={styles.createRecipeLoading}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={styles.createRecipeLoadingText}>Matching ingredients...</Text>
                </View>
              ) : (
                <View style={styles.createRecipeIngredientsList}>
                  {matchedIngredients.length === 0 && (
                    <Text style={styles.createRecipeEmptyText}>No ingredients found. Go back and add some.</Text>
                  )}
                  {matchedIngredients.map((ing, idx) => {
                    const totals = computeIngredientTotals(ing);
                    const fmtCal = (n: number) => String(Math.max(0, Math.round(n)));
                    const fmtG = (n: number) => String(Math.max(0, Math.round(n * 10) / 10));
                    return (
                      <View key={idx} style={styles.createRecipeIngredientItem}>
                        <View style={styles.createRecipeIngredientHeader}>
                          <View style={styles.createRecipeMatchIcon}>
                            {ing.unmatched ? (
                              <Ionicons name="alert-circle" size={20} color="#dc2626" />
                            ) : (
                              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                            )}
                          </View>

                          <View style={styles.createRecipeIngredientHeaderMain}>
                            <Text style={styles.createRecipeIngredientTitle} numberOfLines={2}>
                              {String(ing?.name ?? ing?.original ?? 'Ingredient')}
                            </Text>
                            <Text style={styles.createRecipeIngredientMeta} numberOfLines={2}>
                              {String(ing.quantity ?? 1)} {String(ing.unit ?? 'g')}
                              {ing?.servingSize ? ` • ${String(ing.servingSize)}` : ''}
                              {ing?.unmatched ? ' • unmatched' : ''}
                            </Text>
                            {!!ing?.original && (
                              <Text style={styles.createRecipeIngredientOriginal} numberOfLines={1}>
                                Original: "{String(ing.original)}"
                              </Text>
                            )}
                          </View>

                          <View style={styles.createRecipeIngredientHeaderRight}>
                            {!ing.unmatched && (
                              <>
                                <Text style={styles.createRecipeIngredientCalories}>
                                  {fmtCal(totals.calories)}
                                </Text>
                                <Text style={styles.createRecipeIngredientCaloriesLabel}>cal</Text>
                              </>
                            )}
                            <TouchableOpacity
                              style={styles.createRecipeIngredientEdit}
                              onPress={() => updateMatchedIngredient(idx, { editing: !ing.editing })}
                            >
                              <Ionicons name={ing.editing ? 'close-circle' : 'search'} size={20} color="#2563eb" />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity style={styles.createRecipeIngredientDelete} onPress={() => removeMatchedIngredient(idx)}>
                            <Ionicons name="trash" size={18} color="#dc2626" />
                          </TouchableOpacity>
                        </View>

                        {(ing.unmatched || ing.editing) && (
                          <View style={[styles.createRecipeIngredientSearch, { marginBottom: 12 }]}>
                            <Text style={styles.createRecipeSearchLabel}>
                              {ing.unmatched ? 'No match found. Search manually:' : 'Re-search ingredient:'}
                            </Text>
                            <TextInput
                              style={styles.createRecipeIngredientSearchInput}
                              placeholder="Search manually..."
                              defaultValue={ing.unmatched ? (ing.original || ing.name) : ''}
                              onSubmitEditing={(e) => {
                                handleManualSearch(idx, e.nativeEvent.text);
                                updateMatchedIngredient(idx, { editing: false });
                              }}
                              autoFocus={!!ing.editing}
                            />
                          </View>
                        )}

                        <View style={styles.createRecipeIngredientControls}>
                          <TextInput
                            style={styles.createRecipeIngredientQty}
                            value={String(ing.quantity ?? 1)}
                            onChangeText={(v) => updateMatchedIngredient(idx, { quantity: parseFloat(v) || 1 })}
                            keyboardType="numeric"
                          />
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.createRecipeIngredientUnit}>
                            {UNIT_OPTIONS.map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                style={[styles.createRecipeUnitOption, (ing.unit || 'g') === unit && styles.createRecipeUnitOptionActive]}
                                onPress={() => updateMatchedIngredient(idx, { unit })}
                              >
                                <Text style={[styles.createRecipeUnitText, (ing.unit || 'g') === unit && styles.createRecipeUnitTextActive]}>
                                  {unit}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {!ing.unmatched && (
                          <View style={styles.createRecipeIngredientMacros}>
                            <View style={styles.createRecipeMacroField}>
                              <TextInput
                                style={styles.createRecipeIngredientMacroInput}
                                value={fmtCal(totals.calories)}
                                editable={false}
                              />
                              <Text style={styles.createRecipeIngredientMacroLabel}>cal</Text>
                            </View>
                            <View style={styles.createRecipeMacroField}>
                              <TextInput
                                style={styles.createRecipeIngredientMacroInput}
                                value={fmtG(totals.protein)}
                                editable={false}
                              />
                              <Text style={styles.createRecipeIngredientMacroLabel}>P (g)</Text>
                            </View>
                            <View style={styles.createRecipeMacroField}>
                              <TextInput
                                style={styles.createRecipeIngredientMacroInput}
                                value={fmtG(totals.carbs)}
                                editable={false}
                              />
                              <Text style={styles.createRecipeIngredientMacroLabel}>C (g)</Text>
                            </View>
                            <View style={styles.createRecipeMacroField}>
                              <TextInput
                                style={styles.createRecipeIngredientMacroInput}
                                value={fmtG(totals.fat)}
                                editable={false}
                              />
                              <Text style={styles.createRecipeIngredientMacroLabel}>F (g)</Text>
                            </View>
                          </View>
                        )}

                        {!ing.unmatched && (
                          <View style={styles.createRecipeIngredientComputedRow}>
                            <Text style={styles.createRecipeIngredientComputedText}>
                              Totals: {fmtCal(totals.calories)} cal • {fmtG(totals.protein)}g P • {fmtG(totals.carbs)}g C • {fmtG(totals.fat)}g F
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.createRecipeButtons}>
                <TouchableOpacity style={styles.createRecipeCancelButton} onPress={() => setStep(1)}>
                  <Text style={styles.createRecipeCancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createRecipeSaveButton, (matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)) && styles.createRecipeSaveButtonDisabled]}
                  onPress={() => setStep(3)}
                  disabled={matchedIngredients.length === 0 || matchedIngredients.some((ing) => ing.unmatched)}
                >
                  <Text style={styles.createRecipeSaveText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.createRecipeForm}>
              <Text style={styles.createRecipeSectionTitle}>Review & Save</Text>
              <View style={styles.createRecipeReview}>
                <View style={styles.createRecipeReviewItem}>
                  <Text style={styles.createRecipeReviewLabel}>Recipe Name:</Text>
                  <Text style={styles.createRecipeReviewValue}>{recipeForm.name}</Text>
                </View>
                <View style={styles.createRecipeReviewItem}>
                  <Text style={styles.createRecipeReviewLabel}>Servings:</Text>
                  <Text style={styles.createRecipeReviewValue}>{recipeForm.servings}</Text>
                </View>
                <View style={styles.createRecipeReviewItem}>
                  <Text style={styles.createRecipeReviewLabel}>Macros (per serving):</Text>
                  <Text style={styles.createRecipeReviewValue}>Calories: {Math.round(macros.calories / servings)} kcal</Text>
                  <Text style={styles.createRecipeReviewValue}>Protein: {Math.round(macros.protein / servings)} g</Text>
                  <Text style={styles.createRecipeReviewValue}>Carbs: {Math.round(macros.carbs / servings)} g</Text>
                  <Text style={styles.createRecipeReviewValue}>Fat: {Math.round(macros.fat / servings)} g</Text>
                </View>
              </View>

              <View style={styles.createRecipeButtons}>
                <TouchableOpacity style={styles.createRecipeCancelButton} onPress={() => setStep(2)}>
                  <Text style={styles.createRecipeCancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.createRecipeSaveButton, saveLoading && styles.createRecipeSaveButtonDisabled]} onPress={handleSaveRecipe} disabled={saveLoading}>
                  <Text style={styles.createRecipeSaveText}>{saveLoading ? 'Saving...' : 'Save Recipe'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal >
  );
}

function LogRecipeModal({
  visible,
  recipe,
  meal,
  quantity,
  success,
  onMealChange,
  onQuantityChange,
  onSave,
  onCancel,
  onClose,
}: {
  visible: boolean;
  recipe: any;
  meal: MealName;
  quantity: number;
  success: boolean;
  onMealChange: (meal: MealName) => void;
  onQuantityChange: (qty: number) => void;
  onSave: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!visible || !recipe) return null;

  const perServing = recipe.nutrition?.perServing || recipe.nutrition || {
    calories: recipe.calories || 0,
    protein: recipe.protein || 0,
    carbs: recipe.carbs || 0,
    fat: recipe.fat || 0,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={[styles.logRecipeModalContent, { paddingBottom: getBottomContentPadding(insets.bottom) }]} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Recipe to Meal</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.logRecipeSuccess}>
              <View style={styles.logRecipeSuccessIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
              </View>
              <Text style={styles.logRecipeSuccessTitle}>Recipe Logged!</Text>
              <Text style={styles.logRecipeSuccessText}>Your recipe has been added to {meal}</Text>
            </View>
          ) : (
            <View style={styles.logRecipeBody}>
              <View style={styles.logRecipeInfo}>
                <Text style={styles.logRecipeName}>{recipe.title || recipe.name}</Text>
                <Text style={styles.logRecipeMacros}>
                  {Math.round(perServing.calories)} cal • {Math.round(perServing.protein)}g protein • {Math.round(perServing.carbs)}g carbs • {Math.round(perServing.fat)}g fat
                </Text>
              </View>

              <View style={styles.logRecipeField}>
                <Text style={styles.logRecipeLabel}>Meal</Text>
                <View style={styles.logRecipeSelect}>
                  {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealName[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.logRecipeSelectOption, meal === m && styles.logRecipeSelectOptionActive]}
                      onPress={() => onMealChange(m)}
                    >
                      <Text style={[styles.logRecipeSelectOptionText, meal === m && styles.logRecipeSelectOptionTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.logRecipeField}>
                <Text style={styles.logRecipeLabel}>Quantity (servings)</Text>
                <View style={styles.logRecipeQuantity}>
                  <TouchableOpacity style={styles.logRecipeQuantityButton} onPress={() => onQuantityChange(Math.max(1, quantity - 1))}>
                    <Ionicons name="remove" size={20} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={styles.logRecipeQuantityValue}>{quantity}</Text>
                  <TouchableOpacity style={styles.logRecipeQuantityButton} onPress={() => onQuantityChange(quantity + 1)}>
                    <Ionicons name="add" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.logRecipeButtons}>
                <TouchableOpacity style={styles.logRecipeCancelButton} onPress={onCancel}>
                  <Text style={styles.logRecipeCancelText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logRecipeSaveButton} onPress={onSave}>
                  <Text style={styles.logRecipeSaveText}>Log to {meal}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plusButton: {
    backgroundColor: '#3b82f6',
  },
  plusMenu: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  plusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  plusMenuText: {
    fontSize: 14,
    color: '#1e293b',
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  calendarContainer: {
    gap: 12,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarItem: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDay: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  calendarDateButton: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateButtonSelected: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  calendarDateTextSelected: {
    color: '#ffffff',
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
  },
  calendarDotActive: {
    backgroundColor: '#16a34a',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  nutritionLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 8,
    minHeight: 14,
  },
  nutritionRemaining: {
    fontSize: isSmallScreen ? 9 : 11,
    color: '#64748b',
    marginTop: 4,
    minHeight: 12,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  waterSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  addWaterButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addWaterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  waterProgress: {
    flexDirection: 'row',
    gap: 4,
  },
  waterGlass: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  waterGlassFilled: {
    backgroundColor: '#3b82f6',
  },
  mealsSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mealCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  mealTotals: {
    fontSize: 12,
    color: '#64748b',
  },
  mealAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealEntries: {
    gap: 8,
  },
  mealEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  mealEntryLeft: {
    flex: 1,
  },
  mealEntryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  mealEntryQuantity: {
    fontSize: 12,
    color: '#64748b',
  },
  mealEntryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  mealEntrySubline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  macroRowHorizontal: {
    flexDirection: 'row',
    gap: 6,
  },
  mealEntryMacros: {
    fontSize: 11,
    color: '#64748b',
  },
  deleteEntryButton: {
    marginTop: 4,
    padding: 4,
  },
  emptyMeal: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyMealText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    marginTop: 8,
  },
  addMealText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 40,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  searchResults: {
    gap: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  foodItemContent: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  foodItemBrand: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  foodItemNutrition: {
    fontSize: 12,
    color: '#64748b',
  },
  foodItemAdd: {
    marginLeft: 12,
  },
  recipesList: {
    gap: 12,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  recipeItemContent: {
    flex: 1,
  },
  recipeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recipeItemServings: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  recipeItemMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  recipeItemMacro: {
    fontSize: 11,
    color: '#64748b',
  },
  deleteRecipeButton: {
    padding: 8,
  },
  addRecipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  createRecipeButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  createRecipeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  createRecipeSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  waterModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  waterModalBody: {
    padding: 20,
  },
  waterModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  waterModalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  waterUnitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 20,
  },
  waterUnitButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  waterUnitButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  waterUnitButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  waterUnitButtonTextSelected: {
    color: '#ffffff',
  },
  waterPreview: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  waterPreviewText: {
    fontSize: 12,
    color: '#2563eb',
  },
  waterModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  waterModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  waterModalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  waterModalAddButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  waterModalAddButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  waterModalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  addFoodModalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  addFoodModalScroll: {
    flex: 1,
    padding: 20,
  },
  addFoodStep: {
    gap: 16,
  },
  addFoodStepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  addFoodInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  addFoodSelectContainer: {
    marginTop: 8,
  },
  addFoodLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  addFoodSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  addFoodSelectOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  addFoodSelectOptionActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  addFoodSelectOptionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  addFoodSelectOptionTextActive: {
    color: '#ffffff',
  },
  addFoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  addFoodGridInput: {
    width: (width - 64) / 2,
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  addFoodButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  addFoodButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 12,
    alignItems: 'center',
  },
  addFoodButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  addFoodButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addFoodButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  addFoodButtonSecondaryText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  addFoodReview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addFoodReviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  addFoodReviewText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  addFoodError: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  logRecipeModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  logRecipeSuccess: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logRecipeSuccessIcon: {
    marginBottom: 16,
  },
  logRecipeSuccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  logRecipeSuccessText: {
    fontSize: 14,
    color: '#64748b',
  },
  logRecipeBody: {
    gap: 20,
  },
  logRecipeInfo: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  logRecipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  logRecipeMacros: {
    fontSize: 14,
    color: '#64748b',
  },
  logRecipeField: {
    gap: 8,
  },
  logRecipeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  logRecipeSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  logRecipeSelectOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  logRecipeSelectOptionActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  logRecipeSelectOptionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  logRecipeSelectOptionTextActive: {
    color: '#ffffff',
  },
  logRecipeQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logRecipeQuantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logRecipeQuantityValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    minWidth: 40,
    textAlign: 'center',
  },
  logRecipeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  logRecipeCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  logRecipeCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  logRecipeSaveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 12,
    alignItems: 'center',
  },
  logRecipeSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  createRecipeModalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  createRecipeScroll: {
    flex: 1,
    padding: 20,
  },
  createRecipeForm: {
    gap: 16,
  },
  createRecipeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  createRecipeInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  createRecipeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 12,
  },
  createRecipeCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  createRecipeCheckbox: {
    padding: 4,
  },
  createRecipeBulkContainer: {
    marginTop: 12,
    gap: 8,
  },
  createRecipeTextArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  createRecipeNote: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  createRecipeLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  createRecipeLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  createRecipeEmptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#94a3b8',
    paddingVertical: 20,
  },
  createRecipeIngredientsList: {
    // Let the parent ScrollView handle scrolling; avoids clipped rows on small screens.
    marginBottom: 16,
  },
  createRecipeIngredientItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  createRecipeIngredientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  createRecipeMatchIcon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRecipeIngredientHeaderMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  createRecipeIngredientHeaderRight: {
    alignItems: 'flex-end',
    paddingTop: 2,
    minWidth: 54,
  },
  createRecipeIngredientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  createRecipeIngredientMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  createRecipeIngredientOriginal: {
    fontSize: 11,
    color: '#94a3b8',
  },
  createRecipeIngredientCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  createRecipeIngredientCaloriesLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  createRecipeIngredientControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  createRecipeIngredientQty: {
    width: 60,
    height: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    textAlign: 'center',
  },
  createRecipeIngredientUnit: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  createRecipeUnitOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  createRecipeUnitOptionActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  createRecipeUnitText: {
    fontSize: 11,
    color: '#64748b',
  },
  createRecipeUnitTextActive: {
    color: '#ffffff',
  },
  createRecipeIngredientName: {
    flex: 1,
  },
  createRecipeIngredientNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  createRecipeIngredientServing: {
    fontSize: 11,
    color: '#64748b',
  },
  createRecipeIngredientUnmatched: {
    fontSize: 11,
    color: '#dc2626',
  },
  createRecipeIngredientDelete: {
    padding: 4,
  },
  createRecipeIngredientMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  createRecipeMacroField: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  createRecipeIngredientMacroInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  createRecipeIngredientMacroLabel: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  createRecipeIngredientComputedRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  createRecipeIngredientComputedText: {
    fontSize: 12,
    color: '#475569',
  },
  createRecipeIngredientSearch: {
    marginTop: 8,
  },
  createRecipeSearchLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  createRecipeIngredientEdit: {
    marginTop: 8,
    padding: 4,
  },
  createRecipeIngredientSearchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  createRecipeReview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  createRecipeReviewItem: {
    gap: 4,
  },
  createRecipeReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  createRecipeReviewValue: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  createRecipeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  createRecipeCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  createRecipeCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  createRecipeSaveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 12,
    alignItems: 'center',
  },
  createRecipeSaveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  createRecipeSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  screenLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
