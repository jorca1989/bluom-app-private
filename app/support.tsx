import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { getBottomContentPadding } from '@/utils/layout';

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const submitTicket = useMutation(api.support.submitSupportTicket);

  const [category, setCategory] = useState<'bug' | 'feedback'>('feedback');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!message.trim() || !convexUser?._id || !clerkUser?.primaryEmailAddress?.emailAddress) return;
    
    setLoading(true);
    try {
      await submitTicket({
        userId: convexUser._id,
        userEmail: clerkUser.primaryEmailAddress.emailAddress,
        category,
        message: message.trim(),
      });
      Alert.alert('Sent!', 'Your ticket has been received. We’ll get back to you soon.');
      setMessage('');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to send ticket. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 bg-white border-b border-slate-200" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">Support & Feedback</Text>
          <Text className="text-slate-500 font-bold text-xs">Help us improve Bluom</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 24) }}
      >
        <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <Text className="text-slate-900 font-black text-xl mb-2">How can we help?</Text>
          <Text className="text-slate-500 font-semibold mb-6 leading-5">
            Select a category and let us know what’s on your mind. We read every single ticket.
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity 
              onPress={() => setCategory('feedback')}
              className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl border ${category === 'feedback' ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-slate-200'}`}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={category === 'feedback' ? '#2563eb' : '#64748b'} />
              <Text className={`font-black ${category === 'feedback' ? 'text-blue-600' : 'text-slate-500'}`}>Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setCategory('bug')}
              className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl border ${category === 'bug' ? 'bg-rose-50 border-rose-600' : 'bg-slate-50 border-slate-200'}`}
            >
              <Ionicons name="bug" size={18} color={category === 'bug' ? '#e11d48' : '#64748b'} />
              <Text className={`font-black ${category === 'bug' ? 'text-rose-600' : 'text-slate-500'}`}>Report Bug</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-slate-700 font-black mb-2 px-1">Message</Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-semibold h-40"
            placeholder="Type your message here..."
            placeholderTextColor="#94a3b8"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading || !message.trim()}
            className={`mt-8 py-5 rounded-2xl items-center shadow-xl ${loading || !message.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-lg">Send Message</Text>}
          </TouchableOpacity>
        </View>

        <View className="mt-8 items-center">
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">Bluom Life Management</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

