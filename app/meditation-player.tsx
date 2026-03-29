/**
 * MeditationPlayerScreen — v3
 *
 * Fixes vs v2:
 *  1. Landscape layout  — uses useWindowDimensions + flex layouts everywhere,
 *     side-by-side visual/controls in landscape, no clipped buttons.
 *  2. 10-minute stop bug — audio watchdog: every 30 s we re-affirm the audio
 *     mode and re-play if the sound was unintentionally paused by the OS.
 *     Also keeps screen awake more aggressively (no deactivate on re-render).
 *  3. MP4 / video support — detects videoUrl prop; renders expo-av <Video>
 *     inside the cover area with playback synced to the same controls.
 *  4. SeekBar stays accurate in any orientation.
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
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Audio,
  Video,
  ResizeMode,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  AVPlaybackStatus,
} from 'expo-av';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import BreathingAnimation from '../components/BreathingAnimation';
import { Soundscape } from '../utils/soundscapes';

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
// SeekBar
// ─────────────────────────────────────────────────────────────
const TRACK_H = 5;
const THUMB_NORMAL = 16;

interface SeekBarProps {
  positionMs: number;
  durationMs: number;
  onSeekStart: () => void;
  onSeekEnd: (ms: number) => void;
  formatTime: (ms: number) => string;
  enabled: boolean;
}

function SeekBar({ positionMs, durationMs, onSeekStart, onSeekEnd, formatTime, enabled }: SeekBarProps) {
  const durationRef = useRef(durationMs);
  const onSeekEndRef = useRef(onSeekEnd);
  const onSeekStartRef = useRef(onSeekStart);
  useEffect(() => { durationRef.current = durationMs; }, [durationMs]);
  useEffect(() => { onSeekEndRef.current = onSeekEnd; }, [onSeekEnd]);
  useEffect(() => { onSeekStartRef.current = onSeekStart; }, [onSeekStart]);

  const trackXRef = useRef(0);
  const trackWRef = useRef(1);
  const trackViewRef = useRef<View>(null);
  const dragging = useRef(false);
  const seekMs = useRef(0);
  const [localProgress, setLocalProgress] = useState<number | null>(null);
  const thumbScale = useRef(new Animated.Value(1)).current;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const pageXToMs = (pageX: number) => clamp01((pageX - trackXRef.current) / trackWRef.current) * durationRef.current;

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

  const displayProgress = localProgress !== null ? localProgress : durationMs > 0 ? clamp01(positionMs / durationMs) : 0;
  const displayMs = localProgress !== null ? seekMs.current : positionMs;

  return (
    <View style={sbStyles.container}>
      <View
        ref={trackViewRef}
        style={sbStyles.trackHitArea}
        onLayout={() => {
          trackViewRef.current?.measure((_x, _y, w, _h, pageX) => {
            trackXRef.current = pageX;
            trackWRef.current = w || 1;
          });
        }}
        {...panResponder.panHandlers}
      >
        <View style={sbStyles.track}>
          <View style={[sbStyles.trackFill, { width: `${displayProgress * 100}%` }]} />
        </View>
        {enabled && (
          <Animated.View
            style={[sbStyles.thumb, {
              left: `${displayProgress * 100}%`,
              transform: [{ translateX: -THUMB_NORMAL / 2 }, { scale: thumbScale }],
            }]}
          />
        )}
      </View>
      <View style={sbStyles.timeRow}>
        <Text style={sbStyles.time}>{formatTime(displayMs)}</Text>
        <Text style={sbStyles.time}>{formatTime(durationMs)}</Text>
      </View>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  container: { width: '100%', marginBottom: 20 },
  trackHitArea: { height: 44, justifyContent: 'center' },
  track: { height: TRACK_H, backgroundColor: '#e2e8f0', borderRadius: TRACK_H / 2, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: TRACK_H / 2 },
  thumb: {
    position: 'absolute', width: THUMB_NORMAL, height: THUMB_NORMAL,
    borderRadius: THUMB_NORMAL / 2, backgroundColor: '#3b82f6',
    top: (44 - THUMB_NORMAL) / 2,
    elevation: 4, shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 6 },
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
  videoUrl?: string;   // NEW – MP4 support
  sessionTitle?: string;
  coverImage?: string;
  duration?: number;   // minutes hint
  logId?: Id<'meditationLogs'> | null;
}

type LoadState = 'idle' | 'loading' | 'buffering' | 'ready';

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function MeditationPlayerScreen({
  visible, onClose, soundscape, audioUrl, videoUrl,
  sessionTitle, coverImage, duration, logId,
}: MeditationPlayerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(duration ? duration * 60_000 : 0);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [isSeeking, setIsSeeking] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video | null>(null);
  const loadIdRef = useRef(0);
  const isClosingRef = useRef(false);
  const positionMsRef = useRef(0);
  const isSeekingRef = useRef(false);
  const durationMsRef = useRef(durationMs);
  const isPlayingRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect video: R2/CDN .mp4, YouTube watch?v=, youtu.be short links, YouTube embed
  const isYouTubeUrl = (url: string) =>
    url.includes('youtube.com/watch') ||
    url.includes('youtu.be/') ||
    url.includes('youtube.com/embed/');
  const isVideoSession = !!(videoUrl && (
    videoUrl.includes('.mp4') ||
    videoUrl.includes('.webm') ||
    isYouTubeUrl(videoUrl)
  ));
  const isSoundscape = !!soundscape;

  useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const completeSession = useMutation(api.meditation.completeSession);

  // ── Keep screen awake – aggressive ──────────────────────────
  useEffect(() => {
    if (visible) {
      activateKeepAwake();
      // Re-activate every 5 minutes as a belt-and-suspenders measure
      const interval = setInterval(() => activateKeepAwake(), 5 * 60_000);
      return () => { clearInterval(interval); deactivateKeepAwake(); };
    }
  }, [visible]);

  // ── Audio session mode ───────────────────────────────────────
  const setAudioMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch(console.warn);
  }, []);

  useEffect(() => { if (visible) setAudioMode(); }, [visible, setAudioMode]);

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
    if (status.didJustFinish && !status.isLooping) handleComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Watchdog: fix the OS stopping audio after ~10 min ───────
  // The iOS/Android audio session can get interrupted silently.
  // Every 30 s we re-affirm the audio mode and re-play if paused
  // by the OS (not by the user).
  const startWatchdog = useCallback(() => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(async () => {
      // Re-assert background audio mode
      await setAudioMode();
      // If we believe it should be playing but it stopped, re-play
      if (isPlayingRef.current && soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && !status.isPlaying && !isSeekingRef.current) {
            await soundRef.current.playAsync();
          }
        } catch { /* ignore */ }
      }
    }, 30_000);
  }, [setAudioMode]);

  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    loadIdRef.current += 1;
    stopWatchdog();
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
  }, [stopWatchdog]);

  // ── Load audio ───────────────────────────────────────────────
  const loadSound = useCallback(async (shouldAutoPlay: boolean) => {
    if (isVideoSession) return; // video handled by Video component
    const source = audioUrl ? { uri: audioUrl } : soundscape?.file;
    if (!source) return;
    const thisId = ++loadIdRef.current;
    setLoadState('loading');
    const prev = soundRef.current;
    soundRef.current = null;
    if (prev) { try { await prev.stopAsync(); } catch { } try { await prev.unloadAsync(); } catch { } }
    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: shouldAutoPlay, isLooping: !audioUrl, volume: 0.8, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate
      );
      if (thisId !== loadIdRef.current) { try { await sound.unloadAsync(); } catch { } return; }
      soundRef.current = sound;
      if (shouldAutoPlay) startWatchdog();
    } catch (err) {
      if (thisId !== loadIdRef.current) return;
      console.error('[MeditationPlayer] createAsync failed:', err);
      setLoadState('idle');
    }
  }, [audioUrl, soundscape, onPlaybackStatusUpdate, isVideoSession, startWatchdog]);

  // ── Mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    isClosingRef.current = false;
    if (!isVideoSession) loadSound(false);
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
    // Video player
    if (isVideoSession && videoRef.current) {
      try { await videoRef.current.playAsync(); startWatchdog(); return; } catch { }
    }
    // Audio player
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync();
          startWatchdog();
          return;
        }
      } catch { }
    }
    await loadSound(true);
  }, [loadState, loadSound, isVideoSession, startWatchdog]);

  const handlePause = useCallback(async () => {
    stopWatchdog();
    if (isVideoSession && videoRef.current) { try { await videoRef.current.pauseAsync(); } catch { } return; }
    if (soundRef.current) { try { await soundRef.current.pauseAsync(); } catch { } }
  }, [isVideoSession, stopWatchdog]);

  const handleSeek = useCallback(async (valueMs: number) => {
    setPositionMs(valueMs);
    positionMsRef.current = valueMs;
    if (isVideoSession && videoRef.current) { try { await videoRef.current.setPositionAsync(valueMs); } catch { } }
    else if (soundRef.current) { try { await soundRef.current.setPositionAsync(valueMs); } catch { } }
    setIsSeeking(false);
    isSeekingRef.current = false;
  }, [isVideoSession]);

  const skipBy = useCallback(async (deltaMs: number) => {
    const ref = isVideoSession ? videoRef.current : soundRef.current;
    if (!ref) return;
    try {
      const status = await ref.getStatusAsync();
      if (!status.isLoaded) return;
      const dur = status.durationMillis ?? durationMsRef.current;
      const cur = status.positionMillis ?? positionMsRef.current;
      const newPos = dur > 0 ? Math.max(0, Math.min(dur, cur + deltaMs)) : Math.max(0, cur + deltaMs);
      setPositionMs(newPos);
      positionMsRef.current = newPos;
      await ref.setPositionAsync(newPos);
    } catch (e) { console.warn('[MeditationPlayer] skipBy:', e); }
  }, [isVideoSession]);

  const handleComplete = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const minutesCompleted = Math.floor(positionMsRef.current / 60_000);
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

  const isBreathCategory = (title?: string) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return t.includes('sleep') || t.includes('anxiety') || t.includes('focus') || t.includes('breath');
  };
  const showAnimation = (isBreathCategory(sessionTitle) || (soundscape && ['sleep', 'focus', 'anxiety'].includes(soundscape.category))) && !isVideoSession;
  const showSeekBar = durationMs > 0 && !isSoundscape;

  // ── Layout sizes ─────────────────────────────────────────────
  // Clamp cover/animation size to fit any orientation
  const availableVisualH = isLandscape ? height * 0.55 : width * 0.65;
  const coverSize = Math.min(availableVisualH, isLandscape ? width * 0.38 : width * 0.68);

  if (!visible) return null;

  // ── Visual area ──────────────────────────────────────────────
  const VisualArea = () => {
    if (isVideoSession && videoUrl) {
      // YouTube → render in a WebView with autoplay embed
      if (isYouTubeUrl(videoUrl)) {
        // Extract video ID from any YouTube URL format
        let videoId = '';
        const watchMatch = videoUrl.match(/[?&]v=([^&]+)/);
        const shortMatch = videoUrl.match(/youtu\.be\/([^?&]+)/);
        const embedMatch = videoUrl.match(/embed\/([^?&]+)/);
        videoId = (watchMatch?.[1] ?? shortMatch?.[1] ?? embedMatch?.[1] ?? '');
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&playsinline=1&rel=0&modestbranding=1`;
        return (
          <View style={[playerStyles.coverContainer, { width: coverSize, height: coverSize * 0.6 }]}>
            <WebView
              source={{ uri: embedUrl }}
              style={{ width: coverSize, height: coverSize * 0.6, borderRadius: 18 }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              onLoadStart={() => setLoadState('loading')}
              onLoad={() => setLoadState('ready')}
            />
          </View>
        );
      }
      // R2 / CDN MP4 → expo-av Video with full controls
      return (
        <View style={[playerStyles.coverContainer, { width: coverSize, height: coverSize }]}>
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={{ width: coverSize, height: coverSize, borderRadius: 18 }}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            onLoad={() => setLoadState('ready')}
            onLoadStart={() => setLoadState('loading')}
          />
        </View>
      );
    }
    if (showAnimation) {
      return (
        <View style={playerStyles.animationContainer}>
          <BreathingAnimation
            size={Math.min(coverSize, isLandscape ? 160 : 220)}
            color={soundscape?.category === 'water' ? '#06b6d4' : '#3b82f6'}
            onInhale={() => setBreathingPhase('inhale')}
            onExhale={() => setBreathingPhase('exhale')}
            isPlaying={isPlaying}
          />
          <Text style={playerStyles.breathingText}>
            {isPlaying ? (breathingPhase === 'inhale' ? 'Breathe In' : 'Breathe Out') : 'Paused'}
          </Text>
          {!isLandscape && (
            <Text style={playerStyles.instructionsText}>
              {isPlaying ? "Follow the circle's rhythm." : 'Press Play to start.'}
            </Text>
          )}
        </View>
      );
    }
    return (
      <View style={[playerStyles.coverContainer, { width: coverSize, height: coverSize }]}>
        {coverImage ? (
          <Image
            key={coverImage}
            source={{ uri: coverImage }}
            style={{ width: coverSize, height: coverSize, borderRadius: 18 }}
            contentFit="cover"
            placeholder={{ blurhash: 'LGFFaXYk^6#M@-5c,1J5@[or[Q6.' }}
            transition={{ duration: 300, effect: 'cross-dissolve' }}
            cachePolicy="memory-disk"
            recyclingKey={coverImage}
          />
        ) : (
          <>
            <Ionicons name="musical-notes" size={64} color="#cbd5e1" />
            <Text style={playerStyles.coverFallbackText}>Audio Session</Text>
          </>
        )}
      </View>
    );
  };

  // ── Controls area ────────────────────────────────────────────
  const ControlsArea = () => (
    <View style={[playerStyles.controlsWrap, isLandscape && { paddingHorizontal: 12 }]}>
      {showSeekBar && (
        <SeekBar
          positionMs={positionMs}
          durationMs={durationMs}
          onSeekStart={() => { setIsSeeking(true); isSeekingRef.current = true; }}
          onSeekEnd={handleSeek}
          formatTime={formatTime}
          enabled={showSeekBar}
        />
      )}
      <View style={playerStyles.controls}>
        <TouchableOpacity style={playerStyles.skipButton} onPress={() => skipBy(-15_000)} activeOpacity={0.65}>
          <Ionicons name="play-back" size={26} color="#475569" />
          <Text style={playerStyles.skipLabel}>15s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[playerStyles.playButton, isLoading && playerStyles.playButtonLoading]}
          onPress={isPlaying ? handlePause : handlePlay}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <SpinnerLoader size={28} color="#ffffff" />
            : <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color="#fff" style={!isPlaying ? { marginLeft: 4 } : undefined} />
          }
        </TouchableOpacity>
        <TouchableOpacity style={playerStyles.skipButton} onPress={() => skipBy(15_000)} activeOpacity={0.65}>
          <Ionicons name="play-forward" size={26} color="#475569" />
          <Text style={playerStyles.skipLabel}>15s</Text>
        </TouchableOpacity>
      </View>
      {loadState === 'buffering' && <Text style={playerStyles.bufferingLabel}>Buffering…</Text>}
      <TouchableOpacity style={playerStyles.completeButton} onPress={handleComplete}>
        <Text style={playerStyles.completeButtonText}>Complete Session</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={playerStyles.container} edges={['top', 'bottom', 'left', 'right']}>

        {/* Header */}
        <View style={playerStyles.header}>
          <TouchableOpacity style={playerStyles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={playerStyles.headerTitle} numberOfLines={1}>
            {sessionTitle || soundscape?.name || 'Meditation'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Body — flex row in landscape, column in portrait */}
        <ScrollView
          contentContainerStyle={[
            playerStyles.body,
            isLandscape
              ? { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 24, paddingVertical: 12 }
              : { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <VisualArea />
          <View style={[
            isLandscape ? { flex: 1, maxWidth: 360 } : { width: '100%', alignItems: 'center' },
          ]}>
            <ControlsArea />
          </View>
        </ScrollView>

      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const playerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  body: { flexGrow: 1 },

  // Visual
  animationContainer: { alignItems: 'center', marginBottom: 8 },
  breathingText: { fontSize: 24, fontWeight: '600', color: '#1e293b', marginTop: 16, marginBottom: 4 },
  instructionsText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
  coverContainer: {
    alignItems: 'center', justifyContent: 'center', borderRadius: 20,
    backgroundColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24,
    elevation: 6, overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  coverFallbackText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },

  // Controls
  controlsWrap: { width: '100%', alignItems: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 16 },
  skipButton: { alignItems: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 8 },
  skipLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.3 },
  playButton: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10,
  },
  playButtonLoading: { backgroundColor: '#93c5fd' },
  bufferingLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 8, marginTop: -4, letterSpacing: 0.2 },
  completeButton: {
    marginTop: 4, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 30,
    backgroundColor: '#10b981', elevation: 4,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8,
  },
  completeButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
});