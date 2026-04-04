import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser as useClerkUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getBottomContentPadding } from '@/utils/layout';
import { Swipeable } from 'react-native-gesture-handler';
import { triggerSound, SoundEffect } from '@/utils/soundEffects';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useAccessControl } from '@/hooks/useAccessControl';

type ShoppingDoc = {
  _id: any;
  name: string;
  quantity: number | string;
  category:
  | 'Produce'
  | 'Dairy'
  | 'Meat'
  | 'Seafood'
  | 'Bakery'
  | 'Pantry'
  | 'Frozen'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Personal Care'
  | 'Other';
  completed: boolean;
};

const CATEGORY_ORDER: ShoppingDoc['category'][] = [
  'Produce', 'Dairy', 'Meat', 'Seafood', 'Bakery',
  'Pantry', 'Frozen', 'Beverages', 'Snacks',
  'Household', 'Personal Care', 'Other',
];

const CATEGORY_META: Record<ShoppingDoc['category'], { emoji: string; color: string }> = {
  Produce: { emoji: '🥦', color: '#22c55e' },
  Dairy: { emoji: '🥛', color: '#60a5fa' },
  Meat: { emoji: '🥩', color: '#f87171' },
  Seafood: { emoji: '🐟', color: '#38bdf8' },
  Bakery: { emoji: '🍞', color: '#fbbf24' },
  Pantry: { emoji: '🫙', color: '#a78bfa' },
  Frozen: { emoji: '🧊', color: '#67e8f9' },
  Beverages: { emoji: '🧃', color: '#34d399' },
  Snacks: { emoji: '🍿', color: '#fb923c' },
  Household: { emoji: '🧹', color: '#94a3b8' },
  'Personal Care': { emoji: '🧴', color: '#f472b6' },
  Other: { emoji: '🛒', color: '#cbd5e1' },
};

export default function ShoppingListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const { isPro, isLoading: isAccessLoading, promptUpgrade } = useAccessControl();

  const [showAddModal, setShowAddModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftQty, setDraftQty] = useState('1');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const items = useQuery(
    api.shoppingList.listForUser,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  ) as ShoppingDoc[] | undefined;

  const addItem = useMutation(api.shoppingList.addItem);
  const setCompleted = useMutation(api.shoppingList.setCompleted);
  const deleteItem = useMutation(api.shoppingList.deleteItem);

  const loading =
    !isClerkLoaded ||
    isAccessLoading ||
    (clerkUser && convexUser === undefined) ||
    (convexUser && items === undefined);

  const totalItemsCount = (items ?? []).length;
  const completedCount = (items ?? []).filter((i) => i.completed).length;
  const canAddAnother = isPro || totalItemsCount < 2;

  const sections = useMemo(() => {
    const list = items ?? [];
    const byCat = new Map<ShoppingDoc['category'], ShoppingDoc[]>();
    for (const it of list) {
      if (!byCat.has(it.category)) byCat.set(it.category, []);
      byCat.get(it.category)!.push(it);
    }
    for (const [cat, arr] of byCat) {
      arr.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
      byCat.set(cat, arr);
    }
    return CATEGORY_ORDER.filter((c) => (byCat.get(c)?.length ?? 0) > 0).map((c) => ({
      title: c,
      data: byCat.get(c)!,
    }));
  }, [items]);

  if (!isClerkLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!clerkUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Please sign in to use Shopping List</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resetAddModal = () => {
    setDraftName('');
    setDraftQty('1');
  };

  const openAdd = () => {
    if (!convexUser?._id) return;
    if (!canAddAnother) {
      promptUpgrade('Free plan limited to 2 items. Upgrade for unlimited.');
      return;
    }
    triggerSound(SoundEffect.UI_TAP);
    setShowAddModal(true);
  };

  const submitAdd = async () => {
    if (!convexUser?._id) return;
    if (!canAddAnother) {
      promptUpgrade('Free plan limited to 2 items. Upgrade for unlimited.');
      return;
    }
    const name = draftName.trim();
    if (!name) {
      Alert.alert('Missing item', 'Type an item name first.');
      return;
    }
    const qtyRaw = draftQty.trim();
    const qtyNum = Number(qtyRaw);
    const quantity: number | string =
      qtyRaw.length === 0 ? 1 : Number.isFinite(qtyNum) ? qtyNum : qtyRaw;

    try {
      triggerSound(SoundEffect.UI_TAP);
      await addItem({ userId: convexUser._id, name, quantity });
      setShowAddModal(false);
      resetAddModal();
    } catch {
      Alert.alert('Error', 'Could not add item. Please try again.');
    }
  };

  const handleClearCompleted = () => {
    const done = (items ?? []).filter((i) => i.completed);
    if (!done.length || !convexUser?._id) return;
    Alert.alert(
      'Clear completed',
      `Remove ${done.length} checked item${done.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            done.forEach((item) =>
              deleteItem({ userId: convexUser._id, itemId: item._id }).catch(() => { })
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Shopping List</Text>
          {totalItemsCount > 0 && (
            <Text style={styles.headerSub}>
              {completedCount}/{totalItemsCount} done
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar (only when items exist) ── */}
      {totalItemsCount > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((completedCount / totalItemsCount) * 100)}%` },
              ]}
            />
          </View>
          {completedCount > 0 && (
            <TouchableOpacity onPress={handleClearCompleted} activeOpacity={0.7}>
              <Text style={styles.clearBtn}>Clear done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading your list...</Text>
        </View>
      ) : !items || items.length === 0 ? (
        /* ── Empty state — no logo, clean and actionable ── */
        <View style={[styles.emptyWrap, { paddingBottom: getBottomContentPadding(insets.bottom, 24) }]}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyEmoji}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptySub}>Add items manually or pull straight from a recipe.</Text>

          <TouchableOpacity style={styles.emptyPrimaryBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.emptyPrimaryText}>Add first item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emptySecondaryBtn}
            onPress={() => router.push('/recipes')}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={16} color="#3b82f6" />
            <Text style={styles.emptySecondaryText}>Browse recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: getBottomContentPadding(insets.bottom, 24),
          }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const meta = CATEGORY_META[section.title as ShoppingDoc['category']];
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{meta.emoji}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={[styles.sectionPill, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[styles.sectionPillText, { color: meta.color }]}>
                    {section.data.length}
                  </Text>
                </View>
              </View>
            );
          }}
          renderItem={({ item }) => {
            const rightActions = () => (
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => {
                  if (!convexUser?._id) return;
                  deleteItem({ userId: convexUser._id, itemId: item._id }).catch(() => {
                    Alert.alert('Error', 'Could not delete item. Please try again.');
                  });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            );

            return (
              <Swipeable renderRightActions={rightActions} overshootRight={false}>
                <TouchableOpacity
                  style={[styles.row, item.completed && styles.rowDone]}
                  onPress={() => {
                    if (!convexUser?._id) return;
                    setCompleted({
                      userId: convexUser._id,
                      itemId: item._id,
                      completed: !item.completed,
                    }).catch(() => {
                      Alert.alert('Error', 'Could not update item.');
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
                    {item.completed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.name, item.completed && styles.nameDone]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.qtyBadge}>
                      <Text style={[styles.qty, item.completed && styles.qtyDone]}>
                        {typeof item.quantity === 'number' ? String(item.quantity) : item.quantity}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
        />
      )}

      {/* ── Upgrade modal ── */}
      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title="Upgrade to Pro"
        message="Free users can add up to 2 items. Upgrade for unlimited items and sync across devices."
        upgradeLabel="View Pro Plans"
      />

      {/* ── Add Item modal ── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowAddModal(false);
          resetAddModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.modalCard, { paddingBottom: getBottomContentPadding(insets.bottom, 16) }]}>
              {/* Handle */}
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add item</Text>
                <TouchableOpacity
                  onPress={() => { setShowAddModal(false); resetAddModal(); }}
                  style={styles.modalClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Item name</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="e.g. Eggs"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoCapitalize="sentences"
                autoFocus
                returnKeyType="next"
              />

              <Text style={styles.label}>Quantity</Text>
              <TextInput
                value={draftQty}
                onChangeText={setDraftQty}
                placeholder="e.g. 6"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={submitAdd}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={submitAdd} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.saveBtnText}>Add to list</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F0' },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Progress */
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#3b82f6',
  },
  clearBtn: { fontSize: 12, fontWeight: '700', color: '#3b82f6' },

  /* Shared */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { color: '#94a3b8', fontWeight: '600' },

  /* Empty */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyPrimaryBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  emptySecondaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emptySecondaryText: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  sectionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  sectionPillText: { fontSize: 11, fontWeight: '800' },

  /* Row */
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8e6e1',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rowDone: { opacity: 0.55 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxDone: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  nameDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  qtyBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qty: { fontSize: 12, fontWeight: '800', color: '#475569' },
  qtyDone: { color: '#cbd5e1' },

  /* Swipe delete */
  deleteAction: {
    width: 80,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  deleteText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.3)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#F5F4F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
    marginBottom: 14,
  },
  saveBtn: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
});