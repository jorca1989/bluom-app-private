import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface ScrollWheelPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  unitToggle?: { options: string[]; selected: string; onToggle: (unit: string) => void };
}

const ITEM_HEIGHT = 60;

export default function ScrollWheelPicker({
  min,
  max,
  value,
  onChange,
  step = 1,
  suffix,
  unitToggle
}: ScrollWheelPickerProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const data = useMemo(() => {
    const items = [];
    for (let i = min; i <= max; i += step) {
      items.push(i);
    }
    return items;
  }, [min, max, step]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = data.findIndex(d => d === value);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const idx = data.findIndex(d => d === value);
    if (idx !== currentIndex && idx >= 0) {
      setCurrentIndex(idx);
      scrollViewRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
    }
  }, [value, data]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (index !== currentIndex && index >= 0 && index < data.length) {
      setCurrentIndex(index);
      Haptics.selectionAsync();
      onChange(data[index]);
    }
  };

  return (
    <View style={styles.container}>
      {unitToggle && (
        <View style={styles.unitToggleContainer}>
          {unitToggle.options.map((option) => {
            const isSelected = option === unitToggle.selected;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  unitToggle.onToggle(option);
                }}
                style={[
                  styles.unitPill,
                  { backgroundColor: isSelected ? colors.primary : colors.surface }
                ]}
              >
                <Text style={[
                  styles.unitText,
                  { color: isSelected ? '#fff' : colors.textMuted }
                ]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={[styles.pickerContainer, { height: ITEM_HEIGHT * 5 }]}>
        <View style={[styles.selectionIndicator, { borderColor: colors.primary, height: ITEM_HEIGHT, top: ITEM_HEIGHT * 2 }]} pointerEvents="none" />
        {suffix && (
          <Text style={[styles.suffix, { color: colors.primary, top: ITEM_HEIGHT * 2 + ITEM_HEIGHT / 2 - 14 }]}>
            {suffix}
          </Text>
        )}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        >
          {data.map((item, index) => {
            const isSelected = index === currentIndex;
            const isAdjacent = Math.abs(index - currentIndex) === 1;
            
            let fontSize = 22;
            let opacity = 0.2;
            let fontWeight: '400' | '700' = '400';
            let color = colors.text;

            if (isSelected) {
              fontSize = 48;
              opacity = 1;
              fontWeight = '700';
              color = colors.primary;
            } else if (isAdjacent) {
              fontSize = 28;
              opacity = 0.4;
            }

            return (
              <Pressable
                key={item}
                style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
                onPress={() => {
                  setCurrentIndex(index);
                  scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
                  onChange(item);
                }}
              >
                <Text style={{ fontSize, opacity, fontWeight, color, textAlign: 'center' }}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  unitToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  unitPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  unitText: {
    fontWeight: '600',
    fontSize: 16,
  },
  pickerContainer: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
  },
  selectionIndicator: {
    position: 'absolute',
    width: 140,
    borderWidth: 2,
    borderRadius: 16,
    zIndex: 1,
  },
  suffix: {
    position: 'absolute',
    right: 60,
    fontSize: 20,
    fontWeight: '600',
    zIndex: 2,
  },
});
