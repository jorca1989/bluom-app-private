/**
 * MeditationPlayerScreen
 *
 * Fixes vs previous version:
 *  - SeekBar: uses pageX + measured track origin so the thumb follows your
 *    finger accurately from any tap position (Spotify-style).
 *  - SeekBar: durationMs / onSeekEnd live in refs so PanResponder never goes stale.
 *  - SeekBar: thumb grows on press (haptic-feel feedback).
 *  - Skip ±15 s: works for both guided sessions AND soundscapes.
 *  - Cover image: blurhash placeholder, explicit size, no layout reflow.
 */

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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS, AVPlaybackStatus } from 'expo-av';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import BreathingAnimation from '../components/BreathingAnimation';
import { Soundscape } from '../utils/soundscapes';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────
function SpinnerLoader({ size = 32, color = '#3b82f6' }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }], width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: Math.max(3, size * 0.12),
        borderColor: color + '40', borderTopColor: color,
      }} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Seek Bar  –  Spotify-quality, finger-accurate
// ─────────────────────────────────────────────────────────────
const TRACK_H = 5;
const THUMB_NORMAL = 16;
const THUMB_ACTIVE = 24;
const HIT_SLOP = { top: 22, bottom: 22, left: 8, right: 8 };

interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  onSeekStart: () => void;
  onSeekEnd: (ms: number) => void;
  formatTime: (ms: number) => string;
  enabled: boolean;
}

function SeekBar({ positionMs, durationMs, onSeekStart, onSeekEnd, formatTime, enabled }: SeekBarProps) {
  // Refs that PanResponder closures can always read without going stale
  const durationRef = useRef(durationMs);
  const onSeekEndRef = useRef(onSeekEnd);
  const onSeekStartRef = useRef(onSeekStart);
  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  useEffect(() => { onSeekEndRef.current = onSeekEnd; }, [onSeekEnd]);
  useEffect(() => { onSeekStartRef.current = onSeekStart; }, [onSeekStart]);

  // Track geometry – measured once via onLayout on the track view
  const trackXRef = useRef(0);   // absolute X of track left edge on screen
  const trackWRef = useRef(1);   // track width in px (never 0)
  const trackViewRef = useRef<View>(null);

  const dragging = useRef(false);
  const seekMs = useRef(0);
  const [localProgress, setLocalProgress] = useState<number | null>(null); // null = not dragging
  const thumbScale = useRef(new Animated.Value(1)).current;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const pageXToMs = (pageX: number) => {
    const ratio = clamp01((pageX - trackXRef.current) / trackWRef.current);
    return ratio * durationRef.current;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: () => enabled,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        dragging.current = true;
        onSeekStartRef.current();
        Animated.spring(thumbScale, { toValue: 1.5, useNativeDriver: true, speed: 40 }).start();
        const ms = pageXToMs(evt.nativeEvent.pageX);
        seekMs.current = ms;
        setLocalProgress(ms / (durationRef.current || 1));
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const ms = pageXToMs(evt.nativeEvent.pageX);
        seekMs.current = ms;
        setLocalProgress(ms / (durationRef.current || 1));
      },
      onPanResponderRelease: () => {
        dragging.current = false;
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
        setLocalProgress(null);
        onSeekEndRef.current(seekMs.current);
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        Animated.spring(thumbScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
        setLocalProgress(null);
        onSeekEndRef.current(seekMs.current);
      },
    })
  ).current;

  const displayProgress = localProgress !== null
    ? localProgress
    : durationMs > 0 ? clamp01(positionMs / durationMs) : 0;

  const displayMs = localProgress !== null ? seekMs.current : positionMs;

  return (
    <View style={sbStyles.container}>
      <View
        ref={trackViewRef}
        style={sbStyles.trackHitArea}
        hitSlop={HIT_SLOP}
        onLayout={() => {
          // Measure absolute position so pageX math is correct regardless of
          // scroll position or nested modals
          trackViewRef.current?.measure((_x, _y, w, _h, pageX) => {
            trackXRef.current = pageX;
            trackWRef.current = w || 1;
          });
        }}
        {...panResponder.panHandlers}
      >
        {/* Track */}
        <View style={sbStyles.track}>
          <View style={[sbStyles.trackFill, { width: `${displayProgress * 100}%` }]} />
        </View>

        {/* Thumb */}
        {enabled && (
          <Animated.View
            style={[
              sbStyles.thumb,
              {
                left: `${displayProgress * 100}%`,
                transform: [
                  { translateX: -THUMB_NORMAL / 2 },
                  { scale: thumbScale },
                ],
              },
            ]}
          />
        )}
      </View>

      {/* Times */}
      <View style={sbStyles.timeRow}>
        <Text style={sbStyles.time}>{formatTime(displayMs)}</Text>
        <Text style={sbStyles.time}>{formatTime(durationMs)}</Text>
      </View>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  container: { width: '100%', marginBottom: 28 },
  trackHitArea: { height: 44, justifyContent: 'center' },
  track: {
    height: TRACK_H,
    backgroundColor: '#e2e8f0',
    borderRadius: TRACK_H / 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_NORMAL,
    height: THUMB_NORMAL,
    borderRadius: THUMB_NORMAL / 2,
    backgroundColor: '#3b82f6',
    top: (44 - THUMB_NORMAL) / 2,
    // Shadow
    elevation: 4,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 6,
  },
  time: { fontSize: 13, color: '#64748b', fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface MeditationPlayerProps {
  visible: boolean;
  onClose: () => void;
  soundscape?: Soundscape | null;
  audioUrl?: string;
  sessionTitle?: string;
  coverImage?: string;
  duration?: number; // minutes hint
  logId?: Id<'meditationLogs'> | null;
}

type LoadState = 'idle' | 'loading' | 'buffering' | 'ready';

// ─────────────────────────────────────────────────────────────
// Player
// ─────────────────────────────────────────────────────────────
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
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [isSeeking, setIsSeeking] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  const soundRef = useRef<Audio.Sound | null>(null);
  const loadIdRef = useRef(0);
  const isClosingRef = useRef(false);
  const positionMsRef = useRef(0);
  const isSeekingRef = useRef(false);
  const durationMsRef = useRef(durationMs);

  // Keep durationRef in sync (needed by skipBy without stale closure)
  useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);

  const completeSession = useMutation(api.meditation.completeSession);

  // ── Keep screen awake ────────────────────────────────────────
  useEffect(() => {
    if (visible) activateKeepAwake(); else deactivateKeepAwake();
    return () => { deactivateKeepAwake(); };
  }, [visible]);

  // ── Audio session mode ───────────────────────────────────────
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

  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  // ── Status callback ──────────────────────────────────────────
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setLoadState(status.isBuffering ? 'buffering' : 'ready');

    if (!isSeekingRef.current && (status.positionMillis > 0 || !status.isPlaying)) {
      setPositionMs(status.positionMillis);
      positionMsRef.current = status.positionMillis;
    }
    if (status.durationMillis && status.durationMillis > 0) {
      setDurationMs(status.durationMillis);
      durationMsRef.current = status.durationMillis;
    }
    if (status.didJustFinish && !status.isLooping) {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    loadIdRef.current += 1;
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try { await sound.stopAsync(); } catch { }
      try { await sound.unloadAsync(); } catch { }
    }
    setIsPlaying(false);
    setPositionMs(0);
    positionMsRef.current = 0;
    setLoadState('idle');
    setIsSeeking(false);
    isSeekingRef.current = false;
  }, []);

  // ── Load ─────────────────────────────────────────────────────
  const loadSound = useCallback(async (shouldAutoPlay: boolean) => {
    const source = audioUrl ? { uri: audioUrl } : soundscape?.file;
    if (!source) return;

    const thisId = ++loadIdRef.current;
    setLoadState('loading');

    const prev = soundRef.current;
    soundRef.current = null;
    if (prev) {
      try { await prev.stopAsync(); } catch { }
      try { await prev.unloadAsync(); } catch { }
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: shouldAutoPlay,
          isLooping: !audioUrl,
          volume: 0.8,
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate
      );

      if (thisId !== loadIdRef.current) {
        try { await sound.unloadAsync(); } catch { }
        return;
      }
      soundRef.current = sound;
    } catch (err) {
      if (thisId !== loadIdRef.current) return;
      console.error('[MeditationPlayer] createAsync failed:', err);
      setLoadState('idle');
    }
  }, [audioUrl, soundscape, onPlaybackStatusUpdate]);

  // ── Mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    isClosingRef.current = false;
    loadSound(false);
    return () => { cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, audioUrl, soundscape]);

  // ── Android back ─────────────────────────────────────────────
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handleClose(); return true; });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Controls ─────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (loadState === 'loading') return;
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (!status.isPlaying) await soundRef.current.playAsync();
          return;
        }
      } catch { /* fall through */ }
    }
    await loadSound(true);
  }, [loadState, loadSound]);

  const handlePause = useCallback(async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.pauseAsync(); } catch { }
  }, []);

  const handleSeek = useCallback(async (valueMs: number) => {
    setPositionMs(valueMs);
    positionMsRef.current = valueMs;
    if (soundRef.current) {
      try { await soundRef.current.setPositionAsync(valueMs); } catch { }
    }
    setIsSeeking(false);
    isSeekingRef.current = false;
  }, []);

  /**
   * skipBy – works for both guided sessions (finite durationMs) and
   * looping soundscapes (durationMs may be 0; we just seek within what
   * the engine has buffered, or ignore gracefully).
   */
  const skipBy = useCallback(async (deltaMs: number) => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      const dur = status.durationMillis ?? durationMsRef.current;
      const currentPos = status.positionMillis ?? positionMsRef.current;
      const newPos = dur > 0
        ? Math.max(0, Math.min(dur, currentPos + deltaMs))
        : Math.max(0, currentPos + deltaMs);
      setPositionMs(newPos);
      positionMsRef.current = newPos;
      await soundRef.current.setPositionAsync(newPos);
    } catch (e) {
      console.warn('[MeditationPlayer] skipBy:', e);
    }
  }, []);

  const handleComplete = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const minutesCompleted = Math.floor(positionMsRef.current / 60000);
    await cleanup();
    if (logId && minutesCompleted > 0) {
      try { await completeSession({ logId, durationCompleted: minutesCompleted }); } catch { }
    }
    onClose();
  }, [cleanup, completeSession, logId, onClose]);

  const handleClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    await cleanup();
    onClose();
  }, [cleanup, onClose]);

  // ── Helpers ──────────────────────────────────────────────────
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const isLoading = loadState === 'loading' || loadState === 'buffering';

  const isTargetCategory = (title: string) => {
    const t = title.toLowerCase();
    return t.includes('sleep') || t.includes('anxiety') || t.includes('focus') || t.includes('breath');
  };
  const showAnimation =
    (sessionTitle && isTargetCategory(sessionTitle)) ||
    (soundscape && ['sleep', 'focus', 'anxiety'].includes(soundscape.category));

  // Seek bar: show for guided sessions (has real duration + no looping soundscape)
  const showSeekBar = durationMs > 0 && !soundscape;

  if (!visible) return null;

  const COVER_SIZE = width * 0.68;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sessionTitle || soundscape?.name || 'Meditation'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>

          {/* ── Visual area ── */}
          {showAnimation ? (
            <>
              <View style={styles.animationContainer}>
                <BreathingAnimation
                  size={isSmallScreen ? 180 : 220}
                  color={soundscape?.category === 'water' ? '#06b6d4' : '#3b82f6'}
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
                  {isPlaying
                    ? "Follow the circle's rhythm. Breathe naturally."
                    : 'Press Play to start your breathing session.'}
                </Text>
              </View>
            </>
          ) : (
            <View style={[styles.coverContainer, { width: COVER_SIZE, height: COVER_SIZE }]}>
              {coverImage ? (
                <Image
                  key={coverImage}
                  source={{ uri: coverImage }}
                  style={{ width: COVER_SIZE, height: COVER_SIZE, borderRadius: 20 }}
                  contentFit="cover"
                  // Shows a blurred placeholder instantly while the full image loads –
                  // no layout reflow, no blank flash.
                  placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
                  transition={{ duration: 300, effect: 'cross-dissolve' }}
                  cachePolicy="memory-disk"
                  recyclingKey={coverImage}
                />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={80} color="#cbd5e1" />
                  <Text style={styles.coverFallbackText}>Audio Session</Text>
                </>
              )}
            </View>
          )}

          {/* ── Seek bar (guided sessions only) ── */}
          {durationMs > 0 && (
            <SeekBar
              positionMs={positionMs}
              durationMs={durationMs}
              onSeekStart={() => { setIsSeeking(true); isSeekingRef.current = true; }}
              onSeekEnd={handleSeek}
              formatTime={formatTime}
              enabled={showSeekBar}
            />
          )}

          {/* ── Transport controls ── */}
          <View style={styles.controls}>

            {/* Rewind 15 s */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => skipBy(-15000)}
              activeOpacity={0.65}
            >
              <Ionicons name="play-back" size={26} color="#475569" />
              <Text style={styles.skipLabel}>15s</Text>
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              style={[styles.playButton, isLoading && styles.playButtonLoading]}
              onPress={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <SpinnerLoader size={28} color="#ffffff" />
                : <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={34}
                  color="#ffffff"
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              }
            </TouchableOpacity>

            {/* Forward 15 s */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => skipBy(15000)}
              activeOpacity={0.65}
            >
              <Ionicons name="play-forward" size={26} color="#475569" />
              <Text style={styles.skipLabel}>15s</Text>
            </TouchableOpacity>
          </View>

          {loadState === 'buffering' && (
            <Text style={styles.bufferingLabel}>Buffering…</Text>
          )}

          {/* ── Complete ── */}
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>Complete Session</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
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
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  animationContainer: { marginBottom: 36 },
  coverContainer: {
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    // Permanent shadow so there's no layout jump when image loads
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  coverFallbackText: { marginTop: 16, color: '#94a3b8', fontSize: 15 },
  instructionsContainer: { alignItems: 'center', marginBottom: 36 },
  breathingText: { fontSize: 28, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
  instructionsText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 20 },
  skipButton: { alignItems: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 8 },
  skipLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.3 },
  playButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  playButtonLoading: { backgroundColor: '#93c5fd' },
  bufferingLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: -12,
    letterSpacing: 0.2,
  },
  completeButton: {
    marginTop: 8,
    paddingHorizontal: 36,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: '#10b981',
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  completeButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
});
