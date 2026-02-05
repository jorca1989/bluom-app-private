import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAccessControl } from '@/hooks/useAccessControl';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

export default function FocusModeScreen() {
  const router = useRouter();
  const { isPro, promptUpgrade } = useAccessControl();
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(1500); // 25 mins
  const [originalSeconds, setOriginalSeconds] = useState(1500);
  const fadeAnim = useRef(new Animated.Value(0.4)).current;
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Removed auto-redirect useEffect

  useEffect(() => {
    let interval: any;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      Alert.alert('Focus Complete!', 'Take a break, you earned it.');
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

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

  const handleBack = () => {
    if (isActive) {
      Alert.alert('Stay Focused', 'Are you sure you want to end your focus session early?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const handleToggleSession = () => {
    if (!isPro) {
      promptUpgrade('Upgrade to unlock deep focus sessions.');
    } else {
      setIsActive(!isActive);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]">
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={handleBack} className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center">
          <Ionicons name="close" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-600 font-bold tracking-widest uppercase text-xs">Focus Mode</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-10">
        <Animated.View style={{ opacity: fadeAnim }} className="w-64 h-64 rounded-full border-2 border-blue-400/30 items-center justify-center">
          <View className="w-56 h-56 rounded-full bg-blue-500/10 items-center justify-center">
            <Text className="text-slate-900 text-6xl font-black font-mono tracking-tighter">
              {formatTime(seconds)}
            </Text>
          </View>
        </Animated.View>

        <Text className="text-slate-600 font-bold mt-12 text-center text-lg italic">
          {isActive ? '"Deep work is the superpower of the 21st century."' : 'Ready to dive in?'}
        </Text>

        <TouchableOpacity
          onPress={handleToggleSession}
          activeOpacity={0.9}
          className={`mt-12 w-full py-5 rounded-3xl items-center shadow-2xl ${isActive ? 'bg-white/10' : 'bg-blue-600'}`}
        >
          <Text className={`text-xl font-black ${isActive ? 'text-white' : 'text-white'}`}>
            {isActive ? 'Pause Session' : 'Start Focusing'}
          </Text>
        </TouchableOpacity>

        {isActive && (
          <Text className="text-slate-400 font-bold mt-6 text-xs uppercase tracking-[4px]">
            Stay Focused • Bloom Deep
          </Text>
        )}
      </View>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => { setShowUpgrade(false); }}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Focus Mode Pro"
        message="Upgrade to Pro to access deep focus sessions and productivity tracking."
      />
    </SafeAreaView>
  );
}

