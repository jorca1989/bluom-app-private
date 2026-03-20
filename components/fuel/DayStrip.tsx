import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export interface DayItem {
  short: string; // "Mon"
  date: number; // 15
  fullDate: string; // "2024-03-15"
}

interface DayStripProps {
  days: DayItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

const DayStrip = ({ days, selectedDate, onSelectDate }: DayStripProps) => {
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to selected date on mount (basic implementation)
  useEffect(() => {
    const idx = days.findIndex(d => d.fullDate === selectedDate);
    if (idx !== -1 && scrollRef.current) {
      // rough approx to center it
      scrollRef.current.scrollTo({ x: Math.max(0, idx * 60 - 100), animated: true });
    }
  }, [selectedDate, days]);

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollRef}
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day, i) => {
          const isSelected = day.fullDate === selectedDate;
          
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onSelectDate(day.fullDate)}
              activeOpacity={0.8}
              style={[
                styles.dayButton,
                isSelected ? styles.dayButtonSelected : styles.dayButtonUnselected
              ]}
            >
              <Text style={[
                styles.shortText,
                isSelected ? styles.shortTextSelected : styles.shortTextUnselected
              ]}>
                {day.short}
              </Text>
              <Text style={[
                styles.dateText,
                isSelected ? styles.dateTextSelected : styles.dateTextUnselected
              ]}>
                {day.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DayStrip;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    minWidth: 54,
  },
  dayButtonSelected: {
    backgroundColor: '#10b981', // Emerald 500
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayButtonUnselected: {
    backgroundColor: '#f8fafc', // slate 50
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  shortText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  shortTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  shortTextUnselected: {
    color: '#64748b',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateTextSelected: {
    color: '#ffffff',
  },
  dateTextUnselected: {
    color: '#0f172a',
  },
});
