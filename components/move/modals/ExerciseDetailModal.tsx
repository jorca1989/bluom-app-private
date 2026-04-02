import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ExerciseDetailModalProps {
  visible: boolean;
  exercise: any;
  isPro: boolean;
  onClose: () => void;
  onUpgradePress: () => void;
}

export default function ExerciseDetailModal({
  visible,
  exercise,
  isPro,
  onClose,
  onUpgradePress
}: ExerciseDetailModalProps) {
  if (!visible || !exercise) return null;

  const exerciseName =
    typeof exercise.name === 'object'
      ? (exercise.name as any).en || (exercise.name as any).name
      : exercise.name;

  const exerciseType = exercise.type || exercise.exerciseType || exercise.category || 'Strength';
  const difficulty = exercise.difficulty || exercise.level || null;
  const description =
    exercise.description ||
    'This exercise targets the primary muscle group effectively, ensuring maximal hypertrophy and strength gains when performed with proper form.';

  const instructions: string[] = exercise.instructions ?? [];
  const primaryMuscles: string[] = exercise.primaryMuscles ?? exercise.muscleGroups ?? [];
  const secondaryMuscles: string[] = exercise.secondaryMuscles ?? [];
  const videoUrl: string | null = exercise.videoUrl ?? exercise.thumbnailUrl ?? null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* ── FREE TIER: always visible ── */}
          <Text style={styles.exTitle}>{exerciseName}</Text>

          {/* Type & Difficulty chips */}
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="barbell-outline" size={13} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.chipText}>{exerciseType}</Text>
            </View>
            {difficulty && (
              <View style={styles.diffChip}>
                <Ionicons name="stats-chart" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                <Text style={styles.diffChipText}>{difficulty}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.paragraph}>{description}</Text>
          </View>

          {/* ── LOCKED SECTION: Pro only ── */}
          <View style={styles.lockedSection}>
            {/* Blurred content preview */}
            <View style={[styles.lockedContent, !isPro && styles.lockedContentBlurred]} pointerEvents={isPro ? 'auto' : 'none'}>

              {/* Video / Media */}
              {videoUrl ? (
                <View style={styles.mediaBox}>
                  <Image
                    source={{ uri: videoUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    blurRadius={isPro ? 0 : 10}
                  />
                  {isPro && (
                    <View style={styles.playOverlay}>
                      <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.9)" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.mediaBox}>
                  <Ionicons name="play-circle" size={64} color="#cbd5e1" />
                  <Text style={styles.mediaPlaceholderText}>No video available</Text>
                </View>
              )}

              {/* Instructions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {instructions.length > 0 ? (
                  instructions.map((step, i) => (
                    <View key={i} style={styles.instructionRow}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View style={styles.instructionRow}>
                      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
                      <Text style={styles.instructionText}>Set up the equipment to the appropriate height or weight.</Text>
                    </View>
                    <View style={styles.instructionRow}>
                      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                      <Text style={styles.instructionText}>Keep your core tight and maintain a neutral spine.</Text>
                    </View>
                    <View style={styles.instructionRow}>
                      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
                      <Text style={styles.instructionText}>Perform the movement with a controlled tempo, pausing briefly at peak contraction.</Text>
                    </View>
                    <View style={styles.instructionRow}>
                      <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>4</Text></View>
                      <Text style={styles.instructionText}>Return to the starting position slowly.</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Muscles */}
              {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Muscles</Text>
                  <View style={styles.muscleRow}>
                    {primaryMuscles.length > 0 && (
                      <View style={styles.muscleGroup}>
                        <Text style={styles.muscleGroupLabel}>Primary</Text>
                        {primaryMuscles.map((m, i) => (
                          <Text key={i} style={styles.muscleItem}>• {m}</Text>
                        ))}
                      </View>
                    )}
                    {secondaryMuscles.length > 0 && (
                      <View style={styles.muscleGroupSecondary}>
                        <Text style={[styles.muscleGroupLabel, { color: '#15803d' }]}>Secondary</Text>
                        {secondaryMuscles.map((m, i) => (
                          <Text key={i} style={styles.muscleItemSecondary}>• {m}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

            </View>

            {/* ── Lock Overlay for free users (fasting.tsx style) ── */}
            {!isPro && (
              <View style={styles.lockOverlay}>
                <View style={styles.lockCard}>
                  <Ionicons name="lock-closed" size={32} color="#3b82f6" />
                  <Text style={styles.lockTitle}>Pro Details Locked</Text>
                  <Text style={styles.lockSub}>
                    Upgrade to Pro to unlock full instructions, muscle breakdown, and video demonstration.
                  </Text>
                  <TouchableOpacity style={styles.lockBtn} onPress={onUpgradePress}>
                    <LinearGradient
                      colors={['#3b82f6', '#6366f1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.lockBtnGradient}
                    >
                      <Text style={styles.lockBtnText}>Upgrade to Unlock</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginHorizontal: 16,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Always visible
  exTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 14,
  },
  diffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  diffChipText: {
    color: '#d97706',
    fontWeight: '700',
    fontSize: 14,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },

  // Locked section wrapper
  lockedSection: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  lockedContent: {
    padding: 20,
  },
  lockedContentBlurred: {
    opacity: 0.25,
  },

  // Media box (portrait for vertical videos)
  mediaBox: {
    width: '60%',
    alignSelf: 'center',
    aspectRatio: 9 / 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
  },
  mediaPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Instructions
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // Muscles
  muscleRow: { flexDirection: 'row', gap: 12 },
  muscleGroup: {
    flex: 1,
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 14,
  },
  muscleGroupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscleItem: { fontSize: 13, color: '#1e40af', marginBottom: 4, fontWeight: '600' },
  muscleGroupSecondary: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 14,
  },
  muscleItemSecondary: { fontSize: 13, color: '#15803d', marginBottom: 4, fontWeight: '600' },

  // Lock overlay (fasting.tsx style)
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: 20,
  },
  lockCard: {
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    width: '90%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  lockSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  lockBtn: {
    width: '100%',
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lockBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  lockBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
