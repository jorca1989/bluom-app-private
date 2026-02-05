import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBottomContentPadding } from '@/utils/layout';
import { useAccessControl } from '@/hooks/useAccessControl';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro, promptUpgrade } = useAccessControl();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Removed auto-redirect useEffect

  const articles = [
    {
      id: '1',
      title: 'Precision Nutrition: Why Bio-Individuality Matters',
      category: 'Nutrition',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
      shopLink: 'https://amazon.com',
      shopLabel: 'Shop Supplements'
    },
    {
      id: '2',
      title: 'The Autophagy Secret: How Fasting Rewires Your Cells',
      category: 'Wellness',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      shopLink: 'https://bluom-app.myshopify.com',
      shopLabel: 'Shop Bluom Gear'
    },
    {
      id: '3',
      title: 'Hormone Optimization for High Performance',
      category: 'Health',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      shopLink: 'https://amazon.com',
      shopLabel: 'Shop Health Tech'
    }
  ];

  const handleArticlePress = (title: string) => {
    if (!isPro) {
      promptUpgrade('Upgrade to access full research papers and guides.');
    } else {
      Alert.alert('Pro Content', `Opening: ${title} (Content Reader coming soon)`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 border-b border-slate-100" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Bluom Library</Text>
          <Text className="text-slate-500 font-bold text-xs">Curated Knowledge</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        {articles.map((a) => (
          <View key={a.id} className="mb-8">
            <TouchableOpacity onPress={() => handleArticlePress(a.title)} activeOpacity={0.9}>
              <View className="rounded-[32px] overflow-hidden shadow-xl bg-slate-900 aspect-[16/9] mb-4 relative">
                <Image source={{ uri: a.image }} className="w-full h-full opacity-80" />
                <View className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  <Text className="text-white font-black text-[10px] uppercase tracking-widest">{a.category}</Text>
                </View>
                {!isPro && (
                  <View className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-1 rounded-full flex-row items-center gap-1">
                    <Ionicons name="lock-closed" size={12} color="white" />
                    <Text className="text-white font-bold text-xs">Pro</Text>
                  </View>
                )}
              </View>
              <Text className="text-slate-900 font-black text-xl leading-tight mb-2">{a.title}</Text>
              <Text className="text-slate-500 font-semibold mb-4 leading-5">
                Unlock the science behind precision living with our expert-led research papers and guides.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(a.shopLink)}
              className="flex-row items-center gap-2 bg-blue-50 self-start px-4 py-2 rounded-xl border border-blue-100"
            >
              <Ionicons name="cart" size={16} color="#2563eb" />
              <Text className="text-blue-600 font-black text-xs">{a.shopLabel}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => { setShowUpgrade(false); }}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Bluom Library Pro"
        message="Upgrade to Pro to access our full curated knowledge library and research papers."
      />
    </SafeAreaView>
  );
}

