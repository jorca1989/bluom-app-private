import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface BreathingAnimationProps {
  size?: number;
  color?: string;
  duration?: number;
  onInhale?: () => void;
  onExhale?: () => void;
  isPlaying?: boolean;
}

export default function BreathingAnimation({
  size = 200,
  color = '#3b82f6',
  duration = 4000,
  onInhale,
  onExhale,
  isPlaying = true,
}: BreathingAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) {
      // Optional: Reset values?
      return;
    }

    // Start loop
    const breathingCycle = () => {
      if (!isPlayingRef.current) return;

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isPlayingRef.current) return;
        if (onInhale) onInhale();

        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.6,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!isPlayingRef.current) return;
          if (onExhale) onExhale();
          breathingCycle();
        });
      });
    };

    breathingCycle();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );

    if (isPlaying) {
      pulseLoop.start();
    } else {
      pulseLoop.stop();
    }

    return () => {
      pulseLoop.stop();
    };
  }, [isPlaying]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: (size * 1.2) / 2,
            borderColor: color,
            opacity: opacityAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.breathingCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  breathingCircle: { position: 'absolute', elevation: 8 },
  glowRing: { position: 'absolute', borderWidth: 3, backgroundColor: 'transparent' },
});









