import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GardenView from './GardenView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MindWorldScreen({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

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
        <View className="bg-white px-6 py-4 border-b border-blue-50 flex-row justify-between items-center">
          <View>
            <Text className="text-slate-900 font-black text-2xl tracking-tight">AI Mind Hub</Text>
            <Text className="text-slate-500 font-bold text-xs">Precision mental resilience</Text>
          </View>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
            <Ionicons name="close" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {/* Content - Strictly Garden View */}
        <View className="flex-1 p-5">
          <GardenView
            userId={user._id}
            onNavigate={() => { }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
