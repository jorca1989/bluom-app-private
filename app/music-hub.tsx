import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudio, Track } from '@/context/AudioContext';

export default function MusicHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { playTrack, currentTrack, isPlaying } = useAudio();

  // Simple local data
  const aiBeats = [
    { id: '1', title: 'Deep Flow', duration: '4:20', uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: '2', title: 'Midnight Chill', duration: '3:45', uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  ];

  const playlists = [
    { id: 'p1', title: 'Morning Vibe', platform: 'Spotify', url: 'spotify:playlist:37i9dQZF1DX2sUQpS0tWpk', color: '#1DB954' },
    { id: 'p2', title: 'Focus Flow', platform: 'YouTube', url: 'https://youtube.com/playlist?list=PL4fGSI1pDJn6jWpuxO6vV5T9236h3Lh7E', color: '#FF0000' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-slate-900 font-black text-xl">Music Hub</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Exclusive AI Beats</Text>
        {aiBeats.map((beat) => {
          const isActive = currentTrack?._id === beat.id;
          const showPause = isActive && isPlaying;

          return (
            <TouchableOpacity
              key={beat.id}
              onPress={() => playTrack({
                _id: beat.id,
                title: beat.title,
                artist: 'Bluom AI',
                storageUrl: beat.uri,
                source: 'R2',
                duration: parseInt(beat.duration.split(':')[0]) * 60 + parseInt(beat.duration.split(':')[1]) // simple parse
              })}
              className={`flex-row items-center justify-between rounded-2xl p-4 mb-3 border ${isActive ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}
            >
              <View className="flex-row items-center gap-4">
                <View className={`w-12 h-12 rounded-xl items-center justify-center ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <Ionicons name={showPause ? "pause" : "play"} size={24} color={isActive ? "#fff" : "#64748b"} />
                </View>
                <View>
                  <Text className={`font-extrabold text-base ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{beat.title}</Text>
                  <Text className={`font-bold text-xs ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{beat.duration} • Chillstep</Text>
                </View>
              </View>
              {isActive && (
                <View className="px-2 py-1 bg-blue-100 rounded-md">
                  <Text className="text-blue-700 text-[10px] font-bold uppercase">Playing</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-6 mb-4">Bluom Playlists</Text>
        <View className="flex-row flex-wrap gap-4 mb-10">
          {playlists.map((pl) => (
            <TouchableOpacity
              key={pl.id}
              onPress={() => Linking.openURL(pl.url)}
              activeOpacity={0.9}
              className="w-[47%] bg-slate-900 rounded-[32px] overflow-hidden shadow-xl"
            >
              <View className="aspect-square bg-slate-800 items-center justify-center">
                <Ionicons name={pl.platform === 'Spotify' ? "logo-spotify" as any : "logo-youtube" as any} size={48} color={pl.color} />
              </View>
              <View className="p-4">
                <Text className="text-white font-black text-base leading-tight">{pl.title}</Text>
                <Text className="text-white/50 font-bold text-[10px] mt-1 uppercase tracking-widest">{pl.platform}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

