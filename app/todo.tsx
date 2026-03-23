/**
 * Bluom Productivity Hub  —  app/todo-list.tsx
 * ─────────────────────────────────────────────
 * Free:  3-task limit · 1 AI decompose/day · no partner sync · no projects
 * Pro:   Unlimited · AI everywhere · projects · partner sync · Bluom integrations
 *
 * First-run quiz (4 questions) personalises smart templates and AI tips
 * using data already known from onboarding (fitnessGoal, stressLevel,
 * workoutPreference, coachingStyle, sleepHours, motivations, challenges).
 */

import React, {
    useState, useMemo, useRef, useCallback, useEffect,
  } from 'react';
  import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Alert, Animated, Dimensions,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Linking, Switch,
  } from 'react-native';
  import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
  import { useRouter } from 'expo-router';
  import { Ionicons } from '@expo/vector-icons';
  import { useMutation, useQuery } from 'convex/react';
  import { api } from '@/convex/_generated/api';
  import { useUser } from '@clerk/clerk-expo';
  import { useAccessControl } from '@/hooks/useAccessControl';
  import { ProUpgradeModal } from '@/components/ProUpgradeModal';
  import * as SecureStore from 'expo-secure-store';
  
  const { width: SW } = Dimensions.get('window');
  const QUIZ_KEY      = 'bluom_prod_quiz_v2';
  
  // ─────────────────────────────────────────────────────────────
  // TYPES
  // ─────────────────────────────────────────────────────────────
  type Category = 'Work' | 'Personal' | 'Health' | 'Family' | 'Finance' | 'Grocery';
  type Priority  = 'low' | 'medium' | 'high' | 'urgent';
  
  interface QuizProfile {
    role:       string;   // 'entrepreneur'|'executive'|'wfh'|'healthcare'|'student'|'other'
    blocker:    string;   // 'focus'|'overload'|'procrastination'|'balance'
    rhythm:     string;   // 'deep'|'reactive'|'mixed'
    weekGoal:   string;   // free text
  }
  
  // ─────────────────────────────────────────────────────────────
  // QUIZ STEPS
  // ─────────────────────────────────────────────────────────────
  const QUIZ_STEPS = [
    {
      id: 'role',
      emoji: '🧭',
      question: 'What best describes your day?',
      options: [
        { value: 'entrepreneur', label: 'Founder / Builder',    icon: '🚀' },
        { value: 'executive',   label: 'Executive / Manager',  icon: '💼' },
        { value: 'wfh',         label: 'Remote / WFH Pro',     icon: '🏠' },
        { value: 'healthcare',  label: 'Healthcare / Clinician',icon: '🩺' },
        { value: 'student',     label: 'Student / Learner',    icon: '📚' },
        { value: 'other',       label: 'Something else',       icon: '✨' },
      ],
    },
    {
      id: 'blocker',
      emoji: '🎯',
      question: 'What kills your productivity most?',
      options: [
        { value: 'focus',           label: 'Staying focused',          icon: '🧠' },
        { value: 'overload',        label: 'Too many tasks / overload', icon: '🌊' },
        { value: 'procrastination', label: 'Starting hard things',     icon: '⏳' },
        { value: 'balance',         label: 'Work-life boundaries',     icon: '⚖️' },
      ],
    },
    {
      id: 'rhythm',
      emoji: '⚡',
      question: 'How do you prefer to work?',
      options: [
        { value: 'deep',     label: 'Deep blocks (2h+ focus)',   icon: '🔬' },
        { value: 'reactive', label: 'Short sprints, fast turns', icon: '⚡' },
        { value: 'mixed',    label: 'Mix of both',              icon: '🔀' },
      ],
    },
    {
      id: 'weekGoal',
      emoji: '🌟',
      question: "What's the ONE thing you must deliver this week?",
      type: 'text',
      placeholder: 'e.g. Close the Johnson deal, ship v1, run 5k…',
    },
  ] as const;
  
  // ─────────────────────────────────────────────────────────────
  // SMART TEMPLATES keyed by role
  // ─────────────────────────────────────────────────────────────
  const TEMPLATES: Record<string, { text: string; category: Category; priority: Priority; estimatedMinutes: number; linkedWorkout?: string; linkedHabit?: string }[]> = {
    entrepreneur: [
      { text: 'Review key metrics & revenue KPIs',          category: 'Work',     priority: 'urgent', estimatedMinutes: 20 },
      { text: 'Send 3 high-value follow-up emails',         category: 'Work',     priority: 'high',   estimatedMinutes: 15 },
      { text: 'Block 90-min deep work sprint',              category: 'Work',     priority: 'high',   estimatedMinutes: 90 },
      { text: 'Morning workout — log in Move',              category: 'Health',   priority: 'medium', estimatedMinutes: 45, linkedWorkout: 'Strength' },
      { text: 'End-of-day shutdown & tomorrow planning',    category: 'Personal', priority: 'medium', estimatedMinutes: 10 },
    ],
    executive: [
      { text: 'Prep for leadership standup',                category: 'Work',     priority: 'urgent', estimatedMinutes: 15 },
      { text: 'Review team OKR progress',                   category: 'Work',     priority: 'high',   estimatedMinutes: 30 },
      { text: 'Block 90-min no-meeting focus window',       category: 'Work',     priority: 'high',   estimatedMinutes: 90 },
      { text: 'Log sleep quality in Wellness',              category: 'Health',   priority: 'low',    estimatedMinutes: 3,  linkedHabit: 'Get 8 hours of sleep' },
      { text: 'Check on team wellbeing (1 check-in msg)',   category: 'Work',     priority: 'medium', estimatedMinutes: 5  },
    ],
    wfh: [
      { text: 'Set up workspace & silence phone',           category: 'Work',     priority: 'high',   estimatedMinutes: 10 },
      { text: 'Plan lunch — log in Fuel tab',               category: 'Health',   priority: 'medium', estimatedMinutes: 5  },
      { text: 'Afternoon walk (steps goal in Move)',        category: 'Health',   priority: 'medium', estimatedMinutes: 20, linkedWorkout: 'Walking' },
      { text: 'End-of-day shutdown & clear desk',           category: 'Personal', priority: 'medium', estimatedMinutes: 10 },
    ],
    healthcare: [
      { text: 'Chart review & patient prep',                category: 'Work',     priority: 'urgent', estimatedMinutes: 30 },
      { text: 'Self-care: log mood in Wellness',            category: 'Health',   priority: 'medium', estimatedMinutes: 3,  linkedHabit: 'Meditate for 10 minutes' },
      { text: 'Hydration check — Fuel tracker',             category: 'Health',   priority: 'medium', estimatedMinutes: 1  },
      { text: 'CPD / learning — 20 min reading',            category: 'Work',     priority: 'low',    estimatedMinutes: 20 },
    ],
    student: [
      { text: 'Review lecture notes from yesterday',        category: 'Work',     priority: 'high',   estimatedMinutes: 25 },
      { text: 'Pomodoro sprint: hardest task first',        category: 'Work',     priority: 'high',   estimatedMinutes: 25 },
      { text: 'Exercise break — log in Move',               category: 'Health',   priority: 'medium', estimatedMinutes: 30, linkedWorkout: 'HIIT Circuit' },
      { text: 'Read for 30 minutes',                        category: 'Personal', priority: 'low',    estimatedMinutes: 30, linkedHabit: 'Read for 30 minutes' },
    ],
    other: [
      { text: 'Plan top 3 priorities for today',            category: 'Personal', priority: 'high',   estimatedMinutes: 10 },
      { text: 'Morning movement — log in Move',             category: 'Health',   priority: 'medium', estimatedMinutes: 30, linkedWorkout: 'Stretching' },
      { text: 'Check weekly goal progress',                 category: 'Personal', priority: 'medium', estimatedMinutes: 10 },
    ],
  };
  
  // ─────────────────────────────────────────────────────────────
  // AI TIPS keyed by blocker
  // ─────────────────────────────────────────────────────────────
  const TIPS: Record<string, { tip: string; action?: string; link?: string }[]> = {
    focus: [
      { tip: 'Start with your hardest task before checking email.',     action: 'Start Focus Mode', link: '/focus-mode' },
      { tip: 'Enable Focus Mode for a 25-min distraction-free sprint.', action: 'Open Focus Mode',  link: '/focus-mode' },
      { tip: 'Write your single most important task here before anything else.' },
    ],
    overload: [
      { tip: 'Eat the frog: identify the ONE task that moves the needle most.' },
      { tip: 'Batch similar tasks — all calls together, all writing together.' },
      { tip: 'Say no to one thing today. Put it in Notes, not your to-do list.' },
    ],
    procrastination: [
      { tip: 'Start with a 2-minute version of the scary task.' },
      { tip: 'Pair the task with music or a reward after completion.' },
      { tip: 'Tell a partner your commitment — accountability works.',   action: 'Share via WhatsApp' },
    ],
    balance: [
      { tip: 'Block personal time as non-negotiable calendar events.' },
      { tip: 'Log your evening wind-down in Wellness → Sleep tracker.',  action: 'Log Sleep',         link: '/wellness' },
      { tip: 'Set a hard stop time today and honour it.' },
    ],
  };
  
  // ─────────────────────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────────────────────
  const CATEGORIES: { id: Category; label: string; emoji: string; color: string; bg: string }[] = [
    { id: 'Work',     label: 'Work',     emoji: '💼', color: '#2563eb', bg: '#eff6ff' },
    { id: 'Personal', label: 'Personal', emoji: '✨', color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'Health',   label: 'Health',   emoji: '💪', color: '#10b981', bg: '#ecfdf5' },
    { id: 'Family',   label: 'Family',   emoji: '🏠', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'Finance',  label: 'Finance',  emoji: '💰', color: '#0ea5e9', bg: '#f0f9ff' },
    { id: 'Grocery',  label: 'Grocery',  emoji: '🛒', color: '#ef4444', bg: '#fef2f2' },
  ];
  
  const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
    urgent: { label: 'Urgent', color: '#dc2626', bg: '#fef2f2' },
    high:   { label: 'High',   color: '#ea580c', bg: '#fff7ed' },
    medium: { label: 'Medium', color: '#ca8a04', bg: '#fefce8' },
    low:    { label: 'Low',    color: '#64748b', bg: '#f8fafc' },
  };
  
  const FREE_LIMIT = 3;
  
  // ─────────────────────────────────────────────────────────────
  // MAIN COMPONENT
  // ─────────────────────────────────────────────────────────────
  export default function ProductivityHub() {
    const router   = useRouter();
    const insets   = useSafeAreaInsets();
    const { user: clerkUser } = useUser();
    const { isPro } = useAccessControl();
  
    // ── Quiz state ──
    const [quizDone,    setQuizDone]    = useState(false);
    const [quizLoading, setQuizLoading] = useState(true);
    const [quizStep,    setQuizStep]    = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Partial<QuizProfile>>({});
    const [quizText,    setQuizText]    = useState('');
    const [profile,     setProfile]     = useState<QuizProfile | null>(null);
  
    // ── UI state ──
    const [activeCategory, setActiveCategory] = useState<Category>('Work');
    const [showAddModal,   setShowAddModal]   = useState(false);
    const [showUpgrade,    setShowUpgrade]    = useState(false);
    const [showPartner,    setShowPartner]    = useState(false);
    const [showDetail,     setShowDetail]     = useState<any>(null);
  
    // Add form
    const [newText,     setNewText]     = useState('');
    const [newPriority, setNewPriority] = useState<Priority>('medium');
    const [newDue,      setNewDue]      = useState('');
    const [newNotes,    setNewNotes]    = useState('');
    const [newEst,      setNewEst]      = useState('');
    const [newProject,  setNewProject]  = useState('');
  
    // Partner
    const [partnerEmail, setPartnerEmail] = useState('');
    const [linking,      setLinking]      = useState(false);
  
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim     = useRef(new Animated.Value(0)).current;
  
    // ── Convex ──
    const convexUser = useQuery(
      api.users.getUserByClerkId,
      clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
    );
    const todos      = useQuery(api.todo.getTodos,   convexUser?._id ? { userId: convexUser._id } : 'skip');
    const partnerUser= useQuery(api.users.getUserById, convexUser?.partnerId ? { userId: convexUser.partnerId } : 'skip');
  
    const addTodo       = useMutation(api.todo.addTodo);
    const bulkAddTodos  = useMutation(api.todo.bulkAddTodos);
    const toggleTodo    = useMutation(api.todo.toggleTodo);
    const deleteTodo    = useMutation(api.todo.deleteTodo);
    const seedRoutine   = useMutation(api.todo.dailyResetRoutine);
    const linkPartner   = useMutation(api.users.linkPartner);
    const unlinkPartner = useMutation(api.users.unlinkPartner);
  
    // ── Derived ──
    const totalCount     = (todos ?? []).length;
    const completedCount = (todos ?? []).filter((t: any) => t.completed).length;
    const urgentCount    = (todos ?? []).filter((t: any) => !t.completed && t.priority === 'urgent').length;
    const atFreeLimit    = !isPro && totalCount >= FREE_LIMIT;
  
    const filteredTodos = useMemo(() => {
      const all = (todos ?? []) as any[];
      return all
        .filter(t => t.category === activeCategory)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (po[a.priority ?? 'medium'] ?? 2) - (po[b.priority ?? 'medium'] ?? 2);
        });
    }, [todos, activeCategory]);
  
    const tips      = profile?.blocker ? TIPS[profile.blocker] ?? [] : [];
    const templates = profile?.role    ? TEMPLATES[profile.role] ?? [] : [];
  
    // ── Personalised greeting from onboarding data ──
    const userName        = convexUser?.name?.split(' ')[0] ?? 'there';
    const goal            = convexUser?.fitnessGoal ?? '';
    const stressLevel     = convexUser?.stressLevel ?? '';
    const coachingStyle   = (convexUser as any)?.coachingStyle ?? '';
    const motivations     = (convexUser as any)?.motivations ?? [];
  
    // ── Load quiz prefs ──
    useEffect(() => {
      SecureStore.getItemAsync(QUIZ_KEY).then(val => {
        if (val) {
          try { const p = JSON.parse(val) as QuizProfile; setProfile(p); setQuizDone(true); } catch {}
        }
        setQuizLoading(false);
      });
    }, []);
  
    // ── Progress bar animation ──
    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: (quizStep + 1) / QUIZ_STEPS.length,
        duration: 300, useNativeDriver: false,
      }).start();
    }, [quizStep]);
  
    // ── Fade-in on main ──
    useEffect(() => {
      if (quizDone) {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    }, [quizDone]);
  
    // ── Quiz handlers ──
    const handleQuizOption = useCallback(async (value: string) => {
      const step    = QUIZ_STEPS[quizStep];
      const updated = { ...quizAnswers, [step.id]: value };
      setQuizAnswers(updated);
      if (quizStep < QUIZ_STEPS.length - 1) {
        setQuizStep(s => s + 1);
      } else {
        await finishQuiz(updated);
      }
    }, [quizStep, quizAnswers]);
  
    const handleQuizText = useCallback(async () => {
      if (!quizText.trim()) return;
      const updated = { ...quizAnswers, weekGoal: quizText.trim() };
      await finishQuiz(updated);
    }, [quizText, quizAnswers]);
  
    const finishQuiz = async (data: Partial<QuizProfile>) => {
      const p = data as QuizProfile;
      setProfile(p);
      await SecureStore.setItemAsync(QUIZ_KEY, JSON.stringify(p));
  
      // Seed 3 smart tasks from the role template
      if (convexUser?._id) {
        const roleTemplates = TEMPLATES[p.role] ?? TEMPLATES.other;
        try {
          await bulkAddTodos({
            userId: convexUser._id,
            tasks: roleTemplates.slice(0, isPro ? 5 : 3).map(t => ({
              text: t.text,
              category: t.category,
              priority: t.priority,
              estimatedMinutes: t.estimatedMinutes,
              aiGenerated: true,
              linkedWorkout: t.linkedWorkout,
              linkedHabit:  t.linkedHabit,
            })),
          });
        } catch {}
      }
      setQuizDone(true);
    };
  
    // ── Add todo ──
    const handleAdd = useCallback(async () => {
      if (!newText.trim() || !convexUser?._id) return;
      if (atFreeLimit) { setShowUpgrade(true); return; }
      await addTodo({
        userId:           convexUser._id,
        text:             newText.trim(),
        category:         activeCategory,
        priority:         newPriority,
        dueDate:          newDue || undefined,
        notes:            newNotes || undefined,
        estimatedMinutes: newEst ? parseInt(newEst) : undefined,
        projectTag:       newProject || undefined,
      } as any);
      setNewText(''); setNewPriority('medium'); setNewDue(''); setNewNotes(''); setNewEst(''); setNewProject('');
      setShowAddModal(false);
    }, [newText, convexUser, activeCategory, newPriority, newDue, newNotes, newEst, newProject, atFreeLimit]);
  
    // ── Seed template task ──
    const seedTemplate = useCallback(async (t: typeof templates[0]) => {
      if (!convexUser?._id) return;
      if (atFreeLimit) { setShowUpgrade(true); return; }
      await addTodo({
        userId: convexUser._id, text: t.text, category: t.category,
        priority: t.priority, estimatedMinutes: t.estimatedMinutes,
        aiGenerated: true, linkedWorkout: (t as any).linkedWorkout, linkedHabit: (t as any).linkedHabit,
      } as any);
    }, [convexUser, atFreeLimit]);
  
    // ── Partner link ──
    const handleLinkPartner = async () => {
      if (!partnerEmail.trim() || !convexUser?._id) return;
      setLinking(true);
      try {
        const res: any = await linkPartner({ userId: convexUser._id, partnerEmail: partnerEmail.trim() });
        Alert.alert('Linked!', `You are now synced with ${res.partnerName}.`);
        setShowPartner(false); setPartnerEmail('');
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not link partner.');
      } finally { setLinking(false); }
    };
  
    const handleUnlink = () => {
      Alert.alert('Unlink Partner', 'Stop syncing shared lists?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlink', style: 'destructive', onPress: async () => {
          await unlinkPartner({ userId: convexUser!._id });
        }},
      ]);
    };
  
    const shareWhatsApp = () => {
      const list = (todos ?? []).filter((t: any) => !t.completed && t.category === activeCategory)
        .map((t: any) => `- ${t.text}`).join('\n');
      if (!list) { Alert.alert('Nothing to share!'); return; }
      const msg = `*Bluom Task List (${activeCategory})*\n\n${list}`;
      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
    };
  
    // ─────────────────────────────────────────────────────────
    // QUIZ RENDER
    // ─────────────────────────────────────────────────────────
    if (quizLoading) {
      return (
        <SafeAreaView style={s.screen} edges={['top']}>
          <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />
        </SafeAreaView>
      );
    }
  
    if (!quizDone) {
      const step = QUIZ_STEPS[quizStep];
      const isLast = quizStep === QUIZ_STEPS.length - 1;
      const isTextStep = 'type' in step && step.type === 'text';
  
      return (
        <SafeAreaView style={s.quizScreen} edges={['top', 'bottom']}>
          {/* Back */}
          <View style={s.quizTopBar}>
            <TouchableOpacity onPress={() => quizStep > 0 ? setQuizStep(s => s - 1) : router.back()} style={s.quizBack}>
              <Ionicons name="chevron-back" size={20} color="#1e293b" />
            </TouchableOpacity>
            <View style={s.quizProgressTrack}>
              <Animated.View style={[s.quizProgressFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={s.quizStepLabel}>{quizStep + 1}/{QUIZ_STEPS.length}</Text>
          </View>
  
          {/* "Smart" branding moment */}
          {quizStep === 0 && (
            <View style={s.quizHero}>
              <View style={s.quizHeroBadge}><Text style={s.quizHeroBadgeText}>⚡ INTELLIGENT SETUP</Text></View>
              <Text style={s.quizHeroTitle}>Your Productivity Hub{'\n'}starts here.</Text>
              <Text style={s.quizHeroSub}>
                4 quick questions. We'll tailor your task templates, AI tips, and integrations to how you actually work — using what we already know about your goals and lifestyle.
              </Text>
            </View>
          )}
  
          <ScrollView contentContainerStyle={s.quizBody} keyboardShouldPersistTaps="handled">
            <Text style={s.quizEmoji}>{step.emoji}</Text>
            <Text style={s.quizQuestion}>{step.question}</Text>
  
            {isTextStep ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TextInput
                  style={s.quizTextInput}
                  placeholder={('placeholder' in step ? step.placeholder : '') as string}
                  placeholderTextColor="#94a3b8"
                  value={quizText}
                  onChangeText={setQuizText}
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[s.quizNextBtn, !quizText.trim() && { opacity: 0.4 }]}
                  onPress={handleQuizText}
                  disabled={!quizText.trim()}
                >
                  <Text style={s.quizNextTxt}>Build My Hub →</Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            ) : (
              <View style={s.quizOptions}>
                {'options' in step && step.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={s.quizOption}
                    onPress={() => handleQuizOption(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.quizOptionIcon}>{opt.icon}</Text>
                    <Text style={s.quizOptionLabel}>{opt.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
  
            {/* Show what Bluom already knows — trust builder */}
            {quizStep === 0 && convexUser && (
              <View style={s.quizKnowBox}>
                <Text style={s.quizKnowTitle}>✦ We already know about you</Text>
                {goal      && <Text style={s.quizKnowItem}>🎯 Goal: {goal.replace(/_/g, ' ')}</Text>}
                {stressLevel && <Text style={s.quizKnowItem}>🧠 Stress level: {stressLevel}</Text>}
                {motivations.length > 0 && <Text style={s.quizKnowItem}>💪 Motivated by: {motivations.slice(0,3).join(', ')}</Text>}
                {coachingStyle && <Text style={s.quizKnowItem}>🎓 Coaching style: {coachingStyle}</Text>}
                <Text style={s.quizKnowSub}>Your answers below add the productivity layer.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }
  
    // ─────────────────────────────────────────────────────────
    // MAIN HUB
    // ─────────────────────────────────────────────────────────
    const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;
  
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        {/* ── Modals ── */}
        <ProUpgradeModal
          visible={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => { setShowUpgrade(false); router.push('/premium' as any); }}
          title="Unlock Full Productivity"
          message={`Free plan: ${FREE_LIMIT} tasks. Pro unlocks unlimited tasks, AI decomposition, project tags, partner sync, and Bluom integrations.`}
        />
  
        {/* Add Task Modal */}
        <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <TextInput
                style={s.addInput}
                placeholder="What needs to get done?"
                placeholderTextColor="#94a3b8"
                value={newText}
                onChangeText={setNewText}
                autoFocus
                multiline
              />
  
              {/* Priority */}
              <Text style={s.addLabel}>Priority</Text>
              <View style={s.priorityRow}>
                {(['urgent','high','medium','low'] as Priority[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.priorityChip, { borderColor: PRIORITY_CONFIG[p].color, backgroundColor: newPriority === p ? PRIORITY_CONFIG[p].bg : '#fff' }]}
                    onPress={() => setNewPriority(p)}
                  >
                    <View style={[s.priorityDot, { backgroundColor: PRIORITY_CONFIG[p].color }]} />
                    <Text style={[s.priorityChipTxt, { color: PRIORITY_CONFIG[p].color }]}>{PRIORITY_CONFIG[p].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
  
              {/* Category */}
              <Text style={s.addLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.catChip, { borderColor: c.color, backgroundColor: activeCategory === c.id ? c.bg : '#fff' }]}
                      onPress={() => setActiveCategory(c.id)}
                    >
                      <Text>{c.emoji}</Text>
                      <Text style={[s.catChipTxt, { color: c.color }]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
  
              {/* Due date */}
              <Text style={s.addLabel}>Due Date (optional)</Text>
              <TextInput style={s.addInput} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" value={newDue} onChangeText={setNewDue} />
  
              {/* Estimate */}
              <Text style={s.addLabel}>Time estimate (mins)</Text>
              <TextInput style={s.addInput} placeholder="e.g. 30" keyboardType="numeric" placeholderTextColor="#94a3b8" value={newEst} onChangeText={setNewEst} />
  
              {/* Notes */}
              <Text style={s.addLabel}>Notes</Text>
              <TextInput style={[s.addInput, { minHeight: 80 }]} placeholder="Any context…" placeholderTextColor="#94a3b8" multiline value={newNotes} onChangeText={setNewNotes} />
  
              {isPro && (
                <>
                  <Text style={s.addLabel}>Project Tag</Text>
                  <TextInput style={s.addInput} placeholder="e.g. Q3 Launch" placeholderTextColor="#94a3b8" value={newProject} onChangeText={setNewProject} />
                </>
              )}
  
              <TouchableOpacity style={[s.addBtn, !newText.trim() && { opacity: 0.4 }]} onPress={handleAdd} disabled={!newText.trim()}>
                <Text style={s.addBtnTxt}>Add Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
  
        {/* Partner Modal */}
        <Modal visible={showPartner} animationType="slide" transparent>
          <View style={s.partnerOverlay}>
            <View style={[s.partnerCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={s.partnerCardHeader}>
                <Text style={s.partnerTitle}>Shared Lists</Text>
                <TouchableOpacity onPress={() => setShowPartner(false)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              {convexUser?.partnerId ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <View style={s.partnerAvatar}><Ionicons name="people" size={36} color="#10b981" /></View>
                  <Text style={s.partnerSynced}>Synced with {(partnerUser as any)?.name || 'Partner'}</Text>
                  <Text style={s.partnerSyncedSub}>Family & Grocery lists sync automatically.</Text>
                  <TouchableOpacity style={s.unlinkBtn} onPress={handleUnlink}>
                    <Text style={s.unlinkTxt}>Stop Syncing</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={s.partnerDesc}>Enter your partner's email to sync Family and Grocery lists.</Text>
                  <TextInput style={s.partnerInput} placeholder="partner@email.com" placeholderTextColor="#94a3b8" autoCapitalize="none" keyboardType="email-address" value={partnerEmail} onChangeText={setPartnerEmail} />
                  <TouchableOpacity style={[s.partnerLinkBtn, (!partnerEmail.trim() || linking) && { opacity: 0.4 }]} onPress={handleLinkPartner} disabled={!partnerEmail.trim() || linking}>
                    {linking ? <ActivityIndicator color="#fff" /> : <Text style={s.partnerLinkTxt}>Send Link Request</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
  
        {/* Task Detail Modal */}
        {showDetail && (
          <Modal visible animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle} numberOfLines={2}>{showDetail.text}</Text>
                <TouchableOpacity onPress={() => setShowDetail(null)} style={s.modalClose}>
                  <Ionicons name="close" size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Priority badge */}
                {(() => {
                  const pr: Priority =
                    showDetail?.priority === 'urgent' || showDetail?.priority === 'high' || showDetail?.priority === 'medium' || showDetail?.priority === 'low'
                      ? showDetail.priority
                      : 'medium';
                  const cfg = PRIORITY_CONFIG[pr];
                  return (
                    <View style={[s.detailBadge, { backgroundColor: cfg.bg }]}>
                      <View style={[s.priorityDot, { backgroundColor: cfg.color }]} />
                      <Text style={[s.detailBadgeTxt, { color: cfg.color }]}>
                        {cfg.label} Priority
                      </Text>
                    </View>
                  );
                })()}
                {showDetail.dueDate && <Text style={s.detailMeta}>📅 Due: {showDetail.dueDate}</Text>}
                {showDetail.estimatedMinutes && <Text style={s.detailMeta}>⏱ Estimate: {showDetail.estimatedMinutes} min</Text>}
                {showDetail.projectTag && <Text style={s.detailMeta}>📁 Project: {showDetail.projectTag}</Text>}
                {showDetail.notes && (
                  <View style={s.detailNotes}><Text style={s.detailNotesTxt}>{showDetail.notes}</Text></View>
                )}
  
                {/* Bluom integrations */}
                {showDetail.linkedWorkout && (
                  <TouchableOpacity style={s.integrationRow} onPress={() => { setShowDetail(null); router.push('/move' as any); }}>
                    <View style={[s.integrationIcon, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="barbell-outline" size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.integrationLabel}>Linked Workout</Text>
                      <Text style={s.integrationValue}>{showDetail.linkedWorkout} → Go to Move</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
                {showDetail.linkedHabit && (
                  <TouchableOpacity style={s.integrationRow} onPress={() => { setShowDetail(null); router.push('/wellness' as any); }}>
                    <View style={[s.integrationIcon, { backgroundColor: '#f5f3ff' }]}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.integrationLabel}>Linked Habit</Text>
                      <Text style={s.integrationValue}>{showDetail.linkedHabit} → Go to Wellness</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
  
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => { deleteTodo({ todoId: showDetail._id }); setShowDetail(null); }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={s.deleteBtnTxt}>Delete Task</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
  
        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.topTitle}>Productivity Hub</Text>
            <Text style={s.topSub}>
              {totalCount - completedCount} open · {completedCount} done{urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.topIcon, convexUser?.partnerId && s.topIconActive]}
            onPress={() => isPro ? setShowPartner(true) : setShowUpgrade(true)}
          >
            <Ionicons name="people-outline" size={19} color={convexUser?.partnerId ? '#10b981' : '#475569'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.topIcon} onPress={async () => { if (convexUser?._id) await seedRoutine({ userId: convexUser._id }); }}>
            <Ionicons name="refresh-outline" size={19} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={s.topIcon} onPress={shareWhatsApp}>
            <Ionicons name="logo-whatsapp" size={19} color="#25d366" />
          </TouchableOpacity>
        </View>
  
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── PERSONALISED BANNER ── */}
          <View style={s.banner}>
            <View style={s.bannerLeft}>
              <Text style={s.bannerGreeting}>
                {profile ? `Your ${profile.role.replace(/_/g, ' ')} playbook, ${userName}.` : `Let's get after it, ${userName}.`}
              </Text>
              {profile?.weekGoal ? (
                <Text style={s.bannerGoal}>🌟 This week: {profile.weekGoal}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => { SecureStore.deleteItemAsync(QUIZ_KEY); setQuizDone(false); setQuizStep(0); setQuizAnswers({}); }} style={s.bannerReset}>
              <Ionicons name="pencil-outline" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>
  
          {/* ── FREE LIMIT BAR ── */}
          {!isPro && (
            <TouchableOpacity style={s.limitBar} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
              <View style={s.limitTrack}>
                <View style={[s.limitFill, { width: `${Math.min((totalCount / FREE_LIMIT) * 100, 100)}%` as any }]} />
              </View>
              <Text style={s.limitTxt}>{totalCount}/{FREE_LIMIT} tasks · <Text style={{ color: '#2563eb', fontWeight: '700' }}>Upgrade for unlimited</Text></Text>
            </TouchableOpacity>
          )}
  
          {/* ── AI TIPS ── */}
          {tips.length > 0 && (
            <View style={s.tipsSection}>
              <Text style={s.tipsTitle}>✦ Your daily nudge</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tips.map((t, i) => (
                  <View key={i} style={s.tipCard}>
                    <Text style={s.tipTxt}>{t.tip}</Text>
                    {t.link && (
                      <TouchableOpacity onPress={() => router.push(t.link as any)} style={s.tipAction}>
                        <Text style={s.tipActionTxt}>{t.action}</Text>
                        <Ionicons name="arrow-forward" size={12} color="#2563eb" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
  
          {/* ── CATEGORY TABS ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
            {CATEGORIES.map(c => {
              const count = (todos ?? []).filter((t: any) => t.category === c.id && !t.completed).length;
              const active = c.id === activeCategory;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catTab, active && { backgroundColor: c.color }]}
                  onPress={() => setActiveCategory(c.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.catTabEmoji}>{c.emoji}</Text>
                  <Text style={[s.catTabLabel, { color: active ? '#fff' : '#475569' }]}>{c.label}</Text>
                  {count > 0 && (
                    <View style={[s.catBadge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : c.bg }]}>
                      <Text style={[s.catBadgeTxt, { color: active ? '#fff' : c.color }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
  
          {/* ── TASK LIST ── */}
          <View style={s.taskList}>
            {filteredTodos.map((t: any) => {
              const pc = PRIORITY_CONFIG[t.priority as Priority ?? 'medium'];
              return (
                <TouchableOpacity
                  key={t._id}
                  style={[s.taskRow, t.completed && s.taskRowDone]}
                  onPress={() => setShowDetail(t)}
                  activeOpacity={0.8}
                >
                  <TouchableOpacity
                    style={[s.taskCheck, t.completed && { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                    onPress={() => toggleTodo({ todoId: t._id, completed: !t.completed })}
                  >
                    {t.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </TouchableOpacity>
  
                  <View style={{ flex: 1 }}>
                    <Text style={[s.taskText, t.completed && s.taskTextDone]} numberOfLines={2}>{t.text}</Text>
                    <View style={s.taskMeta}>
                      <View style={[s.taskPriBadge, { backgroundColor: pc.bg }]}>
                        <View style={[s.taskPriDot, { backgroundColor: pc.color }]} />
                        <Text style={[s.taskPriTxt, { color: pc.color }]}>{pc.label}</Text>
                      </View>
                      {t.dueDate && <Text style={s.taskDue}>📅 {t.dueDate}</Text>}
                      {t.estimatedMinutes && <Text style={s.taskEst}>⏱ {t.estimatedMinutes}m</Text>}
                      {t.aiGenerated && <Text style={s.taskAi}>✦ AI</Text>}
                      {t.linkedWorkout && <Text style={s.taskLink}>💪</Text>}
                      {t.linkedHabit && <Text style={s.taskLink}>🔄</Text>}
                    </View>
                  </View>
  
                  <TouchableOpacity onPress={() => deleteTodo({ todoId: t._id })} style={s.taskDelete}>
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
  
            {filteredTodos.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>{activeCat.emoji}</Text>
                <Text style={s.emptyTitle}>No {activeCat.label} tasks yet.</Text>
                <Text style={s.emptySub}>Tap + to add one, or try a smart template below.</Text>
              </View>
            )}
          </View>
  
          {/* ── SMART TEMPLATES (always visible as inspiration) ── */}
          {templates.length > 0 && (
            <View style={s.templatesSection}>
              <Text style={s.templatesSectionTitle}>✦ Smart templates for you</Text>
              <Text style={s.templatesSectionSub}>Tap to add instantly</Text>
              {templates.map((t, i) => {
                const alreadyAdded = (todos ?? []).some((td: any) => td.text === t.text);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.templateRow, alreadyAdded && s.templateRowAdded]}
                    onPress={() => !alreadyAdded && seedTemplate(t)}
                    activeOpacity={alreadyAdded ? 1 : 0.8}
                  >
                    <View style={s.templateLeft}>
                      <View style={[s.templatePriDot, { backgroundColor: PRIORITY_CONFIG[t.priority].color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.templateTxt, alreadyAdded && { color: '#94a3b8' }]} numberOfLines={2}>{t.text}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                          <Text style={s.templateMeta}>{CATEGORIES.find(c => c.id === t.category)?.emoji} {t.category}</Text>
                          <Text style={s.templateMeta}>⏱ {t.estimatedMinutes}m</Text>
                          {t.linkedWorkout && <Text style={s.templateMeta}>💪 Move</Text>}
                          {t.linkedHabit  && <Text style={s.templateMeta}>🔄 Habit</Text>}
                        </View>
                      </View>
                    </View>
                    {alreadyAdded
                      ? <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      : <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
  
          {/* ── PRO UPSELL (free only) ── */}
          {!isPro && (
            <TouchableOpacity style={s.upsell} onPress={() => setShowUpgrade(true)} activeOpacity={0.9}>
              <View style={s.upsellLeft}>
                <Text style={s.upsellTitle}>Unlock Pro Productivity</Text>
                <Text style={s.upsellSub}>Unlimited tasks · AI decomposition · Project tags · Partner sync · Bluom integrations</Text>
              </View>
              <View style={s.upsellArrow}>
                <Ionicons name="arrow-forward" size={18} color="#2563eb" />
              </View>
            </TouchableOpacity>
          )}
        </Animated.ScrollView>
  
        {/* ── FAB ── */}
        <View style={[s.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
          <TouchableOpacity
            style={s.fabBtn}
            onPress={() => atFreeLimit ? setShowUpgrade(true) : setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // ─────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f0f4ff' },
  
    // ── Quiz ──
    quizScreen:     { flex: 1, backgroundColor: '#fff' },
    quizTopBar:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    quizBack:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    quizProgressTrack: { flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
    quizProgressFill:  { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
    quizStepLabel:  { fontSize: 12, fontWeight: '700', color: '#94a3b8', width: 32, textAlign: 'right' },
    quizHero:       { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
    quizHeroBadge:  { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
    quizHeroBadgeText: { fontSize: 10, fontWeight: '900', color: '#2563eb', letterSpacing: 0.8 },
    quizHeroTitle:  { fontSize: 28, fontWeight: '900', color: '#0f172a', lineHeight: 34, marginBottom: 10 },
    quizHeroSub:    { fontSize: 14, color: '#64748b', lineHeight: 21, fontWeight: '500' },
    quizBody:       { paddingHorizontal: 24, paddingBottom: 60 },
    quizEmoji:      { fontSize: 44, marginBottom: 12, marginTop: 8 },
    quizQuestion:   { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 24, lineHeight: 30 },
    quizOptions:    { gap: 10 },
    quizOption:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    quizOptionIcon: { fontSize: 22 },
    quizOptionLabel:{ flex: 1, fontSize: 16, fontWeight: '600', color: '#1e293b' },
    quizTextInput:  { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, fontSize: 16, color: '#1e293b', minHeight: 100, marginBottom: 16 },
    quizNextBtn:    { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    quizNextTxt:    { color: '#fff', fontSize: 17, fontWeight: '800' },
    quizKnowBox:    { marginTop: 28, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bbf7d0' },
    quizKnowTitle:  { fontSize: 13, fontWeight: '800', color: '#15803d', marginBottom: 8 },
    quizKnowItem:   { fontSize: 13, color: '#166534', marginBottom: 4, fontWeight: '500' },
    quizKnowSub:    { fontSize: 11, color: '#4ade80', marginTop: 6, fontWeight: '600' },
  
    // ── Top Bar ──
    topBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
    topSub:   { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
    topIcon:  { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    topIconActive: { backgroundColor: '#ecfdf5' },
  
    scroll: { paddingHorizontal: 16, paddingTop: 12 },
  
    // ── Banner ──
    banner:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#2563eb', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
    bannerLeft:     { flex: 1 },
    bannerGreeting: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    bannerGoal:     { fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: '600' },
    bannerReset:    { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  
    // ── Free limit ──
    limitBar:   { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12, gap: 6 },
    limitTrack: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
    limitFill:  { height: '100%', backgroundColor: '#2563eb', borderRadius: 2 },
    limitTxt:   { fontSize: 11, color: '#64748b', fontWeight: '600' },
  
    // ── Tips ──
    tipsSection:    { marginBottom: 14 },
    tipsTitle:      { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    tipCard:        { width: SW * 0.72, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    tipTxt:         { fontSize: 13, color: '#334155', lineHeight: 19, fontWeight: '500', marginBottom: 8 },
    tipAction:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tipActionTxt:   { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  
    // ── Categories ──
    catScroll: { marginBottom: 14 },
    catTab:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    catTabEmoji: { fontSize: 14 },
    catTabLabel: { fontSize: 13, fontWeight: '700' },
    catBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    catBadgeTxt: { fontSize: 10, fontWeight: '800' },
  
    // ── Task list ──
    taskList:     { gap: 8, marginBottom: 20 },
    taskRow:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    taskRowDone:  { opacity: 0.55 },
    taskCheck:    { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    taskText:     { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 5 },
    taskTextDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
    taskMeta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    taskPriBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    taskPriDot:   { width: 5, height: 5, borderRadius: 3 },
    taskPriTxt:   { fontSize: 10, fontWeight: '700' },
    taskDue:      { fontSize: 10, color: '#64748b', fontWeight: '600' },
    taskEst:      { fontSize: 10, color: '#64748b', fontWeight: '600' },
    taskAi:       { fontSize: 10, color: '#8b5cf6', fontWeight: '700' },
    taskLink:     { fontSize: 12 },
    taskDelete:   { padding: 4 },
  
    // ── Empty ──
    empty:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
    emptySub:   { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },
  
    // ── Templates ──
    templatesSection:     { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14 },
    templatesSectionTitle:{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
    templatesSectionSub:  { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 12 },
    templateRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    templateRowAdded:{ opacity: 0.5 },
    templateLeft:    { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    templatePriDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    templateTxt:     { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1 },
    templateMeta:    { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  
    // ── Upsell ──
    upsell:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 14, borderWidth: 1.5, borderColor: '#dbeafe', marginBottom: 8 },
    upsellLeft: { flex: 1 },
    upsellTitle:{ fontSize: 14, fontWeight: '800', color: '#1e293b' },
    upsellSub:  { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
    upsellArrow:{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  
    // ── FAB ──
    fab:    { position: 'absolute', right: 20, alignItems: 'center' },
    fabBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  
    // ── Add Modal ──
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle:  { fontSize: 18, fontWeight: '900', color: '#0f172a', flex: 1 },
    modalClose:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    addInput:    { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, fontSize: 15, color: '#0f172a', fontWeight: '600', marginBottom: 16 },
    addLabel:    { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
    priorityChip:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    priorityDot: { width: 7, height: 7, borderRadius: 4 },
    priorityChipTxt: { fontSize: 12, fontWeight: '700' },
    catChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginBottom: 12 },
    catChipTxt: { fontSize: 12, fontWeight: '700' },
    addBtn:     { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    addBtnTxt:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  
    // ── Detail Modal ──
    detailBadge:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
    detailBadgeTxt:{ fontSize: 13, fontWeight: '700' },
    detailMeta:    { fontSize: 13, color: '#475569', fontWeight: '600' },
    detailNotes:   { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    detailNotesTxt:{ fontSize: 14, color: '#334155', lineHeight: 20 },
    integrationRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14 },
    integrationIcon:{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    integrationLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
    integrationValue: { fontSize: 13, color: '#1e293b', fontWeight: '600', marginTop: 1 },
    deleteBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', marginTop: 8 },
    deleteBtnTxt:  { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  
    // ── Partner Modal ──
    partnerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
    partnerCard:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    partnerCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    partnerTitle:   { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    partnerAvatar:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    partnerSynced:  { fontSize: 17, fontWeight: '800', color: '#0f172a' },
    partnerSyncedSub: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
    unlinkBtn:      { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
    unlinkTxt:      { color: '#ef4444', fontWeight: '700', fontSize: 14 },
    partnerDesc:    { fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 20 },
    partnerInput:   { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, fontSize: 15, color: '#0f172a', marginBottom: 14 },
    partnerLinkBtn: { backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    partnerLinkTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  });