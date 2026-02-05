import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GardenView from './GardenView';
import QuestSystem from './QuestSystem';
import XPBar from './XPBar';
import MindTokenBalance from './MindTokenBalance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MeditationHub from '../MeditationHub';
import GamesHub from '../GamesHub';
import { HubCard } from './HubCard';
import { Timer, Music, Brain, Sparkles, Gamepad2, Heart, Target, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function MindWorldScreen({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");
  const [activeTab, setActiveTab] = useState<'garden' | 'quests' | 'hub'>('garden');
  const [showMeditationHub, setShowMeditationHub] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);

  if (!visible) return null;

  if (!user) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
          <Text className="text-slate-400 font-bold">Loading Mind World...</Text>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top']}>
        {/* Header */}
        <View className="bg-white px-6 py-6 border-b border-blue-50">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-slate-900 font-black text-2xl tracking-tight">AI Mind Hub</Text>
              <Text className="text-slate-500 font-bold text-xs">Precision mental resilience</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <XPBar userId={user._id} />
          <View className="mt-4">
            <MindTokenBalance userId={user._id} />
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white border-b border-blue-50">
          {[
            { id: 'garden', label: 'Garden', icon: 'leaf' },
            { id: 'quests', label: 'Quests', icon: 'list' },
            { id: 'hub', label: 'Hub', icon: 'apps' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              className={`flex-1 py-4 items-center border-b-2 ${activeTab === tab.id ? 'border-blue-600' : 'border-transparent'}`}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text className={`text-xs font-black uppercase tracking-widest ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          {activeTab === 'garden' && (
            <GardenView
              userId={user._id}
              onNavigate={(screen) => setActiveTab(screen as any)}
            />
          )}

          {activeTab === 'quests' && (
            <QuestSystem userId={user._id} />
          )}

          {activeTab === 'hub' && (
            <View className="flex-row flex-wrap justify-between">
              <HubCard 
                title="Focus Mode" 
                subtitle="Deep Work Timer" 
                Icon={Timer} 
                onPress={() => { onClose(); router.push('/focus-mode'); }} 
                color="#3b82f6" 
                bgColor="#eff6ff" 
              />
              <HubCard 
                title="Music Hub" 
                subtitle="AI Beats & Radio" 
                Icon={Music} 
                onPress={() => { onClose(); router.push('/music-hub'); }} 
                color="#8b5cf6" 
                bgColor="#f5f3ff" 
              />
              <HubCard 
                title="Meditation" 
                subtitle="Guided Peace" 
                Icon={Heart} 
                onPress={() => setShowMeditationHub(true)} 
                color="#ec4899" 
                bgColor="#fdf2f8" 
              />
              <HubCard 
                title="Mind Games" 
                subtitle="Rewire Brain" 
                Icon={Gamepad2} 
                onPress={() => setShowGamesHub(true)} 
                color="#f59e0b" 
                bgColor="#fef3c7" 
              />
              <HubCard 
                title="Daily Reset" 
                subtitle="Habit Refactor" 
                Icon={Zap} 
                onPress={() => { onClose(); router.push('/(tabs)/wellness'); }} 
                color="#ef4444" 
                bgColor="#fee2e2" 
              />
              <HubCard 
                title="Quests" 
                subtitle="Level Up XP" 
                Icon={Target} 
                onPress={() => setActiveTab('quests')} 
                color="#10b981" 
                bgColor="#ecfdf5" 
              />
              <HubCard 
                title="AI Garden" 
                subtitle="Visual Growth" 
                Icon={Sparkles} 
                onPress={() => setActiveTab('garden')} 
                color="#06b6d4" 
                bgColor="#ecfeff" 
              />
              <HubCard 
                title="Analytics" 
                subtitle="Deep Insights" 
                Icon={Brain} 
                onPress={() => { onClose(); router.push('/(tabs)/wellness'); }} 
                color="#6366f1" 
                bgColor="#eef2ff" 
              />
            </View>
          )}
        </ScrollView>

        {showMeditationHub && (
          <MeditationHub userId={user._id} onClose={() => setShowMeditationHub(false)} />
        )}
        {showGamesHub && (
          <GamesHub userId={user._id} onClose={() => setShowGamesHub(false)} />
        )}
      </SafeAreaView>
    </Modal>
  );
}
