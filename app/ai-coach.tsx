import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { useUser as useAppUser } from '@/context/UserContext';
import { getBottomContentPadding } from '@/utils/layout';

type Message = {
  role: 'user' | 'coach';
  content: string;
  isQuickQuestion?: boolean;
  prompt?: string;
};

export default function AiCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const appUser = useAppUser();
  const scrollViewRef = useRef<ScrollView>(null);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const messageCount = useQuery(
    api.support.getAiMessageCount,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  );

  const incrementCount = useMutation(api.support.incrementAiMessageCount);
  const chatAction = useAction(api.ai.chatWithCoach);

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'coach', 
      content: 'Hello! I am your Bluom AI Coach. How can I help you with your fitness, nutrition, or wellness today?' 
    },
    {
      role: 'coach',
      content: '📝 Help me build a consistent daily routine',
      isQuickQuestion: true,
      prompt: "Help me build a consistent daily routine"
    },
    {
      role: 'coach', 
      content: '😴 Improve my sleep quality naturally',
      isQuickQuestion: true,
      prompt: "Improve my sleep quality naturally"
    },
    {
      role: 'coach',
      content: '💧 Create a personalized water intake plan',
      isQuickQuestion: true,
      prompt: "Create a personalized water intake plan"
    },
    {
      role: 'coach',
      content: '🧘 Quick techniques to manage daily stress',
      isQuickQuestion: true,
      prompt: "Quick techniques to manage daily stress"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const freeLimit = 3;
  const canChat = appUser.isPro || appUser.isAdmin || (messageCount ?? 0) < freeLimit;

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const emojiIceBreakers = [
    { id: 'fuel', label: 'Fuel', prompt: "Analyze my last meal for energy levels.", icon: 'nutrition-outline', color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { id: 'mind', label: 'Mind', prompt: "I'm feeling overwhelmed, help me prioritize.", icon: 'rose-outline', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'move', label: 'Move', prompt: "Give me a 5-minute desk stretch for focus.", icon: 'body-outline', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'life', label: 'Life', prompt: "Optimize my schedule for a high-stress day.", icon: 'calendar-outline', color: 'bg-green-50 text-green-600 border-green-100' },
  ];

  const quickQuestions = [
    { id: 'habits', prompt: "Help me build a consistent daily routine", display: "📝 Help me build a consistent daily routine" },
    { id: 'sleep', prompt: "Improve my sleep quality naturally", display: "😴 Improve my sleep quality naturally" },
    { id: 'water', prompt: "Create a personalized water intake plan", display: "💧 Create a personalized water intake plan" },
    { id: 'stress', prompt: "Quick techniques to manage daily stress", display: "🧘 Quick techniques to manage daily stress" },
  ];

  async function handleSend(manualInput?: string) {
    const textToSend = typeof manualInput === 'string' ? manualInput : input.trim();
    if (!textToSend || loading || !convexUser?._id) return;

    if (!canChat) {
      Alert.alert(
        'Daily Limit Reached',
        'Free users get 3 messages per day. Upgrade to Pro for unlimited coaching.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go Pro', onPress: () => router.push('/premium') }
        ]
      );
      return;
    }

    const userMsg = textToSend;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      if (!(appUser.isPro || appUser.isAdmin)) {
        await incrementCount({ userId: convexUser?._id });
      }

      const response = await chatAction({
        message: userMsg,
        history: messages.map(m => ({ role: m.role === 'coach' ? 'model' : 'user', content: m.content })),
        context: `User Goal: ${convexUser?.fitnessGoal ?? 'General Wellness'}, Weight: ${convexUser?.weight ?? 'Not specified'}kg, Height: ${convexUser?.height ?? 'Not specified'}cm`
      });

      setMessages(prev => [...prev, { role: 'coach', content: response }]);
    } catch (e: any) {
      Alert.alert('Error', 'Coach is resting. Please try again later.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#ebf1fe]" edges={['top', 'bottom']}>
      <View className="px-4 pb-3 flex-row items-center gap-3 border-b border-slate-100 bg-white" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-lg">AI Coach</Text>
          <Text className="text-slate-500 font-bold text-xs">Precision Health Expert</Text>
        </View>
        {!(appUser.isPro || appUser.isAdmin) && (
          <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <Text className="text-blue-600 font-bold text-[10px] uppercase">
              {messageCount ?? 0}/{freeLimit} Daily
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map((m, i) => (
            <View key={i} className={`mb-4 flex-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <TouchableOpacity 
                onPress={() => m.isQuickQuestion && handleSend(m.prompt)}
                disabled={!m.isQuickQuestion}
                className={`max-w-[85%] rounded-2xl p-4 ${m.role === 'user' ? 'bg-blue-600 rounded-tr-none' : m.isQuickQuestion ? 'bg-blue-50 border-2 border-blue-200 rounded-tl-none' : 'bg-slate-100 rounded-tl-none'}`}
              >
                <Text className={`font-semibold ${m.role === 'user' ? 'text-white' : m.isQuickQuestion ? 'text-blue-700' : 'text-slate-800'}`}>
                  {m.content}
                </Text>
                {m.isQuickQuestion && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="chevron-forward" size={12} color="#3b82f6" />
                    <Text className="text-xs text-blue-600 ml-1">Tap to ask</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
          {loading && (
            <View className="mb-4 flex-row justify-start">
              <View className="bg-slate-100 rounded-2xl rounded-tl-none p-4">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            </View>
          )}
        </ScrollView>

        <View className="bg-white border-t border-slate-100" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {/* Emoji Ice Breakers */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="pt-2 pb-3 pl-4"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {emojiIceBreakers.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSend(item.prompt)}
                className={`mr-3 px-4 py-2 rounded-full border flex-row items-center gap-2 ${item.color.split(' ')[0]} ${item.color.split(' ')[2]}`}
              >
                <Ionicons name={item.icon as any} size={14} className={item.color.split(' ')[1]} />
                <Text className={`text-xs font-bold ${item.color.split(' ')[1]}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="px-4 pb-3 flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-semibold"
              placeholder="Ask me anything..."
              placeholderTextColor="#94a3b8"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={loading || !input.trim()}
              className={`w-12 h-12 rounded-2xl items-center justify-center ${loading || !input.trim() ? 'bg-slate-200' : 'bg-blue-600'}`}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

