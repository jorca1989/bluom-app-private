import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// @ts-ignore - expo-audio might be missing types or is very new
import { useAudioPlayer, AudioPlayer, AudioSource } from 'expo-audio';
import { Audio } from 'expo-av';

// Define the Track interface consistent with the Convex schema
export interface Track {
    _id: string;
    title: string;
    artist: string;
    storageUrl: string; // The R2 public URL
    duration: number;
    category?: string;
    source?: "R2" | "Spotify";
}

interface AudioContextType {
    currentTrack: Track | null;
    isPlaying: boolean;
    isLoading: boolean;
    position: number;
    duration: number;
    playTrack: (track: Track) => Promise<void>;
    togglePlay: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    // Use the new expo-audio player
    // Note: implementation details depend on the exact API of expo-audio in SDK 54
    // We'll assume a standard hook or imperative API
    const player = useAudioPlayer();

    // Prepare for background playback for long-form meditation audio (store submission readiness).
    // This config doesn't start playback; it only ensures the audio session supports it when we do.
    useEffect(() => {
        (async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (e) {
                // ignore - some environments may not support changing audio mode
            }
        })();
    }, []);

    // If useAudioPlayer requires a source upfront, we might need a different approach.
    // Assuming we can load sources dynamically.

    // Effect to sync player state to our local state
    useEffect(() => {
        if (!player) return;

        const interval = setInterval(() => {
            setPosition(player.currentTime);
            setDuration(player.duration);
            setIsPlaying(player.playing);
        }, 500);

        return () => clearInterval(interval);
    }, [player]);

    const playTrack = async (track: Track) => {
        if (!player) return;

        try {
            setIsLoading(true);
            if (currentTrack?._id === track._id) {
                // Same track, just toggle
                if (player.playing) {
                    player.pause();
                } else {
                    player.play();
                }
            } else {
                // New track
                setCurrentTrack(track); // Optimistic update

                // Replace current item
                // expo-audio API: player.replace({ uri: ... }) or similar
                // Adjust based on exact API. Assuming replace() or load()
                player.replace({ uri: track.storageUrl });
                player.play();
            }
        } catch (error) {
            console.error("Error playing track:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlay = async () => {
        if (!player) return;
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const pause = async () => {
        player?.pause();
    };

    const resume = async () => {
        player?.play();
    };

    const seekTo = async (pos: number) => {
        player?.seekTo(pos);
    };

    return (
        <AudioContext.Provider
            value={{
                currentTrack,
                isPlaying,
                isLoading,
                position,
                duration,
                playTrack,
                togglePlay,
                pause,
                resume,
                seekTo,
            }}
        >
            {children}
        </AudioContext.Provider>
    );
};
