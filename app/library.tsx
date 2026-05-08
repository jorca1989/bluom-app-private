import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, TextInput, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBottomContentPadding } from '@/utils/layout';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Feature categories ─────────────────────────────────────
const FEATURE_CATEGORIES = [
  { id: 'All',           label: 'All',              emoji: '📚', color: '#2563eb' },
  { id: "Men's Health",  label: "Men's Health",     emoji: '💪', color: '#1d4ed8' },
  { id: "Women's Health",label: "Women's Health",   emoji: '🌸', color: '#e11d48' },
  { id: 'Nutrition',     label: 'Nutrition',        emoji: '🥗', color: '#10b981' },
  { id: 'Fitness',       label: 'Fitness',          emoji: '🏋️', color: '#f97316' },
  { id: 'Wellness',      label: 'Wellness',         emoji: '🧘', color: '#8b5cf6' },
  { id: 'Fasting',       label: 'Fasting',          emoji: '⏱️', color: '#f59e0b' },
  { id: 'Hormones',      label: 'Hormones',         emoji: '⚗️', color: '#ec4899' },
  { id: 'Mental Health', label: 'Mental Health',    emoji: '🧠', color: '#6366f1' },
  { id: 'Health',        label: 'Health',           emoji: '❤️', color: '#ef4444' },
];

// ─── Fallback static posts (shown when DB has no content) ───
const STATIC_POSTS = [
  {
    _id: 's1', slug: 'autophagy', title: 'The Autophagy Secret: How Fasting Rewires Your Cells',
    category: 'Fasting', emoji: '🔬', time: '5 min',
    featuredImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    content: 'Autophagy is your body\'s cellular recycling process...'
  },
  {
    _id: 's2', slug: 'sugar-drop', title: 'The Sugar Drop Phase Explained',
    category: 'Fasting', emoji: '📉', time: '4 min',
    featuredImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    content: 'What happens in the first 12 hours of a fast...'
  },
  {
    _id: 's3', slug: 'fat-burn', title: 'Entering Fat Burn: The Metabolic Switch',
    category: 'Nutrition', emoji: '🔥', time: '4 min',
    featuredImage: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    content: 'Between 12–18 hours, glycogen stores deplete...'
  },
];

export default function LibraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');

  const publishedPosts = useQuery(api.admin.getPublishedArticles, { category: selectedCat === 'All' ? undefined : selectedCat });

  // Merge DB posts with static fallback
  const allPosts = (publishedPosts && publishedPosts.length > 0) ? publishedPosts : STATIC_POSTS;
  const filtered = allPosts.filter(p => {
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const openPost = (post: any) => {
    router.push({
      pathname: '/library/[slug]' as any,
      params: {
        slug: post.slug ?? post._id,
        title: post.title,
        body: post.content ?? '',
        category: post.category ?? '',
        emoji: (post as any).emoji ?? '📖',
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>📚 {t('wellness.library.title', 'Bluom Library')}</Text>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 1 }}>{t('wellness.library.subtitle', 'Curated Knowledge')}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('wellness.library.search', 'Search articles...')}
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, fontSize: 14, color: '#1e293b', padding: 0 }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Category Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {FEATURE_CATEGORIES.map(cat => {
          const active = selectedCat === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? cat.color : '#f1f5f9' }}
            >
              <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : '#64748b' }}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Article List ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: getBottomContentPadding(insets.bottom, 24), gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#94a3b8' }}>{t('wellness.library.noResults', 'No articles found')}</Text>
            <Text style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>{t('wellness.library.noResultsSub', 'Try a different category or search term')}</Text>
          </View>
        ) : (
          filtered.map((post) => <ArticleCard key={(post as any)._id} post={post as any} onPress={() => openPost(post)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Article Card – 1 per row ────────────────────────────────
function ArticleCard({ post, onPress }: { post: any; onPress: () => void }) {
  const catColor = FEATURE_CATEGORIES.find(c => c.id === post.category)?.color ?? '#2563eb';
  const emoji    = (post as any).emoji ?? '📖';
  const timeStr  = (post as any).time ?? (post.content ? `${Math.max(1, Math.ceil((post.content?.length ?? 0) / 800))} min` : '');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}
    >
      {/* Image */}
      {post.featuredImage ? (
        <View style={{ height: 180, width: '100%', backgroundColor: '#e2e8f0' }}>
          <Image source={{ uri: post.featuredImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.18)' }} />
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <View style={{ backgroundColor: catColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{emoji} {post.category}</Text>
            </View>
          </View>
          {timeStr ? (
            <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⏱ {timeStr}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ height: 64, backgroundColor: catColor + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        </View>
      )}

      {/* Text */}
      <View style={{ padding: 16 }}>
        {!post.featuredImage && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ backgroundColor: catColor + '18', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
              <Text style={{ color: catColor, fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>{post.category}</Text>
            </View>
            {timeStr ? <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>⏱ {timeStr}</Text> : null}
          </View>
        )}
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#1e293b', lineHeight: 23, marginBottom: 6 }}>{post.title}</Text>
        {post.content ? (
          <Text numberOfLines={2} style={{ fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 12 }}>
            {post.content.replace(/\*\*/g, '').replace(/•/g, '').slice(0, 120)}…
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: catColor, fontWeight: '800', fontSize: 13 }}>Read more</Text>
          <Ionicons name="arrow-forward" size={13} color={catColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
