import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PlannedExercise {
  id: string;
  name: string;
  thumbnailUrl?: string;
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
  dayTitle?: string;
  muscleGroups?: string;
  exercises?: PlannedExercise[];
  isPreviewMode?: boolean;
  onClose: () => void;
  onExercisePress?: (ex: PlannedExercise) => void;
  onStartActiveWorkout: (dayIndex: number) => void;
  onAddExercise?: () => void;
  onDeleteExercise?: (exId: string) => void;
}

export default function WorkoutDetailModal({
  visible,
  routineDays,
  initialTab = 1,
  dayTitle: fallbackDayTitle = "",
  muscleGroups: fallbackMuscleGroups = "",
  exercises: fallbackExercises = [],
  isPreviewMode = false,
  onClose,
  onExercisePress,
  onStartActiveWorkout,
  onAddExercise,
  onDeleteExercise
}: WorkoutDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  const currentDay = routineDays ? routineDays[activeTab - 1] : null;
  const displayTitle = currentDay?.dayTitle || fallbackDayTitle;
  const displayMuscleGroup = currentDay?.muscleGroups || fallbackMuscleGroups;
  const displayExercises = currentDay?.exercises || fallbackExercises;
  const totalTabs = routineDays?.length || 4;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workouts</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Dynamic Scrollable Tabs (Hidden in Preview Mode) */}
          {!isPreviewMode && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.tabsContainer}
              contentContainerStyle={styles.tabsRow}
            >
              {Array.from({ length: totalTabs }).map((_, i) => {
                const dayNum = i + 1;
                const isActive = activeTab === dayNum;
                return (
                  <TouchableOpacity 
                    key={dayNum} 
                    style={isActive ? styles.tabActive : styles.tabInactive}
                    onPress={() => setActiveTab(dayNum)}
                  >
                     <Text style={isActive ? styles.tabTextActive : styles.tabTextInactive}>
                       Day {dayNum}
                     </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Title Area */}
          <View style={styles.titleArea}>
            <Text style={styles.mainTitle}>{displayTitle}</Text>
            <Text style={styles.subTitle}>{displayMuscleGroup}</Text>
          </View>

          {/* Exercises List */}
          <View style={styles.list}>
            {displayExercises.map((ex, index) => (
              <TouchableOpacity key={ex.id} style={styles.card} activeOpacity={0.7} onPress={() => onExercisePress?.(ex)}>
                <View style={styles.thumbBox}>
                  {ex.thumbnailUrl ? (
                    <Image source={{ uri: ex.thumbnailUrl }} style={styles.thumbImage} resizeMode="contain" />
                  ) : (
                    <Ionicons name="barbell-outline" size={24} color="#94a3b8" />
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
                    <Text style={styles.equipment}>{ex.equipment || 'Bodyweight'}</Text>   {ex.sets} x {ex.reps}
                  </Text>
                </View>

                {onDeleteExercise && (
                  <TouchableOpacity 
                    style={styles.deleteExBtn} 
                    onPress={(e) => { e.stopPropagation(); onDeleteExercise(ex.id); }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {onAddExercise && (
              <TouchableOpacity style={styles.addExWrapBtn} onPress={onAddExercise}>
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addExWrapBtnText}>Add Exercise</Text>
              </TouchableOpacity>
            )}

          </View>
        </ScrollView>

        {/* Start Button & Edit in Preview Mode */}
        {isPreviewMode && (
           <View style={styles.previewFooter}>

             <TouchableOpacity style={styles.startBtn} onPress={() => onStartActiveWorkout(activeTab - 1)}>
               <Text style={styles.startBtnText}>Start Workout</Text>
               <Ionicons name="arrow-forward" size={20} color="#ffffff" />
             </TouchableOpacity>
           </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  deleteExBtn: {
    padding: 8,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  iconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  iconBtnRight: {
    padding: 8,
    marginRight: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 24,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  tabActive: {
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#06b6d4',
  },
  tabInactive: {
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#06b6d4',
  },
  tabTextInactive: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8',
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#475569',
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  thumbBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  exName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  muscleChip: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  exDetails: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  equipment: {
    color: '#06b6d4',
  },
  moreBtn: {
    padding: 8,
    marginRight: -8,
  },
  previewFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addExWrapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  addExWrapBtnText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
