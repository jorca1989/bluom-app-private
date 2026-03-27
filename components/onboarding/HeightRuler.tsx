import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const RULER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface HeightRulerProps {
  units: 'cm' | 'ft';
  initialValue?: number;
  onValueChange: (value: number) => void;
}

export default function HeightRuler({ units, initialValue, onValueChange }: HeightRulerProps) {
  const values = React.useMemo(() => {
    if (units === 'cm') {
      const vals: number[] = [];
      for (let i = 120; i <= 220; i++) vals.push(i);
      return vals;
    } else {
      const vals: number[] = [];
      for (let totalInches = 48; totalInches <= 84; totalInches++) vals.push(totalInches);
      return vals;
    }
  }, [units]);

  const getInitialIndex = useCallback(() => {
    if (units === 'cm') {
      const target = initialValue || 170;
      const idx = values.indexOf(target);
      return Math.max(0, idx >= 0 ? idx : values.indexOf(170));
    } else {
      const ftVal = initialValue || 5.7;
      const feet = Math.floor(ftVal);
      const inches = Math.round((ftVal - feet) * 10);
      const totalInches = feet * 12 + inches;
      const idx = values.indexOf(totalInches);
      return Math.max(0, idx >= 0 ? idx : 20);
    }
  }, [units, initialValue, values]);

  const listRef = useRef<FlatList>(null);
  const [selectedIndex, setSelectedIndex] = useState(getInitialIndex());
  // Prevent onValueChange during programmatic scrolls (unit change, initial mount)
  const suppressCallbackRef = useRef(true);

  const formatValue = (val: number): string => {
    if (units === 'cm') return `${val} cm`;
    const feet = Math.floor(val / 12);
    const inches = val % 12;
    return `${feet}'${inches}"`;
  };

  const getOutputValue = useCallback((val: number): number => {
    if (units === 'cm') return val;
    return Math.round(val * 2.54);
  }, [units]);

  // Scroll to initial/reset position when units change
  useEffect(() => {
    const idx = getInitialIndex();
    setSelectedIndex(idx);
    suppressCallbackRef.current = true;
    onValueChange(getOutputValue(values[idx]));
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
      setTimeout(() => { suppressCallbackRef.current = false; }, 300);
    }, 100);
  }, [units]);

  // Handle momentum scroll end — this is the ONLY place we commit the value
  const handleMomentumEnd = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    setSelectedIndex(clampedIndex);
    if (!suppressCallbackRef.current) {
      onValueChange(getOutputValue(values[clampedIndex]));
    }
  }, [values, onValueChange, getOutputValue]);

  // Tap to select
  const handleTapItem = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setSelectedIndex(index);
    onValueChange(getOutputValue(values[index]));
  }, [values, onValueChange, getOutputValue]);

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  const renderItem = useCallback(({ item, index }: { item: number; index: number }) => {
    const distance = Math.abs(index - selectedIndex);
    const isSelected = distance === 0;
    const opacity = isSelected ? 1 : distance === 1 ? 0.6 : 0.3;
    const scale = isSelected ? 1.15 : distance === 1 ? 1 : 0.85;

    return (
      <TouchableOpacity
        style={[styles.rulerItem, { height: ITEM_HEIGHT }]}
        onPress={() => handleTapItem(index)}
        activeOpacity={0.6}
      >
        <Text
          style={[
            styles.rulerText,
            {
              opacity,
              fontSize: 18 * scale,
              fontWeight: isSelected ? '800' : '400',
              color: isSelected ? '#2563eb' : '#94a3b8',
            },
          ]}
        >
          {formatValue(item)}
        </Text>
        <View style={styles.tickContainer}>
          <View
            style={[
              styles.tick,
              {
                width: isSelected ? 40 : item % 5 === 0 ? 24 : 12,
                backgroundColor: isSelected ? '#2563eb' : '#cbd5e1',
                height: isSelected ? 3 : 2,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  }, [selectedIndex, handleTapItem]);

  return (
    <View style={styles.container}>
      <Text style={styles.currentValue}>{formatValue(values[selectedIndex])}</Text>

      <View style={styles.rulerContainer}>
        <View style={styles.centerLine} />

        <FlatList
          ref={listRef}
          data={values}
          renderItem={renderItem}
          keyExtractor={(item) => item.toString()}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          nestedScrollEnabled={true}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          // Padding via header/footer keeps the list snappable without content offset issues
          ListHeaderComponent={<View style={{ height: paddingItems * ITEM_HEIGHT }} />}
          ListFooterComponent={<View style={{ height: paddingItems * ITEM_HEIGHT }} />}
          initialScrollIndex={getInitialIndex()}
        />
      </View>

      <Text style={styles.helperText}>Tap or scroll to select</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  currentValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
  },
  rulerContainer: {
    height: RULER_HEIGHT,
    width: width * 0.75,
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    top: (RULER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    zIndex: -1,
  },
  rulerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rulerText: {
    flex: 1,
    textAlign: 'center',
  },
  tickContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  tick: {
    borderRadius: 2,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
});