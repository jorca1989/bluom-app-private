import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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

const ITEM_HEIGHT = 56;

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
  const flatListRef = useRef<FlatList>(null);
  const lastHapticRef = useRef(0);
  const isDraggingRef = useRef(false);
  
  const data = useMemo(() => {
    const items = [];
    for (let i = min; i <= max; i += step) {
      items.push(i);
    }
    return items;
  }, [min, max, step]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = data.findIndex(d => d === value);
    return idx >= 0 ? idx : Math.floor(data.length / 2);
  });

  useEffect(() => {
    if (!isDraggingRef.current) {
      const idx = data.findIndex(d => d === value);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
        flatListRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
      }
    }
  }, [value, data]);

  const triggerHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticRef.current > 70) {
      lastHapticRef.current = now;
      Haptics.selectionAsync();
    }
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (index >= 0 && index < data.length && index !== currentIndex) {
      setCurrentIndex(index);
      triggerHaptic();
    }
  };

  const handleScrollBeginDrag = () => {
    isDraggingRef.current = true;
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), data.length - 1));
    setCurrentIndex(index);
    onChange(data[index]);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), data.length - 1));
    setCurrentIndex(index);
    onChange(data[index]);
  };

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const isSelected = index === currentIndex;
    const isAdjacent = Math.abs(index - currentIndex) === 1;

    return (
      <Pressable
        style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
        onPress={() => {
          setCurrentIndex(index);
          flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
          onChange(item);
        }}
      >
        <Text style={[
          styles.itemText,
          {
            color: isSelected ? colors.primary : colors.text,
            fontSize: isSelected ? 40 : isAdjacent ? 24 : 18,
            opacity: isSelected ? 1 : isAdjacent ? 0.35 : 0.15,
            fontWeight: isSelected ? '900' : isAdjacent ? '700' : '500',
          }
        ]}>
          {item}
        </Text>
      </Pressable>
    );
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

      {/* Prominent Large Value Display */}
      <View style={styles.valueDisplay}>
        <Text style={[styles.valueText, { color: colors.primary }]}>{data[currentIndex] ?? value}</Text>
        {suffix && <Text style={[styles.suffixText, { color: colors.textMuted }]}>{suffix}</Text>}
      </View>

      <View style={[styles.pickerContainer, { height: ITEM_HEIGHT * 3 }]}>
        <View
          style={[
            styles.selectionIndicator,
            {
              borderColor: colors.primary,
              backgroundColor: 'transparent',
              height: ITEM_HEIGHT,
              top: ITEM_HEIGHT,
              zIndex: 0,
            }
          ]}
          pointerEvents="none"
        />
        <FlatList
          ref={flatListRef}
          data={data}
          keyExtractor={(item) => item.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          initialScrollIndex={currentIndex}
          getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          style={{ zIndex: 1 }}
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
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  valueText: {
    fontSize: 52,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  suffixText: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
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
    width: 220,
  },
  itemText: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  selectionIndicator: {
    position: 'absolute',
    width: 160,
    borderWidth: 2,
    borderRadius: 16,
  },
  suffix: {
    position: 'absolute',
    right: 48,
    fontSize: 18,
    fontWeight: '700',
    zIndex: 2,
  },
});
