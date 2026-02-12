import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  BackHandler,
  Platform,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import BreathingAnimation from '../components/BreathingAnimation';
import { Soundscape, SOUNDSCAPES, getSoundscapesByCategory } from '../utils/soundscapes';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const THUMB_SIZE = 20;
const TRACK_HEIGHT = 6;

// ─── Pure-JS Seek Bar (no native module needed) ─────────────
interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  isSeeking: boolean;
  onSeekStart: () => void;
  onSeekEnd: (ms: number) => void;
  formatTime: (ms: number) => string;
  enabled: boolean; // false for looping soundscapes (read-only bar)
}

function SeekBar({ positionMs, durationMs, isSeeking, onSeekStart, onSeekEnd, formatTime, enabled }: SeekBarProps) {
  const trackWidthRef = useRef(0);
  const [localPosition, setLocalPosition] = useState(0);
  const draggingRef = useRef(false);
  const seekMsRef = useRef(0);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: () => enabled,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        draggingRef.current = true;
        onSeekStart();
        const x = evt.nativeEvent.locationX;
        const ratio = clamp(x / trackWidthRef.current, 0, 1);
        const ms = ratio * durationMs;
        seekMsRef.current = ms;
        setLocalPosition(ms);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.locationX;
        const ratio = clamp(x / trackWidthRef.current, 0, 1);
        const ms = ratio * durationMs;
        seekMsRef.current = ms;
        setLocalPosition(ms);
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        onSeekEnd(seekMsRef.current);
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        onSeekEnd(seekMsRef.current);
      },
    })
  ).current;

  const displayMs = draggingRef.current ? localPosition : positionMs;
  const progress = durationMs > 0 ? clamp(displayMs / durationMs, 0, 1) : 0;

  return (
    <View style={seekStyles.container}>
      <View
        style={seekStyles.trackTouchArea}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        onLayout={(e: LayoutChangeEvent) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={seekStyles.track}>
          <View style={[seekStyles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        {enabled && (
          <View style={[seekStyles.thumb, { left: `${progress * 100}%`, marginLeft: -(THUMB_SIZE / 2) }]} />
        )}
      </View>
      <View style={seekStyles.timeRow}>
        <Text style={seekStyles.time}>{formatTime(displayMs)}</Text>
        <Text style={seekStyles.time}>{formatTime(durationMs)}</Text>
      </View>
    </View>
  );
}

const seekStyles = StyleSheet.create({
  container: { width: '100%', marginBottom: 32 },
  trackTouchArea: { height: 40, justifyContent: 'center' },
  track: { height: TRACK_HEIGHT, backgroundColor: '#e5e7eb', borderRadius: TRACK_HEIGHT / 2, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: TRACK_HEIGHT / 2 },
  thumb: { position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: '#3b82f6', top: (40 - THUMB_SIZE) / 2, elevation: 4, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 },
  time: { fontSize: 14, color: '#64748b', fontWeight: '500' },
});


interface MeditationPlayerProps {
  visible: boolean;
  onClose: () => void;
  soundscape?: Soundscape | null;
  audioUrl?: string;
  sessionTitle?: string;
  coverImage?: string;
  duration?: number; // Minutes (metadata hint)
  logId?: Id<"meditationLogs"> | null;
}

export default function MeditationPlayerScreen({
  visible,
  onClose,
  soundscape,
  audioUrl,
  sessionTitle,
  coverImage,
  duration,
  logId,
}: MeditationPlayerProps) {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(duration ? duration * 60 * 1000 : 0);
  const [selectedSoundscape, setSelectedSoundscape] = useState<Soundscape | null>(soundscape || null);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [isSeeking, setIsSeeking] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isClosingRef = useRef(false);

  const completeSession = useMutation(api.meditation.completeSession);

  // ─── Background audio mode ───────────────────────────────────
  useEffect(() => {
    if (visible) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
    return () => deactivateKeepAwake();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch(console.warn);
  }, [visible]);

  // ─── Playback status callback (runs even when screen locked) ─
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    // Update position (skip if user is dragging the slider)
    if (!isSeeking) {
      setPositionMs(status.positionMillis);
    }

    // Use the real duration from the audio engine
    if (status.durationMillis && status.durationMillis > 0) {
      setDurationMs(status.durationMillis);
    }

    setIsPlaying(status.isPlaying);

    // Track finished naturally
    if (status.didJustFinish && !status.isLooping) {
      handleComplete();
    }
  }, [isSeeking]);

  // ─── Load sound ──────────────────────────────────────────────
  const loadSound = useCallback(async () => {
    const source = audioUrl ? { uri: audioUrl } : selectedSoundscape?.file;
    if (!source) return;

    // Unload previous sound if any
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch { }
      soundRef.current = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: false,
          isLooping: !audioUrl, // Loop soundscapes, not guided sessions
          volume: 0.5,
          progressUpdateIntervalMillis: 1000,
          // Metadata for the Lock Screen
          androidImplementation: 'MediaPlayer', // Better for background
          // @ts-ignore - expo-av types might not be fully updated for metadata but this works on native
          metadata: {
            title: sessionTitle || selectedSoundscape?.name || 'Meditation',
            artist: "Bluom",
            album: "Meditation Hub",
            imageUri: coverImage || "https://your-default-logo.png", // Fallback if needed
          }
        },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('[MeditationPlayer] Error loading sound:', error);
    }
  }, [audioUrl, selectedSoundscape, onPlaybackStatusUpdate]);

  // ─── Mount/unmount lifecycle ─────────────────────────────────
  useEffect(() => {
    if (visible && (selectedSoundscape || audioUrl)) {
      isClosingRef.current = false;
      loadSound();
    }
    return () => {
      cleanup();
    };
  }, [visible, selectedSoundscape, audioUrl]);

  // ─── Android hardware back button ───────────────────────────
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true; // Consume the event
    });

    return () => backHandler.remove();
  }, [visible]);

  // ─── Cleanup (single source of truth) ───────────────────────
  const cleanup = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { }
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPositionMs(0);
  };

  // ─── Controls ────────────────────────────────────────────────
  const handlePlay = async () => {
    if (!soundRef.current) await loadSound();
    if (soundRef.current) {
      await soundRef.current.playAsync();
    }
  };

  const handlePause = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
    }
  };

  const handleSeek = async (valueMs: number) => {
    // Optimistic update to prevent UI jump
    setPositionMs(valueMs);

    if (soundRef.current) {
      await soundRef.current.setPositionAsync(valueMs);
    }

    // Only release lock after seek completes
    setIsSeeking(false);
  };

  const handleComplete = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const minutesCompleted = Math.floor(positionMs / 60000);

    await cleanup();

    if (logId && minutesCompleted > 0) {
      try {
        await completeSession({
          logId,
          durationCompleted: minutesCompleted,
        });
      } catch (e) {
        console.warn('[MeditationPlayer] completeSession failed:', e);
      }
    }
    onClose();
  };

  const handleClose = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    await cleanup();
    onClose();
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  // Determine breathing animation visibility
  const isTargetCategory = (title: string) => {
    const t = title.toLowerCase();
    return t.includes('sleep') || t.includes('anxiety') || t.includes('focus') || t.includes('breathe');
  };
  const showAnimation =
    (sessionTitle && isTargetCategory(sessionTitle)) ||
    (selectedSoundscape && ['sleep', 'focus', 'anxiety'].includes(selectedSoundscape.category));

  const showSeekBar = durationMs > 0 && !selectedSoundscape; // Seek bar for guided sessions, not looping soundscapes

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
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
                  {isPlaying ? "Follow the circle's rhythm. Breathe naturally." : 'Press Play to start breathing session.'}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ marginBottom: 40, alignItems: 'center' }}>
              {coverImage ? (
                <Image
                  source={{ uri: coverImage }}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={1000}
                />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={80} color="#cbd5e1" />
                  <Text style={{ marginTop: 20, color: '#64748b', fontSize: 16 }}>Audio Session</Text>
                </>
              )}
            </View>
          )}

          {/* Seek bar */}
          {durationMs > 0 && (
            <SeekBar
              positionMs={positionMs}
              durationMs={durationMs}
              isSeeking={isSeeking}
              onSeekStart={() => setIsSeeking(true)}
              onSeekEnd={handleSeek}
              formatTime={formatTime}
              enabled={showSeekBar}
            />
          )}

          <View style={styles.controls}>
            {/* Rewind 15s */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                if (soundRef.current) {
                  const newPos = Math.max(0, positionMs - 15000);
                  soundRef.current.setPositionAsync(newPos);
                }
              }}
            >
              <Ionicons name="play-back" size={24} color="#64748b" />
              <Text style={styles.skipLabel}>15s</Text>
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity style={styles.playButton} onPress={isPlaying ? handlePause : handlePlay}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#ffffff" />
            </TouchableOpacity>

            {/* Forward 15s */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                if (soundRef.current) {
                  const newPos = Math.min(durationMs, positionMs + 15000);
                  soundRef.current.setPositionAsync(newPos);
                }
              }}
            >
              <Ionicons name="play-forward" size={24} color="#64748b" />
              <Text style={styles.skipLabel}>15s</Text>
            </TouchableOpacity>
          </View>

          {/* Complete button */}
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  animationContainer: { marginBottom: 40 },
  coverImage: {
    width: width * 0.7,
    height: width * 0.7, // Square aspect ratio
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  instructionsContainer: { alignItems: 'center', marginBottom: 40 },
  breathingText: { fontSize: 28, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  instructionsText: { fontSize: 16, color: '#64748b', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  progressContainer: { width: '100%', marginBottom: 32 },
  progressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  timeText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 24 },
  skipButton: { alignItems: 'center', gap: 2 },
  skipLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#10b981',
    elevation: 4,
  },
  completeButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
