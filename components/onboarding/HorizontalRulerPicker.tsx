import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface HorizontalRulerPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  unitToggle?: { options: string[]; selected: string; onToggle: (unit: string) => void };
}

const TICK_SPACING = 12;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HorizontalRulerPicker({
  min,
  max,
  value,
  onChange,
  step = 1,
  suffix,
  unitToggle
}: HorizontalRulerPickerProps) {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  
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
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  }, [value, data]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / TICK_SPACING);
    if (index !== currentIndex && index >= 0 && index < data.length) {
      setCurrentIndex(index);
      Haptics.selectionAsync();
      onChange(data[index]);
    }
  };

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const isMajor = item % 10 === 0;
    
    return (
      <View style={[styles.tickContainer, { width: TICK_SPACING }]}>
        <View style={[
          styles.tick, 
          { 
            height: isMajor ? 32 : 16, 
            backgroundColor: isMajor ? colors.textMuted : colors.border,
            width: isMajor ? 2 : 1,
          }
        ]} />
        {isMajor && (
          <Text style={[styles.tickLabel, { color: colors.textMuted }]}>
            {item}
          </Text>
        )}
      </View>
    );
  };

  const paddingHorizontal = SCREEN_WIDTH / 2 - TICK_SPACING / 2;

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

      <View style={styles.valueDisplay}>
        <Text style={[styles.valueText, { color: colors.primary }]}>{data[currentIndex]}</Text>
        {suffix && <Text style={[styles.suffixText, { color: colors.textMuted }]}>{suffix}</Text>}
      </View>

      <View style={styles.rulerContainer}>
        <View style={[styles.centerIndicator, { backgroundColor: colors.primary }]} pointerEvents="none" />
        <FlatList
          ref={flatListRef}
          data={data}
          keyExtractor={(item) => item.toString()}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_SPACING}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal }}
          initialScrollIndex={currentIndex}
          getItemLayout={(data, index) => ({ length: TICK_SPACING, offset: TICK_SPACING * index, index })}
        />
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
    marginBottom: 32,
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
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  valueText: {
    fontSize: 56,
    fontWeight: '700',
  },
  suffixText: {
    fontSize: 24,
    fontWeight: '500',
    marginLeft: 8,
  },
  rulerContainer: {
    height: 80,
    width: '100%',
    position: 'relative',
  },
  centerIndicator: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 3,
    height: 48,
    marginLeft: -1.5,
    zIndex: 10,
    borderRadius: 2,
  },
  tickContainer: {
    alignItems: 'center',
    height: 60,
  },
  tick: {
    borderRadius: 1,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 12,
    fontWeight: '500',
  },
});
