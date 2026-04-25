/**
 * app/mens-health.tsx
 * ─────────────────────────────────────────────────────────────
 * Bluom Men's Optimization Hub
 *
 * Three modes (chosen in mini quiz):
 *  NATURAL    — testosterone optimisation, recovery, longevity
 *  ENHANCED   — cycle tracking, PCT, health markers, harm reduction
 *  ATHLETE    — bodybuilder/powerlifter: peak week, conditioning,
 *               periodisation, competition prep
 *
 * Pulls from onboarding:
 *  fitnessGoal, activityLevel, sleepHours, stressLevel,
 *  weight, age, workoutPreference, coachingStyle, motivations
 *
 * Mini quiz: trainingMode, primaryGoal, yearsTraining, competitionFocus
 *
 * 4 tabs: Today | Track | Insights | Learn
 */

import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Dimensions,
  Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useAccessControl } from '@/hooks/useAccessControl';
import * as SecureStore from 'expo-secure-store';

const { width: SW } = Dimensions.get('window');
const QUIZ_KEY = 'bluom_mens_quiz_v1';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type TrainingMode = 'natural' | 'enhanced' | 'athlete';

interface MensProfile {
  trainingMode: TrainingMode;
  primaryGoal: string; // 'muscle' | 'strength' | 'fat_loss' | 'performance' | 'longevity' | 'recomp'
  yearsTraining: string; // 'beginner' | 'intermediate' | 'advanced' | 'veteran'
  competitionFocus: string; // 'bodybuilding' | 'powerlifting' | 'crossfit' | 'sport' | 'none'
}

// ─────────────────────────────────────────────────────────────
// MINI QUIZ
// ─────────────────────────────────────────────────────────────
const MENS_QUIZ = [
  {
    id: 'trainingMode',
    emoji: '⚡',
    question: 'How would you describe your approach?',
    hint: 'Be honest — your guidance is personalised and private.',
    options: [
      { value: 'natural', label: 'Natural Athlete', icon: '🌿', desc: 'No performance-enhancing drugs' },
      { value: 'enhanced', label: 'Enhanced / PED User', icon: '💉', desc: 'Using or considering anabolic compounds' },
      { value: 'athlete', label: 'Competitive Athlete', icon: '🏆', desc: 'Competing or prepping to compete' },
    ],
  },
  {
    id: 'primaryGoal',
    emoji: '🎯',
    question: 'What is your primary goal right now?',
    options: [
      { value: 'muscle', label: 'Build Muscle', icon: '💪', desc: 'Hypertrophy & size' },
      { value: 'strength', label: 'Increase Strength', icon: '🏋️', desc: 'Raw power & 1RM' },
      { value: 'fat_loss', label: 'Shred & Cut', icon: '🔥', desc: 'Fat loss, preserve muscle' },
      { value: 'performance', label: 'Athletic Performance', icon: '⚡', desc: 'Speed, power, conditioning' },
      { value: 'longevity', label: 'Longevity & Health', icon: '❤️', desc: 'Long-term optimisation' },
      { value: 'recomp', label: 'Body Recomposition', icon: '⚖️', desc: 'Build muscle, lose fat simultaneously' },
    ],
  },
  {
    id: 'yearsTraining',
    emoji: '📅',
    question: 'How long have you been training seriously?',
    options: [
      { value: 'beginner', label: 'Under 1 year', icon: '🌱' },
      { value: 'intermediate', label: '1–3 years', icon: '📈' },
      { value: 'advanced', label: '3–7 years', icon: '🔥' },
      { value: 'veteran', label: '7+ years', icon: '🏆' },
    ],
  },
  {
    id: 'competitionFocus',
    emoji: '🥇',
    question: 'Do you compete or plan to?',
    options: [
      { value: 'none', label: 'No — training for myself', icon: '🧘' },
      { value: 'bodybuilding', label: 'Bodybuilding / Physique', icon: '💎' },
      { value: 'powerlifting', label: 'Powerlifting / Strongman', icon: '🏋️' },
      { value: 'crossfit', label: 'CrossFit / Functional', icon: '⚡' },
      { value: 'sport', label: 'Team / Combat Sport', icon: '🥊' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────
// MODE CONFIG
// ─────────────────────────────────────────────────────────────
const getModeConfig = (t: any): Record<TrainingMode, {
  label: string; emoji: string; tagline: string;
  gradient: [string, string]; accent: string; bg: string;
}> => ({
  natural: { label: t('mensHealth.modeNatural', 'Natural'), emoji: '🌿', tagline: t('mensHealth.taglineNatural', 'Testosterone Optimised'), gradient: ['#15803d', '#166534'], accent: '#4ade80', bg: '#f0fdf4' },
  enhanced: { label: t('mensHealth.modeEnhanced', 'Enhanced'), emoji: '💉', tagline: t('mensHealth.taglineEnhanced', 'Cycle Intelligence'), gradient: ['#1d4ed8', '#1e3a8a'], accent: '#60a5fa', bg: '#eff6ff' },
  athlete: { label: t('mensHealth.modeAthlete', 'Athlete'), emoji: '🏆', tagline: t('mensHealth.taglineAthlete', 'Competition Mode Active'), gradient: ['#92400e', '#78350f'], accent: '#fcd34d', bg: '#fffbeb' },
});

// ─────────────────────────────────────────────────────────────
// TESTOSTERONE OPTIMISATION SCORE (Natural)
// ─────────────────────────────────────────────────────────────
function getTOptScore(convexUser: any, drive: number, recovery: number, focus: number, sleep: number, t: any): {
  score: number; pillars: { name: string; score: number; tip: string; icon: string }[];
} {
  const pillars = [
    {
      name: t('mensHealth.pillarSleep', 'Sleep'), icon: '😴',
      score: sleep >= 8 ? 100 : sleep >= 7 ? 80 : sleep >= 6 ? 50 : 25,
      tip: sleep < 7 ? t('mensHealth.tipSleepLow', 'Under 7h sleep reduces testosterone by up to 15%. Prioritise 8h.') : t('mensHealth.tipSleepOk', 'Sleep is optimal for testosterone production.'),
    },
    {
      name: t('mensHealth.pillarStress', 'Stress'), icon: '🧠',
      score: convexUser?.stressLevel === 'low' ? 100 : convexUser?.stressLevel === 'moderate' ? 70 : 30,
      tip: convexUser?.stressLevel === 'high' || convexUser?.stressLevel === 'very_high' ? t('mensHealth.tipStressHigh', 'High cortisol directly suppresses testosterone. Ashwagandha + meditation.') : t('mensHealth.tipStressOk', 'Stress well managed.'),
    },
    {
      name: t('mensHealth.pillarDrive', 'Drive'), icon: '🔥',
      score: drive * 10,
      tip: drive <= 4 ? t('mensHealth.tipDriveLow', 'Low libido is an early signal of suboptimal testosterone or elevated prolactin.') : t('mensHealth.tipDriveOk', 'Drive levels healthy.'),
    },
    {
      name: t('mensHealth.pillarRecovery', 'Recovery'), icon: '⚡',
      score: recovery * 10,
      tip: recovery <= 4 ? t('mensHealth.tipRecoveryLow', 'Poor recovery elevates cortisol and impairs testosterone synthesis. Check sleep + zinc.') : t('mensHealth.tipRecoveryOk', 'Recovery tracking well.'),
    },
    {
      name: t('mensHealth.pillarFocus', 'Focus'), icon: '🎯',
      score: focus * 10,
      tip: focus <= 4 ? t('mensHealth.tipFocusLow', 'Low mental clarity is linked to suboptimal testosterone and high cortisol.') : t('mensHealth.tipFocusOk', 'Cognitive function healthy.'),
    },
    {
      name: t('mensHealth.pillarActivity', 'Activity'), icon: '💪',
      score: convexUser?.activityLevel === 'very_active' || convexUser?.activityLevel === 'extremely_active' ? 90 : convexUser?.activityLevel === 'moderately_active' ? 70 : 40,
      tip: t('mensHealth.tipActivity', 'Resistance training 3–4x/week is the most evidence-based testosterone booster.'),
    },
  ];
  const score = Math.round(pillars.reduce((s, p) => s + p.score, 0) / pillars.length);
  return { score, pillars };
}

// ─────────────────────────────────────────────────────────────
// CYCLE STATUS (Enhanced)
// ─────────────────────────────────────────────────────────────
const getCyclePhases = (t: any) => [
  { id: 'off', label: t('mensHealth.phaseOff', 'Off Cycle'), color: '#64748b', desc: t('mensHealth.phaseOffDesc', 'Natural hormone production recovering. Focus on health markers and natural optimisation.') },
  { id: 'blast', label: t('mensHealth.phaseBlast', 'On Blast'), color: '#dc2626', desc: t('mensHealth.phaseBlastDesc', 'Peak anabolic phase. Maximise training stimulus, track blood pressure and organ stress markers.') },
  { id: 'cruise', label: t('mensHealth.phaseCruise', 'Cruising'), color: '#2563eb', desc: t('mensHealth.phaseCruiseDesc', 'Maintenance dose. Bridge between blasts. Monitor haematocrit and lipids regularly.') },
  { id: 'pct', label: t('mensHealth.phasePCT', 'PCT'), color: '#d97706', desc: t('mensHealth.phasePCTDesc', 'Post-cycle therapy. HPTA restart in progress. Prioritise recovery, sleep, and health markers.') },
];

// ─────────────────────────────────────────────────────────────
// SUPPLEMENT STACKS
// ─────────────────────────────────────────────────────────────
function getSupplementStack(
  profile: MensProfile | null,
  convexUser: any,
  cyclePhase: string | undefined,
  t: any
): { name: string; dose: string; reason: string; evidence: string; timing: string; priority: 'core' | 'optional' | 'critical' }[] {
  if (!profile) return [];
  const stack: any[] = [];
  const goal = profile.primaryGoal;
  const mode = profile.trainingMode;
  const stress = convexUser?.stressLevel;
  const sleep = convexUser?.sleepHours;
  const age = convexUser?.age;

  // ── Universal ──
  stack.push({ 
      name: t(`mensHealth.supps.${'Vitamin D3 + K2'}.name`, 'Vitamin D3 + K2'), 
      dose: '5000 IU + 200mcg', 
      reason: t(`mensHealth.supps.${'Vitamin D3 + K2'}.reason`, 'Critical for testosterone synthesis; 80% of men are deficient'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Vitamin D3 + K2'}.timing`, 'Morning with fat'), 
      priority: 'core' 
    });
  stack.push({ 
      name: t(`mensHealth.supps.${'Magnesium Glycinate'}.name`, 'Magnesium Glycinate'), 
      dose: '400mg', 
      reason: t(`mensHealth.supps.${'Magnesium Glycinate'}.reason`, 'Increases free testosterone by up to 24%; improves deep sleep'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Magnesium Glycinate'}.timing`, 'Before bed'), 
      priority: 'core' 
    });
  stack.push({ 
      name: t(`mensHealth.supps.${'Zinc (Bisglycinate)'}.name`, 'Zinc (Bisglycinate)'), 
      dose: '30mg', 
      reason: t(`mensHealth.supps.${'Zinc (Bisglycinate)'}.reason`, 'Rate-limiting mineral for testosterone production and sperm health'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Zinc (Bisglycinate)'}.timing`, 'With dinner'), 
      priority: 'core' 
    });
  stack.push({ 
      name: t(`mensHealth.supps.${'Omega-3 (EPA/DHA)'}.name`, 'Omega-3 (EPA/DHA)'), 
      dose: '3000mg', 
      reason: t(`mensHealth.supps.${'Omega-3 (EPA/DHA)'}.reason`, 'Anti-inflammatory; supports cardiovascular health and testosterone'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Omega-3 (EPA/DHA)'}.timing`, 'With meals'), 
      priority: 'core' 
    });

  // ── Natural specific ──
  if (mode === 'natural') {
    if (stress === 'high' || stress === 'very_high') {
      stack.push({ 
      name: t(`mensHealth.supps.${'Ashwagandha KSM-66'}.name`, 'Ashwagandha KSM-66'), 
      dose: '600mg', 
      reason: t(`mensHealth.supps.${'Ashwagandha KSM-66'}.reason`, 'Reduces cortisol 30%; increases testosterone 17% in stressed men'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Ashwagandha KSM-66'}.timing`, 'With dinner or bed'), 
      priority: 'core' 
    });
    }
    if (goal === 'muscle' || goal === 'strength') {
      stack.push({ 
      name: t(`mensHealth.supps.${'Creatine Monohydrate'}.name`, 'Creatine Monohydrate'), 
      dose: '5g', 
      reason: t(`mensHealth.supps.${'Creatine Monohydrate'}.reason`, 'Most evidence-based ergogenic; increases strength, muscle, cognition'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Creatine Monohydrate'}.timing`, 'Any time (consistency matters)'), 
      priority: 'core' 
    });
    }
    if (goal === 'fat_loss') {
      stack.push({ 
      name: t(`mensHealth.supps.${'L-Carnitine L-Tartrate'}.name`, 'L-Carnitine L-Tartrate'), 
      dose: '2000mg', 
      reason: t(`mensHealth.supps.${'L-Carnitine L-Tartrate'}.reason`, 'Increases androgen receptor density; supports fat metabolism'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'L-Carnitine L-Tartrate'}.timing`, 'Pre-workout or morning'), 
      priority: 'optional' 
    });
    }
    if (age && age >= 35) {
      stack.push({ 
      name: t(`mensHealth.supps.${'Tongkat Ali (200:1 extract)'}.name`, 'Tongkat Ali (200:1 extract)'), 
      dose: '200–400mg', 
      reason: t(`mensHealth.supps.${'Tongkat Ali (200:1 extract)'}.reason`, 'Increases free testosterone by reducing SHBG; evidence-backed for men 35+'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'Tongkat Ali (200:1 extract)'}.timing`, 'Morning'), 
      priority: 'optional' 
    });
      stack.push({ 
      name: t(`mensHealth.supps.${'CoQ10 (Ubiquinol)'}.name`, 'CoQ10 (Ubiquinol)'), 
      dose: '200mg', 
      reason: t(`mensHealth.supps.${'CoQ10 (Ubiquinol)'}.reason`, 'Mitochondrial support; critical for energy and cardiovascular health over 35'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'CoQ10 (Ubiquinol)'}.timing`, 'With a fatty meal'), 
      priority: 'core' 
    });
    }
    if (sleep && sleep < 7) {
      stack.push({ 
      name: t(`mensHealth.supps.${'Apigenin'}.name`, 'Apigenin'), 
      dose: '50mg', 
      reason: t(`mensHealth.supps.${'Apigenin'}.reason`, 'Natural anxiolytic; binds GABA-A; improves sleep onset without dependency'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'Apigenin'}.timing`, '30 min before bed'), 
      priority: 'optional' 
    });
    }
  }

  // ── Enhanced specific ──
  if (mode === 'enhanced') {
    stack.push({ 
      name: t(`mensHealth.supps.${'TUDCA (Bile Acid)'}.name`, 'TUDCA (Bile Acid)'), 
      dose: '500mg', 
      reason: t(`mensHealth.supps.${'TUDCA (Bile Acid)'}.reason`, 'CRITICAL: Hepatoprotective agent; protects liver during oral compound use'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'TUDCA (Bile Acid)'}.timing`, 'With each oral dose'), 
      priority: 'critical' 
    });
    stack.push({ 
      name: t(`mensHealth.supps.${'NAC (N-Acetyl Cysteine)'}.name`, 'NAC (N-Acetyl Cysteine)'), 
      dose: '1200mg', 
      reason: t(`mensHealth.supps.${'NAC (N-Acetyl Cysteine)'}.reason`, 'Liver + cardiovascular protection; reduces oxidative stress from androgens'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'NAC (N-Acetyl Cysteine)'}.timing`, 'Morning and night'), 
      priority: 'critical' 
    });
    stack.push({ 
      name: t(`mensHealth.supps.${'Hawthorn Berry'}.name`, 'Hawthorn Berry'), 
      dose: '1000mg', 
      reason: t(`mensHealth.supps.${'Hawthorn Berry'}.reason`, 'Cardiovascular support; helps manage blood pressure elevation'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'Hawthorn Berry'}.timing`, 'Morning'), 
      priority: 'critical' 
    });
    stack.push({ 
      name: t(`mensHealth.supps.${'Celery Seed Extract'}.name`, 'Celery Seed Extract'), 
      dose: '75mg', 
      reason: t(`mensHealth.supps.${'Celery Seed Extract'}.reason`, 'Natural aromatase modulator; helps manage oestrogen'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'Celery Seed Extract'}.timing`, 'Morning'), 
      priority: 'optional' 
    });
    if (cyclePhase === 'pct') {
      stack.push({ 
      name: t(`mensHealth.supps.${'Clomiphene / Enclomiphene'}.name`, 'Clomiphene / Enclomiphene'), 
      dose: 'Per protocol', 
      reason: t(`mensHealth.supps.${'Clomiphene / Enclomiphene'}.reason`, 'HPTA restart; stimulates LH/FSH — consult a doctor'), 
      evidence: 'Prescription', 
      timing: t(`mensHealth.supps.${'Clomiphene / Enclomiphene'}.timing`, 'Per doctor protocol'), 
      priority: 'critical' 
    });
      stack.push({ 
      name: t(`mensHealth.supps.${'HCG (if used)'}.name`, 'HCG (if used)'), 
      dose: 'Per protocol', 
      reason: t(`mensHealth.supps.${'HCG (if used)'}.reason`, 'Maintains testicular volume and function during cycle'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'HCG (if used)'}.timing`, 'Per protocol'), 
      priority: 'critical' 
    });
    }
    stack.push({ 
      name: t(`mensHealth.supps.${'Creatine Monohydrate'}.name`, 'Creatine Monohydrate'), 
      dose: '5g', 
      reason: t(`mensHealth.supps.${'Creatine Monohydrate'}.reason`, 'Amplifies anabolic signalling; synergistic with AAS'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Creatine Monohydrate'}.timing`, 'Any time'), 
      priority: 'core' 
    });
  }

  // ── Athlete/Competition ──
  if (mode === 'athlete') {
    stack.push({ 
      name: t(`mensHealth.supps.${'Beta-Alanine'}.name`, 'Beta-Alanine'), 
      dose: '3.2g', 
      reason: t(`mensHealth.supps.${'Beta-Alanine'}.reason`, 'Increases carnosine; delays muscular fatigue; improves training volume'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Beta-Alanine'}.timing`, 'Pre-workout'), 
      priority: 'core' 
    });
    stack.push({ 
      name: t(`mensHealth.supps.${'Citrulline Malate'}.name`, 'Citrulline Malate'), 
      dose: '8g', 
      reason: t(`mensHealth.supps.${'Citrulline Malate'}.reason`, 'Increases blood flow, pump and endurance; reduces soreness'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Citrulline Malate'}.timing`, '60 min pre-workout'), 
      priority: 'core' 
    });
    stack.push({ 
      name: t(`mensHealth.supps.${'Creatine Monohydrate'}.name`, 'Creatine Monohydrate'), 
      dose: '5g', 
      reason: t(`mensHealth.supps.${'Creatine Monohydrate'}.reason`, 'Non-negotiable for strength and power athletes'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Creatine Monohydrate'}.timing`, 'Post-workout or morning'), 
      priority: 'core' 
    });
    if (profile.competitionFocus === 'bodybuilding') {
      stack.push({ 
      name: t(`mensHealth.supps.${'Digestive Enzymes'}.name`, 'Digestive Enzymes'), 
      dose: '2 caps', 
      reason: t(`mensHealth.supps.${'Digestive Enzymes'}.reason`, 'High protein intake (300g+) requires enzyme support to avoid GI distress'), 
      evidence: 'Grade B', 
      timing: t(`mensHealth.supps.${'Digestive Enzymes'}.timing`, 'With each protein meal'), 
      priority: 'optional' 
    });
    }
    if (profile.competitionFocus === 'powerlifting') {
      stack.push({ 
      name: t(`mensHealth.supps.${'Caffeine'}.name`, 'Caffeine'), 
      dose: '3–6mg/kg', 
      reason: t(`mensHealth.supps.${'Caffeine'}.reason`, 'Improves peak strength output by 2–5% on competition day'), 
      evidence: 'Grade A', 
      timing: t(`mensHealth.supps.${'Caffeine'}.timing`, '45–60 min pre-lift'), 
      priority: 'optional' 
    });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return stack.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }).slice(0, 8);
}

// ─────────────────────────────────────────────────────────────
// LEARN ARTICLES
// ─────────────────────────────────────────────────────────────
const LEARN_ARTICLES = [
  { id: 'tBlueprint', emoji: '🧬', category: 'Hormones', time: '6 min', title: 'The Testosterone Blueprint', body: 'Testosterone peaks at 6–8am and is lowest at night. Sleep is the single biggest lever — one week of 5h sleep reduces testosterone to castrate levels in young men. The protocol: 8h sleep, resistance training 4x/week, zinc 30mg, vitamin D3 5000IU, and cortisol management. These four levers alone can raise total testosterone 20–30% in deficient men.' },
  { id: 'sleepTesto', emoji: '💤', category: 'Recovery', time: '5 min', title: 'Sleep & Testosterone: The Hard Science', body: 'REM sleep is when 95% of daily testosterone is produced. Every hour below 8 reduces output proportionally. Alcohol at night suppresses GH release by 70%. The magnesium-sleep-testosterone triangle: magnesium deficiency impairs sleep quality, which impairs testosterone, which reduces magnesium uptake. Fix all three simultaneously.' },
  { id: 'trainingMax', emoji: '🏋️', category: 'Training', time: '7 min', title: 'Training for Maximum Testosterone Response', body: 'Compound lifts (squat, deadlift, bench, row) with high intensity (75–90% 1RM) produce the greatest testosterone response. Keep sessions under 60 minutes — cortisol rises sharply after. Rest 90–120 seconds between sets for hormonal response. Overtraining suppresses testosterone; under-recovery does too. Periodise: 3 weeks hard, 1 week deload.' },
  { id: 'eatingTesto', emoji: '🥩', category: 'Nutrition', time: '5 min', title: 'Eating for Testosterone', body: 'Fat is the raw material of testosterone — dropping below 20% dietary fat crashes testosterone. Cholesterol from eggs and red meat is not the enemy; it\'s the precursor. Zinc from red meat and oysters, selenium from Brazil nuts (2/day), and saturated fat from whole food sources are the dietary cornerstones. Avoid chronic calorie restriction — it\'s the fastest way to suppress hormonal output.' },
  { id: 'cortisolEnemy', emoji: '🧠', category: 'Cognition', time: '4 min', title: 'Cortisol: Testosterone\'s Arch Enemy', body: 'Cortisol and testosterone are directly antagonistic. Every cortisol spike suppresses Leydig cell function and reduces testosterone synthesis. The most effective cortisol management tools: consistent sleep schedule, ashwagandha KSM-66 (600mg), B-complex supplementation, removing chronic stressors, and limiting caffeine after 12pm.' },
  { id: 'harmReduction', emoji: '💉', category: 'Enhanced', time: '8 min', title: 'Harm Reduction for PED Users', body: 'The greatest risk for enhanced athletes is cardiovascular: left ventricular hypertrophy, elevated haematocrit, and dyslipidaemia. Non-negotiables: blood tests every 8 weeks (lipids, CBC, liver enzymes, hormones, PSA over 40), cardiovascular exercise 4x/week, TUDCA + NAC for organ protection, BP monitoring, and minimum 1:1 cycle-to-off ratio. Never blast without a health baseline.' },
  { id: 'peakWeek', emoji: '🏆', category: 'Compete', time: '6 min', title: 'Peak Week: The Science of Coming In Dry', body: 'Peak week for bodybuilding is about glycogen supercompensation, not extreme dehydration. Protocol: 4 days moderate carb depletion, 3 days carb load (600–800g/day), water manipulation (not elimination) in final 24 hours. Sodium manipulation: reduce 2 days out, not eliminate. Potassium-rich foods (banana, avocado) in final days improve definition. Diuretics: only with medical supervision.' },
  { id: 'bloodTests', emoji: '🧪', category: 'Labs', time: '5 min', title: 'Which Blood Tests Every Man Should Track', body: 'Baseline panel: Total Testosterone, Free Testosterone, SHBG, LH, FSH, Oestradiol, DHEA-S, Prolactin, CBC, CMP (liver/kidney), lipid panel (LDL, HDL, triglycerides), Vitamin D, ferritin, HbA1c. Enhanced users add: haematocrit, PSA (over 40), thyroid panel (TSH, T3, T4). Test in the morning (7–9am) in a fasted state for accurate baseline.' },
];

// ─────────────────────────────────────────────────────────────
// HEALTH MARKERS (Enhanced mode)
// ─────────────────────────────────────────────────────────────
const HEALTH_MARKERS = [
  { id: 'bp', label: 'Blood Pressure', unit: 'mmHg', normal: '< 120/80', warning: '> 130/85', icon: '❤️', tip: 'Check weekly on cycle. Hawthorn berry + celery seed if elevated.' },
  { id: 'hct', label: 'Haematocrit', unit: '%', normal: '38–50%', warning: '> 52%', icon: '🩸', tip: 'Elevated HCT = blood clot risk. Donate blood or reduce compound dose.' },
  { id: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', normal: '< 100', warning: '> 130', icon: '🧪', tip: 'AAS crush HDL and raise LDL. Niacin + fish oil + cardio are your tools.' },
  { id: 'liver', label: 'ALT (Liver)', unit: 'U/L', normal: '7–56', warning: '> 80', icon: '🫀', tip: 'Elevated ALT = hepatic stress. TUDCA + NAC mandatory. Stop orals if > 3x normal.' },
  { id: 'psa', label: 'PSA (40+)', unit: 'ng/mL', normal: '< 4', warning: '> 4', icon: '🔬', tip: 'AAS can accelerate prostate growth. Annual PSA test for all enhanced users over 40.' },
];

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function MensHealthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const today = new Date().toISOString().slice(0, 10);

  // @ts-ignore
  const history = useQuery(api.mensHealth.getVitalityHistory, convexUser?._id ? { userId: convexUser._id, days: 7 } : 'skip');
  // @ts-ignore
  const status = useQuery(api.mensHealth.getOptimizationStatus, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const wellnessLog = useQuery(api.wellness.getTodayLog, convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const sleepLogsQuery = useQuery(api.wellness.getSleepLogs, convexUser?._id ? { userId: convexUser._id, startDate: today, endDate: today } : 'skip');
  // @ts-ignore
  const logSession = useMutation(api.mensHealth.logSession);
  // @ts-ignore
  const logSupps = useMutation(api.mensHealth.logSupplement);

  // ── Quiz state ──
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizDone, setQuizDone] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Partial<MensProfile>>({});
  const [profile, setProfile] = useState<MensProfile | null>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<'today' | 'track' | 'insights' | 'learn'>('today');
  const [showVitality, setShowVitality] = useState(false);
  const [showPelvic, setShowPelvic] = useState(false);
  const [showSupps, setShowSupps] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);
  const [showPeakWeek, setShowPeakWeek] = useState(false);
  const [showArticle, setShowArticle] = useState<typeof LEARN_ARTICLES[0] | null>(null);
  const [showCycleSetup, setShowCycleSetup] = useState(false);

  // ── Vitality state ──
  const [drive, setDrive] = useState(5);
  const [recovery, setRecovery] = useState(5);
  const [focus, setFocus] = useState(5);
  const [sleep, setSleep] = useState(convexUser?.sleepHours ?? 7);

  const todaySleep = sleepLogsQuery?.[0]?.hours;
  useEffect(() => {
    if (todaySleep !== undefined) {
      setSleep(todaySleep);
    } else if (convexUser?.sleepHours !== undefined) {
      setSleep(convexUser.sleepHours);
    }
  }, [todaySleep, convexUser?.sleepHours]);

  // ── Enhanced cycle ──
  const [cyclePhase, setCyclePhase] = useState('off');
  const [cycleWeek, setCycleWeek] = useState(1);
  const [cycleLength, setCycleLength] = useState(12);
  const [markerValues, setMarkerValues] = useState<Record<string, string>>({});

  // ── Pelvic timer ──
  const [kegelActive, setKegelActive] = useState(false);
  const [kegelSecs, setKegelSecs] = useState(0);
  const [kegelMsg, setKegelMsg] = useState('READY');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Peak week ──
  const [peakWeekDay, setPeakWeekDay] = useState(7); // days to show
  const [carbLoad, setCarbLoad] = useState(false);

  // ── Load quiz ──
  useEffect(() => {
    SecureStore.getItemAsync(QUIZ_KEY).then(val => {
      if (val) { try { setProfile(JSON.parse(val)); setQuizDone(true); } catch { } }
      setQuizLoading(false);
    });
  }, []);

  useEffect(() => {
    if (quizDone) Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [quizDone]);

  // ── Kegel timer ──
  useEffect(() => {
    let interval: any;
    if (kegelActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ])).start();
      interval = setInterval(() => {
        setKegelSecs(s => {
          const next = s + 1;
          const cycle = next % 10;
          setKegelMsg(cycle < 5 ? 'SQUEEZE ⚡' : 'RELAX 🌬️');
          return next;
        });
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      setKegelSecs(0);
      setKegelMsg('READY');
    }
    return () => clearInterval(interval);
  }, [kegelActive]);

  // ── Derived ──
  const mc = useMemo(() => {
    const config = getModeConfig(t);
    return profile ? config[profile.trainingMode] : config.natural;
  }, [profile, t]);

  const tOpt = useMemo(() => getTOptScore(convexUser, drive, recovery, focus, sleep, t), [convexUser, drive, recovery, focus, sleep, t]);
  const supps = useMemo(() => getSupplementStack(profile, convexUser, cyclePhase, t), [profile, convexUser, cyclePhase, t]);

  const phases = getCyclePhases(t);
  const currentPhaseConfig = phases.find((p: any) => p.id === cyclePhase) ?? phases[0];

  // ── Quiz ──
  const handleQuizOption = async (value: string) => {
    const step = MENS_QUIZ[quizStep];
    const updated = { ...quizAnswers, [step.id]: value };
    setQuizAnswers(updated);
    if (quizStep < MENS_QUIZ.length - 1) {
      setQuizStep(s => s + 1);
    } else {
      const p = updated as MensProfile;
      setProfile(p);
      await SecureStore.setItemAsync(QUIZ_KEY, JSON.stringify(p));
      setQuizDone(true);
    }
  };

  // ── Save vitality ──
  const handleSaveVitality = async () => {
    if (!convexUser?._id) return;
    try {
      await logSession({ userId: convexUser._id, date: today, duration: 0, drive, recovery, focus });
      Alert.alert(t('common.success', 'Success'), `${t('mensHealth.tOptScore', 'T-OPT SCORE')}: ${tOpt.score}%`);
      setShowVitality(false);
    } catch { Alert.alert(t('common.error', 'Error'), t('common.couldNotSave', 'Could not save.')); }
  };

  // ── Save pelvic ──
  const handleFinishPelvic = async () => {
    if (!convexUser?._id) return;
    setKegelActive(false);
    try {
      await logSession({ userId: convexUser._id, date: today, duration: kegelSecs, drive, recovery, focus });
      Alert.alert(t('mensHealth.protocolComplete', 'Protocol Complete'), `${Math.floor(kegelSecs / 60)}:${String(kegelSecs % 60).padStart(2, '0')} ${t('common.logged', 'logged')}.`);
      setShowPelvic(false);
    } catch { }
  };

  // ── Save supps ──
  const handleSaveSupps = async () => {
    if (!convexUser?._id) return;
    try {
      await logSupps({ userId: convexUser._id, date: today, items: supps.map(s => ({ name: s.name, dosage: s.dose, taken: true })), cyclePhase });
      Alert.alert(t('mensHealth.stackLogged', 'Stack Logged'), t('mensHealth.stackLoggedMsg', 'Supplement intake recorded.'));
      setShowSupps(false);
    } catch { }
  };

  // ─────────────────────────────────────────────────────────
  // QUIZ SCREEN
  // ─────────────────────────────────────────────────────────
  if (quizLoading) return <SafeAreaView style={s.screen} edges={['top']}><ActivityIndicator style={{ flex: 1 }} color="#60a5fa" /></SafeAreaView>;

  if (!quizDone) {
    const step = MENS_QUIZ[quizStep];
    return (
      <SafeAreaView style={s.quizScreen} edges={['top', 'bottom']}>
        <View style={s.quizTopBar}>
          <TouchableOpacity onPress={() => quizStep > 0 ? setQuizStep(p => p - 1) : router.back()} style={s.quizBack}>
            <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
          </TouchableOpacity>
          <View style={s.quizProgress}>
            <View style={[s.quizProgressFill, { width: `${((quizStep + 1) / MENS_QUIZ.length) * 100}%` as any }]} />
          </View>
          <Text style={s.quizStepNum}>{quizStep + 1}/{MENS_QUIZ.length}</Text>
        </View>

        {quizStep === 0 && (
          <LinearGradient colors={['#0f172a', '#1e293b']} style={s.quizHero}>
            <Text style={s.quizHeroEmoji}>⚡</Text>
            <Text style={s.quizHeroTitle}>{t('mensHealth.optimizationHub', 'Optimization Hub')}</Text>
            <Text style={s.quizHeroSub}>
              {t('mensHealth.quizHeroSub', '4 perguntas para construir o teu protocolo — desde otimização natural de testosterona até gestão de atletas avançados. Todos os dados são privados.')}
            </Text>
            {convexUser && (
              <View style={s.quizKnowBox}>
                <Text style={s.quizKnowTitle}>✦ {t('mensHealth.alreadyLoaded', 'Já carregado do teu perfil')}</Text>
                {convexUser.fitnessGoal && <Text style={s.quizKnowItem}>🎯 Goal: {convexUser.fitnessGoal.replace(/_/g, ' ')}</Text>}
                {convexUser.activityLevel && <Text style={s.quizKnowItem}>⚡ Activity: {convexUser.activityLevel.replace(/_/g, ' ')}</Text>}
                {convexUser.stressLevel && <Text style={s.quizKnowItem}>🧠 Stress: {convexUser.stressLevel}</Text>}
                {convexUser.sleepHours && <Text style={s.quizKnowItem}>😴 Sleep: {convexUser.sleepHours}h avg</Text>}
                {convexUser.age && <Text style={s.quizKnowItem}>📅 Age: {convexUser.age}</Text>}
                {convexUser.weight && <Text style={s.quizKnowItem}>⚖️ Weight: {convexUser.weight}kg</Text>}
              </View>
            )}
          </LinearGradient>
        )}

        <ScrollView contentContainerStyle={s.quizBody} keyboardShouldPersistTaps="handled">
          <Text style={s.quizEmoji}>{step.emoji}</Text>
          <Text style={s.quizQuestion}>{t(`mensHealth.quiz.q.${step.id}`, step.question)}</Text>
          {'hint' in step && step.hint && <Text style={s.quizHint}>{t(`mensHealth.quiz.hint.${step.id}`, step.hint)}</Text>}
          <View style={s.quizOptions}>
            {'options' in step && step.options.map((opt: any) => (
              <TouchableOpacity key={opt.value} style={s.quizOption} onPress={() => handleQuizOption(opt.value)} activeOpacity={0.8}>
                <Text style={s.quizOptionIcon}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.quizOptionLabel}>{t(`mensHealth.quiz.${opt.value}`, opt.label) as string}</Text>
                  {('desc' in opt && opt.desc) ? <Text style={s.quizOptionDesc}>{t(`mensHealth.quiz.${opt.value}Desc`, opt.desc) as string}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
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

      {/* Article modal */}
      {showArticle && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <View style={[s.articleHeader, { paddingTop: insets.top + 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.articleCategory}>{showArticle.emoji} {t(`mensHealth.categories.${showArticle.category}`, showArticle.category)} · {showArticle.time}</Text>
                <Text style={s.articleTitle}>{t(`mensHealth.articles.${showArticle.id}.title`, showArticle.title)}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowArticle(null)} style={s.articleClose}>
                <Ionicons name="close" size={20} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <Text style={s.articleBody}>{t(`mensHealth.articles.${showArticle.id}.body`, showArticle.body)}</Text>
              <View style={s.articleDisclaimer}>
                <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                <Text style={s.articleDisclaimerTxt}>{t('mensHealth.articleDisclaimer','Conteúdo educativo, não aconselhamento médico. Consulta sempre um médico para orientação personalizada.')}</Text>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Vitality Check-in Modal */}
      <Modal visible={showVitality} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top']}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('mensHealth.vitalityCheckin','Registo de Vitalidade')}</Text>
              <TouchableOpacity onPress={() => setShowVitality(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color="#e2e8f0" />
              </TouchableOpacity>
            </View>

            <Text style={s.modalSub}>{t('mensHealth.vitalitySub','Avalia cada pilar honestamente. O teu T-Opt score atualiza em tempo real.')}</Text>

            {/* T-Opt live score */}
            <View style={s.tOptLive}>
              <Text style={s.tOptLiveLabel}>{t('mensHealth.tOptScore', 'T-OPT SCORE')}</Text>
              <Text style={[s.tOptLiveVal, { color: tOpt.score >= 70 ? '#4ade80' : tOpt.score >= 50 ? '#fcd34d' : '#f87171' }]}>{tOpt.score}%</Text>
            </View>
            {[
              { label: t('mensHealth.drivePillar','Vitalidade / Líbido'), value: drive, onChange: setDrive, icon: 'flame-outline', color: '#ef4444' },
              { label: t('mensHealth.recoveryPillar','Estado de Recuperação'), value: recovery, onChange: setRecovery, icon: 'battery-charging-outline', color: '#4ade80' },
              { label: t('mensHealth.focusPillar','Foco Mental'), value: focus, onChange: setFocus, icon: 'eye-outline', color: '#60a5fa' },
              { label: t('mensHealth.sleepPillar','Qualidade do Sono'), value: sleep, onChange: setSleep, icon: 'moon-outline', color: '#a78bfa' },
            ].map(item => (
              <View key={item.label} style={s.sliderWrap}>
                <View style={s.sliderHeader}>
                  <View style={s.sliderLeft}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                    <Text style={s.sliderLabel}>{item.label}</Text>
                  </View>
                  <Text style={[s.sliderVal, { color: item.color }]}>{item.value}/10</Text>
                </View>
                <View style={s.sliderTrack}>
                  <View style={[s.sliderFill, { width: `${item.value * 10}%` as any, backgroundColor: item.color }]} />
                </View>
                <View style={s.sliderDots}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <TouchableOpacity key={n} style={[s.sliderDot, item.value >= n && { backgroundColor: item.color, borderColor: item.color }]} onPress={() => item.onChange(n)}>
                      <Text style={[s.sliderDotTxt, item.value >= n && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Mood sync */}
            <View style={s.moodSync}>
              <Ionicons name="sync" size={14} color="#a78bfa" />
              <Text style={s.moodSyncTxt}>{t('mensHealth.moodSynced','Humor sincronizado do Wellness')}: {wellnessLog?.moodEmoji ?? '—'}</Text>
            </View>

              <TouchableOpacity style={[s.saveBtn, { backgroundColor: mc.gradient[0] }]} onPress={handleSaveVitality}>
                <Text style={s.saveBtnTxt}>{t('mensHealth.updateStatus','Atualizar Estado do Sistema')}</Text>
              </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pelvic Protocol Modal */}
      <Modal visible={showPelvic} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={s.pelvicTitle}>{t('mensHealth.pelvicTitle','Protocolo de Poder Pélvico')}</Text>
          <Text style={s.pelvicSub}>{t('mensHealth.pelvicSub','Melhora a função erétil, controlo urinário, desempenho sexual e estabilidade do core.')}</Text>
          <Animated.View style={[s.timerCircle, { transform: [{ scale: pulseAnim }], borderColor: kegelActive ? '#60a5fa' : '#334155', backgroundColor: kegelActive ? 'rgba(96,165,250,0.1)' : '#1e293b' }]}>
            <Text style={s.timerTime}>{String(Math.floor(kegelSecs / 60)).padStart(2, '0')}:{String(kegelSecs % 60).padStart(2, '0')}</Text>
            <Text style={[s.timerMsg, { color: kegelActive ? '#60a5fa' : '#64748b' }]}>{kegelMsg}</Text>
          </Animated.View>
          <Text style={s.pelvicInstructions}>{t('mensHealth.pelvicInstructions','Contrai 5s → Relaxa 5s → Repete. 10–15 ciclos. Prática diária dá resultados em 4–6 semanas.')}</Text>
          <View style={s.pelvicActions}>
            {!kegelActive ? (
              <TouchableOpacity style={s.pelvicStartBtn} onPress={() => setKegelActive(true)}>
                <Text style={s.pelvicStartTxt}>{t('mensHealth.startProtocol','Iniciar Protocolo')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.pelvicFinishBtn} onPress={handleFinishPelvic}>
                <Text style={s.pelvicFinishTxt}>{t('mensHealth.finishLog','Terminar & Registar')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setKegelActive(false); setShowPelvic(false); }} style={{ marginTop: 16 }}>
              <Text style={{ color: '#64748b', fontWeight: '600' }}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Supplement Stack Modal */}
      <Modal visible={showSupps} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={[s.modalHeader, { paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>{t('mensHealth.yourStack', 'Your Stack')}</Text>
              <Text style={[s.modalSub, { marginTop: 2 }]}>{mc.emoji} {t(`mensHealth.${profile?.trainingMode || 'natural'}`, mc.label)} {t('mensHealth.protocolShort', 'protocol')} · {supps.length} {t('mensHealth.compounds', 'compounds')}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSupps(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

            <View style={{ marginTop: 10 }}>
              {!isPro && (
                <View style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="lock-closed" size={24} color="#fcd34d" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{t('mensHealth.unlockStack','Desbloqueia o Teu Stack')}</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{t('mensHealth.upgradeToPro','Atualizar para Pro')} to see personalised recommendations tailored to your goals.</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setShowSupps(false); router.push('/premium' as any); }}>
                    <Text style={{ color: mc.accent, fontWeight: '700' }}>{t('common.upgrade', 'Upgrade')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Priority grouping */}
              {(['critical', 'core', 'optional'] as const).map(priority => {
                const group = supps.filter(s => s.priority === priority);
                if (group.length === 0) return null;
                return (
                  <View key={priority} style={{ marginBottom: 20 }}>
                    <View style={s.suppGroupHeader}>
                      <View style={[s.suppGroupDot, { backgroundColor: priority === 'critical' ? '#ef4444' : priority === 'core' ? '#4ade80' : '#64748b' }]} />
                      <Text style={s.suppGroupLabel}>{priority === 'critical' ? t('mensHealth.suppCritical', '⚠️ Critical') : priority === 'core' ? t('mensHealth.suppCore', '✅ Core Stack') : t('mensHealth.suppOptional', '💡 Optional')}</Text>
                    </View>
                    {group.map((supp, i) => (
                      <View key={i} style={s.suppCard}>
                        <View style={s.suppTop}>
                          <Text style={s.suppName}>{isPro ? supp.name : '••••••••••••••••'}</Text>
                          <View style={[s.evidenceBadge, { backgroundColor: supp.evidence === 'Grade A' ? '#14532d' : supp.evidence === 'Prescription' ? '#7f1d1d' : '#422006' }]}>
                            <Text style={[s.evidenceTxt, { color: supp.evidence === 'Grade A' ? '#4ade80' : supp.evidence === 'Prescription' ? '#fca5a5' : '#fcd34d' }]}>{supp.evidence}</Text>
                          </View>
                        </View>
                        <Text style={s.suppDose}>💊 {isPro ? supp.dose : '•••'} · ⏰ {isPro ? supp.timing : '••••'}</Text>
                        <Text style={s.suppReason}>{isPro ? supp.reason : t('mensHealth.suppLocked', 'Personalisation locked for free users.')}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: mc.gradient[0] }]} onPress={handleSaveSupps}>
              <Text style={s.saveBtnTxt}>{t('mensHealth.logStack','Registar Stack de Hoje')}</Text>
            </TouchableOpacity>
            <View style={s.suppDisclaimer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#475569" />
              <Text style={s.suppDisclaimerTxt}>{t('mensHealth.suppDisclaimer', 'Always consult a doctor before starting supplements, especially if using medications or on cycle.')}</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Health Markers Modal (Enhanced) */}
      <Modal visible={showMarkers} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={[s.modalHeader, { paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }]}>
            <Text style={s.modalTitle}>{t('mensHealth.healthMarkers', 'Health Markers')}</Text>
            <TouchableOpacity onPress={() => setShowMarkers(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Text style={[s.modalSub, { marginBottom: 20 }]}>
              {t('mensHealth.healthMarkersSub', 'Log your most recent lab values and blood pressure readings. Track trends over time.')}
            </Text>
            {HEALTH_MARKERS.map(marker => (
              <View key={marker.id} style={s.markerCard}>
                <View style={s.markerTop}>
                  <Text style={s.markerIcon}>{marker.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.markerName}>{t(`mensHealth.markers.${marker.id}.label`, marker.label)}</Text>
                    <Text style={s.markerNormal}>{t('mensHealth.normal', 'Normal')}: {marker.normal} · {t('mensHealth.warning', 'Warning')}: {marker.warning}</Text>
                  </View>
                </View>
                <TextInput
                  style={s.markerInput}
                  placeholder={t('mensHealth.markerPlaceholder', { unit: marker.unit, defaultValue: `Enter ${marker.unit}...` })}
                  placeholderTextColor="#475569"
                  value={markerValues[marker.id] ?? ''}
                  onChangeText={val => setMarkerValues(p => ({ ...p, [marker.id]: val }))}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={s.markerTip}>💡 {t(`mensHealth.markers.${marker.id}.tip`, marker.tip)}</Text>
              </View>
            ))}
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: mc.gradient[0] }]} onPress={() => { Alert.alert(t('common.saved', 'Saved'), t('mensHealth.markersLogged', 'Health markers logged.')); setShowMarkers(false); }}>
              <Text style={s.saveBtnTxt}>{t('mensHealth.saveMarkers','Guardar Marcadores')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Peak Week Modal (Athlete) */}
      <Modal visible={showPeakWeek} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={[s.modalHeader, { paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }]}>
            <Text style={s.modalTitle}>{t('mensHealth.peakWeekProtocol', 'Peak Week Protocol')}</Text>
            <TouchableOpacity onPress={() => setShowPeakWeek(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Text style={s.modalSub}>{t('mensHealth.daysToShow', 'Days to show')}: {peakWeekDay}</Text>
            <View style={s.peakDayRow}>
              {[7, 6, 5, 4, 3, 2, 1].map(d => (
                <TouchableOpacity key={d} style={[s.peakDayBtn, peakWeekDay === d && { backgroundColor: '#d97706', borderColor: '#d97706' }]} onPress={() => setPeakWeekDay(d)}>
                  <Text style={[s.peakDayTxt, peakWeekDay === d && { color: '#fff' }]}>D-{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { day: 7, title: t('mensHealth.peakDay7Title', 'D-7: Last heavy session'), body: t('mensHealth.peakDay7Body', 'Deplete glycogen. Carbs: 1.5g/kg. Moderate sodium. Normal water intake.') },
              { day: 6, title: t('mensHealth.peakDay6Title', 'D-6: Depletion continues'), body: t('mensHealth.peakDay6Body', 'Low carb (1g/kg). High protein. Begin monitoring daily weight fluctuation.') },
              { day: 5, title: t('mensHealth.peakDay5Title', 'D-5: Muscle belly check'), body: t('mensHealth.peakDay5Body', 'Note muscle fullness and vascularity. Adjust carbs up if looking flat.') },
              { day: 4, title: t('mensHealth.peakDay4Title', 'D-4: Begin carb load'), body: t('mensHealth.peakDay4Body', 'Carbs: 4–6g/kg. Low-GI sources: sweet potato, rice, oats. Keep fat low.') },
              { day: 3, title: t('mensHealth.peakDay3Title', 'D-3: Peak carb load'), body: t('mensHealth.peakDay3Body', 'Carbs: 6–8g/kg. Watch for spill-over (blurring definition). Reduce if needed.') },
              { day: 2, title: t('mensHealth.peakDay2Title', 'D-2: Water management'), body: t('mensHealth.peakDay2Body', 'Reduce water slightly (not eliminate). Increase potassium foods. Last sodium manipulation.') },
              { day: 1, title: t('mensHealth.peakDay1Title', 'Show Day'), body: t('mensHealth.peakDay1Body', 'Sip water. Carb up backstage (rice cakes + honey). Pump up 20 min before stage. Trust your prep.') },
            ].filter(item => item.day >= peakWeekDay).slice(0, 1).map(item => (
              <View key={item.day} style={s.peakDayCard}>
                <Text style={s.peakDayCardTitle}>{item.title}</Text>
                <Text style={s.peakDayCardBody}>{item.body}</Text>
              </View>
            ))}

            <View style={s.carbLoadToggle}>
              <Text style={s.carbLoadLabel}>{t('mensHealth.carbLoadActive', 'Carb load active')}</Text>
              <Switch value={carbLoad} onValueChange={setCarbLoad} trackColor={{ false: '#334155', true: '#d97706' }} thumbColor="#fff" />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#0f172a', '#0f172a']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('mensHealth.optimizationHub', 'Optimization Hub')}</Text>
          <Text style={[s.headerSub, { color: mc.accent }]}>{mc.emoji} {mc.label} · {mc.tagline}</Text>
        </View>
        <View style={[s.scoreChip, { borderColor: mc.accent + '40' }]}>
          <Text style={[s.scoreChipVal, { color: mc.accent }]}>{status?.score ?? 0}%</Text>
          <Text style={s.scoreChipLbl}>{t('mensHealth.tabToday','Hoje')}</Text>
        </View>
        <TouchableOpacity onPress={() => { SecureStore.deleteItemAsync(QUIZ_KEY); setQuizDone(false); setQuizStep(0); setQuizAnswers({}); }} style={s.retakeBtn}>
          <Ionicons name="settings-outline" size={18} color="#64748b" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {[
          { id: 'today', label: t('mensHealth.tabToday','Hoje'), emoji: '⚡' },
          { id: 'track', label: t('mensHealth.tabTrack','Análise'), emoji: '📈' },
          { id: 'insights', label: t('mensHealth.tabInsights','Insights'), emoji: '💡' },
          { id: 'learn', label: t('mensHealth.tabLearn','Aprender'), emoji: '📚' },
        ].map(tab => (
          <TouchableOpacity key={tab.id} style={[s.tab, activeTab === tab.id && [s.tabActive, { borderBottomColor: mc.accent }]]} onPress={() => setActiveTab(tab.id as any)}>
            <Text style={s.tabEmoji}>{tab.emoji}</Text>
            <Text style={[s.tabLabel, activeTab === tab.id && { color: mc.accent, fontWeight: '800' }]}>{tab.label}</Text>
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
            {/* Mode hero */}
            <LinearGradient colors={mc.gradient} style={s.modeHero}>
              <View style={s.modeHeroTop}>
                <View>
                  <Text style={s.modeHeroMode}>{mc.emoji} {mc.label} {t('mensHealth.protocol', 'Protocol') as string}</Text>
                  <Text style={s.modeHeroGoal}>{t(`mensHealth.quiz.${profile?.primaryGoal}`, { defaultValue: profile?.primaryGoal?.replace(/_/g, ' ') }) as string} · {t(`mensHealth.quiz.${profile?.yearsTraining}`, { defaultValue: profile?.yearsTraining?.replace(/_/g, ' ') }) as string}</Text>
                  {profile?.competitionFocus && profile.competitionFocus !== 'none' && (
                    <Text style={s.modeHeroComp}>🏆 {profile.competitionFocus}</Text>
                  )}
                </View>
                <View style={s.modeHeroScore}>
                  <Text style={s.modeHeroScoreVal}>{profile?.trainingMode === 'natural' ? tOpt.score : status?.score ?? 0}%</Text>
                  <Text style={s.modeHeroScoreLbl}>{profile?.trainingMode === 'natural' ? 'T-Opt' : 'System'}</Text>
                </View>
              </View>

              {/* Natural: T-Opt bar */}
              {profile?.trainingMode === 'natural' && (
                <View style={s.tOptBar}>
                  <View style={[s.tOptBarFill, { width: `${tOpt.score}%` as any }]} />
                </View>
              )}

              {/* Enhanced: Cycle phase */}
              {profile?.trainingMode === 'enhanced' && (
                <View style={s.cyclePhaseRow}>
                  {phases.map((p: any) => (
                    <TouchableOpacity key={p.id} style={[s.cPhaseChip, cyclePhase === p.id && { backgroundColor: p.color + '33', borderColor: p.color }]} onPress={() => setCyclePhase(p.id)}>
                      <Text style={[s.cPhaseLabel, { color: cyclePhase === p.id ? p.color : '#64748b' }]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Athlete: Competition countdown */}
              {profile?.trainingMode === 'athlete' && (
                <View style={s.compRow}>
                  <Text style={s.compLabel}>{t('mensHealth.peakWeekTool', 'Peak Week Tool')}</Text>
                  <TouchableOpacity style={s.compBtn} onPress={() => setShowPeakWeek(true)}>
                    <Text style={s.compBtnTxt}>{t('mensHealth.openProtocol', 'Open Protocol →')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>

            {/* Enhanced: cycle phase description */}
            {profile?.trainingMode === 'enhanced' && (
              <View style={[s.cyclePhaseCard, { borderLeftColor: currentPhaseConfig.color }]}>
                <Text style={[s.cyclePhaseTitle, { color: currentPhaseConfig.color }]}>{currentPhaseConfig.label}</Text>
                <Text style={s.cyclePhaseDesc}>{currentPhaseConfig.desc}</Text>
              </View>
            )}

            {/* Daily protocols */}
            <Text style={s.sectionTitle}>{t('mensHealth.dailyProtocols','Protocolos Diários')}</Text>

            {/* Action tiles — adapt by mode */}
            {[
              {
                icon: 'stats-chart-outline', label: t('mensHealth.vitalityCheckin','Registo de Vitalidade'),
                sub: profile?.trainingMode === 'natural' ? `${t('mensHealth.tOptScore', 'T-OPT SCORE')}: ${tOpt.score}%` : t('mensHealth.vitalitySubline', 'Drive · Recovery · Focus'),
                color: mc.accent, onPress: () => setShowVitality(true),
              },
              {
                icon: 'fitness-outline', label: t('mensHealth.pelvicTitle','Protocolo de Poder Pélvico'),
                sub: t('mensHealth.pelvicActionSub', 'Core, função erétil & urinária'), color: '#4ade80', onPress: () => setShowPelvic(true),
              },
              {
                icon: 'flask-outline', label: t('mensHealth.supplementStack', 'Supplement Stack'),
                sub: `${supps.filter(s => s.priority === 'core').length} ${t('mensHealth.core', 'base')} · ${supps.filter(s => s.priority === 'critical').length} ${t('mensHealth.critical', 'crítico')}`,
                color: '#a78bfa', onPress: () => setShowSupps(true),
              },
              ...(profile?.trainingMode === 'enhanced' ? [{
                icon: 'heart-circle-outline', label: t('mensHealth.healthMarkers', 'Health Markers'),
                sub: 'BP · HCT · ALT · LDL · PSA', color: '#f87171', onPress: () => setShowMarkers(true),
              }] : []),
              ...(profile?.trainingMode === 'athlete' && profile.competitionFocus === 'bodybuilding' ? [{
                icon: 'trophy-outline', label: t('mensHealth.peakWeekProtocol', 'Peak Week Protocol'),
                sub: t('mensHealth.peakWeekSub', 'Carb load · water · stage prep'), color: '#fcd34d', onPress: () => setShowPeakWeek(true),
              }] : []),
            ].map((a, i) => (
              <TouchableOpacity key={i} style={s.actionTile} onPress={(a as any).onPress} activeOpacity={0.8}>
                <View style={[s.actionIcon, { backgroundColor: (a.color + '15') }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionLabel}>{a.label}</Text>
                  <Text style={s.actionSub}>{a.sub}</Text>
                </View>
                {(a as any).proLock && <View style={s.proChip}><Text style={s.proChipTxt}>Pro</Text></View>}
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ═══════════════ TRACK TAB ═══════════════ */}
        {activeTab === 'track' && (
          <>
            <Text style={s.sectionTitle}>{t('mensHealth.sevenDayTrend','Tendência de Vitalidade 7 Dias')}</Text>

            {/* History chart (simple bar rows) */}
            {history && history.length > 0 ? (
              <View style={s.historyChart}>
                {(history as any[]).slice(-7).map((log: any, i: number) => (
                  <View key={i} style={s.historyRow}>
                    <Text style={s.historyDate}>{log.date?.slice(5)}</Text>
                    <View style={s.historyBars}>
                      {[
                        { val: log.drive ?? 0, color: '#ef4444', label: t('mensHealth.pillarDriveShort', 'V') },
                        { val: log.recovery ?? 0, color: '#4ade80', label: t('mensHealth.pillarRecoveryShort', 'R') },
                        { val: log.focus ?? 0, color: '#60a5fa', label: t('mensHealth.pillarFocusShort', 'F') },
                      ].map(bar => (
                        <View key={bar.label} style={s.historyBarWrap}>
                          <View style={[s.historyBar, { height: (bar.val / 10) * 48, backgroundColor: bar.color }]} />
                          <Text style={s.historyBarLabel}>{bar.label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={s.historyScore}>{Math.round(((log.drive ?? 0) + (log.recovery ?? 0) + (log.focus ?? 0)) / 3 * 10)}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyTxt}>{t('mensHealth.emptyTrack', 'Regista a tua vitalidade diariamente para ver a tua tendência aqui.')}</Text>
            )}

            {/* Natural: T-Opt pillars */}
            {profile?.trainingMode === 'natural' && (
              <>
                <Text style={s.sectionTitle}>{t('mensHealth.tOptPillars','Pilares de Otimização de Testosterona')}</Text>
                {tOpt.pillars.map((p, i) => (
                  <View key={i} style={s.pillarCard}>
                    <View style={s.pillarTop}>
                      <Text style={s.pillarEmoji}>{p.icon}</Text>
                      <Text style={s.pillarName}>{p.name}</Text>
                      <Text style={[s.pillarScore, { color: p.score >= 70 ? '#4ade80' : p.score >= 50 ? '#fcd34d' : '#f87171' }]}>{p.score}%</Text>
                    </View>
                    <View style={s.pillarBar}>
                      <View style={[s.pillarBarFill, { width: `${p.score}%` as any, backgroundColor: p.score >= 70 ? '#4ade80' : p.score >= 50 ? '#fcd34d' : '#f87171' }]} />
                    </View>
                    <Text style={s.pillarTip}>{p.tip}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Enhanced: cycle tracker */}
            {profile?.trainingMode === 'enhanced' && (
              <>
                <Text style={s.sectionTitle}>{t('mensHealth.cycleTracker','Rastreador de Ciclo')}</Text>
                <View style={s.cycleTracker}>
                  <Text style={s.cycleTrackerLabel}>{t('mensHealth.currentPhase', 'Current Phase')}</Text>
                  <View style={s.cyclePhaseRow}>
                    {phases.map((p: any) => (
                      <TouchableOpacity key={p.id} style={[s.cPhaseChipLarge, cyclePhase === p.id && { backgroundColor: p.color + '22', borderColor: p.color }]} onPress={() => setCyclePhase(p.id)}>
                        <Text style={[s.cPhaseChipLargeTxt, { color: cyclePhase === p.id ? p.color : '#64748b' }]}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.cycleWeekRow}>
                    <Text style={s.cycleWeekLabel}>{t('mensHealth.weekOfCycle', { week: cycleWeek, total: cycleLength, defaultValue: `Week ${cycleWeek} of ${cycleLength}` })}</Text>
                    <View style={s.cycleWeekBtns}>
                      <TouchableOpacity onPress={() => setCycleWeek(w => Math.max(1, w - 1))} style={s.cycleWeekBtn}><Text style={s.cycleWeekBtnTxt}>−</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setCycleWeek(w => Math.min(cycleLength, w + 1))} style={s.cycleWeekBtn}><Text style={s.cycleWeekBtnTxt}>+</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={s.cycleProgressBar}>
                    <View style={[s.cycleProgressFill, { width: `${(cycleWeek / cycleLength) * 100}%` as any }]} />
                  </View>
                </View>

                <Text style={s.sectionTitle}>{t('mensHealth.healthMarkersMonitor','Marcadores de Saúde a Monitorizar')}</Text>
                {HEALTH_MARKERS.map(m => (
                  <View key={m.id} style={s.markerChip}>
                    <Text style={s.markerChipIcon}>{m.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.markerChipName}>{t(`mensHealth.markers.${m.id}.label`, m.label)}</Text>
                      <Text style={s.markerChipNormal}>{t('mensHealth.normal', 'Normal')}: {m.normal}</Text>
                    </View>
                    <Text style={markerValues[m.id] ? s.markerChipLogged : s.markerChipEmpty}>
                      {markerValues[m.id] ? markerValues[m.id] : '—'}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity style={[s.secondaryBtn, { borderColor: mc.accent + '40' }]} onPress={() => setShowMarkers(true)}>
                  <Text style={[s.secondaryBtnTxt, { color: mc.accent }]}>{t('mensHealth.logMarkers','Registar Marcadores de Saúde')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Athlete: competition prep */}
            {profile?.trainingMode === 'athlete' && (
              <>
                <Text style={s.sectionTitle}>{t('mensHealth.compPrep','Preparação para Competição')}</Text>
                <TouchableOpacity style={s.peakWeekCard} onPress={() => setShowPeakWeek(true)} activeOpacity={0.85}>
                  <Text style={s.peakWeekTitle}>🏆 {t('mensHealth.peakWeekProtocol', 'Peak Week Protocol')}</Text>
                  <Text style={s.peakWeekSub}>{t('mensHealth.peakWeekDetailedSub', 'Carb load dia a dia, manipulação de água e orientação para palco')}</Text>
                  <Text style={s.peakWeekCta}>{t('mensHealth.openProtocol', 'Open Protocol →')}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ═══════════════ INSIGHTS TAB ═══════════════ */}
        {activeTab === 'insights' && (
          <>
            <Text style={s.sectionTitle}>{t('mensHealth.personalisedInsights','Insights Personalizados')}</Text>

            {/* Natural insights */}
            {profile?.trainingMode === 'natural' && tOpt.pillars.filter(p => p.score < 70).map((p, i) => (
              <View key={i} style={[s.insightCard, { borderLeftColor: p.score < 50 ? '#ef4444' : '#fcd34d' }]}>
                <Text style={s.insightEmoji}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{p.name} {t('mensHealth.needsAttention', 'precisa de atenção')}</Text>
                  <Text style={s.insightBody}>{p.tip}</Text>
                </View>
              </View>
            ))}

            {/* Age-specific */}
            {convexUser?.age && convexUser.age >= 30 && (
              <View style={[s.insightCard, { borderLeftColor: '#60a5fa' }]}>
                <Text style={s.insightEmoji}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{t('mensHealth.annualPanel', 'Painel de sangue anual recomendado')}</Text>
                  <Text style={s.insightBody}>{t('mensHealth.annualPanelBody', 'Aos {{age}} anos, acompanhar testosterona total, testosterona livre, SHBG, estradiol e tiroide anualmente dá-te os dados para otimizar proativamente.', { age: convexUser.age })}</Text>
                </View>
              </View>
            )}

            {/* Goal-specific */}
            {profile?.primaryGoal === 'fat_loss' && (
              <View style={[s.insightCard, { borderLeftColor: '#f97316' }]}>
                <Text style={s.insightEmoji}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{t('mensHealth.fatLossTitle', 'Perda de Gordura & Testosterona')}</Text>
                  <Text style={s.insightBody}>{t('mensHealth.fatLossBody', 'Restrição calórica agressiva abaixo de 15 kcal/kg/dia suprime a testosterona. Visa um défice máximo de 15–20%. Prioriza proteína 2,2g/kg para preservar músculo.')}</Text>
                </View>
              </View>
            )}

            {profile?.primaryGoal === 'muscle' || profile?.primaryGoal === 'strength' ? (
              <View style={[s.insightCard, { borderLeftColor: '#4ade80' }]}>
                <Text style={s.insightEmoji}>💪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{t('mensHealth.progressiveTitle', 'Protocolo de Sobrecarga Progressiva')}</Text>
                  <Text style={s.insightBody}>{t('mensHealth.progressiveBody', 'Aumenta o peso, repetições ou densidade em cada sessão. O treino pesado é o sinal anabólico primário.')}</Text>
                </View>
              </View>
            ) : null}

            {/* Enhanced: harm reduction */}
            {profile?.trainingMode === 'enhanced' && (
              <>
                <View style={[s.insightCard, { borderLeftColor: '#ef4444' }]}>
                  <Text style={s.insightEmoji}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>{t('mensHealth.bloodWorkTitle', 'Análises ao Sangue Periódicas')}</Text>
                    <Text style={s.insightBody}>{t('mensHealth.bloodWorkBody', 'Atletas enhanced devem monitorizar lipídeos, hematócrito e enzimas hepáticas a cada 8 semanas.')}</Text>
                  </View>
                </View>
                <View style={[s.insightCard, { borderLeftColor: '#f97316' }]}>
                  <Text style={s.insightEmoji}>❤️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>{t('mensHealth.cardioTitle', 'Saúde Cardiovascular é Prioridade #1')}</Text>
                    <Text style={s.insightBody}>{t('mensHealth.cardioBody', 'O cardio LISS 4x/semana é obrigatório para gerir a pressão arterial e hematócrito.')}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Pro blur */}
            {!isPro && (
              <View style={s.proBlurWrap}>
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={s.proBlurContent}>
                  <Text style={s.proBlurTitle}>{t('mensHealth.unlockDeepAnalytics', 'Desbloqueia Análise Hormonal Profunda')}</Text>
                  <Text style={s.proBlurSub}>{t('mensHealth.unlockDeepAnalyticsSub', 'Insights com IA que se adaptam ao teu histórico, padrões e sintomas registados.')}</Text>
                  <TouchableOpacity style={[s.proBlurBtn, { backgroundColor: mc.gradient[0] }]} onPress={() => router.push('/premium' as any)}>
                    <Text style={s.proBlurBtnTxt}>{t('mensHealth.upgradeToPro','Atualizar para Pro')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════════ LEARN TAB ═══════════════ */}
        {activeTab === 'learn' && (
          <>
            <Text style={s.sectionTitle}>Men's {t('mensHealth.performanceLib','Biblioteca de Performance Masculina')}</Text>
            {/* Filter relevant articles to mode */}
            {LEARN_ARTICLES.filter(a => {
              if (profile?.trainingMode === 'enhanced') return true;
              if (a.category === 'Enhanced' || a.category === 'Labs') return profile?.trainingMode === 'athlete';
              if (a.category === 'Compete') return profile?.competitionFocus !== 'none';
              return true;
            }).map(article => (
              <TouchableOpacity key={article.id} style={s.articleCard} onPress={() => setShowArticle(article)} activeOpacity={0.85}>
                <View style={s.articleCardLeft}>
                  <Text style={s.articleCardEmoji}>{article.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.articleCardCategory}>{t(`mensHealth.categories.${article.category}`, article.category)} · {article.time}</Text>
                    <Text style={s.articleCardTitle}>{t(`mensHealth.articles.${article.id}.title`, article.title)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },

  // Quiz
  quizScreen: { flex: 1, backgroundColor: '#0f172a' },
  quizTopBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  quizBack: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  quizProgress: { flex: 1, height: 4, backgroundColor: '#1e293b', borderRadius: 2, overflow: 'hidden' },
  quizProgressFill: { height: '100%', backgroundColor: '#60a5fa', borderRadius: 2 },
  quizStepNum: { fontSize: 12, fontWeight: '700', color: '#475569', width: 32, textAlign: 'right' },
  quizHero: { marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 4 },
  quizHeroEmoji: { fontSize: 40, marginBottom: 10 },
  quizHeroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  quizHeroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21 },
  quizKnowBox: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  quizKnowTitle: { fontSize: 11, fontWeight: '800', color: '#60a5fa', marginBottom: 8 },
  quizKnowItem: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 3, fontWeight: '500' },
  quizBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  quizEmoji: { fontSize: 44, marginBottom: 10 },
  quizQuestion: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, lineHeight: 30 },
  quizHint: { fontSize: 12, color: '#64748b', marginBottom: 16, fontStyle: 'italic' },
  quizOptions: { gap: 10 },
  quizOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  quizOptionIcon: { fontSize: 24 },
  quizOptionLabel: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  quizOptionDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 11, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
  scoreChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  scoreChipVal: { fontSize: 16, fontWeight: '900' },
  scoreChipLbl: { fontSize: 8, color: '#64748b', fontWeight: '700' },
  retakeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  scroll: { paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#e2e8f0', marginBottom: 10, marginTop: 4 },

  // Mode hero
  modeHero: { borderRadius: 20, padding: 18, marginBottom: 14, overflow: 'hidden' },
  modeHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modeHeroMode: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
  modeHeroGoal: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'capitalize' },
  modeHeroComp: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  modeHeroScore: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 10 },
  modeHeroScoreVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
  modeHeroScoreLbl: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 2 },
  tOptBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  tOptBarFill: { height: '100%', backgroundColor: '#4ade80', borderRadius: 3 },
  cyclePhaseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cPhaseChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(0,0,0,0.3)' },
  cPhaseLabel: { fontSize: 11, fontWeight: '700' },
  cPhaseChipLarge: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', alignItems: 'center' },
  cPhaseChipLargeTxt: { fontSize: 12, fontWeight: '700' },
  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  compBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  compBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '800' },

  // Cycle phase card
  cyclePhaseCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 4 },
  cyclePhaseTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  cyclePhaseDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 19 },

  // Actions
  actionTile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  actionSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  proChip: { backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginRight: 4 },
  proChipTxt: { fontSize: 10, fontWeight: '800', color: '#92400e' },

  // Vitality modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  modalSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  modalClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  tOptLive: { alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: '#334155' },
  tOptLiveLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 4 },
  tOptLiveVal: { fontSize: 36, fontWeight: '900' },
  sliderWrap: { marginBottom: 20 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  sliderVal: { fontSize: 16, fontWeight: '900' },
  sliderTrack: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  sliderFill: { height: '100%', borderRadius: 2 },
  sliderDots: { flexDirection: 'row', gap: 3 },
  sliderDot: { flex: 1, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  sliderDotTxt: { fontSize: 10, fontWeight: '700', color: '#475569' },
  moodSync: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 10, padding: 10, marginBottom: 16 },
  moodSyncTxt: { fontSize: 12, color: '#a78bfa', fontWeight: '600' },
  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Pelvic modal
  pelvicTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  pelvicSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 19, paddingHorizontal: 20 },
  timerCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timerTime: { fontSize: 44, fontWeight: '900', color: '#fff' },
  timerMsg: { fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  pelvicInstructions: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 28, lineHeight: 18, paddingHorizontal: 24 },
  pelvicActions: { alignItems: 'center', width: '100%' },
  pelvicStartBtn: { backgroundColor: '#2563eb', borderRadius: 18, paddingHorizontal: 48, paddingVertical: 16, width: '80%', alignItems: 'center' },
  pelvicStartTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pelvicFinishBtn: { backgroundColor: '#1e293b', borderRadius: 18, paddingHorizontal: 48, paddingVertical: 16, borderWidth: 1, borderColor: '#334155', width: '80%', alignItems: 'center' },
  pelvicFinishTxt: { color: '#e2e8f0', fontWeight: '800', fontSize: 16 },

  // Supplement modal
  suppGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  suppGroupDot: { width: 8, height: 8, borderRadius: 4 },
  suppGroupLabel: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  suppCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  suppTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  suppName: { fontSize: 15, fontWeight: '800', color: '#e2e8f0' },
  evidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  evidenceTxt: { fontSize: 10, fontWeight: '800' },
  suppDose: { fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: '600' },
  suppReason: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  suppDisclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginTop: 8 },
  suppDisclaimerTxt: { flex: 1, fontSize: 11, color: '#64748b', lineHeight: 16 },

  // Health markers modal
  markerCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  markerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  markerIcon: { fontSize: 22 },
  markerName: { fontSize: 14, fontWeight: '800', color: '#e2e8f0' },
  markerNormal: { fontSize: 11, color: '#64748b', marginTop: 2 },
  markerInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, fontSize: 15, color: '#e2e8f0', marginBottom: 8, fontWeight: '600' },
  markerTip: { fontSize: 12, color: '#64748b', lineHeight: 17 },

  // Peak week modal
  peakDayRow: { flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  peakDayBtn: { flex: 1, minWidth: 44, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', alignItems: 'center' },
  peakDayTxt: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  peakDayCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  peakDayCardTitle: { fontSize: 15, fontWeight: '800', color: '#fcd34d', marginBottom: 8 },
  peakDayCardBody: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  carbLoadToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 14 },
  carbLoadLabel: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },

  // Track tab
  historyChart: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, marginBottom: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  historyDate: { fontSize: 10, fontWeight: '700', color: '#64748b', width: 36 },
  historyBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 4 },
  historyBarWrap: { flex: 1, alignItems: 'center', height: 60, justifyContent: 'flex-end' },
  historyBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  historyBarLabel: { fontSize: 9, fontWeight: '700', color: '#475569', marginTop: 3 },
  historyScore: { fontSize: 11, fontWeight: '800', color: '#94a3b8', width: 34, textAlign: 'right' },

  pillarCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10 },
  pillarTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pillarEmoji: { fontSize: 18 },
  pillarName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  pillarScore: { fontSize: 16, fontWeight: '900' },
  pillarBar: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  pillarBarFill: { height: '100%', borderRadius: 2 },
  pillarTip: { fontSize: 12, color: '#64748b', lineHeight: 18 },

  cycleTracker: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, marginBottom: 14 },
  cycleTrackerLabel: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 10 },
  cycleWeekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  cycleWeekLabel: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  cycleWeekBtns: { flexDirection: 'row', gap: 8 },
  cycleWeekBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  cycleWeekBtnTxt: { fontSize: 18, fontWeight: '900', color: '#e2e8f0' },
  cycleProgressBar: { height: 5, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  cycleProgressFill: { height: '100%', backgroundColor: '#60a5fa', borderRadius: 3 },

  markerChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  markerChipIcon: { fontSize: 18 },
  markerChipName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  markerChipNormal: { fontSize: 11, color: '#64748b' },
  markerChipLogged: { fontSize: 13, fontWeight: '800', color: '#4ade80' },
  markerChipEmpty: { fontSize: 13, fontWeight: '700', color: '#475569' },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  secondaryBtnTxt: { fontSize: 14, fontWeight: '700' },

  peakWeekCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#92400e' },
  peakWeekTitle: { fontSize: 16, fontWeight: '800', color: '#fcd34d', marginBottom: 6 },
  peakWeekSub: { fontSize: 13, color: '#94a3b8', lineHeight: 19, marginBottom: 10 },
  peakWeekCta: { fontSize: 13, fontWeight: '800', color: '#fcd34d' },

  // Insights
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  insightEmoji: { fontSize: 22, marginTop: 2 },
  insightTitle: { fontSize: 14, fontWeight: '800', color: '#e2e8f0', marginBottom: 4 },
  insightBody: { fontSize: 13, color: '#94a3b8', lineHeight: 19 },

  proBlurWrap: { borderRadius: 16, overflow: 'hidden', height: 160, backgroundColor: '#1e293b', marginBottom: 14 },
  proBlurContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  proBlurTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6, textAlign: 'center' },
  proBlurSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 14, lineHeight: 19 },
  proBlurBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  proBlurBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Learn
  articleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#334155' },
  articleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  articleCardEmoji: { fontSize: 26 },
  articleCardCategory: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  articleCardTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', lineHeight: 19 },
  articleHeader: { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  articleCategory: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  articleTitle: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26 },
  articleClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  articleBody: { fontSize: 15, color: '#94a3b8', lineHeight: 24, marginBottom: 20 },
  articleDisclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#1e293b', borderRadius: 12, padding: 12 },
  articleDisclaimerTxt: { flex: 1, fontSize: 11, color: '#64748b', lineHeight: 16 },

  emptyTxt: { fontSize: 13, color: '#475569', textAlign: 'center', paddingVertical: 30, fontStyle: 'italic' },
});
