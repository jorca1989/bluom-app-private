import React, { useState, useRef, useEffect } from 'react';
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

const STEP_GROUPS: StepGroup[] = [
  {
    id: 'identity',
    title: "Let's get to know you",
    description: "Your basics help us tailor the experience.",
    questions: [
      { id: 'age', question: "How old are you?", type: 'number', placeholder: "Age", min: 13, max: 100 },
      {
        id: 'gender',
        question: "Biological Sex",
        type: 'select',
        options: [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }],
        subtitle: "Used for accurate calorie calculations."
      },
    ]
  },
  {
    id: 'biometrics',
    title: "Your Body Metrics",
    description: "These numbers set your baseline.",
    questions: [
      { id: 'weight', question: "Current Weight", type: 'number_with_units', placeholder: "Weight" },
      { id: 'height', question: "Height", type: 'height_ruler', placeholder: "Height" },
      {
        id: 'targetWeight',
        question: "Target Weight",
        type: 'number_with_units',
        placeholder: "Goal Weight",
        subtitle: "Where do you want to be?"
      },
    ]
  },
  {
    id: 'training',
    title: "Training Profile",
    description: "How do you like to move?",
    questions: [
      {
        id: 'fitnessGoal',
        question: "Main Goal",
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: 'Lose Weight', value: 'lose_weight', info: 'Create a sustainable calorie deficit to shed fat while keeping energy levels high.' },
          { label: 'Build Muscle', value: 'build_muscle', info: 'Maximize hypertrophy with progressive overload and optimal protein intake. Supports Recomp if target weight < current.' },
          { label: 'Maintain', value: 'maintain', info: 'Focus on performance and metabolic health without changing your body weight.' },
          { label: 'Endurance', value: 'improve_endurance', info: 'Optimize for aerobic capacity, stamina, and cardiovascular efficiency.' },
          { label: 'General Health', value: 'general_health', info: 'Prioritize longevity, balanced energy, and disease prevention through holistic habits.' }
        ]
      },
      {
        id: 'experience',
        question: "Experience Level",
        type: 'select',
        options: [
          { label: 'Beginner', value: 'beginner' },
          { label: 'Intermediate', value: 'intermediate' },
          { label: 'Advanced', value: 'advanced' }
        ]
      },
      {
        id: 'workoutPreference',
        question: "Workout Style",
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: 'Strength', value: 'strength', info: 'Focus on building muscle and power through resistance.' },
          { label: 'Cardio', value: 'cardio', info: 'Endurance activities like running, cycling, or swimming.' },
          { label: 'HIIT', value: 'hiit', info: 'High Intensity Interval Training for burning calories fast.' },
          { label: 'Yoga/Flex', value: 'yoga', info: 'Focus on flexibility, balance, and mind-body connection.' },
          { label: 'CrossFit', value: 'crossfit', info: 'High-intensity functional movements.' },
          { label: 'Pilates', value: 'pilates', info: 'Low-impact flexibility and muscular strength.' },
          { label: 'Mixed', value: 'mixed', info: 'A combination of different styles.' }
        ]
      },
      { id: 'goal', question: "Major 12-Month Milestone", type: 'text', placeholder: "e.g. Run a marathon, buy a house..." },
    ]
  },
  {
    id: 'activity',
    title: "Daily Activity",
    questions: [
      {
        id: 'activityLevel',
        question: "Activity Level",
        type: 'select',
        subtitle: "Be honest for best results!",
        options: [
          { label: 'Sedentary (Desk Job)', value: 'sedentary' },
          { label: 'Lightly Active', value: 'lightly_active' },
          { label: 'Moderately Active', value: 'moderately_active' },
          { label: 'Very Active', value: 'very_active' },
          { label: 'Extremely Active', value: 'extremely_active' }
        ]
      },
      {
        id: 'timeAvailable',
        question: "Weekly Time Available",
        type: 'select',
        options: [
          { label: '< 2 hours', value: '1' },
          { label: '2-4 hours', value: '3' },
          { label: '4-6 hours', value: '5' },
          { label: '6+ hours', value: '7' },
        ]
      }
    ]
  },
  {
    id: 'commitment',
    title: "Your Commitment Level",
    description: "How intense do you want this journey to be?",
    questions: [
      {
        id: 'commitmentLevel',
        question: "Choose Your Approach",
        type: 'select_with_info',
        hasInfo: true,
        toastFeedback: "Perfect! We'll tailor your plan to match your commitment.",
        options: [
          { label: 'I want it easy', value: 'easy', info: 'Take your time with gentle, sustainable changes. Slower progress but easier to maintain long-term.' },
          { label: 'Balanced effort', value: 'balanced', info: 'A steady, proven approach. Moderate changes with consistent, measurable results.' },
          { label: 'Maximum effort', value: 'maximum', info: 'Go all-in for rapid transformation. Intensive commitment required but fastest results.' }
        ]
      },
    ]
  },
  {
    id: 'lifestyle',
    title: "Lifestyle & Balance",
    questions: [
      { id: 'sleepHours', question: "Average Sleep (Hours)", type: 'number', min: 4, max: 12 },
      {
        id: 'stressLevel',
        question: "Stress Level",
        type: 'select',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Moderate', value: 'moderate' },
          { label: 'High', value: 'high' },
          { label: 'Very High', value: 'very_high' }
        ]
      },
      {
        id: 'lifeStressor',
        question: "Main Stressors",
        type: 'multiselect',
        options: [
          { label: 'Work & Career', value: 'Work/Career' },
          { label: 'Family & Parenting', value: 'Family/Parenting' },
          { label: 'Finances', value: 'Financial Planning' },
          { label: 'Health & Self‑Care', value: 'Health/Self-Care' },
          { label: 'Social & Relationships', value: 'Social/Relationships' },
          { label: 'Sleep Quality', value: 'Sleep' },
          { label: 'Lack of Purpose', value: 'Purpose' },
          { label: 'Time Management', value: 'Time' },
          { label: 'Environment / Housing', value: 'Environment' },
          { label: 'Burnout', value: 'Burnout' },
          { label: 'Workload Overwhelm', value: 'Overwhelm' },
          { label: 'Loneliness', value: 'Loneliness' },
        ]
      }
    ]
  },
  {
    id: 'mindset',
    title: "Mindset",
    description: "What drives you and what holds you back?",
    questions: [
      {
        id: 'motivation',
        question: "Motivations",
        type: 'multiselect',
        options: ['Health', 'Appearance', 'Energy', 'Strength', 'Confidence', 'Longevity']
      },
      {
        id: 'challenges',
        question: "Challenges",
        type: 'multiselect',
        options: ['Time', 'Motivation', 'Knowledge', 'Consistency', 'Diet', 'Social Support']
      },
      {
        id: 'coachingStyle',
        question: "Preferred Coaching Style",
        type: 'select',
        options: [
          { label: 'Direct & Disciplined', value: 'Direct & Disciplined' },
          { label: 'Encouraging & Gentle', value: 'Encouraging & Gentle' },
          { label: 'Data-Driven', value: 'Data-Driven & Analytical' }
        ]
      }
    ]
  },
  {
    id: 'diet',
    title: "Nutrition Preference",
    questions: [
      {
        id: 'nutritionPreference',
        question: "Dietary Approach",
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: 'High Protein', value: 'high_protein', info: 'Boosts metabolism and muscle recovery. Ideal for building lean mass and controlling appetite.' },
          { label: 'Low Carb', value: 'low_carb', info: 'Minimized carbohydrates to stabilize blood sugar and shift metabolism toward fat burning.' },
          { label: 'Balanced', value: 'balanced', info: 'A sustainable mix of all macronutrients to fuel varied activities and lifestyle needs.' },
          { label: 'Plant-Based', value: 'plant_based', info: 'Nutrient-dense approach focusing on vegetables, fruits, legumes, and whole grains.' },
          { label: 'Flexible (IIFYM)', value: 'flexible', info: 'Track macros instead of restricting foods. Eat what you enjoy within your daily targets.' }
        ]
      },
      {
        id: 'mealFrequency',
        question: "Meals Per Day",
        type: 'select',
        options: [
          { label: '2 meals (Intermittent Fasting)', value: '2' },
          { label: '3 meals (Standard / IF)', value: '3' },
          { label: '4-5 meals (High Performance)', value: '4' },
          { label: '6+ meals (Hyper-Metabolic)', value: '6' },
        ]
      },
      {
        id: 'peakEnergy',
        question: "Peak Energy Time",
        type: 'select',
        options: ['Early Morning', 'Mid-Day', 'Evening', 'Late Night']
      }
    ]
  }
];

// Transition toasts — shown inline via Toast component (no Modal)
const TRANSITION_MESSAGES: { [key: number]: { title: string; subtitle: string; emoji: string } } = {
  2: { title: "Goal Set!", subtitle: "We're calibrating your targets...", emoji: "🎯" },
  5: { title: "Understood.", subtitle: "Building your mental framework...", emoji: "🧠" },
  6: { title: "Almost there!", subtitle: "Designing your nutrition plan...", emoji: "🥗" },
};

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
      const t = parseFloat(answers.targetWeight);
      if (answers.fitnessGoal === 'lose_weight' && t >= w) {
        Alert.alert("Goal Check", "You selected 'Lose Weight' but your target is higher/equal to current weight.");
        return false;
      }
      if (answers.fitnessGoal === 'build_muscle' && t < w && !hasShownRecompAlert) {
        setHasShownRecompAlert(true);
        Alert.alert("Body Recomposition Plan", `Got it! We will set you up for a Body Recomposition (Fat Loss + Muscle Maintenance) to reach your target of ${t} ${units.weight}.`);
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
    const transition = TRANSITION_MESSAGES[currentGroupIndex];
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
      const h = parseFloat(answers.height) || 0;
      const heightCm = units.height === 'cm' ? h : h * 30.48;
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
        preferredLanguage: 'en',
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
            <Text style={styles.primaryBtnText}>Continue</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderResults = () => (
    <Modal visible={showResults} animationType="slide">
      <SafeAreaView style={styles.resultsContainer}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          <Text style={styles.resultsHeader}>Your Blueprint</Text>
          <Text style={styles.resultsSub}>Based on your goals, here is your daily target.</Text>

          <View style={styles.macroCard}>
            <View style={styles.calorieCircle}>
              <Text style={styles.calorieVal}>{calculatedResults?.dailyCalories}</Text>
              <Text style={styles.calorieLabel}>Daily Calories</Text>
            </View>
          </View>

          <View style={styles.proSection}>
            <View style={styles.blurContainer}>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}><Text style={[styles.macroVal, { opacity: 0 }]}>150g</Text><Text style={{ opacity: 0 }}>Protein</Text></View>
                <View style={styles.macroItem}><Text style={[styles.macroVal, { opacity: 0 }]}>200g</Text><Text style={{ opacity: 0 }}>Carbs</Text></View>
                <View style={styles.macroItem}><Text style={[styles.macroVal, { opacity: 0 }]}>60g</Text><Text style={{ opacity: 0 }}>Fats</Text></View>
              </View>
            </View>
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill}>
              <View style={styles.lockOverlay}>
                <View style={styles.proBadge}><Text style={styles.proText}>PRO INSIGHTS</Text></View>
                <Lock size={32} color="#1e293b" style={{ marginTop: 16 }} />
                <Text style={styles.lockText}>Unlock your full macro breakdown & meal plans.</Text>
              </View>
            </BlurView>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleFinalSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Continue to Plan</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
      {showWelcome ? (
        <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.fullscreen}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ alignItems: 'center', paddingHorizontal: 30, paddingTop: insets.top + 100 }}>
              {currentWelcomeSlide === 0 && (
                <>
                  <Image source={WELCOME_LOGO} style={{ width: 140, height: 40, marginBottom: 40 }} resizeMode="contain" />
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>Your Life, Optimized.</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>AI Life Management</Text>
                  <Text style={styles.welcomeDesc}>
                    Welcome to Bluom. The only system that integrates your Nutrition, Movement, and Mind into one seamless flow.
                  </Text>
                </>
              )}
              {currentWelcomeSlide === 1 && (
                <>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="sunny" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>Nutrition</Text>
                    </View>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="fitness" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>Move</Text>
                    </View>
                    <View style={[styles.pillarCard, { borderColor: '#2563EB', backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="leaf" size={28} color="#2563EB" />
                      <Text style={[styles.pillarText, { color: '#2563EB' }]}>Mind</Text>
                    </View>
                  </View>
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>A Complete Ecosystem</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>Beyond the Pillars</Text>
                  <Text style={styles.welcomeDesc}>
                    Includes specialized protocols for Men & Women's health, Productivity architecture, and Mindset & Meditation.
                  </Text>
                </>
              )}
              {currentWelcomeSlide === 2 && (
                <>
                  <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                    <Sparkles size={60} color="#2563EB" />
                  </View>
                  <Text style={[styles.welcomeTitle, { color: '#1e293b' }]}>Your Blueprint</Text>
                  <Text style={[styles.welcomeSubtitle, { color: '#2563EB' }]}>Ready to Evolve?</Text>
                  <Text style={styles.welcomeDesc}>
                    Answer a few quick questions to get your custom nutrition plan and workout recommendations.
                  </Text>
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
                  {currentWelcomeSlide === 2 ? "Let's Go!" : "Next"}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
              <Text style={styles.nextBtnText}>Continue</Text>
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
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
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
});
