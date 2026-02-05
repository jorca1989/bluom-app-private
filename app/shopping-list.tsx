import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Image, Alert, Modal, TextInput } from 'react-native';
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
  'Produce',
  'Dairy',
  'Meat',
  'Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
];

export default function ShoppingListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const { isPro, isLoading: isAccessLoading, promptUpgrade } = useAccessControl();

  const [showAddModal, setShowAddModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftQty, setDraftQty] = useState('1');

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

  const loading = !isClerkLoaded || isAccessLoading || (clerkUser && convexUser === undefined) || (convexUser && items === undefined);

  // Freemium Limit: 2 Items
  const totalItemsCount = (items ?? []).length;
  const canAddAnother = isPro || totalItemsCount < 2;
  const [showUpgrade, setShowUpgrade] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Shopping List</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => {
            if (!convexUser?._id) return;
            if (!canAddAnother) {
              promptUpgrade('Free plan limited to 2 items. Upgrade for unlimited.');
              return;
            }
            triggerSound(SoundEffect.UI_TAP);
            setShowAddModal(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading your list...</Text>
        </View>
      ) : !items || items.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: getBottomContentPadding(insets.bottom, 24) }]}>
          <View style={styles.emptyCard}>
            <Image source={require('../assets/images/logo.png')} style={styles.mascot} />
            <Text style={styles.emptyTitle}>Your fridge is looking a bit empty!</Text>
            <Text style={styles.emptySub}>
              Add ingredients from a recipe to get started.
            </Text>

            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => {
                  if (!convexUser?._id) return;
                  if (!canAddAnother) {
                    promptUpgrade('Free plan limited to 2 items. Upgrade for unlimited.');
                    return;
                  }
                  triggerSound(SoundEffect.UI_TAP);
                  setShowAddModal(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#ffffff" />
                <Text style={styles.actionPrimaryText}>Add item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionSecondary]}
                onPress={() => {
                  triggerSound(SoundEffect.UI_TAP);
                  router.push('/recipes');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="book-outline" size={18} color="#1e293b" />
                <Text style={styles.actionSecondaryText}>Browse recipes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: getBottomContentPadding(insets.bottom, 24),
          }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
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
                <Ionicons name="trash" size={20} color="#ffffff" />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            );

            return (
              <Swipeable renderRightActions={rightActions} overshootRight={false}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    if (!convexUser?._id) return;
                    setCompleted({ userId: convexUser._id, itemId: item._id, completed: !item.completed }).catch(() => {
                      Alert.alert('Error', 'Could not update item. Please try again.');
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
                    {item.completed ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.name, item.completed && styles.nameDone]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.qty, item.completed && styles.qtyDone]} numberOfLines={1}>
                      {typeof item.quantity === 'number' ? `${item.quantity}` : String(item.quantity)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
        />
      )}

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          router.push('/premium');
        }}
        title="Upgrade to Pro"
        message="Free users can add 1 item to Shopping List. Upgrade to add unlimited items and sync across devices."
        upgradeLabel="View Pro Plans"
      />

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
          <View style={[styles.modalCard, { paddingBottom: getBottomContentPadding(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add item</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetAddModal();
                }}
                style={styles.modalClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Item</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="e.g. Eggs"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              autoCapitalize="sentences"
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
              <Text style={styles.saveBtnText}>Add to list</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ebf1fe' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { color: '#64748b', fontWeight: '600' },
  sectionHeader: { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#475569', textTransform: 'uppercase' },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  rowText: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  nameDone: { color: '#94a3b8', textDecorationLine: 'line-through' },
  qty: { fontSize: 13, fontWeight: '800', color: '#64748b' },
  qtyDone: { color: '#cbd5e1', textDecorationLine: 'line-through' },
  deleteAction: {
    width: 92,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mascot: { width: 72, height: 72, marginBottom: 12, resizeMode: 'contain' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
  emptySub: { marginTop: 8, fontSize: 14, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  emptyActions: { marginTop: 16, width: '100%', flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionPrimary: { backgroundColor: '#2563eb' },
  actionPrimaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  actionSecondary: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  actionSecondaryText: { color: '#1e293b', fontSize: 14, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },

});


