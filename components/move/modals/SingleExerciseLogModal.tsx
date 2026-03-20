import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface LogSetData {
  id: string;
  weight: string;
  reps: string;
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
  onSave: (exerciseId: string, data: { sets?: LogSetData[]; duration?: number; calories?: number }) => void;
}

export default function SingleExerciseLogModal({
  visible,
  exercise,
  onClose,
  onSave
}: SingleExerciseLogModalProps) {
  const [sets, setSets] = useState<LogSetData[]>([]);
  const [durationStr, setDurationStr] = useState('');
  const [intensity, setIntensity] = useState<'Low'|'Medium'|'High'>('Medium');
  const multipliers = { Low: 5, Medium: 8, High: 12 };

  const isCardio = exercise?.type === 'cardio' || exercise?.type === 'stretching';

  useEffect(() => {
    if (visible && exercise) {
      if (!isCardio) {
        setSets([
          { id: Date.now().toString() + '1', weight: '', reps: '' },
          { id: Date.now().toString() + '2', weight: '', reps: '' },
          { id: Date.now().toString() + '3', weight: '', reps: '' }
        ]);
      } else {
        setDurationStr('');
        setSets([]);
      }
    }
  }, [visible, exercise, isCardio]);

  if (!exercise) return null;

  const handleUpdateSet = (index: number, field: 'weight'|'reps', val: string) => {
    const newSets = [...sets];
    newSets[index][field] = val;
    setSets(newSets);
  };

  const handleAddSet = () => {
    setSets([...sets, { id: Date.now().toString(), weight: '', reps: '' }]);
  };



  const estimatedCalories = isCardio 
    ? Math.round(parseInt(durationStr || '0') * multipliers[intensity])
    : 0;

  // Only allow saving if at least one set has actual data or duration is provided
  const canSave = isCardio 
     ? parseInt(durationStr || '0') > 0
     : sets.some(s => s.weight.trim() !== '' || s.reps.trim() !== '');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log {isCardio ? 'Activity' : 'Workout'}</Text>
          <TouchableOpacity 
            style={[styles.finishBtn, !canSave && styles.finishBtnDisabled]} 
            onPress={() => onSave(exercise.id, isCardio ? { duration: parseInt(durationStr || '0'), calories: estimatedCalories } : { sets })}
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
                <Text style={styles.exName}>{exercise.name}</Text>
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

                {isCardio ? (
                  <View style={styles.cardioContainer}>
                    <Text style={styles.cardioLabel}>Duration (Minutes)</Text>
                    <TextInput 
                      style={styles.cardioInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 30"
                      value={durationStr}
                      onChangeText={setDurationStr}
                    />

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
                      <Text style={[styles.setsColHead, { flex: 1, textAlign: 'center' }]}>KG</Text>
                      <Text style={[styles.setsColHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                    </View>

                    {/* Sets Rows */}
                    {sets.map((set, setIdx) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setNum}>{setIdx + 1}</Text>
                        
                        <TextInput 
                          style={styles.setField} 
                          keyboardType="decimal-pad"
                          value={set.weight}
                          placeholder="0"
                          onChangeText={(v) => handleUpdateSet(setIdx, 'weight', v)}
                        />
                        
                        <TextInput 
                          style={styles.setField} 
                          keyboardType="number-pad"
                          value={set.reps}
                          placeholder="0"
                          onChangeText={(v) => handleUpdateSet(setIdx, 'reps', v)}
                        />
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
});
