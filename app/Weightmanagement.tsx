/**
 * app/weight-management.tsx
 *
 * Body Tracking Powerhouse
 * ─────────────────────────
 * Sections:
 *  1. Hero — start / current / goal weight + progress arc
 *  2. BMI Card (free)
 *  3. Quick Weight Log
 *  4. Body Measurements (free to log, history pro)
 *  5. Body Scan / Composition (pro)
 *  6. Before & After Photos (pro)
 *  7. Weight History Chart (pro — sparkline)
 *  8. Stats & KPIs
 *
 * Design: dark-luxury editorial — deep navy/charcoal with electric-blue accents,
 * numerical data rendered large & confident, glassy cards.
 */

import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  Dimensions, Image, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAccessControl } from '@/hooks/useAccessControl';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const BMI_RANGES = [
  { label: 'Underweight', max: 18.5,  color: '#60a5fa' },
  { label: 'Normal',      max: 24.9,  color: '#34d399' },
  { label: 'Overweight',  max: 29.9,  color: '#fbbf24' },
  { label: 'Obese',       max: Infinity, color: '#f87171' },
];

const MEASUREMENT_FIELDS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'chest',      label: 'Chest',       icon: 'expand-outline' },
  { key: 'waist',      label: 'Waist',       icon: 'resize-outline' },
  { key: 'hips',       label: 'Hips',        icon: 'ellipse-outline' },
  { key: 'shoulders',  label: 'Shoulders',   icon: 'arrow-back-outline' },
  { key: 'neck',       label: 'Neck',        icon: 'bandage-outline' },
  { key: 'leftArm',    label: 'Left Arm',    icon: 'fitness-outline' },
  { key: 'rightArm',   label: 'Right Arm',   icon: 'fitness-outline' },
  { key: 'leftThigh',  label: 'Left Thigh',  icon: 'walk-outline' },
  { key: 'rightThigh', label: 'Right Thigh', icon: 'walk-outline' },
  { key: 'leftCalf',   label: 'Left Calf',   icon: 'footsteps-outline' },
  { key: 'rightCalf',  label: 'Right Calf',  icon: 'footsteps-outline' },
];

const SCAN_FIELDS: Array<{ key: string; label: string; unit: string; icon: string }> = [
  { key: 'bodyFatPercent',   label: 'Body Fat',        unit: '%',  icon: 'water-outline' },
  { key: 'muscleMassKg',     label: 'Muscle Mass',     unit: 'kg', icon: 'barbell-outline' },
  { key: 'boneMassKg',       label: 'Bone Mass',       unit: 'kg', icon: 'cube-outline' },
  { key: 'waterPercent',     label: 'Water',           unit: '%',  icon: 'rainy-outline' },
  { key: 'visceralFatLevel', label: 'Visceral Fat',    unit: 'lvl',icon: 'alert-circle-outline' },
  { key: 'bmr',              label: 'BMR',             unit: 'kcal',icon: 'flame-outline' },
  { key: 'metabolicAge',     label: 'Metabolic Age',   unit: 'yrs',icon: 'hourglass-outline' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || !weightKg) return 0;
  const hM = heightCm / 100;
  return Math.round((weightKg / (hM * hM)) * 10) / 10;
}

function getBMICategory(bmi: number) {
  return BMI_RANGES.find(r => bmi < r.max) ?? BMI_RANGES[3];
}

function getBMIBarWidth(bmi: number): number {
  // Maps BMI 10–45 to 0–100%
  return Math.min(100, Math.max(0, ((bmi - 10) / 35) * 100));
}

function kgToLbs(kg: number) { return Math.round(kg * 2.2046 * 10) / 10; }
function lbsToKg(lbs: number) { return lbs / 2.2046; }

function formatWeight(kg: number, useLbs: boolean) {
  if (!kg) return '--';
  return useLbs ? `${kgToLbs(kg)} lb` : `${kg} kg`;
}

function today() { return new Date().toISOString().split('T')[0]; }

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Sparkline — minimal SVG-style weight trend using View-based bars */
function WeightSparkline({ data }: { data: Array<{ weightKg: number; date: string }> }) {
  if (!data.length) return null;
  const reversed = [...data].reverse(); // oldest first
  const min = Math.min(...reversed.map(d => d.weightKg));
  const max = Math.max(...reversed.map(d => d.weightKg));
  const range = max - min || 1;
  const barW = Math.max(3, Math.floor((width - 96) / reversed.length) - 2);

  return (
    <View style={spark.wrap}>
      <View style={spark.chart}>
        {reversed.map((point, i) => {
          const fillH = ((point.weightKg - min) / range) * 60 + 10;
          const isLast = i === reversed.length - 1;
          return (
            <View key={i} style={spark.barWrap}>
              <View style={[spark.bar, { height: fillH, width: barW, backgroundColor: isLast ? '#60a5fa' : '#1e40af' }]} />
            </View>
          );
        })}
      </View>
      <View style={spark.labels}>
        <Text style={spark.label}>{min} kg</Text>
        <Text style={spark.label}>{max} kg</Text>
      </View>
    </View>
  );
}
const spark = StyleSheet.create({
  wrap: { marginTop: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 2 },
  barWrap: { justifyContent: 'flex-end' },
  bar: { borderRadius: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 10, color: '#64748b', fontWeight: '600' },
});

/** Section header */
function SectionHeader({ icon, title, sub, proLocked }: { icon: string; title: string; sub?: string; proLocked?: boolean }) {
  return (
    <View style={sh.row}>
      <View style={sh.iconWrap}>
        <Ionicons name={icon as any} size={16} color="#60a5fa" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={sh.title}>{title}</Text>
          {proLocked && (
            <View style={sh.proBadge}>
              <Text style={sh.proText}>PRO</Text>
            </View>
          )}
        </View>
        {sub && <Text style={sh.sub}>{sub}</Text>}
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.3 },
  sub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  proBadge: {
    backgroundColor: '#fef9c3', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  proText: { fontSize: 9, fontWeight: '900', color: '#d97706' },
});

/** Glass card wrapper */
function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[gc.card, style]}>
      {children}
    </View>
  );
}
const gc = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
});

/** Pro-locked overlay */
function ProLock({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <TouchableOpacity style={pl.overlay} onPress={onUpgrade} activeOpacity={0.9}>
      <View style={pl.inner}>
        <Ionicons name="lock-closed" size={24} color="#fbbf24" />
        <Text style={pl.title}>Pro Feature</Text>
        <Text style={pl.sub}>Unlock full history, body scans & before/after photos</Text>
        <View style={pl.btn}>
          <Ionicons name="sparkles" size={14} color="#1e293b" />
          <Text style={pl.btnText}>Upgrade to Pro</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const pl = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
    padding: 24,
  },
  inner: { alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '900', color: '#f1f5f9' },
  sub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 17 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fbbf24', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9, marginTop: 4,
  },
  btnText: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ActiveModal = 'weight' | 'measurements' | 'scan' | null;

export default function WeightManagementScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { convexUser, isPro, promptUpgrade } = useAccessControl();

  // Convex mutations
  const updateUser        = useMutation(api.users.updateUser);
  const logWeight         = useMutation(api.Bodymetrics.logWeight);
  const logMeasurements   = useMutation(api.Bodymetrics.logMeasurements);
  const logBodyScan       = useMutation(api.Bodymetrics.logBodyScan);
  const saveBodyPhoto     = useMutation(api.Bodymetrics.saveBodyPhoto);
  const generateUploadUrl = useMutation(api.Bodymetrics.generatePhotoUploadUrl);

  // Convex queries
  const weightHistory      = useQuery(api.Bodymetrics.getWeightHistory,      convexUser?._id ? { userId: convexUser._id, limit: 90 } : 'skip');
  const measurementsHistory= useQuery(api.Bodymetrics.getMeasurementsHistory, convexUser?._id ? { userId: convexUser._id, limit: 10 } : 'skip');
  const scanHistory        = useQuery(api.Bodymetrics.getBodyScanHistory,     convexUser?._id ? { userId: convexUser._id, limit: 10 } : 'skip');
  const photoHistory       = useQuery(api.Bodymetrics.getBodyPhotos,          convexUser?._id ? { userId: convexUser._id } : 'skip');

  // Unit preference
  const useLbs = (convexUser?.preferredUnits?.weight ?? 'kg') === 'lbs';
  const unitLabel = useLbs ? 'lb' : 'kg';

  // User weights
  const startWeightKg   = (weightHistory ?? []).length > 0
    ? [...(weightHistory ?? [])].sort((a, b) => a.date.localeCompare(b.date))[0]?.weightKg
    : convexUser?.weight ?? 0;
  const currentWeightKg = (weightHistory ?? [])[0]?.weightKg ?? convexUser?.weight ?? 0;
  const goalWeightKg    = convexUser?.targetWeight ?? 0;
  const heightCm        = convexUser?.height ?? 170;

  const toDisplay = (kg: number) => useLbs ? kgToLbs(kg) : kg;

  // BMI
  const bmi = getBMI(currentWeightKg, heightCm);
  const bmiCategory = getBMICategory(bmi);

  // Progress toward goal
  const progressToGoal = useMemo(() => {
    if (!startWeightKg || !goalWeightKg || !currentWeightKg) return 0;
    const total = Math.abs(startWeightKg - goalWeightKg);
    const done  = Math.abs(startWeightKg - currentWeightKg);
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }, [startWeightKg, goalWeightKg, currentWeightKg]);

  // KPIs
  const totalLost = useMemo(() => {
    if (!startWeightKg || !currentWeightKg) return 0;
    return Math.round(Math.abs(startWeightKg - currentWeightKg) * 10) / 10;
  }, [startWeightKg, currentWeightKg]);

  const remaining = useMemo(() => {
    if (!currentWeightKg || !goalWeightKg) return 0;
    return Math.round(Math.abs(currentWeightKg - goalWeightKg) * 10) / 10;
  }, [currentWeightKg, goalWeightKg]);

  const trend7d = useMemo(() => {
    const recent = (weightHistory ?? []).slice(0, 7);
    if (recent.length < 2) return null;
    const first = recent[recent.length - 1].weightKg;
    const last  = recent[0].weightKg;
    return Math.round((last - first) * 100) / 100;
  }, [weightHistory]);

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [saving, setSaving] = useState(false);

  // Weight form
  const [weightInput, setWeightInput] = useState('');
  const [weightNote,  setWeightNote]  = useState('');

  // Measurements form
  const [measureForm, setMeasureForm] = useState<Record<string, string>>({});

  // Body scan form
  const [scanForm, setScanForm] = useState<Record<string, string>>({});
  const [scanSource, setScanSource] = useState('manual');

  // Goal weight modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLogWeight = async () => {
    if (!convexUser?._id || !weightInput) return;
    setSaving(true);
    try {
      const entered = parseFloat(weightInput);
      if (isNaN(entered) || entered <= 0) throw new Error('Invalid weight');
      const kg = useLbs ? lbsToKg(entered) : entered;

      await logWeight({ userId: convexUser._id, weightKg: Math.round(kg * 100) / 100, note: weightNote || undefined, date: today() });
      // Also update user profile weight
      await updateUser({ userId: convexUser._id, updates: { weight: Math.round(kg * 100) / 100 } });

      setWeightInput(''); setWeightNote(''); setActiveModal(null);
      Alert.alert('Logged!', `Weight saved: ${entered} ${unitLabel}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save weight.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurements = async () => {
    if (!convexUser?._id) return;
    setSaving(true);
    try {
      const parsed: any = {};
      for (const [k, v] of Object.entries(measureForm)) {
        if (v) parsed[k] = parseFloat(v);
      }
      if (!Object.keys(parsed).length) throw new Error('Enter at least one measurement.');
      await logMeasurements({ userId: convexUser._id, date: today(), ...parsed });
      setMeasureForm({}); setActiveModal(null);
      Alert.alert('Saved!', 'Measurements recorded.');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScan = async () => {
    if (!convexUser?._id) return;
    if (!isPro) { promptUpgrade('Body scan tracking requires Pro.'); return; }
    setSaving(true);
    try {
      const parsed: any = {};
      for (const [k, v] of Object.entries(scanForm)) {
        if (v) parsed[k] = parseFloat(v);
      }
      await logBodyScan({ userId: convexUser._id, date: today(), source: scanSource, ...parsed });
      setScanForm({}); setActiveModal(null);
      Alert.alert('Saved!', 'Body scan data recorded.');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!convexUser?._id || !goalInput) return;
    const entered = parseFloat(goalInput);
    if (isNaN(entered)) return;
    const kg = useLbs ? lbsToKg(entered) : entered;
    await updateUser({ userId: convexUser._id, updates: { targetWeight: Math.round(kg * 100) / 100 } });
    setGoalInput(''); setShowGoalModal(false);
  };

  const handlePickPhoto = async (type: 'before' | 'after' | 'progress') => {
    if (!isPro) { promptUpgrade('Before/after photo tracking requires Pro.'); return; }
    if (!convexUser?._id) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      setSaving(true);
      const uploadUrl = await generateUploadUrl();
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: blob });
      const { storageId } = await uploadResponse.json();

      await saveBodyPhoto({
        userId: convexUser._id,
        storageId,
        type,
        date: today(),
        weightKgAtTime: currentWeightKg || undefined,
      });
      Alert.alert('Photo saved!', `Your ${type} photo has been stored.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not upload photo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Latest measurement/scan for display ──────────────────────────────────
  const latestMeasurement = (measurementsHistory ?? [])[0];
  const latestScan        = (scanHistory ?? [])[0];

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <LinearGradient colors={['#0c1220', '#111827']} style={s.headerGrad}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Body Metrics</Text>
          <Text style={s.headerSub}>Your complete physique dashboard</Text>
        </View>
        {isPro && (
          <View style={s.proChip}>
            <Text style={s.proChipText}>PRO</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) + 40 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO: Start / Current / Goal ── */}
        <GlassCard style={{ marginTop: 16 }}>
          <View style={s.heroRow}>
            {/* Start */}
            <View style={s.heroCol}>
              <Text style={s.heroColLabel}>START</Text>
              <Text style={s.heroColValue}>{startWeightKg ? toDisplay(startWeightKg) : '--'}</Text>
              <Text style={s.heroColUnit}>{unitLabel}</Text>
            </View>

            {/* Arc progress */}
            <View style={s.arcWrap}>
              <View style={s.arcOuter}>
                <View style={[s.arcFill, { width: `${progressToGoal}%` }]} />
                <Text style={s.arcPct}>{progressToGoal}%</Text>
                <Text style={s.arcLabel}>to goal</Text>
              </View>
            </View>

            {/* Goal */}
            <View style={[s.heroCol, { alignItems: 'flex-end' }]}>
              <Text style={s.heroColLabel}>GOAL</Text>
              <Text style={s.heroColValue}>{goalWeightKg ? toDisplay(goalWeightKg) : '--'}</Text>
              <Text style={s.heroColUnit}>{unitLabel}</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(true)} style={s.editGoalBtn}>
                <Ionicons name="pencil" size={10} color="#60a5fa" />
                <Text style={s.editGoalText}>edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Current weight + trend */}
          <View style={s.currentRow}>
            <View>
              <Text style={s.currentLabel}>CURRENT</Text>
              <Text style={s.currentValue}>
                {currentWeightKg ? toDisplay(currentWeightKg) : '--'}
                <Text style={s.currentUnit}> {unitLabel}</Text>
              </Text>
            </View>
            {trend7d !== null && (
              <View style={[s.trendBadge, { backgroundColor: trend7d <= 0 ? '#14532d' : '#450a0a' }]}>
                <Ionicons name={trend7d <= 0 ? 'trending-down' : 'trending-up'} size={14} color={trend7d <= 0 ? '#4ade80' : '#f87171'} />
                <Text style={[s.trendText, { color: trend7d <= 0 ? '#4ade80' : '#f87171' }]}>
                  {trend7d > 0 ? '+' : ''}{useLbs ? kgToLbs(Math.abs(trend7d)) : Math.abs(trend7d)} {unitLabel} (7d)
                </Text>
              </View>
            )}
          </View>

          {/* Log weight CTA */}
          <TouchableOpacity style={s.logWeightBtn} onPress={() => setActiveModal('weight')} activeOpacity={0.88}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={s.logWeightBtnText}>Log Today's Weight</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* ── BMI (Free) ── */}
        <GlassCard>
          <SectionHeader icon="stats-chart-outline" title="BMI Calculator" sub="Body Mass Index · always free" />
          <View style={s.bmiRow}>
            <View>
              <Text style={s.bmiNum}>{bmi || '--'}</Text>
              <Text style={[s.bmiCat, { color: bmiCategory.color }]}>{bmi ? bmiCategory.label : 'No data'}</Text>
            </View>
            <View style={s.bmiChart}>
              {/* Segmented bar */}
              <View style={s.bmiBar}>
                {BMI_RANGES.map((r, i) => (
                  <View key={i} style={[s.bmiSegment, { backgroundColor: r.color, opacity: 0.7 }]} />
                ))}
                {/* Pointer */}
                {bmi > 0 && (
                  <View style={[s.bmiPointer, { left: `${getBMIBarWidth(bmi)}%` as any }]} />
                )}
              </View>
              <View style={s.bmiBarLabels}>
                {['<18.5', '24.9', '29.9', '30+'].map((l, i) => (
                  <Text key={i} style={s.bmiBarLabel}>{l}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* BMI categories legend */}
          <View style={s.bmiLegend}>
            {BMI_RANGES.map(r => (
              <View key={r.label} style={s.bmiLegendItem}>
                <View style={[s.bmiLegendDot, { backgroundColor: r.color }]} />
                <Text style={s.bmiLegendText}>{r.label}</Text>
              </View>
            ))}
          </View>

          {/* Ideal weight range */}
          {heightCm > 0 && (
            <View style={s.idealBox}>
              <Text style={s.idealLabel}>Ideal weight range for your height</Text>
              <Text style={s.idealValue}>
                {Math.round(18.5 * (heightCm / 100) ** 2 * 10) / 10}–{Math.round(24.9 * (heightCm / 100) ** 2 * 10) / 10} kg
                {useLbs ? ` · ${kgToLbs(18.5 * (heightCm / 100) ** 2)}–${kgToLbs(24.9 * (heightCm / 100) ** 2)} lb` : ''}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* ── KPI Strip ── */}
        <View style={s.kpiStrip}>
          {[
            { label: 'Lost / Gained', value: `${useLbs ? kgToLbs(totalLost) : totalLost}`, unit: unitLabel, icon: 'scale-outline', color: currentWeightKg <= startWeightKg ? '#4ade80' : '#f87171' },
            { label: 'Remaining',     value: `${useLbs ? kgToLbs(remaining) : remaining}`,  unit: unitLabel, icon: 'flag-outline',  color: '#60a5fa' },
            { label: 'Logs',          value: `${(weightHistory ?? []).length}`,              unit: 'entries', icon: 'list-outline',  color: '#a78bfa' },
          ].map(k => (
            <View key={k.label} style={s.kpiCard}>
              <Ionicons name={k.icon as any} size={16} color={k.color} />
              <Text style={[s.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={s.kpiUnit}>{k.unit}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Weight History Chart (Pro) ── */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
          <SectionHeader icon="analytics-outline" title="Weight Trend" sub="90-day history" proLocked />
          {isPro ? (
            (weightHistory ?? []).length > 1 ? (
              <WeightSparkline data={weightHistory ?? []} />
            ) : (
              <View style={s.emptyChart}>
                <Ionicons name="analytics-outline" size={28} color="#1e3a5f" />
                <Text style={s.emptyText}>Log more weights to see your trend</Text>
              </View>
            )
          ) : (
            <View style={{ height: 90 }}>
              <ProLock onUpgrade={() => promptUpgrade('Weight trend history requires Pro.')} />
            </View>
          )}
        </GlassCard>

        {/* ── Body Measurements ── */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
          <SectionHeader icon="body-outline" title="Body Measurements" sub="All measurements in cm" />

          {/* Latest snapshot */}
          {latestMeasurement ? (
            <View style={s.measureGrid}>
              {MEASUREMENT_FIELDS.filter(f => (latestMeasurement as any)[f.key]).map(f => (
                <View key={f.key} style={s.measureItem}>
                  <Text style={s.measureVal}>{(latestMeasurement as any)[f.key]}</Text>
                  <Text style={s.measureLbl}>{f.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.emptyChart}>
              <Text style={s.emptyText}>No measurements yet. Log your first set.</Text>
            </View>
          )}

          <TouchableOpacity style={s.secondaryBtn} onPress={() => setActiveModal('measurements')} activeOpacity={0.88}>
            <Ionicons name="add" size={16} color="#60a5fa" />
            <Text style={s.secondaryBtnText}>Log Measurements</Text>
          </TouchableOpacity>

          {/* History — pro only */}
          {!isPro && (measurementsHistory ?? []).length > 1 && (
            <ProLock onUpgrade={() => promptUpgrade('Measurement history requires Pro.')} />
          )}
        </GlassCard>

        {/* ── Body Scan / Composition (Pro) ── */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
          <SectionHeader icon="scan-circle-outline" title="Body Scan" sub="Composition data from scale, DEXA, InBody" proLocked />

          {isPro ? (
            <>
              {latestScan ? (
                <View style={s.scanGrid}>
                  {SCAN_FIELDS.filter(f => (latestScan as any)[f.key] !== undefined).map(f => (
                    <View key={f.key} style={s.scanItem}>
                      <Ionicons name={f.icon as any} size={14} color="#60a5fa" style={{ marginBottom: 4 }} />
                      <Text style={s.scanVal}>{(latestScan as any)[f.key]}</Text>
                      <Text style={s.scanUnit}>{f.unit}</Text>
                      <Text style={s.scanLbl}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.emptyChart}>
                  <Text style={s.emptyText}>No scan data yet. Log your body composition.</Text>
                </View>
              )}
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setActiveModal('scan')} activeOpacity={0.88}>
                <Ionicons name="add" size={16} color="#60a5fa" />
                <Text style={s.secondaryBtnText}>Log Body Scan</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ height: 120 }}>
              <ProLock onUpgrade={() => promptUpgrade('Body scan tracking requires Pro.')} />
            </View>
          )}
        </GlassCard>

        {/* ── Before / After Photos (Pro) ── */}
        <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
          <SectionHeader icon="images-outline" title="Before & After" sub="Visual progress tracking" proLocked />

          {isPro ? (
            <>
              {/* Photo grid */}
              {(photoHistory ?? []).length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(photoHistory ?? []).slice(0, 8).map((p: any, i: number) => (
                      <View key={i} style={s.photoThumb}>
                        <Image source={{ uri: p.url }} style={s.photoImg} resizeMode="cover" />
                        <View style={[s.photoTypeBadge, { backgroundColor: p.type === 'before' ? '#1d4ed8' : p.type === 'after' ? '#065f46' : '#451a03' }]}>
                          <Text style={s.photoTypeText}>{p.type}</Text>
                        </View>
                        <Text style={s.photoDate}>{p.date}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={s.emptyChart}>
                  <Text style={s.emptyText}>Start your visual journey. Add your first photo.</Text>
                </View>
              )}

              <View style={s.photoActions}>
                {(['before', 'after', 'progress'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={s.photoBtn}
                    onPress={() => handlePickPhoto(t)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera-outline" size={14} color="#94a3b8" />
                    <Text style={s.photoBtnText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={{ height: 100 }}>
              <ProLock onUpgrade={() => promptUpgrade('Before/after photo tracking requires Pro.')} />
            </View>
          )}
        </GlassCard>

      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── Goal Weight Modal ── */}
      <Modal visible={showGoalModal} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={m.backdrop}>
          <View style={m.sheet}>
            <Text style={m.sheetTitle}>Set Goal Weight</Text>
            <TextInput
              style={m.input}
              placeholder={`Target weight (${unitLabel})`}
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={goalInput}
              onChangeText={setGoalInput}
            />
            <View style={m.btnRow}>
              <TouchableOpacity style={m.cancel} onPress={() => setShowGoalModal(false)}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.confirm} onPress={handleSaveGoal}>
                <Text style={m.confirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Weight Log Modal ── */}
      <Modal visible={activeModal === 'weight'} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={m.container} edges={['top']}>
          <View style={m.modalHeader}>
            <Text style={m.modalTitle}>Log Weight</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={m.body}>
            <Text style={m.label}>Weight ({unitLabel})</Text>
            <TextInput
              style={m.input}
              placeholder={`e.g. ${useLbs ? '175' : '80'}`}
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <Text style={m.label}>Note (optional)</Text>
            <TextInput
              style={[m.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Post-workout, morning, etc."
              placeholderTextColor="#475569"
              value={weightNote}
              onChangeText={setWeightNote}
              multiline
            />
            <TouchableOpacity
              style={[m.saveBtn, (!weightInput || saving) && { opacity: 0.5 }]}
              onPress={handleLogWeight}
              disabled={!weightInput || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Save Weight</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Measurements Modal ── */}
      <Modal visible={activeModal === 'measurements'} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={m.container} edges={['top']}>
          <View style={m.modalHeader}>
            <Text style={m.modalTitle}>Log Measurements</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={m.body}>
            <Text style={m.hint}>All measurements in centimetres. Leave blank to skip.</Text>
            <View style={s.measureFormGrid}>
              {MEASUREMENT_FIELDS.map(f => (
                <View key={f.key} style={m.measureFieldWrap}>
                  <Text style={m.measureFieldLabel}>{f.label}</Text>
                  <TextInput
                    style={m.measureInput}
                    placeholder="cm"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={measureForm[f.key] ?? ''}
                    onChangeText={v => setMeasureForm(prev => ({ ...prev, [f.key]: v }))}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[m.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSaveMeasurements}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Save Measurements</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Body Scan Modal ── */}
      <Modal visible={activeModal === 'scan'} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={m.container} edges={['top']}>
          <View style={m.modalHeader}>
            <Text style={m.modalTitle}>Log Body Scan</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={m.body}>
            {/* Source selector */}
            <Text style={m.label}>Data source</Text>
            <View style={m.sourceRow}>
              {['manual', 'smart_scale', 'dexa', 'inbody'].map(src => (
                <TouchableOpacity
                  key={src}
                  style={[m.sourceChip, scanSource === src && m.sourceChipActive]}
                  onPress={() => setScanSource(src)}
                >
                  <Text style={[m.sourceChipText, scanSource === src && m.sourceChipTextActive]}>
                    {src.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={m.hint}>Leave any field blank to skip it.</Text>

            <View style={s.measureFormGrid}>
              {SCAN_FIELDS.map(f => (
                <View key={f.key} style={m.measureFieldWrap}>
                  <Text style={m.measureFieldLabel}>{f.label} ({f.unit})</Text>
                  <TextInput
                    style={m.measureInput}
                    placeholder={f.unit}
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={scanForm[f.key] ?? ''}
                    onChangeText={v => setScanForm(prev => ({ ...prev, [f.key]: v }))}
                  />
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[m.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSaveScan}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={m.saveBtnText}>Save Body Scan</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1a' },
  scroll:    { flex: 1 },

  // Header
  headerGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', flex: 1, letterSpacing: -0.5 },
  headerSub:   { fontSize: 11, color: '#475569' },
  proChip: {
    backgroundColor: '#fef9c3', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  proChipText: { fontSize: 10, fontWeight: '900', color: '#d97706' },

  // Hero card
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heroCol: { alignItems: 'flex-start' },
  heroColLabel: { fontSize: 9, fontWeight: '800', color: '#475569', letterSpacing: 1.2 },
  heroColValue: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', marginTop: 2 },
  heroColUnit:  { fontSize: 11, color: '#64748b', fontWeight: '600' },
  editGoalBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  editGoalText: { fontSize: 10, color: '#60a5fa', fontWeight: '700' },

  arcWrap: { alignItems: 'center' },
  arcOuter: {
    width: 80, height: 40, borderRadius: 40,
    backgroundColor: '#1e293b', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
    position: 'relative',
  },
  arcFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: '#1d4ed8', opacity: 0.7,
  },
  arcPct: { fontSize: 14, fontWeight: '900', color: '#60a5fa', zIndex: 1 },
  arcLabel: { fontSize: 8, color: '#475569', zIndex: 1 },

  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentLabel: { fontSize: 9, fontWeight: '800', color: '#475569', letterSpacing: 1.2 },
  currentValue: { fontSize: 36, fontWeight: '900', color: '#f1f5f9', letterSpacing: -1 },
  currentUnit:  { fontSize: 16, fontWeight: '600', color: '#64748b' },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  trendText: { fontSize: 12, fontWeight: '700' },

  logWeightBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1d4ed8', borderRadius: 14,
    paddingVertical: 14, marginTop: 16,
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  logWeightBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // BMI
  bmiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, marginBottom: 16 },
  bmiNum: { fontSize: 40, fontWeight: '900', color: '#f1f5f9', lineHeight: 44 },
  bmiCat: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  bmiChart: { flex: 1 },
  bmiBar: {
    flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden',
    gap: 1, position: 'relative', marginBottom: 6,
  },
  bmiSegment: { flex: 1, height: '100%' },
  bmiPointer: {
    position: 'absolute', top: -3, width: 4, height: 16,
    backgroundColor: '#f1f5f9', borderRadius: 2,
    transform: [{ translateX: -2 }],
  },
  bmiBarLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  bmiBarLabel: { fontSize: 9, color: '#475569', fontWeight: '600' },
  bmiLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  bmiLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bmiLegendDot: { width: 8, height: 8, borderRadius: 4 },
  bmiLegendText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  idealBox: {
    backgroundColor: '#0f172a', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  idealLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginBottom: 2 },
  idealValue: { fontSize: 13, color: '#60a5fa', fontWeight: '800' },

  // KPI strip
  kpiStrip: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#1e293b',
  },
  kpiVal:   { fontSize: 20, fontWeight: '900', color: '#f1f5f9' },
  kpiUnit:  { fontSize: 9, color: '#475569', fontWeight: '600' },
  kpiLabel: { fontSize: 9, color: '#64748b', textAlign: 'center' },

  // Measurements
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  measureItem: {
    width: (width - 80) / 4, backgroundColor: '#0f172a',
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  measureVal: { fontSize: 14, fontWeight: '900', color: '#f1f5f9' },
  measureLbl: { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },
  measureFormGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  // Scan grid
  scanGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  scanItem: {
    width: (width - 80) / 3, backgroundColor: '#0f172a',
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  scanVal:  { fontSize: 16, fontWeight: '900', color: '#f1f5f9' },
  scanUnit: { fontSize: 9, color: '#60a5fa', fontWeight: '700' },
  scanLbl:  { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 2 },

  // Photos
  photoThumb: { alignItems: 'center', gap: 4, position: 'relative' },
  photoImg: { width: 90, height: 120, borderRadius: 12 },
  photoTypeBadge: {
    position: 'absolute', top: 6, left: 6,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  photoTypeText: { fontSize: 8, fontWeight: '900', color: '#fff', textTransform: 'uppercase' },
  photoDate: { fontSize: 9, color: '#64748b' },
  photoActions: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  photoBtnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  // Misc
  emptyChart: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText:  { fontSize: 12, color: '#334155', textAlign: 'center' },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#1e3a5f', backgroundColor: '#0c1e35',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '800', color: '#60a5fa' },
});

const m = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: '#1e293b',
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#f1f5f9', marginBottom: 16 },

  container: { flex: 1, backgroundColor: '#111827' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#f1f5f9' },
  body: { padding: 20, paddingBottom: 60 },

  label: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 8 },
  hint:  { fontSize: 11, color: '#475569', marginBottom: 16, fontStyle: 'italic' },
  input: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, padding: 14, fontSize: 16, color: '#f1f5f9',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  btnRow: { flexDirection: 'row', gap: 12 },
  cancel: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  confirm: { flex: 1, backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  measureFieldWrap: { width: (width - 60) / 2 },
  measureFieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 5 },
  measureInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 10, padding: 10, fontSize: 15, color: '#f1f5f9',
  },

  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sourceChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a',
  },
  sourceChipActive: { borderColor: '#1d4ed8', backgroundColor: '#1e3a5f' },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'capitalize' },
  sourceChipTextActive: { color: '#60a5fa' },
});