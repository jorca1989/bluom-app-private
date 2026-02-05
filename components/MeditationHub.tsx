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
import { SOUNDSCAPES } from '../utils/soundscapes';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SoundEffect, triggerSound } from '../utils/soundEffects';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomContentPadding } from '@/utils/layout';

const { width } = Dimensions.get('window');

interface MeditationHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

const categories = [
  { id: 'sleep', name: 'Better Sleep', emoji: '🌙', color: '#6366f1' },
  { id: 'morning', name: 'Morning Boost', emoji: '☀️', color: '#f59e0b' },
  { id: 'focus', name: 'Focus', emoji: '🎯', color: '#3b82f6' },
  { id: 'self-love', name: 'Self-Love', emoji: '💗', color: '#ec4899' },
  { id: 'anxiety', name: 'Anxiety Relief', emoji: '🛡️', color: '#10b981' },
];

export default function MeditationHub({ userId, onClose }: MeditationHubProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const sessions = useQuery(api.meditation.getSessions, { category: selectedCategory ?? undefined });
  const user = useQuery(api.users.getUserById, { userId });

  useEffect(() => {
    triggerSound(SoundEffect.ENTER_MEDITATION_HUB);
  }, []);

  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
  const [selectedSoundscape, setSelectedSoundscape] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [logId, setLogId] = useState<Id<"meditationLogs"> | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fallbackSessions = useMemo(
    () => [
      {
        _id: undefined as any,
        title: 'Deep Sleep Journey',
        category: 'sleep',
        duration: 10,
        description: 'A calming guided session to help you drift into deep sleep.',
      },
      {
        _id: undefined as any,
        title: 'Morning Clarity',
        category: 'morning',
        duration: 5,
        description: 'Start your day with a clear mind and focused energy.',
      },
      {
        _id: undefined as any,
        title: 'Quick Reset',
        category: 'focus',
        duration: 3,
        description: 'A short reset to recenter during a busy day.',
      },
      {
        _id: undefined as any,
        title: 'Self-Love Pause',
        category: 'self-love',
        duration: 7,
        description: 'A gentle session to practice compassion and gratitude.',
      },
      {
        _id: undefined as any,
        title: 'Anxiety Release',
        category: 'anxiety',
        duration: 12,
        description: 'Let go of tension and find your inner calm.',
      },
    ],
    []
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
                <Text style={styles.categoryEmoji}>🧠</Text>
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
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
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
                console.log("Session Tags:", session.tags);
                return (
                  <TouchableOpacity
                    key={session._id ?? session.title}
                    onPress={() => handleStartSession(session)}
                    style={styles.sessionCard}
                    activeOpacity={0.85}
                  >
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionEmoji}>
                        {categories.find(c => c.id === session.category)?.emoji || '🧘'}
                      </Text>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTitle}>{session.title}</Text>
                        {(session.tags || []).map((t: string) => (
                          <Text key={t} style={{ fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, overflow: 'hidden' }}>
                            {t}
                          </Text>
                        ))}
                        <Text style={styles.sessionDescription}>{session.description}</Text>
                        <Text style={styles.sessionDuration}>{`${session.duration} min`}</Text>
                      </View>
                    </View>
                    <Ionicons name="play-circle" size={32} color="#6366f1" />
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
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 8,
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
  sessionEmoji: {
    fontSize: 32,
    marginRight: 12,
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
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  }
});

