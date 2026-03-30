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
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import MeditationPlayerScreen from '../app/meditation-player';
import { SOUNDSCAPES } from '../utils/soundscapes';
import { SoundEffect, triggerSound } from '../utils/soundEffects';
import { getBottomContentPadding } from '@/utils/layout';
import { MEDITATION_FILTERS } from '../constants/meditationFilters';

const { width } = Dimensions.get('window');

interface MeditationHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

export default function MeditationHub({ userId, onClose }: MeditationHubProps) {
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

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
  const fallbackSessions = useMemo(() => [
    { _id: '1', title: 'Deep Sleep Journey', category: 'sleep', duration: 15, description: 'A calming guided session to drift into deep sleep.', tags: ['sleep', 'Rest'], coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '2', title: 'Morning Clarity', category: 'morning', duration: 5, description: 'Start your day with a clear mind and focused energy.', tags: ['morning', 'Focus'], coverImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '3', title: 'Quick Reset', category: 'focus', duration: 3, description: 'A short reset to recenter during a busy day.', tags: ['focus', 'Quick'], coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '4', title: 'Anxiety Release', category: 'anxiety', duration: 12, description: 'Let go of tension and find your inner calm.', tags: ['anxiety', 'Calm'], coverImage: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
    { _id: '5', title: 'Self-Love Pause', category: 'self-love', duration: 8, description: 'Practice compassion and gratitude.', tags: ['self-love', 'Compassion'], coverImage: 'https://images.unsplash.com/photo-1499209974431-9dddcece097a?q=80&w=800&auto=format&fit=crop', coverImageLandscape: undefined },
  ].filter(s => !selectedCategory || s.category === selectedCategory || s.tags.includes(selectedCategory)), [selectedCategory]);

  const displaySessions = rawSessions ?? fallbackSessions;
  
  // Groupings for the UI
  const featuredSession = displaySessions[0];
  const trendingSessions = displaySessions.slice(1, 5); // Just taking nearest for mockup logic
  const quickSessions = displaySessions.filter(s => (s.duration ?? 0) <= 5);
  const deepDiveSessions = displaySessions.filter(s => (s.duration ?? 0) > 10);

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
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>Ready to unwind?</Text>
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
              <Text style={[styles.categoryPillText, selectedCategory === null && styles.categoryPillTextActive]}>All Filters</Text>
            </TouchableOpacity>
            {MEDITATION_FILTERS.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.emoji}</Text>
                <Text style={[styles.categoryPillText, selectedCategory === cat.id && styles.categoryPillTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Featured Hero (Only if All is selected, else just show list) */}
          {!selectedCategory && featuredSession && (
            <TouchableOpacity style={styles.heroCard} onPress={() => handleStartSession(featuredSession)} activeOpacity={0.9}>
              <Image source={{ uri: featuredSession.coverImageLandscape || featuredSession.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
              
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>RECOMMENDED</Text>
                </View>
                <Text style={styles.heroTitle}>{featuredSession.title}</Text>
                <Text style={styles.heroDuration}>{featuredSession.duration} min · {MEDITATION_FILTERS.find(c=>c.id === featuredSession.category)?.name || 'Session'}</Text>
              </View>
              <View style={styles.heroPlay}>
                <Ionicons name="play" size={24} color="#1e293b" />
              </View>
            </TouchableOpacity>
          )}

          {/* Section: Trending Right Now */}
          {trendingSessions.length > 0 && !selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Right Now</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {trendingSessions.map(session => (
                   <TouchableOpacity key={session._id} style={styles.squareCard} onPress={() => handleStartSession(session)}>
                     <Image source={{ uri: session.coverImage }} style={styles.squareCardImg} />
                     <View style={styles.squarePlay}><Ionicons name="play" size={16} color="#fff" /></View>
                     <Text style={styles.squareCardTitle} numberOfLines={2}>{session.title}</Text>
                     <Text style={styles.squareCardSub}>{session.duration} min</Text>
                   </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Soundscapes */}
          {!selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Soundscapes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {[SOUNDSCAPES.rain, SOUNDSCAPES.forest, SOUNDSCAPES.ocean, SOUNDSCAPES.brownNoise].map((ss, idx) => (
                   <TouchableOpacity key={idx} style={styles.soundscapeCard} onPress={() => handleStartSoundscape(ss)}>
                     <View style={styles.soundscapeIconBox}><Text style={{fontSize: 28}}>{idx===0?'🌧':idx===1?'🌲':idx===2?'🌊':'🎧'}</Text></View>
                     <Text style={styles.soundscapeTitle}>{ss.name}</Text>
                   </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Standard List (Rendered below if filtered, or as "Recently Added" if not) */}
          <View style={[styles.section, { paddingHorizontal: 20 }]}>
            <Text style={styles.sectionTitle}>{selectedCategory ? 'All Sessions' : 'Recently Added'}</Text>
            
            {!rawSessions && !fallbackSessions ? (
              <ActivityIndicator size="small" color="#2563eb" style={{marginTop: 20}} />
            ) : (
              displaySessions.map((session: any) => (
                <TouchableOpacity key={session._id} style={styles.listCard} onPress={() => handleStartSession(session)}>
                  <Image source={{ uri: session.coverImage }} style={styles.listCardImg} />
                  <View style={styles.listCardInfo}>
                    <Text style={styles.listCardTitle}>{session.title}</Text>
                    <Text style={styles.listCardSub} numberOfLines={1}>{session.description}</Text>
                    <Text style={styles.listCardDuration}>{session.duration} min</Text>
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
          audioUrl={activeSession?.audioUrl}
          sessionTitle={activeSession?.title}
          coverImage={activeSession?.coverImage}
          duration={activeSession?.duration}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerGreeting: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  
  categoryScroll: { paddingHorizontal: 20, gap: 10, paddingVertical: 16 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  categoryPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  categoryPillText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  categoryPillTextActive: { color: '#fff' },

  heroCard: {
    marginHorizontal: 20, height: 220, borderRadius: 24, overflow: 'hidden',
    justifyContent: 'flex-end', padding: 20, marginBottom: 28,
  },
  heroContent: { flex: 1, justifyContent: 'flex-end' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroDuration: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  heroPlay: {
    position: 'absolute', right: 20, bottom: 20,
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginHorizontal: 20, marginBottom: 14 },
  horizontalScroll: { paddingHorizontal: 20, gap: 14 },

  squareCard: { width: 140 },
  squareCardImg: { width: 140, height: 140, borderRadius: 20, backgroundColor: '#e2e8f0' },
  squarePlay: {
    position: 'absolute', right: 10, top: 104,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  squareCardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 10, lineHeight: 18 },
  squareCardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },

  soundscapeCard: { width: 110, alignItems: 'center' },
  soundscapeIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  soundscapeTitle: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' },

  listCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  listCardImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#e2e8f0' },
  listCardInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  listCardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  listCardSub: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  listCardDuration: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  listCardPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
