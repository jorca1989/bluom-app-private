import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getBottomContentPadding } from '@/utils/layout';

const ARTICLES: Record<string, { title: string; content: string; image: string; category: string }> = {
    'autophagy': {
        title: 'What is Autophagy?',
        category: 'Cellular Health',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
        content: `Autophagy (literally "self-eating") is the body's method of cleaning out damaged cells, in order to regenerate newer, healthier cells.

When you fast for extended periods (typically 18+ hours), your insulin levels drop and your body activates this cellular recycling process.

**Benefits of Autophagy:**
• Removes toxic proteins from cells that are attributed to neurodegenerative diseases
• Recyles residual proteins
• Promotes regeneration of healthy cells
• Supports mitochondrial health

**How to Activate:**
The most reliable way to trigger autophagy is through fasting (intermittent or extended) and keeping insulin levels low.`
    },
    'sugar-drop': {
        title: 'The Sugar Drop Phase',
        category: 'Metabolism',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
        content: `In the first 12 hours of fasting, your body is digesting your last meal and using up stored glucose (glycogen) in your liver and muscles.

**What's Happening:**
• Blood sugar levels stabilize
• Insulin levels begin to drop
• The body starts looking for alternative energy sources

This is the "settling in" phase where you might feel hunger pangs as your body adjusts to the absence of incoming calories.`
    },
    'fat-burn': {
        title: 'Entering Fat Burn',
        category: 'Weight Loss',
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        content: `Between 12 and 18 hours, your glycogen stores are depleted. Your body must switch fuel sources from glucose to fat.

**The Metabolic Switch:**
• Lipolysis (fat breakdown) accelerates
• Ketone production begins
• Growth Hormone levels may start to rise

This is often considered the "sweet spot" for intermittent fasting for weight loss.`
    }
};

export default function ArticleScreen() {
    const { slug } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const articleKey = typeof slug === 'string' ? slug : '';
    const article = ARTICLES[articleKey] || {
        title: 'Article Not Found',
        content: 'Sorry, the requested article could not be loaded.',
        image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
        category: 'Error'
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
            <ScrollView
                className="flex-1"
                bounces={false}
                contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
            >
                <View className="relative h-64 w-full">
                    <Image source={{ uri: article.image }} className="w-full h-full" resizeMode="cover" />
                    <View className="absolute inset-0 bg-black/30" />

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md items-center justify-center border border-white/20"
                        style={{ marginTop: insets.top }}
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>

                    <View className="absolute bottom-6 left-6 right-6">
                        <View className="self-start bg-blue-600 px-3 py-1 rounded-full mb-3">
                            <Text className="text-white font-bold text-[10px] uppercase tracking-widest">{article.category}</Text>
                        </View>
                        <Text className="text-white font-black text-3xl shadow-lg leading-tight">{article.title}</Text>
                    </View>
                </View>

                <View className="px-6 py-8">
                    <Text className="text-slate-600 text-lg leading-8 font-medium">
                        {article.content}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
