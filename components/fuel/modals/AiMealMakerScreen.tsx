/**
 * app/ai-meal-maker.tsx
 *
 * AI Meal Maker — two entry flows:
 *  A) Camera → photo of fridge/ingredients → our AI identifies them → user picks cuisine/goal → AI generates recipe
 *  B) Text → user types ingredients → same flow
 *
 * Generated recipe shown with: title, image (Unsplash placeholder), macros,
 * ingredients, steps, and a "Log as Meal" or "Save to My Recipes" CTA.
 *
 * Register in _layout.tsx:
 *   <Stack.Screen name="ai-meal-maker" options={{ headerShown: false }} />
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert,
  Dimensions, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { Platform } from 'react-native';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowMode = 'choose' | 'camera' | 'text' | 'options' | 'generating' | 'result';

interface GeneratedRecipe {
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
  tags: string[];
  imageSearchQuery: string; // used to find a relevant Unsplash image
}

const CUISINE_OPTIONS = [
  { label: 'Any',          icon: '🌍' },
  { label: 'Mediterranean', icon: '🫒' },
  { label: 'Asian',        icon: '🍜' },
  { label: 'Mexican',      icon: '🌮' },
  { label: 'Indian',       icon: '🍛' },
  { label: 'American',     icon: '🍔' },
  { label: 'Italian',      icon: '🍝' },
  { label: 'Middle Eastern', icon: '🧆' },
];

const GOAL_OPTIONS = [
  { label: 'High Protein', icon: '💪', value: 'high_protein' },
  { label: 'Low Carb',     icon: '🥑', value: 'low_carb' },
  { label: 'Balanced',     icon: '⚖️',  value: 'balanced' },
  { label: 'Low Calorie',  icon: '🌿', value: 'low_calorie' },
  { label: 'Bulk',         icon: '📈', value: 'bulk' },
  { label: 'Comfort Food', icon: '🍲', value: 'comfort' },
];

const UNSPLASH_FOOD_IMAGES: Record<string, string> = {
  default:       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  pasta:         'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80',
  salad:         'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  chicken:       'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
  soup:          'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
  bowl:          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  steak:         'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  smoothie:      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80',
  eggs:          'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  fish:          'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
};

function getRecipeImage(query: string): string {
  const q = (query ?? '').toLowerCase();
  for (const key of Object.keys(UNSPLASH_FOOD_IMAGES)) {
    if (key !== 'default' && q.includes(key)) return UNSPLASH_FOOD_IMAGES[key];
  }
  return UNSPLASH_FOOD_IMAGES.default;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AiMealMakerScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user: clerkUser } = useUser();

  const { isPro, promptUpgrade, convexUser } = useAccessControl();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState(t('aiChef.proRequired', 'This feature is available on Pro.'));

  // Convex actions
  const scanIngredients   = useAction(api.ai.recognizeFoodFromImage);
  const generateMeal      = useAction(api.Aimealmaker.generateAiMealFromIngredients);
  const logFoodEntry      = useMutation(api.food.logFoodEntry);
  const createRecipe      = useMutation(api.recipes.createRecipe);

  // Camera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Flow state
  const [mode,           setMode]           = useState<FlowMode>('choose');
  const [textIngredients, setTextIngredients] = useState('');
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [selectedCuisine,  setSelectedCuisine]  = useState('Any');
  const [selectedGoal,     setSelectedGoal]      = useState('balanced');
  const [generatedRecipe,  setGeneratedRecipe]   = useState<GeneratedRecipe | null>(null);
  const [savingRecipe,     setSavingRecipe]       = useState(false);
  const [loggingMeal,      setLoggingMeal]        = useState(false);
  const [scanningPhoto,    setScanningPhoto]      = useState(false);
  const [showSaveSuccess,  setShowSaveSuccess]    = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // ── Camera capture ──────────────────────────────────────────────────────────

  const handleTakePhoto = async () => {
    if (!isPro) {
      setUpgradeMessage('AI photo scanning is a Pro feature.');
      setShowUpgrade(true);
      return;
    }
    if (!cameraRef.current) return;
    setScanningPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo.base64) throw new Error('No image data');

      // Use existing recognizeFoodFromImage to identify ingredients
      const result = await scanIngredients({
        imageBase64: photo.base64,
        mimeType: 'image/jpeg',
        platform,
        language: i18n.language,
      });

      if (result.status === 'maintenance') {
        Alert.alert(t('aiChef.aiOfflineTitle', 'AI Unavailable'), t('aiChef.aiOfflineMsg', 'Image scanning is temporarily offline.'));
        return;
      }

      // The recognizeFoodFromImage returns a single food item name — we use it as an ingredient list
      // For a real fridge scan, the prompt inside ai.ts would need updating.
      // Here we build a simple ingredient list from the response.
      const detected = result.name && result.name !== 'Unknown'
        ? [result.name]
        : ['mixed vegetables'];

      setDetectedIngredients(detected);
      setMode('options');
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('aiChef.scanError', 'Could not scan image. Please try again.'));
    } finally {
      setScanningPhoto(false);
    }
  };

  // Let free users explore the page; gate only on AI actions.

  // ── Text submit ─────────────────────────────────────────────────────────────

  const handleTextSubmit = () => {
    const lines = textIngredients
      .split(/[,\n]/)
      .map(l => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      Alert.alert(t('aiChef.noIngredientsTitle', 'No ingredients'), t('aiChef.noIngredientsMsg', 'Please enter at least one ingredient.'));
      return;
    }
    setDetectedIngredients(lines);
    setMode('options');
  };

  // ── Generate recipe ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!isPro) {
      setUpgradeMessage('AI recipe generation is a Pro feature.');
      setShowUpgrade(true);
      return;
    }
    if (!detectedIngredients.length) return;
    setMode('generating');
    try {
      const result = await generateMeal({
        ingredients: detectedIngredients,
        cuisine: selectedCuisine,
        goal: selectedGoal,
        platform,
        language: i18n.language,
      });
      setGeneratedRecipe(result as GeneratedRecipe);
      setMode('result');
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('aiChef.generateError', 'Failed to generate recipe. Please try again.'));
      setMode('options');
    }
  };

  // ── Save / Log ──────────────────────────────────────────────────────────────

  const handleSaveRecipe = async () => {
    if (!isPro) {
      setUpgradeMessage('Saving AI recipes is a Pro feature.');
      setShowUpgrade(true);
      return;
    }
    if (!generatedRecipe || !convexUser?._id) return;
    setSavingRecipe(true);
    try {
      const ingredientsJson = JSON.stringify(
        generatedRecipe.ingredients.map(i => ({
          name: i.name, quantity: 1, unit: i.amount,
          calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: i.amount,
        }))
      );
      const nutritionJson = JSON.stringify({
        total: {
          calories: generatedRecipe.calories * generatedRecipe.servings,
          protein: generatedRecipe.protein * generatedRecipe.servings,
          carbs: generatedRecipe.carbs * generatedRecipe.servings,
          fat: generatedRecipe.fat * generatedRecipe.servings,
        },
        perServing: {
          calories: generatedRecipe.calories,
          protein: generatedRecipe.protein,
          carbs: generatedRecipe.carbs,
          fat: generatedRecipe.fat,
        },
      });

      await createRecipe({
        userId: convexUser._id,
        name: generatedRecipe.title,
        servings: generatedRecipe.servings,
        ingredientsJson,
        nutritionJson,
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2500);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('aiChef.saveError', 'Could not save recipe.'));
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleLogMeal = async () => {
    if (!isPro) {
      setUpgradeMessage('Logging AI recipes is a Pro feature.');
      setShowUpgrade(true);
      return;
    }
    if (!generatedRecipe || !convexUser?._id) return;
    setLoggingMeal(true);
    try {
      await logFoodEntry({
        userId: convexUser._id,
        foodName: generatedRecipe.title,
        calories: generatedRecipe.calories,
        protein: generatedRecipe.protein,
        carbs: generatedRecipe.carbs,
        fat: generatedRecipe.fat,
        servingSize: `1 serving of ${generatedRecipe.servings}`,
        mealType: 'lunch',
        date: today,
      });
      Alert.alert(t('aiChef.loggedTitle', 'Logged!'), t('aiChef.loggedMsg', { title: generatedRecipe.title, defaultValue: `${generatedRecipe.title} added to Lunch for today.` }), [
        { text: t('aiChef.viewFuel', 'View Fuel'), onPress: () => { router.push('/(tabs)/fuel'); } },
        { text: t('aiChef.stayHere', 'Stay here'), style: 'cancel' },
      ]);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.message ?? t('aiChef.logError', 'Could not log meal.'));
    } finally {
      setLoggingMeal(false);
    }
  };

  const handleReset = () => {
    setMode('choose');
    setTextIngredients('');
    setDetectedIngredients([]);
    setSelectedCuisine('Any');
    setSelectedGoal('balanced');
    setGeneratedRecipe(null);
  };

  // ── Renders ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <ProUpgradeModal 
        visible={showUpgrade} 
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/(tabs)/profile');
        }}
        title={t('aiChef.proTitle', 'AI Chef Pro')}
        message={upgradeMessage}
      />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => {
          if (mode === 'choose') router.back();
          else if (mode === 'result') handleReset();
          else setMode('choose');
        }} style={st.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={st.headerTitle}>{t('aiChef.headerTitle', 'AI Meal Maker')}</Text>
          <Text style={st.headerSub}>{t('aiChef.headerSub', 'Generate recipes from your ingredients')}</Text>
        </View>
        {mode === 'result' && (
          <TouchableOpacity onPress={handleReset} style={st.newBtn}>
            <Text style={st.newBtnText}>{t('aiChef.newBtn', 'New')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── CHOOSE MODE ── */}
      {mode === 'choose' && (
        <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1e1b4b', '#312e81', '#4c1d95']} style={st.heroBanner}>
            <View style={[st.blob, { top: -30, right: -20, width: 130, height: 130 }]} />
            <Ionicons name="sparkles" size={28} color="#a78bfa" style={{ marginBottom: 12 }} />
            <Text style={st.heroTitle}>{t('aiChef.heroTitle', "What's in your fridge?")}</Text>
            <Text style={st.heroSub}>{t('aiChef.heroSub', 'Snap a photo or type your ingredients and let AI craft the perfect meal for your goals.')}</Text>
          </LinearGradient>

          <TouchableOpacity
            style={st.modeCard}
            onPress={async () => {
              if (!isPro) {
                setUpgradeMessage('AI photo scanning is a Pro feature.');
                setShowUpgrade(true);
                return;
              }
              if (!cameraPermission?.granted) await requestCameraPermission();
              setMode('camera');
            }}
            activeOpacity={0.88}
          >
            <View style={[st.modeIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="camera" size={26} color="#2563eb" />
            </View>
            <View style={st.modeText}>
              <Text style={st.modeTitle}>{t('aiChef.scanModeTitle', 'Scan Ingredients')}</Text>
              <Text style={st.modeSub}>{t('aiChef.scanModeSub', 'Take a photo of your fridge, pantry, or meal prep')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={st.modeCard}
            onPress={() => {
              if (!isPro) {
                setUpgradeMessage('AI recipe generation is a Pro feature.');
                setShowUpgrade(true);
                return;
              }
              setMode('text');
            }}
            activeOpacity={0.88}
          >
            <View style={[st.modeIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="create-outline" size={26} color="#059669" />
            </View>
            <View style={st.modeText}>
              <Text style={st.modeTitle}>{t('aiChef.typeModeTitle', 'Type Ingredients')}</Text>
              <Text style={st.modeSub}>{t('aiChef.typeModeSub', 'Enter what you have and AI will build around it')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── CAMERA MODE ── */}
      {mode === 'camera' && (
        <View style={{ flex: 1 }}>
          {cameraPermission?.granted ? (
            <>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
                <View style={st.cameraOverlay}>
                  <View style={st.cameraFrame} />
                  <Text style={st.cameraHint}>{t('aiChef.cameraHint', 'Point at your ingredients or fridge')}</Text>
                </View>
              </CameraView>
              <View style={[st.cameraControls, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                {scanningPhoto
                  ? <ActivityIndicator size="large" color="#fff" />
                  : (
                    <TouchableOpacity style={st.captureBtn} onPress={handleTakePhoto} activeOpacity={0.85}>
                      <View style={st.captureBtnInner} />
                    </TouchableOpacity>
                  )
                }
              </View>
            </>
          ) : (
            <View style={st.permissionWrap}>
              <Ionicons name="camera-outline" size={48} color="#94a3b8" />
              <Text style={st.permissionText}>{t('aiChef.cameraAccessNeeded', 'Camera access needed')}</Text>
              <TouchableOpacity style={st.permissionBtn} onPress={requestCameraPermission}>
                <Text style={st.permissionBtnText}>{t('aiChef.grantAccess', 'Grant Access')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── TEXT MODE ── */}
      {mode === 'text' && (
        <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={st.inputLabel}>{t('aiChef.yourIngredients', 'Your ingredients')}</Text>
          <TextInput
            style={st.textarea}
            placeholder={t('aiChef.ingredientsPlaceholder', "chicken breast, broccoli, garlic, olive oil, lemon…")}
            placeholderTextColor="#94a3b8"
            value={textIngredients}
            onChangeText={setTextIngredients}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={st.inputHint}>{t('aiChef.inputHint', 'Separate with commas or new lines')}</Text>
          <TouchableOpacity
            style={[st.primaryBtn, !textIngredients.trim() && { opacity: 0.5 }]}
            onPress={handleTextSubmit}
            disabled={!textIngredients.trim()}
            activeOpacity={0.88}
          >
            <Text style={st.primaryBtnText}>{t('aiChef.nextChooseStyle', 'Next: Choose Style')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── OPTIONS MODE ── */}
      {mode === 'options' && (
        <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
          {/* Detected ingredients */}
          <View style={st.detectedBox}>
            <Text style={st.detectedLabel}>{t('aiChef.ingredientsDetected', { count: detectedIngredients.length, defaultValue: `Ingredients detected (${detectedIngredients.length})` })}</Text>
            <View style={st.chips}>
              {detectedIngredients.map((ing, i) => (
                <View key={i} style={st.chip}>
                  <Text style={st.chipText}>{ing}</Text>
                  <TouchableOpacity onPress={() => setDetectedIngredients(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close" size={12} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Cuisine */}
          <Text style={st.sectionLabel}>{t('aiChef.cuisine', 'Cuisine')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
              {CUISINE_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c.label}
                  style={[st.optionChip, selectedCuisine === c.label && st.optionChipActive]}
                  onPress={() => setSelectedCuisine(c.label)}
                  activeOpacity={0.8}
                >
                  <Text style={st.optionChipIcon}>{c.icon}</Text>
                  <Text style={[st.optionChipText, selectedCuisine === c.label && st.optionChipTextActive]}>
                    {t(`aiChef.cuisines.${c.label.replace(' ', '')}`, c.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Goal */}
          <Text style={st.sectionLabel}>{t('aiChef.goal', 'Goal')}</Text>
          <View style={st.goalGrid}>
            {GOAL_OPTIONS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[st.goalChip, selectedGoal === g.value && st.goalChipActive]}
                onPress={() => setSelectedGoal(g.value)}
                activeOpacity={0.8}
              >
                <Text style={st.goalIcon}>{g.icon}</Text>
                <Text style={[st.goalText, selectedGoal === g.value && st.goalTextActive]}>{t(`aiChef.goals.${g.value}`, g.label)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={st.primaryBtn} onPress={handleGenerate} activeOpacity={0.88}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={st.primaryBtnText}>{t('aiChef.generateRecipe', 'Generate Recipe')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── GENERATING ── */}
      {mode === 'generating' && (
        <View style={st.generatingWrap}>
          <LinearGradient colors={['#1e1b4b', '#312e81']} style={st.generatingCard}>
            <ActivityIndicator size="large" color="#a78bfa" />
            <Text style={st.generatingTitle}>{t('aiChef.craftingRecipe', 'Crafting your recipe…')}</Text>
            <Text style={st.generatingSub}>
              {t('aiChef.usingFlavours', 'Using')} {selectedCuisine !== 'Any' ? t(`aiChef.cuisines.${selectedCuisine.replace(' ', '')}`, selectedCuisine) : t('aiChef.global', 'global')} {t('aiChef.flavours', 'flavours')} · {
                t(`aiChef.goals.${selectedGoal}`, GOAL_OPTIONS.find(g => g.value === selectedGoal)?.label ?? 'Balanced')
              }
            </Text>
            <View style={st.generatingIngredients}>
              {detectedIngredients.slice(0, 4).map((ing, i) => (
                <View key={i} style={st.generatingPill}>
                  <Text style={st.generatingPillText}>{ing}</Text>
                </View>
              ))}
              {detectedIngredients.length > 4 && (
                <View style={st.generatingPill}>
                  <Text style={st.generatingPillText}>+{detectedIngredients.length - 4}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      )}

      {/* ── RESULT ── */}
      {mode === 'result' && generatedRecipe && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <Image
            source={{ uri: getRecipeImage(generatedRecipe.imageSearchQuery ?? generatedRecipe.title) }}
            style={st.recipeImage}
            resizeMode="cover"
          />

          <View style={st.recipeBody}>
            {/* Title + tags */}
            <View style={st.recipeTitleRow}>
              <Text style={st.recipeTitle}>{generatedRecipe.title}</Text>
              {generatedRecipe.tags?.slice(0, 2).map(tag => (
                <View key={tag} style={st.recipeTag}>
                  <Text style={st.recipeTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={st.recipeDesc}>{generatedRecipe.description}</Text>

            {/* Meta row */}
            <View style={st.recipeMeta}>
              <View style={st.recipeMetaItem}>
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={st.recipeMetaText}>{generatedRecipe.cookingTime} {t('common.min', 'min')}</Text>
              </View>
              <View style={st.recipeMetaItem}>
                <Ionicons name="people-outline" size={14} color="#64748b" />
                <Text style={st.recipeMetaText}>{generatedRecipe.servings} {t('common.servings', 'servings')}</Text>
              </View>
            </View>

            {/* Macros */}
            <View style={st.macroRow}>
              {[
                { label: t('common.calories', 'Calories'), value: `${Math.round(generatedRecipe.calories)}`, color: '#2563eb' },
                { label: t('common.protein', 'Protein'),  value: `${Math.round(generatedRecipe.protein)}g`,  color: '#ef4444' },
                { label: t('common.carbs', 'Carbs'),    value: `${Math.round(generatedRecipe.carbs)}g`,    color: '#10b981' },
                { label: t('common.fat', 'Fat'),      value: `${Math.round(generatedRecipe.fat)}g`,      color: '#f59e0b' },
              ].map(m => (
                <View key={m.label} style={st.macroCard}>
                  <Text style={[st.macroVal, { color: m.color }]}>{m.value}</Text>
                  <Text style={st.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            {/* Ingredients */}
            <Text style={st.sectionTitle}>{t('aiChef.ingredientsLabel', 'Ingredients')}</Text>
            <View style={st.ingredientList}>
              {generatedRecipe.ingredients.map((ing, i) => (
                <View key={i} style={st.ingredientRow}>
                  <View style={st.ingredientDot} />
                  <Text style={st.ingredientText}><Text style={{ fontWeight: '700' }}>{ing.amount}</Text> {ing.name}</Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <Text style={st.sectionTitle}>{t('aiChef.instructionsLabel', 'Instructions')}</Text>
            {generatedRecipe.steps.map((step, i) => (
              <View key={i} style={st.stepRow}>
                <View style={st.stepNum}>
                  <Text style={st.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={st.stepText}>{step}</Text>
              </View>
            ))}

            <View style={st.ctaRow}>
              <TouchableOpacity
                style={[st.ctaSecondary, savingRecipe && { opacity: 0.6 }]}
                onPress={handleSaveRecipe}
                disabled={savingRecipe}
                activeOpacity={0.85}
              >
                {savingRecipe
                  ? <ActivityIndicator size="small" color="#2563eb" />
                  : <>
                      <Ionicons name="bookmark-outline" size={18} color="#2563eb" />
                      <Text style={st.ctaSecondaryText}>{t('aiChef.saveRecipeBtn', 'Save Recipe')}</Text>
                    </>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[st.ctaPrimary, loggingMeal && { opacity: 0.6 }]}
                onPress={handleLogMeal}
                disabled={loggingMeal}
                activeOpacity={0.88}
              >
                {loggingMeal
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="restaurant-outline" size={18} color="#fff" />
                      <Text style={st.ctaPrimaryText}>{t('aiChef.logAsMealBtn', 'Log as Meal')}</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {/* Save success toast */}
            {showSaveSuccess && (
              <View style={st.toast}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={st.toastText}>{t('aiChef.savedToMyRecipes', 'Saved to My Recipes!')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

// ─── Convex action stub (add to convex/ai.ts) ─────────────────────────────────
// export const generateAiMealFromIngredients = action({
//   args: {
//     ingredients: v.array(v.string()),
//     cuisine: v.string(),
//     goal: v.string(),
//     platform: v.string(),
//   },
//   handler: async (_ctx, args) => {
//     const { apiKey } = getApiKeyForPlatform(args.platform);
//     const prompt = `Create a single recipe using these ingredients: ${args.ingredients.join(', ')}.
// Cuisine style: ${args.cuisine}. Nutritional goal: ${args.goal}.
// Return ONLY valid JSON:
// {
//   "title": "string",
//   "description": "string",
//   "cookingTime": number,
//   "servings": number,
//   "calories": number,
//   "protein": number,
//   "carbs": number,
//   "fat": number,
//   "ingredients": [{ "name": "string", "amount": "string" }],
//   "steps": ["string"],
//   "tags": ["string"],
//   "imageSearchQuery": "string (best keyword for a food photo)"
// }`;
//     const result = await generateContentWithFallback([{ text: prompt }], apiKey);
//     const text = result.response.text();
//     return safeJsonParse(text) ?? safeJsonParse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
//   },
// });

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1 },
  headerSub:   { fontSize: 11, color: '#94a3b8' },
  newBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  newBtnText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },

  body: { padding: 20, gap: 16 },

  // Hero
  heroBanner: {
    borderRadius: 20, padding: 24, overflow: 'hidden',
    shadowColor: '#312e81', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.25)' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 19 },

  // Mode cards
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  modeIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modeText:  { flex: 1 },
  modeTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  modeSub:   { fontSize: 12, color: '#64748b', lineHeight: 17 },

  // Camera
  cameraOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cameraFrame: {
    width: width * 0.75, height: width * 0.75,
    borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },
  cameraHint: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  cameraControls: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 20, alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  // Permission
  permissionWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  permissionText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  permissionBtn:  { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  permissionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Text input
  inputLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  textarea: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 16, padding: 16, fontSize: 15, color: '#0f172a',
    minHeight: 130, lineHeight: 22,
  },
  inputHint: { fontSize: 12, color: '#94a3b8' },

  primaryBtn: {
    backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Detected box
  detectedBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 10,
  },
  detectedLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eff6ff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Options
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  optionChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionChipIcon:   { fontSize: 16 },
  optionChipText:   { fontSize: 13, fontWeight: '600', color: '#475569' },
  optionChipTextActive: { color: '#1d4ed8' },

  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  goalChip: {
    width: (width - 60) / 3, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#fff', alignItems: 'center', gap: 4,
  },
  goalChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  goalIcon: { fontSize: 22 },
  goalText: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
  goalTextActive: { color: '#1d4ed8' },

  // Generating
  generatingWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  generatingCard: { borderRadius: 24, padding: 32, alignItems: 'center', gap: 16, overflow: 'hidden' },
  generatingTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  generatingSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  generatingIngredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  generatingPill: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  generatingPillText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  // Result
  recipeImage: { width: '100%', height: 240 },
  recipeBody:  { padding: 20, gap: 16 },
  recipeTitleRow: { gap: 6 },
  recipeTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', lineHeight: 32 },
  recipeTag: {
    alignSelf: 'flex-start', backgroundColor: '#eff6ff',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  recipeTagText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
  recipeDesc:    { fontSize: 14, color: '#64748b', lineHeight: 20 },
  recipeMeta:    { flexDirection: 'row', gap: 16 },
  recipeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recipeMetaText: { fontSize: 13, color: '#64748b' },

  macroRow: { flexDirection: 'row', gap: 10 },
  macroCard: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  macroVal:   { fontSize: 16, fontWeight: '900' },
  macroLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },

  ingredientList: { gap: 8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb', marginTop: 6 },
  ingredientText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },

  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21, paddingTop: 4 },

  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ctaSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#2563eb', backgroundColor: '#eff6ff',
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
  ctaPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2563eb',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaPrimaryText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  toastText: { fontSize: 14, fontWeight: '700', color: '#15803d' },
});