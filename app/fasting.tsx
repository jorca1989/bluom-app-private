import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CircularProgress } from '@/components/CircularProgress';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

import { useTheme, type ThemeColors } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

const getFastingProtocols = (t: any) => [
  { id: '16:8', name: '16:8', proRequired: false, description: t('fasting.protocols.168', 'Standard intermittent fasting') },
  { id: '18:6', name: '18:6', proRequired: true, description: t('fasting.protocols.186', 'Advanced fat burning') },
  { id: '20:4', name: '20:4', proRequired: true, description: t('fasting.protocols.204', 'Extreme ketosis protocol') },
  { id: 'OMAD', name: 'OMAD', proRequired: true, description: t('fasting.protocols.omad', 'One meal a day') },
];

const getMetabolicPhases = (t: any) => [
  { label: t('fasting.phases.sugarDrop', 'Sugar Drop'), time: '0-12h', color: '#3b82f6', description: t('fasting.phases.sugarDropDesc', 'Blood sugar stabilizing'), slug: 'sugar-drop' },
  { label: t('fasting.phases.fatBurn', 'Fat Burn'), time: '12-18h', color: '#f59e0b', description: t('fasting.phases.fatBurnDesc', 'Entering ketosis state'), slug: 'fat-burn' },
  { label: t('fasting.phases.autophagy', 'Autophagy'), time: '18h+', color: '#10b981', description: t('fasting.phases.autophagyDesc', 'Cellular cleanup active'), slug: 'autophagy' },
];

const getEducationCards = (t: any) => [
  { title: t('fasting.edu.autophagy', 'What is Autophagy?'), icon: '🔬', content: t('fasting.edu.autophagyDesc', 'Your body\'s cellular recycling process that removes damaged cells and generates new ones.'), slug: 'autophagy' },
  { title: t('fasting.edu.muscle', 'Fasting & Muscle Mass'), icon: '💪', content: t('fasting.edu.muscleDesc', 'Proper fasting preserves muscle while burning fat, especially with adequate protein.'), slug: 'fat-burn' },
  { title: t('fasting.edu.electrolytes', 'Electrolytes 101'), icon: '⚡', content: t('fasting.edu.electrolytesDesc', 'Stay hydrated with sodium, potassium, and magnesium during extended fasts.'), slug: 'sugar-drop' },
];

export default function FastingScreen() {
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, isLoading, promptUpgrade } = useAccessControl();
  const { t } = useTranslation();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const activeLog = useQuery(
    api.fasting.getActiveFastingLog,
    convexUser?._id ? { userId: convexUser?._id } : 'skip'
  );

  const startFasting = useMutation(api.fasting.startFasting);
  const endFasting = useMutation(api.fasting.endFasting);

  const [now, setNow] = useState(Date.now());
  const [selectedProtocol, setSelectedProtocol] = useState('16:8');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProtocolUpgrade, setShowProtocolUpgrade] = useState(false);

  const protocols = useMemo(() => getFastingProtocols(t), [t]);
  const metabolicPhases = useMemo(() => getMetabolicPhases(t), [t]);
  const educationCards = useMemo(() => getEducationCards(t), [t]);

  // Background timer - always running
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <View className="flex-1 bg-slate-50" />;
  }

  // Calculate elapsed time from database startTime
  const elapsedMs = activeLog ? now - activeLog.startTime : 0;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const targetHours = useMemo(() => {
    const protocol = activeLog?.protocol ?? selectedProtocol;
    return parseInt(protocol.split(':')[0]);
  }, [activeLog, selectedProtocol]);

  const progress = Math.min(1, elapsedHours / targetHours);

  const currentPhase = useMemo(() => {
    if (!activeLog) return null;
    if (elapsedHours < 12) return metabolicPhases[0];
    if (elapsedHours < 18) return metabolicPhases[1];
    return metabolicPhases[2];
  }, [activeLog, elapsedHours, metabolicPhases]);

  async function handleStart() {
    if (!convexUser?._id) return;

    const protocol = protocols.find(p => p.id === selectedProtocol);
    if (protocol?.proRequired && !isPro) {
      setShowProtocolUpgrade(true);
      return;
    }

    await startFasting({
      userId: convexUser._id,
      protocol: selectedProtocol,
      startTime: Date.now()
    });
  }

  async function handleEnd() {
    if (!convexUser?._id) return;
    await endFasting({
      userId: convexUser._id,
      endTime: Date.now()
    });
    Alert.alert(t('fasting.fastEnded', 'Fast Ended'), `${t('fasting.totalTime', 'Total time')}: ${Math.floor(elapsedHours)}h ${Math.floor((elapsedHours % 1) * 60)}m`);
  }

  function handleProtocolSelect(protocolId: string) {
    const protocol = protocols.find(p => p.id === protocolId);
    if (protocol?.proRequired && !isPro) {
      setShowProtocolUpgrade(true);
      return;
    }
    setSelectedProtocol(protocolId);
  }

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: themeColors.surface, borderBottomWidth: 1, borderBottomColor: themeColors.border, paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: themeColors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={themeColors.text} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 17 }}>{t('fasting.title', 'Jejum')}</Text>
          <Text style={{ color: themeColors.textMuted, fontWeight: '700', fontSize: 11 }}>{t('fasting.subtitle', 'Precision fasting intelligence')}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        <View style={{ backgroundColor: themeColors.surface, borderRadius: 40, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: themeColors.border, overflow: 'hidden' }}>
          <View className="relative items-center justify-center">
            <CircularProgress
              progress={activeLog ? progress : 0}
              size={240}
              strokeWidth={15}
              progressColor={currentPhase?.color || '#64748b'}
              trackColor="#f1f5f9"
            />
            <View className="absolute items-center">
              <Text className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-1">{t('fasting.elapsed', 'Time Elapsed')}</Text>
              <Text className="text-slate-900 font-black text-4xl tabular-nums">{formatTime(elapsedMs)}</Text>
              <Text className="text-slate-500 font-bold mt-1">{t('fasting.goal', 'Goal')}: {targetHours}h</Text>
            </View>
          </View>

          {/* Current Phase Indicator */}
          {currentPhase && (
            <View className="mt-8 items-center">
              <View style={{ backgroundColor: currentPhase.color + '20' }} className="px-4 py-1 rounded-full border">
                <Text style={{ color: currentPhase.color }} className="font-black uppercase text-[10px] tracking-widest">{currentPhase.label}</Text>
              </View>
              <Text className="text-slate-600 font-bold text-center mt-2 leading-5">{currentPhase.description}</Text>
            </View>
          )}

          {/* Start/End Button */}
          <TouchableOpacity
            onPress={activeLog ? handleEnd : handleStart}
            className={`mt-10 w-full py-5 rounded-3xl items-center shadow-xl ${activeLog ? 'bg-slate-900' : 'bg-blue-600'}`}
          >
            <Text className="text-white font-black text-lg">
              {activeLog ? t('fasting.endFasting', 'End Fast') : t('fasting.startFasting', 'Start Fast')}
            </Text>
          </TouchableOpacity>


          {/* Sync Status */}
          {activeLog && (
            <View className="flex-row items-center gap-2 mt-4 opacity-80">
              <Ionicons name="sync" size={14} color="#94a3b8" />
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">{t('fasting.syncing', 'Syncing metabolic data')}</Text>
            </View>
          )}
        </View>

        {/* Protocol Selector */}
        {!activeLog && (
          <View className="mt-6">
            <Text className="text-slate-900 font-black text-lg mb-3 px-2">{t('fasting.chooseProtocol', 'Choose Protocol')}</Text>
            <View className="space-y-2">
              {protocols.map((protocol) => (
                <TouchableOpacity
                  key={protocol.id}
                  onPress={() => handleProtocolSelect(protocol.id)}
                  className={`p-4 rounded-2xl border flex-row items-center justify-between ${selectedProtocol === protocol.id ? 'bg-blue-50 border-blue-600' : ''}`}
                  style={{ backgroundColor: selectedProtocol === protocol.id ? '#eff6ff' : themeColors.surface, borderColor: selectedProtocol === protocol.id ? '#2563eb' : themeColors.border }}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className={`font-black ${selectedProtocol === protocol.id ? 'text-blue-600' : 'text-slate-500'}`}>
                      {protocol.proRequired && !isPro
                        ? protocol.id === 'OMAD' ? '••••' : '••:•'
                        : protocol.name}
                    </Text>
                    {protocol.proRequired && (
                      <View className="bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-1 rounded-full">
                        <Text className="text-white font-black text-[8px]">PRO</Text>
                      </View>
                    )}
                  </View>
                  {protocol.proRequired && !isPro && (
                    <Ionicons name="lock-closed" size={16} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Metabolic Phases */}
        <View style={{ backgroundColor: themeColors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: themeColors.border, marginTop: 32 }}>
          <View style={{ padding: 24, paddingBottom: 8 }}>
            <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 18 }}>{t('fasting.metabolicPhases', 'Metabolic Phases')}</Text>
            <Text style={{ color: themeColors.textMuted, fontWeight: '500', fontSize: 12, marginBottom: 16, marginTop: 4 }}>{t('fasting.tapToLearn', 'Tap to learn what happens inside you')}</Text>
          </View>

          <View className="px-4 pb-6 space-y-3">
            {metabolicPhases.map((phase, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(`/library/${phase.slug}`)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, backgroundColor: currentPhase?.label === phase.label ? 'rgba(59,130,246,0.08)' : themeColors.surfaceMuted, borderColor: currentPhase?.label === phase.label ? '#bfdbfe' : themeColors.border, marginBottom: 10 }}
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View style={{ backgroundColor: phase.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900', fontSize: 15, color: currentPhase?.label === phase.label ? themeColors.text : themeColors.textMuted }}>
                      {phase.label}
                    </Text>
                    <Text style={{ color: themeColors.textMuted, fontWeight: '500', fontSize: 11 }}>{phase.description}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '700', fontSize: 11, color: currentPhase?.label === phase.label ? themeColors.primary : themeColors.border }}>
                    {phase.time}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={currentPhase?.label === phase.label ? themeColors.primary : themeColors.border} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pro Gate for Metabolic Phases */}
          {!isPro && (
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: themeColors.bg, borderRadius: 24, alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
              <View style={{ backgroundColor: themeColors.surface, padding: 24, borderRadius: 24, alignItems: 'center', width: '85%', borderWidth: 1, borderColor: themeColors.border }}>
                <Ionicons name="lock-closed" size={32} color={themeColors.primary} />
                <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 17, textAlign: 'center', marginTop: 12, marginBottom: 8 }}>{t('fasting.unlockVision', 'Unlock Metabolic View')}</Text>
                <Text style={{ color: themeColors.textMuted, textAlign: 'center', fontSize: 13, marginBottom: 24 }}>{t('fasting.unlockVisionDesc', 'See which fat-burning phase you are in.')}</Text>
                <TouchableOpacity onPress={() => promptUpgrade(t('fasting.seeMetabolicState', 'See your metabolic state in real-time.'))} style={{ backgroundColor: themeColors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}>
                  <Text style={{ fontWeight: '700', color: themeColors.onPrimary, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>{t('fasting.upgradeUnlock', 'Upgrade to Unlock')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Educational Resources */}
        <View style={{ marginTop: 32, marginBottom: 16 }}>
          <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 18, marginBottom: 16, paddingHorizontal: 8 }}>{t('fasting.fastingScience', 'Fasting Science')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3" contentContainerStyle={{ paddingHorizontal: 4 }}>
            {educationCards.map((card, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(`/library/${card.slug}`)}
              style={{ width: width - 64, backgroundColor: themeColors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: themeColors.border, marginRight: 12 }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 24 }}>{card.icon}</Text>
                  <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 13, flex: 1 }}>{card.title}</Text>
                  <Ionicons name="arrow-forward" size={16} color={themeColors.border} />
                </View>
                <Text style={{ color: themeColors.textMuted, fontWeight: '600', fontSize: 11, lineHeight: 18 }} numberOfLines={3}>{card.content}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Protocol Upgrade Modal */}
      <ProUpgradeModal
        visible={showProtocolUpgrade}
        onClose={() => setShowProtocolUpgrade(false)}
        onUpgrade={() => { setShowProtocolUpgrade(false); router.push('/premium'); }}
        title={t('fasting.advancedProtocols', 'Advanced Protocols')}
        message={t('fasting.advancedDesc', 'Unlock 18:6, 20:4, and OMAD protocols for maximum metabolic benefits.')}
      />

      {/* Standard Upgrade Modal */}
      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title={t('fasting.proTitle', 'Metabolic Insights Pro')}
        message={t('fasting.proDesc', 'Unlock real-time metabolic phase tracking and advanced fasting analytics.')}
      />
    </SafeAreaView>
  );
}


