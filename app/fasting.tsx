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
    Alert.alert(t('fasting.fastEnded', 'Jejum Terminado'), `${t('fasting.totalTime', 'Tempo total')}: ${Math.floor(elapsedHours)}h ${Math.floor((elapsedHours % 1) * 60)}m`);
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
    <SafeAreaView className="flex-1 bg-[#F5F4F0]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">{t('fasting.title', 'Rastreador Metabólico')}</Text>
          <Text className="text-slate-500 font-bold text-xs">{t('fasting.subtitle', 'Inteligência de jejum de precisão')}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        <View className="bg-white rounded-[40px] p-10 items-center border border-slate-100 shadow-sm overflow-hidden">
          <View className="relative items-center justify-center">
            <CircularProgress
              progress={activeLog ? progress : 0}
              size={240}
              strokeWidth={15}
              progressColor={currentPhase?.color || '#64748b'}
              trackColor="#f1f5f9"
            />
            <View className="absolute items-center">
              <Text className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-1">{t('fasting.elapsed', 'Tempo Decorrido')}</Text>
              <Text className="text-slate-900 font-black text-4xl tabular-nums">{formatTime(elapsedMs)}</Text>
              <Text className="text-slate-500 font-bold mt-1">{t('fasting.goal', 'Objetivo')}: {targetHours}h</Text>
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
              {activeLog ? t('fasting.endFasting', 'Terminar Jejum') : t('fasting.startFasting', 'Iniciar Jejum')}
            </Text>
          </TouchableOpacity>


          {/* Sync Status */}
          {activeLog && (
            <View className="flex-row items-center gap-2 mt-4 opacity-80">
              <Ionicons name="sync" size={14} color="#94a3b8" />
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">{t('fasting.syncing', 'A sincronizar dados metabólicos')}</Text>
            </View>
          )}
        </View>

        {/* Protocol Selector */}
        {!activeLog && (
          <View className="mt-6">
            <Text className="text-slate-900 font-black text-lg mb-3 px-2">{t('fasting.chooseProtocol', 'Escolher Protocolo')}</Text>
            <View className="space-y-2">
              {protocols.map((protocol) => (
                <TouchableOpacity
                  key={protocol.id}
                  onPress={() => handleProtocolSelect(protocol.id)}
                  className={`p-4 rounded-2xl border flex-row items-center justify-between ${selectedProtocol === protocol.id ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                    }`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className={`font-black ${selectedProtocol === protocol.id ? 'text-blue-600' : 'text-slate-500'}`}>
                      {protocol.name}
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
        <View className="mt-8 bg-white rounded-3xl overflow-hidden relative border border-slate-200">
          <View className="p-6 pb-2">
            <Text className="text-slate-900 font-black text-lg">{t('fasting.metabolicPhases', 'Fases Metabólicas')}</Text>
            <Text className="text-slate-400 font-medium text-xs mb-4">{t('fasting.tapToLearn', 'Toca para aprender o que acontece dentro de ti')}</Text>
          </View>

          <View className="px-4 pb-6 space-y-3">
            {metabolicPhases.map((phase, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(`/library/${phase.slug}`)}
                className={`flex-row items-center justify-between p-4 rounded-2xl border ${currentPhase?.label === phase.label ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
                  }`}
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View style={{ backgroundColor: phase.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <View className="flex-1">
                    <Text className={`font-black text-base ${currentPhase?.label === phase.label ? 'text-slate-900' : 'text-slate-500'}`}>
                      {phase.label}
                    </Text>
                    <Text className="text-slate-400 font-medium text-xs">{phase.description}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={`font-bold text-xs ${currentPhase?.label === phase.label ? 'text-blue-600' : 'text-slate-300'}`}>
                    {phase.time}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={currentPhase?.label === phase.label ? '#3b82f6' : '#cbd5e1'} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pro Gate for Metabolic Phases */}
          {!isPro && (
            <View className="absolute inset-0 items-center justify-center z-50" style={{ backgroundColor: '#ffffff' }}>
              <View className="bg-white p-6 rounded-3xl items-center shadow-lg w-[85%] border border-slate-200">
                <Ionicons name="lock-closed" size={32} color="#3b82f6" className="mb-4" />
                <Text className="text-slate-900 font-black text-lg text-center mb-2">{t('fasting.unlockVision', 'Desbloquear Visão Metabólica')}</Text>
                <Text className="text-slate-500 text-center text-sm mb-6">{t('fasting.unlockVisionDesc', 'Veja em que fase de queima de gordura se encontra.')}</Text>
                <TouchableOpacity onPress={() => promptUpgrade(t('fasting.seeMetabolicState', 'See your metabolic state in real-time.'))} className="bg-blue-600 px-6 py-3 rounded-full shadow-blue-200">
                  <Text className="font-bold text-white uppercase tracking-wider text-xs">{t('fasting.upgradeUnlock', 'Atualizar para Desbloquear')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Educational Resources */}
        <View className="mt-8 mb-4">
          <Text className="text-slate-900 font-black text-lg mb-4 px-2">{t('fasting.fastingScience', 'Ciência do Jejum')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3" contentContainerStyle={{ paddingHorizontal: 4 }}>
            {educationCards.map((card, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => router.push(`/library/${card.slug}`)}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
                style={{ width: width - 64 }}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center gap-3 mb-3">
                  <Text className="text-2xl">{card.icon}</Text>
                  <Text className="text-slate-900 font-black text-sm flex-1">{card.title}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#cbd5e1" />
                </View>
                <Text className="text-slate-600 font-bold text-xs leading-5" numberOfLines={3}>{card.content}</Text>
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


