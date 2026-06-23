import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import MeditationPlayerScreen from '../app/meditation-player';
import { SOUNDSCAPES } from '../utils/soundscapes';
import { SoundEffect, triggerSound } from '../utils/soundEffects';
import { getBottomContentPadding } from '@/utils/layout';
import { MEDITATION_FILTERS } from '../constants/meditationFilters';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

interface MeditationHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

export default function MeditationHub({ userId, onClose }: MeditationHubProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [soundscapeSubFilter, setSoundscapeSubFilter] = useState<string | null>(null);

  useEffect(() => {
    setSoundscapeSubFilter(null);
  }, [selectedCategory]);

  // Data fetching - Fetch all to filter locally and instantly
  const allSessions = useQuery(api.meditation.getSessions, {});
  
  const rawSessions = useMemo(() => {
    if (!allSessions) return undefined;
    if (!selectedCategory) return allSessions;
    return allSessions.filter(s => 
      s.category === selectedCategory || 
      (s.tags && s.tags.includes(selectedCategory))
    );
  }, [allSessions, selectedCategory]);

  // Fallback data
  
  const getLocalizedField = (item: any, field: string) => {
    if (!item) return '';
    const localizations = item[field + 'Localizations'];
    if (localizations && localizations[currentLang]) {
      return localizations[currentLang];
    }
    return item[field] || '';
  };

  const getLocalizedAudio = (item: any) => {
    if (!item) return '';
    if (item.audioUrls && item.audioUrls[currentLang]) {
      return item.audioUrls[currentLang];
    }
    return item.audioUrl || '';
  };

  const fallbackSessions = useMemo(() => [
    { _id: '1', title: t('wellness.fallbackSessions.deepSleepTitle', 'Deep Sleep Journey'), category: 'sleep', duration: 15, description: t('wellness.fallbackSessions.deepSleepDesc', 'A calming guided session to drift into deep sleep.'), tags: ['sleep', 'Rest'], coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '2', title: t('wellness.fallbackSessions.morningClarityTitle', 'Morning Clarity'), category: 'morning', duration: 5, description: t('wellness.fallbackSessions.morningClarityDesc', 'Start your day with a clear mind and focused energy.'), tags: ['morning', 'Focus'], coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '3', title: t('wellness.fallbackSessions.quickResetTitle', 'Quick Reset'), category: 'focus', duration: 3, description: t('wellness.fallbackSessions.quickResetDesc', 'A short reset to recenter during a busy day.'), tags: ['focus', 'Quick'], coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '4', title: t('wellness.fallbackSessions.anxietyReleaseTitle', 'Anxiety Release'), category: 'anxiety', duration: 12, description: t('wellness.fallbackSessions.anxietyReleaseDesc', 'Let go of tension and find your inner calm.'), tags: ['anxiety', 'Calm'], coverImage: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '5', title: t('wellness.fallbackSessions.selfLoveTitle', 'Self-Love Pause'), category: 'self-love', duration: 8, description: t('wellness.fallbackSessions.selfLoveDesc', 'Practice compassion and gratitude.'), tags: ['self-love', 'Compassion'], coverImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece097a?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
  ].filter(s => !selectedCategory || s.category === selectedCategory || s.tags.includes(selectedCategory)), [selectedCategory]);

  const combinedSoundscapes = useMemo(() => {
    const local = [SOUNDSCAPES.rain, SOUNDSCAPES.forest, SOUNDSCAPES.ocean, SOUNDSCAPES.brownNoise].map((ss, idx) => ({
      _id: `local-${ss.id}`,
      title: t('wellness.soundscapes.' + ss.id, ss.name),
      description: ss.description,
      isLocal: true,
      emoji: idx === 0 ? '🌧' : idx === 1 ? '🌲' : idx === 2 ? '🌊' : '🎧',
      localRef: ss,
      coverImage: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=300&auto=format&fit=crop',
      duration: 0,
      videoUrl: undefined,
      visualType: undefined,
    }));
    const fromDb = allSessions 
      ? allSessions.filter((s: any) => s.type === 'soundscape' || (s.category && s.category.toLowerCase() === 'soundscapes'))
      : [];
    return [...local, ...fromDb];
  }, [allSessions, t]);

  const filteredSoundscapes = useMemo(() => {
    if (!combinedSoundscapes) return [];
    if (!soundscapeSubFilter) return combinedSoundscapes;
    
    return combinedSoundscapes.filter((ss: any) => {
      const titleLower = (ss.title || ss.name || '').toLowerCase();
      const descLower = (ss.description || ss.descriptionLocalizations?.pt || '').toLowerCase();
      const tags = (ss.tags || []).map((t: string) => t.toLowerCase());
      
      const matchWord = (word: string) => 
        titleLower.includes(word) || descLower.includes(word) || tags.includes(word);
        
      if (soundscapeSubFilter === 'rain') {
        return matchWord('rain') || matchWord('shower') || ss.localRef?.id === 'rain';
      }
      if (soundscapeSubFilter === 'forest') {
        return matchWord('forest') || matchWord('wood') || matchWord('bird') || matchWord('nature') || ss.localRef?.id === 'forest';
      }
      if (soundscapeSubFilter === 'ocean') {
        return matchWord('ocean') || matchWord('wave') || matchWord('sea') || matchWord('beach') || ss.localRef?.id === 'ocean';
      }
      if (soundscapeSubFilter === 'noise') {
        return matchWord('noise') || matchWord('white') || matchWord('brown') || matchWord('pink') || ss.localRef?.id === 'brownNoise';
      }
      return true;
    });
  }, [combinedSoundscapes, soundscapeSubFilter]);

  const displaySessions = useMemo(() => {
    if (selectedCategory === 'soundscape') {
      return filteredSoundscapes;
    }
    return rawSessions ?? fallbackSessions;
  }, [selectedCategory, filteredSoundscapes, rawSessions, fallbackSessions]);
  
  // Groupings for the UI — prefer admin-curated flags, fall back to array slice
  const featuredSessions = useMemo(() => {
    if (selectedCategory === 'soundscape') return [];
    const featured = displaySessions.filter((s: any) => s.isFeatured);
    return featured.length > 0 ? featured : displaySessions.slice(0, 3);
  }, [displaySessions, selectedCategory]);
  
  const trendingSessions = useMemo(() => {
    if (selectedCategory === 'soundscape') return [];
    const trending = displaySessions.filter((s: any) => s.isTrending);
    return trending.length > 0 ? trending : displaySessions.slice(0, 4);
  }, [displaySessions, selectedCategory]);

  const quickSessions = useMemo(() => displaySessions.filter((s: any) => (s.duration ?? 0) <= 5), [displaySessions]);
  const deepDiveSessions = useMemo(() => displaySessions.filter((s: any) => (s.duration ?? 0) > 10), [displaySessions]);

  const handleStartSession = (session: any) => {
    if (session.coverImage) Image.prefetch(session.coverImage);
    setActiveSession(session);
    setShowMeditationPlayer(true);
  };

  const handleStartSoundscape = (soundscape: any) => {
    setSelectedSoundscape(soundscape);
    setActiveSession({ title: soundscape.name, duration: 0 });
    setShowMeditationPlayer(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('wellness.meditationHub.goodMorning', 'Good morning');
    if (hour < 17) return t('wellness.meditationHub.goodAfternoon', 'Good afternoon');
    return t('wellness.meditationHub.goodEvening', 'Good evening');
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      {/* SafeAreaView with edges=['bottom'] only — top is handled explicitly in header to avoid double-padding */}
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header — explicit paddingTop from insets prevents top cut-off on intermittent SafeArea timing issues */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>{t('wellness.meditationHub.readyToUnwind', 'Ready to unwind?')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) + 20 }}
        >
          {/* Categories Horizontal */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[styles.categoryPill, selectedCategory === null && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryPillText, selectedCategory === null && styles.categoryPillTextActive]}>{t('wellness.meditationHub.allFilters', 'All Filters')}</Text>
            </TouchableOpacity>
            {MEDITATION_FILTERS.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.emoji}</Text>
                <Text style={[styles.categoryPillText, selectedCategory === cat.id && styles.categoryPillTextActive]}>{t(`wellness.meditationFilters.${cat.id}`, cat.name)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Soundscapes Sub-Filters */}
          {selectedCategory === 'soundscape' && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={[styles.categoryScroll, { paddingTop: 0, paddingBottom: 16 }]}
            >
              {[
                { id: null, name: t('wellness.meditationHub.allFilters', 'All'), emoji: '🎧' },
                { id: 'rain', name: t('wellness.soundscapes.rain', 'Rain'), emoji: '🌧' },
                { id: 'forest', name: t('wellness.soundscapes.forest', 'Forest'), emoji: '🌲' },
                { id: 'ocean', name: t('wellness.soundscapes.ocean', 'Ocean'), emoji: '🌊' },
                { id: 'noise', name: t('wellness.soundscapes.brownNoise', 'Noise'), emoji: '💤' },
              ].map(sub => (
                <TouchableOpacity
                  key={sub.id ?? 'all'}
                  style={[styles.categoryPill, soundscapeSubFilter === sub.id && styles.categoryPillActive]}
                  onPress={() => setSoundscapeSubFilter(sub.id)}
                >
                  <Text style={{ fontSize: 13, marginRight: 4 }}>{sub.emoji}</Text>
                  <Text style={[styles.categoryPillText, soundscapeSubFilter === sub.id && styles.categoryPillTextActive]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Featured Sessions — swipable carousel driven by admin isFeatured toggle */}
          {!selectedCategory && featuredSessions.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <Text style={styles.sectionTitle}>{t('wellness.meditationHub.featured', 'Featured')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width - 32} // Card (width-48) + Gap (16)
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
              >
                {featuredSessions.map((session: any) => (
                  <TouchableOpacity
                    key={session._id}
                    style={[styles.heroCard, { width: width - 48 }]}
                    onPress={() => handleStartSession(session)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: session.coverImageLandscape || session.coverImage }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.heroContent}>
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{t('wellness.meditationHub.featuredBadge', '✦ FEATURED')}</Text>
                      </View>
                      <Text style={styles.heroTitle}>{getLocalizedField(session, 'title')}</Text>
                      <Text style={styles.heroDuration}>
                        {session.duration} min · {(() => { const cat = MEDITATION_FILTERS.find((c: any) => c.id === session.category); return cat ? t(`wellness.meditationFilters.${cat.id}`, cat.name) : 'Session'; })() || 'Session'}
                      </Text>
                    </View>
                    <View style={styles.heroPlay}>
                      <Ionicons name="play" size={24} color="#1e293b" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section: Trending Right Now */}
          {trendingSessions.length > 0 && !selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('wellness.meditationHub.trending', 'Trending Right Now')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {trendingSessions.map(session => (
                   <TouchableOpacity key={session._id} style={styles.squareCard} onPress={() => handleStartSession(session)}>
                     <Image source={{ uri: session.coverImage }} style={styles.squareCardImg} />
                     <View style={styles.squarePlay}><Ionicons name="play" size={16} color="#fff" /></View>
                     <Text style={styles.squareCardTitle} numberOfLines={2}>{getLocalizedField(session, 'title')}</Text>
                     <Text style={styles.squareCardSub}>{session.duration} min</Text>
                   </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Soundscapes Filter Selection */}
          {!selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('wellness.meditationHub.soundscapes', 'Soundscapes')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {[
                  { id: 'rain', name: t('wellness.soundscapes.rain', 'Rain'), emoji: '🌧' },
                  { id: 'forest', name: t('wellness.soundscapes.forest', 'Forest'), emoji: '🌲' },
                  { id: 'ocean', name: t('wellness.soundscapes.ocean', 'Ocean'), emoji: '🌊' },
                  { id: 'noise', name: t('wellness.soundscapes.brownNoise', 'Noise'), emoji: '🎧' },
                ].map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.soundscapeCard} 
                    onPress={() => {
                      setSelectedCategory('soundscape');
                      setSoundscapeSubFilter(item.id);
                    }}
                  >
                    <View style={styles.soundscapeIconBox}>
                      <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                    </View>
                    <Text style={styles.soundscapeTitle}>{item.name}</Text>
                    <View style={styles.soundscapePlay}>
                      <Ionicons name="filter-outline" size={12} color="#2563eb" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Standard List (Rendered below if filtered, or as "Recently Added" if not) */}
          <View style={[styles.section, { paddingHorizontal: 20 }]}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'soundscape'
                ? t('wellness.meditationHub.soundscapes', 'Soundscapes')
                : selectedCategory 
                  ? t('wellness.meditationHub.allSessions', 'All Sessions') 
                  : t('wellness.meditationHub.recentlyAdded', 'Recently Added')}
            </Text>
            
            {!displaySessions ? (
              <ActivityIndicator size="small" color="#2563eb" style={{marginTop: 20}} />
            ) : (
              displaySessions.map((session: any) => (
                <TouchableOpacity 
                  key={session._id} 
                  style={styles.listCard} 
                  onPress={() => session.isLocal ? handleStartSoundscape(session.localRef) : handleStartSession(session)}
                >
                  {session.isLocal ? (
                    <View style={[styles.listCardImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.surfaceMuted }]}>
                      <Text style={{ fontSize: 24 }}>{session.emoji}</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: session.coverImage }} style={styles.listCardImg} />
                  )}
                  <View style={styles.listCardInfo}>
                    <Text style={styles.listCardTitle}>{session.isLocal ? session.title : getLocalizedField(session, 'title')}</Text>
                    <Text style={styles.listCardSub} numberOfLines={1}>{session.isLocal ? session.description : getLocalizedField(session, 'description')}</Text>
                    <Text style={styles.listCardDuration}>{session.isLocal ? t('wellness.loopAmbient', 'Ambient Loop') : `${session.duration} min`}</Text>
                  </View>
                  <View style={styles.listCardPlay}>
                    <Ionicons name="play" size={18} color="#2563eb" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Player Modal */}
      {showMeditationPlayer && (
        <MeditationPlayerScreen
          visible={showMeditationPlayer}
          onClose={() => {
            setShowMeditationPlayer(false);
            setSelectedSoundscape(null);
            setActiveSession(null);
          }}
          soundscape={selectedSoundscape}
          audioUrl={getLocalizedAudio(activeSession)}
          sessionTitle={getLocalizedField(activeSession, 'title')}
          coverImage={activeSession?.coverImage}
          videoUrl={activeSession?.videoUrl}
          visualType={activeSession?.visualType}
          duration={activeSession?.duration}
        />
      )}
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceMuted },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.surfaceMuted,
  },
  headerGreeting: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: c.text, marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  
  categoryScroll: { paddingHorizontal: 20, gap: 10, paddingVertical: 16 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  categoryPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  categoryPillText: { fontSize: 14, fontWeight: '600', color: c.text },
  categoryPillTextActive: { color: '#fff' },

  heroCard: {
    height: 220, borderRadius: 24, overflow: 'hidden',
    justifyContent: 'flex-end', padding: 20, marginBottom: 28,
  },
  heroContent: { flex: 1, justifyContent: 'flex-end' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroDuration: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  heroPlay: {
    position: 'absolute', right: 20, bottom: 20,
    width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginHorizontal: 20, marginBottom: 14 },
  horizontalScroll: { paddingHorizontal: 20, gap: 14 },

  squareCard: { width: 140 },
  squareCardImg: { width: 140, height: 140, borderRadius: 20, backgroundColor: c.border },
  squarePlay: {
    position: 'absolute', right: 10, top: 104,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  squareCardTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 10, lineHeight: 18 },
  squareCardSub: { fontSize: 12, color: c.textMuted, marginTop: 4 },

  soundscapeCard: { width: 110, alignItems: 'center', gap: 8 },
  soundscapeIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: c.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  soundscapeTitle: { fontSize: 13, fontWeight: '600', color: c.text, textAlign: 'center' },
  soundscapePlay: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#dbeafe',
  },

  listCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.border,
  },
  listCardImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: c.border },
  listCardInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  listCardTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
  listCardSub: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
  listCardDuration: { fontSize: 11, fontWeight: '600', color: c.textMuted },
  listCardPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});

// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
