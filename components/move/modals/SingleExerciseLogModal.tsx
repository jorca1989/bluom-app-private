import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface LogSetData {
  id: string;
  /** Added weight in kg (e.g. vest/belt). For BW sets, this is the "+" weight. */
  weight: string;
  reps: string;
  isBodyweight: boolean;
}

export interface SingleExerciseLogModalProps {
  visible: boolean;
  exercise: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    type?: string;
    caloriesPerMinute?: number;
  } | null;
  onClose: () => void;
  onSave: (
    exerciseId: string,
    data: { sets?: LogSetData[]; duration?: number; calories?: number; distanceKm?: number; pace?: number }
  ) => void;
}

export default function SingleExerciseLogModal({
  visible,
  exercise,
  onClose,
  onSave
}: SingleExerciseLogModalProps) {
  const [sets, setSets] = useState<LogSetData[]>([]);
  const [durationStr, setDurationStr] = useState('');
  const [distanceStr, setDistanceStr] = useState('');
  const [intensity, setIntensity] = useState<'Low'|'Medium'|'High'>('Medium');
  const multipliers = { Low: 5, Medium: 8, High: 12 };

  const exType = useMemo(() => String(exercise?.type ?? 'strength').toLowerCase(), [exercise?.type]);
  const isStrength = exType === 'strength';
  const isCardioLike = exType === 'cardio' || exType === 'hiit';
  const isMindBody = exType === 'yoga' || exType === 'pilates' || exType === 'stretching';
  const mode: 'strength' | 'duration' = isStrength ? 'strength' : 'duration';

  useEffect(() => {
    if (visible && exercise) {
      if (mode === 'strength') {
        const defaultBw = /push[- ]?up|pull[- ]?up|dip|plank|burpee|calisthenic|bodyweight/i.test(exercise.name);
        setSets([
          { id: Date.now().toString(), weight: '', reps: '', isBodyweight: defaultBw }
        ]);
      } else {
        setDurationStr('');
        setDistanceStr('');
        setSets([]);
      }
    }
  }, [visible, exercise, mode]);

  const handleUpdateSet = (index: number, field: 'weight'|'reps', val: string) => {
    const newSets = [...sets];
    newSets[index][field] = val;
    setSets(newSets);
  };

  const handleAddSet = () => {
    const defaultBw = !!exercise && /push[- ]?up|pull[- ]?up|dip|plank|burpee|calisthenic|bodyweight/i.test(exercise.name);
    setSets([...sets, { id: Date.now().toString(), weight: '', reps: '', isBodyweight: defaultBw }]);
  };

  const handleDeleteSet = (index: number) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleToggleBW = (index: number) => {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isBodyweight: !next[index].isBodyweight };
      return next;
    });
  };


  const estimatedCalories = useMemo(() => {
    const minutes = parseInt(durationStr || '0', 10) || 0;
    if (mode !== 'duration') return 0;
    if (minutes <= 0) return 0;
    if (typeof exercise?.caloriesPerMinute === 'number' && Number.isFinite(exercise.caloriesPerMinute)) {
      const intensityMult = intensity === 'Low' ? 0.85 : intensity === 'High' ? 1.15 : 1;
      return Math.round(minutes * exercise.caloriesPerMinute * intensityMult);
    }
    const base = isMindBody ? 4 : multipliers[intensity];
    return Math.round(minutes * base);
  }, [durationStr, exercise?.caloriesPerMinute, intensity, isMindBody, mode]);

  const parsedDistanceKm = useMemo(() => {
    const val = parseFloat(distanceStr);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [distanceStr]);

  const derivedPace = useMemo(() => {
    const minutes = parseInt(durationStr || '0', 10) || 0;
    if (!isCardioLike) return 0;
    if (minutes <= 0 || parsedDistanceKm <= 0) return 0;
    return Math.round((minutes / parsedDistanceKm) * 10) / 10; // min/km
  }, [durationStr, isCardioLike, parsedDistanceKm]);

  // Only allow saving if at least one set has actual data or duration is provided
  const canSave = mode === 'duration'
     ? (parseInt(durationStr || '0', 10) || 0) > 0
     : sets.some(s => s.weight.trim() !== '' || s.reps.trim() !== '');

  if (!exercise) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log {mode === 'duration' ? 'Activity' : 'Workout'}</Text>
          <TouchableOpacity 
            style={[styles.finishBtn, !canSave && styles.finishBtnDisabled]} 
            onPress={() => onSave(
              exercise.id,
              mode === 'duration'
                ? {
                    duration: parseInt(durationStr || '0', 10) || 0,
                    calories: estimatedCalories,
                    distanceKm: isCardioLike ? (parsedDistanceKm || undefined) : undefined,
                    pace: isCardioLike ? (derivedPace || undefined) : undefined,
                  }
                : { sets }
            )}
            disabled={!canSave}
          >
            <Text style={[styles.finishBtnText, !canSave && styles.finishBtnTextDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.exerciseBlock}>
              <View style={styles.exHeaderRow}>
                <View style={styles.exThumb}>
                  <Text style={styles.exThumbText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{exercise.name}</Text>
                  <Text style={styles.exTypePill}>
                    {isStrength ? 'Strength' : isCardioLike ? 'Cardio' : isMindBody ? 'Mind & Body' : 'Activity'}
                  </Text>
                </View>
              </View>

              <View style={styles.exExpandedContent}>
                {exercise.thumbnailUrl && (
                  <View style={styles.videoPlaceholder}>
                     <Image source={{ uri: exercise.thumbnailUrl }} style={styles.videoImage} resizeMode="cover" />
                     <View style={styles.playIconOverlay}>
                       <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
                     </View>
                  </View>
                )}

                {mode === 'duration' ? (
                  <View style={styles.cardioContainer}>
                    <Text style={styles.cardioLabel}>Duration (Minutes)</Text>
                    <TextInput 
                      style={styles.cardioInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 30"
                      value={durationStr}
                      onChangeText={setDurationStr}
                    />

                    {isCardioLike && (
                      <>
                        <Text style={[styles.cardioLabel, { marginTop: 16 }]}>Distance (km)</Text>
                        <TextInput
                          style={styles.cardioInput}
                          keyboardType="decimal-pad"
                          placeholder="e.g. 5"
                          value={distanceStr}
                          onChangeText={setDistanceStr}
                        />
                        {!!derivedPace && (
                          <Text style={styles.paceText}>Pace: {derivedPace} min/km</Text>
                        )}
                      </>
                    )}

                    <Text style={[styles.cardioLabel, { marginTop: 16 }]}>Intensity</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                      {['Low', 'Medium', 'High'].map((lvl) => (
                         <TouchableOpacity
                            key={lvl}
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center',
                               borderColor: intensity === lvl ? '#3b82f6' : '#cbd5e1',
                               backgroundColor: intensity === lvl ? '#eff6ff' : '#ffffff' 
                            }}
                            onPress={() => setIntensity(lvl as any)}
                         >
                            <Text style={{ fontWeight: '600', color: intensity === lvl ? '#1d4ed8' : '#64748b' }}>{lvl}</Text>
                         </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.caloriesRow}>
                      <Ionicons name="flame" size={20} color="#f97316" />
                      <Text style={styles.caloriesText}>Estimated burn: {estimatedCalories} kcal</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Sets Header */}
                    <View style={styles.setsHeader}>
                      <Text style={[styles.setsColHead, { width: 40 }]}>SET</Text>
                      <Text style={[styles.setsColHead, { flex: 1, textAlign: 'center' }]}>KG / +KG</Text>
                      <Text style={[styles.setsColHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                      <View style={{ width: 34 }} />
                    </View>

                    {/* Sets Rows */}
                    {sets.map((set, setIdx) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setNum}>{setIdx + 1}</Text>
                        
                        <View style={styles.hybridInputContainer}>
                          <TouchableOpacity
                            style={[styles.bwBadge, set.isBodyweight && styles.bwBadgeActive]}
                            onPress={() => handleToggleBW(setIdx)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.bwBadgeText}>BW</Text>
                          </TouchableOpacity>
                          <TextInput 
                            style={styles.setFieldHybrid} 
                            keyboardType="decimal-pad"
                            value={set.weight}
                            placeholder={set.isBodyweight ? "+0" : "0"}
                            onChangeText={(v) => handleUpdateSet(setIdx, 'weight', v)}
                          />
                        </View>
                        
                        <TextInput 
                          style={styles.setField} 
                          keyboardType="number-pad"
                          value={set.reps}
                          placeholder="0"
                          onChangeText={(v) => handleUpdateSet(setIdx, 'reps', v)}
                        />

                        <TouchableOpacity
                          onPress={() => handleDeleteSet(setIdx)}
                          disabled={sets.length <= 1}
                          style={[styles.deleteSetBtn, sets.length <= 1 && { opacity: 0.35 }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.addSetBtn} onPress={handleAddSet}>
                      <Text style={styles.addSetBtnText}>+ Add set</Text>
                    </TouchableOpacity>
                  </>
                )}

              </View>
            </View>
            
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  iconBtn: {
    padding: 8,
    marginLeft: -8,
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
  exThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exThumbText: {
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
  exTypePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  exExpandedContent: {
    padding: 16,
  },
  videoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
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
  setNum: {
    width: 40,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  setField: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginHorizontal: 5,
  },
  hybridInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  bwBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#cbd5e1',
    borderRadius: 6,
    marginLeft: 6,
  },
  bwBadgeActive: {
    backgroundColor: '#06b6d4',
  },
  bwBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  setFieldHybrid: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  deleteSetBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
  cardioContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardioLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  cardioInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
  },
  caloriesText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  paceText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
});
