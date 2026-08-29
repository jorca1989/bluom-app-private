import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

interface Step {
  value: string;
  label: string;
  description: string;
}

interface SteppedSliderProps {
  steps: Step[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_PADDING = 36;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING * 2;

export default function SteppedSlider({
  steps,
  selectedIndex,
  onChange,
}: SteppedSliderProps) {
  const { colors } = useTheme();
  const lastIndexRef = useRef(selectedIndex);
  
  const stepWidth = TRACK_WIDTH / Math.max(1, steps.length - 1);
  const translateX = useSharedValue(selectedIndex * stepWidth);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withSpring(selectedIndex * stepWidth, { damping: 20, stiffness: 200 });
    lastIndexRef.current = selectedIndex;
  }, [selectedIndex, stepWidth, translateX]);

  const updateIndex = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < steps.length && newIndex !== lastIndexRef.current) {
      lastIndexRef.current = newIndex;
      Haptics.selectionAsync();
      onChange(newIndex);
    }
  }, [steps.length, onChange]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      let nextX = startX.value + event.translationX;
      nextX = Math.max(0, Math.min(nextX, TRACK_WIDTH));
      translateX.value = nextX;
      
      const liveIndex = Math.round(nextX / stepWidth);
      if (liveIndex >= 0 && liveIndex < steps.length) {
        runOnJS(updateIndex)(liveIndex);
      }
    })
    .onEnd(() => {
      const closestIndex = Math.round(translateX.value / stepWidth);
      translateX.value = withSpring(closestIndex * stepWidth, { damping: 20, stiffness: 200 });
      runOnJS(updateIndex)(closestIndex);
    });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const filledTrackStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value,
    };
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.hintText, { color: colors.textMuted }]}>
        👉 Drag the slider to adjust
      </Text>

      <GestureDetector gesture={panGesture}>
        <View style={[styles.trackContainer, { width: TRACK_WIDTH }]} collapsable={false}>
          <View style={[styles.track, { backgroundColor: colors.border }]} />
          <Animated.View style={[styles.filledTrack, { backgroundColor: colors.primary }, filledTrackStyle]} />
          
          {steps.map((_, index) => {
            const isPassed = index <= selectedIndex;
            return (
              <Pressable
                key={index}
                style={[
                  styles.dotContainer,
                  { left: index * stepWidth - 14 }
                ]}
                onPress={() => updateIndex(index)}
              >
                <View style={[
                  styles.dot,
                  { 
                    backgroundColor: isPassed ? colors.primary : colors.surface,
                    borderColor: isPassed ? colors.primary : colors.border
                  }
                ]} />
              </Pressable>
            );
          })}

          <Animated.View style={[
            styles.thumb, 
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            thumbStyle
          ]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.infoContainer}>
        <Text style={[styles.label, { color: colors.text }]}>
          {steps[selectedIndex]?.label}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {steps[selectedIndex]?.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  hintText: {
    fontSize: 13,
    marginBottom: 32,
    fontWeight: '600',
  },
  trackContainer: {
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 36,
  },
  track: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    position: 'absolute',
  },
  filledTrack: {
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  dotContainer: {
    position: 'absolute',
    width: 28,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  thumb: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    left: -18,
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  thumbInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
