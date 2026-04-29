import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Activity, Sparkles, Info,
  ChevronRight, Check, Lock,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type {
  BiologicalSex,
  FitnessGoal,
  ActivityLevel,
  FitnessExperience,
  WorkoutPreference,
  NutritionApproach,
  StressLevel,
} from '@/types';

// ─── Import the flag setter from _layout ─────────────────────────────────────
import { setPendingRouteAfterOnboarding } from './_layout';

import HeightRuler from '@/components/onboarding/HeightRuler';
import Toast from '@/components/onboarding/Toast';
import GoalEstimator from '@/components/onboarding/GoalEstimator';

const { width, height } = Dimensions.get('window');
const WELCOME_LOGO = require('../assets/images/logo.png');

// --- Types ---

interface QuestionOption {
  label: string;
  value: string;
  icon?: string;
  info?: string;
}

interface Question {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'number_with_units' | 'height_ruler' | 'select_with_info';
  placeholder?: string;
  options?: (string | QuestionOption)[];
  subtitle?: string;
  hasInfo?: boolean;
  min?: number;
  max?: number;
  toastFeedback?: string;
}

interface StepGroup {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

// --- Configuration ---

const getStepGroups = (t: any): StepGroup[] => [
  {
    id: 'identity',
    title: t('onboarding.groups.identityTitle'),
    description: t('onboarding.groups.identityDesc'),
    questions: [
      { id: 'age', question: t('onboarding.questions.age'), type: 'number', placeholder: t('onboarding.questions.agePlaceholder'), min: 13, max: 100 },
      {
        id: 'gender',
        question: t('onboarding.questions.gender'),
        type: 'select',
        options: [{ label: t('onboarding.questions.genderMale'), value: 'male' }, { label: t('onboarding.questions.genderFemale'), value: 'female' }],
        subtitle: t('onboarding.questions.genderSub')
      },
    ]
  },
  {
    id: 'biometrics',
    title: t('onboarding.groups.biometricsTitle'),
    description: t('onboarding.groups.biometricsDesc'),
    questions: [
      { id: 'weight', question: t('onboarding.questions.weight'), type: 'number_with_units', placeholder: t('onboarding.questions.weightPlaceholder') },
      { id: 'height', question: t('onboarding.questions.height'), type: 'height_ruler', placeholder: t('onboarding.questions.heightPlaceholder') },
      { id: 'targetWeight', question: t('onboarding.questions.targetWeight'), type: 'number_with_units', placeholder: t('onboarding.questions.targetWeightPlaceholder'), subtitle: t('onboarding.questions.targetWeightSub') },
    ]
  },
  {
    id: 'training',
    title: t('onboarding.groups.trainingTitle'),
    description: t('onboarding.groups.trainingDesc'),
    questions: [
      {
        id: 'fitnessGoal',
        question: t('onboarding.questions.fitnessGoal'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.goalLoseWeight'), value: 'lose_weight', info: t('onboarding.questions.goalLoseWeightInfo') },
          { label: t('onboarding.questions.goalBuildMuscle'), value: 'build_muscle', info: t('onboarding.questions.goalBuildMuscleInfo') },
          { label: t('onboarding.questions.goalMaintain'), value: 'maintain', info: t('onboarding.questions.goalMaintainInfo') },
          { label: t('onboarding.questions.goalEndurance'), value: 'improve_endurance', info: t('onboarding.questions.goalEnduranceInfo') },
          { label: t('onboarding.questions.goalGeneralHealth'), value: 'general_health', info: t('onboarding.questions.goalGeneralHealthInfo') },
          { label: t('onboarding.questions.goalBodyRecomp', 'Body Recomposition'), value: 'body_recomp', info: t('onboarding.questions.goalBodyRecompInfo', 'Lose fat and gain muscle simultaneously. Best for those who want to reshape their physique without drastic weight changes.') },
        ]
      },
      {
        id: 'experience',
        question: t('onboarding.questions.experience'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.expBeginner'), value: 'beginner' },
          { label: t('onboarding.questions.expIntermediate'), value: 'intermediate' },
          { label: t('onboarding.questions.expAdvanced'), value: 'advanced' }
        ]
      },
      {
        id: 'workoutPreference',
        question: t('onboarding.questions.workoutStyle'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.wsStrength'), value: 'strength', info: t('onboarding.questions.wsStrengthInfo') },
          { label: t('onboarding.questions.wsCardio'), value: 'cardio', info: t('onboarding.questions.wsCardioInfo') },
          { label: t('onboarding.questions.wsHiit'), value: 'hiit', info: t('onboarding.questions.wsHiitInfo') },
          { label: t('onboarding.questions.wsYoga'), value: 'yoga', info: t('onboarding.questions.wsYogaInfo') },
          { label: t('onboarding.questions.wsCrossfit'), value: 'crossfit', info: t('onboarding.questions.wsCrossfitInfo') },
          { label: t('onboarding.questions.wsPilates'), value: 'pilates', info: t('onboarding.questions.wsPilatesInfo') },
          { label: t('onboarding.questions.wsMixed'), value: 'mixed', info: t('onboarding.questions.wsMixedInfo') }
        ]
      },
      { id: 'goal', question: t('onboarding.questions.milestone'), type: 'text', placeholder: t('onboarding.questions.milestonePlaceholder') },
    ]
  },
  {
    id: 'activity',
    title: t('onboarding.groups.activityTitle'),
    questions: [
      {
        id: 'activityLevel',
        question: t('onboarding.questions.activityLevel'),
        type: 'select',
        subtitle: t('onboarding.questions.activitySub'),
        options: [
          { label: t('onboarding.questions.actSedentary'), value: 'sedentary' },
          { label: t('onboarding.questions.actLightlyActive'), value: 'lightly_active' },
          { label: t('onboarding.questions.actModeratelyActive'), value: 'moderately_active' },
          { label: t('onboarding.questions.actVeryActive'), value: 'very_active' },
          { label: t('onboarding.questions.actExtremelyActive'), value: 'extremely_active' }
        ]
      },
      {
        id: 'timeAvailable',
        question: t('onboarding.questions.weeklyTime'),
        type: 'select',
        options: [
          { label: '< 2h', value: '1' },
          { label: '2–4h', value: '3' },
          { label: '4–6h', value: '5' },
          { label: '6+h', value: '7' },
        ]
      }
    ]
  },
  {
    id: 'commitment',
    title: t('onboarding.groups.commitmentTitle'),
    description: t('onboarding.groups.commitmentDesc'),
    questions: [
      {
        id: 'commitmentLevel',
        question: t('onboarding.questions.commitmentApproach'),
        type: 'select_with_info',
        hasInfo: true,
        toastFeedback: t('onboarding.questions.commitToast'),
        options: [
          { label: t('onboarding.questions.commitEasy'), value: 'easy', info: t('onboarding.questions.commitEasyInfo') },
          { label: t('onboarding.questions.commitBalanced'), value: 'balanced', info: t('onboarding.questions.commitBalancedInfo') },
          { label: t('onboarding.questions.commitMaximum'), value: 'maximum', info: t('onboarding.questions.commitMaximumInfo') }
        ]
      },
    ]
  },
  {
    id: 'lifestyle',
    title: t('onboarding.groups.lifestyleTitle'),
    questions: [
      { id: 'sleepHours', question: t('onboarding.questions.sleepHours'), type: 'number', min: 4, max: 12 },
      {
        id: 'stressLevel',
        question: t('onboarding.questions.stressLevel'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.stressLow'), value: 'low' },
          { label: t('onboarding.questions.stressMod'), value: 'moderate' },
          { label: t('onboarding.questions.stressHigh'), value: 'high' },
          { label: t('onboarding.questions.stressVeryHigh'), value: 'very_high' }
        ]
      },
      {
        id: 'lifeStressor',
        question: t('onboarding.questions.mainStressors'),
        type: 'multiselect',
        options: [
          { label: t('onboarding.questions.stressorWork'), value: 'Work/Career' },
          { label: t('onboarding.questions.stressorFamily'), value: 'Family/Parenting' },
          { label: t('onboarding.questions.stressorFinances'), value: 'Financial Planning' },
          { label: t('onboarding.questions.stressorHealth'), value: 'Health/Self-Care' },
          { label: t('onboarding.questions.stressorSocial'), value: 'Social/Relationships' },
          { label: t('onboarding.questions.stressorSleep'), value: 'Sleep' },
          { label: t('onboarding.questions.stressorPurpose'), value: 'Purpose' },
          { label: t('onboarding.questions.stressorTime'), value: 'Time' },
          { label: t('onboarding.questions.stressorEnvironment'), value: 'Environment' },
          { label: t('onboarding.questions.stressorBurnout'), value: 'Burnout' },
          { label: t('onboarding.questions.stressorOverwhelm'), value: 'Overwhelm' },
          { label: t('onboarding.questions.stressorLoneliness'), value: 'Loneliness' },
        ]
      }
    ]
  },
  {
    id: 'mindset',
    title: t('onboarding.groups.mindsetTitle'),
    description: t('onboarding.groups.mindsetDesc'),
    questions: [
      {
        id: 'motivation',
        question: t('onboarding.questions.motivations'),
        type: 'multiselect',
        options: [
          { label: t('onboarding.questions.motivHealth'), value: 'Health' },
          { label: t('onboarding.questions.motivAppearance'), value: 'Appearance' },
          { label: t('onboarding.questions.motivEnergy'), value: 'Energy' },
          { label: t('onboarding.questions.motivStrength'), value: 'Strength' },
          { label: t('onboarding.questions.motivConfidence'), value: 'Confidence' },
          { label: t('onboarding.questions.motivLongevity'), value: 'Longevity' }
        ]
      },
      {
        id: 'challenges',
        question: t('onboarding.questions.challenges'),
        type: 'multiselect',
        options: [
          { label: t('onboarding.questions.chalTime'), value: 'Time' },
          { label: t('onboarding.questions.chalMotivation'), value: 'Motivation' },
          { label: t('onboarding.questions.chalKnowledge'), value: 'Knowledge' },
          { label: t('onboarding.questions.chalConsistency'), value: 'Consistency' },
          { label: t('onboarding.questions.chalDiet'), value: 'Diet' },
          { label: t('onboarding.questions.chalSocial'), value: 'Social Support' }
        ]
      },
      {
        id: 'coachingStyle',
        question: t('onboarding.questions.coachingStyle'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.csDirect'), value: 'Direct & Disciplined' },
          { label: t('onboarding.questions.csEncouraging'), value: 'Encouraging & Gentle' },
          { label: t('onboarding.questions.csData'), value: 'Data-Driven & Analytical' }
        ]
      }
    ]
  },
  {
    id: 'diet',
    title: t('onboarding.groups.dietTitle'),
    questions: [
      {
        id: 'nutritionPreference',
        question: t('onboarding.questions.dietApproach'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.dietHighProtein'), value: 'high_protein', info: t('onboarding.questions.dietHighProteinInfo') },
          { label: t('onboarding.questions.dietLowCarb'), value: 'low_carb', info: t('onboarding.questions.dietLowCarbInfo') },
          { label: t('onboarding.questions.dietBalanced'), value: 'balanced', info: t('onboarding.questions.dietBalancedInfo') },
          { label: t('onboarding.questions.dietPlantBased'), value: 'plant_based', info: t('onboarding.questions.dietPlantBasedInfo') },
          { label: t('onboarding.questions.dietFlexible'), value: 'flexible', info: t('onboarding.questions.dietFlexibleInfo') }
        ]
      },
      {
        id: 'mealFrequency',
        question: t('onboarding.questions.mealsPerDay'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.meals2'), value: '2' },
          { label: t('onboarding.questions.meals3'), value: '3' },
          { label: t('onboarding.questions.meals4'), value: '4' },
          { label: t('onboarding.questions.meals6'), value: '6' },
        ]
      },
      {
        id: 'peakEnergy',
        question: t('onboarding.questions.peakEnergy'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.peakEarlyMorning'), value: 'Early Morning' },
          { label: t('onboarding.questions.peakMidday'), value: 'Mid-Day' },
          { label: t('onboarding.questions.peakEvening'), value: 'Evening' },
          { label: t('onboarding.questions.peakLateNight'), value: 'Late Night' },
        ]
      }
    ]
  }
];

// Transition toasts — shown inline via Toast component (no Modal)
// Defined as a function so it can use the t() translation function
const getTransitionMessages = (t: (key: string, fallback: string) => string): { [key: number]: { title: string; subtitle: string; emoji: string } } => ({
  2: { title: t('onboarding.transition.goalSet', 'Goal Set!'), subtitle: t('onboarding.transition.calibrating', "We're calibrating your targets..."), emoji: "🎯" },
  5: { title: t('onboarding.transition.understood', 'Understood.'), subtitle: t('onboarding.transition.mentalFramework', 'Building your mental framework...'), emoji: "🧠" },
  6: { title: t('onboarding.transition.almostThere', 'Almost there!'), subtitle: t('onboarding.transition.nutritionPlan', 'Designing your nutrition plan...'), emoji: "🥗" },
});

const WELCOME_SLIDES = [
  {
    id: '1',
    title: 'Your Life, Optimized.',
    subtitle: 'AI Life Management',
    description: 'Welcome to Bluom. The only system that integrates your Nutrition, Movement, and Mind into one seamless flow.',
    colors: ['#2563EB', '#1E40AF'],
    bgColor: '#EFF6FF',
  },
  {
    id: '2',
    title: 'A Complete Ecosystem',
    subtitle: 'Beyond the Pillars',
    description: "Including tailored protocols for Men & Women's health, Productivity architecture, and Mindset & Meditation.",
    colors: ['#2563EB', '#1d4ed8'],
    bgColor: '#F0F9FF',
  },
  {
    id: '3',
    title: 'Your Blueprint',
    subtitle: 'Ready to Evolve?',
    description: 'Answer a few quick questions to unlock your blueprint for Life Optimization & Performance Architecture.',
    colors: ['#2563EB', '#1d4ed8'],
    bgColor: '#EFF6FF',
  }
];

// --- Main Component ---

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const STEP_GROUPS = React.useMemo(() => getStepGroups(t), [t]);
  const { user: clerkUser } = useUser();
  const insets = useSafeAreaInsets();

  const onboardUser = useMutation(api.onboarding.onboardUser);
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');

  // State
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentWelcomeSlide, setCurrentWelcomeSlide] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [units, setUnits] = useState<{ weight: string; height: string; volume: string }>({ weight: 'kg', height: 'cm', volume: 'ml' });
  const [showResults, setShowResults] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShownRecompAlert, setHasShownRecompAlert] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const LANG_OPTIONS = [
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'nl', flag: '🇳🇱', label: 'NL' },
  ];

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    i18n.changeLanguage(code);
    SecureStore.setItemAsync('app_language', code).catch(() => null);
    setShowLangPicker(false);
  };

  const currentLangOption = LANG_OPTIONS.find(l => l.code === currentLang) || LANG_OPTIONS[1];

  // Toast state (unified — handles both inline feedback AND transition messages)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTitle, setToastTitle] = useState('');
  const [toastEmoji, setToastEmoji] = useState('');

  // Refs
  const scrollRef = useRef<ScrollView>(null);
  const slidesRef = useRef<FlatList>(null);
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  // Unit sync
  useEffect(() => {
    if (unitSystem === 'metric') {
      setUnits({ weight: 'kg', height: 'cm', volume: 'ml' });
    } else {
      setUnits({ weight: 'lbs', height: 'ft', volume: 'oz' });
    }
  }, [unitSystem]);

  // ── DO NOT navigate here. _layout.tsx owns all routing. ──────────────────

  // --- Handlers ---

  const showToast = (message: string, title?: string, emoji?: string) => {
    setToastTitle(title ?? '');
    setToastEmoji(emoji ?? '');
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleAnswer = (questionId: string, value: any, toastFeedback?: string) => {
    setAnswers((prev: any) => ({ ...prev, [questionId]: value }));
    if (toastFeedback) {
      showToast(toastFeedback);
    }
  };

  const handleWelcomeNext = () => {
    if (currentWelcomeSlide < 2) {
      setCurrentWelcomeSlide(prev => prev + 1);
    } else {
      setShowWelcome(false);
    }
  };

  const validateCurrentGroup = () => {
    const group = STEP_GROUPS[currentGroupIndex];
    for (const q of group.questions) {
      const val = answers[q.id];
      if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        Alert.alert("Missing Information", `Please answer: ${q.question}`);
        return false;
      }
    }

    if (answers.fitnessGoal && answers.weight && answers.targetWeight) {
      const w = parseFloat(answers.weight);
      const targetVal = parseFloat(answers.targetWeight);
      if (answers.fitnessGoal === 'lose_weight' && targetVal >= w) {
        Alert.alert("Goal Check", "You selected 'Lose Weight' but your target is higher/equal to current weight.");
        return false;
      }
      if (answers.fitnessGoal === 'build_muscle' && targetVal < w && !hasShownRecompAlert) {
        setHasShownRecompAlert(true);
        Alert.alert(t('onboarding.alerts.bodyRecompTitle', 'Body Recomposition Plan'), t('onboarding.alerts.bodyRecompMsg', `Got it! We will set you up for a Body Recomposition (Fat Loss + Muscle Maintenance) to reach your target of {{target}} {{unit}}.`, { target: targetVal, unit: units.weight }));
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentGroup()) return;

    const currentGroup = STEP_GROUPS[currentGroupIndex];

    // Show estimator after commitment
    if (currentGroup.id === 'commitment' && answers.commitmentLevel && answers.targetWeight && answers.weight && answers.timeAvailable) {
      setShowEstimator(true);
      return;
    }

    // Show transition toast (no Modal — just the Toast component)
    const transition = getTransitionMessages(t)[currentGroupIndex];
    if (transition) {
      showToast(transition.subtitle, transition.title, transition.emoji);
      setTimeout(() => advanceGroup(), 2000);
    } else {
      advanceGroup();
    }
  };

  const handleEstimatorContinue = () => {
    setShowEstimator(false);
    advanceGroup();
  };

  const advanceGroup = () => {
    if (currentGroupIndex < STEP_GROUPS.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const finishOnboarding = () => {
    const results = calculateResults();
    setCalculatedResults(results);
    setShowResults(true);
  };

  const calculateResults = () => {
    const w = parseFloat(answers.weight);
    const weightKg = units.weight === 'kg' ? w : w * 0.453592;
    const h = parseFloat(answers.height) || 170;
    const a = parseFloat(answers.age) || 30;

    const s = answers.gender === 'male' ? 5 : -161;
    const bmr = (10 * weightKg) + (6.25 * h) - (5 * a) + s;
    const tdee = bmr * 1.35;

    let goalMod = 0;
    const targetW = parseFloat(answers.targetWeight);
    const targetKg = units.weight === 'kg' ? targetW : targetW * 0.453592;

    if (answers.fitnessGoal === 'lose_weight') {
      goalMod = -500;
    } else if (answers.fitnessGoal === 'build_muscle') {
      goalMod = targetKg < weightKg ? -200 : 300;
    } else if (answers.fitnessGoal === 'body_recomp') {
      goalMod = 0; // maintenance calories — body recomposition at TDEE
    }

    return {
      dailyCalories: Math.round(tdee + goalMod),
      protein: Math.round(weightKg * 2.2),
      carbs: Math.round((tdee * 0.4) / 4),
      fat: Math.round((tdee * 0.3) / 9)
    };
  };

  // ─── handleFinalSubmit: save data → set flag → _layout routes to /premium ─
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const w = parseFloat(answers.weight) || 0;
      const weightKg = units.weight === 'kg' ? w : w * 0.453592;
      // HeightRuler always calls onValueChange with a cm value (it converts
      // inches → cm internally via Math.round(inches * 2.54)).  Do NOT apply
      // a second ft→cm conversion here — that's what caused the 40000+ cal bug.
      const heightCm = parseFloat(answers.height) || 170;
      const age = parseFloat(answers.age) || 30;
      const gender = answers.gender as 'male' | 'female';

      const dataToSave = {
        name: clerkUser?.firstName ?? 'User',
        age,
        biologicalSex: gender,
        weight: weightKg,
        height: heightCm,
        targetWeight: answers.targetWeight
          ? (units.weight === 'kg' ? parseFloat(answers.targetWeight) : parseFloat(answers.targetWeight) * 0.453592)
          : undefined,
        fitnessGoal: answers.fitnessGoal,
        fitnessExperience: answers.experience,
        workoutPreference: answers.workoutPreference,
        weeklyWorkoutTime: parseFloat(answers.timeAvailable),
        activityLevel: answers.activityLevel,
        nutritionApproach: answers.nutritionPreference,
        mealsPerDay: parseFloat(answers.mealFrequency),
        peakEnergy: answers.peakEnergy,
        sleepHours: parseFloat(answers.sleepHours?.toString() || '7'),
        stressLevel: answers.stressLevel,
        lifeStressor: answers.lifeStressor,
        motivations: answers.motivation || [],
        challenges: answers.challenges || [],
        coachingStyle: answers.coachingStyle,
        commitmentLevel: answers.commitmentLevel,
        preferredUnits: { weight: units.weight, height: units.height, volume: units.volume || 'ml' },
        preferredLanguage: currentLang,
        twelveMonthGoal: answers.goal,
      };

      // ── Set the flag BEFORE the mutation fires ────────────────────────────
      // _layout.tsx will read this synchronously when convexUser.age updates.
      setPendingRouteAfterOnboarding('/premium');

      await onboardUser({ clerkId: clerkUser!.id, ...dataToSave as any });

      // ── DO NOT call router.replace here. _layout.tsx handles it. ──────────
      // The mutation above sets convexUser.age > 0 in Convex.
      // _layout.tsx's useEffect fires, sees pendingRouteAfterOnboarding === '/premium',
      // clears the flag, and navigates. No race condition possible.

    } catch (e) {
      console.error(e);
      // Clear the flag if save failed
      setPendingRouteAfterOnboarding(null);
      Alert.alert("Error", "Could not save profile. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  // --- Renderers ---

  const renderQuestion = (q: Question) => {
    const val = answers[q.id];

    if (q.type === 'text' || q.type === 'number') {
      return (
        <TextInput
          style={styles.textInput}
          placeholder={q.placeholder}
          value={val}
          onChangeText={(t) => handleAnswer(q.id, t)}
          keyboardType={q.type === 'number' ? 'numeric' : 'default'}
          placeholderTextColor="#94a3b8"
        />
      );
    }

    if (q.type === 'select' || q.type === 'select_with_info') {
      return (
        <View style={styles.optionsContainer}>
          {q.options?.map((opt: any, index: number) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const value = typeof opt === 'string' ? opt : opt.value;
            const isSelected = val === value;
            const info = typeof opt === 'object' ? opt.info : null;

            return (
              <TouchableOpacity
                key={value || index}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleAnswer(q.id, value, q.toastFeedback)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionText, isSelected && { color: '#2563eb', fontWeight: '700' }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
                <View style={styles.optionRight}>
                  {info && (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); Alert.alert(label, info); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Info size={18} color={isSelected ? '#2563eb' : '#94a3b8'} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={12} color="#fff" />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (q.type === 'multiselect') {
      const selected = (val || []) as string[];
      return (
        <View style={styles.chipContainer}>
          {q.options?.map((opt: any, index: number) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const value = typeof opt === 'string' ? opt : opt.value;
            const isSelected = selected.includes(value);
            return (
              <TouchableOpacity
                key={value || index}
                style={[styles.chip, isSelected && { borderColor: '#2563eb', backgroundColor: '#eff6ff', borderWidth: 1 }]}
                onPress={() => {
                  if (isSelected) handleAnswer(q.id, selected.filter(s => s !== value));
                  else handleAnswer(q.id, [...selected, value]);
                }}
              >
                <Text style={[styles.chipText, isSelected && { color: '#2563eb', fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (q.type === 'number_with_units') {
      const unit = q.id.toLowerCase().includes('weight') ? units.weight : '';
      return (
        <View style={styles.unitInputRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={val}
            onChangeText={t => handleAnswer(q.id, t)}
            placeholder="0"
            keyboardType="numeric"
          />
          <Text style={styles.unitLabel}>{unit}</Text>
        </View>
      );
    }

    if (q.type === 'height_ruler') {
      return (
        <HeightRuler
          units={units.height as 'cm' | 'ft'}
          initialValue={val || (units.height === 'cm' ? 170 : 5.7)}
          onValueChange={(value: number) => handleAnswer(q.id, value.toString())}
        />
      );
    }

    return null;
  };

  const renderEstimator = () => (
    <Modal visible={showEstimator} animationType="slide">
      <SafeAreaView style={[styles.fullscreen, { backgroundColor: '#fff' }]}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
          <GoalEstimator
            currentWeight={parseFloat(answers.weight) || 70}
            targetWeight={parseFloat(answers.targetWeight) || 65}
            weeklyTime={parseFloat(answers.timeAvailable) || 3}
            commitmentLevel={answers.commitmentLevel || 'balanced'}
            units={units.weight}
          />
        </ScrollView>
        <View style={[styles.estimatorFooter, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleEstimatorContinue}>
            <Text style={styles.primaryBtnText}>{t('onboarding.nav.continue', 'Continue')}</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderResults = () => {
    const PillarCard = ({ emoji, title, color, children }: { emoji: string; title: string; color: string; children: React.ReactNode }) => (
      <View style={[styles.pillarResultCard, { borderLeftColor: color }]}>
        <View style={styles.pillarResultHeader}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
          <Text style={[styles.pillarResultTitle, { color }]}>{title}</Text>
        </View>
        {children}
      </View>
    );

    return (
      <Modal visible={showResults} animationType="slide">
        <SafeAreaView style={styles.resultsContainer}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
            <Text style={styles.resultsHeader}>{t('onboarding.results.title', 'Your Blueprint')}</Text>
            <Text style={styles.resultsSub}>{t('onboarding.results.subtitle', 'Your personalised plan across 3 pillars.')}</Text>

            {/* ── Pillar 1: Nutrition ── */}
            <PillarCard emoji="🥗" title={t('onboarding.results.nutritionPillar', 'Nutrition')} color="#2563eb">
              <View style={styles.pillarCalRow}>
                <Text style={styles.pillarCalVal}>{calculatedResults?.dailyCalories}</Text>
                <Text style={styles.pillarCalLabel}>{t('onboarding.results.kcalDay', 'kcal / day')}</Text>
              </View>
              {/* Blurred macros */}
              <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 72 }}>
                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroVal}>{calculatedResults?.protein}g</Text>
                    <Text style={styles.macroLabel}>{t('fuel.protein', 'Protein')}</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroVal}>{calculatedResults?.carbs}g</Text>
                    <Text style={styles.macroLabel}>{t('fuel.carbs', 'Carbs')}</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroVal}>{calculatedResults?.fat}g</Text>
                    <Text style={styles.macroLabel}>{t('fuel.fat', 'Fat')}</Text>
                  </View>
                </View>
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                  <Lock size={14} color="#1e293b" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e293b' }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                </View>
              </View>
            </PillarCard>

            {/* ── Pillar 2: Fitness ── */}
            <PillarCard emoji="🏋️" title={t('onboarding.results.fitnessPillar', 'Fitness')} color="#7c3aed">
              <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
                {[
                  t('onboarding.results.week1', 'Week 1 · Foundation'),
                  t('onboarding.results.week2', 'Week 2 · Progression'),
                  t('onboarding.results.week3', 'Week 3 · Peak'),
                  t('onboarding.results.week4', 'Week 4 · Recovery'),
                ].map((week, i) => (
                  <View key={i} style={[styles.planWeekRow, { backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff' }]}>
                    <Text style={styles.planWeekNum}>W{i + 1}</Text>
                    <Text style={styles.planWeekLabel}>{week}</Text>
                  </View>
                ))}
                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                  <Lock size={14} color="#1e293b" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e293b' }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                </View>
              </View>
            </PillarCard>

            {/* ── Pillar 3: Mental Health ── */}
            <PillarCard emoji="🧠" title={t('onboarding.results.mentalPillar', 'Mental Health')} color="#059669">
              <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
                {[
                  t('onboarding.results.mental1', 'Stress Foundations'),
                  t('onboarding.results.mental2', 'Sleep Optimisation'),
                  t('onboarding.results.mental3', 'Mindset & Reframe'),
                  t('onboarding.results.mental4', 'Integration Week'),
                ].map((theme, i) => (
                  <View key={i} style={[styles.planWeekRow, { backgroundColor: i % 2 === 0 ? '#f0fdf4' : '#fff' }]}>
                    <Text style={[styles.planWeekNum, { color: '#059669' }]}>W{i + 1}</Text>
                    <Text style={styles.planWeekLabel}>{theme}</Text>
                  </View>
                ))}
                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                  <Lock size={14} color="#1e293b" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e293b' }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                </View>
              </View>
            </PillarCard>
          </ScrollView>

          {/* Fixed footer button */}
          <View style={styles.resultsFooter}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleFinalSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{t('onboarding.results.continueToPlan', 'Continue to Plan')}</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      {showWelcome ? (
        <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.fullscreen}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ alignItems: 'center', paddingHorizontal: 30, paddingTop: insets.top + 60 }}>
              {currentWelcomeSlide === 0 && (
                <>
                  <Image source={WELCOME_LOGO} style={{ width: 140, height: 40, marginBottom: 40 }} resizeMode="contain" />
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>{t('onboarding.welcome.slide1Title', 'Your Life, Optimized.')}</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>{t('onboarding.welcome.slide1Sub', 'AI Life Management')}</Text>
                  <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide1Desc', 'Welcome to Bluom. The only system that integrates your Nutrition, Movement, and Mind into one seamless flow.')}</Text>
                </>
              )}
              {currentWelcomeSlide === 1 && (
                <>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="sunny" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>{t('onboarding.welcome.pillarNutrition', 'Nutrition')}</Text>
                    </View>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="barbell" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>{t('onboarding.welcome.pillarMove', 'Treino')}</Text>
                    </View>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="leaf" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>{t('onboarding.welcome.pillarMind', 'Mind')}</Text>
                    </View>
                  </View>
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>{t('onboarding.welcome.slide2Title', 'A Complete Ecosystem')}</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>{t('onboarding.welcome.slide2Sub', 'Beyond the Pillars')}</Text>
                  <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide2Desc', "Includes specialized protocols for Men & Women's health, Productivity architecture, and Mindset & Meditation.")}</Text>
                </>
              )}
              {currentWelcomeSlide === 2 && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                    <Sparkles size={60} color="#2563EB" />
                  </View>
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>{t('onboarding.welcome.slide3Title', 'Your Blueprint')}</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>{t('onboarding.welcome.slide3Sub', 'Ready to Evolve?')}</Text>
                  <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide3Desc', 'Answer a few quick questions to get your custom nutrition plan and workout recommendations.')}</Text>
                </>
              )}
            </View>

            <View style={{ alignItems: 'center', width: '100%' }}>
              <View style={styles.dotsContainer}>
                <View style={[styles.dot, currentWelcomeSlide === 0 && styles.activeDot]} />
                <View style={[styles.dot, currentWelcomeSlide === 1 && styles.activeDot]} />
                <View style={[styles.dot, currentWelcomeSlide === 2 && styles.activeDot]} />
              </View>
              <TouchableOpacity style={styles.welcomeBtn} onPress={handleWelcomeNext}>
                <Text style={styles.welcomeBtnText}>
                  {currentWelcomeSlide === 2 ? t('onboarding.welcome.letsGo', "Let's Go!") : t('onboarding.welcome.next', 'Next')}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Floating language selector */}
          <View style={{ position: 'absolute', bottom: 140, right: 24 }}>
            {showLangPicker && (
              <View style={styles.langPickerPopup}>
                {LANG_OPTIONS.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, currentLang === lang.code && styles.langOptionActive]}
                    onPress={() => handleLangChange(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langCode, currentLang === lang.code && { color: '#2563eb', fontWeight: '800' }]}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.langFab}
              onPress={() => setShowLangPicker(v => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.langFabFlag}>{currentLangOption.flag}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Unified Toast — handles both feedback and transition messages */}
          <Toast
            message={toastMessage}
            title={toastTitle}
            emoji={toastEmoji}
            visible={toastVisible}
            onHide={() => {
              setToastVisible(false);
              setToastTitle('');
              setToastEmoji('');
            }}
            duration={toastTitle ? 2000 : 1800}
          />

          {renderEstimator()}
          {renderResults()}

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} disabled={currentGroupIndex === 0}>
              <Ionicons name="chevron-back" size={24} color={currentGroupIndex === 0 ? '#cbd5e1' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${((currentGroupIndex + 1) / STEP_GROUPS.length) * 100}%` }]} />
            </View>
            <TouchableOpacity
              onPress={() => setUnitSystem(prev => prev === 'metric' ? 'imperial' : 'metric')}
              style={styles.unitToggleBtn}
            >
              <Text style={styles.unitToggleText}>{unitSystem === 'metric' ? 'KG/CM' : 'LBS/FT'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{STEP_GROUPS[currentGroupIndex].title}</Text>
              {STEP_GROUPS[currentGroupIndex].description && (
                <Text style={styles.groupDesc}>{STEP_GROUPS[currentGroupIndex].description}</Text>
              )}
            </View>

            <View style={styles.questionsList}>
              {STEP_GROUPS[currentGroupIndex].questions.map(q => (
                <View key={q.id} style={styles.questionBlock}>
                  <Text style={styles.qLabel}>{q.question}</Text>
                  {q.subtitle && <Text style={styles.qSub}>{q.subtitle}</Text>}
                  {renderQuestion(q)}
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{t('onboarding.nav.continue', 'Continue')}</Text>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 24, paddingBottom: 100 },

  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  welcomeTitle: { fontSize: 32, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  welcomeSubtitle: { fontSize: 18, fontWeight: '600', color: '#6366f1', textAlign: 'center', marginBottom: 16 },
  welcomeDesc: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32, marginTop: 48 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  activeDot: { backgroundColor: '#2563eb', width: 20 },
  welcomeBtn: { backgroundColor: '#2563eb', marginHorizontal: 30, padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
  welcomeBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16, backgroundColor: '#fff' },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#2563eb' },
  unitToggleBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  unitToggleText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },

  groupHeader: { marginBottom: 32 },
  groupTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  groupDesc: { fontSize: 16, color: '#64748b' },

  questionsList: { gap: 32 },
  questionBlock: {},
  qLabel: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 4 },
  qSub: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },

  textInput: { backgroundColor: '#fff', padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  unitInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  unitLabel: { paddingHorizontal: 16, fontSize: 16, color: '#64748b', fontWeight: '600', backgroundColor: '#f1f5f9', height: '100%', textAlignVertical: 'center', paddingTop: 16 },

  optionsContainer: { gap: 10, marginTop: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
  optionCardSelected: { borderColor: '#2563eb', borderWidth: 2, backgroundColor: '#f0f5ff' },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12, flexShrink: 0 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  radioCircleSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  pillarCard: { width: 100, height: 140, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 4 },
  pillarText: { fontWeight: '700', fontSize: 14 },
  optionText: { flex: 1, fontSize: 16, color: '#334155', fontWeight: '500' },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  chipText: { fontSize: 14, color: '#475569', fontWeight: '600' },

  nextBtn: { marginTop: 40, backgroundColor: '#2563eb', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  estimatorFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },

  resultsContainer: { flex: 1, backgroundColor: '#ffffff' },
  resultsHeader: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  resultsSub: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  macroCard: { alignItems: 'center', marginBottom: 40 },
  calorieCircle: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#ec4899', shadowColor: '#ec4899', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  calorieVal: { fontSize: 56, fontWeight: '900', color: '#1e293b' },
  calorieLabel: { fontSize: 16, color: '#64748b', fontWeight: '600', marginTop: 4 },

  proSection: { borderRadius: 24, overflow: 'hidden', height: 200, backgroundColor: '#fff', marginBottom: 40 },
  blurContainer: { flex: 1, padding: 30, justifyContent: 'center' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 28, fontWeight: 'bold', color: '#334155', marginBottom: 8 },

  lockOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  proBadge: { backgroundColor: '#fbbf24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  proText: { fontSize: 12, fontWeight: '900', color: '#78350f' },
  lockText: { color: '#fff', textAlign: 'center', marginTop: 12, fontWeight: '600', fontSize: 15 },

  primaryBtn: { backgroundColor: '#2563eb', padding: 20, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Results footer
  resultsFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },

  // 3-Pillar result cards
  pillarResultCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  pillarResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pillarResultTitle: { fontSize: 18, fontWeight: '800' },
  pillarCalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pillarCalVal: { fontSize: 40, fontWeight: '900', color: '#1e293b' },
  pillarCalLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  macroLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  planWeekRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  planWeekNum: { fontSize: 12, fontWeight: '900', color: '#7c3aed', width: 24 },
  planWeekLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },

  // Language FAB
  langFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  langFabFlag: { fontSize: 24 },
  langPickerPopup: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    minWidth: 90,
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10,
  },
  langOptionActive: { backgroundColor: '#eff6ff' },
  langFlag: { fontSize: 18 },
  langCode: { fontSize: 13, fontWeight: '600', color: '#475569' },
});
