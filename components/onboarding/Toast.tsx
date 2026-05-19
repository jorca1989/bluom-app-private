import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme, type ThemeColors, THEMES } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  // Optional: show a title above the message (used for transition-style toasts)
  title?: string;
  // Optional: emoji replaces the green check icon
  emoji?: string;
}

export default function Toast({
  message,
  visible,
  onHide,
  duration = 2000,
  title,
  emoji,
}: ToastProps) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Reset position before animating in
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, message]); // re-trigger if message changes while visible

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Icon: emoji or default green check */}
      <View style={[styles.iconCircle, emoji && styles.iconCircleEmoji]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Check size={20} color="#fff" strokeWidth={3} />
        )}
      </View>

      {/* Text block */}
      <View style={styles.textBlock}>
        {title ? (
          <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </>
        ) : (
          <Text style={styles.message}>{message}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: c.text,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconCircleEmoji: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emoji: {
    fontSize: 20,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textMuted,
    lineHeight: 20,
  },
});
// Static module-scope fallbacks (default theme) for helper components.
const styles = createStyles(THEMES.default.colors);
