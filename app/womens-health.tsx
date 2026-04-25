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
import { useTranslation } from 'react-i18next';
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
  id: string;
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

function getCyclePhase(lastPeriodDate: number, t: Function, cycleLength = 28): CyclePhase {
  const now       = Date.now();
  const daysSince = Math.floor((now - lastPeriodDate) / (1000 * 60 * 60 * 24));
  const cycleDay  = (daysSince % cycleLength) + 1;

  if (cycleDay <= 5) return {
    id: 'menstrual', day: cycleDay,
    name:        t('womensHealth.phaseName.menstrual',    'Menstrual'),
    description: t('womensHealth.phaseDesc.menstrual',    'O revestimento uterino descama. Os estrogénios e a progesterona estão no nível mais baixo.'),
    energy:      t('womensHealth.phaseEnergy.menstrual',  'Baixa — honra o descanso'),
    workout:     t('womensHealth.phaseWorkout.menstrual', 'Yoga suave, caminhadas, alongamentos'),
    nutrition:   t('womensHealth.phaseNutrition.menstrual','Alimentos ricos em ferro: lentilhas, vegetais de folha verde, carne vermelha'),
    mood:        t('womensHealth.phaseMood.menstrual',    'Introspetivo, emocional'),
    color: '#dc2626', bg: '#fef2f2',
    gradient: ['#dc2626', '#b91c1c'],
    hormone:     t('womensHealth.phaseHormone.menstrual', 'Estrogénio & progesterona baixos'),
    tip:         t('womensHealth.phaseTip.menstrual',     'Usa uma almofada de calor, reduz a cafeína e prioriza o sono.'),
  };
  if (cycleDay <= 13) return {
    id: 'follicular', day: cycleDay,
    name:        t('womensHealth.phaseName.follicular',    'Folicular'),
    description: t('womensHealth.phaseDesc.follicular',    'A FSH sobe, os folículos desenvolvem-se, o estrogénio sobe. Energia e clareza aumentam.'),
    energy:      t('womensHealth.phaseEnergy.follicular',  'A subir — ótimo para novos começos'),
    workout:     t('womensHealth.phaseWorkout.follicular', 'Treino de força, HIIT, cardio'),
    nutrition:   t('womensHealth.phaseNutrition.follicular','Hidratos complexos, alimentos fermentados, proteína magra'),
    mood:        t('womensHealth.phaseMood.follicular',    'Otimista, motivada, social'),
    color: '#16a34a', bg: '#f0fdf4',
    gradient: ['#16a34a', '#15803d'],
    hormone:     t('womensHealth.phaseHormone.follicular', 'Estrogénio a subir, FSH ativa'),
    tip:         t('womensHealth.phaseTip.follicular',     'Agenda projetos exigentes e trabalho criativo agora — o teu cérebro está em modo turbo.'),
  };
  if (cycleDay === 14) return {
    id: 'ovulation', day: cycleDay,
    name:        t('womensHealth.phaseName.ovulation',    'Ovulação'),
    description: t('womensHealth.phaseDesc.ovulation',    'O pico de LH desencadeia a libertação do óvulo. Estrogénio em pico. Sentes-te melhor.'),
    energy:      t('womensHealth.phaseEnergy.ovulation',  'Pico — maior capacidade física'),
    workout:     t('womensHealth.phaseWorkout.ovulation', 'Recordes pessoais, cardio intenso'),
    nutrition:   t('womensHealth.phaseNutrition.ovulation','Antioxidantes, alimentos ricos em zinco (sementes de abóbora, ostras)'),
    mood:        t('womensHealth.phaseMood.ovulation',    'Confiante, magnética, comunicativa'),
    color: '#2563eb', bg: '#eff6ff',
    gradient: ['#2563eb', '#1d4ed8'],
    hormone:     t('womensHealth.phaseHormone.ovulation', 'Pico de LH + estrogénio no máximo'),
    tip:         t('womensHealth.phaseTip.ovulation',     'A tua voz é literalmente mais atrativa agora — aproveita as situações sociais.'),
  };
  if (cycleDay <= 21) return {
    id: 'luteal_early', day: cycleDay,
    name:        t('womensHealth.phaseName.lutealEarly',    'Luteal (Início)'),
    description: t('womensHealth.phaseDesc.lutealEarly',    'A progesterona sobe com a formação do corpo lúteo. A temperatura corporal eleva-se.'),
    energy:      t('womensHealth.phaseEnergy.lutealEarly',  'Estável — esforço sustentado'),
    workout:     t('womensHealth.phaseWorkout.lutealEarly', 'Musculação moderada, Pilates, ciclismo'),
    nutrition:   t('womensHealth.phaseNutrition.lutealEarly','Magnésio (chocolate negro, nozes), B6 para o humor'),
    mood:        t('womensHealth.phaseMood.lutealEarly',    'Focada, orientada para detalhes, algum inchaço'),
    color: '#d97706', bg: '#fffbeb',
    gradient: ['#d97706', '#b45309'],
    hormone:     t('womensHealth.phaseHormone.lutealEarly', 'Progesterona a subir'),
    tip:         t('womensHealth.phaseTip.lutealEarly',     'Esta é a melhor fase para trabalho administrativo detalhado e foco profundo.'),
  };
  return {
    id: 'luteal_late', day: cycleDay,
    name:        t('womensHealth.phaseName.lutealLate',    'Luteal (Final)'),
    description: t('womensHealth.phaseDesc.lutealLate',    'Janela de SPM. A progesterona cai se não houver fertilização. A sensibilidade ao cortisol aumenta.'),
    energy:      t('womensHealth.phaseEnergy.lutealLate',  'Baixa a moderada — abranda'),
    workout:     t('womensHealth.phaseWorkout.lutealLate', 'Cardio leve, yoga, caminhada'),
    nutrition:   t('womensHealth.phaseNutrition.lutealLate','Reduz sal + açúcar. Alimentos com triptofano (peru, ovos) para serotonina.'),
    mood:        t('womensHealth.phaseMood.lutealLate',    'Sensível, irritável, a precisar de conforto'),
    color: '#7c3aed', bg: '#f5f3ff',
    gradient: ['#7c3aed', '#6d28d9'],
    hormone:     t('womensHealth.phaseHormone.lutealLate', 'Progesterona + estrogénio a cair'),
    tip:         t('womensHealth.phaseTip.lutealLate',     'Reduz álcool e alimentos processados. Regista os teus sintomas de SPM para identificar padrões.'),
  };
}

function getPregnancyStats(startDate: number, t: Function) {
  const days     = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
  const weeks    = Math.floor(days / 7);
  const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  const sizes     = ['🌱','🫘','🫘','🫐','🫘','🍇','🍊','🟣','🍋','🍋','🍎','🥑','🥔','🫑','🥒','🟠','🍆','🎃','🍍','🍈','🍈','🍉','🎃'];
  const milestones = [
    t('womensHealth.milestone.0','Coração a bater'),
    t('womensHealth.milestone.1','Dedos a formar-se'),
    t('womensHealth.milestone.2','Primeiros pontapés possíveis'),
    t('womensHealth.milestone.3','Audição a desenvolver-se'),
    t('womensHealth.milestone.4','O bebé já pode sonhar'),
    t('womensHealth.milestone.5','Pulmões a maturar'),
    t('womensHealth.milestone.6','A praticar a respiração'),
    t('womensHealth.milestone.7','A aproximar-se do termo'),
  ];
  return {
    weeks, trimester, progress: Math.min(weeks / 40, 1),
    emoji: sizes[Math.min(weeks, sizes.length - 1)],
    milestone: milestones[Math.floor(weeks / 5)] ?? t('womensHealth.milestone.default','A crescer forte'),
  };
}

// ─────────────────────────────────────────────────────────────
// PERSONALISED INSIGHTS engine
// ─────────────────────────────────────────────────────────────
function buildInsights(
  convexUser: any,
  profile: WomensProfile | null,
  phase: CyclePhase | null,
  t: Function,
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
    if (phase.id === 'luteal_late') {
      insights.push({ title: t('womensHealth.insight.pmsTitle','Janela de SPM Ativa'), body: t('womensHealth.insight.pmsBody','O glicinato de magnésio (300mg) tomado antes de dormir tem forte evidência clínica para reduzir cólicas, inchafo e alterações de humor.'), icon: '💊', priority: 'high' });
      if (stress === 'high' || stress === 'very_high') {
        insights.push({ title: t('womensHealth.insight.stressLutealTitle','Stress Alto + Luteal Final = Risco'), body: t('womensHealth.insight.stressLutealBody','O teu nível de stress combinado com a janela de SPM pode amplificar o cortisol e piorar os sintomas. Prioriza uma prática de redução de cortisol hoje.'), icon: '⚠️', priority: 'high', link: '/wellness' });
      }
    }
    if (phase.id === 'ovulation') {
      insights.push({ title: t('womensHealth.insight.fertilityTitle','Janela de Fertilidade Aberta'), body: t('womensHealth.insight.fertilityBody','Estás na tua janela de fertilidade máxima. Se estás ativamente a tentar conceber, este é o momento ótimo. Se não, fica ciente.'), icon: '🌸', priority: 'high' });
    }
    if (phase.id === 'follicular') {
      insights.push({ title: t('womensHealth.insight.estrogenTitle','Estrogénio a Subir = Poder Mental'), body: t('womensHealth.insight.estrogenBody','A serotonina e a dopamina estão elevadas nesta fase. Uma ótima janela para agendar conversas difíceis, apresentações ou projetos criativos.'), icon: '🧠', priority: 'medium' });
    }
  }

  // Sleep-hormone link
  if (sleep && sleep < 7) {
    insights.push({ title: t('womensHealth.insight.sleepTitle','Défice de Sono Perturba Hormónios'), body: t('womensHealth.insight.sleepBody','Menos de 7 horas de sono aumenta o cortisol, suprime a progesterona e pode causar irregularidades no ciclo. Estás atualmente abaixo do mínimo.'), icon: '😴', priority: 'high', link: '/wellness' });
  }

  // Nutrition insights
  if (diet === 'low_carb' || diet === 'high_protein') {
    insights.push({ title: t('womensHealth.insight.lowCarbTitle','Low Carb + Hormónios'), body: t('womensHealth.insight.lowCarbBody','Dietas muito baixas em hidratos podem suprimir LH e FSH, causando períodos irregulares ou ausentes. Se o teu ciclo é irregular, considera uma abordagem cíclica de hidratos.'), icon: '🥗', priority: 'medium' });
  }

  // Pain level insight
  if (profile?.periodPain === 'severe') {
    insights.push({ title: t('womensHealth.insight.painTitle','Dor Severa Requer Investigação'), body: t('womensHealth.insight.painBody','Dor menstrual severa não é normal e pode indicar endometriose, miomas ou adenomiose. Recomendamos fortemente falar com um médico ou ginecologista.'), icon: '🏥', priority: 'high' });
  }

  // Birth control insight
  if (profile?.birthControl === 'pill') {
    insights.push({ title: t('womensHealth.insight.pillTitle','Pílula & Depleção de Nutrientes'), body: t('womensHealth.insight.pillBody','A pílula combinada pode deplecionar B6, B12, folato, magnésio e zinco. Considera um suplemento de complexo B e análises regulares.'), icon: '💊', priority: 'medium' });
  }

  // Activity vs cycle
  if (activity === 'very_active' || activity === 'extremely_active') {
    insights.push({ title: t('womensHealth.insight.athleticTitle','Atenção à Tríade Atlética'), body: t('womensHealth.insight.athleticBody','Treino de alta intensidade pode suprimir o estrogénio e perturbar o teu ciclo (RED-S). Monitoriza o teu período — qualquer perturbação é um sinal de aviso do teu corpo.'), icon: '🏃', priority: 'medium', link: '/move' });
  }

  // Age-based
  if (age && age >= 35 && age <= 45) {
    insights.push({ title: t('womensHealth.insight.periTitle','Perimenopausa Pode Começar'), body: t('womensHealth.insight.periBody','Flutuações hormonais começam frequentemente nos 30 e tal anos, mesmo com períodos regulares. Acompanha de perto as alterações de humor, sono e ciclo.'), icon: '🌡️', priority: 'medium' });
  }

  // Weight goal + hormones
  if (goal === 'lose_weight') {
    insights.push({ title: t('womensHealth.insight.calorieTitle','Restrição Calórica & Hormónios'), body: t('womensHealth.insight.calorieBody','Défices calóricos agressivos suprimem a leptina e as hormonas da tiroide, podendo travar a perda de peso e perturbar ciclos. Sincroniza a intensidade do treino com o ciclo.'), icon: '⚖️', priority: 'medium' });
  }

  return insights.slice(0, 6);
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
  t: any
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
    stack.push({ name: t('womensHealth.supps.magnesium.name', 'Magnesium Glycinate'), dose: '300mg', reason: t('womensHealth.supps.magnesium.reason', 'Reduces cramps, PMS mood symptoms and improves sleep'), evidence: 'Grade A', timing: t('womensHealth.supps.magnesium.timing', 'Before bed') });
  }
  if (phase?.name === 'Follicular' || phase?.name === 'Ovulation') {
    stack.push({ name: t('womensHealth.supps.iron.name', 'Iron + Vitamin C'), dose: '18mg + 500mg', reason: t('womensHealth.supps.iron.reason', 'Replenish iron lost during menstruation; C enhances absorption'), evidence: 'Grade A', timing: t('womensHealth.supps.iron.timing', 'With breakfast, away from coffee') });
  }

  // Pain-based
  if (pain === 'moderate' || pain === 'severe') {
    stack.push({ name: t('womensHealth.supps.omega3.name', 'Omega-3 (EPA/DHA)'), dose: '2000mg', reason: t('womensHealth.supps.omega3.reason', 'Anti-inflammatory; reduces prostaglandin-driven cramps. As effective as ibuprofen in trials'), evidence: 'Grade A', timing: t('womensHealth.supps.omega3.timing', 'With meals') });
    stack.push({ name: t('womensHealth.supps.vitD3.name', 'Vitamin D3'), dose: '2000 IU', reason: t('womensHealth.supps.vitD3.reason', 'Deficiency linked to severe dysmenorrhoea'), evidence: 'Grade B', timing: t('womensHealth.supps.vitD3.timing', 'With a fatty meal') });
  }

  // Pill-related
  if (bc === 'pill') {
    stack.push({ name: t('womensHealth.supps.bComplex.name', 'B-Complex (B6, B12, Folate)'), dose: '1 capsule', reason: t('womensHealth.supps.bComplex.reason', 'Oral contraceptives deplete B vitamins — critical for mood and methylation'), evidence: 'Grade A', timing: t('womensHealth.supps.bComplex.timing', 'Morning with food') });
    stack.push({ name: t('womensHealth.supps.zinc.name', 'Zinc'), dose: '15mg', reason: t('womensHealth.supps.zinc.reason', 'Contraceptive pill depletes zinc, affecting immunity and skin'), evidence: 'Grade B', timing: t('womensHealth.supps.zinc.timing', 'With dinner') });
  }

  // Stress
  if (stress === 'high' || stress === 'very_high') {
    stack.push({ name: t('womensHealth.supps.ashwagandha.name', 'Ashwagandha KSM-66'), dose: '600mg', reason: t('womensHealth.supps.ashwagandha.reason', 'Clinically proven adaptogen for cortisol reduction and hormonal balance'), evidence: 'Grade A', timing: t('womensHealth.supps.ashwagandha.timing', 'With dinner or before bed') });
  }

  // Sleep
  if (sleep && sleep < 7) {
    stack.push({ name: t('womensHealth.supps.magLThreonate.name', 'Magnesium L-Threonate'), dose: '140mg', reason: t('womensHealth.supps.magLThreonate.reason', 'Crosses blood-brain barrier; improves deep sleep and reduces night anxiety'), evidence: 'Grade B', timing: t('womensHealth.supps.magLThreonate.timing', '30 mins before bed') });
  }

  // Fertility focus
  if (focus === 'fertility') {
    stack.push({ name: t('womensHealth.supps.myoInositol.name', 'Myo-Inositol'), dose: '4000mg', reason: t('womensHealth.supps.myoInositol.reason', 'Supports egg quality, ovulation regularity and insulin sensitivity'), evidence: 'Grade A', timing: t('womensHealth.supps.myoInositol.timing', 'Split morning and night with food') });
    stack.push({ name: t('womensHealth.supps.coQ10.name', 'CoQ10 (Ubiquinol)'), dose: '200–400mg', reason: t('womensHealth.supps.coQ10.reason', 'Improves mitochondrial energy in eggs; important over 35'), evidence: 'Grade A', timing: t('womensHealth.supps.coQ10.timing', 'With meals') });
  }

  // Perimenopause
  if (focus === 'perimenopause' || (age && age >= 40)) {
    stack.push({ name: t('womensHealth.supps.blackCohosh.name', 'Black Cohosh'), dose: '20–40mg', reason: t('womensHealth.supps.blackCohosh.reason', 'Hot flash and mood symptom relief; best evidence in early menopause'), evidence: 'Grade B', timing: t('womensHealth.supps.blackCohosh.timing', 'Morning and evening') });
    stack.push({ name: t('womensHealth.supps.calcium.name', 'Calcium + D3'), dose: '1000mg + 2000IU', reason: t('womensHealth.supps.calcium.reason', 'Bone density protection during oestrogen decline'), evidence: 'Grade A', timing: t('womensHealth.supps.calcium.timing', 'Split morning and night') });
  }

  // Universal
  stack.push({ name: t('womensHealth.supps.vitD3K2.name', 'Vitamin D3 + K2'), dose: '2000 IU + 100mcg', reason: t('womensHealth.supps.vitD3K2.reason', 'Most women are deficient; critical for immune function, mood and bone health'), evidence: 'Grade A', timing: t('womensHealth.supps.vitD3K2.timing', 'Morning with a fatty meal') });

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
  const { t } = useTranslation();

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
    return getCyclePhase(convexUser.lastPeriodDate, t);
  }, [lifeStage, convexUser?.lastPeriodDate, t]);

  const pregnancyStats = useMemo(() => {
    if (lifeStage !== 'pregnancy' || !convexUser?.pregnancyStartDate) return null;
    return getPregnancyStats(convexUser.pregnancyStartDate, t);
  }, [lifeStage, convexUser?.pregnancyStartDate, t]);

  const insights    = useMemo(() => buildInsights(convexUser, profile, phase, t), [convexUser, profile, phase, t]);
  const suppStack   = useMemo(() => getSupplementStack(profile, phase, convexUser, t), [profile, phase, convexUser, t]);

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
      Alert.alert(t('womensHealth.loggedTitle','Registado ✓'), t('womensHealth.loggedMsg','Os teus bio-marcadores diários foram guardados.'));
      setShowBioModal(false);
    } catch { Alert.alert(t('common.error','Erro'), t('womensHealth.saveError','Não foi possível guardar. Tenta novamente.')); }
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
              <Text style={s.quizHeroTitle}>{t('womensHealth.blueprintTitle', 'O Teu Blueprint Hormonal')}</Text>
              <Text style={s.quizHeroSub}>
                {t('womensHealth.blueprintSub', '4 perguntas para personalizar as tuas informações sobre ciclo, suplementos e orientação hormonal.')}
              </Text>
              {/* Show onboarding data we already have */}
              {convexUser && (
                <View style={s.quizKnowBox}>
                  <Text style={s.quizKnowTitle}>{t('womensHealth.alreadyPersonalised', '✦ Já personalizado do teu perfil')}</Text>
                  {convexUser.fitnessGoal  && <Text style={s.quizKnowItem}>🎯 {t('common.goal','Objetivo')}: {convexUser.fitnessGoal.replace(/_/g, ' ')}</Text>}
                  {convexUser.stressLevel  && <Text style={s.quizKnowItem}>🧠 {t('common.stress','Stress')}: {convexUser.stressLevel}</Text>}
                  {convexUser.sleepHours   && <Text style={s.quizKnowItem}>😴 {t('common.sleep','Sono')}: {convexUser.sleepHours}h avg</Text>}
                  {convexUser.age          && <Text style={s.quizKnowItem}>📅 {t('common.age','Idade')}: {convexUser.age}</Text>}
                  {convexUser.activityLevel && <Text style={s.quizKnowItem}>💪 {t('common.activity','Atividade')}: {convexUser.activityLevel.replace(/_/g, ' ')}</Text>}
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        <ScrollView contentContainerStyle={s.quizBody} keyboardShouldPersistTaps="handled">
          <Text style={s.quizEmoji}>{step.emoji}</Text>
          <Text style={s.quizQuestion}>{t(`womensHealth.quiz.${step.id}.question`, step.question)}</Text>
          <View style={s.quizOptions}>
            {'options' in step && step.options.map((opt) => (
              <TouchableOpacity key={opt.value} style={s.quizOption} onPress={() => handleQuizOption(opt.value)} activeOpacity={0.8}>
                <Text style={s.quizOptionIcon}>{opt.icon}</Text>
                <Text style={s.quizOptionLabel}>{t(`womensHealth.quiz.${step.id}.${opt.value}`, opt.label)}</Text>
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
                <Text style={s.articleDisclaimerTxt}>{t('womensHealth.articleDisclaimer', 'Este é conteúdo educativo, não aconselhamento médico. Consulta um profissional de saúde para orientação personalizada.')}</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Bio-Log Modal */}
      <Modal visible={showBioModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('womensHealth.dailyBioLog', 'Registo Bio Diário')}</Text>
            <TouchableOpacity onPress={() => setShowBioModal(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* Mood sync */}
            <View style={s.moodSync}>
              <Ionicons name="sync" size={16} color="#7e22ce" />
              <Text style={s.moodSyncTxt}>{t('womensHealth.moodSynced', 'Humor sincronizado do Wellness')}: {wellnessLog?.moodEmoji ?? '—'}</Text>
            </View>

            {/* Energy */}
            <Text style={s.bioLabel}>{t('womensHealth.energyToday', 'Energia hoje (1–10)')}</Text>
            <View style={s.dotRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} style={[s.dot, energy >= n && s.dotActive]} onPress={() => setEnergy(n)}>
                  <Text style={[s.dotTxt, energy >= n && s.dotTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Symptoms */}
            <Text style={s.bioLabel}>{t('womensHealth.symptoms', 'Sintomas')}</Text>
            <View style={s.symptomGrid}>
              {SYMPTOMS.map(sym => {
                const active = symptoms.includes(sym);
                return (
                  <TouchableOpacity key={sym} style={[s.symChip, active && s.symChipActive]}
                    onPress={() => setSymptoms(active ? symptoms.filter(x => x !== sym) : [...symptoms, sym])}>
                    <Text style={[s.symChipTxt, active && s.symChipTxtActive]}>{t(`womensHealth.sym.${sym.toLowerCase().replace(/ /g,'_')}`, sym)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stage-specific */}
            {lifeStage === 'cycle' && (
              <>
                <Text style={s.bioLabel}>{t('womensHealth.flow', 'Fluxo')}</Text>
                <View style={s.flowRow}>
                  {(['None', 'Spotting', 'Light', 'Medium', 'Heavy'] as const).map(f => (
                    <TouchableOpacity key={f} style={[s.flowChip, flow === f && s.flowChipActive]} onPress={() => setFlow(f)}>
                      <Text style={[s.flowTxt, flow === f && { color: '#fff' }]}>{t(`womensHealth.flowOpt.${f.toLowerCase()}`, f)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {lifeStage === 'pregnancy' && (
              <>
                <Text style={s.bioLabel}>{t('womensHealth.babyMovement', 'Movimento do bebé hoje (1–10)')}</Text>
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
                <Text style={s.bioLabel}>{t('womensHealth.hotFlash', 'Intensidade das afrontamentos (1–10)')}</Text>
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
              <Text style={s.saveBtnTxt}>{t('womensHealth.saveBioLog', 'Guardar Bio-Registo')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Supplement Modal */}
      <Modal visible={showSupps} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('womensHealth.vitalityStack', 'O Teu Stack de Vitalidade')}</Text>
            <TouchableOpacity onPress={() => setShowSupps(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Text style={s.suppIntro}>
              {t('womensHealth.suppIntro', 'Personalizado com base na tua fase do ciclo, nível de stress, método contracetivo, foco de saúde e idade.')}
            </Text>

            <TouchableOpacity style={s.actionTile} onPress={() => { setShowSupps(false); router.push('/pill-reminder' as any); }} activeOpacity={0.8}>
              <View style={[s.actionIcon, { backgroundColor: '#fdf2f8' }]}>
                <Ionicons name="medical-outline" size={22} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>{t('womensHealth.pillReminder', 'Contraceção & Lembrete de Comprimido')}</Text>
                <Text style={s.actionSub}>{t('womensHealth.pillReminderSub', 'Acompanha os teus medicamentos e suplementos com segurança')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              {!isPro && (
                <View style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#fdf2f8', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="lock-closed" size={24} color="#e11d48" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{t('womensHealth.unlockStack', 'Desbloqueia o Teu Stack de Vitaminas')}</Text>
                    <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{t('womensHealth.unlockStackSub', 'Vê as tuas recomendações de suplementos personalizadas para a tua fase do ciclo.')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setShowSupps(false); router.push('/premium' as any); }}>
                    <Text style={{ color: '#e11d48', fontWeight: '700' }}>{t('common.upgrade', 'Atualizar')}</Text>
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
                  <Text style={s.suppReason}>{isPro ? supp.reason : t('womensHealth.suppLocked', 'Personalização bloqueada para utilizadores gratuitos.')}</Text>
                </View>
              ))}
            </View>

            <View style={s.suppDisclaimer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#94a3b8" />
              <Text style={s.suppDisclaimerTxt}>{t('womensHealth.suppDisclaimer', 'Consulta sempre um profissional de saúde antes de iniciar novos suplementos, especialmente durante a gravidez.')}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Pelvic Modal */}
      <Modal visible={showPelvicModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={s.pelvicTitle}>{t('womensHealth.pelvicTitle', 'Protocolo de Poder Pélvico')}</Text>
          <Text style={s.pelvicSub}>{t('womensHealth.pelvicSub', 'Fortalece o pavimento pélvico, reduz cólicas e apoia o core')}</Text>
          <Animated.View style={[s.timerCircle, { transform: [{ scale: pulseAnim }], borderColor: kegelActive ? '#e11d48' : '#e2e8f0', backgroundColor: kegelActive ? '#fef2f2' : '#f8fafc' }]}>
            <Text style={s.timerTime}>{String(Math.floor(kegelSecs / 60)).padStart(2,'0')}:{String(kegelSecs % 60).padStart(2,'0')}</Text>
            <Text style={s.timerMsg}>{kegelMsg}</Text>
          </Animated.View>
          <Text style={s.pelvicInstructions}>{t('womensHealth.pelvicInstructions', 'Contrai 5s → Relaxa 5s → Repete. Faz 10 ciclos por sessão.')}</Text>
          <TouchableOpacity style={[s.pelvicBtn, { backgroundColor: kegelActive ? '#1e293b' : '#e11d48' }]} onPress={() => setKegelActive(p => !p)}>
            <Text style={s.pelvicBtnTxt}>{kegelActive ? t('womensHealth.stopSession', 'Parar Sessão') : t('womensHealth.startTimer', 'Iniciar Timer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setKegelActive(false); setShowPelvicModal(false); }} style={{ marginTop: 16 }}>
            <Text style={{ color: '#94a3b8', fontWeight: '600' }}>{t('common.close', 'Fechar')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Stage Selector */}
      <Modal visible={showStageSelect} transparent animationType="fade">
        <View style={s.stageOverlay}>
          <View style={s.stageCard}>
            <Text style={s.stageTitle}>{t('womensHealth.lifeStage', 'Fase de Vida')}</Text>
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
                  {stage === 'cycle' ? t('womensHealth.menstrualCycle', 'Ciclo Menstrual') : stage === 'pregnancy' ? t('womensHealth.pregnancy', 'Gravidez') : t('womensHealth.menopause', 'Menopausa')}
                </Text>
                {lifeStage === stage && <Ionicons name="checkmark-circle" size={20} color="#e11d48" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowStageSelect(false)} style={s.stageCancelBtn}>
              <Text style={{ color: '#64748b', fontWeight: '700' }}>{t('common.cancel', 'Cancelar')}</Text>
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
          <Text style={s.headerTitle}>{t('womensHealth.title', 'Saúde Feminina')}</Text>
          <Text style={s.headerSub}>{t('womensHealth.headerSub', 'Inteligência hormonal')} · {t(`womensHealth.stage.${lifeStage}`, lifeStage)}</Text>
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
          { id: 'today',    label: t('womensHealth.tabToday', 'Hoje'),    emoji: '☀️' },
          { id: 'cycle',    label: lifeStage === 'pregnancy' ? t('womensHealth.tabBaby', 'Bebé') : lifeStage === 'menopause' ? t('womensHealth.tabTracker', 'Tracker') : t('womensHealth.tabCycle', 'Ciclo'), emoji: lifeStage === 'pregnancy' ? '👶' : '📅' },
          { id: 'insights', label: t('womensHealth.tabInsights', 'Insights'), emoji: '✦' },
          { id: 'learn',    label: t('womensHealth.tabLearn', 'Aprender'),    emoji: '📚' },
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
                <Text style={s.setupTitle}>{lifeStage === 'pregnancy' ? t('womensHealth.setupTitlePreg','👶 Acompanha a tua gravidez') : t('womensHealth.setupTitleCycle','🌸 Desbloqueia os teus insights do ciclo')}</Text>
                <Text style={s.setupSub}>{lifeStage === 'pregnancy' ? t('womensHealth.setupSubPreg','Quando foi a tua data de conceção?') : t('womensHealth.setupSubCycle','Quando começou o teu último período?')}</Text>
                <View style={s.setupInputRow}>
                  <TextInput style={s.setupInput} value={setupDate} onChangeText={setSetupDate} placeholder="YYYY-MM-DD" />
                  <TouchableOpacity style={s.setupSaveBtn} onPress={handleSetupSave}>
                    <Text style={s.setupSaveTxt}>{t('common.save','Guardar')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Phase hero card */}
            {phase && (
              <LinearGradient colors={phase.gradient} style={s.phaseHero}>
                <View style={s.phaseHeroTop}>
                  <View>
                    <Text style={s.phaseDay}>{t('womensHealth.day','Dia')} {phase.day} {t('womensHealth.ofCycle','do ciclo')}</Text>
                    <Text style={s.phaseName}>{phase.name}</Text>
                    <Text style={s.phaseHormone}>{phase.hormone}</Text>
                  </View>
                  <View style={s.scoreCircle}>
                    <Text style={s.scoreVal}>{score}%</Text>
                    <Text style={s.scoreLbl}>{t('womensHealth.today','hoje')}</Text>
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
                    <Text style={s.phaseDay}>{t('womensHealth.trimester','Trimestre')} {pregnancyStats.trimester}</Text>
                    <Text style={s.phaseName}>{t('womensHealth.week','Semana')} {pregnancyStats.weeks}</Text>
                    <Text style={s.phaseHormone}>{pregnancyStats.milestone}</Text>
                  </View>
                  <Text style={{ fontSize: 52 }}>{pregnancyStats.emoji}</Text>
                </View>
                <View style={s.pregnancyBar}>
                  <View style={[s.pregnancyBarFill, { width: `${pregnancyStats.progress * 100}%` as any }]} />
                </View>
                <Text style={s.pregnancyBarLbl}>{40 - pregnancyStats.weeks} {t('womensHealth.weeksToGo','semanas restantes')}</Text>
              </LinearGradient>
            )}

            {/* Menopause hero */}
            {lifeStage === 'menopause' && (
              <LinearGradient colors={['#7c3aed', '#5b21b6']} style={s.phaseHero}>
                <Text style={s.phaseName}>{t('womensHealth.menopauseTracker','Monitor de Menopausa')}</Text>
                <Text style={s.phaseDesc}>{t('womensHealth.menopauseDesc','Regista afrontamentos, humor e alterações de sono. O teu quadro hormonal importa.')}</Text>
                <View style={s.scoreCircle}>
                  <Text style={s.scoreVal}>{score}%</Text>
                  <Text style={s.scoreLbl}>{t('womensHealth.adherence','aderência')}</Text>
                </View>
              </LinearGradient>
            )}

            {/* Today's actions */}
            <Text style={s.sectionTitle}>{t('womensHealth.dailyProtocols','Protocolos Diários')}</Text>

            {/* Cycle sync cards */}
            {phase && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.syncScroll}>
                {[
                  { title: t('womensHealth.workout', '🏋️ Treino'), body: phase.workout,   color: '#eff6ff', border: '#bfdbfe' },
                  { title: t('womensHealth.nutrition', '🥗 Nutrição'), body: phase.nutrition,  color: '#f0fdf4', border: '#bbf7d0' },
                  { title: t('womensHealth.mood', '😌 Humor'), body: phase.mood,       color: '#f5f3ff', border: '#ddd6fe' },
                  { title: t('womensHealth.energy', '⚡ Energia'), body: phase.energy,   color: '#fffbeb', border: '#fde68a' },
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
              { icon: 'pulse-outline',   label: t('womensHealth.biolog','Bio-Registo Diário'),       sub: `${t('womensHealth.biologSub','Humor, energia, sintomas')}${lifeStage === 'cycle' ? ', '+t('womensHealth.flowLow','fluxo') : ''}`, onPress: () => setShowBioModal(true),   color: '#fdf2f8' },
              { icon: 'fitness-outline', label: t('womensHealth.pelvic','Protocolo Pélvico'),          sub: t('womensHealth.pelvicSub2','Core, pavimento & postura'),                                                                                 onPress: () => setShowPelvicModal(true), color: '#fdf2f8' },
              { icon: 'flask-outline',   label: t('womensHealth.vitStack','Stack de Vitalidade'),      sub: `${suppStack.length} ${t('womensHealth.personalisedSupps','suplementos personalizados')}`,                                              onPress: () => setShowSupps(true),       color: '#fdf2f8' },
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
                <Text style={s.sectionTitle}>{t('womensHealth.calendar','Calendário 28 Dias')}</Text>
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
                  <Text style={[s.phaseDiveName, { color: phase.color }]}>{phase.name} — {t('womensHealth.day','Dia')} {phase.day}</Text>
                  <Text style={s.phaseDiveBody}>{phase.description}</Text>
                  <View style={s.phaseDiveGrid}>
                    {[
                      { emoji: '💪', label: t('womensHealth.workoutLabel','Treino'),    val: phase.workout },
                      { emoji: '🥗', label: t('womensHealth.nutritionLabel','Nutrição'), val: phase.nutrition },
                      { emoji: '😌', label: t('womensHealth.moodLabel','Humor'),        val: phase.mood },
                      { emoji: '⚡', label: t('womensHealth.energyLabel','Energia'),    val: phase.energy },
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
                <Text style={s.sectionTitle}>{t('womensHealth.pregnancyTimeline','Linha do Tempo da Gravidez')}</Text>
                {/* Week-by-week */}
                {[1,2,3].map(tri => (
                  <View key={tri} style={s.trimesterBlock}>
                    <Text style={s.trimesterTitle}>{t('womensHealth.trimester','Trimestre')} {tri} {tri === pregnancyStats.trimester ? t('womensHealth.youAreHere','← estás aqui') : ''}</Text>
                    <Text style={s.trimesterRange}>
                      {tri === 1 ? t('womensHealth.tri1','Semanas 1–13 · Formação dos órgãos, náuseas, fadiga') :
                       tri === 2 ? t('womensHealth.tri2','Semanas 14–27 · Energia de volta, bebé mexe, ecografia anatómica') :
                                   t('womensHealth.tri3','Semanas 28–40 · Crescimento, preparação, planeamento do parto')}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Menopause tracker */}
            {lifeStage === 'menopause' && (
              <>
                <Text style={s.sectionTitle}>{t('womensHealth.symptomHistory','Histórico de Sintomas')}</Text>
                {vitalityHistory && vitalityHistory.length > 0 ? (
                  vitalityHistory.slice(-7).map((log: any, i: number) => (
                    <View key={i} style={s.historyRow}>
                      <Text style={s.historyDate}>{log.date}</Text>
                      <View style={s.historyStats}>
                        <Text style={s.historyStat}>{t('womensHealth.energy','Energia')}: {log.energy ?? '—'}/10</Text>
                        <Text style={s.historyStat}>{t('womensHealth.hotFlashShort','Afrontamento')}: {log.hotFlashSeverity ?? '—'}/10</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.emptyTxt}>{t('womensHealth.startLogging','Começa a registar o teu Bio-Registo diariamente para veres padrões aqui.')}</Text>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ INSIGHTS TAB ═══════════════ */}
        {activeTab === 'insights' && (
          <>
            <Text style={s.sectionTitle}>{t('womensHealth.yourInsights','Os Teus Insights Hormonais')}</Text>
            <Text style={s.insightsSub}>{t('womensHealth.insightsSub','Personalizados a partir do teu perfil, fase do ciclo, nível de stress, sono e foco de saúde.')}</Text>

            {insights.length === 0 && (
              <Text style={s.emptyTxt}>{t('womensHealth.insightsEmpty','Completa o teu bio-registo para gerar insights personalizados.')}</Text>
            )}

            {insights.map((insight, i) => (
              <View key={i} style={[s.insightCard, { borderLeftColor: insight.priority === 'high' ? '#dc2626' : insight.priority === 'medium' ? '#d97706' : '#94a3b8' }]}>
                <View style={s.insightTop}>
                  <Text style={s.insightEmoji}>{insight.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>{insight.title}</Text>
                    <View style={[s.priorityBadge, { backgroundColor: insight.priority === 'high' ? '#fef2f2' : '#fffbeb' }]}>
                      <Text style={[s.priorityTxt, { color: insight.priority === 'high' ? '#dc2626' : '#d97706' }]}>
                        {insight.priority === 'high' ? t('womensHealth.priorityHigh','⚠️ Prioridade') : t('womensHealth.priorityNote','💡 Nota')}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={s.insightBody}>{insight.body}</Text>
                {insight.link && (
                  <TouchableOpacity onPress={() => router.push(insight.link as any)} style={s.insightLink}>
                    <Text style={s.insightLinkTxt}>{t('womensHealth.takeAction','Tomar ação')} →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Pro blur */}
            {!isPro && (
              <View style={s.proBlurWrap}>
                <BlurView intensity={12} tint="light" style={StyleSheet.absoluteFill} />
                <View style={s.proBlurContent}>
                  <Text style={s.proBlurTitle}>{t('womensHealth.proBlurTitle','Desbloqueia Análise Hormonal Profunda')}</Text>
                  <Text style={s.proBlurSub}>{t('womensHealth.proBlurSub','Insights com IA que se adaptam ao teu histórico de ciclo, padrões e sintomas registados ao longo do tempo.')}</Text>
                  <TouchableOpacity style={s.proBlurBtn} onPress={() => router.push('/premium' as any)}>
                    <Text style={s.proBlurBtnTxt}>{t('premium.upgrade','Atualizar para Pro')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══════════════ LEARN TAB ═══════════════ */}
        {activeTab === 'learn' && (
          <>
            <Text style={s.sectionTitle}>{t('womensHealth.library','Biblioteca de Inteligência Hormonal')}</Text>
            <Text style={s.insightsSub}>{t('womensHealth.librarySub','Guias baseados em ciência para a saúde hormonal da mulher.')}</Text>
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
                <Text style={s.privacyTitle}>{t('womensHealth.privacyTitle','Os teus dados são teus')}</Text>
                <Text style={s.privacySub}>{t('womensHealth.privacySub','Nunca vendemos os teus dados de saúde íntima. Toca para ler o nosso compromisso.')}</Text>
              </View>
            </TouchableOpacity>

            {/* Re-take quiz */}
            <TouchableOpacity style={s.retakeBtn} onPress={() => { SecureStore.deleteItemAsync(QUIZ_KEY); setQuizDone(false); setQuizStep(0); setQuizAnswers({}); }}>
              <Ionicons name="refresh-outline" size={16} color="#e11d48" />
              <Text style={s.retakeTxt}>{t('womensHealth.retake','Atualizar o meu perfil hormonal')}</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.ScrollView>

      {/* Privacy modal */}
      <Modal visible={showPrivacy} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 24 }} edges={['top']}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 20 }}>{t('womensHealth.privacyFirst','A Tua Privacidade em Primeiro')}</Text>
          {[
            { icon: 'shield-checkmark', color: '#10b981', title: t('womensHealth.priv1Title','Zero Venda a Terceiros'), body: t('womensHealth.priv1Body','Os teus dados de saúde íntima não são vendidos a anunciantes, seguradoras ou corretores de dados.') },
            { icon: 'lock-closed',      color: '#2563eb', title: t('womensHealth.priv2Title','Encriptado de Ponta a Ponta'), body: t('womensHealth.priv2Body','Todos os dados de saúde sensíveis estão encriptados em repouso e em trânsito. Só tu tens acesso ao teu histórico.') },
            { icon: 'eye-off',          color: '#7c3aed', title: t('womensHealth.priv3Title','Sem Perfis'), body: t('womensHealth.priv3Body','Não utilizamos os teus dados de saúde para criar perfis publicitários. Ponto.') },
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
            <Text style={s.saveBtnTxt}>{t('common.close','Fechar')}</Text>
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
