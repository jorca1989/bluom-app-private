import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Vibration,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Circle, Rect, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Generate teeth layout in a mathematical horseshoe arch
const generateTeethLayout = () => {
  const upper: { id: string; cx: number; cy: number; label: string; xRot: number; yRot: number }[] = [];
  const lower: { id: string; cx: number; cy: number; label: string; xRot: number; yRot: number }[] = [];

  // Center coordinates for arches
  const centerX = 160;
  const upperCenterY = 120;
  const lowerCenterY = 220;

  // Radius values
  const rx = 110;
  const ry = 80;

  // 16 upper teeth (Teeth 1-16)
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI + (i / 15) * Math.PI;
    const cx = centerX + Math.cos(angle) * rx;
    const cy = upperCenterY + Math.sin(angle) * ry;
    upper.push({
      id: `Tooth ${i + 1}`,
      cx,
      cy,
      label: `${i + 1}`,
      xRot: cx,
      yRot: cy,
    });
  }

  // 16 lower teeth (Teeth 17-32)
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI + (i / 15) * Math.PI;
    const cx = centerX + Math.cos(angle) * rx;
    const cy = lowerCenterY - Math.sin(angle) * ry;
    lower.push({
      id: `Tooth ${32 - i}`,
      cx,
      cy,
      label: `${32 - i}`,
      xRot: cx,
      yRot: cy,
    });
  }

  return { upper, lower };
};

export default function DentalHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: c } = useTheme();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'routine' | 'analytics'>('routine');

  // Authentication & DB state
  const { user: clerkUser } = useUser();
  const user = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dentalToday = useQuery(
    api.dentalLogs.getDentalToday,
    user ? { userId: user._id, date: todayStr } : 'skip'
  );
  const dentalHistory = useQuery(
    api.dentalLogs.getDentalHistory,
    user ? { userId: user._id } : 'skip'
  );
  const logDentalMutation = useMutation(api.dentalLogs.logDental);

  // Layout geometry
  const teethData = useMemo(() => generateTeethLayout(), []);

  // Form State
  const [sensitiveTeeth, setSensitiveTeeth] = useState<string[]>([]);
  const [flossed, setFlossed] = useState(false);
  const [mouthwash, setMouthwash] = useState(false);
  const [tongueClean, setTongueClean] = useState(false);
  const [brushDuration, setBrushDuration] = useState(0);

  // Load existing today data
  useEffect(() => {
    if (dentalToday) {
      setSensitiveTeeth(dentalToday.sensitiveTeeth || []);
      setFlossed(dentalToday.flossed || false);
      setMouthwash(dentalToday.mouthwash || false);
      setTongueClean(dentalToday.tongueClean || false);
      setBrushDuration(dentalToday.brushDuration || 0);
    }
  }, [dentalToday]);

  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes countdown
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI Vision Scan state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'analyzing' | 'result'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);

  // Timer Countdown loop
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setTimerActive(false);
            const loggedDuration = Math.max(brushDuration, 120);
            setBrushDuration(loggedDuration);
            triggerSave(loggedDuration, flossed, mouthwash, tongueClean, sensitiveTeeth);
            if (Platform.OS !== 'web') {
              Vibration.vibrate([0, 200, 100, 200]);
            }
            Alert.alert(t('dental.finishedTitle', 'Brushing Complete!'), t('dental.finishedMsg', 'You completed your 2-minute brushing session! Logged successfully.'));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, flossed, mouthwash, tongueClean, sensitiveTeeth, brushDuration]);

  // Streak calculations
  const stats = useMemo(() => {
    if (!dentalHistory || dentalHistory.length === 0) {
      return { streak: 0, totalSessions: 0, totalMinutes: 0 };
    }

    const totalSessions = dentalHistory.length;
    const totalMinutes = Math.round(
      dentalHistory.reduce((acc: number, log: any) => acc + log.brushDuration, 0) / 60
    );

    // Calculate daily streak
    let streak = 0;
    const sortedDates = dentalHistory
      .map((d: any) => d.date)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) // Unique
      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

    if (sortedDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const newestLogDate = new Date(sortedDates[0]);
      newestLogDate.setHours(0, 0, 0, 0);

      if (newestLogDate.getTime() === today.getTime() || newestLogDate.getTime() === yesterday.getTime()) {
        streak = 1;
        let expectedDate = new Date(newestLogDate);
        for (let i = 1; i < sortedDates.length; i++) {
          expectedDate.setDate(expectedDate.getDate() - 1);
          const currentLogDate = new Date(sortedDates[i]);
          currentLogDate.setHours(0, 0, 0, 0);

          if (currentLogDate.getTime() === expectedDate.getTime()) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return { streak, totalSessions, totalMinutes };
  }, [dentalHistory]);

  const toggleToothSensitivity = (toothId: string) => {
    if (sensitiveTeeth.includes(toothId)) {
      setSensitiveTeeth((prev) => prev.filter((t) => t !== toothId));
    } else {
      setSensitiveTeeth((prev) => [...prev, toothId]);
    }
  };

  const triggerSave = async (
    dur: number,
    fl: boolean,
    mw: boolean,
    tc: boolean,
    teeth: string[]
  ) => {
    if (!user) return;
    try {
      await logDentalMutation({
        userId: user._id,
        date: todayStr,
        brushDuration: dur,
        flossed: fl,
        mouthwash: mw,
        tongueClean: tc,
        sensitiveTeeth: teeth,
      });
    } catch (err) {
      console.error('Failed to log dental data:', err);
    }
  };

  const handleToggleOption = (type: 'flossed' | 'mouthwash' | 'tongueClean') => {
    let nextFlossed = flossed;
    let nextMouthwash = mouthwash;
    let nextTongueClean = tongueClean;

    if (type === 'flossed') {
      nextFlossed = !flossed;
      setFlossed(nextFlossed);
    } else if (type === 'mouthwash') {
      nextMouthwash = !mouthwash;
      setMouthwash(nextMouthwash);
    } else {
      nextTongueClean = !tongueClean;
      setTongueClean(nextTongueClean);
    }

    triggerSave(brushDuration, nextFlossed, nextMouthwash, nextTongueClean, sensitiveTeeth);
  };

  const handleStartTimer = () => {
    setTimerActive(true);
  };

  const handlePauseTimer = () => {
    setTimerActive(false);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setTimeLeft(120);
  };

  const handleManualLog = () => {
    const defaultDuration = 120;
    setBrushDuration(defaultDuration);
    triggerSave(defaultDuration, flossed, mouthwash, tongueClean, sensitiveTeeth);
    Alert.alert(t('common.success', 'Success'), t('dental.manualLogged', 'Standard 2-minute brushing session logged.'));
  };

  // Run mock AI inspection scan
  const startAiScan = () => {
    setScanState('scanning');
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanState('analyzing');
          setTimeout(() => {
            setScanState('result');
            setScanResult({
              plaqueIndex: Math.floor(8 + Math.random() * 15),
              cavityProbability: Math.floor(3 + Math.random() * 12),
              enamelHealth: Math.floor(85 + Math.random() * 14),
              anomalies: Math.random() > 0.6 ? ['Mild gingival redness near lower back molars'] : ['No abnormal findings detected.'],
              recommendation: 'Excellent hygiene. Maintain focus brushing lower quadrant back areas.',
            });
            if (Platform.OS !== 'web') {
              Vibration.vibrate(200);
            }
          }, 2000);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>{t('dental.title', 'Dental Health Hub')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Premium Segmented Tab Selector */}
      <View style={styles.tabSelectorContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'routine' && [styles.tabButtonActive, { borderBottomColor: c.primary }]]}
          onPress={() => setActiveTab('routine')}
          activeOpacity={0.8}
        >
          <Ionicons name="timer-outline" size={18} color={activeTab === 'routine' ? c.primary : c.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'routine' ? c.primary : c.textMuted }]}>
            {t('dental.tabRoutine', 'Routine & Timer')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analytics' && [styles.tabButtonActive, { borderBottomColor: c.primary }]]}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart-outline" size={18} color={activeTab === 'analytics' ? c.primary : c.textMuted} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'analytics' ? c.primary : c.textMuted }]}>
            {t('dental.tabAnalytics', 'Analytics & Scan')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'routine' ? (
          /* TAB 1: ROUTINE & TIMER */
          <View>
            <View style={[styles.card, { backgroundColor: c.surface }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>{t('dental.routineAssistant', 'Routine Assistant')}</Text>
              <Text style={[styles.sectionSub, { color: c.textMuted }]}>
                {t('dental.routineAssistantSub', 'Tap sensitive teeth on the map and complete your 2-minute brushing timer.')}
              </Text>

              {/* Interactive Arch SVG mapping */}
              <View style={styles.archContainer}>
                <Svg width="320" height="340" viewBox="0 0 320 340">
                  <Path d="M 160 20 L 160 320" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <Path d="M 40 170 L 280 170" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                  {/* Upper Arch */}
                  {teethData.upper.map((tooth) => {
                    const isSensitive = sensitiveTeeth.includes(tooth.id);
                    return (
                      <G key={tooth.id} onPress={() => toggleToothSensitivity(tooth.id)}>
                        <Rect
                          x={tooth.cx - 9}
                          y={tooth.cy - 12}
                          width="18"
                          height="24"
                          rx="5"
                          fill={isSensitive ? '#ef4444' : '#475569'}
                          stroke={isSensitive ? '#f87171' : '#334155'}
                          strokeWidth="1.5"
                        />
                        <SvgText
                          x={tooth.cx}
                          y={tooth.cy + 4}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {tooth.label}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* Lower Arch */}
                  {teethData.lower.map((tooth) => {
                    const isSensitive = sensitiveTeeth.includes(tooth.id);
                    return (
                      <G key={tooth.id} onPress={() => toggleToothSensitivity(tooth.id)}>
                        <Rect
                          x={tooth.cx - 9}
                          y={tooth.cy - 12}
                          width="18"
                          height="24"
                          rx="5"
                          fill={isSensitive ? '#ef4444' : '#475569'}
                          stroke={isSensitive ? '#f87171' : '#334155'}
                          strokeWidth="1.5"
                        />
                        <SvgText
                          x={tooth.cx}
                          y={tooth.cy + 4}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {tooth.label}
                        </SvgText>
                      </G>
                    );
                  })}

                  <SvgText x="160" y="80" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="bold" textAnchor="middle">UPPER DENTAL ARCH</SvgText>
                  <SvgText x="160" y="260" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="bold" textAnchor="middle">LOWER DENTAL ARCH</SvgText>
                </Svg>
              </View>

              {/* List of sensitive teeth */}
              <View style={styles.sensitiveList}>
                <Text style={[styles.infoLabel, { color: c.text }]}>{t('dental.selectedSensitiveTeeth', 'Selected Sensitive Teeth:')}</Text>
                {sensitiveTeeth.length === 0 ? (
                  <Text style={{ color: c.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>
                    {t('dental.noTeethSelected', 'No teeth selected. Tap teeth in the arch to mark sensitivity.')}
                  </Text>
                ) : (
                  <View style={styles.teethBadgesContainer}>
                    {sensitiveTeeth.map((toothId) => (
                      <View key={toothId} style={styles.toothBadge}>
                        <Text style={styles.toothBadgeText}>{toothId}</Text>
                        <TouchableOpacity onPress={() => toggleToothSensitivity(toothId)}>
                          <Ionicons name="close-circle" size={14} color="#f87171" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* 2-minute Countdown Player Module */}
              <View style={[styles.timerModule, { backgroundColor: '#0f172a' }]}>
                <Text style={styles.timerTitle}>{t('dental.twoMinuteCountdown', '2 MINUTE COUNTDOWN')}</Text>
                <Text style={styles.timerDisplay}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </Text>

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(timeLeft / 120) * 100}%` }]} />
                </View>

                <View style={styles.timerActions}>
                  {timerActive ? (
                    <TouchableOpacity style={styles.timerActionBtn} onPress={handlePauseTimer}>
                      <Ionicons name="pause" size={20} color="#fff" />
                      <Text style={styles.timerActionText}>{t('dental.pause', 'Pause')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.timerActionBtn, { backgroundColor: '#10b981' }]} onPress={handleStartTimer}>
                      <Ionicons name="play" size={20} color="#fff" />
                      <Text style={styles.timerActionText}>{t('dental.start', 'Start')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.timerActionBtn, { backgroundColor: '#475569' }]} onPress={handleResetTimer}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.timerActionText}>{t('dental.reset', 'Reset')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Daily Routine Checkboxes */}
              <View style={styles.checklistContainer}>
                <Text style={[styles.checklistHeader, { color: c.text }]}>{t('dental.checklistHeader', "Today's Hygiene Checklist")}</Text>
                
                <TouchableOpacity style={styles.checkRow} onPress={() => handleToggleOption('flossed')} activeOpacity={0.7}>
                  <Ionicons name={flossed ? 'checkbox' : 'square-outline'} size={24} color={flossed ? '#10b981' : c.textMuted} />
                  <Text style={[styles.checkText, { color: c.text, textDecorationLine: flossed ? 'line-through' : 'none' }]}>
                    {t('dental.flossed', 'Flossed Teeth')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.checkRow} onPress={() => handleToggleOption('mouthwash')} activeOpacity={0.7}>
                  <Ionicons name={mouthwash ? 'checkbox' : 'square-outline'} size={24} color={mouthwash ? '#10b981' : c.textMuted} />
                  <Text style={[styles.checkText, { color: c.text, textDecorationLine: mouthwash ? 'line-through' : 'none' }]}>
                    {t('dental.mouthwash', 'Used Mouthwash')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.checkRow} onPress={() => handleToggleOption('tongueClean')} activeOpacity={0.7}>
                  <Ionicons name={tongueClean ? 'checkbox' : 'square-outline'} size={24} color={tongueClean ? '#10b981' : c.textMuted} />
                  <Text style={[styles.checkText, { color: c.text, textDecorationLine: tongueClean ? 'line-through' : 'none' }]}>
                    {t('dental.tongueClean', 'Cleaned Tongue')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Fallback button to manually log */}
              <TouchableOpacity style={[styles.manualLogBtn, { borderColor: c.border }]} onPress={handleManualLog}>
                <MaterialCommunityIcons name="history" size={20} color={c.text} />
                <Text style={[styles.manualLogText, { color: c.text }]}>{t('dental.manualLog', 'Manually Log Brushing')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* TAB 2: ANALYTICS & SCAN */
          <View>
            <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.metricsContainer}>
              <Text style={styles.sectionTitleWhite}>{t('dental.progressTracker', 'Oral Progress Tracker')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                    <Ionicons name="flame" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.statValue}>{stats.streak} {t('dental.brushingStreak', 'Days')}</Text>
                  <Text style={styles.statLabel}>{t('dental.brushingStreak', 'Brushing Streak')}</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Ionicons name="checkmark-done" size={20} color="#10b981" />
                  </View>
                  <Text style={styles.statValue}>{stats.totalSessions}</Text>
                  <Text style={styles.statLabel}>{t('dental.totalLogs', 'Total Logs')}</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                    <Ionicons name="time" size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.statValue}>{stats.totalMinutes} Min</Text>
                  <Text style={styles.statLabel}>{t('dental.timeSpent', 'Time Spent')}</Text>
                </View>
              </View>

              {/* Trigger AI Dental Scan */}
              <TouchableOpacity style={styles.aiScanBtn} onPress={() => { setShowScanModal(true); setScanState('idle'); }} activeOpacity={0.8}>
                <LinearGradient colors={['#3b82f6', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiScanGradient}>
                  <FontAwesome5 name="robot" size={18} color="#fff" />
                  <Text style={styles.aiScanBtnText}>{t('dental.triggerAiScan', 'Trigger AI Dental Scan')}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 'auto' }} />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* AI Dental Scan Modal Viewport */}
      <Modal visible={showScanModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dental.aiScanTitle', 'AI Dental Scan Viewport')}</Text>
              <TouchableOpacity onPress={() => setShowScanModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {scanState === 'idle' && (
              <View style={styles.modalBody}>
                <View style={styles.cameraViewportPlaceholder}>
                  <Ionicons name="camera" size={80} color="rgba(255,255,255,0.15)" />
                  <Text style={styles.cameraPlaceholderText}>{t('dental.cameraPlaceholder', 'Ready for Visual Inspection')}</Text>
                  <Text style={styles.cameraPlaceholderSubText}>
                    {t('dental.cameraPlaceholderSub', 'Please point the front camera to your teeth in a well-lit area')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.actionScanBtn} onPress={startAiScan}>
                  <Text style={styles.actionScanBtnText}>{t('dental.initiateScanner', 'Initiate Scanner')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {scanState === 'scanning' && (
              <View style={styles.modalBody}>
                <View style={styles.cameraViewportPlaceholder}>
                  <View style={[styles.scannerGlowLine, { top: `${scanProgress}%` }]} />
                  <Ionicons name="scan" size={100} color="#3b82f6" />
                  <Text style={styles.cameraPlaceholderText}>{t('dental.scanningTeeth', 'Scanning Teeth Surfaces...')}</Text>
                  <Text style={styles.progressPctText}>{scanProgress}%</Text>
                </View>
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 24 }} />
              </View>
            )}

            {scanState === 'analyzing' && (
              <View style={styles.modalBody}>
                <View style={styles.cameraViewportPlaceholder}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={[styles.cameraPlaceholderText, { marginTop: 20 }]}>{t('dental.runningDiagnostic', 'Running AI Diagnostic Vision Models...')}</Text>
                  <Text style={styles.cameraPlaceholderSubText}>
                    {t('dental.runningDiagnosticSub', 'Segmenting enamel regions & checking plaque density index')}
                  </Text>
                </View>
              </View>
            )}

            {scanState === 'result' && scanResult && (
              <ScrollView contentContainerStyle={styles.resultContainer}>
                <View style={styles.resultHeaderCard}>
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  <Text style={styles.resultMainTitle}>{t('dental.analysisComplete', 'Analysis Complete')}</Text>
                </View>

                {/* Score Blocks */}
                <View style={styles.resultRow}>
                  <View style={styles.resultStatBlock}>
                    <Text style={styles.resultStatVal}>{scanResult.plaqueIndex}%</Text>
                    <Text style={styles.resultStatLabel}>{t('dental.plaqueDensity', 'Plaque Density')}</Text>
                  </View>
                  <View style={styles.resultStatBlock}>
                    <Text style={styles.resultStatVal}>{scanResult.cavityProbability}%</Text>
                    <Text style={styles.resultStatLabel}>{t('dental.cavityRisk', 'Cavity Risk')}</Text>
                  </View>
                  <View style={styles.resultStatBlock}>
                    <Text style={styles.resultStatVal}>{scanResult.enamelHealth}%</Text>
                    <Text style={styles.resultStatLabel}>{t('dental.enamelHealth', 'Enamel Health')}</Text>
                  </View>
                </View>

                {/* Findings Details */}
                <View style={styles.findingsBlock}>
                  <Text style={styles.findingsTitle}>{t('dental.visualFindings', 'Key Visual Findings:')}</Text>
                  {scanResult.anomalies.map((anom: string, idx: number) => (
                    <View key={idx} style={styles.anomalyRow}>
                      <Ionicons name="warning" size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={styles.anomalyText}>{anom}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.findingsBlock}>
                  <Text style={styles.findingsTitle}>{t('dental.aiRecommendation', 'Actionable AI Recommendation:')}</Text>
                  <Text style={styles.recText}>{scanResult.recommendation}</Text>
                </View>

                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowScanModal(false)}>
                  <Text style={styles.doneBtnText}>{t('dental.saveClose', 'Save & Close Report')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  metricsContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitleWhite: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  aiScanBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  aiScanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  aiScanBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  archContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  sensitiveList: {
    marginVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  teethBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  toothBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toothBadgeText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  timerModule: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  timerTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  timerDisplay: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    minWidth: 100,
  },
  timerActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  checklistContainer: {
    marginTop: 12,
  },
  checklistHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manualLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 20,
    gap: 8,
  },
  manualLogText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cameraViewportPlaceholder: {
    width: '100%',
    height: 380,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  scannerGlowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  cameraPlaceholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  cameraPlaceholderSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 6,
  },
  progressPctText: {
    color: '#3b82f6',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 12,
  },
  actionScanBtn: {
    backgroundColor: '#3b82f6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  actionScanBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    padding: 24,
  },
  resultHeaderCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultMainTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  resultStatBlock: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  resultStatVal: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  resultStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  findingsBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  findingsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  anomalyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anomalyText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  recText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
