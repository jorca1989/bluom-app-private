import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, THEMES } from '@/context/ThemeContext';

interface HeightRulerProps {
  units: 'cm' | 'ft';
  initialValue?: number;
  onValueChange: (value: number) => void;
}

export default function HeightRuler({ units, initialValue, onValueChange }: HeightRulerProps) {
  const { colors } = useTheme();
  
  const [cmValue, setCmValue] = useState(units === 'cm' ? String(initialValue || 170) : String(Math.round((initialValue || 5.7) * 30.48)));
  const [ftValue, setFtValue] = useState(units === 'ft' ? String(Math.floor(initialValue || 5.7)) : String(Math.floor((initialValue || 170) / 30.48)));
  const [inValue, setInValue] = useState(units === 'ft' ? String(Math.round(((initialValue || 5.7) - Math.floor(initialValue || 5.7)) * 10)) : String(Math.round(((initialValue || 170) / 30.48 - Math.floor((initialValue || 170) / 30.48)) * 12)));

  useEffect(() => {
    if (units === 'cm') {
      const parsed = parseInt(cmValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        onValueChange(parsed);
      }
    } else {
      const f = parseInt(ftValue, 10) || 0;
      const i = parseInt(inValue, 10) || 0;
      if (f > 0) {
        const totalInches = f * 12 + i;
        onValueChange(totalInches * 2.54);
      }
    }
  }, [cmValue, ftValue, inValue, units, onValueChange]);

  return (
    <View style={styles.container}>
      {units === 'cm' ? (
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            keyboardType="number-pad"
            value={cmValue}
            onChangeText={setCmValue}
            maxLength={3}
          />
          <Text style={[styles.unitText, { color: colors.textMuted }]}>cm</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={ftValue}
              onChangeText={setFtValue}
              maxLength={1}
            />
            <Text style={[styles.unitText, { color: colors.textMuted }]}>ft</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={inValue}
              onChangeText={setInValue}
              maxLength={2}
            />
            <Text style={[styles.unitText, { color: colors.textMuted }]}>in</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  input: {
    fontSize: 48,
    fontWeight: '900',
    minWidth: 90,
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  unitText: {
    fontSize: 24,
    fontWeight: '700',
  },
});

