import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SleeperViewProps {
  title: string;
  subtitle?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  onActivate: () => void;
}

const { width } = Dimensions.get('window');

export default function SleeperView({
  title,
  subtitle,
  description,
  icon,
  accentColor = '#2563eb',
  onActivate,
}: SleeperViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LinearGradient
            colors={[accentColor + '20', accentColor + '05']}
            style={styles.iconCircle}
          >
            <Ionicons name={icon} size={48} color={accentColor} />
          </LinearGradient>

          <View style={[styles.pillBadge, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.pillText, { color: colors.textMuted }]}>
              {t('sleeper.sleepingStatus', 'Module Asleep')}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: accentColor }]}>{subtitle}</Text>}

          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>

          <TouchableOpacity
            style={[styles.activateBtn, { backgroundColor: accentColor }]}
            onPress={onActivate}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.activateBtnText}>
              {t('sleeper.activateBtn', 'Activate This Module')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(width - 48, 380),
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  activateBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
