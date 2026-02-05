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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Camera, Activity, Heart, TrendingUp, Sparkles, Info } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import * as SecureStore from 'expo-secure-store';

import type {
  BiologicalSex,
  FitnessGoal,
  ActivityLevel,
  FitnessExperience,
  WorkoutPreference,
  NutritionApproach,
  StressLevel,
} from '@/types';

const { width } = Dimensions.get('window');
const WELCOME_LOGO = require('../assets/images/logo.png');

interface QuestionOption {
  label: string;
  value: string;
}

interface Question {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'number_with_units' | 'height_input' | 'select_with_info';
  placeholder?: string;
  options?: (string | QuestionOption)[];
  units?: string[];
  subtitle?: string;
  hasInfo?: boolean;
  min?: number;
  max?: number;
}

export default function OnboardingScreen() {
  const { user: clerkUser } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const onboardUser = useMutation(api.onboarding.onboardUser);
  const generateAllPlans = useMutation(api.plans.generateAllPlans);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const [showWelcome, setShowWelcome] = useState(!clerkUser);
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});

  // Global preferences state
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric'); // Default to metric
  const [units, setUnits] = useState<{
    weight: 'lbs' | 'kg';
    height: 'ft' | 'cm';
    volume: 'oz' | 'ml';
  }>({
    weight: 'kg',
    height: 'cm',
    volume: 'ml'
  });






  // Watch for unit system changes to update specific units
  useEffect(() => {
    console.log('Unit system changed to:', unitSystem);
    if (unitSystem === 'metric') {
      setUnits({ weight: 'kg', height: 'cm', volume: 'ml' });
    } else {
      setUnits({ weight: 'lbs', height: 'ft', volume: 'oz' });
    }
  }, [unitSystem]);

  const [showResults, setShowResults] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const existingOnboardingAge = convexUser?.age ?? 0;

  useEffect(() => {
    // Check if user is authenticated AND has data
    if (clerkUser && existingOnboardingAge > 0) {
      console.log('User has existing data. Auto-advancing to dashboard.');
      router.replace('/(tabs)');
    }
  }, [clerkUser, existingOnboardingAge, router]);

  const welcomeSlides = [
    {
      id: '1',
      title: 'Welcome to Bluom',
      subtitle: 'Your all-in-one wellness companion',
      description: 'Transform your health journey with AI-powered nutrition, personalized workouts, and mental wellness tracking.',
      // Use the app logo instead of the Sparkles icon
      icon: WELCOME_LOGO,
      colors: ['#60A5FA', '#2563EB'] as [string, string],
      bgColor: '#EFF6FF',
    },
    {
      id: '2',
      title: 'AI Food Recognition',
      subtitle: 'Snap, track, and optimize',
      description: 'Take a photo of your meal and our AI instantly recognizes ingredients and calculates your macros.',
      icon: Camera,
      colors: ['#4ADE80', '#059669'] as [string, string],
      bgColor: '#F0FDF4',
    },
    {
      id: '3',
      title: 'Smart Workouts',
      subtitle: 'Personalized fitness plans',
      description: 'Get custom workout routines that adapt to your goals. Track exercises, calories burned, and progress.',
      icon: Activity,
      colors: ['#FB923C', '#EF4444'] as [string, string],
      bgColor: '#FFF7ED',
    },
    {
      id: '4',
      title: 'Mental Wellness',
      subtitle: 'Build healthy habits daily',
      description: 'Track your sleep, mood, and daily habits. Create streaks and cultivate a balanced lifestyle.',
      icon: Heart,
      colors: ['#A78BFA', '#4F46E5'] as [string, string],
      bgColor: '#F5F3FF',
    },
    {
      id: '5',
      title: 'Track Your Progress',
      subtitle: 'See your transformation',
      description: 'Comprehensive insights across nutrition, workouts, and wellness. Celebrate every milestone.',
      icon: TrendingUp,
      colors: ['#F472B6', '#F43F5E'] as [string, string],
      bgColor: '#FDF2F8',
    },
  ];

  const nutritionInfo: { [key: string]: { title: string; description: string } } = {
    'High Protein': {
      title: 'High Protein Diet',
      description: 'Emphasizes protein-rich foods (30-35% of calories). Great for muscle building, weight loss, and satiety. Includes lean meats, fish, eggs, dairy, legumes, and protein supplements.'
    },
    'Low Carb': {
      title: 'Low Carb Diet',
      description: 'Restricts carbohydrates (20-25% of calories), focusing on proteins and fats. Can help with weight loss and blood sugar control. Limits grains, sugars, and starchy vegetables.'
    },
    'Balanced': {
      title: 'Balanced Diet',
      description: 'Follows standard macronutrient ratios (50% carbs, 25% protein, 25% fat). Includes all food groups in moderation for overall health and sustainability.'
    },
    'Plant-Based': {
      title: 'Plant-Based Diet',
      description: 'Focuses on foods derived from plants including vegetables, fruits, nuts, seeds, oils, whole grains, legumes, and beans. May include or exclude animal products.'
    },
    'Flexible Dieting': {
      title: 'Flexible Dieting (IIFYM)',
      description: 'If It Fits Your Macros - allows any food as long as it fits within daily macro targets. Provides flexibility while maintaining nutritional goals.'
    }
  };

  // -- Questions Configuration --
  const questions: Question[] = React.useMemo(() => [
    {
      id: 'name',
      question: "What's your name?",
      type: 'text',
      placeholder: "Your Name",
    },
    {
      id: 'gender',
      question: "What is your biological sex?",
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' }
      ],
      subtitle: "This helps us calculate calorie burn and health metrics accurately."
    },
    {
      id: 'age',
      question: "How old are you?",
      type: 'number',
      placeholder: "Age",
      min: 13,
      max: 100
    },
    {
      id: 'weight',
      question: "Current Weight",
      type: 'number_with_units',
      placeholder: "Weight",
    },
    {
      id: 'height',
      question: "Height",
      type: 'height_input',
      placeholder: "Height",
    },
    {
      id: 'fitnessGoal',
      question: "What is your main goal?",
      type: 'select',
      options: [
        { label: 'Lose Weight', value: 'lose_weight' },
        { label: 'Build Muscle', value: 'build_muscle' },
        { label: 'Maintain Weight', value: 'maintain' },
        { label: 'Improve Endurance', value: 'improve_endurance' },
        { label: 'General Health', value: 'general_health' }
      ],
      subtitle: "We will personalize your daily targets based on this."
    },
    {
      id: 'targetWeight',
      question: "Target Weight",
      type: 'number_with_units',
      placeholder: "Target Weight",
      subtitle: "What is your goal weight?"
    },
    {
      id: 'experience',
      question: "Fitness Experience",
      type: 'select',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' }
      ],
      subtitle: "How experienced are you with training?"
    },
    {
      id: 'workoutPreference',
      question: "Preferred Workout Style",
      type: 'select',
      options: [
        { label: 'Strength Training', value: 'strength' },
        { label: 'Cardio', value: 'cardio' },
        { label: 'HIIT', value: 'hiit' },
        { label: 'Flexibility/Yoga', value: 'yoga' },
        { label: 'Mixed', value: 'mixed' }
      ],
    },
    {
      id: 'timeAvailable',
      question: "Weekly Time Available",
      type: 'select',
      options: [
        { label: 'Less than 2 hours', value: '1' },
        { label: '2-4 hours', value: '3' },
        { label: '4-6 hours', value: '5' },
        { label: '6-8 hours', value: '7' },
        { label: 'More than 8 hours', value: '10' }
      ],
    },
    {
      id: 'activityLevel',
      question: "Activity Level",
      type: 'select',
      options: [
        { label: 'Sedentary (desk job, little exercise)', value: 'sedentary' },
        { label: 'Lightly Active (light exercise 1-3 days/week)', value: 'lightly_active' },
        { label: 'Moderately Active (moderate exercise 3-5 days/week)', value: 'moderately_active' },
        { label: 'Very Active (hard exercise 6-7 days/week)', value: 'very_active' },
        { label: 'Extremely Active (very hard exercise, physical job)', value: 'extremely_active' }
      ],
      subtitle: "Be honest! This changes your calorie budget significantly."
    },
    {
      id: 'nutritionPreference',
      question: "Nutrition Approach",
      type: 'select_with_info',
      options: [
        { label: 'High Protein', value: 'high_protein' },
        { label: 'Low Carb', value: 'low_carb' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'Plant-Based', value: 'plant_based' },
        { label: 'Flexible Dieting', value: 'flexible' }
      ],
      subtitle: "Choose a diet style that suits you.",
      hasInfo: true
    },
    {
      id: 'sleepHours',
      question: "Average Sleep",
      type: 'number',
      placeholder: "Hours per night",
      min: 4,
      max: 12,
      subtitle: "Hours per night"
    },
    {
      id: 'stressLevel',
      question: "Stress Level",
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'High', value: 'high' },
        { label: 'Very High', value: 'very_high' }
      ],
      subtitle: "Helps us adjust your load."
    },
    {
      id: 'motivation',
      question: "Motivations",
      type: 'multiselect',
      options: [
        { label: 'Health', value: 'Health' },
        { label: 'Appearance', value: 'Appearance' },
        { label: 'Energy', value: 'Energy' },
        { label: 'Strength', value: 'Strength' },
        { label: 'Confidence', value: 'Confidence' },
        { label: 'Competition', value: 'Competition' },
        { label: 'Longevity', value: 'Longevity' },
        { label: 'Productivity', value: 'Productivity' },
        { label: 'Mental Clarity', value: 'Mental Clarity' },
        { label: 'Better Routine', value: 'Better Routine' }
      ],
    },
    {
      id: 'challenges',
      question: "Challenges",
      type: 'multiselect',
      options: [
        { label: 'Time', value: 'Time' },
        { label: 'Motivation', value: 'Motivation' },
        { label: 'Knowledge', value: 'Knowledge' },
        { label: 'Consistency', value: 'Consistency' },
        { label: 'Injury/Pain', value: 'Injury/Pain' },
        { label: 'Equipment', value: 'Equipment' },
        { label: 'Diet', value: 'Diet' },
        { label: 'Social Support', value: 'Social Support' }
      ],
    },
    {
      id: 'mealFrequency',
      question: "Meals Per Day",
      type: 'select',
      options: [
        { label: '2 meals', value: '2' },
        { label: '3 meals', value: '3' },
        { label: '4-5 small meals', value: '4' },
        { label: '6+ small meals', value: '6' },
        { label: 'Intermittent fasting', value: '2' }
      ],
      subtitle: "How often do you prefer to eat?"
    },
    {
      id: 'peakEnergy',
      question: "Peak Energy Time",
      type: 'select',
      options: [
        { label: 'Early Morning', value: 'Early Morning' },
        { label: 'Mid-Day', value: 'Mid-Day' },
        { label: 'Evening', value: 'Evening' },
        { label: 'Late Night', value: 'Late Night' }
      ],
      subtitle: "When do you feel most energetic?"
    },
    {
      id: 'lifeStressor',
      question: "Main Life Stressor",
      type: 'select',
      options: [
        { label: 'Work/Career', value: 'Work/Career' },
        { label: 'Family/Parenting', value: 'Family/Parenting' },
        { label: 'Financial Planning', value: 'Financial Planning' },
        { label: 'Health/Self-Care', value: 'Health/Self-Care' },
        { label: 'Social/Relationships', value: 'Social/Relationships' }
      ],
      subtitle: "What causes you the most stress?"
    },
    {
      id: 'coachingStyle',
      question: "Preferred Coaching Style",
      type: 'select',
      options: [
        { label: 'Direct & Disciplined', value: 'Direct & Disciplined' },
        { label: 'Encouraging & Gentle', value: 'Encouraging & Gentle' },
        { label: 'Data-Driven & Analytical', value: 'Data-Driven & Analytical' }
      ],
      subtitle: "How should the AI talk to you?"
    },
    {
      id: 'goal',
      question: "3 Month Goal",
      type: 'text',
      placeholder: "e.g. Run a 5k, lose 10lbs...",
    },
  ], []);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setWelcomeIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const markOnboardingSeen = async () => {
    try {
      await SecureStore.setItemAsync('bluom_has_seen_onboarding_v1', '1');
    } catch {
      // Ignore; not critical for core flow.
    }
  };

  const scrollToNext = () => {
    if (welcomeIndex < welcomeSlides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: welcomeIndex + 1 });
    } else {
      if (!clerkUser) {
        console.log('Slider complete, guest user. Redirecting to signup.');
        void markOnboardingSeen();
        router.replace('/(auth)/signup');
      } else {
        console.log('Slider complete, authenticated user. Proceeding to questionnaire.');
        setShowWelcome(false);
      }
    }
  };

  const handleAnswer = (value: any) => {
    // STEP 0: Unit System
    if (currentStep === 0) {
      const sys = value;
      setUnitSystem(sys);
      return;
    }

    // STEPS 1+: Dynamic Questions
    const questionIndex = currentStep - 1;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const questionId = questions[questionIndex].id;
      setAnswers({ ...answers, [questionId]: value });
    }
  };

  const showInfo = (option: string) => {
    const info = nutritionInfo[option];
    if (info) {
      setInfoContent(info);
      setShowInfoModal(true);
    }
  };

  // Map UI values to schema enums
  const mapToSchemaValues = () => {
    // Values are already stored in schema-compatible format for most fields
    const genderMap: { [key: string]: BiologicalSex } = {
      'male': 'male',
      'female': 'female'
    };

    // Convert weight to kg for calculations
    const weightInKg = units.weight === 'kg'
      ? parseFloat(answers.weight)
      : parseFloat(answers.weight) * 0.453592;

    // Convert height to cm for calculations
    const heightInCm = units.height === 'cm'
      ? parseFloat(answers.height)
      : (Math.floor(answers.height) * 30.48) + ((answers.height % 1) * 12 * 2.54);

    const targetWeightInKg = answers.targetWeight
      ? (units.weight === 'kg'
        ? parseFloat(answers.targetWeight)
        : parseFloat(answers.targetWeight) * 0.453592)
      : undefined;

    return {
      name: answers.name,
      preferredLanguage: preferredLanguage,
      preferredUnits: units,
      biologicalSex: genderMap[answers.gender] || 'female', // Default falllback
      age: answers.age.toString(),
      weight: weightInKg.toString(),
      height: heightInCm.toString(),
      targetWeight: targetWeightInKg?.toString(),
      fitnessGoal: answers.fitnessGoal as FitnessGoal,
      fitnessExperience: answers.experience as FitnessExperience,
      workoutPreference: answers.workoutPreference as WorkoutPreference,
      weeklyWorkoutTime: answers.timeAvailable || '3',
      activityLevel: answers.activityLevel as ActivityLevel,
      nutritionApproach: answers.nutritionPreference as NutritionApproach,
      sleepHours: answers.sleepHours.toString(),
      stressLevel: answers.stressLevel as StressLevel,
      motivations: answers.motivation || [],
      challenges: answers.challenges || [],
      mealsPerDay: answers.mealFrequency || '3',
      threeMonthGoal: answers.goal,
      peakEnergy: answers.peakEnergy,
      lifeStressor: answers.lifeStressor,
      coachingStyle: answers.coachingStyle,
    };
  };

  const calculateLocalResults = () => {
    // Basic mapping 
    const mapped = mapToSchemaValues();

    // Fallbacks since we might be calling this early or late
    const weight = parseFloat(mapped.weight) || 70;
    const height = parseFloat(mapped.height) || 170;
    const age = parseFloat(mapped.age) || 30;

    // ... BMR Calc
    const s = mapped.biologicalSex === 'male' ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * age + s;

    // Multipliers
    const activityMultipliers: { [key: string]: number } = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };

    const tdee = bmr * (activityMultipliers[mapped.activityLevel as string] || 1.375);

    // Goal Adjustments
    const goalAdjustments: { [key: string]: number } = {
      'lose_weight': -500,
      'build_muscle': 300,
      'maintain': 0,
      'improve_health': 0,
      'improve_endurance': 0,
      'general_health': 0,
    };

    const dailyCalories = tdee + (goalAdjustments[mapped.fitnessGoal as string] || 0);

    // Calculate macros
    let proteinGrams = weight * 1.6;
    if (mapped.fitnessGoal === 'build_muscle') proteinGrams = weight * 2.2;
    if (mapped.fitnessGoal === 'lose_weight') proteinGrams = weight * 2.0;
    if (mapped.nutritionApproach === 'high_protein') proteinGrams = weight * 2.5;

    let fatPercentage = 0.3;
    if (mapped.nutritionApproach === 'low_carb') fatPercentage = 0.4;

    const fatGrams = (dailyCalories * fatPercentage) / 9;
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const carbCalories = dailyCalories - proteinCalories - fatCalories;
    const carbsGrams = Math.max(50, carbCalories / 4);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyCalories: Math.round(dailyCalories),
      dailyProtein: Math.round(proteinGrams),
      dailyCarbs: Math.round(carbsGrams),
      dailyFat: Math.round(fatGrams),
    };
  };

  const nextStep = () => {
    // Allow going up to questions.length + 2 steps (0, 1 + questions)
    // Last index is questions.length + 1
    // Allow going up to questions.length steps (0 to questions.length)
    // Last index is questions.length (which corresponds to questions[questions.length-1] for the question, but currentStep is 0-indexed and 0 is units)
    // Wait, step 0 is units. Steps 1..N are questions 0..N-1.
    // Total steps = 1 + N. Last valid step index is N.
    // So if currentStep < N (length), we can increment. If currentStep == N, we are at last step -> Results.
    if (currentStep < questions.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate and show results
      const results = calculateLocalResults();
      setCalculatedResults(results);
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!clerkUser || !convexUser) {
      console.error('User not authenticated');
      return;
    }

    try {
      setLoading(true);

      const mapped = mapToSchemaValues();
      await onboardUser({
        clerkId: clerkUser.id,
        ...mapped,
      });

      // Sync name to Clerk Protocol
      if (answers.name) {
        try {
          await clerkUser.update({
            firstName: answers.name.split(' ')[0],
            lastName: answers.name.split(' ').slice(1).join(' ') || undefined,
          });
        } catch (e) {
          console.log("Failed to sync name to Clerk", e);
        }
      }

      console.log('Generating personalized plans...');
      await generateAllPlans({
        userId: convexUser._id,
      });

      console.log('Onboarding complete! Navigating to dashboard...');
      // Small delay to ensure DB registers changes before redirect
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (error: any) {
      console.error('Onboarding error:', error);
    } finally {
      // Don't set loading to false immediately to prevent button re-enabling during redirect
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // If the user logs out later, go straight to auth (do not show onboarding again).
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Determine current answer based on step
  let currentAnswer: any = undefined;
  if (currentStep === 0) {
    currentAnswer = unitSystem;
  } else {
    const q = questions[currentStep - 1];
    if (q) {
      currentAnswer = answers[q.id];
    }
  }

  // Determine if can proceed
  let canProceed = false;
  if (currentStep === 0) {
    canProceed = !!unitSystem;
  } else {
    const q = questions[currentStep - 1];
    if (q) {
      const ans = answers[q.id];
      canProceed = ans !== undefined && ans !== '' &&
        (q.type !== 'multiselect' || (Array.isArray(ans) && ans.length > 0));
    }
  }

  const renderHeightInput = () => {
    const isFeetInches = units.height === 'ft';
    console.log('Height input - isFeetInches:', isFeetInches, 'units.height:', units.height);

    if (isFeetInches) {
      const feet = Math.floor(currentAnswer || 0);
      const inches = Math.round(((currentAnswer || 0) % 1) * 12);

      return (
        <View style={styles.heightInputContainer}>
          {/* Unit selector removed, using global setting */}
          <View style={styles.heightRow}>
            <View style={styles.heightInputGroup}>
              <Text style={styles.heightInputLabel}>Feet</Text>
              <TextInput
                style={styles.heightInput}
                placeholder="5"
                keyboardType="numeric"
                value={feet.toString()}
                onChangeText={(text) => {
                  const newFeet = parseInt(text) || 0;
                  const currentInches = ((currentAnswer || 0) % 1) * 12;
                  handleAnswer(newFeet + currentInches / 12);
                }}
              />
            </View>
            <View style={styles.heightInputGroup}>
              <Text style={styles.heightInputLabel}>Inches</Text>
              <TextInput
                style={styles.heightInput}
                placeholder="8"
                keyboardType="numeric"
                value={inches.toString()}
                onChangeText={(text) => {
                  const newInches = parseInt(text) || 0;
                  const currentFeet = Math.floor(currentAnswer || 0);
                  handleAnswer(currentFeet + newInches / 12);
                }}
              />
            </View>
          </View>
          {currentAnswer > 0 && (
            <Text style={styles.conversionText}>
              {Math.floor(currentAnswer)}'{Math.round(((currentAnswer % 1) * 12))}"
              ({Math.round((Math.floor(currentAnswer) * 30.48) + (((currentAnswer % 1) * 12) * 2.54))} cm)
            </Text>
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.heightInputContainer}>
          <View style={styles.unitInputWrapper}>
            <TextInput
              style={[styles.input, styles.unitInput]}
              placeholder="170"
              keyboardType="numeric"
              value={currentAnswer?.toString() || ''}
              onChangeText={(text) => handleAnswer(Number(text) || 0)}
            />
            <Text style={styles.unitLabel}>cm</Text>
          </View>
          {currentAnswer > 0 && (
            <Text style={styles.conversionText}>
              {currentAnswer} cm ({Math.floor(currentAnswer / 30.48)}'{Math.round(((currentAnswer / 30.48) % 1) * 12)}")
            </Text>
          )}
        </View>
      );
    }
  };

  const renderNumberWithUnits = () => {
    const questionIndex = currentStep - 1;
    const question = questions[questionIndex];
    if (!question) return null;

    const isWeight = question.id === 'weight' || question.id === 'targetWeight';
    const isHeight = question.id === 'height';

    // Default to 'lbs' or 'cm' logic? No, follow unitSystem
    // If unitSystem is 'metric': weight=kg, height=cm
    // If unitSystem is 'imperial': weight=lbs, height=ft (but height uses different renderer)

    // Actually renderHeightInput handles height specifically.
    // This function is for "number_with_units".
    // "height" uses "height_input" type, so it won't be called here.

    const currentUnit = isWeight ? units.weight : '';

    // console.log('Question ID:', question.id, 'isWeight:', isWeight, 'currentUnit:', currentUnit, 'units:', units);

    return (
      <View style={styles.unitInputContainer}>
        <View style={styles.unitInputWrapper}>
          <TextInput
            style={[styles.input, styles.unitInput]}
            placeholder={question.placeholder}
            keyboardType="numeric"
            value={currentAnswer?.toString() || ''}
            onChangeText={(text) => handleAnswer(Number(text) || 0)}
          />
          <Text style={styles.unitLabel}>{currentUnit}</Text>
        </View>
        {isWeight && currentAnswer > 0 && (
          <Text style={styles.conversionText}>
            {units.weight === 'lbs'
              ? `${currentAnswer} lbs (${(Number(currentAnswer) * 0.453592).toFixed(1)} kg)`
              : `${currentAnswer} kg (${(Number(currentAnswer) / 0.453592).toFixed(1)} lbs)`
            }
          </Text>
        )}
      </View>
    );
  };

  const renderWelcomeSlide = ({ item }: { item: typeof welcomeSlides[0] }) => {
    return (
      <View style={[styles.welcomeSlide, { backgroundColor: item.bgColor }]}>
        <View style={styles.welcomeIconContainer}>
          <LinearGradient
            colors={item.colors}
            style={styles.welcomeIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* This check prevents crashes by identifying if it's a local file or a Lucide component */}
            {typeof item.icon === 'number' ? (
              <Image
                source={item.icon}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            ) : (
              <item.icon size={64} color="#FFFFFF" />
            )}
          </LinearGradient>
        </View>

        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeSlideTitle}>{item.title}</Text>
          <Text style={[styles.welcomeSlideSubtitle, { color: item.colors[1] }]}>
            {item.subtitle}
          </Text>
          <Text style={styles.welcomeSlideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const WelcomePagination = () => (
    <View style={styles.welcomePagination}>
      {welcomeSlides.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 32, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index.toString()}
            style={[
              styles.welcomeDot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: welcomeSlides[welcomeIndex].colors[1],
              },
            ]}
          />
        );
      })}
    </View>
  );

  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <FlatList
          ref={slidesRef}
          data={welcomeSlides}
          renderItem={renderWelcomeSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={32}
        />

        <SafeAreaView style={styles.welcomeFooter} edges={['bottom']}>
          <WelcomePagination />

          <TouchableOpacity onPress={scrollToNext} activeOpacity={0.8}>
            <LinearGradient
              colors={welcomeSlides[welcomeIndex].colors}
              style={styles.welcomeNextButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.welcomeNextButtonText}>
                {welcomeIndex === welcomeSlides.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (showResults && calculatedResults) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Your Personalized Plan</Text>
          <Text style={styles.resultsSubtitle}>
            Based on your responses, here's what we calculated for you
          </Text>

          <View style={styles.resultsCard}>
            <Text style={styles.resultsLabel}>Daily Calorie Target</Text>
            <Text style={styles.resultsValue}>{calculatedResults.dailyCalories} kcal</Text>
            <Text style={styles.resultsDescription}>
              {answers.fitnessGoal === 'Lose Weight' && 'Set to a 500 kcal deficit for healthy weight loss'}
              {answers.fitnessGoal === 'Build Muscle' && 'Set to a 300 kcal surplus for muscle growth'}
              {answers.fitnessGoal === 'Maintain Weight' && 'Set to maintain your current weight'}
            </Text>
          </View>

          <BlurView intensity={80} style={styles.blurredSection}>
            <View style={styles.macrosPreview}>
              <Text style={styles.macrosTitle}>Your Macro Split</Text>
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyProtein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyCarbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{calculatedResults.dailyFat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </BlurView>

          <Text style={styles.unlockText}>
            Review your calculated plan and continue to your dashboard
          </Text>

          <TouchableOpacity
            style={[styles.googleButton, (loading || !clerkUser) && styles.navButtonDisabled]}
            onPress={handleCompleteOnboarding}
            disabled={loading || !clerkUser}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.googleButtonText}>Continue to Dashboard</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {questions.length + 1}
            </Text>
            <View style={styles.progressPercentage}>
              <Sparkles size={16} color="#2563eb" />
              <Text style={styles.progressPercentageText}>
                {Math.round(((currentStep + 1) / (questions.length + 1)) * 100)}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / (questions.length + 1)) * 100}%` }
              ]}
            />
          </View>
        </View>

        <View style={styles.questionCard}>
          {/* STEP 0: UNIT SYSTEM SELECTION */}
          {currentStep === 0 && (
            <>
              <Text style={styles.questionTitle}>Unit System</Text>
              <Text style={styles.questionSubtitle}>Choose your preferred unit system</Text>
              <View style={styles.optionsContainer}>
                {[
                  { label: 'Imperial (lb, ft, oz)', value: 'imperial' },
                  { label: 'Metric (kg, cm, ml)', value: 'metric' }
                ].map((option, index) => {
                  const isSelected = unitSystem === option.value;
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${index}`}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                      onPress={() => handleAnswer(option.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* STEPS 1+: DYNAMIC QUESTIONS */}
          {currentStep >= 1 && (() => {
            const questionIndex = currentStep - 1;
            const question = questions[questionIndex];

            if (!question) return null;

            return (
              <>
                <Text style={styles.questionTitle}>{question.question}</Text>
                {question.subtitle && (
                  <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
                )}

                {question.type === 'text' && (
                  <TextInput
                    style={styles.input}
                    placeholder={question.placeholder}
                    value={currentAnswer || ''}
                    onChangeText={handleAnswer}
                    autoFocus
                  />
                )}

                {question.type === 'number' && (
                  <TextInput
                    style={styles.input}
                    placeholder={question.placeholder}
                    keyboardType="numeric"
                    value={currentAnswer?.toString() || ''}
                    onChangeText={(text) => handleAnswer(Number(text) || 0)}
                    autoFocus
                  />
                )}

                {question.type === 'number_with_units' && renderNumberWithUnits()}
                {question.type === 'height_input' && renderHeightInput()}

                {question.type === 'select' && (
                  <View style={styles.optionsContainer}>
                    {question.options?.map((option, index) => {
                      const value = typeof option === 'string' ? option : option.value;
                      const isSelected = currentAnswer === value;

                      return (
                        <TouchableOpacity
                          key={`${value}-${index}`}
                          style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                          onPress={() => handleAnswer(value)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {typeof option === 'string' ? option : option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {question.type === 'select_with_info' && (
                  <View style={styles.optionsContainer}>
                    {question.options?.map((option, index) => {
                      const value = typeof option === 'string' ? option : option.value;
                      const isSelected = currentAnswer === value;
                      return (
                        <View key={`${value}-${index}`} style={styles.optionWithInfo}>
                          <TouchableOpacity
                            style={[
                              styles.optionButton,
                              styles.optionButtonWithInfo,
                              isSelected && styles.optionButtonSelected
                            ]}
                            onPress={() => handleAnswer(value)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                              {typeof option === 'string' ? option : option.label}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.infoButton}
                            onPress={() => showInfo(typeof option === 'string' ? option : option.label)}
                            activeOpacity={0.7}
                          >
                            <Info size={20} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {question.type === 'multiselect' && (
                  <View style={styles.optionsContainer}>
                    {question.options?.map((option, index) => {
                      const value = typeof option === 'string' ? option : option.value;
                      const isSelected = (currentAnswer || []).includes(value);
                      return (
                        <TouchableOpacity
                          key={`${value}-${index}`}
                          style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                          onPress={() => {
                            const current = currentAnswer || [];
                            const updated = current.includes(value)
                              ? current.filter((item: string) => item !== value)
                              : [...current, value];
                            handleAnswer(updated);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.multiselectContent}>
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                              {typeof option === 'string' ? option : option.label}
                            </Text>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            );
          })()}
        </View>

        <View style={styles.progressIndicator}>
          <Text style={styles.progressIndicatorText}>
            {currentStep < questions.length - 1
              ? `${questions.length - currentStep - 1} questions remaining`
              : 'Ready to see your results!'
            }
          </Text>
        </View>
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={prevStep}
          disabled={currentStep === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, !canProceed && styles.navButtonDisabled]}
          onPress={nextStep}
          disabled={!canProceed}
          activeOpacity={0.7}
        >
          <Text style={[styles.nextButtonText, !canProceed && styles.navButtonTextDisabled]}>
            {currentStep === questions.length ? 'See Results' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showInfoModal} animationType="fade" transparent onRequestClose={() => setShowInfoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{infoContent.title}</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>{infoContent.description}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfoModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  welcomeSlide: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIconGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeLogo: {
    width: 84,
    height: 84,
  },
  welcomeTextContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  welcomeSlideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSlideSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeSlideDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  welcomeFooter: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 20,
  },
  welcomePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  welcomeDot: {
    height: 8,
    borderRadius: 4,
  },
  welcomeNextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeNextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  progressPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressPercentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  unitInputContainer: {
    gap: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#2563eb',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  unitButtonTextActive: {
    color: '#ffffff',
  },
  unitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingRight: 16,
  },
  unitInput: {
    flex: 1,
    borderWidth: 0,
    paddingRight: 8,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  heightInputContainer: {
    gap: 16,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputGroup: {
    flex: 1,
  },
  heightInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  heightInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  conversionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    width: '100%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  optionButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionButtonWithInfo: {
    paddingRight: 48,
  },
  optionText: {
    fontSize: 16,
    color: '#1e293b',
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  optionWithInfo: {
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -14 }], // Centering adjustment for 28px height (20px icon + 8px padding)
    padding: 4,
  },
  multiselectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 20,
    color: '#2563eb',
  },
  progressIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  progressIndicatorText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#ebf2fe',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backButton: {
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    marginLeft: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonTextDisabled: {
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#1e293b',
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultsContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  resultsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  resultsDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  blurredSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  macrosPreview: {
    padding: 24,
  },
  macrosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  unlockText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
