import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useAccessControl } from '@/hooks/useAccessControl';
import { getBottomContentPadding } from '@/utils/layout';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';

type Category = 'Family' | 'Work' | 'Personal' | 'Grocery';

export default function TodoListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { isPro, promptUpgrade } = useAccessControl();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const todos = useQuery(
    api.todos.getTodos,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const addTodo = useMutation(api.todos.addTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const resetRoutine = useMutation(api.todos.dailyResetRoutine);

  const [input, setInput] = useState('');
  const [category, setCategory] = useState<Category>('Personal');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const linkPartner = useMutation(api.users.linkPartner);
  const unlinkPartner = useMutation(api.users.unlinkPartner);

  const partnerUser = useQuery(
    api.users.getUserById,
    convexUser?.partnerId ? { userId: convexUser.partnerId } : 'skip'
  );

  // Removed auto-redirect useEffect

  async function handleAdd() {
    if (!input.trim() || !convexUser?._id) return;

    // Freemium Limit: 3 Tasks
    const currentCount = todos?.length ?? 0;
    if (!isPro && currentCount >= 3) {
      promptUpgrade('Free plan limited to 3 tasks. Upgrade for unlimited.');
      return;
    }

    await addTodo({
      userId: convexUser._id,
      text: input.trim(),
      category
    });
    setInput('');
  }

  async function handleLinkPartner() {
    if (!partnerEmail.trim() || !convexUser?._id) return;
    setLinking(true);
    try {
      const res = await linkPartner({ userId: convexUser._id, partnerEmail: partnerEmail.trim() });
      Alert.alert('Linked!', `You are now synced with ${res.partnerName}.`);
      setShowPartnerModal(false);
      setPartnerEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not link partner.');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    if (!convexUser?._id) return;
    Alert.alert('Unlink Partner', 'Are you sure you want to stop syncing lists?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
        style: 'destructive',
        onPress: async () => {
          await unlinkPartner({ userId: convexUser._id });
          Alert.alert('Unlinked', 'Shared lists disabled.');
        }
      }
    ]);
  }

  async function handleReset() {
    if (!convexUser?._id) return;
    await resetRoutine({ userId: convexUser._id });
    Alert.alert('Morning Routine', 'Daily routine generated in your Personal list.');
  }

  function shareToWhatsApp() {
    const list = todos?.filter(t => !t.completed).map(t => `- ${t.text}`).join('\n');
    if (!list) return;
    const msg = `*Bluom Shared List (${category})*\n\n${list}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  }

  const filtered = useMemo(() => {
    return todos?.filter(t => t.category === category) ?? [];
  }, [todos, category]);

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Mum’s Assistant</Text>
          <Text className="text-slate-500 font-bold text-xs">Life & Household Management</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowPartnerModal(true)}
          className={`w-10 h-10 rounded-xl items-center justify-center mr-2 ${convexUser?.partnerId ? 'bg-emerald-50' : 'bg-slate-50'}`}
        >
          <Ionicons name="people" size={20} color={convexUser?.partnerId ? '#10b981' : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReset} className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
          <Ionicons name="refresh" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View className="bg-white border-b border-slate-100 px-4 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          {['Personal', 'Family', 'Grocery', 'Work'].map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c as Category)}
              className={`px-5 py-2 rounded-full mx-1 ${category === c ? 'bg-slate-900' : 'bg-slate-100'}`}
            >
              <Text className={`font-black text-xs ${category === c ? 'text-white' : 'text-slate-500'}`}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 100) }}
      >
        {filtered.map((t) => (
          <View key={t._id} className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm flex-row items-center gap-3">
            <TouchableOpacity onPress={() => toggleTodo({ todoId: t._id, completed: !t.completed })}>
              <Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.completed ? "#10b981" : "#cbd5e1"} />
            </TouchableOpacity>
            <Text className={`flex-1 font-semibold ${t.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{t.text}</Text>
            <TouchableOpacity onPress={() => deleteTodo({ todoId: t._id })}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}

        {filtered.length === 0 && (
          <View className="items-center justify-center py-20">
            <View className="w-16 h-16 bg-white rounded-3xl items-center justify-center mb-4 border border-slate-100">
              <Ionicons name="list" size={32} color="#cbd5e1" />
            </View>
            <Text className="text-slate-400 font-bold">Nothing here yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-slate-100 rounded-2xl px-4 py-4 text-slate-900 font-semibold"
            placeholder={`Add to ${category}...`}
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity
            onPress={handleAdd}
            className="w-14 h-14 bg-slate-900 rounded-2xl items-center justify-center"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareToWhatsApp}
            className="w-14 h-14 bg-emerald-500 rounded-2xl items-center justify-center"
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => { setShowUpgrade(false); router.back(); }}
        onUpgrade={() => { setShowUpgrade(false); router.push('/premium'); }}
        title="Productivity Pro"
        message="Unlock shared family lists, category organization, morning routine generation, and WhatsApp sharing."
      />

      <Modal visible={showPartnerModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-slate-900 font-black text-2xl">Shared Lists</Text>
              <TouchableOpacity onPress={() => setShowPartnerModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {convexUser?.partnerId ? (
              <View className="items-center py-6">
                <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="people" size={40} color="#10b981" />
                </View>
                <Text className="text-slate-900 font-black text-lg">Synced with {partnerUser?.name || 'Partner'}</Text>
                <Text className="text-slate-500 font-bold text-center mt-2">
                  Family and Grocery items are automatically shared between your devices.
                </Text>
                <TouchableOpacity
                  onPress={handleUnlink}
                  className="mt-8 px-8 py-4 rounded-2xl border border-rose-100 bg-rose-50"
                >
                  <Text className="text-rose-600 font-black">Stop Syncing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="text-slate-500 font-bold mb-6">
                  Enter your partner's email to sync Grocery and Family lists across both your apps.
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-semibold mb-6"
                  placeholder="partner@email.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={partnerEmail}
                  onChangeText={setPartnerEmail}
                />
                <TouchableOpacity
                  onPress={handleLinkPartner}
                  disabled={linking || !partnerEmail.trim()}
                  className={`py-5 rounded-2xl items-center shadow-xl ${linking || !partnerEmail.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}
                >
                  {linking ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-lg">Send Link Request</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

