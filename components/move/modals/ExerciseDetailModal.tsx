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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {typeof exercise.name === 'object' ? (exercise.name as any).en || (exercise.name as any).name : exercise.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {!isPro ? (
           <View style={{ flex: 1 }}>
             <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800' }} 
                style={styles.blurredBg} 
                blurRadius={15} 
             />
             <View style={styles.overlay}>
               <View style={styles.proBadge}>
                 <Ionicons name="star" size={16} color="#f59e0b" />
                 <Text style={styles.proBadgeText}>PRO</Text>
               </View>
               <Text style={styles.lockedTitle}>Exercise Details Locked</Text>
               <Text style={styles.lockedSub}>
                 Upgrade to Pro to view comprehensive instructions, muscle anatomy, video demonstrations, and equipment details for every exercise.
               </Text>
               <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress}>
                 <LinearGradient
                   colors={['#8b5cf6', '#d946ef']}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 1 }}
                   style={styles.upgradeGradient}
                 >
                   <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                 </LinearGradient>
               </TouchableOpacity>
             </View>
           </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.mediaBox}>
               {/* Stand-in for Video Player */}
               <Ionicons name="play-circle" size={64} color="#cbd5e1" />
            </View>

            <Text style={styles.exTitle}>
              {typeof exercise.name === 'object' ? (exercise.name as any).en || (exercise.name as any).name : exercise.name}
            </Text>
            
            <View style={styles.chipRow}>
               <View style={styles.chip}>
                  <Text style={styles.chipText}>{exercise.muscleGroups?.[0] || exercise.category || 'Various'}</Text>
               </View>
               <View style={styles.chipOutline}>
                  <Text style={styles.chipOutlineText}>{exercise.equipment || 'No Equipment'}</Text>
               </View>
            </View>

            <View style={styles.section}>
               <Text style={styles.sectionTitle}>Instructions</Text>
               <Text style={styles.paragraph}>
                 1. Set up the equipment to the appropriate height or weight.{'\n'}
                 2. Keep your core tight and maintain a neutral spine.{'\n'}
                 3. Perform the movement with a controlled tempo, pausing briefly at peak contraction.{'\n'}
                 4. Return to the starting position slowly.
               </Text>
            </View>

            <View style={styles.section}>
               <Text style={styles.sectionTitle}>Description</Text>
               <Text style={styles.paragraph}>
                 {exercise.description || 'This exercise targets the primary muscle group effectively, ensuring maximal hypertrophy and strength gains when performed with proper form.'}
               </Text>
            </View>

          </ScrollView>
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
  blurredBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 20,
  },
  proBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockedSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  upgradeBtn: {
    shadowColor: '#d946ef',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  upgradeGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  mediaBox: {
    width: '100%',
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  exTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  chip: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chipOutline: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipOutlineText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
});
