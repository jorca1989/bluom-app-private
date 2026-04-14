import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser as useClerkUser } from '@clerk/clerk-expo';

export interface ExerciseLibraryItem {
  _id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  thumbnailUrl?: string;
}

interface ExerciseSearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchResults: ExerciseLibraryItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onExerciseSelect: (ex: ExerciseLibraryItem) => void;
}

const MUSCLE_GROUPS = [
  { title: 'Chest', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { title: 'Back', image: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&q=80' },
  { title: 'Biceps', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80' },
  { title: 'Triceps', image: 'https://images.unsplash.com/photo-1530822847156-5df684ec5933?w=400&q=80' },
  { title: 'Shoulders', image: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=400&q=80' },
  { title: 'Legs', image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80' },
  { title: 'Core', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
  { title: 'Glutes', image: 'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=400&q=80' },
  { title: 'Pelvic Floor', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { title: 'Serratus', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
];

const EXERCISE_TYPES = ['Strength', 'Powerlifting', 'Hypertrophy', 'Isolation', 'Compound', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'Flexibility', 'Core', 'Women', 'Functional/Mobility', 'Warm-up/Activation', 'Post-workout Stretch', 'Calisthenics/Bodyweight', 'Plyometrics', 'Balance', 'Rehab', 'Posture'];

type Tab = 'search' | 'saved' | 'muscleGroups';

export default function ExerciseSearchModal({
  visible,
  onClose,
  searchResults,
  loading,
  searchQuery,
  onSearchChange,
  onExerciseSelect
}: ExerciseSearchModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { user: clerkUser } = useClerkUser();
  const insets = useSafeAreaInsets();

  // Look up the Convex user so we can query saved workouts
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const savedWorkouts = useQuery(
    api.savedWorkouts.getSavedWorkouts,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  // Filter search results by exercise type and query
  const filteredSearchResults = useMemo(() => {
    let results = searchResults;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(ex => {
        const name = typeof ex.name === 'object' ? (ex.name as any).en ?? (ex.name as any).name : ex.name;
        if (name && typeof name === 'string' && name.toLowerCase().includes(q)) return true;
        if (ex.category && ex.category.toLowerCase().includes(q)) return true;
        if (ex.muscleGroups && ex.muscleGroups.some(m => m.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    if (selectedType) {
      results = results.filter(ex =>
        ex.category?.toLowerCase() === selectedType.toLowerCase()
      );
    }

    return results;
  }, [searchResults, selectedType, searchQuery]);

  // Convert a saved videoWorkout into an ExerciseLibraryItem-compatible shape
  // so the parent's onExerciseSelect handler can use it
  const handleSavedWorkoutSelect = (workout: any) => {
    // Use first exercise name if available, else workout title
    const firstEx = workout.exercises?.[0];
    const syntheticItem: ExerciseLibraryItem = {
      _id: workout._id,
      name: firstEx?.name ?? workout.title,
      category: workout.category ?? 'Strength',
      muscleGroups: firstEx?.primaryMuscles ?? [],
      thumbnailUrl: workout.thumbnail,
    };
    onExerciseSelect(syntheticItem);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#0f172a" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search (e.g. Push Up)"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <Ionicons name="close-circle" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.tabActive]}
            onPress={() => setActiveTab('search')}
          >
            <Ionicons name="search" size={15} color={activeTab === 'search' ? '#06b6d4' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons name="bookmark" size={15} color={activeTab === 'saved' ? '#06b6d4' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              Saved{savedWorkouts && savedWorkouts.length > 0 ? ` (${savedWorkouts.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'muscleGroups' && styles.tabActive]}
            onPress={() => setActiveTab('muscleGroups')}
          >
            <Ionicons name="barbell" size={15} color={activeTab === 'muscleGroups' ? '#06b6d4' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'muscleGroups' && styles.tabTextActive]}>Muscles</Text>
          </TouchableOpacity>
        </View>

        {/* ── SAVED WORKOUTS TAB ── */}
        {activeTab === 'saved' && (
          <View style={styles.content}>
            <Text style={styles.sectionHeader}>Saved Workouts</Text>
            {savedWorkouts === undefined ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#06b6d4" />
              </View>
            ) : savedWorkouts.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="bookmark-outline" size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>No saved workouts yet</Text>
                <Text style={styles.emptySubText}>
                  Tap the bookmark icon on any workout to save it here
                </Text>
              </View>
            ) : (
              <FlatList
                data={savedWorkouts}
                keyExtractor={(item: any) => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.savedWorkoutItem}
                    onPress={() => handleSavedWorkoutSelect(item)}
                  >
                    {/* Thumbnail */}
                    <View style={styles.savedThumb}>
                      {item.thumbnail ? (
                        <Image
                          source={{ uri: item.thumbnail }}
                          style={styles.savedThumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="fitness" size={24} color="#94a3b8" />
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.savedWorkoutBody}>
                      <View style={styles.savedWorkoutTitleRow}>
                        <Text style={styles.savedWorkoutTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Ionicons name="bookmark" size={16} color="#06b6d4" />
                      </View>
                      <Text style={styles.savedWorkoutSub}>
                        {item.category} • {item.difficulty}
                      </Text>
                      {item.exercises?.[0]?.name && (
                        <Text style={styles.savedWorkoutExercise} numberOfLines={1}>
                          Main: {item.exercises[0].name}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* ── MUSCLE GROUPS TAB ── */}
        {activeTab === 'muscleGroups' && (
          <View style={styles.content}>
            <Text style={styles.sectionHeader}>Browse by Muscle</Text>
            <FlatList
              horizontal={false}
              numColumns={3}
              data={MUSCLE_GROUPS}
              keyExtractor={item => item.title}
              contentContainerStyle={styles.muscleGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.muscleCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    onSearchChange(item.title);
                    setActiveTab('search');
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.muscleCardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.muscleCardOverlay} />
                  <Text style={styles.muscleCardTitle}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── SEARCH RESULTS TAB ── */}
        {activeTab === 'search' && (
          <View style={styles.content}>
            {/* Exercise Type Filter */}
            <View style={styles.typeFilterWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterScroll}>
                <TouchableOpacity
                  style={[styles.typePill, !selectedType && styles.typePillActive]}
                  onPress={() => setSelectedType(null)}
                >
                  <Text style={[styles.typePillText, !selectedType && styles.typePillTextActive]}>All</Text>
                </TouchableOpacity>
                {EXERCISE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, selectedType === t && styles.typePillActive]}
                    onPress={() => setSelectedType(selectedType === t ? null : t)}
                  >
                    <Text style={[styles.typePillText, selectedType === t && styles.typePillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.sectionHeader}>
              {searchQuery ? `Results for "${searchQuery}"` : selectedType ? `${selectedType} Exercises` : 'All Exercises'}
              {filteredSearchResults.length > 0 && ` (${filteredSearchResults.length})`}
            </Text>

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#06b6d4" />
              </View>
            ) : filteredSearchResults.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="barbell-outline" size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>No exercises found</Text>
                <Text style={styles.emptySubText}>
                  {selectedType ? `No ${selectedType} exercises match your search` : 'Try a different search term or browse by muscle group'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredSearchResults}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.listItem} onPress={() => onExerciseSelect(item)}>
                    <View style={styles.listThumb}>
                      {item.thumbnailUrl ? (
                        <Image
                          source={{ uri: item.thumbnailUrl }}
                          style={styles.thumbImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={24} color="#94a3b8" />
                      )}
                    </View>
                    <View style={styles.listBody}>
                      <Text style={styles.listTitle}>
                        {typeof item.name === 'object'
                          ? (item.name as any).en ?? (item.name as any).name ?? 'Exercise'
                          : item.name}
                      </Text>
                      <View style={styles.listMetaRow}>
                        <Text style={styles.listSub}>
                          {item.muscleGroups?.[0] ?? item.category ?? 'Various'}
                        </Text>
                        {item.category && (
                          <View style={styles.typeChip}>
                            <Text style={styles.typeChipText}>{item.category}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color="#06b6d4" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0f172a' },
  // Tabs — 3 across
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: { borderBottomColor: '#06b6d4' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#06b6d4' },
  content: { flex: 1 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyText: { marginTop: 16, fontSize: 15, color: '#64748b', fontWeight: '600' },
  emptySubText: { marginTop: 8, fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  listContent: { paddingHorizontal: 20, paddingBottom: 60 },

  // Exercise type filter
  typeFilterWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  typeFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typePillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typePillTextActive: {
    color: '#ffffff',
  },

  // Search results list items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  listThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  listBody: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listSub: { fontSize: 12, color: '#94a3b8' },
  typeChip: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  typeChipText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },

  // Saved workouts items
  savedWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  savedThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  savedThumbImage: { width: '100%', height: '100%' },
  savedWorkoutBody: { flex: 1 },
  savedWorkoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  savedWorkoutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  savedWorkoutSub: { fontSize: 12, color: '#64748b', marginBottom: 3 },
  savedWorkoutExercise: { fontSize: 11, color: '#94a3b8' },

  // Muscle groups grid
  muscleGrid: { paddingHorizontal: 12, paddingBottom: 60 },
  muscleCard: {
    flex: 1,
    margin: 5,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#1e293b',
  },
  muscleCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  muscleCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  muscleCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});