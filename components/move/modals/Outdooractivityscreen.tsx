/**
 * OutdoorActivityScreen.tsx
 *
 * Full-screen outdoor activity recorder — Strava/Wikiloc-style.
 *
 * Features:
 *  - Activity type selection (Running, Cycling, Hiking, Walking)
 *  - Live GPS tracking with blue polyline trail
 *  - Dashboard overlay: timer, distance, pace/speed
 *  - Pause / Resume / Stop controls
 *  - GPX route overlay placeholder (loadGPXRoute)
 *  - Background location via expo-task-manager
 *  - Haversine odometry (accurate distance between GPS points)
 *  - Saves completed activity to Convex exerciseEntries
 *
 * Required packages (add to package.json):
 *   npx expo install react-native-maps expo-location expo-task-manager
 *
 * Required app.config.js additions (already documented in app.config.js):
 *   ios.infoPlist.NSLocationWhenInUseUsageDescription
 *   ios.infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription
 *   android.permissions: ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UIManager } from 'react-native';

// IMPORTANT: These are native modules. Importing them at module scope will crash
// any build that wasn't rebuilt with them (Expo Go / old dev builds).
function safeRequire<T = any>(name: string): T | null {
  try {
    // eslint-disable-next-line no-eval
    const req = (0, eval)('require');
    return req(name) as T;
  } catch {
    return null;
  }
}

const Location = safeRequire<any>('expo-location');
const TaskManager = safeRequire<any>('expo-task-manager');
const Maps = safeRequire<any>('react-native-maps');
const MapView: any = (Maps as any)?.default ?? Maps;
const Polyline: any = (Maps as any)?.Polyline;
const Marker: any = (Maps as any)?.Marker;
const PROVIDER_DEFAULT: any = (Maps as any)?.PROVIDER_DEFAULT;
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';

const { width, height } = Dimensions.get('window');

// ─── Background task name ─────────────────────────────────────
const LOCATION_TASK = 'bluom-outdoor-tracking';

// ─── Types ────────────────────────────────────────────────────
export type ActivityType = 'running' | 'cycling' | 'hiking' | 'walking';

interface Coord {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
  speed?: number | null;  // m/s
}

interface GPXPoint {
  latitude: number;
  longitude: number;
}

export interface OutdoorActivityScreenProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-selected activity type (can be changed on the pre-start screen) */
  initialActivity?: ActivityType;
}

// ─── Activity config ──────────────────────────────────────────
const ACTIVITY_CONFIG: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
  bg: string;
  metPerHour: number; // for calorie estimate
  paceLabel: string;  // 'Pace' or 'Speed'
  paceUnit: string;   // '/km' or 'km/h'
}> = {
  running: { label: 'Running', icon: 'walk', color: '#ef4444', bg: '#fee2e2', metPerHour: 9.8, paceLabel: 'Pace', paceUnit: '/km' },
  cycling: { label: 'Cycling', icon: 'bicycle', color: '#3b82f6', bg: '#dbeafe', metPerHour: 7.5, paceLabel: 'Speed', paceUnit: 'km/h' },
  hiking: { label: 'Hiking', icon: 'footsteps', color: '#16a34a', bg: '#dcfce7', metPerHour: 6.0, paceLabel: 'Pace', paceUnit: '/km' },
  walking: { label: 'Walking', icon: 'walk', color: '#f59e0b', bg: '#fef3c7', metPerHour: 3.5, paceLabel: 'Pace', paceUnit: '/km' },
};

// ─── Haversine distance (metres between two coords) ──────────
function haversineM(a: Coord, b: Coord): number {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(distanceKm: number, durationSecs: number): string {
  // Pace in min/km
  if (distanceKm < 0.01) return '--:--';
  const paceSecPerKm = durationSecs / distanceKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSpeed(distanceKm: number, durationSecs: number): string {
  // Speed in km/h
  if (durationSecs < 1) return '0.0';
  return ((distanceKm / durationSecs) * 3600).toFixed(1);
}

// ─── GPX placeholder ─────────────────────────────────────────
/**
 * loadGPXRoute
 *
 * Placeholder that will eventually parse a .gpx file (from user upload or
 * Wikiloc export) into an array of coordinates for display as a reference
 * route overlay on the map.
 *
 * To implement:
 *   1. Install: npx expo install expo-document-picker gpxparser
 *   2. Parse: const gpx = new gpxParser(); gpx.parse(xmlString);
 *   3. Return: gpx.tracks[0].points.map(p => ({ latitude: p.lat, longitude: p.lon }))
 */
async function loadGPXRoute(_fileUri?: string): Promise<GPXPoint[]> {
  // TODO: implement GPX parsing
  // For now returns an empty array so the overlay simply isn't drawn
  return [];
}

// ─── Register background task (must be at module level) ──────
if (TaskManager?.defineTask && Location) {
  try {
    TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
      if (error) { console.warn('[LOCATION_TASK]', error.message); return null; }
      if (data) {
        const { locations } = data as { locations: any[] };
        // Post new locations to the foreground via a simple event bus (global ref)
        if (locations?.length && (global as any).__outdoorTracker) {
          for (const loc of locations) {
            (global as any).__outdoorTracker(loc);
          }
        }
      }
      return null;
    });
  } catch {
    // ignore
  }
}

// ─── Main Screen ──────────────────────────────────────────────
export default function OutdoorActivityScreen({
  visible,
  onClose,
  initialActivity = 'running',
}: OutdoorActivityScreenProps) {
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  // If the current binary doesn't include native modules yet, show a friendly fallback
  // instead of crashing the Move tab natively through requireNativeComponent.
  const isMapNativelyLinked = UIManager.getViewManagerConfig('AIRMap') != null;

  if (!Location || !TaskManager || !MapView || !Polyline || !Marker || !isMapNativelyLinked) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220', paddingTop: Math.max(insets.top, 12) }} edges={['top', 'bottom']}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Outdoor Activity</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Native build required</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19 }}>
              This recorder uses Maps + background tracking. Your current build doesn’t include the required native modules yet.
            </Text>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14, padding: 14, gap: 6 }}>
              <Text style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' }}>npx expo run:android</Text>
              <Text style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' }}>npx expo run:ios</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{ marginTop: 8, backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );
  const logExerciseEntry = useMutation(api.exercise.logExerciseEntry);

  // ── UI state ─────────────────────────────────────────────────
  type ScreenState = 'select' | 'recording' | 'paused' | 'summary';
  const [screen, setScreen] = useState<ScreenState>('select');
  const [activityType, setActivityType] = useState<ActivityType>(initialActivity);
  const [saving, setSaving] = useState(false);

  // ── Tracking state ────────────────────────────────────────────
  const [trail, setTrail] = useState<Coord[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null); // m/s

  // ── GPX overlay ───────────────────────────────────────────────
  const [gpxRoute, setGpxRoute] = useState<GPXPoint[]>([]);

  // ── Refs ──────────────────────────────────────────────────────
  const mapRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const trailRef = useRef<Coord[]>([]);
  const distanceRef = useRef(0);

  // ── Reset on close ────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      stopTracking(false);
      setScreen('select');
      setTrail([]);
      setDistanceM(0);
      setElapsedSecs(0);
      setGpxRoute([]);
      trailRef.current = [];
      distanceRef.current = 0;
    }
  }, [visible]);

  // ── Timer ─────────────────────────────────────────────────────
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Location handler (called from background task & foreground watch) ──
  const handleLocation = useCallback((loc: any) => {
    if (!isRecordingRef.current) return;
    const coord: Coord = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
      altitude: loc.coords.altitude,
      speed: loc.coords.speed,
    };
    setCurrentSpeed(loc.coords.speed);

    setTrail((prev) => {
      const last = prev.length > 0 ? prev[prev.length - 1] : undefined;
      const delta = last ? haversineM(last, coord) : 0;
      // Filter GPS jitter: ignore jumps < 2 m or > 50 m/s (180 km/h)
      if (delta < 2 && prev.length > 0) return prev;
      if (delta > 50 * ((coord.timestamp - (last?.timestamp ?? coord.timestamp)) / 1000)) return prev;

      distanceRef.current += delta;
      setDistanceM(distanceRef.current);
      trailRef.current = [...prev, coord];
      return trailRef.current;
    });

    // Pan map to new position
    mapRef.current?.animateToRegion({
      latitude: coord.latitude,
      longitude: coord.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  }, []);

  // Register global handler for background task
  useEffect(() => {
    (global as any).__outdoorTracker = handleLocation;
    return () => { (global as any).__outdoorTracker = null; };
  }, [handleLocation]);

  // ── Request permissions ───────────────────────────────────────
  const requestPermissions = async (): Promise<boolean> => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      Alert.alert(
        'Location Required',
        'Bluom needs your location to record your route. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    // Background permission — only needed for background task
    // iOS: shows a second "Always Allow" prompt
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      Alert.alert(
        'Background Location',
        'For uninterrupted tracking when your screen is off, allow location access "Always" in Settings. You can still record with "While Using".',
        [{ text: 'Continue anyway' }, { text: 'Open Settings', onPress: () => { } }]
      );
      // Not a hard failure — foreground-only works fine
    }
    return true;
  };

  // ── Start tracking ────────────────────────────────────────────
  const startTracking = async () => {
    const ok = await requestPermissions();
    if (!ok) return;

    isRecordingRef.current = true;

    // Foreground watcher (immediate, accurate)
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,   // metres
        timeInterval: 2000, // ms fallback
      },
      handleLocation
    );

    // Background task (keeps recording when app is backgrounded)
    const bgEnabled = await Location.hasServicesEnabledAsync();
    if (bgEnabled) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true, // iOS blue bar
        foregroundService: {                    // Android persistent notification
          notificationTitle: 'Bluom is tracking your route',
          notificationBody: 'Tap to return to your activity',
          notificationColor: '#3b82f6',
        },
      });
    }

    startTimer();
    setScreen('recording');

    // Load example GPX (replace with real file picker later)
    const route = await loadGPXRoute();
    if (route.length > 0) setGpxRoute(route);
  };

  // ── Pause ─────────────────────────────────────────────────────
  const pauseTracking = async () => {
    isRecordingRef.current = false;
    pauseTimer();
    setScreen('paused');
  };

  // ── Resume ────────────────────────────────────────────────────
  const resumeTracking = () => {
    isRecordingRef.current = true;
    startTimer();
    setScreen('recording');
  };

  // ── Stop + save ───────────────────────────────────────────────
  const stopTracking = async (save = true) => {
    isRecordingRef.current = false;
    pauseTimer();

    // Stop background task
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch { /* task wasn't started */ }

    if (!save) return;
    setScreen('summary');
  };

  // ── Save to Convex ────────────────────────────────────────────
  const saveActivity = async () => {
    if (!convexUser?._id || elapsedSecs < 10) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const cfg = ACTIVITY_CONFIG[activityType];
      const durationMins = Math.max(1, Math.round(elapsedSecs / 60));
      const weightKg = convexUser.weight ?? 70;
      const met = cfg.metPerHour / 3.5; // approximate MET value
      const caloriesBurned = Math.round(met * weightKg * (durationMins / 60));
      const distanceKm = distanceRef.current / 1000;

      await logExerciseEntry({
        userId: convexUser._id,
        exerciseName: `${cfg.label} — ${distanceKm.toFixed(2)} km`,
        exerciseType: activityType === 'cycling' ? 'cardio' : 'cardio',
        duration: durationMins,
        met: met,
        distance: distanceKm,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Could not save activity.');
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // ── Derived values ────────────────────────────────────────────
  const distanceKm = distanceM / 1000;
  const cfg = ACTIVITY_CONFIG[activityType];
  const paceOrSpeed = activityType === 'cycling'
    ? formatSpeed(distanceKm, elapsedSecs)
    : formatPace(distanceKm, elapsedSecs);

  const liveSpeedKmh = currentSpeed != null ? (currentSpeed * 3.6).toFixed(1) : null;

  // ── Initial region (will be overridden by GPS) ────────────────
  const initialRegion = {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  if (!visible) return null;

  // ─────────────────────────────────────────────────────────────
  // RENDER: Activity selector
  // ─────────────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={sel.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={sel.header}>
            <TouchableOpacity onPress={onClose} style={sel.closeBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={sel.title}>Start Activity</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={sel.subtitle}>What are you doing today?</Text>

          {/* Activity tiles */}
          <View style={sel.grid}>
            {(Object.entries(ACTIVITY_CONFIG) as [ActivityType, typeof ACTIVITY_CONFIG[ActivityType]][]).map(([type, c]) => (
              <TouchableOpacity
                key={type}
                style={[sel.tile, activityType === type && { borderColor: c.color, backgroundColor: c.bg }]}
                onPress={() => setActivityType(type)}
                activeOpacity={0.8}
              >
                <View style={[sel.tileIcon, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon as any} size={28} color={c.color} />
                </View>
                <Text style={[sel.tileLabel, activityType === type && { color: c.color }]}>{c.label}</Text>
                {activityType === type && (
                  <View style={[sel.checkBadge, { backgroundColor: c.color }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Info strip */}
          <View style={sel.infoStrip}>
            <Ionicons name="location" size={16} color="#3b82f6" />
            <Text style={sel.infoText}>
              GPS will activate when you start. Keep your phone accessible for best accuracy.
            </Text>
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[sel.startBtn, { backgroundColor: cfg.color }]}
            onPress={startTracking}
            activeOpacity={0.9}
          >
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={sel.startBtnText}>Start {cfg.label}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Summary screen
  // ─────────────────────────────────────────────────────────────
  if (screen === 'summary') {
    const durationMins = Math.round(elapsedSecs / 60);
    const weightKg = convexUser?.weight ?? 70;
    const met = cfg.metPerHour / 3.5;
    const cals = Math.round(met * weightKg * (durationMins / 60));

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={sum.container} edges={['top', 'bottom']}>
          <View style={sum.header}>
            <View style={[sum.badge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              <Text style={[sum.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={sum.title}>Activity Complete</Text>
          </View>

          <View style={sum.statsGrid}>
            {[
              { label: 'Distance', value: `${distanceKm.toFixed(2)} km` },
              { label: 'Duration', value: formatDuration(elapsedSecs) },
              { label: 'Calories', value: `~${cals} kcal` },
              {
                label: activityType === 'cycling' ? 'Avg Speed' : 'Avg Pace',
                value: activityType === 'cycling'
                  ? `${formatSpeed(distanceKm, elapsedSecs)} km/h`
                  : `${formatPace(distanceKm, elapsedSecs)} /km`
              },
            ].map((s) => (
              <View key={s.label} style={sum.statCard}>
                <Text style={sum.statValue}>{s.value}</Text>
                <Text style={sum.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Mini map of the trail */}
          {trail.length > 1 && (
            <View style={sum.mapWrap}>
              <MapView
                style={sum.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: trail[0].latitude,
                  longitude: trail[0].longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Polyline
                  coordinates={trail}
                  strokeColor={cfg.color}
                  strokeWidth={3}
                />
                <Marker coordinate={trail[0]} pinColor="green" />
                <Marker coordinate={trail[trail.length - 1]} pinColor="red" />
              </MapView>
            </View>
          )}

          <TouchableOpacity
            style={[sum.saveBtn, { backgroundColor: cfg.color }, saving && { opacity: 0.6 }]}
            onPress={saveActivity}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={sum.saveBtnText}>Save Activity</Text>
              </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={sum.discardBtn} onPress={onClose}>
            <Text style={sum.discardText}>Discard</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Recording / Paused (full-screen map)
  // ─────────────────────────────────────────────────────────────
  const isPaused = screen === 'paused';

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => stopTracking(true)}>
      <View style={rec.container}>

        {/* MAP */}
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation
          followsUserLocation={!isPaused}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Live trail */}
          {trail.length > 1 && (
            <Polyline
              coordinates={trail}
              strokeColor={cfg.color}
              strokeWidth={4}
              lineDashPattern={isPaused ? [6, 4] : undefined}
            />
          )}

          {/* Start marker */}
          {trail.length > 0 && (
            <Marker coordinate={trail[0]} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[rec.startDot, { borderColor: cfg.color }]}>
                <View style={[rec.startDotInner, { backgroundColor: cfg.color }]} />
              </View>
            </Marker>
          )}

          {/* GPX reference route overlay */}
          {gpxRoute.length > 1 && (
            <Polyline
              coordinates={gpxRoute}
              strokeColor="#f59e0b"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}
        </MapView>

        {/* PAUSED BANNER */}
        {isPaused && (
          <View style={rec.pauseBanner}>
            <Ionicons name="pause-circle" size={18} color="#f59e0b" />
            <Text style={rec.pauseBannerText}>PAUSED</Text>
          </View>
        )}

        {/* TOP DASHBOARD */}
        <SafeAreaView style={rec.topOverlay} edges={['top']} pointerEvents="box-none">
          <View style={rec.dashCard}>
            {/* Activity badge */}
            <View style={[rec.activityBadge, { backgroundColor: cfg.color }]}>
              <Ionicons name={cfg.icon as any} size={14} color="#fff" />
              <Text style={rec.activityBadgeText}>{cfg.label}</Text>
            </View>

            {/* Primary stats row */}
            <View style={rec.statsRow}>
              <View style={rec.statBlock}>
                <Text style={rec.statValue}>{formatDuration(elapsedSecs)}</Text>
                <Text style={rec.statLabel}>Duration</Text>
              </View>
              <View style={rec.statDivider} />
              <View style={rec.statBlock}>
                <Text style={rec.statValue}>
                  {distanceKm < 1
                    ? `${Math.round(distanceM)} m`
                    : `${distanceKm.toFixed(2)} km`}
                </Text>
                <Text style={rec.statLabel}>Distance</Text>
              </View>
              <View style={rec.statDivider} />
              <View style={rec.statBlock}>
                <Text style={rec.statValue}>{paceOrSpeed}</Text>
                <Text style={rec.statLabel}>{cfg.paceLabel}</Text>
              </View>
            </View>

            {/* Live speed pill */}
            {liveSpeedKmh && (
              <View style={rec.speedPill}>
                <Ionicons name="speedometer-outline" size={12} color={cfg.color} />
                <Text style={[rec.speedPillText, { color: cfg.color }]}>
                  {liveSpeedKmh} km/h
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* BOTTOM CONTROLS */}
        <View style={[rec.controls, { paddingBottom: Math.max(insets.bottom, 24) + 8 }]}>

          {/* Stop button */}
          <TouchableOpacity
            style={rec.stopBtn}
            onPress={() =>
              Alert.alert(
                'Stop Activity?',
                'Your route will be saved.',
                [
                  { text: 'Keep going', style: 'cancel' },
                  { text: 'Stop & Save', style: 'destructive', onPress: () => stopTracking(true) },
                ]
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons name="stop" size={26} color="#ef4444" />
          </TouchableOpacity>

          {/* Pause / Resume — primary button */}
          <TouchableOpacity
            style={[rec.pauseResumeBtn, { backgroundColor: isPaused ? cfg.color : '#1e293b' }]}
            onPress={isPaused ? resumeTracking : pauseTracking}
            activeOpacity={0.9}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={32}
              color="#fff"
              style={isPaused ? { marginLeft: 3 } : undefined}
            />
          </TouchableOpacity>

          {/* GPX load placeholder */}
          <TouchableOpacity
            style={rec.gpxBtn}
            onPress={async () => {
              const route = await loadGPXRoute(/* file uri here */);
              if (route.length) {
                setGpxRoute(route);
                Alert.alert('Route loaded', `${route.length} waypoints.`);
              } else {
                Alert.alert('GPX Routes', 'GPX file upload coming soon.\nYou can upload Wikiloc .gpx files to overlay a reference path.');
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={20} color="#475569" />
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles: selector screen ──────────────────────────────────
const sel = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', paddingHorizontal: 24, marginBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tileIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  tileLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 28,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },
  startBtn: {
    marginHorizontal: 24,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});

// ─── Styles: recording screen ─────────────────────────────────
const rec = StyleSheet.create({
  container: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  dashCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  activityBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  activityBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speedPillText: { fontSize: 12, fontWeight: '700' },
  pauseBanner: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pauseBannerText: { fontSize: 14, fontWeight: '900', color: '#f59e0b', letterSpacing: 2 },
  controls: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  stopBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  pauseResumeBtn: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  gpxBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  startDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  startDotInner: {
    width: 8, height: 8, borderRadius: 4,
  },
});

// ─── Styles: summary screen ───────────────────────────────────
const sum = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: { fontSize: 13, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  mapWrap: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    marginBottom: 24,
  },
  map: { flex: 1 },
  saveBtn: {
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  discardBtn: { alignItems: 'center', paddingVertical: 12 },
  discardText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
});