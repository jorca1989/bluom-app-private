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
  Alert,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import MeditationPlayerScreen from '../app/meditation-player';
import { SOUNDSCAPES } from '../utils/soundscapes'; // Assuming this exists or was used previously
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SoundEffect, triggerSound } from '../utils/soundEffects';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomContentPadding } from '@/utils/layout';
import {
  Moon, Sun, Target, Heart, Shield, Play, Crown, Brain
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface MeditationHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

const categories = [
  { id: 'sleep', name: 'Better Sleep', icon: Moon, color: '#6366f1' },
  { id: 'morning', name: 'Morning Boost', icon: Sun, color: '#f59e0b' },
  { id: 'focus', name: 'Focus', icon: Target, color: '#3b82f6' },
  { id: 'self-love', name: 'Self-Love', icon: Heart, color: '#ec4899' },
  { id: 'anxiety', name: 'Anxiety Relief', icon: Shield, color: '#10b981' },
  { id: 'sovereignty', name: 'Sovereignty & Power', icon: Crown, color: '#b45309' },
  { id: 'strategic-mindset', name: 'Strategic Mindset', icon: Brain, color: '#7c3aed' },
];

export default function MeditationHub({ userId, onClose }: MeditationHubProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const sessions = useQuery(api.meditation.getSessions, { category: selectedCategory ?? undefined });
  // const user = useQuery(api.users.getUserById, { userId }); // define if needed

  useEffect(() => {
    triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
  }, []);

  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [logId, setLogId] = useState<Id<"meditationLogs"> | null>(null);

  const fallbackSessions = useMemo(
    () => [
      {
        _id: '1',
        title: 'Deep Sleep Journey',
        category: 'sleep',
        duration: 10,
        description: 'A calming guided session to help you drift into deep sleep.',
        tags: ['Sleep', 'Rest'],
      },
      {
        _id: '2',
        title: 'Morning Clarity',
        category: 'morning',
        duration: 5,
        description: 'Start your day with a clear mind and focused energy.',
        tags: ['Morning', 'Focus'],
      },
      {
        _id: '3',
        title: 'Quick Reset',
        category: 'focus',
        duration: 3,
        description: 'A short reset to recenter during a busy day.',
        tags: ['Focus', 'Quick'],
      },
      {
        _id: '4',
        title: 'Self-Love Pause',
        category: 'self-love',
        duration: 7,
        description: 'A gentle session to practice compassion and gratitude.',
        tags: ['Love', 'Compassion'],
      },
      {
        _id: '5',
        title: 'Anxiety Release',
        category: 'anxiety',
        duration: 12,
        description: 'Let go of tension and find your inner calm.',
        tags: ['Anxiety', 'Calm'],
      },
      // Fallback: If category filtered, show all for robust demo if fetch fails
    ].filter(s => !selectedCategory || s.category === selectedCategory),
    [selectedCategory]
  );

  const displaySessions = sessions || fallbackSessions;

  const handleStartSession = (session: any) => {
    setActiveSession(session);
    setShowMeditationPlayer(true);
  };

  const handleStartSoundscape = (soundscape: any) => {
    setSelectedSoundscape(soundscape);
    setActiveSession({
      title: soundscape.name,
      duration: 0, // infinite
    });
    setShowMeditationPlayer(true);
  };

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>Meditation Hub</Text>
            <Text style={styles.headerSubtitle}>Choose your path to inner calm</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Quote */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteEmoji}>✨</Text>
            <Text style={styles.quoteText}>Take a deep breath, you deserve calm.</Text>
            <Text style={styles.quoteSubtext}>Start your meditation journey today</Text>
          </View>

          {/* Soundscape Quick Access */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Soundscapes</Text>
            <TouchableOpacity
              style={styles.soundscapeCard}
              onPress={() => handleStartSoundscape(SOUNDSCAPES.rain)}
            >
              <Text style={styles.soundscapeEmoji}>🎵</Text>
              <View style={styles.soundscapeInfo}>
                <Text style={styles.soundscapeTitle}>Ambient Soundscapes</Text>
                <Text style={styles.soundscapeDesc}>Rain, ocean, forest, and more</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.categoryGrid}>
              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === null && styles.categoryCardActive
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#e2e8f0' }]}>
                  <Ionicons name="infinite" size={24} color="#64748b" />
                </View>
                <Text style={styles.categoryName}>All</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.id && styles.categoryCardActive
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: cat.color + '20' }]}>
                    <cat.icon size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sessions List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name || 'Sessions'
                : 'All Sessions'}
            </Text>
            {!displaySessions ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              displaySessions.map((session: any) => {
                const CategoryIcon = categories.find(c => c.id === session.category)?.icon || Target;
                const categoryColor = categories.find(c => c.id === session.category)?.color || '#6366f1';

                return (
                  <TouchableOpacity
                    key={session._id ?? session.title}
                    onPress={() => handleStartSession(session)}
                    style={styles.sessionCard}
                    activeOpacity={0.85}
                  >
                    <View style={styles.sessionLeft}>
                      <View style={[styles.sessionIconContainer, { backgroundColor: categoryColor + '20' }]}>
                        <CategoryIcon size={24} color={categoryColor} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTitle}>{session.title}</Text>

                        {(session.tags || []).length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                            {(session.tags || []).map((t: string) => (
                              <View key={t} style={styles.tagContainer}>
                                <Text style={styles.tagText}>{t}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <Text style={styles.sessionDescription} numberOfLines={2}>{session.description}</Text>
                        <Text style={styles.sessionDuration}>{`${session.duration} min`}</Text>
                      </View>
                    </View>
                    <View style={styles.playButtonSmall}>
                      <Ionicons name="play" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Meditation Player Modal */}
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
          duration={activeSession?.duration}
          logId={logId}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quoteCard: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  quoteEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  quoteSubtext: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 60) / 3,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  categoryCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  soundscapeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  soundscapeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  soundscapeInfo: {
    flex: 1,
  },
  soundscapeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  soundscapeDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 12,
    color: '#94a3b8',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tagContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  playButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
