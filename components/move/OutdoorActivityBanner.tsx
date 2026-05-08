/**
 * OutdoorActivityBanner.tsx
 *
 * Drop-in banner for the Move screen that launches the OutdoorActivityScreen.
 *
 * USAGE IN MOVE SCREEN:
 * ---------------------
 * 1. Import at the top of your Move screen file:
 *      import OutdoorActivityBanner from '@/components/move/OutdoorActivityBanner';
 *      import OutdoorActivityScreen from '@/app/outdoor-activity';
 *
 * 2. Add state in MoveScreen:
 *      const [showOutdoor, setShowOutdoor] = useState(false);
 *
 * 3. Paste the banner RIGHT AFTER <MoveQuickActions ... /> and BEFORE the
 *    "Today's Activities" card:
 *
 *      <OutdoorActivityBanner onStart={() => setShowOutdoor(true)} />
 *
 * 4. Add the modal at the bottom of MoveScreen's return (next to other modals):
 *
 *      <OutdoorActivityScreen
 *        visible={showOutdoor}
 *        onClose={() => setShowOutdoor(false)}
 *      />
 *
 * That's it — no other changes needed to MoveScreen.
 */

import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OutdoorActivityBannerProps {
  onStart: () => void;
}

const ACTIVITY_PILLS = [
  { label: 'Run',   icon: 'walk',      color: '#ef4444' },
  { label: 'Cycle', icon: 'bicycle',   color: '#3b82f6' },
  { label: 'Hike',  icon: 'footsteps', color: '#16a34a' },
  { label: 'Walk',  icon: 'walk',      color: '#f59e0b' },
];

export default function OutdoorActivityBanner({ onStart }: OutdoorActivityBannerProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={[s.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onStart}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={['#0f172a', '#1e3a5f', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.card}
        >
          {/* Decorative blobs */}
          <View style={[s.blob, { top: -28, right: -20, width: 110, height: 110, backgroundColor: 'rgba(59,130,246,0.18)' }]} />
          <View style={[s.blob, { bottom: -20, left: 30, width: 70, height: 70, backgroundColor: 'rgba(16,185,129,0.12)' }]} />

          {/* Left: text + pills */}
          <View style={s.left}>
            <View style={s.liveDot}>
              <View style={s.liveDotPulse} />
              <Text style={s.liveLabel}>OUTDOOR</Text>
            </View>

            <Text style={s.heading}>Record{'\n'}Activity</Text>
            <Text style={s.sub}>GPS tracking • Live stats</Text>

            {/* Activity type pills */}
            <View style={s.pills}>
              {ACTIVITY_PILLS.map((a) => (
                <View key={a.label} style={[s.pill, { borderColor: a.color + '50' }]}>
                  <Ionicons name={a.icon as any} size={11} color={a.color} />
                  <Text style={[s.pillText, { color: a.color }]}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Right: start button */}
          <View style={s.right}>
            <View style={s.startCircle}>
              <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
            </View>
            <Text style={s.startHint}>Tap to start</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 140,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  left: { flex: 1, paddingRight: 12 },
  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  liveDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  liveLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 4,
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 14,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  right: {
    alignItems: 'center',
    gap: 8,
  },
  startCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  startHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
});

/**
 * ─── EXACT DIFF FOR MOVE SCREEN ─────────────────────────────────────────────
 *
 * In your MoveScreen file, make these 3 small changes:
 *
 * ── 1. Add imports (near top) ────────────────────────────────────────────────
 *
 *   import OutdoorActivityBanner from '@/components/move/OutdoorActivityBanner';
 *   import OutdoorActivityScreen from '@/app/outdoor-activity';
 *
 * ── 2. Add state (inside MoveScreen, with other useState declarations) ────────
 *
 *   const [showOutdoor, setShowOutdoor] = useState(false);
 *
 * ── 3a. Add banner (after <MoveQuickActions>, before Today's Activities card) ─
 *
 *   <MoveQuickActions ... />
 *
 *   // ↓ ADD THIS ↓
 *   <OutdoorActivityBanner onStart={() => setShowOutdoor(true)} />
 *   // ↑ ADD THIS ↑
 *
 *   <View style={styles.card}>
 *     <View style={styles.cardHeader}>
 *       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
 *         <Text style={styles.cardTitle}>Today's Activities</Text>
 *         ...
 *
 * ── 3b. Add modal (at the bottom of return, next to other modals) ─────────────
 *
 *   <ExerciseDetailModal ... />
 *   <Modal visible={showWorkoutModal} ...>...</Modal>
 *   <Modal visible={showStepsModal} ...>...</Modal>
 *
 *   // ↓ ADD THIS ↓
 *   <OutdoorActivityScreen
 *     visible={showOutdoor}
 *     onClose={() => setShowOutdoor(false)}
 *   />
 *   // ↑ ADD THIS ↑
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ALSO add to app.config.js → ios.infoPlist:
 *   NSLocationWhenInUseUsageDescription:
 *     "Bluom uses your location to record your outdoor activity route, calculate distance, and display your path on the map.",
 *   NSLocationAlwaysAndWhenInUseUsageDescription:
 *     "Bluom uses background location to keep recording your route even when your screen is off or you switch apps.",
 *
 * And to android.permissions:
 *   "android.permission.ACCESS_FINE_LOCATION",
 *   "android.permission.ACCESS_BACKGROUND_LOCATION",
 *
 * And to the plugins array:
 *   "expo-location",
 *   "expo-task-manager",
 *
 * Install commands:
 *   npx expo install react-native-maps expo-location expo-task-manager
 * ─────────────────────────────────────────────────────────────────────────────
 */