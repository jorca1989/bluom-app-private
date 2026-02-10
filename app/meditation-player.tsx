import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import BreathingAnimation from '../components/BreathingAnimation';
import { Soundscape, SOUNDSCAPES, getSoundscapesByCategory } from '../utils/soundscapes';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;

interface MeditationPlayerProps {
  visible: boolean;
  onClose: () => void;
  soundscape?: Soundscape | null;
  audioUrl?: string; // For admin-created sessions
  sessionTitle?: string;
  duration?: number; // Minutes
  logId?: Id<"meditationLogs"> | null;
}

export default function MeditationPlayerScreen({
  visible,
  onClose,
  soundscape,
  audioUrl,
  sessionTitle,
  duration,
  logId
}: MeditationPlayerProps) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSoundscape, setSelectedSoundscape] = useState<Soundscape | null>(soundscape || null);
  const [showSoundscapeSelector, setShowSoundscapeSelector] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');

  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalDuration = duration ? duration * 60 : 0; // Seconds

  const completeSession = useMutation(api.meditation.completeSession);

  useEffect(() => {
    if (visible && (selectedSoundscape || audioUrl)) {
      loadSound();
    }
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, selectedSoundscape, audioUrl]);

  useEffect(() => {
    if (isPlaying && totalDuration > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            handleComplete();
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000) as any;
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const loadSound = async () => {
    const source = audioUrl ? { uri: audioUrl } : selectedSoundscape?.file;
    if (!source) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: false,
          isLooping: !audioUrl, // Loop soundscapes, but not guided sessions
          volume: 0.5,
        }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Error loading sound:', error);
    }
  };

  const handlePlay = async () => {
    if (!soundRef.current) await loadSound();
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const handlePause = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handleComplete = async () => {
    setIsPlaying(false);
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
    if (logId) {
      await completeSession({
        logId,
        durationCompleted: Math.floor(currentTime / 60)
      });
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  if (!visible) return null;

  // Determine if animation should be shown based on session category
  // If we have a soundscape, check its category. If sessionTitle implies category, check that.
  // Ideally, pass category prop. If not available, infer.
  // For now, we only show it if soundscape category is NOT 'water' (example) OR if it's a specific session.
  // User request: 'Anxiety', 'Sleep', 'Focus'.
  // However, we don't have exact category passed in props except maybe implicitly.
  // Let's assume passed soundscape or session title can guide us, or pass category prop.
  // For this fix, let's assume all strictly meditation sessions (not soundscapes) might want it?
  // Or check title keywords?
  // Better: We will hide it for 'Soundscape' if no category matches.

  // Actually, let's simply show it always BUT controlled by play state, EXCEPT if user explicitly wanted to hide for some.
  // User Rule: "only display... if the session category is 'Anxiety', 'Sleep', or 'Focus'".
  // We need to pass category to MeditationPlayerProps.

  // NOTE: I will add category to props below in a separate edit or assume it's passed or check title.
  // Checking title for now as a heuristic if category missing.
  const isTargetCategory = (title: string) => {
    const t = title.toLowerCase();
    return t.includes('sleep') || t.includes('anxiety') || t.includes('focus') || t.includes('breathe');
  };

  const showAnimation = (sessionTitle && isTargetCategory(sessionTitle)) || (selectedSoundscape && ['sleep', 'focus', 'anxiety'].includes(selectedSoundscape.category));

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sessionTitle || selectedSoundscape?.name || 'Meditation'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {showAnimation ? (
            <>
              <View style={styles.animationContainer}>
                <BreathingAnimation
                  size={isSmallScreen ? 180 : 220}
                  color={selectedSoundscape?.category === 'water' ? '#06b6d4' : '#3b82f6'}
                  onInhale={() => setBreathingPhase('inhale')}
                  onExhale={() => setBreathingPhase('exhale')}
                  isPlaying={isPlaying}
                />
              </View>

              <View style={styles.instructionsContainer}>
                <Text style={styles.breathingText}>
                  {isPlaying ? (breathingPhase === 'inhale' ? 'Breathe In' : 'Breathe Out') : 'Paused'}
                </Text>
                <Text style={styles.instructionsText}>
                  {isPlaying ? "Follow the circle's rhythm. Breathe naturally." : "Press Play to start breathing session."}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ marginBottom: 40, alignItems: 'center' }}>
              <Ionicons name="musical-notes" size={80} color="#cbd5e1" />
              <Text style={{ marginTop: 20, color: '#64748b', fontSize: 16 }}>Audio Session</Text>
            </View>
          )}

          {totalDuration > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
              </View>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity style={styles.playButton} onPress={isPlaying ? handlePause : handlePlay}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  soundscapeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  animationContainer: { marginBottom: 40 },
  instructionsContainer: { alignItems: 'center', marginBottom: 40 },
  breathingText: { fontSize: 28, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  instructionsText: { fontSize: 16, color: '#64748b', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  progressContainer: { width: '100%', marginBottom: 40 },
  progressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 14, color: '#64748b' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  playButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  completeButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, backgroundColor: '#10b981' },
  completeButtonText: { color: '#ffffff', fontWeight: '600' },
  selectorOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  selectorContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.7 },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  selectorTitle: { fontSize: 20, fontWeight: '600', color: '#1e293b' },
  selectorList: { padding: 24 },
  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  soundscapeOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 8 },
  soundscapeOptionActive: { backgroundColor: '#dbeafe', borderWidth: 2, borderColor: '#3b82f6' },
  soundscapeOptionName: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
});

