import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface ExerciseLibraryItem {
  _id: string;
  name: string;
  category: string;
  type: string;
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

export default function ExerciseSearchModal({
  visible,
  onClose,
  searchResults,
  loading,
  searchQuery,
  onSearchChange,
  onExerciseSelect
}: ExerciseSearchModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'muscleGroups'>('search');

  // Hardcoded muscle groups for visual UI mapping to image 6 (Horizontal scroll usually)
  const MUSCLE_GROUPS = [
    { title: 'Chest', icon: 'M' },
    { title: 'Back', icon: 'M' },
    { title: 'Biceps', icon: 'M' },
    { title: 'Triceps', icon: 'M' },
    { title: 'Shoulders', icon: 'M' },
    { title: 'Legs', icon: 'M' },
    { title: 'Core', icon: 'M' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Exercise</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#0f172a" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search(ex. Push Up)"
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
            <Ionicons name="search" size={16} color={activeTab === 'search' ? '#06b6d4' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'muscleGroups' && styles.tabActive]}
            onPress={() => setActiveTab('muscleGroups')}
          >
            <Ionicons name="barbell" size={16} color={activeTab === 'muscleGroups' ? '#06b6d4' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'muscleGroups' && styles.tabTextActive]}>Muscle Groups</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'muscleGroups' && (
            <View style={styles.muscleScroller}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={MUSCLE_GROUPS}
                keyExtractor={(item) => item.title}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.muscleCard}
                    onPress={() => {
                      onSearchChange(item.title);
                      setActiveTab('search');
                    }}
                  >
                    <View style={styles.muscleIconBox}>
                      <Ionicons name="body-outline" size={32} color="#0ea5e9" />
                    </View>
                    <Text style={styles.muscleCardTitle}>{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <Text style={styles.sectionHeader}>Search Results</Text>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#06b6d4" />
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="barbell-outline" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>No exercises found</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listItem} onPress={() => onExerciseSelect(item)}>
                  <View style={styles.listThumb}>
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name="image-outline" size={24} color="#94a3b8" />
                    )}
                  </View>
                  <View style={styles.listBody}>
                    <Text style={styles.listTitle}>
                      {typeof item.name === 'object' ? (item.name as any).en || (item.name as any).name || 'Exercise' : item.name}
                    </Text>
                    <Text style={styles.listSub}>{item.muscleGroups?.[0] || item.category || 'Various'}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabActive: {
    borderBottomColor: '#06b6d4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#06b6d4',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  muscleScroller: {
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  muscleCard: {
    alignItems: 'center',
    width: 72,
  },
  muscleIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  listBody: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  listSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
