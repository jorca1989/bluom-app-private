import React, { useState, useEffect, useMemo } from 'react';
import { Alert, View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Video, ResizeMode } from 'expo-av';
import { getLocalizedExerciseName } from '@/utils/localize';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import VoiceWorkoutLogModal, { type VoiceSetProposal } from './VoiceWorkoutLogModal';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

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
  userId?: Id<'users'>;
  sessionTitle?: string;
}

export default function ActiveWorkoutModal({
  visible,
  exercises: initialExercises,
  onClose,
  onFinishWorkout,
  onAddExercise,
  onDeleteExercise,
  userId,
  sessionTitle = 'Workout',
}: ActiveWorkoutModalProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [timeSpent, setTimeSpent] = useState(0);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [restTimer, setRestTimer] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [showRestPopup, setShowRestPopup] = useState(false);
  const [sessionId, setSessionId] = useState<Id<'workoutSessions'> | null>(null);
  const [voiceExerciseIndex, setVoiceExerciseIndex] = useState<number | null>(null);
  const startSession = useMutation(api.workoutSessions.startSession);
  const upsertSet = useMutation(api.workoutSessions.upsertSet);
  const deleteSet = useMutation(api.workoutSessions.deleteSet);
  const finishSession = useMutation(api.workoutSessions.finishSession);

  useEffect(() => {
    if (visible) {
      // Always reinitialize from props when modal opens — this is how day-switching works
      setExercises(initialExercises.length > 0 ? initialExercises : []);
      setExpandedIndex(0);
      setTimeSpent(0);
      setRestTimer(0);
      setShowRestPopup(false);
      setSessionId(null);
      if (userId) {
        startSession({
          userId,
          title: sessionTitle,
          date: new Date().toISOString().slice(0, 10),
          unit: 'kg',
          source: 'manual',
        }).then(setSessionId).catch(() => undefined);
      }
      const interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [visible, initialExercises, sessionTitle, startSession, userId]);

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

  const persistCompletedSet = (exercise: ActiveExercise, set: SetData, setIndex: number, source: 'manual' | 'voice' | 'machine' = 'manual', transcript?: string) => {
    if (!userId || !sessionId) return;
    upsertSet({
      userId,
      sessionId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setIndex,
      weight: set.weight ? Number(set.weight) : undefined,
      reps: set.reps ? Number(set.reps) : undefined,
      completed: set.completed,
      source,
      clientEventId: set.id,
      transcript,
    }).catch(() => undefined);
  };

  const handleToggleSet = (exIndex: number, setIndex: number) => {
    const newEx = [...exercises];
    const exercise = { ...newEx[exIndex], sets: [...newEx[exIndex].sets] };
    const s = { ...exercise.sets[setIndex] };
    exercise.sets[setIndex] = s;
    newEx[exIndex] = exercise;
    s.completed = !s.completed;
    if (s.completed) {
      setRestTimer(90); // default 90s rest
      setShowRestPopup(true);
    }
    setExercises(newEx);
    persistCompletedSet(exercise, s, setIndex, 'manual');
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

  const handleDeleteSet = (exIndex: number, setIndex: number) => {
    const exercise = exercises[exIndex];
    const set = exercise?.sets[setIndex];
    if (!exercise || !set || exercise.sets.length <= 1) return;
    Alert.alert(
      t('move.deleteSetTitle', 'Delete set?'),
      t('move.deleteSetMessage', 'This set will be removed from this workout.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (userId && sessionId) await deleteSet({ userId, sessionId, clientEventId: set.id });
              setExercises(previous => previous.map((item, index) => index === exIndex
                ? { ...item, sets: item.sets.filter((_, rowIndex) => rowIndex !== setIndex) }
                : item));
            } catch {
              Alert.alert(t('common.error', 'Could not delete set'), t('common.tryAgain', 'Please try again.'));
            }
          },
        },
      ],
    );
  };

  const applyVoiceProposal = (exIndex: number, proposal: VoiceSetProposal) => {
    const next = exercises.map(ex => ({ ...ex, sets: [...ex.sets] }));
    const exercise = next[exIndex];
    if (!exercise) return;

    if (proposal.operation === 'undo_last') {
      const lastCompletedIndex = [...exercise.sets].map((set, index) => ({ set, index })).reverse().find(item => item.set.completed)?.index;
      if (lastCompletedIndex === undefined) return;
      const set = { ...exercise.sets[lastCompletedIndex], completed: false };
      exercise.sets[lastCompletedIndex] = set;
      setExercises(next);
      persistCompletedSet(exercise, set, lastCompletedIndex, 'voice', proposal.transcript);
      return;
    }

    const targetIndex = proposal.operation === 'add_set'
      ? exercise.sets.length
      : proposal.setIndex - 1;
    if (targetIndex < 0 || targetIndex >= exercise.sets.length + (proposal.operation === 'add_set' ? 1 : 0)) return;
    if (proposal.operation === 'add_set') {
      exercise.sets.push({ id: `voice-${Date.now()}-${exercise.sets.length}`, weight: '', reps: '', completed: false });
    }
    const current = exercise.sets[targetIndex];
    const set = {
      ...current,
      weight: proposal.weight === undefined ? current.weight : String(proposal.weight),
      reps: proposal.reps === undefined ? current.reps : String(proposal.reps),
      completed: proposal.operation === 'log_set' || proposal.operation === 'add_set'
        ? proposal.complete !== false
        : current.completed,
    };
    exercise.sets[targetIndex] = set;
    setExercises(next);
    if (proposal.operation === 'log_set' || proposal.operation === 'add_set') {
      persistCompletedSet(exercise, set, targetIndex, 'voice', proposal.transcript);
      if (set.completed) {
        setRestTimer(90);
        setShowRestPopup(true);
      }
    }
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
      <View style={styles.container}>
        {/* Header - Aligned to match Exercise Library (+10 offset) */}
        <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 16 }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={28} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.timerCenter}>
            <Ionicons name="timer-outline" size={20} color={themeColors.textMuted} />
          </View>
          <TouchableOpacity 
            style={[styles.finishBtn, !canFinish && styles.finishBtnDisabled]} 
            onPress={() => {
              if (userId && sessionId) finishSession({ userId, sessionId }).catch(() => undefined);
              onFinishWorkout(timeSpent, calcVolume(), calcCompletedSets(), exercises);
            }}
            disabled={!canFinish}
          >
            <Text style={[styles.finishBtnText, !canFinish && styles.finishBtnTextDisabled]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{t('move.finish', 'Finish')}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            
            {/* Top Stats Banner */}
            <View style={styles.statsBanner}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('move.duration', 'Duration')}</Text>
                <Text style={styles.statValueBlue}>{formatTime(timeSpent)}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('move.volume', 'Volume')}</Text>
                <Text style={styles.statValue}>{calcVolume()} {t('common.units.kg', 'kg')}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{t('move.sets', 'Sets')}</Text>
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
                    <Text style={styles.exName}>{getLocalizedExerciseName(ex.name, i18n.language)}</Text>

                    <TouchableOpacity
                      style={styles.voiceHeaderBtn}
                      onPress={(e) => { e.stopPropagation(); setVoiceExerciseIndex(exIdx); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={t('move.voiceLogSet', 'Log set by voice')}
                    >
                      <Ionicons name="mic-outline" size={20} color={themeColors.primary} />
                    </TouchableOpacity>

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
                      {(() => {
                        const rawMedia = ex.videoUrl || ex.thumbnailUrl || (ex as any).imageUrl || (ex as any).image;
                        if (!rawMedia) return null;
                        const lower = rawMedia.toLowerCase().split('?')[0];
                        const isVideo =
                          lower.endsWith('.mp4') ||
                          lower.endsWith('.mov') ||
                          lower.endsWith('.webm') ||
                          lower.endsWith('.m3u8') ||
                          lower.includes('/video/');

                        return (
                          <View style={styles.videoBox}>
                            {isVideo ? (
                              <Video
                                source={{ uri: rawMedia }}
                                posterSource={ex.thumbnailUrl ? { uri: ex.thumbnailUrl } : undefined}
                                usePoster={!!ex.thumbnailUrl}
                                style={styles.videoPlayerInline}
                                resizeMode={ResizeMode.COVER}
                                useNativeControls
                                shouldPlay
                                isLooping
                              />
                            ) : (
                              <Image
                                source={{ uri: rawMedia }}
                                style={styles.videoPlayerInline}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                              />
                            )}
                          </View>
                        );
                      })()}

                      {/* Sets Header */}
                      <View style={styles.setsHeader}>
                        <Text style={[styles.setsColHead, { width: 40 }]}>#</Text>
                        <Text style={[styles.setsColHead, { flex: 1 }]}>{t('move.previousShort', 'PREVIOUS')}</Text>
                        <Text style={[styles.setsColHead, { width: 60, textAlign: 'center' }]}>{t('move.kgShort', 'KG')}</Text>
                        <Text style={[styles.setsColHead, { width: 60, textAlign: 'center' }]}>{t('move.repsShort', 'REPS')}</Text>
                        <View style={{ width: 84 }} />
                      </View>

                      {/* Sets Rows */}
                      {ex.sets.map((set, setIdx) => (
                        <View key={set.id} style={[styles.setRow, set.completed && styles.setRowCompleted]}>
                          <Text style={[styles.setNum, set.completed && { color: themeColors.textMuted }]}>{setIdx + 1}</Text>
                          <Text style={styles.setPrev}>
                            {set.previousWeight && set.previousReps 
                              ? `${set.previousWeight}${t('common.units.kg', 'kg')} x ${set.previousReps}` 
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
                          <TouchableOpacity
                            style={[styles.deleteSetBtn, ex.sets.length <= 1 && styles.deleteSetBtnDisabled]}
                            onPress={() => handleDeleteSet(exIdx, setIdx)}
                            disabled={ex.sets.length <= 1}
                            accessibilityLabel={`Delete set ${setIdx + 1}`}
                          >
                            <Ionicons name="trash-outline" size={17} color={ex.sets.length <= 1 ? themeColors.textMuted : '#f43f5e'} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(exIdx)}>
                        <Text style={styles.addSetBtnText}>{t('move.addSet', '+ Add set')}</Text>
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
                            <Text style={styles.exVolumeText}>{t('move.exerciseVolume', 'Exercise Volume')}: <Text style={styles.exVolumeVal}>{exVol} {t('common.units.kg', 'kg')}</Text></Text>
                          </View>
                        ) : null;
                      })()}

                      {allSetsCompleted && exIdx < exercises.length - 1 && (
                        <TouchableOpacity style={styles.nextExBtn} onPress={() => setExpandedIndex(exIdx + 1)}>
                           <Text style={styles.nextExBtnText}>{t('move.nextExercise', 'Next Exercise')}</Text>
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
                 <Text style={styles.addExWrapBtnText}>{t('move.addExercise', 'Add Exercise')}</Text>
               </TouchableOpacity>
            )}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Rest Timer Popup Overlay */}
        {showRestPopup && (
          <View style={styles.restOverlay}>
            <View style={styles.restCard}>
              <Text style={styles.restTitle}>{t('move.restTimer', 'Rest Timer')}</Text>
              <Text style={styles.restTimeBig}>{formatTime(restTimer)}</Text>
              
              <View style={styles.restControls}>
                <TouchableOpacity style={styles.restAdjustBtn} onPress={() => setRestTimer(Math.max(0, restTimer - 15))}>
                  <Text style={styles.restAdjustNum}>- 15s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restReadyBtn} onPress={() => setShowRestPopup(false)}>
                  <Text style={styles.restReadyText}>{t('move.iAmReady', 'I am ready')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restAdjustBtn} onPress={() => setRestTimer(restTimer + 15)}>
                  <Text style={styles.restAdjustNum}>+ 15s</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={{ marginTop: 24, padding: 8 }} onPress={() => { setShowRestPopup(false); setRestTimer(0); }}>
                <Text style={styles.restTurnOffText}>{t('move.turnOff', 'Turn off')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <VoiceWorkoutLogModal
          visible={voiceExerciseIndex !== null}
          exerciseName={voiceExerciseIndex === null ? '' : exercises[voiceExerciseIndex]?.name ?? ''}
          targetSetIndex={voiceExerciseIndex === null ? 1 : (() => {
            const sets = exercises[voiceExerciseIndex]?.sets ?? [];
            return sets.findIndex(set => !set.completed) + 1 || sets.length;
          })()}
          existingSetIndexes={voiceExerciseIndex === null ? [] : (exercises[voiceExerciseIndex]?.sets ?? []).map((_, index) => index + 1)}
          unit="kg"
          onClose={() => setVoiceExerciseIndex(null)}
          onApply={(proposal) => {
            if (voiceExerciseIndex !== null) applyVoiceProposal(voiceExerciseIndex, proposal);
          }}
        />
      </View>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
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
    maxWidth: 104,
    minWidth: 54,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishBtnDisabled: {
    backgroundColor: c.border,
  },
  finishBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  finishBtnTextDisabled: {
    color: c.textMuted,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  statValueBlue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  exerciseBlock: {
    marginBottom: 16,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  exHeaderRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceMuted,
  },
  exNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exNumBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: c.textMuted,
  },
  exName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  exExpandedContent: {
    padding: 16,
  },
  voiceHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceMuted,
    marginLeft: 8,
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
    backgroundColor: c.surface,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: c.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',

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
    color: c.textMuted,
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
    backgroundColor: c.surfaceMuted,
  },
  deleteSetBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  deleteSetBtnDisabled: {
    opacity: 0.35,
  },
  setNum: {
    width: 40,
    fontSize: 15,
    fontWeight: 'bold',
    color: c.text,
  },
  setPrev: {
    flex: 1,
    fontSize: 14,
    color: c.textMuted,
  },
  setField: {
    width: 60,
    backgroundColor: c.surfaceMuted,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
    marginHorizontal: 5,
  },
  setFieldCompleted: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: c.textMuted,
  },
  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.surfaceMuted,
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
    borderColor: c.border,
    borderStyle: 'dashed',
    backgroundColor: c.surfaceMuted,
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
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  addSetBtnText: {
    color: c.textMuted,
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
    backgroundColor: c.surface,
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
    color: c.textMuted,
    marginBottom: 16,
  },
  restTimeBig: {
    fontSize: 48,
    fontWeight: '900',
    color: c.text,
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
    backgroundColor: c.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restAdjustNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
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
    color: c.textMuted,
    fontWeight: '500',
  },
  exVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: c.scheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.scheme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#dbeafe',
  },
  exVolumeText: {
    fontSize: 13,
    color: c.text,
    fontWeight: '600',
  },
  exVolumeVal: {
    color: '#2563eb',
    fontWeight: '800',
  },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
