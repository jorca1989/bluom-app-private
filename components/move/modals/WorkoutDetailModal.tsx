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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

interface PlannedExercise {
  id: string;
  name: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  primaryMuscle: string;
  equipment?: string;
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
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [showUpgrade, setShowUpgrade] = React.useState(false);

  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  const totalTabs = routineDays.length || 4;
  const dayIndex = activeTab - 1;
  const currentDay = routineDays[dayIndex] ?? null;
  const displayTitle = currentDay?.dayTitle ?? `Day ${activeTab}`;
  const displayMuscleGroup = currentDay?.muscleGroups ?? '';
  const displayExercises = currentDay?.exercises ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Week Overview</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Day tabs — always scrollable, shows all days in the week */}
        <View style={styles.tabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {routineDays.map((day, i) => {
              const isActive = activeTab === i + 1;
              return (
                <TouchableOpacity
                  key={day.dayNum}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(i + 1)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    Day {day.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Day title */}
          <View style={styles.titleArea}>
            <Text style={styles.mainTitle}>{displayTitle}</Text>
            <Text style={styles.subTitle}>{displayMuscleGroup}</Text>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
            <Text style={styles.infoText}>
              Use this as a simple guide. Pro gets a personalised plan that adapts and swaps exercises.
            </Text>
          </View>

          {/* Exercise list */}
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
                    <Image
                      source={{ uri: ex.thumbnailUrl }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="barbell-outline" size={22} color="#94a3b8" />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.exName}>{index + 1}.  {ex.name}</Text>
                  <View style={styles.chipRow}>
                    <View style={styles.muscleChip}>
                      <Text style={styles.muscleChipText}>{ex.primaryMuscle}</Text>
                    </View>
                  </View>
                  <Text style={styles.exDetails}>
                    <Text style={styles.equipment}>{ex.equipment ?? 'Bodyweight'}</Text>
                    {'   '}{ex.sets} × {ex.reps}
                  </Text>
                </View>

                {onDeleteExercise && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={e => { 
                      e.stopPropagation(); 
                      if (!isPro) {
                        setShowUpgrade(true);
                        return;
                      }
                      onDeleteExercise(ex.id, dayIndex); 
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {onAddExercise && (
              <TouchableOpacity 
                style={styles.addExBtn} 
                onPress={() => {
                  if (!isPro) {
                    setShowUpgrade(true);
                    return;
                  }
                  onAddExercise(dayIndex);
                }}
              >
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addExBtnText}>Add Exercise</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Footer — Start Workout button for this day */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => {
              if (!isPro) {
                setShowUpgrade(true);
                return;
              }
              onStartActiveWorkout(dayIndex);
            }}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={styles.startBtnText}>Start Day {activeTab} Workout</Text>
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
          title="Personalised Training"
          message="Upgrade to Pro to start your AI-generated fitness plan and modify exercises."
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

  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#06b6d4' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#06b6d4', fontWeight: 'bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  titleArea: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  subTitle: { fontSize: 14, color: '#475569', textAlign: 'center' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 17 },

  list: { paddingHorizontal: 16, gap: 12 },
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
    shadowOpacity: 0.03,
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
  },
  thumbImage: { width: '100%', height: '100%' },
  cardBody: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  muscleChip: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  muscleChipText: { fontSize: 11, fontWeight: '600', color: '#10b981' },
  exDetails: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  equipment: { color: '#06b6d4' },
  deleteBtn: { padding: 8, marginLeft: 6 },

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
    paddingBottom: 32,
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