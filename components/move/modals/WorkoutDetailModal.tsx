import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

export interface PlannedExercise {
  id: string;
  name: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  equipment?: string;
  exerciseType?: string;
  exerciseTypes?: string[];
  instructions?: string[];
  instructionsLocalizations?: Record<string, string[]>;
  sets: number;
  reps: number | string;
}

export interface RoutineDay {
  dayNum: number;
  dayTitle: string;
  muscleGroups: string;
  exercises: PlannedExercise[];
}

interface WorkoutDetailModalProps {
  visible: boolean;
  routineDays?: RoutineDay[];
  initialTab?: number;
  isPreviewMode?: boolean;
  onClose: () => void;
  onExercisePress?: (ex: PlannedExercise) => void;
  onStartActiveWorkout: (dayIndex: number) => void;
  onAddExercise?: (dayIndex: number) => void;
  onDeleteExercise?: (exId: string, dayIndex: number) => void;
  isPro?: boolean;
}

export default function WorkoutDetailModal({
  visible,
  routineDays = [],
  initialTab = 1,
  isPreviewMode = false,
  onClose,
  onExercisePress,
  onStartActiveWorkout,
  onAddExercise,
  onDeleteExercise,
  isPro = false,
}: WorkoutDetailModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  const dayIndex = activeTab - 1;
  const currentDay = routineDays[dayIndex] ?? null;
  const displayTitle = currentDay?.dayTitle ?? t('common.dayNum', 'Day {{num}}', { num: activeTab });
  const displayMuscleGroup = currentDay?.muscleGroups ?? '';
  const displayExercises = currentDay?.exercises ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      {/* SafeAreaView handles bottom (home indicator) only — top handled explicitly to prevent double-padding */}
      <SafeAreaView style={styles.container} edges={['bottom']}>

        {/* Header — explicit paddingTop guards against clipping during modal slide-in on any device */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPreviewMode ? t('move.dayPreview', 'Day {{day}} Preview', { day: activeTab }) : t('move.weekOverview', 'Week Overview')}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Day tabs — only in View Workout mode */}
        {!isPreviewMode && (
          <View style={styles.tabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {routineDays.map((day, i) => {
                const isActive = activeTab === i + 1;
                return (
                  <TouchableOpacity
                    key={day.dayNum}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setActiveTab(i + 1)}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t('common.dayNum', 'Day {{num}}', { num: day.dayNum })}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Day title — no subtitle, muscleGroups already shown in card header */}
          <View style={styles.titleArea}>
            <Text style={styles.mainTitle}>{displayTitle}</Text>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
            <Text style={styles.infoText}>
              {t('move.detailInfo', 'Tap any exercise to see its details. Pro users can add or remove exercises.')}
            </Text>
          </View>

          {/* Exercise list — simple tappable cards, no inline details */}
          <View style={styles.list}>
            {displayExercises.map((ex, index) => (
              <TouchableOpacity
                key={ex.id}
                style={styles.exCard}
                activeOpacity={0.7}
                onPress={() => onExercisePress?.(ex)}
              >
                <View style={styles.thumbBox}>
                  {ex.thumbnailUrl ? (
                    <Image source={{ uri: ex.thumbnailUrl }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="barbell-outline" size={22} color="#94a3b8" />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.exName}>{index + 1}.  {ex.name}</Text>
                  <Text style={styles.exDetails}>
                    <Text style={styles.equipment}>{ex.equipment ?? 'Bodyweight'}</Text>
                    {'   '}{ex.sets} × {ex.reps}
                  </Text>
                </View>

                <View style={styles.cardRight}>
                  {/* Delete — Pro only */}
                  {onDeleteExercise && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={e => {
                        e.stopPropagation();
                        if (!isPro) { setShowUpgrade(true); return; }
                        onDeleteExercise(ex.id, dayIndex);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            ))}

            {/* Add Exercise — Pro only */}
            {onAddExercise && (
              <TouchableOpacity
                style={styles.addExBtn}
                onPress={() => {
                  if (!isPro) { setShowUpgrade(true); return; }
                  onAddExercise(dayIndex);
                }}
              >
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addExBtnText}>{t('move.addExercise', 'Add Exercise')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Footer — paddingBottom driven entirely by insets so it works on all devices */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => onStartActiveWorkout(dayIndex)}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={styles.startBtnText}>{t('move.startDayWorkout', 'Start Day {{day}} Workout', { day: activeTab })}</Text>
          </TouchableOpacity>
        </View>

        <ProUpgradeModal
          visible={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => {
            setShowUpgrade(false);
            onClose();
            router.push('/premium');
          }}
          title={t('move.personalisedTraining', 'Personalised Training')}
          message={t('move.upgradeDetail', 'Upgrade to Pro to add or remove exercises from your plan.')}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },

  tabsWrap: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#06b6d4' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#06b6d4', fontWeight: 'bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  titleArea: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  subTitle: { fontSize: 14, color: '#475569', textAlign: 'center' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 17 },

  list: { paddingHorizontal: 16, gap: 10 },

  exCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  thumbBox: {
    width: 60,
    height: 60,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImage: { width: '100%', height: '100%' },
  cardBody: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  exDetails: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  equipment: { color: '#06b6d4', fontWeight: '600' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  deleteBtn: { padding: 4 },

  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  addExBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});