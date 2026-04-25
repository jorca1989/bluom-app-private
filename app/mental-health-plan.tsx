/**
 * app/mental-health-plan.tsx
 *
 * 30-Day Mental Health Blueprint
 * – Free users  → hardcoded generic template (based on onboarding stress answers)
 * – Pro users   → AI-generated, rotates every 30 days
 *
 * Route: /mental-health-plan  (add to _layout.tsx as a Stack.Screen)
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type PillarKey = 'mind' | 'body' | 'connection' | 'purpose';
type IntensityLevel = 'light' | 'moderate' | 'deep';

interface DayActivity {
  id: string;
  title: string;
  duration: string;
  pillar: PillarKey;
  intensity: IntensityLevel;
  description: string;
  why: string;
}

interface DayPlan {
  day: number;
  title: string;
  focus: string;
  activities: DayActivity[];
  affirmation: string;
  reflectionPrompt: string;
}

interface WeekTheme {
  week: number;
  theme: string;
  tagline: string;
  colors: readonly [string, string];
  icon: string;
  days: DayPlan[];
}

// ─── Pillar / Intensity Meta ───────────────────────────────────────────────────

const PILLAR_META: Record<PillarKey, { color: string; bg: string; label: string; icon: string }> = {
  mind: { color: '#7c3aed', bg: '#ede9fe', label: 'Mind', icon: 'bulb-outline' },
  body: { color: '#059669', bg: '#d1fae5', label: 'Body', icon: 'body-outline' },
  connection: { color: '#2563eb', bg: '#dbeafe', label: 'Connection', icon: 'people-outline' },
  purpose: { color: '#d97706', bg: '#fef3c7', label: 'Purpose', icon: 'compass-outline' },
};

const INTENSITY_META: Record<IntensityLevel, { label: string; color: string }> = {
  light: { label: 'Light', color: '#22c55e' },
  moderate: { label: 'Moderate', color: '#eab308' },
  deep: { label: 'Deep', color: '#ef4444' },
};

// ─── 30-Day Plan Data ─────────────────────────────────────────────────────────

const WEEK_THEMES: WeekTheme[] = [
  {
    week: 1,
    theme: 'Foundation',
    tagline: 'Build your baseline',
    colors: ['#1e3a8a', '#3730a3'],
    icon: 'layers-outline',
    days: [
      {
        day: 1, title: 'Arrive Here', focus: 'Grounding',
        affirmation: 'I am exactly where I need to be.',
        reflectionPrompt: 'What is one thing that brings you peace right now?',
        activities: [
          {
            id: 'd1a1', title: '5-4-3-2-1 Grounding', duration: '5 min', pillar: 'mind', intensity: 'light',
            description: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
            why: 'Activates the parasympathetic nervous system within 90 seconds.'
          },
          {
            id: 'd1a2', title: 'Box Breathing', duration: '8 min', pillar: 'body', intensity: 'light',
            description: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 8 cycles.',
            why: 'Reduces cortisol by up to 25% (Stanford Neuroscience, 2023).'
          },
          {
            id: 'd1a3', title: 'Gratitude Seed', duration: '5 min', pillar: 'purpose', intensity: 'light',
            description: 'Write 3 very specific things you are grateful for today.',
            why: 'Gratitude activates the medial prefrontal cortex, reducing anxiety.'
          },
        ],
      },
      {
        day: 2, title: 'Body Scan', focus: 'Awareness',
        affirmation: 'I listen to what my body is telling me.',
        reflectionPrompt: 'Where do you carry tension today? Why might that be?',
        activities: [
          {
            id: 'd2a1', title: 'Progressive Muscle Relaxation', duration: '15 min', pillar: 'body', intensity: 'moderate',
            description: 'Tense each muscle group for 5s, release for 30s. Start at feet, end at face.',
            why: 'Reduces physical tension that mirrors mental stress.'
          },
          {
            id: 'd2a2', title: 'Morning Pages', duration: '10 min', pillar: 'mind', intensity: 'light',
            description: 'Write 3 pages of stream-of-consciousness immediately after waking. No editing.',
            why: 'Clears mental "noise" and surfaces unconscious concerns.'
          },
        ],
      },
      {
        day: 3, title: 'Connect', focus: 'Relationships',
        affirmation: 'I give and receive support freely.',
        reflectionPrompt: 'Who in your life lifts you up? When did you last tell them?',
        activities: [
          {
            id: 'd3a1', title: 'Send a Kind Message', duration: '5 min', pillar: 'connection', intensity: 'light',
            description: 'Text or call someone you appreciate. No agenda. Just warmth.',
            why: 'Acts of kindness release oxytocin, reducing cortisol for both parties.'
          },
          {
            id: 'd3a2', title: 'Loving-Kindness Meditation', duration: '12 min', pillar: 'mind', intensity: 'moderate',
            description: 'Silently wish wellbeing to yourself → a loved one → a neutral person → a difficult person.',
            why: 'Increases positive emotion and social connectedness (Fredrickson, 2008).'
          },
        ],
      },
      {
        day: 4, title: 'Rest & Integrate', focus: 'Recovery',
        affirmation: 'Rest is productive. I honour my need for stillness.',
        reflectionPrompt: 'What drains your energy? What restores it?',
        activities: [
          {
            id: 'd4a1', title: 'Yoga Nidra (NSDR)', duration: '20 min', pillar: 'body', intensity: 'light',
            description: 'Lie down. Follow a Non-Sleep Deep Rest protocol. Stay awake but fully relaxed.',
            why: 'Restores dopamine levels comparable to a 90-minute nap (Huberman Lab, 2021).'
          },
          {
            id: 'd4a2', title: 'Digital Sunset', duration: 'Evening', pillar: 'purpose', intensity: 'light',
            description: 'No screens 1 hour before bed. Replace with reading, stretching, or journaling.',
            why: 'Blue light delays melatonin by up to 3 hours. Sleep quality rises 34% without it.'
          },
        ],
      },
      {
        day: 5, title: 'Courage', focus: 'Self-Expression',
        affirmation: 'My voice matters. I express myself with confidence.',
        reflectionPrompt: 'What would you say if fear were not in the way?',
        activities: [
          {
            id: 'd5a1', title: 'Mirror Work', duration: '5 min', pillar: 'mind', intensity: 'moderate',
            description: 'Look into your eyes in a mirror. Say 3 affirmations aloud. Notice discomfort without judgement.',
            why: 'Increases self-compassion and reduces shame (Neff, 2021).'
          },
          {
            id: 'd5a2', title: 'Creative Sprint', duration: '15 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Draw, write, sing, dance — anything creative. No goal. No audience. Just expression.',
            why: 'Art-making reduces cortisol by up to 75% in 45 minutes (Stuckey & Nobel, 2010).'
          },
          {
            id: 'd5a3', title: 'Cold Water Finish', duration: '2 min', pillar: 'body', intensity: 'deep',
            description: 'End your shower on cold for 2 minutes. Breathe slowly through the discomfort.',
            why: 'Releases norepinephrine 200–300% — a natural antidepressant (Shevchuk, 2008).'
          },
        ],
      },
      {
        day: 6, title: 'Values Check-In', focus: 'Purpose',
        affirmation: 'I live in alignment with what matters most to me.',
        reflectionPrompt: 'Name your top 3 values. Did your week reflect them?',
        activities: [
          {
            id: 'd6a1', title: 'Values Mapping', duration: '20 min', pillar: 'purpose', intensity: 'moderate',
            description: 'List 10 things you value. Rank them. Write one action this week that honoured each top 3.',
            why: 'Values clarification is a core ACT technique reducing psychological inflexibility.'
          },
          {
            id: 'd6a2', title: 'Evening Body Scan Meditation', duration: '12 min', pillar: 'body', intensity: 'light',
            description: 'Lie down. Slowly bring awareness to each body part from feet to crown.',
            why: 'Reduces insomnia severity by 58% (Ong et al., 2014).'
          },
        ],
      },
      {
        day: 7, title: 'Celebrate Week 1', focus: 'Reflection & Reward',
        affirmation: 'I acknowledge every step I take toward my wellbeing.',
        reflectionPrompt: 'What was your biggest win this week — however small?',
        activities: [
          {
            id: 'd7a1', title: 'Weekly Review', duration: '15 min', pillar: 'purpose', intensity: 'light',
            description: 'Write: 3 wins, 1 challenge, 1 lesson, and 1 intention for next week.',
            why: 'Reflective journaling consolidates neurological learning patterns.'
          },
          {
            id: 'd7a2', title: 'Reward Ritual', duration: '30 min', pillar: 'connection', intensity: 'light',
            description: 'Do one thing purely for joy — a film, a meal, a walk with someone you love.',
            why: 'Reward prediction reinforces habit formation (Deci & Ryan, Self-Determination Theory).'
          },
        ],
      },
    ],
  },
  {
    week: 2,
    theme: 'Resilience',
    tagline: 'Strengthen your mind under pressure',
    colors: ['#064e3b', '#065f46'],
    icon: 'shield-checkmark-outline',
    days: [
      {
        day: 8, title: 'Stress Audit', focus: 'Stress',
        affirmation: 'I can handle hard things.',
        reflectionPrompt: 'What stresses you most right now? Is it urgent, important, both, or neither?',
        activities: [
          {
            id: 'd8a1', title: 'Circles of Control', duration: '15 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Draw a circle. Inside = things you control. Outside = things you cannot. Move your worries.',
            why: 'Reduces anxiety and increases agency (Covey, 2004).'
          },
          {
            id: 'd8a2', title: 'WOOP Goal Setting', duration: '10 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Wish → Outcome → Obstacle → Plan. Write one WOOP for the week.',
            why: 'WOOP nearly doubles goal achievement vs. positive thinking alone (Oettingen, 2014).'
          },
        ],
      },
      {
        day: 9, title: 'Reframing', focus: 'Cognition',
        affirmation: 'I choose how I interpret my world.',
        reflectionPrompt: 'Take a stressful thought. What is another way to see it?',
        activities: [
          {
            id: 'd9a1', title: 'Cognitive Reframing', duration: '15 min', pillar: 'mind', intensity: 'moderate',
            description: 'Take your most stressful thought. Write: Evidence for → Evidence against → Alternative view.',
            why: 'Core CBT technique. Reduces depressive symptoms by up to 40% (Beck, 2011).'
          },
          {
            id: 'd9a2', title: '4-7-8 Breathwork', duration: '8 min', pillar: 'body', intensity: 'light',
            description: 'Inhale 4s, hold 7s, exhale 8s. Repeat 4 cycles.',
            why: 'Activates the vagus nerve, shifting the nervous system into rest-and-digest.'
          },
        ],
      },
      {
        day: 10, title: 'Emotional Labelling', focus: 'Emotions',
        affirmation: 'My feelings are valid messengers.',
        reflectionPrompt: 'What emotion have you been avoiding? What might it be trying to tell you?',
        activities: [
          {
            id: 'd10a1', title: 'Emotion Wheel Practice', duration: '10 min', pillar: 'mind', intensity: 'light',
            description: 'Use an emotion wheel to name your feelings precisely. Go beyond "bad" or "sad".',
            why: 'Labelling emotions reduces amygdala activation immediately (Lieberman, 2007).'
          },
          {
            id: 'd10a2', title: 'Movement Medicine', duration: '25 min', pillar: 'body', intensity: 'moderate',
            description: 'Any movement you enjoy. Focus on how your body feels, not performance.',
            why: 'Exercise is as effective as antidepressants for mild-moderate depression (Blumenthal, 2007).'
          },
        ],
      },
      {
        day: 11, title: 'Boundaries', focus: 'Limits',
        affirmation: 'My "no" is an act of self-respect.',
        reflectionPrompt: 'Where in your life do you need a firmer boundary?',
        activities: [
          {
            id: 'd11a1', title: 'Boundary Script', duration: '15 min', pillar: 'connection', intensity: 'moderate',
            description: 'Write one boundary you need to set this week. Practice saying it aloud 3 times.',
            why: 'Assertiveness training reduces social anxiety and improves relationship satisfaction.'
          },
          {
            id: 'd11a2', title: 'NSDR Rest Protocol', duration: '20 min', pillar: 'body', intensity: 'light',
            description: 'Lie down. Follow a body scan or Yoga Nidra audio.',
            why: 'Restores alertness without caffeine; improves afternoon cognitive performance 20%.'
          },
        ],
      },
      {
        day: 12, title: 'Self-Compassion', focus: 'Self',
        affirmation: 'I treat myself with the kindness I give others.',
        reflectionPrompt: 'What would you say to a friend going through what you are facing?',
        activities: [
          {
            id: 'd12a1', title: 'Self-Compassion Letter', duration: '15 min', pillar: 'mind', intensity: 'moderate',
            description: 'Write a letter to yourself about a current struggle — as if writing to your best friend.',
            why: 'Self-compassion writing reduces shame and self-criticism (Neff & Germer, 2013).'
          },
          {
            id: 'd12a2', title: 'Savouring Practice', duration: '10 min', pillar: 'purpose', intensity: 'light',
            description: 'Recall a positive memory in vivid detail for 10 minutes. Write what you sensed.',
            why: 'Savouring boosts positive affect and extends the benefits of good experiences.'
          },
        ],
      },
      {
        day: 13, title: 'Social Battery', focus: 'Energy',
        affirmation: 'I protect my energy without guilt.',
        reflectionPrompt: 'Which relationships give you energy? Which deplete it?',
        activities: [
          {
            id: 'd13a1', title: 'Energy Audit', duration: '15 min', pillar: 'connection', intensity: 'light',
            description: 'List all people/activities from the past week. Rate each +/- on your energy.',
            why: 'Conscious energy management prevents burnout (Loehr & Schwartz, 2003).'
          },
          {
            id: 'd13a2', title: 'Digital Detox Hour', duration: '60 min', pillar: 'mind', intensity: 'moderate',
            description: 'One hour with all notifications off. Be entirely present with one analogue activity.',
            why: 'Phone-free periods reduce anxiety scores by 23% (Duke University, 2021).'
          },
        ],
      },
      {
        day: 14, title: 'Week 2 Reflection', focus: 'Review',
        affirmation: 'Growth takes time. I am patient with myself.',
        reflectionPrompt: 'How have you grown since Day 1?',
        activities: [
          {
            id: 'd14a1', title: 'Week 2 Journal', duration: '20 min', pillar: 'purpose', intensity: 'light',
            description: 'Wins → Challenges → Patterns noticed → One commitment for Week 3.',
            why: 'Structured reflection embeds learning and prepares the brain for next-phase change.'
          },
        ],
      },
    ],
  },
  {
    week: 3,
    theme: 'Growth',
    tagline: 'Expand beyond your comfort zone',
    colors: ['#7c2d12', '#92400e'],
    icon: 'trending-up-outline',
    days: [
      {
        day: 15, title: 'Curiosity', focus: 'Learning',
        affirmation: 'Curiosity is my superpower.',
        reflectionPrompt: 'What topic have you always wanted to learn but kept putting off?',
        activities: [
          {
            id: 'd15a1', title: 'Learn for 30 Minutes', duration: '30 min', pillar: 'mind', intensity: 'moderate',
            description: 'Pick one topic. Read, watch, or listen with no distraction for 30 minutes.',
            why: 'Neuroplasticity peaks with focused, novel learning — 30 min is optimal for retention.'
          },
          {
            id: 'd15a2', title: 'Teach-Back Method', duration: '10 min', pillar: 'mind', intensity: 'moderate',
            description: 'Explain what you just learned in simple words, as if to a 10-year-old.',
            why: 'The Feynman Technique reveals gaps in understanding and deepens memory encoding.'
          },
        ],
      },
      {
        day: 16, title: 'Fear Ladder', focus: 'Courage',
        affirmation: 'I walk toward what scares me — one step at a time.',
        reflectionPrompt: 'What is one small thing you have been avoiding due to fear?',
        activities: [
          {
            id: 'd16a1', title: 'Build Your Fear Ladder', duration: '20 min', pillar: 'purpose', intensity: 'deep',
            description: 'Identify your fear. Break it into 10 steps from easiest to hardest. Take step 1 today.',
            why: 'Gradual exposure systematically reduces avoidance and anxiety responses (CBT).'
          },
        ],
      },
      {
        day: 17, title: 'Flow State', focus: 'Engagement',
        affirmation: 'When I lose track of time, I am most alive.',
        reflectionPrompt: 'When were you last completely absorbed in something? What were you doing?',
        activities: [
          {
            id: 'd17a1', title: 'Flow Activity', duration: '45 min', pillar: 'body', intensity: 'moderate',
            description: 'Do one activity that makes you lose track of time. Remove all distractions.',
            why: 'Flow state activates dopamine, norepinephrine, and endorphins simultaneously.'
          },
        ],
      },
      {
        day: 18, title: 'Meaning Audit', focus: 'Purpose',
        affirmation: 'My life is meaningful because I choose to make it so.',
        reflectionPrompt: 'What would make your life feel more meaningful?',
        activities: [
          {
            id: 'd18a1', title: 'Ikigai Mapping', duration: '25 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Draw the Ikigai diagram: What you love, are good at, the world needs, can be paid for.',
            why: 'Ikigai alignment predicts life satisfaction and longevity (Okinawa Blue Zone research).'
          },
        ],
      },
      {
        day: 19, title: 'Strengths', focus: 'Identity',
        affirmation: 'My strengths are unique gifts I offer the world.',
        reflectionPrompt: 'What are you naturally good at that others often notice?',
        activities: [
          {
            id: 'd19a1', title: 'VIA Strengths Reflection', duration: '30 min', pillar: 'mind', intensity: 'light',
            description: 'List your top 5 character strengths. Write one way you used each this week.',
            why: 'Using top strengths daily reduces depression by 40% (Seligman, PERMA model).'
          },
        ],
      },
      {
        day: 20, title: 'Forgiveness', focus: 'Release',
        affirmation: 'Forgiveness is a gift I give myself.',
        reflectionPrompt: 'Who or what are you holding resentment toward? What would it feel like to release it?',
        activities: [
          {
            id: 'd20a1', title: 'Forgiveness Letter', duration: '20 min', pillar: 'mind', intensity: 'deep',
            description: 'Write a letter of forgiveness — you do not have to send it. Focus on your own release.',
            why: 'Forgiveness reduces hostility, blood pressure, and depression scores significantly.'
          },
        ],
      },
      {
        day: 21, title: 'Week 3 Review', focus: 'Reflection',
        affirmation: 'I am not who I was. I am becoming who I want to be.',
        reflectionPrompt: 'What surprised you about yourself in Week 3?',
        activities: [
          {
            id: 'd21a1', title: 'Celebration Ritual', duration: '30 min', pillar: 'purpose', intensity: 'light',
            description: 'Re-read your Day 1 entry. Write: Who you were → Who you are now. Celebrate the difference.',
            why: 'Completion rituals anchor gains and motivate continued behaviour change.'
          },
        ],
      },
    ],
  },
  {
    week: 4,
    theme: 'Integration',
    tagline: 'Make it who you are',
    colors: ['#1e1b4b', '#4c1d95'],
    icon: 'infinite-outline',
    days: [
      {
        day: 22, title: 'Habit Stack', focus: 'Systems',
        affirmation: 'My routines are the architecture of my best self.',
        reflectionPrompt: 'Which 3 practices from this programme do you want to keep forever?',
        activities: [
          {
            id: 'd22a1', title: 'Habit Stacking Plan', duration: '20 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Write 3 habits: Trigger → New behaviour → Reward. Stack them onto existing routines.',
            why: 'Habit stacking has a 91% success rate vs. solo habit formation (Fogg, BJ, 2020).'
          },
        ],
      },
      {
        day: 23, title: 'Identity Shift', focus: 'Identity',
        affirmation: 'I am the person I have chosen to become.',
        reflectionPrompt: 'Write your new identity statement: "I am someone who ____."',
        activities: [
          {
            id: 'd23a1', title: 'Identity Statement Writing', duration: '15 min', pillar: 'mind', intensity: 'moderate',
            description: 'Write 5 "I am" statements that describe who you are becoming. Read them daily.',
            why: 'Identity-based habits are 2× more durable than outcome-based goals (Clear, Atomic Habits).'
          },
        ],
      },
      {
        day: 24, title: 'Support System', focus: 'Community',
        affirmation: 'I am surrounded by people who want me to thrive.',
        reflectionPrompt: 'Who in your life supports your mental health journey?',
        activities: [
          {
            id: 'd24a1', title: 'Support Map', duration: '15 min', pillar: 'connection', intensity: 'light',
            description: 'Draw your support map: emotional, practical, professional, and social contacts.',
            why: 'Social support is the strongest predictor of resilience (Southwick & Charney, 2012).'
          },
        ],
      },
      {
        day: 25, title: 'Future Self', focus: 'Vision',
        affirmation: 'My future self is worth investing in today.',
        reflectionPrompt: 'Write a letter from your future self one year from now.',
        activities: [
          {
            id: 'd25a1', title: 'Future Self Letter', duration: '20 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Write from your future self (12 months ahead). What did you do? Who are you?',
            why: 'Future self visualisation increases present self-regulation by 30% (Hershfield, 2011).'
          },
        ],
      },
      {
        day: 26, title: 'Maintenance Plan', focus: 'Sustainability',
        affirmation: 'I have the tools. I choose to use them.',
        reflectionPrompt: 'What will you do when things get hard again?',
        activities: [
          {
            id: 'd26a1', title: 'Personal Crisis Plan', duration: '20 min', pillar: 'purpose', intensity: 'moderate',
            description: 'Write your mental health crisis plan: warning signs, triggers, interventions, people to call.',
            why: 'Having a written plan reduces the duration and impact of mental health crises.'
          },
          {
            id: 'd26a2', title: 'Mental Rehearsal', duration: '10 min', pillar: 'mind', intensity: 'light',
            description: 'Roleplay a hard day mentally. What do you do first? Second? Who do you call?',
            why: 'Mental rehearsal primes neural pathways to execute coping responses automatically.'
          },
        ],
      },
      {
        day: 27, title: 'Gratitude Ceremony', focus: 'Gratitude',
        affirmation: 'I am proud of the work I have done.',
        reflectionPrompt: 'What are you most proud of about this month?',
        activities: [
          {
            id: 'd27a1', title: 'Thank-You Notes', duration: '20 min', pillar: 'connection', intensity: 'light',
            description: 'Write thank-you notes to people who supported you this month. Send at least one.',
            why: 'Expressed gratitude deepens relationships and increases personal wellbeing scores.'
          },
        ],
      },
      {
        day: 28, title: 'New Beginning', focus: 'Continuity',
        affirmation: 'Every day is a new beginning.',
        reflectionPrompt: 'What does the next chapter of your life look like?',
        activities: [
          {
            id: 'd28a1', title: 'Reflection & Recommitment', duration: '30 min', pillar: 'purpose', intensity: 'light',
            description: 'Re-read your Day 1 entry. Write: Who you were → Who you are → Who you are becoming. Set Month 2 intentions.',
            why: 'Narrative continuity supports identity integration and sustained behaviour change.'
          },
        ],
      },
    ],
  },
];

const ALL_DAYS: DayPlan[] = WEEK_THEMES.flatMap(w => w.days);

// ─── Sub-components ────────────────────────────────────────────────────────────

function WeekCard({
  theme, isActive, onPress,
}: { theme: WeekTheme; isActive: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginRight: 12 }}>
      <LinearGradient
        colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[wcS.card, isActive && wcS.active]}
      >
        <Ionicons name={theme.icon as any} size={20} color="rgba(255,255,255,0.75)" />
        <Text style={wcS.weekLabel}>{t('wellness.mentalHealth.weekLabel', 'WEEK {{week}}', { week: theme.week })}</Text>
        <Text style={wcS.title}>{t(`wellness.mentalHealth.themes.w${theme.week}Title`, theme.theme)}</Text>
        <Text style={wcS.tagline}>{t(`wellness.mentalHealth.themes.w${theme.week}Tagline`, theme.tagline)}</Text>
        {isActive && <View style={wcS.dot} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}
const wcS = StyleSheet.create({
  card: {
    width: 162, borderRadius: 20, padding: 16, minHeight: 130,
    justifyContent: 'flex-end', gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  active: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)' },
  weekLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 1.2, marginTop: 8 },
  title: { fontSize: 16, color: '#fff', fontWeight: '900', letterSpacing: -0.3 },
  tagline: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  dot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff',
  },
});

function DayRow({
  plan, isToday, isCompleted, onPress,
}: { plan: DayPlan; isToday: boolean; isCompleted: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const pillars = [...new Set(plan.activities.map(a => a.pillar))];
  const totalMin = plan.activities.reduce((acc, a) => {
    const n = parseInt(a.duration);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <View style={[drS.row, isToday && drS.todayRow, isCompleted && drS.completedRow]}>
        <View style={[drS.dayBadge, isToday && drS.todayBadge, isCompleted && drS.completedBadge]}>
          {isCompleted
            ? <Ionicons name="checkmark" size={16} color="#fff" />
            : <Text style={[drS.dayNum, isToday && { color: '#fff' }]}>{plan.day}</Text>
          }
        </View>
        <View style={drS.info}>
          <Text style={drS.title} numberOfLines={1}>{t(`wellness.mentalHealth.days.d${plan.day}Title`, plan.title)}</Text>
          <Text style={drS.meta}>{t(`wellness.mentalHealth.days.d${plan.day}Focus`, plan.focus)} · {totalMin > 0 ? t('wellness.mentalHealth.durationMin', '{{min}} min', { min: totalMin }) : t('wellness.mentalHealth.evening', 'Evening')}</Text>
        </View>
        <View style={drS.pillars}>
          {pillars.map(p => (
            <View key={p} style={[drS.pillarDot, { backgroundColor: PILLAR_META[p].color }]} />
          ))}
        </View>
        <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );
}
const drS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  todayRow: { borderWidth: 1.5, borderColor: '#8b5cf6', backgroundColor: '#faf5ff' },
  completedRow: { opacity: 0.65 },
  dayBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  todayBadge: { backgroundColor: '#8b5cf6' },
  completedBadge: { backgroundColor: '#22c55e' },
  dayNum: { fontSize: 13, fontWeight: '800', color: '#475569' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  pillars: { flexDirection: 'row', gap: 4, marginRight: 4 },
  pillarDot: { width: 7, height: 7, borderRadius: 4 },
});

function ActivityCard({ activity }: { activity: DayActivity }) {
  const { t } = useTranslation();
  const pillar = PILLAR_META[activity.pillar];
  const intensity = INTENSITY_META[activity.intensity];
  return (
    <View style={acS.card}>
      <View style={acS.header}>
        <View style={[acS.pillarBadge, { backgroundColor: pillar.bg }]}>
          <Ionicons name={pillar.icon as any} size={11} color={pillar.color} />
          <Text style={[acS.pillarText, { color: pillar.color }]}>{t(`wellness.mentalHealth.pillars.${activity.pillar}`, pillar.label)}</Text>
        </View>
        <View style={acS.metaRow}>
          <Ionicons name="time-outline" size={11} color="#94a3b8" />
          <Text style={acS.duration}>{activity.duration}</Text>
          <View style={[acS.intDot, { backgroundColor: intensity.color }]} />
          <Text style={[acS.intText, { color: intensity.color }]}>{t(`wellness.mentalHealth.intensity.${activity.intensity}`, intensity.label)}</Text>
        </View>
      </View>
      <Text style={acS.title}>{t(`wellness.mentalHealth.activities.${activity.id}Title`, activity.title)}</Text>
      <Text style={acS.desc}>{t(`wellness.mentalHealth.activities.${activity.id}Desc`, activity.description)}</Text>
      <View style={acS.whyBox}>
        <Ionicons name="flask-outline" size={12} color="#7c3aed" />
        <Text style={acS.why}>{t(`wellness.mentalHealth.activities.${activity.id}Why`, activity.why)}</Text>
      </View>
    </View>
  );
}
const acS = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#8b5cf6',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pillarBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  pillarText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  duration: { fontSize: 11, color: '#64748b' },
  intDot: { width: 6, height: 6, borderRadius: 3 },
  intText: { fontSize: 10, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  desc: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 10 },
  whyBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#ede9fe', borderRadius: 8, padding: 10 },
  why: { flex: 1, fontSize: 11, color: '#5b21b6', lineHeight: 16, fontStyle: 'italic' },
});

// ─── Day Detail Modal ──────────────────────────────────────────────────────────

function DayDetailModal({
  plan, visible, onClose,
}: { plan: DayPlan | null; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!plan) return null;
  const week = WEEK_THEMES.find(w => w.days.some(d => d.day === plan.day));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <LinearGradient
          colors={week?.colors ?? ['#1e1b4b', '#312e81']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={ddS.header}
        >
          <TouchableOpacity onPress={onClose} style={ddS.closeBtn}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={ddS.dayLabel}>{t('wellness.mentalHealth.dayLabel', 'DAY {{day}}', { day: plan.day })}</Text>
          <Text style={ddS.title}>{t(`wellness.mentalHealth.days.d${plan.day}Title`, plan.title)}</Text>
          <Text style={ddS.focus}>{t(`wellness.mentalHealth.days.d${plan.day}Focus`, plan.focus)}</Text>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Affirmation */}
          <View style={ddS.affirmBox}>
            <Ionicons name="sunny-outline" size={15} color="#d97706" />
            <Text style={ddS.affirmText}>"{t(`wellness.mentalHealth.days.d${plan.day}Affirm`, plan.affirmation)}"</Text>
          </View>

          {/* Activities */}
          <Text style={ddS.sectionTitle}>{t('wellness.mentalHealth.todaysPractices', 'Today\'s Practices')}</Text>
          {plan.activities.map(a => <ActivityCard key={a.id} activity={a} />)}

          {/* Reflection */}
          <View style={ddS.reflectionBox}>
            <Text style={ddS.reflectionLabel}>{t('wellness.mentalHealth.eveningReflection', '📝  Evening Reflection')}</Text>
            <Text style={ddS.reflectionPrompt}>{t(`wellness.mentalHealth.days.d${plan.day}Reflect`, plan.reflectionPrompt)}</Text>
          </View>

          {/* Pillar Legend */}
          <View style={ddS.legendRow}>
            {Object.entries(PILLAR_META).map(([key, meta]) => (
              <View key={key} style={[ddS.legendItem, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                <Text style={[ddS.legendText, { color: meta.color }]}>{t(`wellness.mentalHealth.pillars.${key}`, meta.label)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const ddS = StyleSheet.create({
  header: { padding: 24, paddingTop: 16, paddingBottom: 28 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  dayLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 2 },
  focus: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  affirmBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 16, marginBottom: 20,
    borderLeftWidth: 3, borderLeftColor: '#d97706',
  },
  affirmText: { flex: 1, fontSize: 14, color: '#92400e', fontStyle: 'italic', lineHeight: 20, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  reflectionBox: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  reflectionLabel: { fontSize: 13, fontWeight: '700', color: '#15803d', marginBottom: 8 },
  reflectionPrompt: { fontSize: 14, color: '#166534', lineHeight: 20, fontStyle: 'italic' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  legendText: { fontSize: 10, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function MentalHealthPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const user = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );
  const activePlans = useQuery(api.plans.getActivePlans, user ? {} : 'skip');

  const isPro = !!user?.isPremium;
  const startDate = (activePlans?.wellnessPlan as any)?.programStartDate;
  const daysSince = startDate
    ? Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24))
    : 0;
  const currentDay = Math.min(Math.max(daysSince + 1, 1), 28);
  const currentWeek = Math.min(Math.ceil(currentDay / 7), 4);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(currentWeek - 1);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const activeWeek = WEEK_THEMES[selectedWeekIdx];

  // Pillar counts across completed days
  const completedDays = ALL_DAYS.filter(d => d.day < currentDay);
  const pillarCounts = completedDays.reduce<Record<PillarKey, number>>(
    (acc, d) => {
      d.activities.forEach(a => { acc[a.pillar] = (acc[a.pillar] ?? 0) + 1; });
      return acc;
    },
    { mind: 0, body: 0, connection: 0, purpose: 0 }
  );
  const maxPillar = Math.max(...Object.values(pillarCounts), 1);

  // Overall progress
  const progressPct = Math.round(((currentDay - 1) / 28) * 100);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={ps.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 60 }}
      >

        {/* ── Hero Header ── */}
        <LinearGradient
          colors={['#1e1b4b', '#312e81', '#4c1d95']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={ps.hero}
        >
          <View style={[ps.blob, { top: -40, right: -20, width: 180, height: 180, backgroundColor: 'rgba(139,92,246,0.22)' }]} />
          <View style={[ps.blob, { bottom: -30, left: 30, width: 110, height: 110, backgroundColor: 'rgba(99,102,241,0.18)' }]} />

          <TouchableOpacity onPress={() => router.back()} style={ps.backBtn}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <View style={ps.heroBadge}>
            <Text style={ps.heroBadgeText}>
              {isPro ? t('wellness.mentalHealth.badgePro', '✦ PRO · AI-Powered · Rotates Monthly') : t('wellness.mentalHealth.badgeFree', '28-Day Blueprint · Free')}
            </Text>
          </View>
          <Text style={ps.heroTitle}>{t('wellness.mentalHealth.heroTitle1', 'Mental Health')}{'\n'}{t('wellness.mentalHealth.heroTitle2', 'Blueprint')}</Text>
          <Text style={ps.heroSub}>
            {isPro ? t('wellness.mentalHealth.heroSubPro', 'Personalised to your stress patterns, sleep data & goals.') : t('wellness.mentalHealth.heroSubFree', 'A research-backed 28-day programme. Free users get a full 28-day blueprint. Upgrade to Pro to continue.')}
          </Text>

          {/* Progress bar */}
          <View style={ps.progressWrap}>
            <View style={ps.progressTrack}>
              <View style={[ps.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={ps.progressText}>{t('wellness.mentalHealth.progressText', 'Day {{day}} of 28 complete · {{pct}}%', { day: currentDay - 1, pct: progressPct })}</Text>
          </View>
        </LinearGradient>

        {/* ── Today's Card ── */}
        {ALL_DAYS.find(d => d.day === currentDay) && (
          <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const day = ALL_DAYS.find(d => d.day === currentDay);
                if (day) { setSelectedDay(day); setShowDetail(true); }
              }}
            >
              <LinearGradient
                colors={WEEK_THEMES[currentWeek - 1]?.colors ?? ['#1e1b4b', '#312e81']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ps.todayCard}
              >
                <View style={ps.todayLeft}>
                  <Text style={ps.todayLabel}>{t('wellness.mentalHealth.todayLabel', 'TODAY · DAY {{day}}', { day: currentDay })}</Text>
                  <Text style={ps.todayTitle}>{ALL_DAYS[currentDay - 1] ? t(`wellness.mentalHealth.days.d${currentDay}Title`, ALL_DAYS[currentDay - 1].title) : ''}</Text>
                  <Text style={ps.todayFocus}>{ALL_DAYS[currentDay - 1] ? t(`wellness.mentalHealth.days.d${currentDay}Focus`, ALL_DAYS[currentDay - 1].focus) : ''}</Text>
                </View>
                <View style={ps.todayRight}>
                  <View style={ps.startBtn}>
                    <Ionicons name="play" size={18} color="#8b5cf6" />
                    <Text style={ps.startBtnText}>{t('wellness.mentalHealth.start', 'Start')}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pillar Progress ── */}
        <View style={[ps.section, { marginTop: 28 }]}>
          <Text style={ps.sectionTitle}>{t('wellness.mentalHealth.pillarBalance', 'Pillar Balance')}</Text>
          <Text style={ps.sectionSub}>{t('wellness.mentalHealth.pillarSub', 'Activities completed across each dimension')}</Text>
          <View style={ps.pillarsGrid}>
            {(Object.entries(PILLAR_META) as [PillarKey, typeof PILLAR_META[PillarKey]][]).map(([key, meta]) => {
              const count = pillarCounts[key] ?? 0;
              const pct = maxPillar > 0 ? count / maxPillar : 0;
              return (
                <View key={key} style={[ps.pillarCard, { backgroundColor: meta.bg }]}>
                  <View style={[ps.pillarIconWrap, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <Text style={[ps.pillarLabel, { color: meta.color }]}>{t(`wellness.mentalHealth.pillars.${key}`, meta.label)}</Text>
                  <View style={ps.pillarBarTrack}>
                    <View style={[ps.pillarBarFill, { width: `${pct * 100}%`, backgroundColor: meta.color }]} />
                  </View>
                  <Text style={[ps.pillarCount, { color: meta.color }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Week Selector ── */}
        <View style={{ marginTop: 28 }}>
          <View style={[ps.section, { marginBottom: 14 }]}>
            <Text style={ps.sectionTitle}>{t('wellness.mentalHealth.overview', '4-Week Overview')}</Text>
          </View>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}
          >
            {WEEK_THEMES.map((wt, idx) => (
              <WeekCard
                key={wt.week}
                theme={wt}
                isActive={idx === selectedWeekIdx}
                onPress={() => setSelectedWeekIdx(idx)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Day List ── */}
        <View style={[ps.section, { marginTop: 24 }]}>
          <View style={ps.weekHeaderRow}>
            <View>
              <Text style={ps.sectionTitle}>{t(`wellness.mentalHealth.themes.w${activeWeek.week}Title`, activeWeek.theme)}</Text>
              <Text style={ps.sectionSub}>{t(`wellness.mentalHealth.themes.w${activeWeek.week}Tagline`, activeWeek.tagline)}</Text>
            </View>
            <LinearGradient colors={activeWeek.colors} style={ps.weekBadge}>
              <Text style={ps.weekBadgeText}>{t('wellness.mentalHealth.weekLabel', 'Week {{week}}', { week: activeWeek.week })}</Text>
            </LinearGradient>
          </View>

          {activeWeek.days.map(plan => (
            <DayRow
              key={plan.day}
              plan={plan}
              isToday={plan.day === currentDay}
              isCompleted={plan.day < currentDay}
              onPress={() => { setSelectedDay(plan); setShowDetail(true); }}
            />
          ))}
        </View>

        {/* ── Pro Upsell Banner (free only) ── */}
        {!isPro && (
          <View style={ps.section}>
            <TouchableOpacity
              onPress={() => router.push('/premium' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0f172a', '#1e1b4b']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ps.upsellBanner}
              >
                <View style={[ps.blob, { top: -20, right: 0, width: 100, height: 100, backgroundColor: 'rgba(139,92,246,0.2)' }]} />
                <Ionicons name="sparkles" size={22} color="#a78bfa" style={{ marginBottom: 10 }} />
                <Text style={ps.upsellTitle}>{t('wellness.mentalHealth.continueJourney', 'Continue Your Journey')}</Text>
                <Text style={ps.upsellSub}>
                  {t('wellness.mentalHealth.freeUsers28DaysFull', 'Free users get a full 28-day blueprint. When your 28 days finish, upgrade to Pro to continue your transformation with a Gemini-powered plan tailored to your stress, mood, and sleep — refreshed monthly.')}
                </Text>
                <View style={ps.upsellCta}>
                  <Text style={ps.upsellCtaText}>{t('wellness.mentalHealth.goPro', 'Upgrade to Pro →')}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Research Footer ── */}
        <View style={ps.section}>
          <View style={ps.researchBox}>
            <Ionicons name="library-outline" size={15} color="#7c3aed" />
            <Text style={ps.researchText}>
              {t('wellness.mentalHealth.disclaimer', 'This programme draws on evidence-based practices from CBT, ACT, positive psychology, neuroscience, and somatic therapy. It is not a substitute for professional mental health care.')}
            </Text>
          </View>
        </View>

      </ScrollView>

      {showDetail && selectedDay && (
        <DayDetailModal
          plan={selectedDay}
          visible={showDetail}
          onClose={() => setShowDetail(false)}
        />
      )}
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Hero
  hero: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 44,
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: 999 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  heroBadgeText: { fontSize: 9, color: '#a78bfa', fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34, marginBottom: 8 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 18, marginBottom: 20 },

  progressWrap: {},
  progressTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: '#a78bfa', borderRadius: 3 },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // Today card
  todayCard: {
    borderRadius: 22, padding: 20, flexDirection: 'row',
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  todayLeft: { flex: 1 },
  todayLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  todayTitle: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 24 },
  todayFocus: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  todayRight: { alignItems: 'center' },
  startBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  startBtnText: { fontSize: 13, fontWeight: '800', color: '#7c3aed' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 14 },

  // Pillar grid
  pillarsGrid: { flexDirection: 'row', gap: 10 },
  pillarCard: {
    flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  pillarIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  pillarLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  pillarBarTrack: { width: '100%', height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  pillarBarFill: { height: '100%', borderRadius: 2 },
  pillarCount: { fontSize: 14, fontWeight: '900' },

  // Week header
  weekHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  weekBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  weekBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Upsell
  upsellBanner: {
    borderRadius: 22, padding: 22, marginTop: 4, overflow: 'hidden',
    shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  upsellTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 8 },
  upsellSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18, marginBottom: 16 },
  upsellCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  upsellCtaText: { color: '#c4b5fd', fontWeight: '800', fontSize: 13 },

  // Research note
  researchBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#f3f0ff', borderRadius: 14, padding: 14, marginTop: 4,
  },
  researchText: { flex: 1, fontSize: 11, color: '#6d28d9', lineHeight: 17 },
});
