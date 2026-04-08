import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

export interface SetData {
  id: string;
  previousWeight?: number;
  previousReps?: number;
  weight: string;
  reps: string;
  completed: boolean;
}

export interface ActiveExercise {
  id: string;
  name: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  sets: SetData[];
  notes?: string;
}

interface ActiveWorkoutModalProps {
  visible: boolean;
  exercises: ActiveExercise[];
  onClose: () => void;
  onFinishWorkout: (timeSpentSeconds: number, totalVolume: number, totalSets: number, exercises: ActiveExercise[]) => void;
  onAddExercise?: () => void;
  onDeleteExercise?: (exIdx: number) => void;
}

export default function ActiveWorkoutModal({
  visible,
  exercises: initialExercises,
  onClose,
  onFinishWorkout,
  onAddExercise,
  onDeleteExercise
}: ActiveWorkoutModalProps) {
  const insets = useSafeAreaInsets();
  const [timeSpent, setTimeSpent] = useState(0);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [restTimer, setRestTimer] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [showRestPopup, setShowRestPopup] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialExercises.length > 0 && exercises.length === 0) {
        setExercises(initialExercises);
      }
      setExpandedIndex(0);
      const interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [visible, initialExercises]);

  useEffect(() => {
    let interval: any;
    if (restTimer > 0 && showRestPopup) {
      interval = setInterval(() => setRestTimer(t => Math.max(0, t - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer, showRestPopup]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleSet = (exIndex: number, setIndex: number) => {
    const newEx = [...exercises];
    const s = newEx[exIndex].sets[setIndex];
    s.completed = !s.completed;
    if (s.completed) {
      setRestTimer(90); // default 90s rest
      setShowRestPopup(true);
    }
    setExercises(newEx);
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: 'weight'|'reps', val: string) => {
    const newEx = [...exercises];
    newEx[exIndex].sets[setIndex][field] = val;
    setExercises(newEx);
  };

  const handleAddSet = (exIndex: number) => {
    const newEx = [...exercises];
    newEx[exIndex].sets.push({
      id: Date.now().toString(),
      weight: '',
      reps: '',
      completed: false
    });
    setExercises(newEx);
  };

  const calcVolume = () => {
    let vol = 0;
    exercises.forEach(e => {
      e.sets.forEach(s => {
        if (s.completed) {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          vol += (w * r);
        }
      });
    });
    return vol;
  };

  const calcCompletedSets = () => {
    let count = 0;
    exercises.forEach(e => {
      e.sets.forEach(s => {
        if (s.completed) count++;
      });
    });
    return count;
  };

  const calcTotalSets = () => {
    let count = 0;
    exercises.forEach(e => { count += e.sets.length; });
    return count;
  };

  const canFinish = calcTotalSets() > 0 && calcCompletedSets() === calcTotalSets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
        {/* Header - Aligned to match Exercise Library (+10 offset) */}
        <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 16 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={28} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.timerCenter}>
            <Ionicons name="timer-outline" size={20} color="#64748b" />
          </View>
          <TouchableOpacity 
            style={[styles.finishBtn, !canFinish && styles.finishBtnDisabled]} 
            onPress={() => onFinishWorkout(timeSpent, calcVolume(), calcCompletedSets(), exercises)}
            disabled={!canFinish}
          >
            <Text style={[styles.finishBtnText, !canFinish && styles.finishBtnTextDisabled]}>Finish</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            
            {/* Top Stats Banner */}
            <View style={styles.statsBanner}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValueBlue}>{formatTime(timeSpent)}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Volume</Text>
                <Text style={styles.statValue}>{calcVolume()} kg</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Sets</Text>
                <Text style={styles.statValue}>{calcCompletedSets()}</Text>
              </View>
            </View>

            {/* Exercises Accordion List */}
            {exercises.map((ex, exIdx) => {
              const isExpanded = expandedIndex === exIdx;
              const allSetsCompleted = ex.sets.length > 0 && ex.sets.every(s => s.completed);
              
              return (
                <View key={ex.id} style={styles.exerciseBlock}>
                  <TouchableOpacity 
                    style={[styles.exHeaderRow, isExpanded && styles.exHeaderRowExpanded]}
                    activeOpacity={0.7}
                    onPress={() => setExpandedIndex(isExpanded ? -1 : exIdx)}
                  >
                    <View style={styles.exNumBadge}>
                      <Text style={styles.exNumBadgeText}>{exIdx + 1}</Text>
                    </View>
                    <Text style={styles.exName}>{ex.name}</Text>

                    {onDeleteExercise && (
                      <TouchableOpacity 
                        style={styles.deleteExBtn}
                        onPress={(e) => { e.stopPropagation(); onDeleteExercise(exIdx); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#f43f5e" />
                      </TouchableOpacity>
                    )}

                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.exExpandedContent}>
                      {(ex.thumbnailUrl || ex.videoUrl) ? (
                        <View style={styles.videoBox}>
                          {ex.videoUrl ? (
                            ex.videoUrl.toLowerCase().endsWith('.gif') ? (
                              <Image 
                                source={{ uri: ex.videoUrl }} 
                                style={styles.videoPlayerInline} 
                                resizeMode="cover" 
                              />
                            ) : (
                              <Video
                                source={{ uri: ex.videoUrl }}
                                style={styles.videoPlayerInline}
                                resizeMode={ResizeMode.COVER}
                                useNativeControls
                                shouldPlay
                                isLooping
                                usePoster={!!ex.thumbnailUrl}
                                posterSource={ex.thumbnailUrl ? { uri: ex.thumbnailUrl } : undefined}
                                posterStyle={{ resizeMode: 'cover' }}
                              />
                            )
                          ) : (
                            <TouchableOpacity
                              activeOpacity={1}
                              style={styles.videoPlaceholder}
                            >
                              {ex.thumbnailUrl ? (
                                <Image source={{ uri: ex.thumbnailUrl }} style={styles.videoImage} resizeMode="cover" />
                              ) : (
                                <View style={styles.videoImage} /> // Blank dark bg
                              )}
                              <View style={styles.playIconOverlay}>
                                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.8)" />
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}

                      {/* Sets Header */}
                      <View style={styles.setsHeader}>
                        <Text style={[styles.setsColHead, { width: 40 }]}>SET</Text>
                        <Text style={[styles.setsColHead, { flex: 1 }]}>PREVIOUS</Text>
                        <Text style={[styles.setsColHead, { width: 70, textAlign: 'center' }]}>KG</Text>
                        <Text style={[styles.setsColHead, { width: 70, textAlign: 'center' }]}>REPS</Text>
                        <View style={{ width: 44 }} />
                      </View>

                      {/* Sets Rows */}
                      {ex.sets.map((set, setIdx) => (
                        <View key={set.id} style={[styles.setRow, set.completed && styles.setRowCompleted]}>
                          <Text style={[styles.setNum, set.completed && { color: '#0f172a' }]}>{setIdx + 1}</Text>
                          <Text style={styles.setPrev}>
                            {set.previousWeight && set.previousReps 
                              ? `${set.previousWeight}kg x ${set.previousReps}` 
                              : '-'}
                          </Text>
                          
                          <TextInput 
                            style={[styles.setField, set.completed && styles.setFieldCompleted]} 
                            keyboardType="decimal-pad"
                            value={set.weight}
                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'weight', v)}
                            editable={!set.completed}
                          />
                          
                          <TextInput 
                            style={[styles.setField, set.completed && styles.setFieldCompleted]} 
                            keyboardType="number-pad"
                            value={set.reps}
                            onChangeText={(v) => handleUpdateSet(exIdx, setIdx, 'reps', v)}
                            editable={!set.completed}
                          />

                          <TouchableOpacity 
                            style={[styles.checkBtn, set.completed && styles.checkBtnActive]}
                            onPress={() => handleToggleSet(exIdx, setIdx)}
                          >
                            <Ionicons name="checkmark" size={20} color={set.completed ? '#ffffff' : '#cbd5e1'} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(exIdx)}>
                        <Text style={styles.addSetBtnText}>+ Add set</Text>
                      </TouchableOpacity>

                      {/* Per-exercise volume summary */}
                      {(() => {
                        const exVol = ex.sets.reduce((sum, s) => {
                          if (s.completed) {
                            return sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                          }
                          return sum;
                        }, 0);
                        return exVol > 0 ? (
                          <View style={styles.exVolumeRow}>
                            <Ionicons name="barbell-outline" size={15} color="#3b82f6" />
                            <Text style={styles.exVolumeText}>Exercise Volume: <Text style={styles.exVolumeVal}>{exVol} kg</Text></Text>
                          </View>
                        ) : null;
                      })()}

                      {allSetsCompleted && exIdx < exercises.length - 1 && (
                        <TouchableOpacity style={styles.nextExBtn} onPress={() => setExpandedIndex(exIdx + 1)}>
                           <Text style={styles.nextExBtnText}>Next Exercise</Text>
                           <Ionicons name="arrow-down" size={20} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {onAddExercise && (
               <TouchableOpacity style={styles.addExWrapBtn} onPress={onAddExercise}>
                 <Ionicons name="add" size={20} color="#3b82f6" />
                 <Text style={styles.addExWrapBtnText}>Add Exercise</Text>
               </TouchableOpacity>
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Rest Timer Popup Overlay */}
        {showRestPopup && (
          <View style={styles.restOverlay}>
            <View style={styles.restCard}>
              <Text style={styles.restTitle}>Rest Timer</Text>
              <Text style={styles.restTimeBig}>{formatTime(restTimer)}</Text>
              
              <View style={styles.restControls}>
                <TouchableOpacity style={styles.restAdjustBtn} onPress={() => setRestTimer(Math.max(0, restTimer - 15))}>
                  <Text style={styles.restAdjustNum}>- 15s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restReadyBtn} onPress={() => setShowRestPopup(false)}>
                  <Text style={styles.restReadyText}>I am ready</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restAdjustBtn} onPress={() => setRestTimer(restTimer + 15)}>
                  <Text style={styles.restAdjustNum}>+ 15s</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={{ marginTop: 24, padding: 8 }} onPress={() => { setShowRestPopup(false); setRestTimer(0); }}>
                <Text style={styles.restTurnOffText}>Turn off</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  timerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  finishBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  finishBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  finishBtnTextDisabled: {
    color: '#94a3b8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statValueBlue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  exerciseBlock: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exHeaderRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exNumBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },
  exName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  exExpandedContent: {
    padding: 16,
  },
  videoBox: {
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 1 / 1,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPlayerInline: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  playIconOverlay: {
    position: 'absolute',
  },
  setsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  setsColHead: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  setRowCompleted: {
    backgroundColor: '#f8fafc',
  },
  setNum: {
    width: 40,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  setPrev: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  setField: {
    width: 60,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginHorizontal: 5,
  },
  setFieldCompleted: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: '#64748b',
  },
  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  addExWrapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addExWrapBtnText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  deleteExBtn: {
    marginRight: 12,
  },
  addSetBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addSetBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  nextExBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  nextExBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  restCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  restTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 16,
  },
  restTimeBig: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 32,
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  restAdjustBtn: {
    width: 60,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restAdjustNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
  },
  restReadyBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  restReadyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restTurnOffText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  exVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  exVolumeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  exVolumeVal: {
    color: '#2563eb',
    fontWeight: '800',
  },
});
