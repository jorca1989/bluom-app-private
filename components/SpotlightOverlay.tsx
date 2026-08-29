import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export interface SpotlightTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

export interface CoachmarkStep {
  target: SpotlightTarget;
  title: string;
  description: string;
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightOverlayProps {
  visible: boolean;
  step: CoachmarkStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SpotlightOverlay({
  visible,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: SpotlightOverlayProps) {
  const { colors } = useTheme();

  if (!visible || !step) return null;

  const { target, title, description } = step;
  const padding = 6;
  const cutoutX = Math.max(0, target.x - padding);
  const cutoutY = Math.max(0, target.y - padding);
  const cutoutW = target.width + padding * 2;
  const cutoutH = target.height + padding * 2;
  const radius = target.radius ?? 14;

  // Compute tooltip placement (above or below cutout)
  const isTargetInTopHalf = cutoutY < SCREEN_HEIGHT / 2;
  const tooltipY = isTargetInTopHalf
    ? cutoutY + cutoutH + 16
    : Math.max(40, cutoutY - 180);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* SVG Mask punch-hole */}
        <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <Mask id="spotlight-mask" x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
              {/* White fills the mask (dimmed area) */}
              <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
              {/* Black punches the transparent hole */}
              <Rect
                x={cutoutX}
                y={cutoutY}
                width={cutoutW}
                height={cutoutH}
                rx={radius}
                ry={radius}
                fill="black"
              />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </Svg>

        {/* Highlight border ring around cutout */}
        <View
          pointerEvents="none"
          style={[
            styles.highlightRing,
            {
              left: cutoutX,
              top: cutoutY,
              width: cutoutW,
              height: cutoutH,
              borderRadius: radius,
              borderColor: colors.primary,
            },
          ]}
        />

        {/* Floating Tooltip Card */}
        <View
          style={[
            styles.tooltipCard,
            {
              top: tooltipY,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Step Badge */}
          <View style={styles.tooltipHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
                {stepIndex + 1} / {totalSteps}
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip Tour</Text>
            </TouchableOpacity>
          </View>

          {/* Title & Description */}
          <Text style={[styles.tooltipTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.tooltipDesc, { color: colors.textMuted }]}>{description}</Text>

          {/* Action Buttons */}
          <View style={styles.tooltipActions}>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={onNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {stepIndex + 1 === totalSteps ? 'Finish Tour ✦' : 'Next Step'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  tooltipDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
