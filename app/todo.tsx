/**
 * Bluom Productivity Hub  —  app/todo.tsx
 * ─────────────────────────────────────────────
 * Free:  3-task limit · no partner sync · no projects
 * Pro:   Unlimited · projects · partner sync · Bluom integrations
 *
 * First-run quiz (4 questions) personalises AI tips using data already known
 * from onboarding (fitnessGoal, stressLevel, coachingStyle, motivations).
 */

import React, {
  useState, useMemo, useRef, useCallback, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Linking,
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
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');
const QUIZ_KEY = 'bluom_prod_quiz_v2';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Category = 'Work' | 'Personal' | 'Health' | 'Family' | 'Finance' | 'Grocery';
type Priority  = 'low' | 'medium' | 'high' | 'urgent';

interface QuizProfile {
  role:     string; // 'entrepreneur'|'executive'|'wfh'|'healthcare'|'student'|'other'
  blocker:  string; // 'focus'|'overload'|'procrastination'|'balance'
  rhythm:   string; // 'deep'|'reactive'|'mixed'
  weekGoal: string; // free text
}

// ─────────────────────────────────────────────────────────────
// QUIZ STEPS — store i18n keys, call t() at render
// ─────────────────────────────────────────────────────────────
const QUIZ_STEPS = [
  {
    id: 'role',
    emoji: '🧭',
    questionKey: 'todo.quiz.q1',
    options: [
      { value: 'entrepreneur', labelKey: 'todo.quiz.opt_entrepreneur', icon: '🚀' },
      { value: 'executive',   labelKey: 'todo.quiz.opt_executive',    icon: '💼' },
      { value: 'wfh',         labelKey: 'todo.quiz.opt_wfh',          icon: '🏠' },
      { value: 'healthcare',  labelKey: 'todo.quiz.opt_healthcare',    icon: '🩺' },
      { value: 'student',     labelKey: 'todo.quiz.opt_student',       icon: '📚' },
      { value: 'other',       labelKey: 'todo.quiz.opt_other',         icon: '✨' },
    ],
  },
  {
    id: 'blocker',
    emoji: '🎯',
    questionKey: 'todo.quiz.q2',
    options: [
      { value: 'focus',           labelKey: 'todo.quiz.opt_focus',           icon: '🧠' },
      { value: 'overload',        labelKey: 'todo.quiz.opt_overload',        icon: '🌊' },
      { value: 'procrastination', labelKey: 'todo.quiz.opt_procrastination', icon: '⏳' },
      { value: 'balance',         labelKey: 'todo.quiz.opt_balance',         icon: '⚖️' },
    ],
  },
  {
    id: 'rhythm',
    emoji: '⚡',
    questionKey: 'todo.quiz.q3',
    options: [
      { value: 'deep',     labelKey: 'todo.quiz.opt_deep',     icon: '🔬' },
      { value: 'reactive', labelKey: 'todo.quiz.opt_reactive', icon: '⚡' },
      { value: 'mixed',    labelKey: 'todo.quiz.opt_mixed',    icon: '🔀' },
    ],
  },
  {
    id: 'weekGoal',
    emoji: '🌟',
    questionKey: 'todo.quiz.q4',
    type: 'text' as const,
    placeholderKey: 'todo.quiz.q4Placeholder',
  },
];

// ─────────────────────────────────────────────────────────────
// TIPS — keyed by blocker, values are i18n keys
// ─────────────────────────────────────────────────────────────
const TIPS: Record<string, { tipKey: string; actionKey?: string; link?: string }[]> = {
  focus: [
    { tipKey: 'todo.tips.focus_1', actionKey: 'todo.tips.focus_action_1', link: '/focus-mode' },
    { tipKey: 'todo.tips.focus_2', actionKey: 'todo.tips.focus_action_2', link: '/focus-mode' },
    { tipKey: 'todo.tips.focus_3' },
  ],
  overload: [
    { tipKey: 'todo.tips.overload_1' },
    { tipKey: 'todo.tips.overload_2' },
    { tipKey: 'todo.tips.overload_3' },
  ],
  procrastination: [
    { tipKey: 'todo.tips.procrastination_1' },
    { tipKey: 'todo.tips.procrastination_2' },
    { tipKey: 'todo.tips.procrastination_3', actionKey: 'todo.tips.procrastination_action_3' },
  ],
  balance: [
    { tipKey: 'todo.tips.balance_1' },
    { tipKey: 'todo.tips.balance_2', actionKey: 'todo.tips.balance_action_2', link: '/wellness' },
    { tipKey: 'todo.tips.balance_3' },
  ],
};

// ─────────────────────────────────────────────────────────────
// CATEGORIES — label translated at render via t()
// ─────────────────────────────────────────────────────────────
const CATEGORIES: { id: Category; emoji: string; color: string; bg: string }[] = [
  { id: 'Work',     emoji: '💼', color: '#2563eb', bg: '#eff6ff' },
  { id: 'Personal', emoji: '✨', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'Health',   emoji: '💪', color: '#10b981', bg: '#ecfdf5' },
  { id: 'Family',   emoji: '🏠', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'Finance',  emoji: '💰', color: '#0ea5e9', bg: '#f0f9ff' },
  { id: 'Grocery',  emoji: '🛒', color: '#ef4444', bg: '#fef2f2' },
];

// ─────────────────────────────────────────────────────────────
// PRIORITY — labelKey translated at render
// ─────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; labelKey: string }> = {
  urgent: { color: '#dc2626', bg: '#fef2f2', labelKey: 'todo.priority.urgent' },
  high:   { color: '#ea580c', bg: '#fff7ed', labelKey: 'todo.priority.high'   },
  medium: { color: '#ca8a04', bg: '#fefce8', labelKey: 'todo.priority.medium' },
  low:    { color: '#64748b', bg: '#f8fafc', labelKey: 'todo.priority.low'    },
};

const FREE_LIMIT = 3;

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ProductivityHub() {
  const { t } = useTranslation();
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
  const [editTodo,       setEditTodo]       = useState<any>(null);
  const [editText,       setEditText]       = useState('');
  const [editPriority,   setEditPriority]   = useState<Priority>('medium');
  const [editNotes,      setEditNotes]      = useState('');
  const [isSavingEdit,   setIsSavingEdit]   = useState(false);

  // Add form
  const [newText,     setNewText]     = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDue,      setNewDue]      = useState('');
  const [newNotes,    setNewNotes]    = useState('');
  const [newEst,      setNewEst]      = useState('');
  const [newProject,  setNewProject]  = useState('');

  // Loading guards
  const [isAdding, setIsAdding] = useState(false);

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
  const todos       = useQuery(api.todo.getTodos,   convexUser?._id ? { userId: convexUser._id } : 'skip');
  const partnerUser = useQuery(api.users.getUserById, convexUser?.partnerId ? { userId: convexUser.partnerId } : 'skip');

  const addTodo       = useMutation(api.todo.addTodo);
  const toggleTodo    = useMutation(api.todo.toggleTodo);
  const deleteTodo    = useMutation(api.todo.deleteTodo);
  const updateTodo    = useMutation(api.todo.updateTodo);
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
      .filter(td => td.category === activeCategory)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (po[a.priority ?? 'medium'] ?? 2) - (po[b.priority ?? 'medium'] ?? 2);
      });
  }, [todos, activeCategory]);

  const tips = profile?.blocker ? TIPS[profile.blocker] ?? [] : [];

  // ── Personalised greeting from onboarding data ──
  const userName      = convexUser?.name?.split(' ')[0] ?? 'there';
  const goal          = convexUser?.fitnessGoal ?? '';
  const stressLevel   = convexUser?.stressLevel ?? '';
  const coachingStyle = (convexUser as any)?.coachingStyle ?? '';
  const motivations   = (convexUser as any)?.motivations ?? [];

  // ── Load quiz prefs ──
  useEffect(() => {
    SecureStore.getItemAsync(QUIZ_KEY).then(val => {
      if (val) {
        try {
          const p = JSON.parse(val) as QuizProfile;
          if (p.role && p.blocker && p.rhythm) {
            setProfile(p);
            setQuizDone(true);
          }
        } catch {}
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

    // Add each line of weekGoal as a separate urgent task
    if (convexUser?._id && p.weekGoal?.trim()) {
      const lines = p.weekGoal.split('\n').map((l: string) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const alreadyExists = (todos ?? []).some((td: any) => td.text === line);
        if (!alreadyExists) {
          try {
            await addTodo({
              userId:      convexUser._id,
              text:        line,
              category:    'Work',
              priority:    'urgent',
              aiGenerated: true,
            } as any);
          } catch {}
        }
      }
    }
    setQuizDone(true);
  };

  // ── Edit todo ──
  const openEdit = useCallback((td: any) => {
    setEditTodo(td);
    setEditText(td.text);
    setEditPriority(['urgent','high','medium','low'].includes(td.priority) ? td.priority : 'medium');
    setEditNotes(td.notes ?? '');
    setShowDetail(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim() || !editTodo || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateTodo({
        todoId:   editTodo._id,
        text:     editText.trim(),
        priority: editPriority,
        notes:    editNotes || undefined,
      } as any);
      setEditTodo(null);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editText, editTodo, editPriority, editNotes, isSavingEdit]);

  // ── Add todo ──
  const handleAdd = useCallback(async () => {
    if (!newText.trim() || !convexUser?._id || isAdding) return;
    if (atFreeLimit) { setShowUpgrade(true); return; }
    setIsAdding(true);
    try {
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
    } finally {
      setIsAdding(false);
    }
  }, [newText, convexUser, activeCategory, newPriority, newDue, newNotes, newEst, newProject, atFreeLimit, isAdding]);

  // ── Partner link ──
  const handleLinkPartner = async () => {
    if (!partnerEmail.trim() || !convexUser?._id) return;
    setLinking(true);
    try {
      const res: any = await linkPartner({ userId: convexUser._id, partnerEmail: partnerEmail.trim() });
      Alert.alert(t('todo.partner.syncedWith', { name: res.partnerName }));
      setShowPartner(false); setPartnerEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not link partner.');
    } finally { setLinking(false); }
  };

  const handleUnlink = () => {
    Alert.alert(t('todo.partner.title'), t('todo.partner.stop') + '?', [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('todo.partner.stop'), style: 'destructive', onPress: async () => {
        await unlinkPartner({ userId: convexUser!._id });
      }},
    ]);
  };

  const shareWhatsApp = () => {
    const list = (todos ?? []).filter((td: any) => !td.completed && td.category === activeCategory)
      .map((td: any) => `- ${td.text}`).join('\n');
    if (!list) { Alert.alert(t('todo.nothingToShare')); return; }
    const msg = `*Bluom (${t('todo.categories.' + activeCategory)})*\n\n${list}`;
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

  // Show quiz if not done OR if profile is missing (safety net)
  if (!quizDone || !profile) {
    const step = QUIZ_STEPS[quizStep];
    const isTextStep = 'type' in step && step.type === 'text';

    return (
      <SafeAreaView style={s.quizScreen} edges={['top', 'bottom']}>
        {/* Back / progress bar */}
        <View style={s.quizTopBar}>
          <TouchableOpacity
            onPress={() => quizStep > 0 ? setQuizStep(s => s - 1) : router.back()}
            style={s.quizBack}
          >
            <Ionicons name="chevron-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <View style={s.quizProgressTrack}>
            <Animated.View style={[s.quizProgressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
          <Text style={s.quizStepLabel}>{t('todo.quiz.step', { current: quizStep + 1, total: QUIZ_STEPS.length })}</Text>
        </View>

        {/* Hero — only on step 0 */}
        {quizStep === 0 && (
          <View style={s.quizHero}>
            <View style={s.quizHeroBadge}><Text style={s.quizHeroBadgeText}>⚡ {t('todo.quiz.intelligentSetup')}</Text></View>
            <Text style={s.quizHeroTitle}>{t('todo.quiz.heroTitle')}</Text>
            <Text style={s.quizHeroSub}>{t('todo.quiz.heroSub')}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={s.quizBody} keyboardShouldPersistTaps="handled">
          <Text style={s.quizEmoji}>{step.emoji}</Text>
          <Text style={s.quizQuestion}>{t(step.questionKey)}</Text>

          {isTextStep ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={s.quizWeekGoalHint}>{t('todo.weekGoalMultiHint')}</Text>
              <TextInput
                style={s.quizTextInput}
                placeholder={t(('placeholderKey' in step ? step.placeholderKey : '') as string)}
                placeholderTextColor="#94a3b8"
                value={quizText}
                onChangeText={setQuizText}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
              <TouchableOpacity
                style={[s.quizNextBtn, !quizText.trim() && { opacity: 0.4 }]}
                onPress={handleQuizText}
                disabled={!quizText.trim()}
              >
                <Text style={s.quizNextTxt}>{t('todo.quiz.buildHub')}</Text>
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
                  <Text style={s.quizOptionLabel}>{t(opt.labelKey)}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* What Bluom already knows — shown on step 0 */}
          {quizStep === 0 && convexUser && (
            <View style={s.quizKnowBox}>
              <Text style={s.quizKnowTitle}>{t('todo.quiz.knowTitle')}</Text>
              {goal        && <Text style={s.quizKnowItem}>🎯 {t('todo.quiz.knowGoal')}: {goal.replace(/_/g, ' ')}</Text>}
              {stressLevel && <Text style={s.quizKnowItem}>🧠 {t('todo.quiz.knowStress')}: {stressLevel}</Text>}
              {motivations.length > 0 && <Text style={s.quizKnowItem}>💪 {t('todo.quiz.knowMotivated')}: {motivations.slice(0, 3).join(', ')}</Text>}
              {coachingStyle && <Text style={s.quizKnowItem}>🎓 {t('todo.quiz.knowCoaching')}: {coachingStyle}</Text>}
              <Text style={s.quizKnowSub}>{t('todo.quiz.knowSub')}</Text>
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
        title={t('todo.upsell.title')}
        message={`${t('todo.free.tasks', { count: totalCount, max: FREE_LIMIT })}. ${t('todo.upsell.sub')}`}
      />

      {/* Add Task Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('todo.newTask')}</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={s.modalClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <TextInput
              style={s.addInput}
              placeholder={t('todo.whatToDo')}
              placeholderTextColor="#94a3b8"
              value={newText}
              onChangeText={setNewText}
              autoFocus
              multiline
            />

            <Text style={s.addLabel}>{t('todo.priorityLabel')}</Text>
            <View style={s.priorityRow}>
              {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.priorityChip, { borderColor: PRIORITY_CONFIG[p].color, backgroundColor: newPriority === p ? PRIORITY_CONFIG[p].bg : '#fff' }]}
                  onPress={() => setNewPriority(p)}
                >
                  <View style={[s.priorityDot, { backgroundColor: PRIORITY_CONFIG[p].color }]} />
                  <Text style={[s.priorityChipTxt, { color: PRIORITY_CONFIG[p].color }]}>{t(PRIORITY_CONFIG[p].labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.addLabel}>{t('todo.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.catChip, { borderColor: c.color, backgroundColor: activeCategory === c.id ? c.bg : '#fff' }]}
                    onPress={() => setActiveCategory(c.id)}
                  >
                    <Text>{c.emoji}</Text>
                    <Text style={[s.catChipTxt, { color: c.color }]}>{t('todo.categories.' + c.id)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.addLabel}>{t('todo.dueDate')}</Text>
            <TextInput style={s.addInput} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" value={newDue} onChangeText={setNewDue} />

            <Text style={s.addLabel}>{t('todo.timeEstimate')}</Text>
            <TextInput style={s.addInput} placeholder="30" keyboardType="numeric" placeholderTextColor="#94a3b8" value={newEst} onChangeText={setNewEst} />

            <Text style={s.addLabel}>{t('todo.notes')}</Text>
            <TextInput style={[s.addInput, { minHeight: 80 }]} placeholderTextColor="#94a3b8" multiline value={newNotes} onChangeText={setNewNotes} />

            {isPro && (
              <>
                <Text style={s.addLabel}>{t('todo.projectTag')}</Text>
                <TextInput style={s.addInput} placeholder="Q3 Launch" placeholderTextColor="#94a3b8" value={newProject} onChangeText={setNewProject} />
              </>
            )}

            <TouchableOpacity
              style={[s.addBtn, (!newText.trim() || isAdding) && { opacity: 0.4 }]}
              onPress={handleAdd}
              disabled={!newText.trim() || isAdding}
            >
              {isAdding
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.addBtnTxt}>{t('todo.addTask')}</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Partner Modal */}
      <Modal visible={showPartner} animationType="slide" transparent>
        <View style={s.partnerOverlay}>
          <View style={[s.partnerCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={s.partnerCardHeader}>
              <Text style={s.partnerTitle}>{t('todo.partner.title')}</Text>
              <TouchableOpacity onPress={() => setShowPartner(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {convexUser?.partnerId ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={s.partnerAvatar}><Ionicons name="people" size={36} color="#10b981" /></View>
                <Text style={s.partnerSynced}>{t('todo.partner.syncedWith', { name: (partnerUser as any)?.name || 'Partner' })}</Text>
                <Text style={s.partnerSyncedSub}>{t('todo.partner.syncedSub')}</Text>
                <TouchableOpacity style={s.unlinkBtn} onPress={handleUnlink}>
                  <Text style={s.unlinkTxt}>{t('todo.partner.stop')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={s.partnerDesc}>{t('todo.partner.desc')}</Text>
                <TextInput
                  style={s.partnerInput}
                  placeholder={t('todo.partner.placeholder')}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={partnerEmail}
                  onChangeText={setPartnerEmail}
                />
                <TouchableOpacity
                  style={[s.partnerLinkBtn, (!partnerEmail.trim() || linking) && { opacity: 0.4 }]}
                  onPress={handleLinkPartner}
                  disabled={!partnerEmail.trim() || linking}
                >
                  {linking ? <ActivityIndicator color="#fff" /> : <Text style={s.partnerLinkTxt}>{t('todo.partner.send')}</Text>}
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
              {(() => {
                const pr: Priority = ['urgent', 'high', 'medium', 'low'].includes(showDetail?.priority)
                  ? showDetail.priority : 'medium';
                const cfg = PRIORITY_CONFIG[pr];
                return (
                  <View style={[s.detailBadge, { backgroundColor: cfg.bg }]}>
                    <View style={[s.priorityDot, { backgroundColor: cfg.color }]} />
                    <Text style={[s.detailBadgeTxt, { color: cfg.color }]}>
                      {t(`todo.priority.${pr}Label`)}
                    </Text>
                  </View>
                );
              })()}
              {showDetail.dueDate && <Text style={s.detailMeta}>{t('todo.task.due', { date: showDetail.dueDate })}</Text>}
              {showDetail.estimatedMinutes && <Text style={s.detailMeta}>{t('todo.task.estimate', { min: showDetail.estimatedMinutes })}</Text>}
              {showDetail.projectTag && <Text style={s.detailMeta}>{t('todo.task.project', { tag: showDetail.projectTag })}</Text>}
              {showDetail.notes && (
                <View style={s.detailNotes}><Text style={s.detailNotesTxt}>{showDetail.notes}</Text></View>
              )}

              {showDetail.linkedWorkout && (
                <TouchableOpacity style={s.integrationRow} onPress={() => { setShowDetail(null); router.push('/move' as any); }}>
                  <View style={[s.integrationIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="barbell-outline" size={18} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.integrationLabel}>{t('todo.task.linkedWorkout')}</Text>
                    <Text style={s.integrationValue}>{showDetail.linkedWorkout} {t('todo.task.goMove')}</Text>
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
                    <Text style={s.integrationLabel}>{t('todo.task.linkedHabit')}</Text>
                    <Text style={s.integrationValue}>{showDetail.linkedHabit} {t('todo.task.goWellness')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={s.editDetailBtn}
                onPress={() => openEdit(showDetail)}
              >
                <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                <Text style={s.editDetailBtnTxt}>{t('todo.editTask')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => { deleteTodo({ todoId: showDetail._id }); setShowDetail(null); }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={s.deleteBtnTxt}>{t('todo.task.delete')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editTodo && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('todo.editTask')}</Text>
              <TouchableOpacity onPress={() => setEditTodo(null)} style={s.modalClose}>
                <Ionicons name="close" size={20} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
              <TextInput
                style={[s.addInput, { minHeight: 60 }]}
                placeholder={t('todo.whatToDo')}
                placeholderTextColor="#94a3b8"
                value={editText}
                onChangeText={setEditText}
                autoFocus
                multiline
              />

              <Text style={s.addLabel}>{t('todo.priorityLabel')}</Text>
              <View style={s.priorityRow}>
                {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.priorityChip, { borderColor: PRIORITY_CONFIG[p].color, backgroundColor: editPriority === p ? PRIORITY_CONFIG[p].bg : '#fff' }]}
                    onPress={() => setEditPriority(p)}
                  >
                    <View style={[s.priorityDot, { backgroundColor: PRIORITY_CONFIG[p].color }]} />
                    <Text style={[s.priorityChipTxt, { color: PRIORITY_CONFIG[p].color }]}>{t(PRIORITY_CONFIG[p].labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.addLabel}>{t('todo.notes')}</Text>
              <TextInput
                style={[s.addInput, { minHeight: 80 }]}
                placeholderTextColor="#94a3b8"
                multiline
                value={editNotes}
                onChangeText={setEditNotes}
              />

              <TouchableOpacity
                style={[s.addBtn, (!editText.trim() || isSavingEdit) && { opacity: 0.4 }]}
                onPress={handleSaveEdit}
                disabled={!editText.trim() || isSavingEdit}
              >
                {isSavingEdit
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.addBtnTxt}>{t('common.save')}</Text>
                }
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
          <Text style={s.topTitle}>{t('todo.title')}</Text>
          <Text style={s.topSub}>
            {totalCount - completedCount} {t('todo.open')} · {completedCount} {t('todo.done')}
            {urgentCount > 0 ? ` · ${t('todo.urgent_count', { count: urgentCount })}` : ''}
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
              {profile
                ? t('todo.banner.playbook', { role: t('todo.roles.' + profile.role), name: userName })
                : t('todo.banner.letsGo', { name: userName })
              }
            </Text>
            {profile?.weekGoal ? (
              <Text style={s.bannerGoal}>{t('todo.banner.weekGoal', { goal: profile.weekGoal })}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('todo.updateProfile.title'),
                t('todo.updateProfile.message'),
                [
                  { text: t('todo.updateProfile.cancel'), style: 'cancel' },
                  {
                    text: t('todo.updateProfile.weekGoal'),
                    onPress: () => {
                      setQuizAnswers(profile
                        ? { role: profile.role, blocker: profile.blocker, rhythm: profile.rhythm }
                        : {}
                      );
                      setQuizText(profile?.weekGoal ?? '');
                      setQuizStep(3);
                      setQuizDone(false);
                    },
                  },
                  {
                    text: t('todo.updateProfile.restart'),
                    style: 'destructive',
                    onPress: () => {
                      SecureStore.deleteItemAsync(QUIZ_KEY);
                      setProfile(null);
                      setQuizAnswers({});
                      setQuizText('');
                      setQuizStep(0);
                      setQuizDone(false);
                    },
                  },
                ],
              );
            }}
            style={s.bannerReset}
          >
            <Ionicons name="pencil-outline" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* ── FREE LIMIT BAR ── */}
        {!isPro && (
          <TouchableOpacity style={s.limitBar} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
            <View style={s.limitTrack}>
              <View style={[s.limitFill, { width: `${Math.min((totalCount / FREE_LIMIT) * 100, 100)}%` as any }]} />
            </View>
            <Text style={s.limitTxt}>
              {t('todo.free.tasks', { count: totalCount, max: FREE_LIMIT })} · <Text style={{ color: '#2563eb', fontWeight: '700' }}>{t('todo.free.upgrade')}</Text>
            </Text>
          </TouchableOpacity>
        )}

        {/* ── AI TIPS ── */}
        {tips.length > 0 && (
          <View style={s.tipsSection}>
            <Text style={s.tipsTitle}>{t('todo.tips.sectionTitle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tips.map((tip, i) => (
                <View key={i} style={s.tipCard}>
                  <Text style={s.tipTxt}>{t(tip.tipKey)}</Text>
                  {tip.link && tip.actionKey && (
                    <TouchableOpacity onPress={() => router.push(tip.link as any)} style={s.tipAction}>
                      <Text style={s.tipActionTxt}>{t(tip.actionKey)}</Text>
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
            const count = (todos ?? []).filter((td: any) => td.category === c.id && !td.completed).length;
            const active = c.id === activeCategory;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.catTab, active && { backgroundColor: c.color }]}
                onPress={() => setActiveCategory(c.id)}
                activeOpacity={0.8}
              >
                <Text style={s.catTabEmoji}>{c.emoji}</Text>
                <Text style={[s.catTabLabel, { color: active ? '#fff' : '#475569' }]}>{t('todo.categories.' + c.id)}</Text>
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
          {filteredTodos.map((td: any) => {
            const pr: Priority = ['urgent', 'high', 'medium', 'low'].includes(td.priority) ? td.priority : 'medium';
            const pc = PRIORITY_CONFIG[pr];
            return (
              <TouchableOpacity
                key={td._id}
                style={[s.taskRow, td.completed && s.taskRowDone]}
                onPress={() => setShowDetail(td)}
                activeOpacity={0.8}
              >
                <TouchableOpacity
                  style={[s.taskCheck, td.completed && { backgroundColor: '#10b981', borderColor: '#10b981' }]}
                  onPress={() => toggleTodo({ todoId: td._id, completed: !td.completed })}
                >
                  {td.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={[s.taskText, td.completed && s.taskTextDone]} numberOfLines={2}>{td.text}</Text>
                  <View style={s.taskMeta}>
                    <View style={[s.taskPriBadge, { backgroundColor: pc.bg }]}>
                      <View style={[s.taskPriDot, { backgroundColor: pc.color }]} />
                      <Text style={[s.taskPriTxt, { color: pc.color }]}>{t(pc.labelKey)}</Text>
                    </View>
                    {td.dueDate && <Text style={s.taskDue}>📅 {td.dueDate}</Text>}
                    {td.estimatedMinutes && <Text style={s.taskEst}>⏱ {td.estimatedMinutes}m</Text>}
                    {td.aiGenerated && <Text style={s.taskAi}>{t('todo.task.ai')}</Text>}
                    {td.linkedWorkout && <Text style={s.taskLink}>💪</Text>}
                    {td.linkedHabit && <Text style={s.taskLink}>🔄</Text>}
                  </View>
                </View>

                <TouchableOpacity onPress={() => openEdit(td)} style={s.taskEdit}>
                  <Ionicons name="pencil-outline" size={15} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTodo({ todoId: td._id })} style={s.taskDelete}>
                  <Ionicons name="trash-outline" size={16} color="#f87171" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {filteredTodos.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>{activeCat.emoji}</Text>
              <Text style={s.emptyTitle}>{t('todo.noTasksYet', { category: t('todo.categories.' + activeCategory) })}</Text>
              <Text style={s.emptySub}>{t('todo.addHint')}</Text>
            </View>
          )}
        </View>

        {/* ── PRO UPSELL (free only) ── */}
        {!isPro && (
          <TouchableOpacity style={s.upsell} onPress={() => setShowUpgrade(true)} activeOpacity={0.9}>
            <View style={s.upsellLeft}>
              <Text style={s.upsellTitle}>{t('todo.upsell.title')}</Text>
              <Text style={s.upsellSub}>{t('todo.upsell.sub')}</Text>
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
  screen: { flex: 1, backgroundColor: '#F5F4F0' },

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
  quizWeekGoalHint: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 8 },
  quizTextInput:  { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, fontSize: 16, color: '#1e293b', minHeight: 120, marginBottom: 16 },
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
  taskEdit:     { padding: 4 },
  taskDelete:   { padding: 4 },
  editDetailBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 8 },
  editDetailBtnTxt: { fontSize: 15, fontWeight: '700', color: '#2563eb' },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
  emptySub:   { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },

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
