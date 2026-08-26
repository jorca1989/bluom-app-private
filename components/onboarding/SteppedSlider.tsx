import React from 'react';
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
const TRACK_PADDING = 40;
const TRACK_WIDTH = SCREEN_WIDTH - TRACK_PADDING * 2;

export default function SteppedSlider({
  steps,
  selectedIndex,
  onChange,
}: SteppedSliderProps) {
  const { colors } = useTheme();
  
  const stepWidth = TRACK_WIDTH / Math.max(1, steps.length - 1);
  const translateX = useSharedValue(selectedIndex * stepWidth);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withSpring(selectedIndex * stepWidth, { damping: 20, stiffness: 200 });
  }, [selectedIndex, stepWidth, translateX]);

  const updateIndex = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < steps.length && newIndex !== selectedIndex) {
      Haptics.selectionAsync();
      onChange(newIndex);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      let nextX = startX.value + event.translationX;
      nextX = Math.max(0, Math.min(nextX, TRACK_WIDTH));
      translateX.value = nextX;
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

      <View style={[styles.trackContainer, { width: TRACK_WIDTH }]}>
        <View style={[styles.track, { backgroundColor: colors.border }]} />
        <Animated.View style={[styles.filledTrack, { backgroundColor: colors.primary }, filledTrackStyle]} />
        
        {steps.map((_, index) => {
          const isPassed = index <= selectedIndex;
          return (
            <Pressable
              key={index}
              style={[
                styles.dotContainer,
                { left: index * stepWidth - 10 }
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

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[
            styles.thumb, 
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            thumbStyle
          ]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </GestureDetector>
      </View>

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
    paddingVertical: 20,
  },
  hintText: {
    fontSize: 14,
    marginBottom: 40,
    fontWeight: '500',
  },
  trackContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 40,
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
    width: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  thumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    left: -16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
