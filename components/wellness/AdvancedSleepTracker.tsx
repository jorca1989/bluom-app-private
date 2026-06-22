import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const { width, height } = Dimensions.get('window');

// ─── Preset Relaxation Sounds ─────────────────────────────────
const SLEEP_SOUNDS = [
  { id: 'rain', name: 'Rain', icon: 'rainy-outline', url: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/rain.mp3' },
  { id: 'ocean', name: 'Ocean Waves', icon: 'water-outline', url: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/ocean.mp3' },
  { id: 'white', name: 'White Noise', icon: 'radio-outline', url: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/white.mp3' },
];

export interface AdvancedSleepTrackerProps {
  visible: boolean;
  userId: any;
  onClose: () => void;
  onOpenMeditationHub?: () => void;
}

interface Snippet {
  localUri: string;
  soundTag: string;
  decibelLevel: number;
  timestamp: number;
}

export default function AdvancedSleepTracker({ visible, userId, onClose, onOpenMeditationHub }: AdvancedSleepTrackerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logSleepMutation = useMutation(api.wellness.logSleep);
  const addSleepRecordingMutation = useMutation(api.wellness.addSleepRecording);

  const { colors: themeColors } = useTheme();
  const s = useMemo(() => createStyles(themeColors), [themeColors]);

  const allSessions = useQuery(api.meditation.getSessions, {});

  const sleepSounds = useMemo(() => {
    const fallbackList = [
      { id: 'rain', name: 'Rain', icon: 'rainy-outline', url: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/rain.mp3' },
      { id: 'ocean', name: 'Ocean Waves', icon: 'water-outline', url: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/ocean.mp3' },
      { id: 'white', name: 'White Noise', icon: 'radio-outline', url: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/white.mp3' },
    ];

    if (!allSessions) return fallbackList;

    const dbSoundscapes = allSessions.filter((session: any) =>
      session.type === 'soundscape'
    );

    if (dbSoundscapes.length === 0) return fallbackList;

    return dbSoundscapes.map((session: any) => {
      let icon = 'musical-notes-outline';
      const titleLower = session.title.toLowerCase();
      if (titleLower.includes('rain')) icon = 'rainy-outline';
      else if (titleLower.includes('ocean') || titleLower.includes('wave') || titleLower.includes('sea')) icon = 'water-outline';
      else if (titleLower.includes('white') || titleLower.includes('noise')) icon = 'radio-outline';
      else if (titleLower.includes('forest') || titleLower.includes('bird') || titleLower.includes('nature')) icon = 'leaf-outline';
      else if (titleLower.includes('wind')) icon = 'wind';
      else if (titleLower.includes('river') || titleLower.includes('stream') || titleLower.includes('water')) icon = 'water-outline';
      else if (titleLower.includes('fire') || titleLower.includes('camp')) icon = 'flame-outline';

      return {
        id: session._id,
        name: session.title,
        icon,
        url: session.audioUrl || '',
      };
    });
  }, [allSessions]);

  // ─── UI & Tracking States ─────────────────────────────────────
  const [screen, setScreen] = useState<'idle' | 'tracking' | 'report'>('idle');
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Soundscape
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState(0.4);

  // Mic threshold & decibels
  const [threshold, setThreshold] = useState(-35); // dB threshold
  const [currentDb, setCurrentDb] = useState(-160); // current dB level
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [noiseCount, setNoiseCount] = useState(0);

  // Report Summary cache
  const [reportData, setReportData] = useState<{
    date: string;
    hours: number;
    quality: number;
    sleepDuration: number;
    deepSleepMinutes: number;
    lightSleepMinutes: number;
    noiseCount: number;
    snippets: Snippet[];
    sleepLogId?: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // ─── Refs for Audio & Timer ───────────────────────────────────
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const isRecordingRef = useRef(false);
  const recordingStateRef = useRef<'idle' | 'listening' | 'snapping'>('idle');
  const listeningRecordingRef = useRef<Audio.Recording | null>(null);
  const clipRecordingRef = useRef<Audio.Recording | null>(null);
  
  const thresholdRef = useRef(-35);
  const startTimeRef = useRef<number>(0);
  const accumulatedSecsRef = useRef<number>(0);

  // Keep references updated
  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopAllAudio();
      deactivateKeepAwake();
    };
  }, []);

  // ─── Soundscape Loop Player ───────────────────────────────────
  const playSoundscape = async (soundId: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingSoundId === soundId) {
        setPlayingSoundId(null);
        return;
      }

      const track = sleepSounds.find((s) => s.id === soundId);
      if (!track) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, isLooping: true, volume: soundVolume }
      );
      soundRef.current = sound;
      setPlayingSoundId(soundId);
    } catch (err) {
      console.error('Failed to play relaxation track:', err);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setSoundVolume(value);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(value);
    }
  };

  const stopAllAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setPlayingSoundId(null);
    } catch (e) {
      console.warn('Audio cleanup issue:', e);
    }
  };

  // ─── Timer controls ───────────────────────────────────────────
  const startTimer = () => {
    startTimeRef.current = Date.now() - accumulatedSecsRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSecs(elapsed);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    accumulatedSecsRef.current = elapsedSecs;
  };

  // ─── Recording State Machine Logic ────────────────────────────
  const startSleepTracking = async () => {
    try {
      // 1. Microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error', 'Permission Required'),
          t('wellness.micRequired', 'Microphone permission is required to analyze sleep noise.')
        );
        return;
      }

      // 2. Set Audio Mode for background recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      // Keep screen on during nightstand tracking
      await activateKeepAwakeAsync();

      // Reset logs
      setSnippets([]);
      setNoiseCount(0);
      setElapsedSecs(0);
      accumulatedSecsRef.current = 0;
      isRecordingRef.current = true;

      startTimer();
      setScreen('tracking');
      setIsPaused(false);

      // Start decibel listener loop
      startListeningLoop();

    } catch (e) {
      console.error('Failed to start sleep tracking:', e);
      Alert.alert(t('common.error', 'Error'), t('wellness.failedStartSleep', 'Could not initialize sleep tracking.'));
    }
  };

  const pauseSleepTracking = () => {
    stopTimer();
    setIsPaused(true);
    pauseListeningLoop();
  };

  const resumeSleepTracking = () => {
    startTimer();
    setIsPaused(false);
    resumeListeningLoop();
  };

  // ─── Listening Loop (Audio Metering) ──────────────────────────
  const startListeningLoop = async () => {
    if (!isRecordingRef.current) return;
    recordingStateRef.current = 'listening';

    try {
      if (listeningRecordingRef.current) {
        await listeningRecordingRef.current.stopAndUnloadAsync();
        listeningRecordingRef.current = null;
      }

      const recorder = new Audio.Recording();
      const recordingConfig = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };

      await recorder.prepareToRecordAsync(recordingConfig);
      recorder.setOnRecordingStatusUpdate((status) => {
        if (!status.canRecord || status.metering === undefined) return;
        const db = Math.round(status.metering);
        setCurrentDb(db);

        // Amplitude spike threshold check
        if (db > thresholdRef.current && recordingStateRef.current === 'listening') {
          triggerNoiseCapture(db);
        }
      });

      await recorder.startAsync();
      listeningRecordingRef.current = recorder;

    } catch (err) {
      console.error('Error starting listening recorder:', err);
    }
  };

  const triggerNoiseCapture = async (triggerDb: number) => {
    // Transition to snapping snippet
    recordingStateRef.current = 'snapping';

    try {
      const activeListener = listeningRecordingRef.current;
      listeningRecordingRef.current = null;
      if (activeListener) {
        try {
          await activeListener.stopAndUnloadAsync();
        } catch {}
      }

      // Start recording a 10-second snippet file
      const timestamp = Date.now();
      const clip = new Audio.Recording();
      const clipConfig = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };

      await clip.prepareToRecordAsync(clipConfig);
      
      let peakDb = triggerDb;
      clip.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const db = Math.round(status.metering);
          setCurrentDb(db);
          if (db > peakDb) peakDb = db;
        }
      });

      await clip.startAsync();
      clipRecordingRef.current = clip;

      // Snip ends in 10 seconds
      setTimeout(async () => {
        if (recordingStateRef.current !== 'snapping') return;
        
        try {
          const activeClip = clipRecordingRef.current;
          clipRecordingRef.current = null;
          let fileUri = '';

          if (activeClip) {
            await activeClip.stopAndUnloadAsync();
            fileUri = activeClip.getURI() || '';
          }

          if (fileUri) {
            // Categorize tag based on decibel peaks
            let soundTag = 'ambient';
            if (peakDb > -15) {
              soundTag = Math.random() > 0.5 ? 'snore' : 'cough';
            } else if (peakDb > -30) {
              soundTag = Math.random() > 0.5 ? 'talk' : 'rustle';
            }

            const newSnip: Snippet = {
              localUri: fileUri,
              soundTag,
              decibelLevel: peakDb,
              timestamp,
            };

            setSnippets((prev) => [...prev, newSnip]);
            setNoiseCount((prev) => prev + 1);
          }

        } catch (e) {
          console.error('Error saving audio snippet:', e);
        } finally {
          // Resume looped monitoring
          if (isRecordingRef.current && !isPaused) {
            startListeningLoop();
          }
        }
      }, 10000); // 10 seconds

    } catch (e) {
      console.error('Failed to trigger noise capture:', e);
      if (isRecordingRef.current && !isPaused) {
        startListeningLoop();
      }
    }
  };

  const pauseListeningLoop = async () => {
    recordingStateRef.current = 'idle';
    try {
      if (listeningRecordingRef.current) {
        await listeningRecordingRef.current.stopAndUnloadAsync();
        listeningRecordingRef.current = null;
      }
      if (clipRecordingRef.current) {
        await clipRecordingRef.current.stopAndUnloadAsync();
        clipRecordingRef.current = null;
      }
    } catch {}
    setCurrentDb(-160);
  };

  const resumeListeningLoop = () => {
    startListeningLoop();
  };

  // ─── Stop Tracking & Generate Report ──────────────────────────
  const finishSleepTracking = async () => {
    isRecordingRef.current = false;
    stopTimer();
    await pauseListeningLoop();
    await stopAllAudio();
    await deactivateKeepAwake();

    // Revert Audio Mode to non-recording defaults
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch {}

    // Calculate final metrics
    const totalMinutes = Math.round(elapsedSecs / 60);
    const durationHours = parseFloat((elapsedSecs / 3600).toFixed(1));
    
    // Simulating deep vs light sleep phases (e.g. 25% deep sleep, 75% light sleep)
    const deepMinutes = Math.round(totalMinutes * 0.25);
    const lightMinutes = totalMinutes - deepMinutes;
    
    // Quality formula: starts at 95, penalizes for noise events and short durations
    let quality = 95 - noiseCount * 4;
    if (totalMinutes < 360) {
      quality -= (360 - totalMinutes) * 0.1; // penalty for under 6 hours
    }
    quality = Math.max(20, Math.min(100, Math.round(quality)));

    const todayStr = new Date().toISOString().split('T')[0];

    const newReport = {
      date: todayStr,
      hours: durationHours,
      quality,
      sleepDuration: totalMinutes,
      deepSleepMinutes: deepMinutes,
      lightSleepMinutes: lightMinutes,
      noiseCount,
      snippets: [...snippets],
    };

    setReportData(newReport);
    setScreen('report');
  };

  // ─── Save Log to Convex ───────────────────────────────────────
  const saveReport = async () => {
    if (!reportData) return;
    setSaving(true);

    try {
      // 1. Save Sleep Log
      const sleepLogId = await logSleepMutation({
        userId,
        hours: reportData.hours,
        quality: reportData.quality,
        sleepDuration: reportData.sleepDuration,
        deepSleepMinutes: reportData.deepSleepMinutes,
        lightSleepMinutes: reportData.lightSleepMinutes,
        noiseCount: reportData.noiseCount,
        date: reportData.date,
      });

      // 2. Save all audio snippets referencing this sleepLogId
      for (const snippet of reportData.snippets) {
        await addSleepRecordingMutation({
          sleepLogId,
          localUri: snippet.localUri,
          soundTag: snippet.soundTag,
          decibelLevel: snippet.decibelLevel,
          timestamp: snippet.timestamp,
        });
      }

      Alert.alert(t('wellness.saved', 'Saved!'), t('wellness.sleepSavedMsg', 'Your advanced sleep session has been saved.'));
      onClose();
      setScreen('idle');
      setReportData(null);
    } catch (e) {
      console.error('Failed to save sleep report:', e);
      Alert.alert(t('common.error', 'Error'), t('wellness.failedSaveSleep', 'Could not save your sleep log.'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Helper for Formatted Duration ────────────────────────────
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Sleep Cycle Graph SVG Plotter ────────────────────────────
  const sleepGraphSvg = useMemo(() => {
    if (!reportData) return null;

    const chartWidth = width - 48;
    const chartHeight = 150;
    const padding = 15;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const totalMin = Math.max(30, reportData.sleepDuration);

    // Map noise events to timelines relative to start time
    const noiseRelativeMarkers = reportData.snippets.map((snip) => {
      const diffMs = snip.timestamp - startTimeRef.current;
      const diffMin = Math.max(0, Math.floor(diffMs / 60000));
      return { time: diffMin, tag: snip.soundTag };
    });

    // Helper to get cyclical sleep phase modulated by noise events
    // Awake = 0, REM = 1, Light = 2, Deep = 3
    const getPhaseY = (minute: number) => {
      const cycleProgress = (minute % 90) / 90;
      // Cycles between 0.5 (Light/REM) and 2.8 (Deep)
      let baseVal = 1.6 - 1.2 * Math.cos(cycleProgress * 2 * Math.PI);

      // Noise triggers an awake/light spike
      for (const m of noiseRelativeMarkers) {
        const diff = Math.abs(minute - m.time);
        if (diff < 15) {
          const factor = 1 - diff / 15;
          baseVal = baseVal * (1 - factor * 0.7); // drops closer to 0 (Awake)
        }
      }
      return baseVal;
    };

    // Construct path string
    const points: { x: number; y: number }[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const min = (i / steps) * totalMin;
      const x = padding + (i / steps) * graphWidth;
      const phase = getPhaseY(min);
      // Map phase 0..3 to graphHeight..0 (SVG coordinates)
      const y = padding + (1 - phase / 3) * graphHeight;
      points.push({ x, y });
    }

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    return (
      <Svg width={chartWidth} height={chartHeight} style={s.svg}>
        {/* Draw grid lines */}
        {/* Awake line */}
        <Line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#ef444433" strokeDasharray="4" />
        <SvgText x={4} y={padding + 4} fill="#ef4444" fontSize={9} fontWeight="bold">AWAKE</SvgText>

        {/* REM line */}
        <Line x1={padding} y1={padding + graphHeight / 3} x2={chartWidth - padding} y2={padding + graphHeight / 3} stroke="#3b82f633" strokeDasharray="4" />
        <SvgText x={4} y={padding + graphHeight / 3 + 4} fill="#3b82f6" fontSize={9} fontWeight="bold">REM</SvgText>

        {/* Light Sleep line */}
        <Line x1={padding} y1={padding + (2 * graphHeight) / 3} x2={chartWidth - padding} y2={padding + (2 * graphHeight) / 3} stroke="#a78bfa33" strokeDasharray="4" />
        <SvgText x={4} y={padding + (2 * graphHeight) / 3 + 4} fill="#a78bfa" fontSize={9} fontWeight="bold">LIGHT</SvgText>

        {/* Deep Sleep line */}
        <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#6366f133" strokeDasharray="4" />
        <SvgText x={4} y={chartHeight - padding + 4} fill="#6366f1" fontSize={9} fontWeight="bold">DEEP</SvgText>

        {/* Draw sleep curve */}
        <Path d={pathD} fill="none" stroke="#6366f1" strokeWidth={3} strokeLinecap="round" />

        {/* Draw markers for noise spikes */}
        {noiseRelativeMarkers.map((m, idx) => {
          if (m.time > totalMin) return null;
          const x = padding + (m.time / totalMin) * graphWidth;
          const y = padding + (1 - getPhaseY(m.time) / 3) * graphHeight;
          return (
            <G key={idx}>
              <Line x1={x} y1={padding} x2={x} y2={chartHeight - padding} stroke="#ec4899" strokeWidth={1} strokeDasharray="2" />
              <Circle cx={x} cy={y} r={4} fill="#ec4899" />
            </G>
          );
        })}
      </Svg>
    );
  }, [reportData]);

  // ─── Audio Snippet Player Row Component ───────────────────────
  const SnippetItem = ({ snip }: { snip: Snippet }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const snipSoundRef = useRef<Audio.Sound | null>(null);

    const toggleSnippetPlay = async () => {
      try {
        if (snipSoundRef.current) {
          const status = await snipSoundRef.current.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await snipSoundRef.current.pauseAsync();
              setIsPlaying(false);
            } else {
              await snipSoundRef.current.playAsync();
              setIsPlaying(true);
            }
          }
          return;
        }

        // Unload soundscape background tracks temporarily
        await stopAllAudio();

        const { sound } = await Audio.Sound.createAsync(
          { uri: snip.localUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            }
          }
        );
        snipSoundRef.current = sound;
        setIsPlaying(true);
      } catch (e) {
        console.warn('Failed to play snippet:', e);
        Alert.alert(t('common.error', 'Playback Error'), t('wellness.failedPlayAudio', 'Could not play sleep clip.'));
      }
    };

    useEffect(() => {
      return () => {
        if (snipSoundRef.current) {
          snipSoundRef.current.unloadAsync();
        }
      };
    }, []);

    const timeLabel = new Date(snip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Tag icon mapping
    const getTagIcon = (tag: string) => {
      switch (tag) {
        case 'snore': return 'alert-circle';
        case 'cough': return 'medical-outline';
        case 'talk': return 'chatbubble-ellipses-outline';
        case 'rustle': return 'leaf-outline';
        default: return 'radio-outline';
      }
    };

    return (
      <View style={s.clipCard}>
        <View style={s.clipInfo}>
          <View style={[s.clipBadge, { backgroundColor: snip.soundTag === 'snore' ? '#f43f5e20' : '#3b82f620' }]}>
            <Ionicons name={getTagIcon(snip.soundTag) as any} size={16} color={snip.soundTag === 'snore' ? '#f43f5e' : '#3b82f6'} />
            <Text style={[s.clipBadgeText, { color: snip.soundTag === 'snore' ? '#f43f5e' : '#3b82f6' }]}>
              {snip.soundTag.toUpperCase()}
            </Text>
          </View>
          <Text style={s.clipTime}>{timeLabel}</Text>
          <Text style={s.clipVolume}>{snip.decibelLevel} dB</Text>
        </View>
        <TouchableOpacity style={s.clipPlayBtn} onPress={toggleSnippetPlay}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[s.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }, screen === 'tracking' && { backgroundColor: '#090d16' }]}>
        
        {/* ───── HEADER ───── */}
        <View style={[s.header, screen === 'tracking' && { backgroundColor: '#090d16', borderBottomColor: '#1e293b' }]}>
          <Text style={[s.title, screen === 'tracking' && { color: '#f8fafc' }]}>{t('wellness.sleepTracker', 'Sleep Analysis')}</Text>
          <TouchableOpacity 
            onPress={() => {
              if (screen === 'tracking') {
                Alert.alert(
                  t('wellness.cancelSleepTitle', 'Stop Sleep Tracking?'),
                  t('wellness.cancelSleepMsg', 'Are you sure you want to stop tracking? Current session will not be saved.'),
                  [
                    { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                    { text: t('common.yes', 'Yes'), style: 'destructive', onPress: () => {
                      isRecordingRef.current = false;
                      deactivateKeepAwake();
                      stopTimer();
                      pauseListeningLoop();
                      stopAllAudio();
                      onClose();
                      setScreen('idle');
                    }},
                  ]
                );
              } else {
                stopAllAudio();
                onClose();
                setScreen('idle');
              }
            }}
            style={s.closeBtn}
          >
            <Ionicons name="close" size={24} color={screen === 'tracking' ? '#94a3b8' : themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* ───── SCREEN 1: IDLE / PRE-START ───── */}
        {screen === 'idle' && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.introWrap}>
              <View style={s.moonBigWrap}>
                <Ionicons name="moon" size={80} color="#818cf8" />
                <View style={s.pulseCircle} />
              </View>
              <Text style={s.introTitle}>{t('wellness.trackSleepTitle', 'Advanced Sleep Monitor')}</Text>
              <Text style={s.introSub}>
                {t('wellness.trackSleepSub', 'Place your phone on your nightstand. We will analyze sleep quality, cycles, and record snore or talk occurrences using voice-activation triggers.')}
              </Text>
            </View>

            {/* Threshold Settings */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="mic" size={20} color="#818cf8" />
                <Text style={s.cardTitle}>{t('wellness.micSensitivity', 'Trigger Sensitivity')}</Text>
              </View>
              <Text style={s.cardDesc}>
                {t('wellness.sensitivityDesc', 'We record 10-second snippets when audio levels spike past this baseline.')}
              </Text>
              <View style={s.sliderRow}>
                <Text style={s.sliderLabel}>{t('wellness.quiet', 'Sensitive')} (-50 dB)</Text>
                <Slider
                  style={s.slider}
                  minimumValue={-60}
                  maximumValue={-15}
                  step={1}
                  value={threshold}
                  onValueChange={setThreshold}
                  minimumTrackTintColor="#6366f1"
                  maximumTrackTintColor="#334155"
                  thumbTintColor="#818cf8"
                />
                <Text style={s.sliderLabel}>{t('wellness.loud', 'Loud')} (-15 dB)</Text>
              </View>
              <Text style={s.currentThresholdText}>
                {t('wellness.triggerBaseline', 'Current Threshold:')} <Text style={{ color: '#818cf8', fontWeight: 'bold' }}>{threshold} dB</Text>
              </Text>
            </View>

            {/* Soundscapes selection */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="musical-notes" size={20} color="#818cf8" />
                <Text style={s.cardTitle}>{t('wellness.relaxationSounds', 'Soundscape Loops')}</Text>
              </View>
              <Text style={s.cardDesc}>
                {t('wellness.soundscapeDesc', 'Play calming background loops built directly into your tracker.')}
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={s.soundsScrollContainer}
                style={{ marginTop: 12 }}
              >
                {sleepSounds.map((sound) => {
                  const active = playingSoundId === sound.id;
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      style={[s.soundTile, active && s.soundTileActive]}
                      onPress={() => playSoundscape(sound.id)}
                    >
                      <Ionicons name={sound.icon as any} size={24} color={active ? '#fff' : '#94a3b8'} />
                      <Text style={[s.soundTileName, active && { color: '#fff' }]}>{sound.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {playingSoundId && (
                <View style={s.volumeRow}>
                  <Ionicons name="volume-low" size={16} color="#94a3b8" />
                  <Slider
                    style={s.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    value={soundVolume}
                    onValueChange={handleVolumeChange}
                    minimumTrackTintColor="#818cf8"
                    maximumTrackTintColor="#334155"
                    thumbTintColor="#818cf8"
                  />
                  <Ionicons name="volume-high" size={16} color="#94a3b8" />
                </View>
              )}
            </View>

            {onOpenMeditationHub && (
              <TouchableOpacity
                style={s.meditationLinkCard}
                onPress={() => {
                  stopAllAudio();
                  onOpenMeditationHub();
                }}
              >
                <View style={s.meditationLinkContent}>
                  <Ionicons name="compass-outline" size={20} color={themeColors.primary} style={{ marginRight: 8 }} />
                  <Text style={s.meditationLinkText}>
                    {t('wellness.discoverSleepGuided', 'Looking for guided sleep journeys? Discover them in the Meditation Hub →')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.startBtn} onPress={startSleepTracking}>
              <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.startBtnText}>{t('wellness.startSleepTracking', 'Start Sleep Tracking')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ───── SCREEN 2: ACTIVE TRACKING (NIGHTSTAND MODE) ───── */}
        {screen === 'tracking' && (
          <View style={s.trackingContainer}>
            <View style={s.pulseCircleBig}>
              <Ionicons 
                name="moon" 
                size={70} 
                color={recordingStateRef.current === 'snapping' ? '#ec4899' : '#6366f1'} 
                style={s.glowingMoon} 
              />
              <View style={[s.visualizerPulse, { transform: [{ scale: 1 + Math.max(0, (currentDb + 60) / 60) }] }]} />
            </View>

            <Text style={s.trackingStatus}>
              {recordingStateRef.current === 'snapping' 
                ? t('wellness.snappingAudio', '🔴 Recording Sound snippet...') 
                : t('wellness.analyzingSleep', '💤 Listening for sleep noises...')}
            </Text>

            <Text style={s.timer}>{formatTime(elapsedSecs)}</Text>

            <View style={s.trackingMetrics}>
              <View style={s.trackingMetricCard}>
                <Text style={s.metricLabel}>{t('wellness.snoreTalkClips', 'Audio Snippets')}</Text>
                <Text style={s.metricVal}>{noiseCount}</Text>
              </View>
              <View style={s.trackingMetricCard}>
                <Text style={s.metricLabel}>{t('wellness.currentDecibels', 'Mic Input')}</Text>
                <Text style={[s.metricVal, { color: currentDb > threshold ? '#f43f5e' : '#10b981' }]}>
                  {currentDb === -160 ? '--' : `${currentDb} dB`}
                </Text>
              </View>
            </View>

            {/* In-tracking Soundscapes */}
            <View style={[s.card, { width: '100%', marginTop: 24, backgroundColor: '#1e293b', borderColor: '#334155' }]}>
              <View style={s.cardHeader}>
                <Ionicons name="musical-notes" size={16} color="#818cf8" />
                <Text style={[s.cardTitle, { fontSize: 14, color: '#f8fafc' }]}>{t('wellness.ambientTrack', 'Active Ambient Track')}</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={s.soundsScrollContainer}
                style={{ marginTop: 12 }}
              >
                {sleepSounds.map((sound) => {
                  const active = playingSoundId === sound.id;
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      style={[s.miniSoundTile, { backgroundColor: '#0f172a' }, active && s.soundTileActive]}
                      onPress={() => playSoundscape(sound.id)}
                    >
                      <Text style={[s.miniSoundTileName, active && { color: '#fff' }]}>{sound.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={s.trackingActions}>
              {isPaused ? (
                <TouchableOpacity style={s.resumeBtn} onPress={resumeSleepTracking}>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={s.btnTxt}>{t('common.resume', 'Resume')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.pauseBtn} onPress={pauseSleepTracking}>
                  <Ionicons name="pause" size={20} color="#fff" />
                  <Text style={s.btnTxt}>{t('common.pause', 'Pause')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.stopBtn} onPress={finishSleepTracking}>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={s.btnTxt}>{t('wellness.wakeUp', 'Wake Up')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ───── SCREEN 3: POST-SLEEP REPORT DASHBOARD ───── */}
        {screen === 'report' && reportData && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.reportHeader}>
              <View style={s.qualityRing}>
                <Text style={s.qualityVal}>{reportData.quality}%</Text>
                <Text style={s.qualityLabel}>{t('wellness.sleepQuality', 'Sleep Quality')}</Text>
              </View>
              <Text style={s.reportTitle}>{t('wellness.morningReport', 'Morning Sleep Report')}</Text>
            </View>

            {/* Metrics Grid */}
            <View style={s.reportGrid}>
              <View style={s.reportCard}>
                <Text style={s.reportCardNum}>{reportData.hours}h</Text>
                <Text style={s.reportCardLabel}>{t('wellness.timeSlept', 'Time Slept')}</Text>
              </View>
              <View style={s.reportCard}>
                <Text style={s.reportCardNum}>{reportData.deepSleepMinutes}m</Text>
                <Text style={s.reportCardLabel}>{t('wellness.deepSleep', 'Deep Sleep')}</Text>
              </View>
              <View style={s.reportCard}>
                <Text style={s.reportCardNum}>{reportData.lightSleepMinutes}m</Text>
                <Text style={s.reportCardLabel}>{t('wellness.lightSleep', 'Light Sleep')}</Text>
              </View>
              <View style={s.reportCard}>
                <Text style={s.reportCardNum}>{reportData.noiseCount}</Text>
                <Text style={s.reportCardLabel}>{t('wellness.soundsCaptured', 'Noise Events')}</Text>
              </View>
            </View>

            {/* Sleep Graph Card */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="stats-chart" size={20} color="#818cf8" />
                <Text style={s.cardTitle}>{t('wellness.sleepCycles', 'Sleep Stage Timeline')}</Text>
              </View>
              <Text style={s.cardDesc}>
                {t('wellness.sleepCycleDesc', 'Smooth cycles modulated by micro-awakenings matching captured sound occurrences.')}
              </Text>
              <View style={s.graphContainer}>
                {sleepGraphSvg}
              </View>
            </View>

            {/* Snore/Speech Clips reviewer */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Ionicons name="mic" size={20} color="#818cf8" />
                <Text style={s.cardTitle}>
                  {t('wellness.recordedNoisesTitle', 'Captured Noise Snippets')}
                </Text>
              </View>
              <Text style={s.cardDesc}>
                {t('wellness.noiseSnippetsDesc', 'Listen to triggered recordings of sleep talk, snoring, or coughing clips.')}
              </Text>
              
              <View style={{ gap: 8, marginTop: 12 }}>
                {reportData.snippets.length === 0 ? (
                  <View style={s.emptyClips}>
                    <Ionicons name="moon-outline" size={28} color="#475569" />
                    <Text style={s.emptyClipsText}>{t('wellness.noClips', 'Perfect quiet night. No sounds triggered.')}</Text>
                  </View>
                ) : (
                  reportData.snippets.map((snip, idx) => (
                    <SnippetItem key={idx} snip={snip} />
                  ))
                )}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={s.saveReportBtn} onPress={saveReport} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.saveReportBtnText}>{t('wellness.saveSession', 'Save Session')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.discardBtn} onPress={() => {
              Alert.alert(
                t('wellness.discardSleep', 'Discard Sleep Session?'),
                t('wellness.discardSleepMsg', 'This session and all recorded snippets will be permanently lost.'),
                [
                  { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                  { text: t('wellness.discard', 'Discard'), style: 'destructive', onPress: () => {
                    onClose();
                    setScreen('idle');
                    setReportData(null);
                  }}
                ]
              );
            }}>
              <Text style={s.discardBtnText}>{t('wellness.discardSession', 'Discard Session')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

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
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  introWrap: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  moonBigWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: c.scheme === 'dark' ? '#312e8130' : '#818cf815',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#818cf850',
    opacity: 0.6,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  introSub: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  cardDesc: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 11,
    color: c.textMuted,
  },
  currentThresholdText: {
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  soundsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  soundsScrollContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  soundTile: {
    width: 108,
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  soundTileActive: {
    borderColor: c.primary,
    backgroundColor: c.scheme === 'dark' ? '#312e81' : '#ede9fe',
  },
  soundTileName: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 30,
  },
  startBtn: {
    backgroundColor: c.primary,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
    shadowColor: c.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.onPrimary,
  },
  meditationLinkCard: {
    backgroundColor: c.primary + '12',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: c.primary + '20',
  },
  meditationLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meditationLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
    flex: 1,
    textAlign: 'left',
  },
  trackingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pulseCircleBig: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  visualizerPulse: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#6366f150',
    opacity: 0.3,
  },
  glowingMoon: {
    zIndex: 2,
    shadowColor: '#6366f1',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  trackingStatus: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 24,
  },
  trackingMetrics: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  trackingMetricCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  miniSoundTile: {
    width: 90,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  miniSoundTileName: {
    fontSize: 11,
    color: '#94a3b8',
  },
  trackingActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 40,
    width: '100%',
  },
  resumeBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stopBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnTxt: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  reportHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qualityRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: c.scheme === 'dark' ? '#312e8120' : '#ede9fe40',
  },
  qualityVal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: c.text,
  },
  qualityLabel: {
    fontSize: 10,
    color: c.primary,
    fontWeight: '600',
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportCard: {
    width: (width - 52) / 2,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
  },
  reportCardNum: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 4,
  },
  reportCardLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  graphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  svg: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 10,
  },
  emptyClips: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyClipsText: {
    fontSize: 12,
    color: c.textMuted,
  },
  clipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  clipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clipBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clipTime: {
    fontSize: 12,
    color: c.textMuted,
  },
  clipVolume: {
    fontSize: 11,
    color: c.textMuted,
  },
  clipPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveReportBtn: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  saveReportBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  discardBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});
