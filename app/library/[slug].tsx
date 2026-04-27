import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getBottomContentPadding } from '@/utils/layout';

// ─── Static fasting articles ────────────────────────────────
const STATIC_ARTICLES: Record<string, { title: string; content: string; image: string; category: string; emoji?: string }> = {
    'autophagy': {
        title: 'What is Autophagy?',
        category: 'Cellular Health',
        emoji: '🔬',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
        content: `Autophagy (literally "self-eating") is the body's method of cleaning out damaged cells, in order to regenerate newer, healthier cells.\n\nWhen you fast for extended periods (typically 18+ hours), your insulin levels drops and your body activates this cellular recycling process.\n\n**Benefits of Autophagy:**\n• Removes toxic proteins from cells that are attributed to neurodegenerative diseases\n• Recycles residual proteins\n• Promotes regeneration of healthy cells\n• Supports mitochondrial health\n\n**How to Activate:**\nThe most reliable way to trigger autophagy is through fasting (intermittent or extended) and keeping insulin levels low.`
    },
    'sugar-drop': {
        title: 'The Sugar Drop Phase',
        category: 'Metabolism',
        emoji: '📉',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
        content: `In the first 12 hours of fasting, your body is digesting your last meal and using up stored glucose (glycogen) in your liver and muscles.\n\n**What's Happening:**\n• Blood sugar levels stabilize\n• Insulin levels begin to drop\n• The body starts looking for alternative energy sources\n\nThis is the "settling in" phase where you might feel hunger pangs as your body adjusts to the absence of incoming calories.`
    },
    'fat-burn': {
        title: 'Entering Fat Burn',
        category: 'Weight Loss',
        emoji: '🔥',
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        content: `Between 12 and 18 hours, your glycogen stores are depleted. Your body must switch fuel sources from glucose to fat.\n\n**The Metabolic Switch:**\n• Lipolysis (fat breakdown) accelerates\n• Ketone production begins\n• Growth Hormone levels may start to rise\n\nThis is often considered the "sweet spot" for intermittent fasting for weight loss.`
    }
};

// ─── Category accent colours ────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    'Hormones':      '#e11d48',
    'Fitness':       '#f97316',
    'Wellness':      '#8b5cf6',
    'Nutrition':     '#10b981',
    'Health':        '#3b82f6',
    'Labs':          '#06b6d4',
    'Enhanced':      '#6366f1',
    'Compete':       '#f59e0b',
    'Cellular Health': '#14b8a6',
    'Metabolism':    '#f59e0b',
    'Weight Loss':   '#ef4444',
    'default':       '#2563eb',
};

export default function ArticleScreen() {
    const { slug, title, body, category, emoji, time } = useLocalSearchParams<{
        slug: string;
        title?: string;
        body?: string;
        category?: string;
        emoji?: string;
        time?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Inline article passed via params (mens-health / womens-health)
    const isInline = !!body;

    const articleKey = typeof slug === 'string' ? slug : '';
    const staticArticle = STATIC_ARTICLES[articleKey];

    const displayTitle    = isInline ? title    : (staticArticle?.title    ?? 'Article');
    const displayBody     = isInline ? body     : (staticArticle?.content  ?? '');
    const displayCategory = isInline ? category : (staticArticle?.category ?? '');
    const displayEmoji    = isInline ? emoji    : (staticArticle?.emoji    ?? '📖');
    const displayImage    = staticArticle?.image ?? 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800';
    const accentColor = CATEGORY_COLORS[displayCategory ?? ''] ?? CATEGORY_COLORS['default'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <ScrollView
                style={{ flex: 1 }}
                bounces={false}
                contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
            >
                {/* Hero image */}
                <View style={{ position: 'relative', height: 260, width: '100%' }}>
                    <Image source={{ uri: displayImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.38)' }} />

                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ position: 'absolute', top: 16 + insets.top, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>

                    <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                        <View style={{ alignSelf: 'flex-start', backgroundColor: accentColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 10 }}>
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{displayEmoji} {displayCategory}</Text>
                        </View>
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 26, lineHeight: 32, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>{displayTitle}</Text>
                        {time ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 12, marginTop: 6 }}>⏱ {time} read</Text> : null}
                    </View>
                </View>

                {/* Content */}
                <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12 }}>
                    {/* Render body: simple markdown-like (bold with **) */}
                    {(displayBody ?? '').split('\n').map((line, i) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                            return <Text key={i} style={{ fontWeight: '800', fontSize: 16, color: '#1e293b', marginTop: 20, marginBottom: 6 }}>{line.replace(/\*\*/g, '')}</Text>;
                        }
                        if (line.startsWith('•')) {
                            return (
                                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                                    <Text style={{ color: accentColor, fontWeight: '800', fontSize: 16 }}>•</Text>
                                    <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22, flex: 1 }}>{line.slice(1).trim()}</Text>
                                </View>
                            );
                        }
                        if (line.trim() === '') return <View key={i} style={{ height: 10 }} />;
                        return <Text key={i} style={{ color: '#475569', fontSize: 15, lineHeight: 24, marginBottom: 4 }}>{line}</Text>;
                    })}
                </View>

                {/* Disclaimer */}
                <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10 }}>
                    <Ionicons name="information-circle-outline" size={18} color="#94a3b8" />
                    <Text style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18, flex: 1 }}>Educational content only — not medical advice. Consult a healthcare professional for personalised guidance.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
