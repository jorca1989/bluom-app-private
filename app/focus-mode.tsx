import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAccessControl } from '@/hooks/useAccessControl';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import { useTheme, type ThemeColors } from '@/context/ThemeContext';

export default function FocusModeScreen() {
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro, promptUpgrade } = useAccessControl();
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUser?.id ? { clerkId: clerkUser.id } : 'skip');
  const startFocusSession = useMutation(api.guidedSessions.startFocusSession);
  const updateFocusSession = useMutation(api.guidedSessions.updateFocusSession);
  const presets = [
    { id: 'pomodoro', label: '25 / 5', focus: 25 * 60, break: 5 * 60 },
    { id: 'deep-work', label: '50 / 10', focus: 50 * 60, break: 10 * 60 },
    { id: 'sprint', label: '15 / 3', focus: 15 * 60, break: 3 * 60 },
  ];
  const [presetId, setPresetId] = useState('pomodoro');
  const preset = presets.find(item => item.id === presetId) ?? presets[0];
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(preset.focus);
  const [sessionId, setSessionId] = useState<Id<'focusSessions'> | null>(null);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0.4)).current;
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      if (sessionId && convexUser?._id) {
        updateFocusSession({ userId: convexUser._id, sessionId, completedCycles: 1, pausedSeconds, status: 'completed' }).catch(() => undefined);
      }
      Alert.alert(
        t('focusMode.complete', 'Focus Complete!'),
        t('focusMode.completeMsg', 'Take a break, you earned it.')
      );
    }
    return () => clearInterval(interval);
  }, [convexUser?._id, isActive, pausedSeconds, seconds, sessionId, t, updateFocusSession]);

  // Calming pulse animation
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 0.4, duration: 3000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [isActive]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  const endSession = async () => {
    if (sessionId && convexUser?._id) {
      await updateFocusSession({ userId: convexUser._id, sessionId, completedCycles: 0, pausedSeconds, status: 'ended' }).catch(() => undefined);
    }
    router.back();
  };

  const handleBack = () => {
    if (isActive || sessionId) {
      Alert.alert(
        t('focusMode.stayFocused', 'Stay Focused'),
        t('focusMode.endEarly', 'Are you sure you want to end your focus session early?'),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          { text: t('focusMode.endSession', 'End Session'), style: 'destructive', onPress: endSession },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleToggleSession = async () => {
    if (!isPro) {
      promptUpgrade(t('focusMode.upgradeMsg', 'Upgrade to unlock deep focus sessions.'));
    } else if (!isActive) {
      if (!sessionId && convexUser?._id) {
        try {
          const id = await startFocusSession({ userId: convexUser._id, preset: preset.id, focusSeconds: preset.focus, breakSeconds: preset.break, plannedCycles: 1 });
          setSessionId(id);
        } catch {
          Alert.alert('Could not start focus session', 'Please try again.');
          return;
        }
      }
      setIsActive(true);
      if (sessionId && convexUser?._id) {
        updateFocusSession({ userId: convexUser._id, sessionId, completedCycles: 0, pausedSeconds, status: 'active' }).catch(() => undefined);
      }
    } else {
      setIsActive(false);
      setPausedSeconds(value => value + 1);
      if (sessionId && convexUser?._id) {
        updateFocusSession({ userId: convexUser._id, sessionId, completedCycles: 0, pausedSeconds: pausedSeconds + 1, status: 'paused' }).catch(() => undefined);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={handleBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.surface, borderWidth: 1, borderColor: themeColors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={22} color={themeColors.text} />
        </TouchableOpacity>
        <Text className="text-slate-600 font-bold tracking-widest uppercase text-xs">
          {t('focusMode.title', 'Focus Mode')}
        </Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-10">
        {!isActive && !sessionId && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {presets.map(item => (
              <TouchableOpacity key={item.id} onPress={() => { setPresetId(item.id); setSeconds(item.focus); }} style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: presetId === item.id ? themeColors.primary : themeColors.border, backgroundColor: presetId === item.id ? themeColors.surfaceMuted : themeColors.surface }}>
                <Text style={{ color: presetId === item.id ? themeColors.primary : themeColors.text, fontWeight: '800', fontSize: 12 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Animated.View style={{ opacity: fadeAnim }} className="w-64 h-64 rounded-full border-2 border-blue-400/30 items-center justify-center">
          <View className="w-56 h-56 rounded-full bg-blue-500/10 items-center justify-center">
            <Text style={{ color: themeColors.text, fontSize: 60, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              {formatTime(seconds)}
            </Text>
          </View>
        </Animated.View>

        <Text style={{ color: themeColors.textMuted, fontWeight: '700', marginTop: 48, textAlign: 'center', fontSize: 17, fontStyle: 'italic' }}>
          {isActive
            ? t('focusMode.quote', '"Deep work is the superpower of the 21st century."')
            : t('focusMode.readyPrompt', 'Ready to dive in?')}
        </Text>

        <View style={{ width: '100%', gap: 12, marginTop: 40 }}>
          <TouchableOpacity
            onPress={handleToggleSession}
            activeOpacity={0.88}
            style={{
              width: '100%',
              paddingVertical: 18,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? '#f59e0b' : '#2563eb',
              shadowColor: isActive ? '#f59e0b' : '#2563eb',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#ffffff' }}>
              {isActive
                ? t('focusMode.pause', 'Pause Session')
                : t('focusMode.start', 'Start Focusing')}
            </Text>
          </TouchableOpacity>

          {isActive && (
            <TouchableOpacity
              onPress={endSession}
              activeOpacity={0.88}
              style={{
                width: '100%',
                paddingVertical: 16,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: themeColors.surface,
                borderWidth: 2,
                borderColor: '#ef4444',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#ef4444' }}>
                {t('focusMode.endSession', 'End Session')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isActive && (
          <Text style={{ color: themeColors.textMuted, fontWeight: '700', marginTop: 20, fontSize: 12, textTransform: 'uppercase', letterSpacing: 3 }}>
            {t('focusMode.tagline', 'Stay Focused · Bloom Deep')}
          </Text>
        )}
      </View>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title={t('focusMode.proTitle', 'Focus Mode Pro')}
        message={t('focusMode.proMessage', 'Upgrade to Pro to access deep focus sessions and productivity tracking.')}
      />
    </SafeAreaView>
  );
}
