import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

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
import { setPendingRouteAfterOnboarding, pendingPrimaryFocus } from './_layout';
import { useActiveTools, PrimaryFocus } from '@/hooks/useActiveTools';

import HeightRuler from '@/components/onboarding/HeightRuler';
import ScrollWheelPicker from '@/components/onboarding/ScrollWheelPicker';
import HorizontalRulerPicker from '@/components/onboarding/HorizontalRulerPicker';
import SteppedSlider from '@/components/onboarding/SteppedSlider';
import Toast from '@/components/onboarding/Toast';
import GoalEstimator from '@/components/onboarding/GoalEstimator';
import { useTheme, THEMES, THEME_ORDER, type ThemeColors, type ThemeKey } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

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
  type: 'text' | 'number' | 'select' | 'multiselect' | 'number_with_units' | 'height_ruler' | 'select_with_info' | 'scroll_wheel' | 'horizontal_ruler' | 'stepped_slider';
  placeholder?: string;
  options?: (string | QuestionOption)[];
  subtitle?: string;
  hasInfo?: boolean;
  min?: number;
  max?: number;
  toastFeedback?: string;
  suffix?: string;
  sliderSteps?: { value: string; label: string; description: string }[];
}

interface StepGroup {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

// --- Configuration ---

const getStepGroups = (t: any, primaryFocus?: string): StepGroup[] => {
  const groups: StepGroup[] = [];

  // Step 1: "What brings you to BLÜOM today?" (Rendered if not pre-set via deep link)
  if (!primaryFocus) {
    groups.push({
      id: 'primaryFocus',
      title: t('onboarding.groups.journeyTitle', 'Your Journey'),
      questions: [{
        id: 'primaryFocus',
        question: t('onboarding.questions.whatBringsYou', 'What brings you to BLÜOM today?'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.focus.fitness', '🏋️ Fitness & Nutrition'), value: 'fitness', info: t('onboarding.focus.fitnessInfo', 'Targeted macros, smart workouts & body recomposition protocols') },
          { label: t('onboarding.focus.mental', '🧘 Mental Health & Calm'), value: 'mental_health', info: t('onboarding.focus.mentalInfo', 'Mindfulness, sleep recovery, stress mitigation & focus routines') },
          { label: t('onboarding.focus.hormonal', '🔬 Peak Biology'), value: 'hormonal', info: t('onboarding.focus.hormonalInfo', 'Gender-optimised daily fluctuation patterns, energy, hormonal vitality & cycle intelligence') },
          { label: t('onboarding.focus.holistic', '🌿 Holistic Health'), value: 'holistic', info: t('onboarding.focus.holisticInfo', 'Complete 360° life performance architecture across body and mind') },
        ]
      }]
    });
  }

  // Gender
  groups.push({
    id: 'gender',
    title: t('onboarding.groups.identityTitle', 'Identity'),
    questions: [{
      id: 'gender',
      question: t('onboarding.questions.gender', 'What is your biological sex?'),
      type: 'select',
      options: [
        { label: t('onboarding.questions.genderMale', 'Male'), value: 'male' },
        { label: t('onboarding.questions.genderFemale', 'Female'), value: 'female' }
      ],
      subtitle: t('onboarding.questions.genderSub', 'Used to calibrate metabolic equations and cycle intelligence')
    }]
  });

  // Age (defaults to 25)
  groups.push({
    id: 'age',
    title: t('onboarding.groups.identityTitle', 'Identity'),
    questions: [{ id: 'age', question: t('onboarding.questions.age', 'What is your age?'), type: 'scroll_wheel', min: 16, max: 100 }]
  });

  // Biometric weights + height (skipped for mental_health — not relevant)
  if (primaryFocus !== 'mental_health') {
    groups.push({
      id: 'height',
      title: t('onboarding.groups.biometricsTitle', 'Biometrics'),
      // min/max are overridden dynamically in renderQuestion based on unit system
      questions: [{ id: 'height', question: t('onboarding.questions.height', 'What is your height?'), type: 'scroll_wheel', min: 120, max: 230 }]
    });
    groups.push({
      id: 'weight',
      title: t('onboarding.groups.biometricsTitle', 'Biometrics'),
      questions: [{ id: 'weight', question: t('onboarding.questions.weight', 'What is your current weight?'), type: 'horizontal_ruler', min: 30, max: 200 }]
    });
    groups.push({
      id: 'targetWeight',
      title: t('onboarding.groups.biometricsTitle', 'Biometrics'),
      questions: [{ id: 'targetWeight', question: t('onboarding.questions.targetWeight', 'What is your target weight?'), type: 'horizontal_ruler', min: 30, max: 200, subtitle: t('onboarding.questions.targetWeightSub', 'Helps compute your caloric surplus or deficit target') }]
    });
  }

  // Training & fitness goals (for fitness and holistic)
  if (primaryFocus === 'fitness' || primaryFocus === 'holistic' || !primaryFocus) {
    groups.push({
      id: 'fitnessGoal',
      title: t('onboarding.groups.trainingTitle', 'Training & Goals'),
      questions: [{
        id: 'fitnessGoal',
        question: t('onboarding.questions.fitnessGoal', 'What is your primary fitness goal?'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.goalLoseWeight', 'Fat Loss'), value: 'lose_weight', info: t('onboarding.questions.goalLoseWeightInfo', 'Shed excess body fat while preserving lean muscle mass') },
          { label: t('onboarding.questions.goalBuildMuscle', 'Build Muscle'), value: 'build_muscle', info: t('onboarding.questions.goalBuildMuscleInfo', 'Hypertrophy focused training with calculated caloric surplus') },
          { label: t('onboarding.questions.goalMaintain', 'Maintain & Tone'), value: 'maintain', info: t('onboarding.questions.goalMaintainInfo', 'Sustain current body composition and optimize vitality') },
          { label: t('onboarding.questions.goalEndurance', 'Improve Endurance'), value: 'improve_endurance', info: t('onboarding.questions.goalEnduranceInfo', 'Aerobic capacity, stamina and cardiovascular conditioning') },
          { label: t('onboarding.questions.goalGeneralHealth', 'Longevity & Health'), value: 'general_health', info: t('onboarding.questions.goalGeneralHealthInfo', 'Joint health, cardiovascular durability and sustained daily energy') },
          { label: t('onboarding.questions.goalBodyRecomp', 'Body Recomposition'), value: 'body_recomp', info: t('onboarding.questions.goalBodyRecompInfo', 'Lose fat and gain muscle simultaneously at maintenance calories.') },
        ]
      }]
    });

    groups.push({
      id: 'experience',
      title: t('onboarding.groups.trainingTitle', 'Training & Goals'),
      questions: [{
        id: 'experience',
        question: t('onboarding.questions.experience', 'What is your training experience?'),
        type: 'stepped_slider',
        sliderSteps: [
          { value: 'beginner', label: t('onboarding.questions.expBeginner', 'Beginner'), description: t('onboarding.slider.beginnerDesc', 'New to fitness or just getting started') },
          { value: 'intermediate', label: t('onboarding.questions.expIntermediate', 'Intermediate'), description: t('onboarding.slider.intermediateDesc', 'Regular training for 1-3 years') },
          { value: 'advanced', label: t('onboarding.questions.expAdvanced', 'Advanced'), description: t('onboarding.slider.advancedDesc', 'Serious training for 3+ years') }
        ]
      }]
    });

    groups.push({
      id: 'workoutPreference',
      title: t('onboarding.groups.trainingTitle', 'Training & Goals'),
      questions: [{
        id: 'workoutPreference',
        question: t('onboarding.questions.workoutStyle', 'Preferred workout style'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.wsStrength', 'Strength & Weights'), value: 'strength', info: t('onboarding.questions.wsStrengthInfo', 'Barbells, dumbbells and resistance equipment') },
          { label: t('onboarding.questions.wsCardio', 'Cardio & Running'), value: 'cardio', info: t('onboarding.questions.wsCardioInfo', 'Running, cycling and steady state cardio') },
          { label: t('onboarding.questions.wsHiit', 'HIIT & Circuit'), value: 'hiit', info: t('onboarding.questions.wsHiitInfo', 'High intensity intervals for maximum metabolic output') },
          { label: t('onboarding.questions.wsYoga', 'Yoga & Mobility'), value: 'yoga', info: t('onboarding.questions.wsYogaInfo', 'Flexibility, joint health and breathwork') },
          { label: t('onboarding.questions.wsCrossfit', 'Functional Fitness'), value: 'crossfit', info: t('onboarding.questions.wsCrossfitInfo', 'Dynamic high-power functional training') },
          { label: t('onboarding.questions.wsPilates', 'Pilates & Core'), value: 'pilates', info: t('onboarding.questions.wsPilatesInfo', 'Deep core stability and postural alignment') },
          { label: t('onboarding.questions.wsMixed', 'Mixed Training'), value: 'mixed', info: t('onboarding.questions.wsMixedInfo', 'Balanced combination across disciplines') }
        ]
      }]
    });

    groups.push({
      id: 'activityLevel',
      title: t('onboarding.groups.activityTitle', 'Activity'),
      questions: [{
        id: 'activityLevel',
        question: t('onboarding.questions.activityLevel', 'Daily Activity Level'),
        type: 'stepped_slider',
        subtitle: t('onboarding.questions.activitySub', 'Excluding workouts'),
        sliderSteps: [
          { value: 'sedentary', label: t('onboarding.questions.actSedentary', 'Sedentary'), description: t('onboarding.slider.sedentaryDesc', 'Office job, minimal movement') },
          { value: 'lightly_active', label: t('onboarding.questions.actLightlyActive', 'Lightly Active'), description: t('onboarding.slider.lightlyActiveDesc', 'Light walks, occasional activity') },
          { value: 'moderately_active', label: t('onboarding.questions.actModeratelyActive', 'Moderately Active'), description: t('onboarding.slider.modActiveDesc', 'Regular movement 3-4x per week') },
          { value: 'very_active', label: t('onboarding.questions.actVeryActive', 'Very Active'), description: t('onboarding.slider.veryActiveDesc', 'Intense movement 5-6x per week') },
          { value: 'extremely_active', label: t('onboarding.questions.actExtremelyActive', 'Extremely Active'), description: t('onboarding.slider.extremeActiveDesc', 'Physical job + daily training') }
        ]
      }]
    });

    groups.push({
      id: 'timeAvailable',
      title: t('onboarding.groups.activityTitle', 'Activity'),
      questions: [{
        id: 'timeAvailable',
        question: t('onboarding.questions.weeklyTime', 'Weekly time available for workouts'),
        type: 'select',
        options: [
          { label: '< 2h', value: '1' },
          { label: '2–4h', value: '3' },
          { label: '4–6h', value: '5' },
          { label: '6+h', value: '7' },
        ]
      }]
    });

    groups.push({
      id: 'commitment',
      title: t('onboarding.groups.commitmentTitle', 'Commitment'),
      description: t('onboarding.groups.commitmentDesc', 'How aggressively do you want to pace your results?'),
      questions: [{
        id: 'commitmentLevel',
        question: t('onboarding.questions.commitmentApproach', 'Select your pace'),
        type: 'select_with_info',
        hasInfo: true,
        toastFeedback: t('onboarding.questions.commitToast', 'Calibrating protocol difficulty...'),
        options: [
          { label: t('onboarding.questions.commitEasy', 'Sustainable & Gentle'), value: 'easy', info: t('onboarding.questions.commitEasyInfo', 'Gradual sustainable habit building') },
          { label: t('onboarding.questions.commitBalanced', 'Balanced & Steady'), value: 'balanced', info: t('onboarding.questions.commitBalancedInfo', 'Optimal balance of progress and flexibility') },
          { label: t('onboarding.questions.commitMaximum', 'Maximum Focus'), value: 'maximum', info: t('onboarding.questions.commitMaximumInfo', 'Strict discipline for accelerated transformations') }
        ]
      }]
    });
  }

  // ── MENTAL HEALTH BRANCH: Cognitive & Somatic questions ───────────────
  if (primaryFocus === 'mental_health') {
    groups.push({
      id: 'mindfulnessGoal',
      title: t('onboarding.groups.mindTitle', 'Mind Architecture'),
      questions: [{
        id: 'mindfulnessGoal',
        question: t('onboarding.questions.mindfulnessGoal', 'What is your primary mindfulness objective?'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.mgFocus', 'Deep Focus & ADHD Control'), value: 'deep_focus', info: t('onboarding.questions.mgFocusInfo', 'Structured attention training, flow-state protocols, and distraction filtering') },
          { label: t('onboarding.questions.mgAnxiety', 'Anxiety & Panic Relief'), value: 'anxiety_relief', info: t('onboarding.questions.mgAnxietyInfo', 'Acute nervous system regulation and somatic calming techniques') },
          { label: t('onboarding.questions.mgEmotional', 'Emotional Resilience'), value: 'emotional_resilience', info: t('onboarding.questions.mgEmotionalInfo', 'Mood stability, emotional intelligence, and inner regulation tools') },
          { label: t('onboarding.questions.mgSleep', 'Sleep Onset & Night Racing Thoughts'), value: 'sleep_onset', info: t('onboarding.questions.mgSleepInfo', 'Wind-down protocols, cognitive quieting and parasympathetic activation') },
        ]
      }]
    });

    groups.push({
      id: 'meditationExperience',
      title: t('onboarding.groups.mindTitle', 'Mind Architecture'),
      questions: [{
        id: 'meditationExperience',
        question: t('onboarding.questions.meditationExp', 'Your mindfulness & meditation experience'),
        type: 'stepped_slider',
        sliderSteps: [
          { value: 'beginner', label: t('onboarding.questions.medBeginner', 'Beginner'), description: t('onboarding.slider.medBeginnerDesc', 'Never practiced — completely new') },
          { value: 'sporadic', label: t('onboarding.questions.medSporadic', 'Sporadic'), description: t('onboarding.slider.medSporadicDesc', 'Tried apps like Headspace / Calm, fell off') },
          { value: 'consistent', label: t('onboarding.questions.medConsistent', 'Consistent'), description: t('onboarding.slider.medConsistentDesc', 'Weekly practice, some structure') },
          { value: 'advanced', label: t('onboarding.questions.medAdvanced', 'Advanced'), description: t('onboarding.slider.medAdvancedDesc', 'Daily breathwork / mindfulness practitioner') },
        ]
      }]
    });

    groups.push({
      id: 'peakFocusWindow',
      title: t('onboarding.groups.mindTitle', 'Mind Architecture'),
      questions: [{
        id: 'peakFocusWindow',
        question: t('onboarding.questions.peakFocusWindow', 'When are you most mentally clear & focused?'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.pfwEarlyMorning', '🌅 Early Morning (6 AM – 9 AM)'), value: 'early_morning' },
          { label: t('onboarding.questions.pfwLateMorning', '☀️ Late Morning (9 AM – 12 PM)'), value: 'late_morning' },
          { label: t('onboarding.questions.pfwAfternoon', '🌤 Afternoon (1 PM – 5 PM)'), value: 'afternoon' },
          { label: t('onboarding.questions.pfwNightOwl', '🌙 Night Owl (8 PM – Midnight)'), value: 'night_owl' },
        ]
      }]
    });

    groups.push({
      id: 'screenTimeRisk',
      title: t('onboarding.groups.mindTitle', 'Mind Architecture'),
      questions: [{
        id: 'screenTimeRisk',
        question: t('onboarding.questions.screenTimeRisk', 'Daily screen time / digital fatigue'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.strUnder3h', 'Under 3 hours — minimal digital strain'), value: 'under_3h' },
          { label: t('onboarding.questions.str3_6h', '3–6 hours — moderate desk fatigue'), value: '3_6h' },
          { label: t('onboarding.questions.str6_9h', '6–9 hours — heavy screen exposure & blue light'), value: '6_9h' },
          { label: t('onboarding.questions.str9plus', '9+ hours — severe mental exhaustion'), value: '9h_plus' },
        ]
      }]
    });

    groups.push({
      id: 'stressSymptomType',
      title: t('onboarding.groups.somaticTitle', 'Somatic & Nervous System'),
      questions: [{
        id: 'stressSymptomType',
        question: t('onboarding.questions.stressSymptoms', 'How does stress physically manifest in you? (Select all that apply)'),
        type: 'multiselect',
        options: [
          { label: t('onboarding.questions.ssJaw', 'Jaw clenching or teeth grinding'), value: 'jaw_clenching' },
          { label: t('onboarding.questions.ssShoulder', 'Tight shoulders / shallow chest breathing'), value: 'tight_shoulders' },
          { label: t('onboarding.questions.ssBrainFog', 'Brain fog & afternoon fatigue'), value: 'brain_fog' },
          { label: t('onboarding.questions.ssStomach', 'Nervous stomach or digestive changes'), value: 'nervous_stomach' },
          { label: t('onboarding.questions.ssRestless', 'Restless legs or physical agitation'), value: 'restless_legs' },
        ]
      }]
    });

    groups.push({
      id: 'preferredResetTool',
      title: t('onboarding.groups.somaticTitle', 'Somatic & Nervous System'),
      questions: [{
        id: 'preferredResetTool',
        question: t('onboarding.questions.preferredReset', 'Preferred nervous system reset method'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.prtBreathwork', 'Box Breathing & 4-7-8 Breathwork'), value: 'breathwork', info: t('onboarding.questions.prtBreathworkInfo', 'Parasympathetic activation via controlled respiratory patterns') },
          { label: t('onboarding.questions.prtSoundscapes', 'Nature Soundscapes & Binaural Beats'), value: 'soundscapes', info: t('onboarding.questions.prtSoundscapesInfo', 'Immersive audio environments for deep nervous system relaxation') },
          { label: t('onboarding.questions.prtJournaling', '3-Minute Cognitive Journaling Prompts'), value: 'journaling', info: t('onboarding.questions.prtJournalingInfo', 'Short structured writing to offload mental load and clarify thoughts') },
          { label: t('onboarding.questions.prtCold', 'Cold Exposure & Somatic Body Scans'), value: 'cold_somatic', info: t('onboarding.questions.prtColdInfo', 'Controlled stress inoculation and body-awareness grounding techniques') },
        ]
      }]
    });

    groups.push({
      id: 'eveningRoutine',
      title: t('onboarding.groups.somaticTitle', 'Somatic & Nervous System'),
      questions: [{
        id: 'eveningRoutine',
        question: t('onboarding.questions.eveningRoutine', 'Your current evening wind-down consistency'),
        type: 'stepped_slider',
        sliderSteps: [
          { value: 'erratic', label: t('onboarding.questions.erErratic', 'Erratic'), description: t('onboarding.slider.erraticDesc', 'Work or scroll until falling asleep') },
          { value: 'semi_regular', label: t('onboarding.questions.erSemiRegular', 'Semi-Regular'), description: t('onboarding.slider.semiRegularDesc', 'Occasional reading or quiet time') },
          { value: 'strict_protocol', label: t('onboarding.questions.erStrict', 'Strict Protocol'), description: t('onboarding.slider.strictProtocolDesc', 'Consistent cutoff times and dim lights') },
        ]
      }]
    });
  }

  // Lifestyle: Sleep & Stress (Always included for all focuses)
  groups.push({
    id: 'sleepHours',
    title: t('onboarding.groups.lifestyleTitle', 'Recovery & Mind'),
    questions: [{ id: 'sleepHours', question: t('onboarding.questions.sleepHours', 'Average nightly sleep'), type: 'scroll_wheel', min: 3, max: 12, suffix: 'h' }]
  });

  groups.push({
    id: 'stressLevel',
    title: t('onboarding.groups.lifestyleTitle', 'Recovery & Mind'),
    questions: [{
      id: 'stressLevel',
      question: t('onboarding.questions.stressLevel', 'Current daily stress level'),
      type: 'stepped_slider',
      sliderSteps: [
        { value: 'low', label: t('onboarding.questions.stressLow', 'Low'), description: t('onboarding.slider.stressLowDesc', 'Relaxed, manageable daily life') },
        { value: 'moderate', label: t('onboarding.questions.stressMod', 'Moderate'), description: t('onboarding.slider.stressModDesc', 'Some pressure but coping well') },
        { value: 'high', label: t('onboarding.questions.stressHigh', 'High'), description: t('onboarding.slider.stressHighDesc', 'Frequent stress affecting wellbeing') },
        { value: 'very_high', label: t('onboarding.questions.stressVeryHigh', 'Very High'), description: t('onboarding.slider.stressVeryHighDesc', 'Overwhelmed, struggling to manage') }
      ]
    }]
  });

  groups.push({
    id: 'lifeStressor',
    title: t('onboarding.groups.lifestyleTitle', 'Recovery & Mind'),
    questions: [{
      id: 'lifeStressor',
      question: t('onboarding.questions.mainStressors', 'Primary life stressors'),
      type: 'multiselect',
      options: [
        { label: t('onboarding.questions.stressorWork', 'Work & Career'), value: 'Work/Career' },
        { label: t('onboarding.questions.stressorFamily', 'Family & Home'), value: 'Family/Parenting' },
        { label: t('onboarding.questions.stressorFinances', 'Financial Goals'), value: 'Financial Planning' },
        { label: t('onboarding.questions.stressorHealth', 'Health & Physical'), value: 'Health/Self-Care' },
        { label: t('onboarding.questions.stressorSleep', 'Poor Sleep Quality'), value: 'Sleep' },
        { label: t('onboarding.questions.stressorTime', 'Lack of Time'), value: 'Time' },
      ]
    }]
  });

  // ── PEAK BIOLOGY BRANCH: Gender-neutral metabolic mapping ─────────────────
  // Female-specific PMS questions are injected in the STEP_GROUPS useMemo after gender is known.
  // Male-specific androgen questions are also injected there.
  if (primaryFocus === 'hormonal') {
    groups.push({
      id: 'energyCrashPattern',
      title: t('onboarding.groups.hormonalTitle', 'Peak Biology'),
      questions: [{
        id: 'energyCrashPattern',
        question: t('onboarding.questions.energyCrash', 'Daily energy fluctuation pattern'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.ecStable', 'Stable all day'), value: 'stable' },
          { label: t('onboarding.questions.ecAfternoon', 'Sudden 2 PM – 4 PM exhaustion'), value: 'afternoon_crash' },
          { label: t('onboarding.questions.ecMorning', 'Morning sluggishness requiring caffeine'), value: 'morning_sluggish' },
          { label: t('onboarding.questions.ecNight', 'Alert at night, foggy in the morning'), value: 'night_owl' },
        ]
      }]
    });

    groups.push({
      id: 'dailyHydration',
      title: t('onboarding.groups.hormonalTitle', 'Peak Biology'),
      questions: [{
        id: 'dailyHydration',
        question: t('onboarding.questions.dailyHydration', 'Daily hydration & electrolyte protocol'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.dhUnder1l', 'Under 1 Liter — Chronic dehydration'), value: 'under_1l' },
          { label: t('onboarding.questions.dh1_2l', '1–2 Liters — Plain water only'), value: '1_2l' },
          { label: t('onboarding.questions.dh2_3l', '2–3 Liters — Consistent hydration'), value: '2_3l' },
          { label: t('onboarding.questions.dhElectrolytes', 'High intake with deliberate electrolytes'), value: 'electrolytes' },
        ]
      }]
    });

    groups.push({
      id: 'bloodSugarStability',
      title: t('onboarding.groups.hormonalTitle', 'Peak Biology'),
      questions: [{
        id: 'bloodSugarStability',
        question: t('onboarding.questions.bloodSugarStability', 'Blood sugar & satiety response'),
        type: 'select',
        options: [
          { label: t('onboarding.questions.bssHanger', '"Hanger", shakiness if meals are delayed'), value: 'hanger' },
          { label: t('onboarding.questions.bssGrazing', 'Constant grazing throughout the day'), value: 'grazing' },
          { label: t('onboarding.questions.bssFasting', 'Can easily fast 14–16 hours'), value: 'extended_fast' },
          { label: t('onboarding.questions.bssStable', 'Consistent energy — no major swings'), value: 'stable' },
        ]
      }]
    });
  }

  // Nutrition approach (if not pure mental_health)
  if (primaryFocus !== 'mental_health') {
    groups.push({
      id: 'nutritionPreference',
      title: t('onboarding.groups.dietTitle', 'Nutrition'),
      questions: [{
        id: 'nutritionPreference',
        question: t('onboarding.questions.dietApproach', 'Preferred Nutrition Strategy'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.dietHighProtein', 'High Protein'), value: 'high_protein', info: t('onboarding.questions.dietHighProteinInfo', 'Targeted lean protein for satiety and muscular repair') },
          { label: t('onboarding.questions.dietLowCarb', 'Low Carb / Ketogenic'), value: 'low_carb', info: t('onboarding.questions.dietLowCarbInfo', 'Controlled carbohydrate intake for insulin sensitivity') },
          { label: t('onboarding.questions.dietBalanced', 'Mediterranean / Balanced'), value: 'balanced', info: t('onboarding.questions.dietBalancedInfo', 'Whole grains, healthy fats and balanced macronutrients') },
          { label: t('onboarding.questions.dietPlantBased', 'Plant-Based / Vegan'), value: 'plant_based', info: t('onboarding.questions.dietPlantBasedInfo', '100% plant-powered micronutrient richness') },
          { label: t('onboarding.questions.dietFlexible', 'Flexible / IIFYM'), value: 'flexible', info: t('onboarding.questions.dietFlexibleInfo', 'Track macros without rigid food restrictions') }
        ]
      }]
    });

    groups.push({
      id: 'mealFrequency',
      title: t('onboarding.groups.dietTitle', 'Nutrition'),
      questions: [{
        id: 'mealFrequency',
        question: t('onboarding.questions.mealsPerDay', 'Meals per day'),
        type: 'select',
        options: [
          { label: '2 meals', value: '2' },
          { label: '3 meals', value: '3' },
          { label: '4 meals', value: '4' },
          { label: '5+ meals', value: '5' },
        ]
      }]
    });
  }

  // ── FITNESS / HOLISTIC BRANCH: Behavioral & Equipment questions ─────────
  if (primaryFocus === 'fitness' || primaryFocus === 'holistic') {
    groups.push({
      id: 'dietaryObstacle',
      title: t('onboarding.groups.metabolicTitle', 'Metabolic Profile'),
      questions: [{
        id: 'dietaryObstacle',
        question: t('onboarding.questions.dietaryObstacle', 'Biggest nutritional roadblock'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.doLateSnacking', 'Late-night snacking & binge eating'), value: 'late_snacking', info: t('onboarding.questions.doLateSnackingInfo', 'AI will design evening satiety protocols and dopamine-aligned alternatives') },
          { label: t('onboarding.questions.doMealPrep', 'No time for meal prep / relying on takeout'), value: 'meal_prep', info: t('onboarding.questions.doMealPrepInfo', 'Quick 15-min meal templates and smart restaurant ordering frameworks') },
          { label: t('onboarding.questions.doLowProtein', 'Under-eating protein during busy workdays'), value: 'low_protein', info: t('onboarding.questions.doLowProteinInfo', 'Protein-first structuring of every meal and snack') },
          { label: t('onboarding.questions.doSocial', 'Social eating and weekend alcohol consumption'), value: 'social', info: t('onboarding.questions.doSocialInfo', 'Flexible eating strategies and damage-control protocols for social events') },
          { label: t('onboarding.questions.doEmotional', 'Emotional eating linked to daily stress'), value: 'emotional', info: t('onboarding.questions.doEmotionalInfo', 'Behavioural triggers identification and mindful eating anchors') },
        ]
      }]
    });

    groups.push({
      id: 'dietingHistory',
      title: t('onboarding.groups.metabolicTitle', 'Metabolic Profile'),
      questions: [{
        id: 'dietingHistory',
        question: t('onboarding.questions.dietingHistory', 'Dieting & weight history'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.dhFirstTime', 'First time attempting body recomposition'), value: 'first_time', info: t('onboarding.questions.dhFirstTimeInfo', 'Clean slate — we build solid foundations with no conflicting habits') },
          { label: t('onboarding.questions.dhYoYo', 'Yo-yo dieting history (lose & gain back)'), value: 'yo_yo', info: t('onboarding.questions.dhYoYoInfo', 'Metabolic repair phase first — diet breaks and reverse dieting protocols') },
          { label: t('onboarding.questions.dhChronic', 'Chronic calorie restriction / slow metabolic adaptation'), value: 'chronic_restriction', info: t('onboarding.questions.dhChronicInfo', 'Gradual reverse diet to restore metabolic rate before deficit phase') },
          { label: t('onboarding.questions.dhAthlete', 'Consistent athletic performance baseline'), value: 'athletic_baseline', info: t('onboarding.questions.dhAthleteInfo', 'Periodised nutrition cycling matched to training blocks') },
        ]
      }]
    });

    groups.push({
      id: 'equipmentAccess',
      title: t('onboarding.groups.metabolicTitle', 'Metabolic Profile'),
      questions: [{
        id: 'equipmentAccess',
        question: t('onboarding.questions.equipmentAccess', 'Training equipment & access'),
        type: 'select_with_info',
        hasInfo: true,
        options: [
          { label: t('onboarding.questions.eaGym', 'Commercial Gym — Full equipment'), value: 'commercial_gym', info: t('onboarding.questions.eaGymInfo', 'Barbell racks, cables, machines, and full free-weight suite') },
          { label: t('onboarding.questions.eaHomeGym', 'Home Gym — Basic setup'), value: 'home_gym', info: t('onboarding.questions.eaHomeGymInfo', 'Dumbbells, bench, pull-up bar, and resistance bands') },
          { label: t('onboarding.questions.eaCalisthenics', 'Calisthenics & Bodyweight Only'), value: 'calisthenics', info: t('onboarding.questions.eaCalisthenicsInfo', 'Zero equipment — gravity and progressive skill-based resistance') },
          { label: t('onboarding.questions.eaMinimalist', 'Minimalist / Travel Setup'), value: 'minimalist', info: t('onboarding.questions.eaMinimalistInfo', 'Resistance bands, suspension trainers, and hotel-friendly protocols') },
        ]
      }]
    });

    groups.push({
      id: 'physicalLimitations',
      title: t('onboarding.groups.metabolicTitle', 'Metabolic Profile'),
      questions: [{
        id: 'physicalLimitations',
        question: t('onboarding.questions.physicalLimitations', 'Joint discomfort & mobility restrictions (Select all that apply)'),
        type: 'multiselect',
        options: [
          { label: t('onboarding.questions.plBack', 'Lower back sensitivity'), value: 'lower_back' },
          { label: t('onboarding.questions.plKnee', 'Knee pain during deep squats or running'), value: 'knee_pain' },
          { label: t('onboarding.questions.plShoulder', 'Shoulder impingement or wrist tightness'), value: 'shoulder_wrist' },
          { label: t('onboarding.questions.plNone', 'None — 100% pain-free movement'), value: 'none' },
        ]
      }]
    });
  }

  // Final 12-month milestone goal
  groups.push({
    id: 'goal',
    title: t('onboarding.groups.visionTitle', 'Vision'),
    questions: [{ id: 'goal', question: t('onboarding.questions.milestone', 'What is your single biggest health goal for the next 12 months?'), type: 'text', placeholder: t('onboarding.questions.milestonePlaceholder', 'e.g., Run a half marathon, drop 5kg fat, sleep 8h consistently...') }]
  });

  return groups;
};

// Transition toasts — shown inline via Toast component (no Modal)
// Defined as a function so it can use the t() translation function
const getTransitionMessages = (t: (key: string, fallback: string) => string): { [key: string]: { title: string; subtitle: string; emoji: string } } => ({
  'commitment': { title: t('onboarding.transition.goalSet', 'Goal Set!'), subtitle: t('onboarding.transition.calibrating', "We're calibrating your targets..."), emoji: "🎯" },
  'motivation': { title: t('onboarding.transition.understood', 'Understood.'), subtitle: t('onboarding.transition.mentalFramework', 'Building your mental framework...'), emoji: "🧠" },
  'nutritionPreference': { title: t('onboarding.transition.almostThere', 'Almost there!'), subtitle: t('onboarding.transition.nutritionPlan', 'Designing your nutrition plan...'), emoji: "🥗" },
});

// ── CalibrationCounter: uses addListener to show integer % values ──────────
// The Animated.Text interpolation approach renders raw float values like
// 51.4002384... This component instead reads the animated value via a listener
// and rounds it to show clean 0-100 integers.
function CalibrationCounter({ animValue, color }: { animValue: Animated.Value; color: string }) {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const id = animValue.addListener(({ value }) => setPct(Math.round(value)));
    return () => animValue.removeListener(id);
  }, [animValue]);
  return (
    <Text style={{ fontSize: 36, fontWeight: '900', color }}>
      {pct}%
    </Text>
  );
}

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
  const { user: clerkUser } = useUser();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ focus?: string }>();
  const initialFocus = (params.focus && ['fitness', 'mental_health', 'hormonal', 'holistic'].includes(params.focus))
    ? params.focus
    : (pendingPrimaryFocus && ['fitness', 'mental_health', 'hormonal', 'holistic'].includes(pendingPrimaryFocus))
      ? pendingPrimaryFocus
      : undefined;

  const { applyPreset } = useActiveTools();

  const onboardUser = useMutation(api.onboarding.onboardUser);
  const updateUser = useMutation(api.users.updateUser);
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');

  // State
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentWelcomeSlide, setCurrentWelcomeSlide] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({
    age: 25,
    height: 165,
    weight: 65,
    targetWeight: 60,
    sleepHours: 7,
    ...(initialFocus ? { primaryFocus: initialFocus } : {}),
  });
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [units, setUnits] = useState<{ weight: string; height: string; volume: string }>({ weight: 'kg', height: 'cm', volume: 'ml' });
  const [showResults, setShowResults] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShownRecompAlert, setHasShownRecompAlert] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  // ── Calibration Interstitial ───────────────────────────────────────────
  const [showCalibration, setShowCalibration] = useState(false);
  const calibrationProgress = useRef(new Animated.Value(0)).current;
  const calibrationCounter = useRef(new Animated.Value(0)).current;
  const calibrationRotation = useRef(new Animated.Value(0)).current;

  const CALIBRATION_STEPS = [
    'Calibrating metabolic profile & biometric baseline...',
    'Mapping hormonal rhythms & recovery pathways...',
    'Synthesizing custom 28-day performance architecture...',
    'Protocol 100% complete.',
  ];
  const [calibrationStepIdx, setCalibrationStepIdx] = useState(0);

  // Anti-cascading lock for auto-advance questions
  const isAdvancingRef = useRef(false);
  const lastAdvanceTimeRef = useRef(0);

  // Theme picker on welcome slide 3
  const { theme: activeTheme, setTheme: setActiveTheme, colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [pendingThemePick, setPendingThemePick] = useState<ThemeKey | null>(null);

  const STEP_GROUPS = React.useMemo(() => {
    const baseGroups = getStepGroups(t, answers.primaryFocus);
    const gender = answers.gender;
    const lifestyleIndex = baseGroups.findIndex(g => g.id === 'sleepHours');

    if (gender === 'female' && answers.primaryFocus !== 'mental_health') {
      const womensGroups: StepGroup[] = [
        {
          id: 'lifeStage',
          title: t('onboarding.groups.womensHealthTitle', "Women's Health"),
          description: t('onboarding.groups.womensHealthDesc', "Hormonal & cycle health profile optimization"),
          questions: [{
            id: 'lifeStage',
            question: t('onboarding.questions.lifeStage', 'What is your current life stage?'),
            type: 'select',
            options: [
              { label: t('womensHealth.stage.cycle', 'Menstruating / Cycle'), value: 'cycle' },
              { label: t('womensHealth.stage.pregnancy', 'Pregnancy'), value: 'pregnancy' },
              { label: t('womensHealth.stage.postpartum', 'Postpartum'), value: 'postpartum' },
              { label: t('womensHealth.stage.menopause', 'Menopause / Post-menopause'), value: 'menopause' },
            ]
          }]
        },
        {
          id: 'womensMainFocus',
          title: t('onboarding.groups.womensHealthTitle', "Women's Health"),
          questions: [{
            id: 'womensMainFocus',
            question: t('womensHealth.questions.mainFocus', 'What is your main focus right now?'),
            type: 'select',
            options: [
              { value: 'cycle_health',     label: t('womensHealth.focus.cycle', 'Cycle health & regularity'), icon: '🔄' },
              { value: 'fertility',        label: t('womensHealth.focus.fertility', 'Fertility & conception'),    icon: '🤱' },
              { value: 'perimenopause',    label: t('womensHealth.focus.perimenopause', 'Perimenopause symptoms'),    icon: '🌡️' },
              { value: 'energy',           label: t('womensHealth.focus.energy', 'Hormonal energy & mood'),   icon: '⚡' },
              { value: 'skin_hormones',    label: t('womensHealth.focus.skin', 'Skin & hormonal acne'),     icon: '✨' },
              { value: 'weight_hormones',  label: t('womensHealth.focus.weight', 'Hormonal weight balance'),  icon: '⚖️' },
            ],
          }]
        },
        {
          id: 'cycleRegularity',
          title: t('onboarding.groups.womensHealthTitle', "Women's Health"),
          questions: [{
            id: 'cycleRegularity',
            question: t('womensHealth.questions.cycleRegularity', 'How would you describe your cycle?'),
            type: 'select',
            options: [
              { value: 'regular',   label: t('womensHealth.regularity.regular', 'Regular (24–35 day cycle)'), icon: '✅' },
              { value: 'irregular', label: t('womensHealth.regularity.irregular', 'Irregular / unpredictable'),  icon: '🌊' },
              { value: 'unknown',   label: t('womensHealth.regularity.unknown', 'I\'m not sure'),              icon: '❓' },
            ],
          }]
        },
        {
          id: 'periodPain',
          title: t('onboarding.groups.womensHealthTitle', "Women's Health"),
          questions: [{
            id: 'periodPain',
            question: t('womensHealth.questions.periodPain', 'How is your period pain?'),
            type: 'select',
            options: [
              { value: 'none',     label: t('womensHealth.pain.none', 'None — pain-free'),       icon: '😊' },
              { value: 'mild',     label: t('womensHealth.pain.mild', 'Mild — manageable'),      icon: '🟡' },
              { value: 'moderate', label: t('womensHealth.pain.moderate', 'Moderate — disruptive'),  icon: '🟠' },
              { value: 'severe',   label: t('womensHealth.pain.severe', 'Severe — debilitating'),  icon: '🔴' },
            ],
          }]
        },
        {
          id: 'birthControl',
          title: t('onboarding.groups.womensHealthTitle', "Women's Health"),
          questions: [{
            id: 'birthControl',
            question: t('womensHealth.questions.birthControl', 'Are you using hormonal birth control?'),
            type: 'select',
            options: [
              { value: 'none',    label: t('womensHealth.bc.none', 'No — not using any'),   icon: '🌿' },
              { value: 'pill',    label: t('womensHealth.bc.pill', 'Combined / mini pill'),  icon: '💊' },
              { value: 'iud',     label: t('womensHealth.bc.iud', 'IUD (hormonal)'),        icon: '🔩' },
              { value: 'implant', label: t('womensHealth.bc.implant', 'Implant / injection'),   icon: '💉' },
              { value: 'other',   label: t('womensHealth.bc.other', 'Other method'),          icon: '📋' },
            ],
          }]
        }
      ];
      const copy = [...baseGroups];
      if (lifestyleIndex !== -1) {
        copy.splice(lifestyleIndex, 0, ...womensGroups);
      } else {
        copy.push(...womensGroups);
      }
      return copy;
    } else if (gender === 'male' && answers.primaryFocus !== 'mental_health') {
      const mensGroups: StepGroup[] = [
        {
          id: 'trainingMode',
          title: t('onboarding.groups.mensHealthTitle', "Men's Health"),
          description: t('onboarding.groups.mensHealthDesc', "Training style, experience & goal optimization"),
          questions: [{
            id: 'trainingMode',
            question: t('mensHealth.questions.trainingMode', 'How would you describe your training approach?'),
            type: 'select',
            options: [
              { value: 'natural', label: t('mensHealth.modes.natural', 'Natural Athlete'), icon: '🌿' },
              { value: 'enhanced', label: t('mensHealth.modes.enhanced', 'Enhanced / PED User'), icon: '💉' },
              { value: 'athlete', label: t('mensHealth.modes.athlete', 'Competitive Athlete'), icon: '🏆' },
            ],
          }]
        },
        {
          id: 'yearsTraining',
          title: t('onboarding.groups.mensHealthTitle', "Men's Health"),
          questions: [{
            id: 'yearsTraining',
            question: t('mensHealth.questions.yearsTraining', 'How long have you been training seriously?'),
            type: 'select',
            options: [
              { value: 'beginner', label: t('mensHealth.years.beginner', 'Under 1 year'), icon: '🌱' },
              { value: 'intermediate', label: t('mensHealth.years.intermediate', '1–3 years'), icon: '📈' },
              { value: 'advanced', label: t('mensHealth.years.advanced', '3–7 years'), icon: '🔥' },
              { value: 'veteran', label: t('mensHealth.years.veteran', '7+ years'), icon: '🏆' },
            ],
          }]
        },
        {
          id: 'competitionFocus',
          title: t('onboarding.groups.mensHealthTitle', "Men's Health"),
          questions: [{
            id: 'competitionFocus',
            question: t('mensHealth.questions.competitionFocus', 'Do you compete or plan to?'),
            type: 'select',
            options: [
              { value: 'none', label: t('mensHealth.comp.none', 'No — training for myself'), icon: '🧘' },
              { value: 'bodybuilding', label: t('mensHealth.comp.bodybuilding', 'Bodybuilding / Physique'), icon: '💎' },
              { value: 'powerlifting', label: t('mensHealth.comp.powerlifting', 'Powerlifting / Strongman'), icon: '🏋️' },
              { value: 'crossfit', label: t('mensHealth.comp.crossfit', 'CrossFit / Functional'), icon: '⚡' },
              { value: 'sport', label: t('mensHealth.comp.sport', 'Team / Combat Sport'), icon: '🥊' },
            ],
          }]
        }
      ];

      // For Peak Biology male users — add androgen / testosterone signal questions
      const maleHormonalGroups: StepGroup[] = answers.primaryFocus === 'hormonal' ? [
        {
          id: 'pmsSeverityPattern', // reusing field id for male analogue symptoms
          title: t('onboarding.groups.hormonalTitle', 'Peak Biology'),
          questions: [{
            id: 'pmsSeverityPattern',
            question: t('onboarding.questions.maleHormonalSymptoms', 'Which symptoms do you experience? (Select all that apply)'),
            type: 'multiselect',
            options: [
              { label: t('onboarding.questions.mhsLibido', 'Low libido or drive'), value: 'low_libido' },
              { label: t('onboarding.questions.mhsFatigue', 'Persistent fatigue despite sleep'), value: 'fatigue' },
              { label: t('onboarding.questions.mhsMood', 'Mood swings, irritability or low motivation'), value: 'mood_swings' },
              { label: t('onboarding.questions.mhsFog', 'Brain fog or difficulty concentrating'), value: 'brain_fog' },
              { label: t('onboarding.questions.mhsBodyComp', 'Fat gain, muscle loss without change in habits'), value: 'body_comp_change' },
              { label: t('onboarding.questions.mhsSleep', 'Poor sleep quality or night sweats'), value: 'poor_sleep' },
            ]
          }]
        }
      ] : [];

      const copy = [...baseGroups];
      const insertAt = lifestyleIndex !== -1 ? lifestyleIndex : copy.length;
      copy.splice(insertAt, 0, ...mensGroups, ...maleHormonalGroups);
      return copy;
    }
    return baseGroups;
  }, [t, answers.gender, answers.primaryFocus]);

  const LANG_OPTIONS = [
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'nl', flag: '🇳🇱', label: 'NL' },
    { code: 'bg', flag: '🇧🇬', label: 'BG' },
    { code: 'da', flag: '🇩🇰', label: 'DA' },
    { code: 'el', flag: '🇬🇷', label: 'EL' },
    { code: 'lt', flag: '🇱🇹', label: 'LT' },
    { code: 'lv', flag: '🇱🇻', label: 'LV' },
    { code: 'no', flag: '🇳🇴', label: 'NO' },
    { code: 'pl', flag: '🇵🇱', label: 'PL' },
    { code: 'ro', flag: '🇷🇴', label: 'RO' },
    { code: 'sv', flag: '🇸🇪', label: 'SV' },
    { code: 'tr', flag: '🇹🇷', label: 'TR' },
  ];

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    i18n.changeLanguage(code);
    SecureStore.setItemAsync('app_language', code).catch(() => null);
    setShowLangPicker(false);
  };

  const currentLangOption = LANG_OPTIONS.find(l => l.code === currentLang) || LANG_OPTIONS[0];

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
      const nextSlide = currentWelcomeSlide + 1;
      slidesRef.current?.scrollToIndex({ index: nextSlide, animated: true });
      setCurrentWelcomeSlide(nextSlide);
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
    const transition = getTransitionMessages(t)[currentGroup.id];
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
      const w = parseFloat(answers.weight) || 65;
      const weightKg = units.weight === 'kg' ? w : w * 0.453592;
      const heightCm = parseFloat(answers.height) || 165;
      const age = parseFloat(answers.age) || 25;
      const gender = (answers.gender as 'male' | 'female') || 'female';
      const weeklyTime = answers.timeAvailable ? parseFloat(answers.timeAvailable) : 3;
      const mealsCount = answers.mealFrequency ? parseFloat(answers.mealFrequency) : 3;
      const parsedWeeklyTime = isNaN(weeklyTime) ? 3 : weeklyTime;
      const parsedMealsCount = isNaN(mealsCount) ? 3 : mealsCount;

      const dataToSave = {
        name: clerkUser?.firstName ?? 'User',
        age,
        biologicalSex: gender || 'female',
        weight: weightKg,
        height: heightCm,
        targetWeight: answers.targetWeight
          ? (units.weight === 'kg' ? parseFloat(answers.targetWeight) : parseFloat(answers.targetWeight) * 0.453592)
          : undefined,
        fitnessGoal: answers.fitnessGoal || 'general_health',
        fitnessExperience: answers.experience || 'intermediate',
        workoutPreference: answers.workoutPreference || 'mixed',
        weeklyWorkoutTime: parsedWeeklyTime,
        activityLevel: answers.activityLevel || 'moderately_active',
        nutritionApproach: answers.nutritionPreference || 'balanced',
        mealsPerDay: parsedMealsCount,
        peakEnergy: answers.peakEnergy,
        sleepHours: parseFloat(answers.sleepHours?.toString() || '7'),
        stressLevel: answers.stressLevel || 'moderate',
        lifeStressor: answers.lifeStressor,
        motivations: answers.motivation || [],
        challenges: answers.challenges || [],
        coachingStyle: answers.coachingStyle,
        commitmentLevel: answers.commitmentLevel,
        preferredUnits: { weight: units.weight, height: units.height, volume: units.volume || 'ml' },
        preferredLanguage: currentLang,
        primaryFocus: (answers.primaryFocus as PrimaryFocus) || 'holistic',
        twelveMonthGoal: answers.goal,
        // ── Mental Health Branch ───────────────────────────────────────────
        mindfulnessGoal: answers.mindfulnessGoal,
        meditationExperience: answers.meditationExperience,
        peakFocusWindow: answers.peakFocusWindow,
        screenTimeRisk: answers.screenTimeRisk,
        stressSymptomType: answers.stressSymptomType,
        preferredResetTool: answers.preferredResetTool,
        eveningRoutine: answers.eveningRoutine,
        // ── Hormonal Branch ───────────────────────────────────────────────
        pmsSeverityPattern: answers.pmsSeverityPattern,
        energyCrashPattern: answers.energyCrashPattern,
        dailyHydration: answers.dailyHydration,
        bloodSugarStability: answers.bloodSugarStability,
        // ── Fitness / Holistic Branch ──────────────────────────────────────
        dietaryObstacle: answers.dietaryObstacle,
        dietingHistory: answers.dietingHistory,
        equipmentAccess: answers.equipmentAccess,
        physicalLimitations: answers.physicalLimitations,
      };

      // ── Apply workspace preset based on focus ────────────────────────────
      await applyPreset((answers.primaryFocus as PrimaryFocus) || 'holistic', gender);

      // ── Set the flag BEFORE the mutation fires ────────────────────────────
      // _layout.tsx will read this synchronously when convexUser.age updates.
      setPendingRouteAfterOnboarding('/premium');

      await onboardUser({ clerkId: clerkUser!.id, ...dataToSave as any });

      if (gender === 'female') {
        const womensProfileObj = {
          mainFocus: answers.womensMainFocus || 'cycle_health',
          cycleRegularity: answers.cycleRegularity || 'regular',
          periodPain: answers.periodPain || 'none',
          birthControl: answers.birthControl || 'none',
          lastPeriodDate: '',
          conceptionDate: '',
        };
        await SecureStore.setItemAsync('bluom_womens_quiz_v1', JSON.stringify(womensProfileObj)).catch(() => {});
        if (convexUser?._id) {
          await updateUser({
            userId: convexUser._id,
            updates: { lifeStage: answers.lifeStage || 'cycle' }
          }).catch((err) => console.error("Failed to update lifeStage in convex:", err));
        }
      } else if (gender === 'male') {
        let mappedGoal = 'muscle';
        const fg = answers.fitnessGoal;
        if (fg === 'lose_weight') mappedGoal = 'fat_loss';
        else if (fg === 'build_muscle') mappedGoal = 'muscle';
        else if (fg === 'improve_endurance') mappedGoal = 'performance';
        else if (fg === 'general_health' || fg === 'maintain') mappedGoal = 'longevity';
        else if (fg === 'body_recomp') mappedGoal = 'recomp';

        const mensProfileObj = {
          trainingMode: answers.trainingMode || 'natural',
          primaryGoal: mappedGoal,
          yearsTraining: answers.yearsTraining || 'beginner',
          competitionFocus: answers.competitionFocus || 'none',
        };
        await SecureStore.setItemAsync('bluom_mens_quiz_v1', JSON.stringify(mensProfileObj)).catch(() => {});
      }

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
          placeholderTextColor={themeColors.textMuted}
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
                  style={[styles.optionText, isSelected && { color: themeColors.primary, fontWeight: '700' }]}
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
                      <Info size={18} color={isSelected ? themeColors.primary : themeColors.textMuted} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <Check size={12} color={themeColors.onPrimary} />}
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
                style={[styles.chip, isSelected && { borderColor: themeColors.primary, backgroundColor: themeColors.surfaceMuted, borderWidth: 1 }]}
                onPress={() => {
                  if (isSelected) handleAnswer(q.id, selected.filter(s => s !== value));
                  else handleAnswer(q.id, [...selected, value]);
                }}
              >
                <Text style={[styles.chipText, isSelected && { color: themeColors.primary, fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (q.type === 'number_with_units') {
      const unit = q.id.toLowerCase().includes('weight') ? units.weight : q.id.toLowerCase().includes('height') ? units.height : '';
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

    if (q.type === 'scroll_wheel') {
      const isWeight = q.id.toLowerCase().includes('weight');
      const isHeight = q.id.toLowerCase().includes('height');
      const currentUnit = isWeight ? units.weight : isHeight ? units.height : (q.suffix || '');
      const unitOpts = isWeight ? ['kg', 'lbs'] : isHeight ? ['cm', 'ft'] : undefined;
      // Weight: kg 30-200, lbs 70-440. Height: cm 120-230, ft shown as inches 48-84 (4ft–7ft)
      const minVal = isWeight
        ? (units.weight === 'lbs' ? 70 : 30)
        : isHeight
          ? (units.height === 'ft' ? 48 : 120)
          : (q.min || 0);
      const maxVal = isWeight
        ? (units.weight === 'lbs' ? 440 : 200)
        : isHeight
          ? (units.height === 'ft' ? 84 : 230)
          : (q.max || 100);
      const heightSuffix = isHeight && units.height === 'ft' ? 'in' : currentUnit;
      const numVal = parseFloat(val) || minVal;
      return (
        <ScrollWheelPicker
          min={minVal}
          max={maxVal}
          value={numVal}
          onChange={(v) => handleAnswer(q.id, v.toString())}
          suffix={isHeight ? heightSuffix : currentUnit}
          unitToggle={unitOpts && currentUnit ? {
            options: unitOpts,
            selected: currentUnit,
            onToggle: (u) => {
              if (isWeight) {
                setUnits(prev => ({ ...prev, weight: u }));
                setUnitSystem(u === 'kg' ? 'metric' : 'imperial');
              } else if (isHeight) {
                setUnits(prev => ({ ...prev, height: u }));
                setUnitSystem(u === 'cm' ? 'metric' : 'imperial');
                // Reset height answer when switching units to avoid showing 185cm as 185ft
                handleAnswer(q.id, '');
              }
            }
          } : undefined}
        />
      );
    }

    if (q.type === 'horizontal_ruler') {
      const isWeight = q.id.toLowerCase().includes('weight');
      const currentUnit = isWeight ? units.weight : (q.suffix || '');
      const unitOpts = isWeight ? ['kg', 'lbs'] : undefined;
      const minVal = isWeight ? (units.weight === 'lbs' ? 70 : 30) : (q.min || 0);
      const maxVal = isWeight ? (units.weight === 'lbs' ? 440 : 200) : (q.max || 200);
      const numVal = parseFloat(val) || (isWeight ? (units.weight === 'lbs' ? 150 : 65) : q.min || 0);
      return (
        <HorizontalRulerPicker
          min={minVal}
          max={maxVal}
          value={numVal}
          onChange={(v) => handleAnswer(q.id, v.toString())}
          suffix={currentUnit}
          unitToggle={unitOpts && currentUnit ? {
            options: unitOpts,
            selected: currentUnit,
            onToggle: (u) => {
              setUnits(prev => ({ ...prev, weight: u }));
              setUnitSystem(u === 'kg' ? 'metric' : 'imperial');
            }
          } : undefined}
        />
      );
    }

    if (q.type === 'stepped_slider') {
      const steps = q.sliderSteps || [];
      const selectedIdx = steps.findIndex(s => s.value === val);
      return (
        <SteppedSlider
          steps={steps}
          selectedIndex={selectedIdx >= 0 ? selectedIdx : 0}
          onChange={(idx) => handleAnswer(q.id, steps[idx].value)}
        />
      );
    }

    return null;
  };

  const renderEstimator = () => (
    <Modal visible={showEstimator} animationType="slide">
      <SafeAreaView style={styles.fullscreen}>
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
            <ChevronRight size={20} color={themeColors.onPrimary} />
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

    const isMental = answers.primaryFocus === 'mental_health';
    const isHormonal = answers.primaryFocus === 'hormonal';

    return (
      <Modal visible={showResults} animationType="slide">
        <SafeAreaView style={styles.resultsContainer}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
            <Text style={styles.resultsHeader}>{t('onboarding.results.title', 'Your Blueprint')}</Text>
            <Text style={styles.resultsSub}>{t('onboarding.results.subtitle', 'Your personalised plan across 3 pillars.')}</Text>

            {/* ── Dynamic Pillar 1 ── */}
            {isMental ? (
              <PillarCard emoji="🧠" title={t('onboarding.results.mentalPillar', 'Mental Health')} color="#059669">
                <View style={styles.pillarCalRow}>
                  <Text style={[styles.pillarCalVal, { fontSize: 22, color: '#059669' }]}>Cognitive Architecture</Text>
                </View>
                <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 72 }}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                    <Lock size={14} color={themeColors.text} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                  </View>
                </View>
              </PillarCard>
            ) : isHormonal ? (
              <PillarCard emoji="🔬" title={t('onboarding.results.biologyPillar', 'Peak Biology')} color="#ec4899">
                <View style={styles.pillarCalRow}>
                  <Text style={[styles.pillarCalVal, { fontSize: 22, color: '#ec4899' }]}>Circadian Rhythm</Text>
                </View>
                <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 72 }}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                    <Lock size={14} color={themeColors.text} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                  </View>
                </View>
              </PillarCard>
            ) : (
              <PillarCard emoji="🥗" title={t('onboarding.results.nutritionPillar', 'Nutrition')} color="#2563eb">
                <View style={styles.pillarCalRow}>
                  <Text style={styles.pillarCalVal}>{calculatedResults?.dailyCalories}</Text>
                  <Text style={styles.pillarCalLabel}>{t('onboarding.results.kcalDay', 'kcal / day')}</Text>
                </View>
                <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 72 }}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                    <Lock size={14} color={themeColors.text} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                  </View>
                </View>
              </PillarCard>
            )}

            {/* ── Dynamic Pillar 2 ── */}
            {isMental ? (
              <PillarCard emoji="😴" title={t('onboarding.results.sleepPillar', 'Recovery')} color="#4f46e5">
                <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 160 }}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                    <Lock size={14} color={themeColors.text} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                  </View>
                </View>
              </PillarCard>
            ) : (
              <PillarCard emoji="🏋️" title={t('onboarding.results.fitnessPillar', 'Fitness')} color="#7c3aed">
                {isHormonal ? (
                  <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 160 }}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                      <Lock size={14} color={themeColors.text} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 160 }}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                      <Lock size={14} color={themeColors.text} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                    </View>
                  </View>
                )}
              </PillarCard>
            )}

            {/* ── Dynamic Pillar 3 ── */}
            <PillarCard emoji={isMental ? '🧘' : isHormonal ? '🥗' : '🧠'} title={isMental ? 'Somatic Movement' : isHormonal ? t('onboarding.results.nutritionPillar', 'Nutrition') : t('onboarding.results.mentalPillar', 'Mental Health')} color={isMental ? '#0d9488' : isHormonal ? '#2563eb' : '#059669'}>
              {isHormonal ? (
                <>
                  <View style={styles.pillarCalRow}>
                    <Text style={styles.pillarCalVal}>{calculatedResults?.dailyCalories}</Text>
                    <Text style={styles.pillarCalLabel}>{t('onboarding.results.kcalDay', 'kcal / day')}</Text>
                  </View>
                  <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 72 }}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                      <Lock size={14} color={themeColors.text} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 160 }}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.surface, opacity: 1 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }]}>
                    <Lock size={14} color={themeColors.text} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.text }}>{t('onboarding.results.proInsights', 'PRO INSIGHTS')}</Text>
                  </View>
                </View>
              )}
            </PillarCard>
          </ScrollView>

          {/* Fixed footer button */}
          <View style={[styles.resultsFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                // Show calibration interstitial first, it calls handleFinalSubmit on complete
                setShowCalibration(true);
                setCalibrationStepIdx(0);
                calibrationProgress.setValue(0);
                calibrationCounter.setValue(0);
                calibrationRotation.setValue(0);

                // Rotate ring continuously
                Animated.loop(
                  Animated.timing(calibrationRotation, { toValue: 1, duration: 2000, useNativeDriver: true })
                ).start();

                // Animate progress fill & counter from 0→100 over 3.6s
                Animated.parallel([
                  Animated.timing(calibrationProgress, { toValue: 1, duration: 3600, useNativeDriver: false }),
                  Animated.timing(calibrationCounter, { toValue: 100, duration: 3600, useNativeDriver: false }),
                ]).start();

                // Cycle step text every 900ms
                let step = 0;
                const stepInterval = setInterval(() => {
                  step += 1;
                  if (step < 4) setCalibrationStepIdx(step);
                  else clearInterval(stepInterval);
                }, 900);

                // After 3.6s, run the actual submit
                setTimeout(() => {
                  handleFinalSubmit();
                }, 3600);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color={themeColors.onPrimary} />
                : <Text style={styles.primaryBtnText}>{t('onboarding.results.continueToPlan', 'Continue to Plan')}</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ── Calibration Interstitial ─────────────────────────────────────────────
  const renderCalibration = () => {
    const spin = calibrationRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const ringSize = 180;
    const strokeWidth = 8;
    const radius = (ringSize - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
      <Modal visible={showCalibration} animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: themeColors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

          {/* Rotating Halo Ring */}
          <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            {/* Static track */}
            <View style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: themeColors.surfaceMuted,
            }} />

            {/* Animated rotating arc */}
            <Animated.View style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: strokeWidth,
              borderColor: themeColors.primary,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: spin }],
            }} />

            {/* Integer % counter in center — must use listener to avoid decimal overflow */}
            <CalibrationCounter animValue={calibrationCounter} color={themeColors.primary} />
          </View>

          {/* BLÜOM wordmark or spark icon */}
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: themeColors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Sparkles size={24} color={themeColors.primary} />
          </View>

          {/* Dynamic step label */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: themeColors.primary, marginBottom: 12, textAlign: 'center', letterSpacing: 0.3 }}>
            {t('onboarding.calibration.title', 'Building Your Protocol')}
          </Text>
          <Text style={{ fontSize: 13, color: themeColors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
            {CALIBRATION_STEPS[calibrationStepIdx]}
          </Text>

          {/* Animated progress bar */}
          <View style={{ width: '100%', height: 4, backgroundColor: themeColors.surfaceMuted, borderRadius: 2, marginTop: 40, overflow: 'hidden' }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: themeColors.primary,
              borderRadius: 2,
              width: calibrationProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }} />
          </View>
        </View>
      </Modal>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────

  const SCREEN_WIDTH = Dimensions.get('window').width;

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      {showWelcome ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'bottom']}>
          {/* ── Top Header with Logo and Language Selector ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
            <Image source={THEMES[activeTheme]?.logo || THEMES['default'].logo} style={{ width: 120, height: 32 }} resizeMode="contain" />
            <TouchableOpacity
              onPress={() => setShowLangPicker(v => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: themeColors.surface,
                borderWidth: 1,
                borderColor: themeColors.border,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                gap: 6,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{currentLangOption.flag}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.text }}>{currentLangOption.label}</Text>
              <Ionicons name="chevron-down" size={12} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Language Selector Dropdown Modal/Popup */}
          {showLangPicker && (
            <View style={{ position: 'absolute', top: insets.top + 48, right: 24, zIndex: 1000, backgroundColor: themeColors.surface, borderWidth: 1, borderColor: themeColors.border, borderRadius: 16, padding: 6, maxHeight: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {LANG_OPTIONS.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, currentLang === lang.code && { backgroundColor: themeColors.surfaceMuted }]}
                    onPress={() => handleLangChange(lang.code)}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langCode, currentLang === lang.code && { color: themeColors.primary, fontWeight: '800' }]}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Swipeable Welcome Slides ── */}
          <FlatList
            ref={slidesRef}
            data={[0, 1, 2]}
            keyExtractor={item => item.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentWelcomeSlide(idx);
            }}
            renderItem={({ item: slideIndex }) => (
              <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20, justifyContent: 'center', flex: 1 }}>
                <View style={{
                  backgroundColor: themeColors.surface,
                  borderRadius: 24,
                  paddingHorizontal: 20,
                  paddingVertical: 20,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                  alignItems: 'center',
                }}>
                  {slideIndex === 0 && (
                    <>
                      <View style={[styles.iconCircle, { marginBottom: 12 }]}>
                        <Sparkles size={40} color={themeColors.primary} />
                      </View>
                      <Text style={styles.welcomeTitle}>{t('onboarding.welcome.slide1Title', 'Your Life, Optimized.')}</Text>
                      <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.slide1Sub', 'AI Life Management')}</Text>
                      <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide1Desc', 'Welcome to Bluom. The only system that integrates your Nutrition, Movement, and Mind into one seamless flow.')}</Text>
                    </>
                  )}
                  {slideIndex === 1 && (
                    <>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <View style={[styles.compactPillarPill, { backgroundColor: themeColors.surfaceMuted, borderColor: themeColors.border }]}>
                          <Ionicons name="sunny" size={14} color={themeColors.primary} />
                          <Text style={[styles.compactPillarText, { color: themeColors.text }]}>{t('onboarding.welcome.pillarNutrition', 'Nutrition')}</Text>
                        </View>
                        <View style={[styles.compactPillarPill, { backgroundColor: themeColors.surfaceMuted, borderColor: themeColors.border }]}>
                          <Ionicons name="barbell" size={14} color={themeColors.primary} />
                          <Text style={[styles.compactPillarText, { color: themeColors.text }]}>{t('onboarding.welcome.pillarMove', 'Treino')}</Text>
                        </View>
                        <View style={[styles.compactPillarPill, { backgroundColor: themeColors.surfaceMuted, borderColor: themeColors.border }]}>
                          <Ionicons name="leaf" size={14} color={themeColors.primary} />
                          <Text style={[styles.compactPillarText, { color: themeColors.text }]}>{t('onboarding.welcome.pillarMind', 'Mind')}</Text>
                        </View>
                      </View>
                      <Text style={styles.welcomeTitle}>{t('onboarding.welcome.slide2Title', 'A Complete Ecosystem')}</Text>
                      <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.slide2Sub', 'Beyond the Pillars')}</Text>
                      <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide2Desc', "Includes specialized protocols for Men & Women's health, Productivity architecture, and Mindset & Meditation.")}</Text>
                    </>
                  )}
                  {slideIndex === 2 && (
                    <>
                      <View style={[styles.iconCircle, { marginBottom: 10 }]}>
                        <Sparkles size={38} color={themeColors.primary} />
                      </View>
                      <Text style={styles.welcomeTitle}>{t('onboarding.welcome.slide3Title', 'Your Blueprint')}</Text>
                      <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.slide3Sub', 'Ready to Evolve?')}</Text>
                      <Text style={styles.welcomeDesc}>{t('onboarding.welcome.slide3Desc', 'Answer a few quick questions to get your custom nutrition plan and workout recommendations.')}</Text>

                      {/* ── Inline Theme Picker ─────────────────────────────── */}
                      <View style={styles.themePickerWrap}>
                        <Text style={styles.themePickerLabel}>
                          {t('onboarding.welcome.themePrompt', 'Which colour speaks to you?')}
                        </Text>
                        <View style={styles.themePickerRow}>
                          {THEME_ORDER.map((key) => {
                            const th = THEMES[key];
                            const isActive = activeTheme === key;
                            return (
                              <TouchableOpacity
                                key={key}
                                data-testid={`onboarding-theme-${key}`}
                                activeOpacity={0.85}
                                onPress={() => setPendingThemePick(key)}
                                style={[
                                  styles.themePickerSwatch,
                                  { backgroundColor: th.swatch },
                                  isActive && { borderColor: th.colors.primary, borderWidth: 3 },
                                ]}
                              >
                                {isActive && (
                                  <View style={[styles.themePickerCheck, { backgroundColor: th.colors.primary }]}>
                                    <Check size={10} color={th.colors.onPrimary} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}
          />

          {/* ── Fixed Bottom Actions ── */}
          <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 24, paddingBottom: Math.max(16, insets.bottom) }}>
            <View style={styles.dotsContainer}>
              {[0, 1, 2].map((idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    slidesRef.current?.scrollToIndex({ index: idx, animated: true });
                    setCurrentWelcomeSlide(idx);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[styles.dot, currentWelcomeSlide === idx && styles.activeDot]} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.welcomeBtn} onPress={handleWelcomeNext} activeOpacity={0.85}>
              <Text style={styles.welcomeBtnText}>
                {currentWelcomeSlide === 2 ? t('onboarding.welcome.letsGo', "Let's Go!") : t('onboarding.welcome.next', 'Next')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]} edges={['top']}>
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
          {renderCalibration()}

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} disabled={currentGroupIndex === 0}>
              <Ionicons name="chevron-back" size={24} color={currentGroupIndex === 0 ? themeColors.textMuted : themeColors.primary} />
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
              <ChevronRight size={20} color={themeColors.onPrimary} />
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* ── Theme confirmation popup (works on any slide) ────────────────── */}
      <Modal
        visible={pendingThemePick !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingThemePick(null)}
      >
        <View style={styles.themeConfirmOverlay}>
          <View style={styles.themeConfirmCard}>
            {pendingThemePick && (
              <>
                <View
                  style={[
                    styles.themeConfirmPreview,
                    { backgroundColor: THEMES[pendingThemePick].colors.bg },
                  ]}
                >
                  <View
                    style={[
                      styles.themeConfirmChip,
                      {
                        backgroundColor: THEMES[pendingThemePick].colors.surface,
                        borderColor: THEMES[pendingThemePick].colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.themeConfirmDot, { backgroundColor: THEMES[pendingThemePick].colors.primary }]} />
                    <View style={[styles.themeConfirmDot, { backgroundColor: THEMES[pendingThemePick].colors.accent }]} />
                  </View>
                </View>
                <Text style={styles.themeConfirmTitle}>
                  {t('onboarding.welcome.themeConfirmTitle', 'Set {{name}} as my theme?', { name: THEMES[pendingThemePick].label })}
                </Text>
                <Text style={styles.themeConfirmDesc}>
                  {t(
                    'onboarding.welcome.themeConfirmDesc',
                    'This will tint your whole experience. You can change it anytime in Settings.'
                  )}
                </Text>
                <View style={styles.themeConfirmActions}>
                  <TouchableOpacity
                    data-testid="onboarding-theme-cancel"
                    style={[styles.themeConfirmBtn, styles.themeConfirmBtnSecondary]}
                    onPress={() => setPendingThemePick(null)}
                  >
                    <Text style={styles.themeConfirmBtnSecondaryText}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    data-testid="onboarding-theme-confirm"
                    style={[
                      styles.themeConfirmBtn,
                      styles.themeConfirmBtnPrimary,
                      { backgroundColor: THEMES[pendingThemePick].colors.primary },
                    ]}
                    onPress={async () => {
                      const pick = pendingThemePick;
                      setPendingThemePick(null);
                      await setActiveTheme(pick);
                    }}
                  >
                    <Text
                      style={[
                        styles.themeConfirmBtnPrimaryText,
                        { color: THEMES[pendingThemePick].colors.onPrimary },
                      ]}
                    >
                      {t('onboarding.welcome.themeConfirmCta', 'Set as my theme')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: c.bg },
  container: { flex: 1, backgroundColor: c.bg },
  scrollContent: { padding: 24, paddingBottom: 100 },

  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: c.surfaceMuted },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, fontWeight: '600', color: c.primary, textAlign: 'center', marginBottom: 8 },
  welcomeDesc: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted },
  activeDot: { backgroundColor: c.primary, width: 20 },
  welcomeBtn: { backgroundColor: c.primary, width: '85%', maxWidth: 350, padding: 15, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  welcomeBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: 'bold' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16, backgroundColor: c.bg },
  progressTrack: { flex: 1, height: 6, backgroundColor: c.surfaceMuted, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: c.primary },
  unitToggleBtn: { backgroundColor: c.surfaceMuted, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  unitToggleText: { fontSize: 12, fontWeight: '800', color: c.primary },

  groupHeader: { marginBottom: 32 },
  groupTitle: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 8 },
  groupDesc: { fontSize: 16, color: c.textMuted },

  questionsList: { gap: 32 },
  questionBlock: {},
  qLabel: { fontSize: 18, fontWeight: '600', color: c.text, marginBottom: 4 },
  qSub: { fontSize: 14, color: c.textMuted, marginBottom: 16 },

  textInput: { backgroundColor: c.surface, padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: c.border, color: c.text, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  unitInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  unitLabel: { paddingHorizontal: 16, fontSize: 16, color: c.primary, fontWeight: '600', backgroundColor: c.surfaceMuted, height: '100%', textAlignVertical: 'center', paddingTop: 16 },

  optionsContainer: { gap: 10, marginTop: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: c.border },
  optionCardSelected: { borderColor: c.primary, borderWidth: 2, backgroundColor: c.surfaceMuted },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12, flexShrink: 0 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  radioCircleSelected: { borderColor: c.primary, backgroundColor: c.primary },
  pillarCard: { width: 100, height: 140, borderRadius: 16, borderWidth: 2, borderColor: c.primary, backgroundColor: c.surfaceMuted, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 4 },
  pillarText: { fontWeight: '700', fontSize: 14, color: c.primary },
  compactPillarPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  compactPillarText: { fontSize: 13, fontWeight: '700' },
  optionText: { flex: 1, fontSize: 16, color: c.text, fontWeight: '500' },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  chipText: { fontSize: 14, color: c.text, fontWeight: '600' },

  nextBtn: { marginTop: 40, backgroundColor: c.primary, padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: c.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  nextBtnText: { color: c.onPrimary, fontSize: 18, fontWeight: 'bold' },

  estimatorFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.bg, padding: 20, borderTopWidth: 1, borderTopColor: c.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },

  resultsContainer: { flex: 1, backgroundColor: c.bg },
  resultsHeader: { fontSize: 32, fontWeight: '900', color: c.text, marginBottom: 8, textAlign: 'center' },
  resultsSub: { fontSize: 16, color: c.textMuted, textAlign: 'center', marginBottom: 40 },
  macroCard: { alignItems: 'center', marginBottom: 40 },
  calorieCircle: { width: 220, height: 220, borderRadius: 110, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: c.primary, shadowColor: c.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  calorieVal: { fontSize: 56, fontWeight: '900', color: c.text },
  calorieLabel: { fontSize: 16, color: c.textMuted, fontWeight: '600', marginTop: 4 },

  proSection: { borderRadius: 24, overflow: 'hidden', height: 200, backgroundColor: c.surface, marginBottom: 40 },
  blurContainer: { flex: 1, padding: 30, justifyContent: 'center' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 28, fontWeight: 'bold', color: c.text, marginBottom: 8 },

  lockOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  proBadge: { backgroundColor: '#fbbf24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  proText: { fontSize: 12, fontWeight: '900', color: '#78350f' },
  lockText: { color: '#fff', textAlign: 'center', marginTop: 12, fontWeight: '600', fontSize: 15 },

  primaryBtn: { backgroundColor: c.primary, padding: 20, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: c.onPrimary, fontSize: 18, fontWeight: 'bold' },

  // Results footer
  resultsFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.bg, padding: 20, borderTopWidth: 1, borderTopColor: c.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },

  // 3-Pillar result cards
  pillarResultCard: { backgroundColor: c.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  pillarResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pillarResultTitle: { fontSize: 18, fontWeight: '800' },
  pillarCalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pillarCalVal: { fontSize: 40, fontWeight: '900', color: c.text },
  pillarCalLabel: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
  macroLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  planWeekRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  planWeekNum: { fontSize: 12, fontWeight: '900', color: '#7c3aed', width: 24 },
  planWeekLabel: { fontSize: 13, fontWeight: '600', color: c.text },

  // Language FAB
  langFab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  langFabFlag: { fontSize: 24 },
  langPickerPopup: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
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
  langOptionActive: { backgroundColor: c.surfaceMuted },
  langFlag: { fontSize: 18 },
  langCode: { fontSize: 13, fontWeight: '600', color: c.text },

  // Theme picker (welcome slide 3)
  themePickerWrap: { marginTop: 20, alignItems: 'center', width: '100%' },
  themePickerLabel: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 12 },
  themePickerRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  themePickerSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  themePickerCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Theme confirmation popup
  themeConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  themeConfirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  themeConfirmPreview: {
    height: 88,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 14,
  },
  themeConfirmChip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeConfirmDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  themeConfirmDesc: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  themeConfirmActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  themeConfirmBtn: {
    flexGrow: 1,
    flexBasis: 132,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeConfirmBtnSecondary: {
    backgroundColor: c.surfaceMuted,
  },
  themeConfirmBtnSecondaryText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  themeConfirmBtnPrimary: {},
  themeConfirmBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});

const styles = createStyles(THEMES.default.colors);
