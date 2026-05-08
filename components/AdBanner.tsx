import React from 'react';
import { View, Text } from 'react-native';
import { useUser as useAppUser } from '@/context/UserContext';

export function AdBanner() {
  const { isPro, isAdmin } = useAppUser();

  // ONLY render if user is NOT Pro
  if (isPro || isAdmin) return null;

  return (
    <View className="bg-slate-50 border border-slate-200 rounded-2xl p-6 items-center justify-center my-4 overflow-hidden border-dashed">
      <View className="absolute top-2 right-2 bg-slate-200 px-2 py-0.5 rounded">
        <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sponsored</Text>
      </View>
      <Text className="text-slate-400 font-bold text-xs italic">Precision nutrition ads would appear here.</Text>
      <Text className="text-slate-300 font-bold text-[10px] mt-1 italic">Upgrade to Pro to remove all ads.</Text>
    </View>
  );
}

