/**
 * app/womens-health.tsx
 * ─────────────────────────────────────────────────────────────
 * Bluom Women's Health Hub — Flo-quality hormonal intelligence.
 *
 * Pulls from onboarding:
 *   fitnessGoal, activityLevel, sleepHours, stressLevel,
 *   nutritionApproach, workoutPreference, weight, age,
 *   motivations, challenges, coachingStyle
 *
 * Mini quiz (4 Q) captures what onboarding can't:
 *   birthControlMethod, mainHealthFocus,
 *   cycleRegularity, periodPain
 *
 * Life stages: cycle | pregnancy | menopause
 * Tabs: Today | Cycle | Insights | Learn
 */

import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useAccessControl } from '@/hooks/useAccessControl';
import * as SecureStore from 'expo-secure-store';

const { width: SW } = Dimensions.get('window');
const QUIZ_KEY = 'bluom_womens_quiz_v1';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type LifeStage = 'cycle' | 'pregnancy' | 'menopause';

interface WomensProfile {
  birthControl:   string; // 'none'|'pill'|'iud'|'implant'|'other'
  mainFocus:      string; // 'cycle_health'|'fertility'|'perimenopause'|'energy'|'skin_hormones'|'weight_hormones'
  cycleRegularity:string; // 'regular'|'irregular'|'unknown'
  periodPain:     string; // 'none'|'mild'|'moderate'|'severe'
}

// ─────────────────────────────────────────────────────────────
// MINI QUIZ
// ─────────────────────────────────────────────────────────────
const WOMENS_QUIZ = [
  {
    id: 'mainFocus',
    emoji: '🌸',
    question: 'What is your main focus right now?',
    options: [
      { value: 'cycle_health',     label: 'Cycle health & regularity', icon: '🔄' },
      { value: 'fertility',        label: 'Fertility & conception',    icon: '🤱' },
      { value: 'perimenopause',    label: 'Perimenopause symptoms',    icon: '🌡️' },
      { value: 'energy',           label: 'Hormonal energy & mood',   icon: '⚡' },
      { value: 'skin_hormones',    label: 'Skin & hormonal acne',     icon: '✨' },
      { value: 'weight_hormones',  label: 'Hormonal weight balance',  icon: '⚖️' },
    ],
  },
  {
    id: 'cycleRegularity',
    emoji: '📅',
    question: 'How would you describe your cycle?',
    options: [
      { value: 'regular',   label: 'Regular (24–35 day cycle)', icon: '✅' },
      { value: 'irregular', label: 'Irregular / unpredictable',  icon: '🌊' },
      { value: 'unknown',   label: 'I\'m not sure',              icon: '❓' },
    ],
  },
  {
    id: 'periodPain',
    emoji: '💊',
    question: 'How is your period pain?',
    options: [
      { value: 'none',     label: 'None — pain-free',       icon: '😊' },
      { value: 'mild',     label: 'Mild — manageable',      icon: '🟡' },
      { value: 'moderate', label: 'Moderate — disruptive',  icon: '🟠' },
      { value: 'severe',   label: 'Severe — debilitating',  icon: '🔴' },
    ],
  },
  {
    id: 'birthControl',
    emoji: '💊',
    question: 'Are you using hormonal birth control?',
    options: [
      { value: 'none',    label: 'No — not using any',   icon: '🌿' },
      { value: 'pill',    label: 'Combined / mini pill',  icon: '💊' },
      { value: 'iud',     label: 'IUD (hormonal)',        icon: '🔩' },
      { value: 'implant', label: 'Implant / injection',   icon: '💉' },
      { value: 'other',   label: 'Other method',          icon: '📋' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────
// CYCLE LOGIC
// ─────────────────────────────────────────────────────────────
interface CyclePhase {
  name: string;
  day: number;
  description: string;
  energy: string;
  workout: string;
  nutrition: string;
  mood: string;
  color: string;
  bg: string;
  gradient: [string, string];
  hormone: string;
  tip: string;
}

function getCyclePhase(lastPeriodDate: number, cycleLength = 28): CyclePhase {
  const now       = Date.now();
  const daysSince = Math.floor((now - lastPeriodDate) / (1000 * 60 * 60 * 24));
  const cycleDay  = (daysSince % cycleLength) + 1;

  if (cycleDay <= 5) return {
    name: 'Menstrual', day: cycleDay,
    description: 'Uterine lining sheds. Oestrogen and progesterone are at their lowest.',
    energy: 'Low — honour rest', workout: 'Gentle yoga, walks, stretching',
    nutrition: 'Iron-rich foods: lentils, leafy greens, red meat',
    mood: 'Introspective, emotional', color: '#dc2626', bg: '#fef2f2',
    gradient: ['#dc2626', '#b91c1c'], hormone: 'Low oestrogen & progesterone',
    tip: 'Use a heating pad, reduce caffeine, and prioritise sleep.',
  };
  if (cycleDay <= 13) return {
    name: 'Follicular', day: cycleDay,
    description: 'FSH rises, follicles develop, oestrogen climbs. Energy and clarity build.',
    energy: 'Rising — great for new starts', workout: 'Strength training, HIIT, cardio',
    nutrition: 'Complex carbs, fermented foods, lean protein',
    mood: 'Optimistic, motivated, social', color: '#16a34a', bg: '#f0fdf4',
    gradient: ['#16a34a', '#15803d'], hormone: 'Rising oestrogen, FSH active',
    tip: 'Schedule demanding projects and creative work now — your brain is firing.',
  };
  if (cycleDay === 14) return {
    name: 'Ovulation', day: cycleDay,
    description: 'LH surge triggers egg release. Peak oestrogen. You feel your best.',
    energy: 'Peak — highest physical capacity', workout: 'PR attempts, intense cardio',
    nutrition: 'Antioxidants, zinc-rich foods (pumpkin seeds, oysters)',
    mood: 'Confident, magnetic, communicative', color: '#2563eb', bg: '#eff6ff',
    gradient: ['#2563eb', '#1d4ed8'], hormone: 'LH surge + peak oestrogen',
    tip: 'Your voice is literally more attractive now — lean into social situations.',
  };
  if (cycleDay <= 21) return {
    name: 'Luteal (Early)', day: cycleDay,
    description: 'Progesterone rises as corpus luteum forms. Body temperature elevates.',
    energy: 'Stable — sustained effort', workout: 'Moderate lifting, Pilates, cycling',
    nutrition: 'Magnesium (dark chocolate, nuts), B6 for mood',
    mood: 'Focused, detail-oriented, some bloating', color: '#d97706', bg: '#fffbeb',
    gradient: ['#d97706', '#b45309'], hormone: 'Rising progesterone',
    tip: 'This is the best phase for detail-oriented admin and deep focused work.',
  };
  return {
    name: 'Luteal (Late)', day: cycleDay,
    description: 'PMS window. Progesterone drops if no fertilisation. Cortisol sensitivity rises.',
    energy: 'Low-moderate — wind down', workout: 'Light cardio, yoga, walking',
    nutrition: 'Reduce salt + sugar. Tryptophan foods (turkey, eggs) for serotonin.',
    mood: 'Sensitive, irritable, craving comfort', color: '#7c3aed', bg: '#f5f3ff',
    gradient: ['#7c3aed', '#6d28d9'], hormone: 'Dropping progesterone + oestrogen',
    tip: 'Reduce alcohol and processed foods. Track your PMS symptoms to spot patterns.',
  };
}

function getPregnancyStats(startDate: number) {
  const days     = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
  const weeks    = Math.floor(days / 7);
  const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  const sizes     = ['🌱','🫘','🫘','🫐','🫘','🍇','🍊','🟣','🍋','🍋','🍎','🥑','🥔','🫑','🥒','🟠','🍆','🎃','🍍','🍈','🍈','🍉','🎃'];
  const milestones = [
    'Heart is beating','Fingers forming','First kicks possible','Hearing develops',
    'Baby can dream','Lungs maturing','Practice breathing','Full term approaching',
  ];
  return {
    weeks, trimester, progress: Math.min(weeks / 40, 1),
    emoji: sizes[Math.min(weeks, sizes.length - 1)],
    milestone: milestones[Math.floor(weeks / 5)] ?? 'Growing strong',
  };
}

// ─────────────────────────────────────────────────────────────
// PERSONALISED INSIGHTS engine
// ─────────────────────────────────────────────────────────────
function buildInsights(
  convexUser: any,
  profile: WomensProfile | null,
  phase: CyclePhase | null,
) {
  const insights: { title: string; body: string; icon: string; priority: 'high'|'medium'|'low'; link?: string }[] = [];

  const stress    = convexUser?.stressLevel;
  const sleep     = convexUser?.sleepHours;
  const goal      = convexUser?.fitnessGoal;
  const activity  = convexUser?.activityLevel;
  const diet      = convexUser?.nutritionApproach;
  const age       = convexUser?.age;

  // Phase-specific insights
  if (phase) {
    if (phase.name === 'Luteal (Late)') {
      insights.push({ title: 'PMS Window Active', body: 'Magnesium glycinate (300mg) taken before bed has strong clinical evidence for reducing cramps, bloating and mood swings.', icon: '💊', priority: 'high' });
      if (stress === 'high' || stress === 'very_high') {
        insights.push({ title: 'High Stress + Late Luteal = Risk', body: 'Your reported stress level combined with the PMS window can amplify cortisol and worsen symptoms. Prioritise a cortisol-lowering practice today.', icon: '⚠️', priority: 'high', link: '/wellness' });
      }
    }
    if (phase.name === 'Ovulation') {
      insights.push({ title: 'Fertility Window Open', body: 'You are in your peak fertility window. If you are actively trying to conceive, this is the optimal time. If not, be aware.', icon: '🌸', priority: 'high' });
    }
    if (phase.name === 'Follicular') {
      insights.push({ title: 'Oestrogen Rising = Brain Power', body: 'Serotonin and dopamine are elevated this phase. A great window to schedule hard conversations, presentations, or creative projects.', icon: '🧠', priority: 'medium' });
    }
  }

  // Sleep-hormone link
  if (sleep && sleep < 7) {
    insights.push({ title: 'Sleep Debt Disrupts Hormones', body: 'Under 7 hours of sleep raises cortisol, suppresses progesterone, and can cause cycle irregularities. You\'re currently averaging less than the minimum.', icon: '😴', priority: 'high', link: '/wellness' });
  }

  // Nutrition insights
  if (diet === 'low_carb' || diet === 'high_protein') {
    insights.push({ title: 'Low Carb + Hormones', body: 'Very low carb diets can suppress LH and FSH, causing irregular or absent periods. If your cycle is irregular, consider a cyclical carb approach.', icon: '🥗', priority: 'medium' });
  }

  // Pain level insight
  if (profile?.periodPain === 'severe') {
    insights.push({ title: 'Severe Pain Needs Investigation', body: 'Severe period pain is not normal and may indicate endometriosis, fibroids or adenomyosis. We strongly recommend speaking to a GP or gynaecologist.', icon: '🏥', priority: 'high' });
  }

  // Birth control insight
  if (profile?.birthControl === 'pill') {
    insights.push({ title: 'Pill & Nutrient Depletion', body: 'The combined pill can deplete B6, B12, folate, magnesium and zinc. Consider a B-complex supplement and regular blood tests.', icon: '💊', priority: 'medium' });
  }

  // Activity vs cycle
  if (activity === 'very_active' || activity === 'extremely_active') {
    insights.push({ title: 'Athletic Triad Awareness', body: 'High-intensity training can suppress oestrogen and disrupt your cycle (RED-S). Monitor your period — any disruption is your body\'s warning signal.', icon: '🏃', priority: 'medium', link: '/move' });
  }

  // Age-based
  if (age && age >= 35 && age <= 45) {
    insights.push({ title: 'Perimenopause May Begin', body: 'Hormonal fluctuations often start in the mid-to-late 30s, even with regular periods. Track mood, sleep and cycle changes closely.', icon: '🌡️', priority: 'medium' });
  }

  // Weight goal + hormones
  if (goal === 'lose_weight') {
    insights.push({ title: 'Calorie Restriction & Hormones', body: 'Aggressive calorie deficits suppress leptin and thyroid hormones, potentially stalling weight loss and disrupting cycles. Cycle-sync your training intensity instead.', icon: '⚖️', priority: 'medium' });
  }

  return insights.slice(0, 6); // Max 6
}

// ─────────────────────────────────────────────────────────────
// LEARN ARTICLES (Library integration — static for now)
// ─────────────────────────────────────────────────────────────
const LEARN_ARTICLES = [
  { id: '1', title: 'Oestrogen Dominance: Signs & Solutions',    category: 'Hormones',  emoji: '⚗️',  time: '5 min', body: 'When oestrogen is disproportionately high relative to progesterone, you may experience heavy periods, weight gain around hips, mood swings and breast tenderness. Key strategies: reduce plastics (xenoestrogens), support liver detox with cruciferous veg, and include zinc + B6 foods.' },
  { id: '2', title: 'Cycle Syncing: Train Smarter Every Phase',   category: 'Fitness',   emoji: '💪',  time: '7 min', body: 'Follicular & ovulatory phase: push hard — strength, HIIT, PRs. Luteal phase: moderate — Pilates, swimming. Menstrual phase: gentle — yoga, walking. Matching your training to your hormones reduces injury risk and improves adaptation.' },
  { id: '3', title: 'Cortisol & Your Cycle: The Hidden Link',     category: 'Wellness',  emoji: '🧠',  time: '4 min', body: 'Chronic stress elevates cortisol, which directly suppresses progesterone production. This causes shorter luteal phases, PMS amplification, and cycle irregularities. Evidence-based tools: 4-7-8 breathing, adaptogens (ashwagandha), and sleep consistency.' },
  { id: '4', title: 'Gut Health & Oestrogen Metabolism',          category: 'Nutrition', emoji: '🦠',  time: '6 min', body: 'The estrobolome — gut bacteria that process oestrogen — is crucial. Poor gut health means oestrogen gets recirculated instead of excreted, driving hormonal imbalances. Prioritise: fibre (30g/day), fermented foods, reduce alcohol.' },
  { id: '5', title: 'Iron, Fatigue & Your Period',                 category: 'Nutrition', emoji: '💊',  time: '4 min', body: 'Menstruating women lose 20-80ml of blood each cycle. Iron deficiency is the most common nutrient deficiency worldwide and directly causes fatigue, poor focus and reduced athletic performance. Test your ferritin, not just haemoglobin.' },
  { id: '6', title: 'Progesterone: The Calm Hormone',             category: 'Hormones',  emoji: '🌿',  time: '5 min', body: 'Progesterone is your body\'s natural anxiolytic. Low progesterone causes anxiety, insomnia, and heavy periods. Boost naturally: reduce stress, adequate sleep, zinc + vitamin B6, and avoid under-eating.' },
  { id: '7', title: 'PCOS: Beyond the Basics',                    category: 'Health',    emoji: '🔬',  time: '8 min', body: 'Polycystic Ovary Syndrome affects 1 in 10 women. Key management pillars: blood sugar regulation (reduce refined carbs), strength training to improve insulin sensitivity, inositol supplementation (evidence grade A), and stress management.' },
  { id: '8', title: 'Thyroid & Female Fertility',                  category: 'Health',    emoji: '🦋',  time: '5 min', body: 'Hypothyroidism affects up to 3x more women than men and is a leading undiagnosed cause of infertility, irregular cycles and postnatal depression. Get TSH, T3 and T4 tested — not just TSH alone.' },
];

// ─────────────────────────────────────────────────────────────
// SUPPLEMENT RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────
function getSupplementStack(
  profile: WomensProfile | null,
  phase: CyclePhase | null,
  convexUser: any,
): { name: string; dose: string; reason: string; evidence: string; timing: string }[] {
  const stack: any[] = [];
  const pain    = profile?.periodPain;
  const bc      = profile?.birthControl;
  const focus   = profile?.mainFocus;
  const stress  = convexUser?.stressLevel;
  const sleep   = convexUser?.sleepHours;
  const age     = convexUser?.age;

  // Phase-based
  if (phase?.name === 'Menstrual' || phase?.name === 'Luteal (Late)') {
    stack.push({ name: 'Magnesium Glycinate', dose: '300mg', reason: 'Reduces cramps, PMS mood symptoms and improves sleep', evidence: 'Grade A', timing: 'Before bed' });
  }
  if (phase?.name === 'Follicular' || phase?.name === 'Ovulation') {
    stack.push({ name: 'Iron + Vitamin C', dose: '18mg + 500mg', reason: 'Replenish iron lost during menstruation; C enhances absorption', evidence: 'Grade A', timing: 'With breakfast, away from coffee' });
  }

  // Pain-based
  if (pain === 'moderate' || pain === 'severe') {
    stack.push({ name: 'Omega-3 (EPA/DHA)', dose: '2000mg', reason: 'Anti-inflammatory; reduces prostaglandin-driven cramps. As effective as ibuprofen in trials', evidence: 'Grade A', timing: 'With meals' });
    stack.push({ name: 'Vitamin D3', dose: '2000 IU', reason: 'Deficiency linked to severe dysmenorrhoea', evidence: 'Grade B', timing: 'With a fatty meal' });
  }

  // Pill-related
  if (bc === 'pill') {
    stack.push({ name: 'B-Complex (B6, B12, Folate)', dose: '1 capsule', reason: 'Oral contraceptives deplete B vitamins — critical for mood and methylation', evidence: 'Grade A', timing: 'Morning with food' });
    stack.push({ name: 'Zinc', dose: '15mg', reason: 'Contraceptive pill depletes zinc, affecting immunity and skin', evidence: 'Grade B', timing: 'With dinner' });
  }

  // Stress
  if (stress === 'high' || stress === 'very_high') {
    stack.push({ name: 'Ashwagandha KSM-66', dose: '600mg', reason: 'Clinically proven adaptogen for cortisol reduction and hormonal balance', evidence: 'Grade A', timing: 'With dinner or before bed' });
  }

  // Sleep
  if (sleep && sleep < 7) {
    stack.push({ name: 'Magnesium L-Threonate', dose: '140mg', reason: 'Crosses blood-brain barrier; improves deep sleep and reduces night anxiety', evidence: 'Grade B', timing: '30 mins before bed' });
  }

  // Fertility focus
  if (focus === 'fertility') {
    stack.push({ name: 'Myo-Inositol', dose: '4000mg', reason: 'Supports egg quality, ovulation regularity and insulin sensitivity', evidence: 'Grade A', timing: 'Split morning and night with food' });
    stack.push({ name: 'CoQ10 (Ubiquinol)', dose: '200–400mg', reason: 'Improves mitochondrial energy in eggs; important over 35', evidence: 'Grade A', timing: 'With meals' });
  }

  // Perimenopause
  if (focus === 'perimenopause' || (age && age >= 40)) {
    stack.push({ name: 'Black Cohosh', dose: '20–40mg', reason: 'Hot flash and mood symptom relief; best evidence in early menopause', evidence: 'Grade B', timing: 'Morning and evening' });
    stack.push({ name: 'Calcium + D3', dose: '1000mg + 2000IU', reason: 'Bone density protection during oestrogen decline', evidence: 'Grade A', timing: 'Split morning and night' });
  }

  // Universal
  stack.push({ name: 'Vitamin D3 + K2', dose: '2000 IU + 100mcg', reason: 'Most women are deficient; critical for immune function, mood and bone health', evidence: 'Grade A', timing: 'Morning with a fatty meal' });

  // Deduplicate by name
  const seen = new Set<string>();
  return stack.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }).slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// SYMPTOMS LIST
// ─────────────────────────────────────────────────────────────
const SYMPTOMS = [
  'Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood swings',
  'Breast tenderness', 'Acne breakout', 'Back pain', 'Nausea',
  'Insomnia', 'Hot flashes', 'Spotting', 'Heavy flow', 'Brain fog',
  'Anxiety', 'Food cravings', 'Joint pain', 'Discharge change',
];

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function WomensHealthScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const updateUser = useMutation(api.users.updateUser);
  const today      = new Date().toISOString().slice(0, 10);

  // @ts-ignore
  const vitalityHistory = useQuery(api.womensHealth.getOptimizationHistory, convexUser?._id ? { userId: convexUser._id, days: 28 } : 'skip');
  // @ts-ignore
  const todayStatus     = useQuery(api.womensHealth.getOptimizationStatus,  convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const logBioCheck     = useMutation(api.womensHealth.logBioCheck);
  // @ts-ignore
  const wellnessLog     = useQuery(api.wellness.getTodayLog, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');

  // ── UI state ──
  const [activeTab,       setActiveTab]       = useState<'today'|'cycle'|'insights'|'learn'>('today');
  const [lifeStage,       setLifeStage]       = useState<LifeStage>('cycle');
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [showBioModal,    setShowBioModal]    = useState(false);
  const [showPelvicModal, setShowPelvicModal] = useState(false);
  const [showPrivacy,     setShowPrivacy]     = useState(false);
  const [showArticle,     setShowArticle]     = useState<typeof LEARN_ARTICLES[0] | null>(null);
  const [showSupps,       setShowSupps]       = useState(false);

  // ── Quiz ──
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizDone,    setQuizDone]    = useState(false);
  const [quizStep,    setQuizStep]    = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Partial<WomensProfile>>({});
  const [profile,     setProfile]     = useState<WomensProfile | null>(null);

  // ── Setup date ──
  const [setupDate,   setSetupDate]   = useState(today);

  // ── Bio-log form ──
  const [energy,       setEnergy]       = useState(5);
  const [symptoms,     setSymptoms]     = useState<string[]>([]);
  const [flow,         setFlow]         = useState<string>('');
  const [babyMovement, setBabyMovement] = useState(5);
  const [hotFlash,     setHotFlash]     = useState(5);

  // ── Pelvic timer ──
  const [kegelActive,  setKegelActive]  = useState(false);
  const [kegelSecs,    setKegelSecs]    = useState(0);
  const [kegelMsg,     setKegelMsg]     = useState('Ready?');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Load from SecureStore ──
  useEffect(() => {
    SecureStore.getItemAsync(QUIZ_KEY).then(val => {
      if (val) { try { setProfile(JSON.parse(val)); setQuizDone(true); } catch {} }
      setQuizLoading(false);
    });
  }, []);

  useEffect(() => {
    if (convexUser?.lifeStage) setLifeStage(convexUser.lifeStage as LifeStage);
  }, [convexUser?.lifeStage]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [quizDone]);

  // ── Kegel timer ──
  useEffect(() => {
    let interval: any;
    if (kegelActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])).start();
      interval = setInterval(() => {
        setKegelSecs(s => {
          const next = s + 1;
          const cycle = next % 10;
          setKegelMsg(cycle < 5 ? 'HOLD 🔒' : 'RELAX 🌬️');
          return next;
        });
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      setKegelSecs(0);
      setKegelMsg('Ready?');
    }
    return () => clearInterval(interval);
  }, [kegelActive]);

  // ── Derived ──
  const phase = useMemo(() => {
    if (lifeStage !== 'cycle' || !convexUser?.lastPeriodDate) return null;
    return getCyclePhase(convexUser.lastPeriodDate);
  }, [lifeStage, convexUser?.lastPeriodDate]);

  const pregnancyStats = useMemo(() => {
    if (lifeStage !== 'pregnancy' || !convexUser?.pregnancyStartDate) return null;
    return getPregnancyStats(convexUser.pregnancyStartDate);
  }, [lifeStage, convexUser?.pregnancyStartDate]);

  const insights    = useMemo(() => buildInsights(convexUser, profile, phase), [convexUser, profile, phase]);
  const suppStack   = useMemo(() => getSupplementStack(profile, phase, convexUser), [profile, phase, convexUser]);

  const needsSetup  = lifeStage === 'cycle' && !convexUser?.lastPeriodDate
    || lifeStage === 'pregnancy' && !convexUser?.pregnancyStartDate;

  const score = todayStatus?.score ?? 0;

  // ── Quiz handlers ──
  const handleQuizOption = async (value: string) => {
    const step    = WOMENS_QUIZ[quizStep];
    const updated = { ...quizAnswers, [step.id]: value };
    setQuizAnswers(updated);
    if (quizStep < WOMENS_QUIZ.length - 1) {
      setQuizStep(s => s + 1);
    } else {
      const p = updated as WomensProfile;
      setProfile(p);
      await SecureStore.setItemAsync(QUIZ_KEY, JSON.stringify(p));
      setQuizDone(true);
    }
  };

  // ── Save bio log ──
  const handleSaveBio = async () => {
    if (!convexUser?._id) return;
    try {
      await logBioCheck({
        userId: convexUser._id,
        date: today,
        mood: wellnessLog?.mood ?? 5,
        energy,
        symptoms,
        flow: lifeStage === 'cycle' ? flow : undefined,
        babyMovement: lifeStage === 'pregnancy' ? babyMovement : undefined,
        hotFlashSeverity: lifeStage === 'menopause' ? hotFlash : undefined,
      });
      Alert.alert('Logged ✓', 'Your daily bio-markers are saved.');
      setShowBioModal(false);
    } catch { Alert.alert('Error', 'Could not save. Try again.'); }
  };

  // ── Setup date save ──
  const handleSetupSave = async () => {
    if (!convexUser?._id) return;
    const ts: any = {};
    if (lifeStage === 'cycle')     ts.lastPeriodDate    = new Date(setupDate).getTime();
    if (lifeStage === 'pregnancy') ts.pregnancyStartDate = new Date(setupDate).getTime();
    await updateUser({ userId: convexUser._id, updates: { ...ts, lifeStage } });
  };

  // ─────────────────────────────────────────────────────────
  // QUIZ SCREEN
  // ─────────────────────────────────────────────────────────
  if (quizLoading) return <SafeAreaView style={s.screen} edges={['top']}><ActivityIndicator style={{ flex: 1 }} color="#e11d48" /></SafeAreaView>;

  if (!quizDone) {
    const step = WOMENS_QUIZ[quizStep];
    return (
      <SafeAreaView style={s.quizScreen} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={s.quizTopBar}>
          <TouchableOpacity onPress={() => quizStep > 0 ? setQuizStep(p => p - 1) : router.back()} style={s.quizBack}>
            <Ionicons name="chevron-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <View style={s.quizProgress}>
            <View style={[s.quizProgressFill, { width: `${((quizStep + 1) / WOMENS_QUIZ.length) * 100}%` as any }]} />
          </View>
          <Text style={s.quizStepNum}>{quizStep + 1}/{WOMENS_QUIZ.length}</Text>
        </View>

        {quizStep === 0 && (
          <View style={s.quizHero}>
            <LinearGradient colors={['#fdf2f8', '#fff']} style={s.quizHeroBg}>
              <Text style={s.quizHeroEmoji}>🌸</Text>
              <Text style={s.quizHeroTitle}>Your Hormonal Blueprint</Text>
              <Text style={s.quizHeroSub}>
                4 questions to personalise your cycle insights, supplement stack and hormonal guidance — layered on top of what we already know about you.
              </Text>
              {/* Show onboarding data we already have */}
              {convexUser && (
                <View style={s.quizKnowBox}>
                  <Text style={s.quizKnowTitle}>✦ Already personalised from your profile</Text>
                  {convexUser.fitnessGoal && <Text style={s.quizKnowItem}>🎯 Goal: {convexUser.fitnessGoal.replace(/_/g, ' ')}</Text>}
                  {convexUser.stressLevel  && <Text style={s.quizKnowItem}>🧠 Stress: {convexUser.stressLevel}</Text>}
                  {convexUser.sleepHours   && <Text style={s.quizKnowItem}>😴 Sleep: {convexUser.sleepHours}h avg</Text>}
                  {convexUser.age          && <Text style={s.quizKnowItem}>📅 Age: {convexUser.age}</Text>}
                  {convexUser.activityLevel && <Text style={s.quizKnowItem}>💪 Activity: {convexUser.activityLevel.replace(/_/g, ' ')}</Text>}
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        <ScrollView contentContainerStyle={s.quizBody} keyboardShouldPersistTaps="handled">
          <Text style={s.quizEmoji}>{step.emoji}</Text>
          <Text style={s.quizQuestion}>{step.question}</Text>
          <View style={s.quizOptions}>
            {'options' in step && step.options.map((opt) => (
              <TouchableOpacity key={opt.value} style={s.quizOption} onPress={() => handleQuizOption(opt.value)} activeOpacity={0.8}>
                <Text style={s.quizOptionIcon}>{opt.icon}</Text>
                <Text style={s.quizOptionLabel}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // MAIN HUB
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── Modals ── */}

      {/* Article Modal */}
      {showArticle && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
            <View style={s.articleHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.articleCategory}>{showArticle.emoji} {showArticle.category} · {showArticle.time}</Text>
                <Text style={s.articleTitle}>{showArticle.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowArticle(null)} style={s.articleClose}>
                <Ionicons name="close" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <Text style={s.articleBody}>{showArticle.body}</Text>
              <View style={s.articleDisclaimer}>
                <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
                <Text style={s.articleDisclaimerTxt}>This is educational content, not medical advice. Consult a healthcare provider for personal guidance.</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Bio-Log Modal */}
      <Modal visible={showBioModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Daily Bio-Log</Text>
            <TouchableOpacity onPress={() => setShowBioModal(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* Mood sync */}
            <View style={s.moodSync}>
              <Ionicons name="sync" size={16} color="#7e22ce" />
              <Text style={s.moodSyncTxt}>Mood synced from Wellness: {wellnessLog?.moodEmoji ?? '—'}</Text>
            </View>

            {/* Energy */}
            <Text style={s.bioLabel}>Energy today (1–10)</Text>
            <View style={s.dotRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} style={[s.dot, energy >= n && s.dotActive]} onPress={() => setEnergy(n)}>
                  <Text style={[s.dotTxt, energy >= n && s.dotTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Symptoms */}
            <Text style={s.bioLabel}>Symptoms</Text>
            <View style={s.symptomGrid}>
              {SYMPTOMS.map(sym => {
                const active = symptoms.includes(sym);
                return (
                  <TouchableOpacity key={sym} style={[s.symChip, active && s.symChipActive]}
                    onPress={() => setSymptoms(active ? symptoms.filter(x => x !== sym) : [...symptoms, sym])}>
                    <Text style={[s.symChipTxt, active && s.symChipTxtActive]}>{sym}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stage-specific */}
            {lifeStage === 'cycle' && (
              <>
                <Text style={s.bioLabel}>Flow</Text>
                <View style={s.flowRow}>
                  {['None', 'Spotting', 'Light', 'Medium', 'Heavy'].map(f => (
                    <TouchableOpacity key={f} style={[s.flowChip, flow === f && s.flowChipActive]} onPress={() => setFlow(f)}>
                      <Text style={[s.flowTxt, flow === f && { color: '#fff' }]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {lifeStage === 'pregnancy' && (
              <>
                <Text style={s.bioLabel}>Baby movement today (1–10)</Text>
                <View style={s.dotRow}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <TouchableOpacity key={n} style={[s.dot, babyMovement >= n && { backgroundColor: '#e11d48', borderColor: '#e11d48' }]} onPress={() => setBabyMovement(n)}>
                      <Text style={[s.dotTxt, babyMovement >= n && s.dotTxtActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {lifeStage === 'menopause' && (
              <>
                <Text style={s.bioLabel}>Hot flash severity (1–10)</Text>
                <View style={s.dotRow}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <TouchableOpacity key={n} style={[s.dot, hotFlash >= n && { backgroundColor: '#f97316', borderColor: '#f97316' }]} onPress={() => setHotFlash(n)}>
                      <Text style={[s.dotTxt, hotFlash >= n && s.dotTxtActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleSaveBio}>
              <Text style={s.saveBtnTxt}>Save Bio-Log</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Supplement Modal */}
      <Modal visible={showSupps} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Your Vitality Stack</Text>
            <TouchableOpacity onPress={() => setShowSupps(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Text style={s.suppIntro}>
              Personalised based on your cycle phase, stress level, birth control method, health focus and age.
            </Text>

            <TouchableOpacity style={s.actionTile} onPress={() => { setShowSupps(false); router.push('/pill-reminder' as any); }} activeOpacity={0.8}>
              <View style={[s.actionIcon, { backgroundColor: '#fdf2f8' }]}>
                <Ionicons name="medical-outline" size={22} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>Birth Control & Pill Reminder</Text>
                <Text style={s.actionSub}>Track your medications and supplements safely</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              {!isPro && (
                <View style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#fdf2f8', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="lock-closed" size={24} color="#e11d48" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Unlock Your Vitamin Stack</Text>
                    <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>See your personalised supplement recommendations tailored to your cycle phase.</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setShowSupps(false); router.push('/premium' as any); }}>
                    <Text style={{ color: '#e11d48', fontWeight: '700' }}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}

              {suppStack.map((supp, i) => (
                <View key={i} style={s.suppCard}>
                  <View style={s.suppTop}>
                    <Text style={s.suppName}>{isPro ? supp.name : '••••••••••••••••'}</Text>
                    <View style={[s.evidenceBadge, { backgroundColor: supp.evidence === 'Grade A' ? '#dcfce7' : '#fef9c3' }]}>
                      <Text style={[s.evidenceTxt, { color: supp.evidence === 'Grade A' ? '#15803d' : '#92400e' }]}>{supp.evidence}</Text>
                    </View>
                  </View>
                  <Text style={s.suppDose}>💊 {isPro ? supp.dose : '•••'} · ⏰ {isPro ? supp.timing : '••••'}</Text>
                  <Text style={s.suppReason}>{isPro ? supp.reason : 'Personalisation locked for free users.'}</Text>
                </View>
              ))}
            </View>

            <View style={s.suppDisclaimer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#94a3b8" />
              <Text style={s.suppDisclaimerTxt}>Always consult a healthcare provider before starting new supplements, especially during pregnancy.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pelvic Modal */}
      <Modal visible={showPelvicModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={s.pelvicTitle}>Pelvic Power Protocol</Text>
          <Text style={s.pelvicSub}>Strengthens pelvic floor, reduces cramps & supports core</Text>
          <Animated.View style={[s.timerCircle, { transform: [{ scale: pulseAnim }], borderColor: kegelActive ? '#e11d48' : '#e2e8f0', backgroundColor: kegelActive ? '#fef2f2' : '#f8fafc' }]}>
            <Text style={s.timerTime}>{String(Math.floor(kegelSecs / 60)).padStart(2,'0')}:{String(kegelSecs % 60).padStart(2,'0')}</Text>
            <Text style={s.timerMsg}>{kegelMsg}</Text>
          </Animated.View>
          <Text style={s.pelvicInstructions}>Hold 5s → Relax 5s → Repeat. Aim for 10 cycles per session.</Text>
          <TouchableOpacity style={[s.pelvicBtn, { backgroundColor: kegelActive ? '#1e293b' : '#e11d48' }]} onPress={() => setKegelActive(p => !p)}>
            <Text style={s.pelvicBtnTxt}>{kegelActive ? 'Stop Session' : 'Start Timer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setKegelActive(false); setShowPelvicModal(false); }} style={{ marginTop: 16 }}>
            <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Stage Selector */}
      <Modal visible={showStageSelect} transparent animationType="fade">
        <View style={s.stageOverlay}>
          <View style={s.stageCard}>
            <Text style={s.stageTitle}>Life Stage</Text>
            {(['cycle', 'pregnancy', 'menopause'] as LifeStage[]).map(stage => (
              <TouchableOpacity key={stage}
                style={[s.stageOption, lifeStage === stage && s.stageOptionActive]}
                onPress={() => {
                  setLifeStage(stage);
                  updateUser({ userId: convexUser!._id, updates: { lifeStage: stage } });
                  setShowStageSelect(false);
                }}>
                <Text style={s.stageEmoji}>{stage === 'cycle' ? '🔄' : stage === 'pregnancy' ? '🤰' : '🌡️'}</Text>
                <Text style={[s.stageLabel, lifeStage === stage && { color: '#e11d48', fontWeight: '800' }]}>
                  {stage === 'cycle' ? 'Menstrual Cycle' : stage === 'pregnancy' ? 'Pregnancy' : 'Menopause'}
                </Text>
                {lifeStage === stage && <Ionicons name="checkmark-circle" size={20} color="#e11d48" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowStageSelect(false)} style={s.stageCancelBtn}>
              <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#e11d48" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Women's Health</Text>
          <Text style={s.headerSub}>Hormonal intelligence · {lifeStage}</Text>
        </View>
        <TouchableOpacity style={s.stageBtn} onPress={() => setShowStageSelect(true)}>
          <Text style={s.stageBtnEmoji}>{lifeStage === 'cycle' ? '🔄' : lifeStage === 'pregnancy' ? '🤰' : '🌡️'}</Text>
          <Ionicons name="chevron-down" size={13} color="#e11d48" />
        </TouchableOpacity>
        <TouchableOpacity style={s.infoBtn} onPress={() => setShowPrivacy(true)}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {[
          { id: 'today',    label: 'Today',    emoji: '☀️' },
          { id: 'cycle',    label: lifeStage === 'pregnancy' ? 'Baby' : lifeStage === 'menopause' ? 'Tracker' : 'Cycle', emoji: lifeStage === 'pregnancy' ? '👶' : '📅' },
          { id: 'insights', label: 'Insights', emoji: '✦' },
          { id: 'learn',    label: 'Learn',    emoji: '📚' },
        ].map(tab => (
          <TouchableOpacity key={tab.id} style={[s.tab, activeTab === tab.id && s.tabActive]} onPress={() => setActiveTab(tab.id as any)}>
            <Text style={s.tabEmoji}>{tab.emoji}</Text>
            <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════ TODAY TAB ═══════════════ */}
        {activeTab === 'today' && (
          <>
            {/* Setup banner */}
            {needsSetup && (
              <View style={s.setupBanner}>
                <Text style={s.setupTitle}>{lifeStage === 'pregnancy' ? '👶 Track your pregnancy' : '🌸 Unlock your cycle insights'}</Text>
                <Text style={s.setupSub}>{lifeStage === 'pregnancy' ? 'When was your conception date?' : 'When did your last period start?'}</Text>
                <View style={s.setupInputRow}>
                  <TextInput style={s.setupInput} value={setupDate} onChangeText={setSetupDate} placeholder="YYYY-MM-DD" />
                  <TouchableOpacity style={s.setupSaveBtn} onPress={handleSetupSave}>
                    <Text style={s.setupSaveTxt}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Phase hero card */}
            {phase && (
              <LinearGradient colors={phase.gradient} style={s.phaseHero}>
                <View style={s.phaseHeroTop}>
                  <View>
                    <Text style={s.phaseDay}>Day {phase.day} of cycle</Text>
                    <Text style={s.phaseName}>{phase.name}</Text>
                    <Text style={s.phaseHormone}>{phase.hormone}</Text>
                  </View>
                  <View style={s.scoreCircle}>
                    <Text style={s.scoreVal}>{score}%</Text>
                    <Text style={s.scoreLbl}>today</Text>
                  </View>
                </View>
                <Text style={s.phaseDesc}>{phase.description}</Text>
                <View style={s.phaseTip}>
                  <Ionicons name="bulb-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={s.phaseTipTxt}>{phase.tip}</Text>
                </View>
              </LinearGradient>
            )}

            {/* Pregnancy hero */}
            {pregnancyStats && (
              <LinearGradient colors={['#be185d', '#9d174d']} style={s.phaseHero}>
                <View style={s.phaseHeroTop}>
                  <View>
                    <Text style={s.phaseDay}>Trimester {pregnancyStats.trimester}</Text>
                    <Text style={s.phaseName}>Week {pregnancyStats.weeks}</Text>
                    <Text style={s.phaseHormone}>{pregnancyStats.milestone}</Text>
                  </View>
                  <Text style={{ fontSize: 52 }}>{pregnancyStats.emoji}</Text>
                </View>
                <View style={s.pregnancyBar}>
                  <View style={[s.pregnancyBarFill, { width: `${pregnancyStats.progress * 100}%` as any }]} />
                </View>
                <Text style={s.pregnancyBarLbl}>{40 - pregnancyStats.weeks} weeks to go</Text>
              </LinearGradient>
            )}

            {/* Menopause hero */}
            {lifeStage === 'menopause' && (
              <LinearGradient colors={['#7c3aed', '#5b21b6']} style={s.phaseHero}>
                <Text style={s.phaseName}>Menopause Tracker</Text>
                <Text style={s.phaseDesc}>Track hot flashes, mood and sleep changes. Your hormonal picture matters.</Text>
                <View style={s.scoreCircle}>
                  <Text style={s.scoreVal}>{score}%</Text>
                  <Text style={s.scoreLbl}>adherence</Text>
                </View>
              </LinearGradient>
            )}

            {/* Today's actions */}
            <Text style={s.sectionTitle}>Daily Protocols</Text>

            {/* Cycle sync cards */}
            {phase && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.syncScroll}>
                {[
                  { title: '🏋️ Move', body: phase.workout,   color: '#eff6ff', border: '#bfdbfe' },
                  { title: '🥗 Fuel', body: phase.nutrition,  color: '#f0fdf4', border: '#bbf7d0' },
                  { title: '😌 Mood', body: phase.mood,       color: '#f5f3ff', border: '#ddd6fe' },
                  { title: '⚡ Energy', body: phase.energy,   color: '#fffbeb', border: '#fde68a' },
                ].map((c, i) => (
                  <View key={i} style={[s.syncCard, { backgroundColor: c.color, borderColor: c.border }]}>
                    <Text style={s.syncCardTitle}>{c.title}</Text>
                    <Text style={s.syncCardBody}>{c.body}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Action tiles */}
            {[
              { icon: 'pulse-outline', label: 'Daily Bio-Log', sub: `Mood, energy, symptoms${lifeStage === 'cycle' ? ', flow' : ''}`, onPress: () => setShowBioModal(true), color: '#fdf2f8' },
              { icon: 'fitness-outline', label: 'Pelvic Power Protocol', sub: 'Core, floor & posture', onPress: () => setShowPelvicModal(true), color: '#fdf2f8' },
              { icon: 'flask-outline', label: 'Vitality Stack', sub: `${suppStack.length} personalised supplements`, onPress: () => setShowSupps(true), color: '#fdf2f8' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={s.actionTile} onPress={a.onPress} activeOpacity={0.8}>
                <View style={[s.actionIcon, { backgroundColor: a.color }]}>
                  <Ionicons name={a.icon as any} size={22} color="#e11d48" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionLabel}>{a.label}</Text>
                  <Text style={s.actionSub}>{a.sub}</Text>
                </View>
                {i === 2 && !isPro && <View style={s.proChip}><Text style={s.proChipTxt}>Pro</Text></View>}
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ═══════════════ CYCLE TAB ═══════════════ */}
        {activeTab === 'cycle' && (
          <>
            {/* 28-day ring tracker */}
            {lifeStage === 'cycle' && phase && (
              <>
                <Text style={s.sectionTitle}>28-Day Calendar</Text>
                <View style={s.calendarGrid}>
                  {Array.from({ length: 28 }, (_, i) => {
                    const d = i + 1;
                    const isToday = d === phase.day;
                    const phaseColor =
                      d <= 5 ? '#dc2626' :
                      d <= 13 ? '#16a34a' :
                      d === 14 ? '#2563eb' :
                      d <= 21 ? '#d97706' : '#7c3aed';
                    return (
                      <View key={d} style={[s.calDay, isToday && { borderColor: phaseColor, borderWidth: 2 }, { backgroundColor: isToday ? phaseColor : '#fff' }]}>
                        <Text style={[s.calDayNum, isToday && { color: '#fff', fontWeight: '900' }]}>{d}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Phase legend */}
                <View style={s.phaseLegend}>
                  {[
                    { label: 'Menstrual', color: '#dc2626', days: '1–5' },
                    { label: 'Follicular', color: '#16a34a', days: '6–13' },
                    { label: 'Ovulation', color: '#2563eb', days: '14' },
                    { label: 'Early Luteal', color: '#d97706', days: '15–21' },
                    { label: 'Late Luteal', color: '#7c3aed', days: '22–28' },
                  ].map(p => (
                    <View key={p.label} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: p.color }]} />
                      <Text style={s.legendTxt}>{p.label} <Text style={s.legendDays}>({p.days})</Text></Text>
                    </View>
                  ))}
                </View>

                {/* Phase deep dive */}
                <View style={[s.phaseDiveCard, { borderLeftColor: phase.color }]}>
                  <Text style={[s.phaseDiveName, { color: phase.color }]}>{phase.name} Phase — Day {phase.day}</Text>
                  <Text style={s.phaseDiveBody}>{phase.description}</Text>
                  <View style={s.phaseDiveGrid}>
                    {[
                      { emoji: '💪', label: 'Workout', val: phase.workout },
                      { emoji: '🥗', label: 'Nutrition', val: phase.nutrition },
                      { emoji: '😌', label: 'Mood', val: phase.mood },
                      { emoji: '⚡', label: 'Energy', val: phase.energy },
                    ].map(item => (
                      <View key={item.label} style={s.phaseDiveItem}>
                        <Text style={s.phaseDiveEmoji}>{item.emoji}</Text>
                        <Text style={s.phaseDiveItemLabel}>{item.label}</Text>
                        <Text style={s.phaseDiveItemVal}>{item.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Pregnancy tracker */}
            {lifeStage === 'pregnancy' && pregnancyStats && (
              <>
                <Text style={s.sectionTitle}>Pregnancy Timeline</Text>
                {/* Week-by-week */}
                {[1,2,3].map(tri => (
                  <View key={tri} style={s.trimesterBlock}>
                    <Text style={s.trimesterTitle}>Trimester {tri} {tri === pregnancyStats.trimester ? '← you are here' : ''}</Text>
                    <Text style={s.trimesterRange}>
                      {tri === 1 ? 'Weeks 1–13 · Organ formation, nausea, fatigue' :
                       tri === 2 ? 'Weeks 14–27 · Energy returns, baby moves, anatomy scan' :
                                   'Weeks 28–40 · Growth, preparation, birth planning'}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Menopause tracker */}
            {lifeStage === 'menopause' && (
              <>
                <Text style={s.sectionTitle}>Symptom History</Text>
                {vitalityHistory && vitalityHistory.length > 0 ? (
                  vitalityHistory.slice(-7).map((log: any, i: number) => (
                    <View key={i} style={s.historyRow}>
                      <Text style={s.historyDate}>{log.date}</Text>
                      <View style={s.historyStats}>
                        <Text style={s.historyStat}>Energy: {log.energy ?? '—'}/10</Text>
                        <Text style={s.historyStat}>Hot Flash: {log.hotFlashSeverity ?? '—'}/10</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.emptyTxt}>Start logging your Bio-Log daily to see patterns here.</Text>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ INSIGHTS TAB ═══════════════ */}
        {activeTab === 'insights' && (
          <>
            <Text style={s.sectionTitle}>Your Hormonal Insights</Text>
            <Text style={s.insightsSub}>Personalised from your profile, cycle phase, stress level, sleep and health focus.</Text>

            {insights.length === 0 && (
              <Text style={s.emptyTxt}>Complete your bio-log to generate personalised insights.</Text>
            )}

            {insights.map((insight, i) => (
              <View key={i} style={[s.insightCard, { borderLeftColor: insight.priority === 'high' ? '#dc2626' : insight.priority === 'medium' ? '#d97706' : '#94a3b8' }]}>
                <View style={s.insightTop}>
                  <Text style={s.insightEmoji}>{insight.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>{insight.title}</Text>
                    <View style={[s.priorityBadge, { backgroundColor: insight.priority === 'high' ? '#fef2f2' : '#fffbeb' }]}>
                      <Text style={[s.priorityTxt, { color: insight.priority === 'high' ? '#dc2626' : '#d97706' }]}>
                        {insight.priority === 'high' ? '⚠️ Priority' : '💡 Note'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={s.insightBody}>{insight.body}</Text>
                {insight.link && (
                  <TouchableOpacity onPress={() => router.push(insight.link as any)} style={s.insightLink}>
                    <Text style={s.insightLinkTxt}>Take action →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Pro blur */}
            {!isPro && (
              <View style={s.proBlurWrap}>
                <BlurView intensity={12} tint="light" style={StyleSheet.absoluteFill} />
                <View style={s.proBlurContent}>
                  <Text style={s.proBlurTitle}>Unlock Deep Hormonal Analysis</Text>
                  <Text style={s.proBlurSub}>AI-powered insights that adapt to your cycle history, lab patterns and logged symptoms over time.</Text>
                  <TouchableOpacity style={s.proBlurBtn} onPress={() => router.push('/premium' as any)}>
                    <Text style={s.proBlurBtnTxt}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════════ LEARN TAB ═══════════════ */}
        {activeTab === 'learn' && (
          <>
            <Text style={s.sectionTitle}>Hormonal Intelligence Library</Text>
            <Text style={s.insightsSub}>Science-backed guides curated for women's hormonal health.</Text>
            {LEARN_ARTICLES.map(article => (
              <TouchableOpacity key={article.id} style={s.articleCard} onPress={() => setShowArticle(article)} activeOpacity={0.85}>
                <View style={s.articleCardLeft}>
                  <Text style={s.articleCardEmoji}>{article.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.articleCardCategory}>{article.category} · {article.time}</Text>
                    <Text style={s.articleCardTitle}>{article.title}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}

            {/* Privacy notice */}
            <TouchableOpacity style={s.privacyRow} onPress={() => setShowPrivacy(true)}>
              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={s.privacyTitle}>Your data stays yours</Text>
                <Text style={s.privacySub}>We never sell your intimate health data. Tap to read our commitment.</Text>
              </View>
            </TouchableOpacity>

            {/* Re-take quiz */}
            <TouchableOpacity style={s.retakeBtn} onPress={() => { SecureStore.deleteItemAsync(QUIZ_KEY); setQuizDone(false); setQuizStep(0); setQuizAnswers({}); }}>
              <Ionicons name="refresh-outline" size={16} color="#e11d48" />
              <Text style={s.retakeTxt}>Update my hormonal profile</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.ScrollView>

      {/* Privacy modal */}
      <Modal visible={showPrivacy} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 24 }} edges={['top']}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 20 }}>Your Privacy First</Text>
          {[
            { icon: 'shield-checkmark', color: '#10b981', title: 'Zero Third-Party Sales', body: 'Your intimate health data — cycle, hormones, symptoms — is never sold to advertisers, insurers or data brokers.' },
            { icon: 'lock-closed', color: '#2563eb', title: 'End-to-End Encrypted', body: 'All sensitive health data is encrypted at rest and in transit. Only you can access your history.' },
            { icon: 'eye-off', color: '#7c3aed', title: 'No profiling', body: 'We do not use your health data to build advertising profiles. Period.' },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>{item.title}</Text>
                <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>{item.body}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={[s.saveBtn, { marginTop: 'auto' as any }]} onPress={() => setShowPrivacy(false)}>
            <Text style={s.saveBtnTxt}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#fdf2f8' },

  // Quiz
  quizScreen:   { flex: 1, backgroundColor: '#fff' },
  quizTopBar:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  quizBack:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center' },
  quizProgress: { flex: 1, height: 5, backgroundColor: '#fce7f3', borderRadius: 3, overflow: 'hidden' },
  quizProgressFill: { height: '100%', backgroundColor: '#e11d48', borderRadius: 3 },
  quizStepNum:  { fontSize: 12, fontWeight: '700', color: '#94a3b8', width: 32, textAlign: 'right' },
  quizHero:     { paddingHorizontal: 20, paddingBottom: 4 },
  quizHeroBg:   { borderRadius: 20, padding: 20 },
  quizHeroEmoji:{ fontSize: 44, marginBottom: 10 },
  quizHeroTitle:{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  quizHeroSub:  { fontSize: 14, color: '#64748b', lineHeight: 21 },
  quizKnowBox:  { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fce7f3' },
  quizKnowTitle:{ fontSize: 12, fontWeight: '800', color: '#be185d', marginBottom: 8 },
  quizKnowItem: { fontSize: 13, color: '#1e293b', marginBottom: 4, fontWeight: '500' },
  quizBody:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  quizEmoji:    { fontSize: 44, marginBottom: 10 },
  quizQuestion: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 20, lineHeight: 30 },
  quizOptions:  { gap: 10 },
  quizOption:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fdf2f8', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#fce7f3' },
  quizOptionIcon: { fontSize: 22 },
  quizOptionLabel:{ flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fce7f3' },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '900', color: '#0f172a' },
  headerSub:  { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  stageBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fdf2f8', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#fce7f3' },
  stageBtnEmoji: { fontSize: 16 },
  infoBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBar:   { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fce7f3' },
  tab:      { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  tabActive:{ borderBottomWidth: 2, borderBottomColor: '#e11d48' },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  tabLabelActive: { color: '#e11d48', fontWeight: '800' },

  scroll: { paddingHorizontal: 16, paddingTop: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  insightsSub:  { fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 19 },

  // Setup banner
  setupBanner:  { backgroundColor: '#fdf2f8', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#fce7f3' },
  setupTitle:   { fontSize: 16, fontWeight: '800', color: '#9d174d', marginBottom: 4 },
  setupSub:     { fontSize: 13, color: '#be185d', marginBottom: 12, fontWeight: '500' },
  setupInputRow:{ flexDirection: 'row', gap: 10 },
  setupInput:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fce7f3', padding: 12, fontSize: 15, color: '#0f172a' },
  setupSaveBtn: { backgroundColor: '#e11d48', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  setupSaveTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Phase hero
  phaseHero:    { borderRadius: 22, padding: 20, marginBottom: 16, overflow: 'hidden' },
  phaseHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  phaseDay:     { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  phaseName:    { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28 },
  phaseHormone: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: '600' },
  phaseDesc:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginBottom: 10 },
  phaseTip:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 10 },
  phaseTipTxt:  { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17, fontStyle: 'italic' },
  scoreCircle:  { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scoreVal:     { fontSize: 18, fontWeight: '900', color: '#fff' },
  scoreLbl:     { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  pregnancyBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  pregnancyBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  pregnancyBarLbl: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'right' },

  // Sync cards
  syncScroll: { marginBottom: 16 },
  syncCard:   { width: 160, borderRadius: 16, borderWidth: 1, padding: 14, marginRight: 10 },
  syncCardTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  syncCardBody:  { fontSize: 12, color: '#475569', lineHeight: 17 },

  // Action tiles
  actionTile:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  actionIcon:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  actionSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  proChip:     { backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginRight: 4 },
  proChipTxt:  { fontSize: 10, fontWeight: '800', color: '#92400e' },

  // Insights
  insightCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  insightTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  insightEmoji:{ fontSize: 22, marginTop: 2 },
  insightTitle:{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityTxt:   { fontSize: 10, fontWeight: '700' },
  insightBody: { fontSize: 13, color: '#475569', lineHeight: 19 },
  insightLink: { marginTop: 10 },
  insightLinkTxt: { fontSize: 12, fontWeight: '700', color: '#e11d48' },

  // Pro blur
  proBlurWrap: { borderRadius: 18, overflow: 'hidden', height: 160, backgroundColor: '#fff', marginBottom: 14 },
  proBlurContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  proBlurTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  proBlurSub:   { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 14, lineHeight: 19 },
  proBlurBtn:   { backgroundColor: '#e11d48', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  proBlurBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 14 },

  // Learn
  articleCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  articleCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  articleCardEmoji: { fontSize: 28 },
  articleCardCategory: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  articleCardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 19 },
  articleHeader:    { flexDirection: 'row', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  articleCategory:  { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  articleTitle:     { fontSize: 20, fontWeight: '900', color: '#0f172a', lineHeight: 26 },
  articleClose:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  articleBody:      { fontSize: 15, color: '#334155', lineHeight: 24, marginBottom: 20 },
  articleDisclaimer:{ flexDirection: 'row', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  articleDisclaimerTxt: { flex: 1, fontSize: 11, color: '#94a3b8', lineHeight: 16 },

  privacyRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#dcfce7' },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  privacySub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  retakeBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  retakeTxt:    { fontSize: 13, fontWeight: '700', color: '#e11d48' },

  // Calendar
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  calDay:       { width: (SW - 48 - 54) / 7, height: (SW - 48 - 54) / 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  calDayNum:    { fontSize: 12, fontWeight: '700', color: '#475569' },
  phaseLegend:  { gap: 6, marginBottom: 16 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendTxt:    { fontSize: 13, fontWeight: '600', color: '#334155' },
  legendDays:   { color: '#94a3b8', fontWeight: '500' },
  phaseDiveCard:{ backgroundColor: '#fff', borderRadius: 18, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, marginBottom: 14 },
  phaseDiveName:{ fontSize: 16, fontWeight: '800', marginBottom: 6 },
  phaseDiveBody:{ fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 14 },
  phaseDiveGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  phaseDiveItem:{ width: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  phaseDiveEmoji:{ fontSize: 20, marginBottom: 4 },
  phaseDiveItemLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  phaseDiveItemVal:   { fontSize: 12, color: '#334155', lineHeight: 17 },

  // Trimester
  trimesterBlock: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  trimesterTitle: { fontSize: 14, fontWeight: '800', color: '#be185d', marginBottom: 4 },
  trimesterRange: { fontSize: 13, color: '#64748b', lineHeight: 19 },

  // History
  historyRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  historyDate:   { fontSize: 12, fontWeight: '700', color: '#94a3b8', width: 80 },
  historyStats:  { flex: 1, flexDirection: 'row', gap: 10 },
  historyStat:   { fontSize: 12, color: '#334155', fontWeight: '600' },

  emptyTxt: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 30, fontStyle: 'italic' },

  // Bio modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:  { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  modalClose:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  moodSync:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, marginBottom: 16 },
  moodSyncTxt: { fontSize: 13, color: '#7e22ce', fontWeight: '600' },
  bioLabel:    { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 14 },
  dotRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot:         { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  dotActive:   { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  dotTxt:      { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dotTxtActive:{ color: '#fff' },
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  symChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  symChipActive:{ backgroundColor: '#fdf2f8', borderColor: '#e11d48' },
  symChipTxt:  { fontSize: 12, fontWeight: '600', color: '#475569' },
  symChipTxtActive: { color: '#e11d48', fontWeight: '700' },
  flowRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flowChip:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  flowChipActive:{ backgroundColor: '#e11d48', borderColor: '#e11d48' },
  flowTxt:     { fontSize: 13, fontWeight: '600', color: '#475569' },
  saveBtn:     { backgroundColor: '#e11d48', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnTxt:  { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Supplement modal
  suppIntro:   { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 16 },
  suppCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  suppTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  suppName:    { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  evidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  evidenceTxt: { fontSize: 10, fontWeight: '800' },
  suppDose:    { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6 },
  suppReason:  { fontSize: 13, color: '#475569', lineHeight: 19 },
  suppDisclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 8 },
  suppDisclaimerTxt: { flex: 1, fontSize: 11, color: '#94a3b8', lineHeight: 16 },

  // Pelvic modal
  pelvicTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  pelvicSub:   { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 19 },
  timerCircle: { width: 220, height: 220, borderRadius: 110, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timerTime:   { fontSize: 48, fontWeight: '900', color: '#0f172a' },
  timerMsg:    { fontSize: 14, fontWeight: '700', color: '#e11d48', marginTop: 4, letterSpacing: 1 },
  pelvicInstructions: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 19, paddingHorizontal: 20 },
  pelvicBtn:   { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 20 },
  pelvicBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 17 },

  // Stage selector
  stageOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  stageCard:     { backgroundColor: '#fff', borderRadius: 22, padding: 20 },
  stageTitle:    { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  stageOption:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#f8fafc', marginBottom: 8 },
  stageOptionActive: { backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#fce7f3' },
  stageEmoji:    { fontSize: 22 },
  stageLabel:    { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155' },
  stageCancelBtn:{ alignItems: 'center', padding: 14, marginTop: 4 },
});
