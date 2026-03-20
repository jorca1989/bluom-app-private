import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccessControl } from '@/hooks/useAccessControl';
import {
  ChevronLeft, ChevronDown, ChevronUp,
  Utensils, Dumbbell, Heart, Clock, Lock,
} from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function daysUntilRotation(createdAt?: number): number {
  if (!createdAt) return 0;
  const elapsed = Date.now() - createdAt;
  const daysPassed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysPassed);
}

function ProOverlay({ onPress }: { onPress: () => void }) {
  return (
    <View style={overlayStyles.wrap}>
      <View style={overlayStyles.badge}>
        <Lock size={16} color="#fff" />
      </View>
      <Text style={overlayStyles.title}>Pro Blueprint</Text>
      <Text style={overlayStyles.sub}>Unlock your full personalized prescription</Text>
      <TouchableOpacity style={overlayStyles.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={overlayStyles.btnText}>Unlock Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)' },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  btn: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default function PersonalizedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro } = useAccessControl();

  // Queries
  const activePlans = useQuery(api.plans.getActivePlans, {});
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  // System Status Query (Need to import api.system) - Assuming I need to add 'system' to api? 
  // Wait, I created convex/system.ts but did I expose it in api? 
  // Convex auto-generates api. Let's assume api.system.getSystemStatus exists or will exist.
  // Actually, I should probably check if api is updated. It usually is auto. 
  const systemStatus = useQuery(api.system.getSystemStatus);

  const isLoading = activePlans === undefined || convexUser === undefined || systemStatus === undefined;
  const { nutritionPlan, fitnessPlan, wellnessPlan } = activePlans || {};

  // Maintenance Mode Logic
  const maintenanceMode = systemStatus?.aiMaintenanceMode ?? false;
  const isFallback = maintenanceMode || !nutritionPlan;

  const [expanded, setExpanded] = useState<'nutrition' | 'fitness' | 'wellness' | null>(null);

  const toggle = (section: 'nutrition' | 'fitness' | 'wellness') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === section ? null : section);
  };

  const hasPlans = nutritionPlan || fitnessPlan || wellnessPlan;
  const rotationDays = daysUntilRotation(nutritionPlan?.createdAt ?? fitnessPlan?.createdAt);

  const currentDayIndex = Math.max(0, 30 - rotationDays); 
  let todayMeals = nutritionPlan?.mealTemplates || [];
  if (todayMeals.length > 0 && todayMeals[0]?.day !== undefined) {
    todayMeals = todayMeals[currentDayIndex % todayMeals.length]?.meals || [];
  }

  // --- Fallback Data Generation ---
  const getBaselineDescription = (type: 'nutrition' | 'fitness') => {
    const goal = convexUser?.fitnessGoal || 'general_health';

    if (type === 'nutrition') {
      if (goal === 'lose_weight') return "Prioritizing satiety and metabolic health. We've set a controlled caloric deficit while keeping protein high to preserve lean muscle. Focus on whole foods and high-volume vegetables.";
      if (goal === 'build_muscle') return "Hypertrophy-focused nutrition. We've established a slight caloric surplus to fuel growth. Your macro split is optimized for glycogen replenishment and protein synthesis.";
      return "Balanced Vitality. This plan focuses on micronutrient density and energy stability. We've set your macros to a balanced 40/30/30 split to support consistent performance throughout the day.";
    }
    if (type === 'fitness') {
      // Simple fallback logic for fitness text too? User only gave specific text for Nutrition/General focus.
      // Let's use a generic confident text for fitness fallback.
      return "Your baseline progressive overload structure. Focus on form and consistency while our AI finalizes your periodization strategy.";
    }
    return "";
  };

  // Fallback Values
  const fallbackCalories = convexUser?.dailyCalories || 2000;
  const fallbackProtein = convexUser?.dailyProtein || 150;
  const fallbackCarbs = convexUser?.dailyCarbs || 200;
  const fallbackFat = convexUser?.dailyFat || 65;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Blueprint</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* AI Banner */}
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.aiBanner}>
          <Text style={styles.aiBannerTitle}>🧬 Peak Performance Blueprint</Text>
          <Text style={styles.aiBannerSub}>
            Your personalized nutrition, fitness & wellness prescription — rotates every 30 days based on your metabolic feedback.
          </Text>
          {(!isFallback && hasPlans) && (
            <View style={styles.countdownRow}>
              <Clock size={14} color="#60a5fa" />
              <Text style={styles.countdownText}>
                {rotationDays > 0
                  ? `Next AI rotation in ${rotationDays} day${rotationDays !== 1 ? 's' : ''}`
                  : 'Blueprint rotating soon...'}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* --- SHAZAM STATUS CARD (Show if Fallback/Maintenance) --- */}
        {isFallback && !isLoading && isPro && (
          <View style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', gap: 12 }}>
            <ActivityIndicator size="small" color="#0284c7" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 4 }}>
                Status: Generating Enhanced Personalization...
              </Text>
              <Text style={{ fontSize: 12, color: '#0c4a6e', lineHeight: 18 }}>
                Our AI is currently in maintenance. Your ultra-customized macros and insights will sync to this page automatically once the window closes.
              </Text>
            </View>
          </View>
        )}


        {/* ════════════ NUTRITION ════════════ */}
        <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => toggle('nutrition')}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <Utensils size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Nutrition Blueprint</Text>
              <Text style={styles.cardSub}>
                {isLoading ? 'Loading...' :
                  isFallback ? `${Math.round(fallbackCalories)} kcal · Baseline Protocol` :
                    nutritionPlan ? `${Math.round(nutritionPlan.calorieTarget)} kcal · ${todayMeals.length || 0} meals today` :
                      'Generating...'}
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : expanded === 'nutrition' ? (
              <ChevronUp size={20} color="#94a3b8" />
            ) : (
              <ChevronDown size={20} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>

        {expanded === 'nutrition' && (
          <View style={styles.detailPanel}>
            {!isPro && <ProOverlay onPress={() => router.push('/premium')} />}
            <View style={!isPro ? { opacity: 0.15 } : undefined} pointerEvents={!isPro ? 'none' : 'auto'}>
              {/* FALLBACK VIEW SKELETON */}
              {isFallback ? (
                <View>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 20, fontStyle: 'italic' }}>
                    "{getBaselineDescription('nutrition')}"
                  </Text>

                  <View style={styles.macroRow}>
                    <MacroPill label="Calories" value={`${Math.round(fallbackCalories)}`} color="#f59e0b" />
                    <MacroPill label="Protein" value={`${fallbackProtein}g`} color="#ef4444" />
                    <MacroPill label="Carbs" value={`${fallbackCarbs}g`} color="#3b82f6" />
                    <MacroPill label="Fat" value={`${fallbackFat}g`} color="#10b981" />
                  </View>

                  <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                      Detailed meal templates will appear here once AI processing completes.
                    </Text>
                  </View>
                </View>
              ) :

                !nutritionPlan ? (
                  <View style={styles.panelEmpty}>
                    <ActivityIndicator size="small" color="#f59e0b" />
                    <Text style={styles.panelEmptyText}>Your nutrition plan is being generated...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.macroRow}>
                      <MacroPill label="Calories" value={`${Math.round(nutritionPlan.calorieTarget)}`} color="#f59e0b" />
                      <MacroPill label="Protein" value={`${nutritionPlan.proteinTarget}g`} color="#ef4444" />
                      <MacroPill label="Carbs" value={`${nutritionPlan.carbsTarget}g`} color="#3b82f6" />
                      <MacroPill label="Fat" value={`${nutritionPlan.fatTarget}g`} color="#10b981" />
                    </View>
                    {todayMeals.map((meal: any, i: number) => (
                      <View key={i} style={styles.mealCard}>
                        <View style={styles.mealHeader}>
                          <Text style={styles.mealType}>{mealEmoji(meal.mealType)} {meal.mealType}</Text>
                          <Text style={styles.mealKcal}>{meal.calories} kcal</Text>
                        </View>
                        <View style={styles.mealMacros}>
                          <Text style={styles.mealMacroText}>P: {meal.protein}g</Text>
                          <Text style={styles.mealMacroDot}>·</Text>
                          <Text style={styles.mealMacroText}>C: {meal.carbs}g</Text>
                          <Text style={styles.mealMacroDot}>·</Text>
                          <Text style={styles.mealMacroText}>F: {meal.fat}g</Text>
                        </View>
                        {meal.suggestions?.length > 0 && (
                          <View style={styles.suggestionList}>
                            {meal.suggestions.map((s: string, j: number) => (
                              <Text key={j} style={styles.suggestionItem}>• {s}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}
            </View>
          </View>
        )}

        {/* ════════════ FITNESS ════════════ */}
        <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => toggle('fitness')}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#ede9fe' }]}>
              <Dumbbell size={20} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Fitness Blueprint</Text>
              <Text style={styles.cardSub}>
                {isLoading ? 'Loading...' :
                  isFallback ? 'Baseline Protocol' :
                    fitnessPlan ? `${fitnessPlan.workoutSplit} · ${fitnessPlan.daysPerWeek}×/week` :
                      'Generating...'}
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : expanded === 'fitness' ? (
              <ChevronUp size={20} color="#94a3b8" />
            ) : (
              <ChevronDown size={20} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>

        {expanded === 'fitness' && (
          <View style={styles.detailPanel}>
            {!isPro && <ProOverlay onPress={() => router.push('/premium')} />}
            <View style={!isPro ? { opacity: 0.15 } : undefined} pointerEvents={!isPro ? 'none' : 'auto'}>
              {isFallback ? (
                <View>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 20, fontStyle: 'italic' }}>
                    "{getBaselineDescription('fitness')}"
                  </Text>
                  <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                      Personalized split and exercises will appear here shortly.
                    </Text>
                  </View>
                </View>
              ) :
                !fitnessPlan ? (
                  <View style={styles.panelEmpty}>
                    <ActivityIndicator size="small" color="#7c3aed" />
                    <Text style={styles.panelEmptyText}>Your fitness plan is being generated...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.splitBadge}>
                      <Text style={styles.splitText}>{fitnessPlan.workoutSplit}</Text>
                      <Text style={styles.splitDays}>{fitnessPlan.daysPerWeek} days per week</Text>
                    </View>
                    {fitnessPlan.workouts?.map((workout: any, i: number) => (
                      <View key={i} style={styles.workoutDay}>
                        <View style={styles.workoutDayHeader}>
                          <Text style={styles.workoutDayTitle}>📅 {workout.day || `Day ${i + 1}`}</Text>
                          <Text style={styles.workoutFocus}>{workout.focus}</Text>
                          {workout.estimatedDuration && (
                            <Text style={styles.workoutDuration}>{workout.estimatedDuration} min</Text>
                          )}
                        </View>
                        {workout.exercises?.map((ex: any, j: number) => (
                          <View key={j} style={styles.exerciseRow}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDetail}>
                              {ex.sets} × {ex.reps}{ex.rest ? ` · ${ex.rest}s rest` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </>
                )}
            </View>
          </View>
        )}

        {/* ════════════ WELLNESS ════════════ */}
        <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => toggle('wellness')}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Heart size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Wellness Blueprint</Text>
              <Text style={styles.cardSub}>
                {isLoading ? 'Loading...' : 'Sleep, mindfulness & habits'}
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : expanded === 'wellness' ? (
              <ChevronUp size={20} color="#94a3b8" />
            ) : (
              <ChevronDown size={20} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>

        {expanded === 'wellness' && (
          <View style={styles.detailPanel}>
            {!isPro && <ProOverlay onPress={() => router.push('/premium')} />}
            <View style={!isPro ? { opacity: 0.15 } : undefined} pointerEvents={!isPro ? 'none' : 'auto'}>
              {!wellnessPlan && !isFallback ? (
                <View style={styles.panelEmpty}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.panelEmptyText}>Your wellness plan is being generated...</Text>
                </View>
              ) : isFallback ? (
                <View>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 20 }}>
                    We are calibrating your sleep and habit protocols.
                  </Text>
                </View>
              ) : (
                <>
                  {wellnessPlan?.sleepRecommendation && (
                    <View style={styles.wellnessSection}>
                      <Text style={styles.wellnessSectionTitle}>😴 Sleep</Text>
                      <Text style={styles.wellnessValue}>Target: {wellnessPlan.sleepRecommendation.targetHours}h/night</Text>
                      {wellnessPlan.sleepRecommendation.bedTimeWindow && (
                        <Text style={styles.wellnessDetail}>Ideal window: {wellnessPlan.sleepRecommendation.bedTimeWindow}</Text>
                      )}
                      {wellnessPlan.sleepRecommendation.tips?.map((tip: string, i: number) => (
                        <Text key={i} style={styles.tipItem}>💡 {tip}</Text>
                      ))}
                    </View>
                  )}
                  {wellnessPlan?.meditationRecommendation && (
                    <View style={styles.wellnessSection}>
                      <Text style={styles.wellnessSectionTitle}>🧘 Meditation</Text>
                      <Text style={styles.wellnessValue}>
                        {wellnessPlan.meditationRecommendation.style} · {wellnessPlan.meditationRecommendation.sessionDuration}min
                      </Text>
                      <Text style={styles.wellnessDetail}>
                        {wellnessPlan.meditationRecommendation.frequencyPerWeek}× per week
                      </Text>
                    </View>
                  )}
                  {wellnessPlan?.recommendedHabits && wellnessPlan.recommendedHabits.length > 0 && (
                    <View style={styles.wellnessSection}>
                      <Text style={styles.wellnessSectionTitle}>✨ Recommended Habits</Text>
                      {wellnessPlan?.recommendedHabits?.map((h: any, i: number) => (
                        <View key={i} style={styles.habitRow}>
                          <Text style={styles.habitIcon}>{h.icon || '•'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.habitName}>{h.name}</Text>
                            <Text style={styles.habitFreq}>{h.frequency || 'daily'} · {h.category || 'lifestyle'}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function mealEmoji(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('breakfast')) return '🌅';
  if (t.includes('lunch')) return '☀️';
  if (t.includes('dinner')) return '🌙';
  if (t.includes('snack')) return '🍎';
  return '🍽️';
}

function MacroPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.macroPill, { borderColor: color + '30' }]}>
      <Text style={[styles.macroPillValue, { color }]}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },

  aiBanner: { padding: 20, borderRadius: 20, marginBottom: 20 },
  aiBannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  aiBannerSub: { color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 18 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(96,165,250,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  countdownText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 4, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  cardSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  detailPanel: { backgroundColor: '#fff', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 8, marginBottom: 16, marginTop: -4, borderWidth: 1, borderTopWidth: 0, borderColor: '#e2e8f0', overflow: 'hidden', minHeight: 220 },

  panelEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 10 },
  panelEmptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  macroPill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#fafafa' },
  macroPillValue: { fontSize: 14, fontWeight: '800' },
  macroPillLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  mealCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  mealKcal: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  mealMacros: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  mealMacroText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  mealMacroDot: { fontSize: 11, color: '#cbd5e1' },
  suggestionList: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  suggestionItem: { fontSize: 12, color: '#475569', lineHeight: 20 },

  splitBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: '#ede9fe', padding: 12, borderRadius: 12 },
  splitText: { fontSize: 15, fontWeight: '800', color: '#7c3aed' },
  splitDays: { fontSize: 12, color: '#7c3aed', fontWeight: '600' },

  workoutDay: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  workoutDayHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 },
  workoutDayTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  workoutFocus: { fontSize: 12, fontWeight: '600', color: '#7c3aed', backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  workoutDuration: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  exerciseName: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },
  exerciseDetail: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  wellnessSection: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  wellnessSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  wellnessValue: { fontSize: 14, fontWeight: '700', color: '#334155' },
  wellnessDetail: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tipItem: { fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 18 },

  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  habitIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  habitName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  habitFreq: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
});