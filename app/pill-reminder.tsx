/**
 * app/pill-reminder.tsx
 * Pill / medication reminder tracker
 * 4 tabs: Today | Calendar | History | Settings
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Switch, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';

const { width: SW } = Dimensions.get('window');
const PILL_COLORS = ['#e11d48','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899'];

// ─── HELPERS ────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function calcStreak(history: any[], schedules: any[]): number {
  if (!schedules.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const scheduled = schedules.filter((s) => s.daysOfWeek.includes(dow));
    if (!scheduled.length) continue;
    const dayLogs = history.filter((l) => l.date === dateStr);
    const allTaken = scheduled.every((s) =>
      dayLogs.some((l) => l.pillName === s.pillName && l.taken)
    );
    if (allTaken) streak++;
    else if (i > 0) break; // broken streak
  }
  return streak;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────

export default function PillReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const today = new Date().toISOString().slice(0, 10);

  // @ts-ignore
  const todayPills = useQuery(api.pillReminder.getTodayPills,
    convexUser?._id ? { userId: convexUser._id, date: today } : 'skip');
  // @ts-ignore
  const history = useQuery(api.pillReminder.getPillHistory,
    convexUser?._id ? { userId: convexUser._id, days: 90 } : 'skip');
  // @ts-ignore
  const schedules = useQuery(api.pillReminder.getPillSchedules,
    convexUser?._id ? { userId: convexUser._id } : 'skip');
  // @ts-ignore
  const logPill = useMutation(api.pillReminder.logPill);
  // @ts-ignore
  const addPillSchedule = useMutation(api.pillReminder.addPillSchedule);
  // @ts-ignore
  const deletePillSchedule = useMutation(api.pillReminder.deletePillSchedule);

  const [activeTab, setActiveTab] = useState<'today'|'calendar'|'history'|'settings'>('today');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDaySheet, setShowDaySheet] = useState(false);
  // New pill form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PILL_COLORS[0]);
  const [newShape, setNewShape] = useState<'round'|'oval'|'square'>('round');
  const [newTime, setNewTime] = useState('08:00');
  const [newDays, setNewDays] = useState([0,1,2,3,4,5,6]);
  const [notificationsOn, setNotificationsOn] = useState(false);

  const streak = useMemo(() =>
    calcStreak(history ?? [], schedules ?? []),
    [history, schedules]);

  const adherenceThisMonth = useMemo(() => {
    if (!history || !schedules || !schedules.length) return 0;
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthLogs = history.filter(l => l.date.startsWith(monthStr));
    const monthDays = now.getDate();
    let total = 0, taken = 0;
    for (let d = 1; d <= monthDays; d++) {
      const dateStr = `${monthStr}-${String(d).padStart(2,'0')}`;
      const dow = new Date(dateStr).getDay();
      const scheduled = schedules.filter(s => s.daysOfWeek.includes(dow));
      total += scheduled.length;
      taken += scheduled.filter(s =>
        monthLogs.some(l => l.date === dateStr && l.pillName === s.pillName && l.taken)
      ).length;
    }
    return total > 0 ? Math.round((taken/total)*100) : 0;
  }, [history, schedules]);

  // Days data for calendar
  const calendarDots = useMemo(() => {
    if (!history || !schedules) return {};
    const map: Record<string, { dots: string[], ring: 'green'|'red'|null }> = {};
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const todayFull = new Date().toISOString().slice(0,10);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dow = new Date(dateStr).getDay();
      const scheduled = (schedules ?? []).filter(s => s.daysOfWeek.includes(dow));
      if (!scheduled.length) { map[dateStr] = { dots: [], ring: null }; continue; }
      const dayLogs = (history ?? []).filter(l => l.date === dateStr);
      const dots = scheduled.map(s => s.color);
      const isFuture = dateStr > todayFull;
      if (isFuture) {
        map[dateStr] = { dots, ring: null };
      } else {
        const allTaken = scheduled.every(s => dayLogs.some(l => l.pillName === s.pillName && l.taken));
        const anyMissed = scheduled.some(s => !dayLogs.some(l => l.pillName === s.pillName && l.taken));
        map[dateStr] = { dots, ring: allTaken ? 'green' : anyMissed ? 'red' : null };
      }
    }
    return map;
  }, [history, schedules, calYear, calMonth]);

  const handleTogglePill = async (pill: any) => {
    if (!convexUser?._id) return;
    await logPill({
      userId: convexUser._id,
      date: today,
      pillName: pill.pillName,
      taken: !pill.taken,
      reminderTime: pill.reminderTime,
      color: pill.color,
      shape: pill.shape,
    });
  };

  const handleAddSchedule = async () => {
    if (!convexUser?._id || !newName.trim()) return;
    await addPillSchedule({
      userId: convexUser._id,
      pillName: newName.trim(),
      reminderTime: newTime,
      color: newColor,
      shape: newShape,
      daysOfWeek: newDays,
    });
    setNewName(''); setNewTime('08:00'); setNewDays([0,1,2,3,4,5,6]);
    Alert.alert('Added', `${newName} schedule saved.`);
  };

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const DAY_NAMES = ['S','M','T','W','T','F','S'];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Day detail bottom sheet */}
      <Modal visible={showDaySheet} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{selectedDay}</Text>
            <TouchableOpacity onPress={() => setShowDaySheet(false)} style={s.sheetClose}>
              <Ionicons name="close" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {(schedules ?? [])
              .filter(s => selectedDay && s.daysOfWeek.includes(new Date(selectedDay!).getDay()))
              .map((pill, i) => {
                const log = (history ?? []).find(l => l.date === selectedDay && l.pillName === pill.pillName);
                return (
                  <View key={i} style={[s.pillCard, { borderLeftColor: pill.color }]}>
                    <View style={[s.pillDot, { backgroundColor: pill.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.pillName}>{pill.pillName}</Text>
                      <Text style={s.pillTime}>⏰ {pill.reminderTime}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: log?.taken ? '#dcfce7' : '#fee2e2' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: log?.taken ? '#15803d' : '#b91c1c' }}>
                        {log?.taken ? '✓ Taken' : '✗ Missed'}
                      </Text>
                    </View>
                  </View>
                );
              })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#e11d48" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Pill Reminder</Text>
          <Text style={s.headerSub}>Medication tracker</Text>
        </View>
        <View style={s.streakBadge}>
          <Text style={s.streakEmoji}>🔥</Text>
          <Text style={s.streakVal}>{streak}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['today','calendar','history','settings'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── TODAY ── */}
        {activeTab === 'today' && (
          <>
            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statVal}>{streak}</Text>
                <Text style={s.statLbl}>Day streak</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>{adherenceThisMonth}%</Text>
                <Text style={s.statLbl}>This month</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statVal}>{(todayPills ?? []).filter(p => p.taken).length}/{(todayPills ?? []).length}</Text>
                <Text style={s.statLbl}>Today</Text>
              </View>
            </View>

            <Text style={s.sectionTitle}>Today's Pills</Text>
            {(todayPills ?? []).length === 0 && (
              <Text style={s.emptyTxt}>No pills scheduled for today. Add one in Settings.</Text>
            )}
            {(todayPills ?? []).map((pill, i) => (
              <TouchableOpacity key={i} style={[s.pillCard, { borderLeftColor: pill.color }]}
                onPress={() => handleTogglePill(pill)} activeOpacity={0.85}>
                <View style={[s.pillDot, { backgroundColor: pill.color, width: 24, height: 24, borderRadius: 12 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.pillName}>{pill.pillName}</Text>
                  <Text style={s.pillTime}>⏰ {pill.reminderTime}</Text>
                </View>
                <View style={[s.takeBtnWrap, pill.taken && { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name={pill.taken ? 'checkmark-circle' : 'ellipse-outline'}
                    size={28} color={pill.taken ? '#15803d' : '#cbd5e1'} />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── CALENDAR ── */}
        {activeTab === 'calendar' && (
          <>
            {/* Month navigation */}
            <View style={s.calNav}>
              <TouchableOpacity onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); }
                else setCalMonth(m => m-1);
              }} style={s.calNavBtn}>
                <Ionicons name="chevron-back" size={18} color="#e11d48" />
              </TouchableOpacity>
              <Text style={s.calNavTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); }
                else setCalMonth(m => m+1);
              }} style={s.calNavBtn}>
                <Ionicons name="chevron-forward" size={18} color="#e11d48" />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={s.calDowRow}>
              {DAY_NAMES.map((d,i) => (
                <Text key={i} style={s.calDow}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={s.calGrid}>
              {/* Empty cells for first day offset */}
              {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                <View key={`empty-${i}`} style={s.calCell} />
              ))}
              {/* Day cells */}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i+1).map(d => {
                const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const info = calendarDots[dateStr];
                const isToday = dateStr === today;
                const ringColor = info?.ring === 'green' ? '#22c55e' : info?.ring === 'red' ? '#ef4444' : undefined;
                const dots = info?.dots ?? [];
                return (
                  <TouchableOpacity key={d} style={[
                    s.calCell,
                    isToday && s.calCellToday,
                    ringColor && { borderWidth: 2, borderColor: ringColor, borderRadius: 100 },
                  ]} onPress={() => {
                    setSelectedDay(dateStr);
                    setShowDaySheet(true);
                  }}>
                    <Text style={[s.calDayNum, isToday && { color: '#e11d48', fontWeight: '900' }]}>{d}</Text>
                    {/* Pill dots */}
                    {dots.length > 0 && (
                      <View style={s.dotRow}>
                        {dots.slice(0,4).map((color, ci) => (
                          <View key={ci} style={[s.calDot, { backgroundColor: color }]} />
                        ))}
                        {dots.length > 4 && (
                          <Text style={s.calDotMore}>+{dots.length - 4}</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={s.calLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#22c55e' }]} /><Text style={s.legendTxt}>All taken</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={s.legendTxt}>Missed</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#94a3b8' }]} /><Text style={s.legendTxt}>Future</Text></View>
            </View>
          </>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <>
            <Text style={s.sectionTitle}>12-Week Adherence</Text>
            {/* Heatmap grid */}
            <View style={s.heatmapGrid}>
              {Array.from({ length: 84 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (83 - i));
                const dateStr = d.toISOString().slice(0,10);
                const dow = d.getDay();
                const scheduled = (schedules ?? []).filter(s => s.daysOfWeek.includes(dow));
                if (!scheduled.length) return <View key={i} style={[s.heatCell, { backgroundColor: '#f1f5f9' }]} />;
                const dayLogs = (history ?? []).filter(l => l.date === dateStr);
                const taken = scheduled.filter(s => dayLogs.some(l => l.pillName === s.pillName && l.taken)).length;
                const ratio = taken / scheduled.length;
                const bg = ratio >= 1 ? '#15803d' : ratio > 0 ? '#86efac' : '#fee2e2';
                return <View key={i} style={[s.heatCell, { backgroundColor: bg }]} />;
              })}
            </View>

            <Text style={s.sectionTitle}>Per-Pill Stats</Text>
            {(schedules ?? []).map((pill, i) => {
              const pillHistory = (history ?? []).filter(l => l.pillName === pill.pillName);
              const taken = pillHistory.filter(l => l.taken).length;
              const missed = pillHistory.filter(l => !l.taken).length;
              return (
                <View key={i} style={[s.pillHistCard, { borderLeftColor: pill.color }]}>
                  <View style={[s.pillDot, { backgroundColor: pill.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pillName}>{pill.pillName}</Text>
                    <Text style={s.pillHistStats}>
                      ✅ {taken} taken  ❌ {missed} missed  📅 {pill.reminderTime}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <>
            <Text style={s.sectionTitle}>Add New Pill</Text>
            <View style={s.formCard}>
              <TextInput
                style={s.input}
                placeholder="Pill name (e.g. Prenatal Multivitamin)"
                placeholderTextColor="#94a3b8"
                value={newName}
                onChangeText={setNewName}
              />
              {/* Color picker */}
              <Text style={s.formLabel}>Color</Text>
              <View style={s.colorRow}>
                {PILL_COLORS.map(c => (
                  <TouchableOpacity key={c} style={[s.colorSwatch, { backgroundColor: c },
                    newColor === c && { borderWidth: 3, borderColor: '#0f172a' }]}
                    onPress={() => setNewColor(c)} />
                ))}
              </View>
              {/* Shape selector */}
              <Text style={s.formLabel}>Shape</Text>
              <View style={s.shapeRow}>
                {(['round','oval','square'] as const).map(sh => (
                  <TouchableOpacity key={sh} style={[s.shapeChip, newShape === sh && s.shapeChipActive]}
                    onPress={() => setNewShape(sh)}>
                    <Text style={[s.shapeChipTxt, newShape === sh && { color: '#fff' }]}>{sh}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Time */}
              <Text style={s.formLabel}>Reminder time (HH:MM)</Text>
              <TextInput
                style={s.input}
                value={newTime}
                onChangeText={setNewTime}
                placeholder="08:00"
                placeholderTextColor="#94a3b8"
                keyboardType="numbers-and-punctuation"
              />
              {/* Days of week */}
              <Text style={s.formLabel}>Days</Text>
              <View style={s.daysRow}>
                {['S','M','T','W','T','F','S'].map((d, idx) => (
                  <TouchableOpacity key={idx}
                    style={[s.dayChip, newDays.includes(idx) && s.dayChipActive]}
                    onPress={() => setNewDays(p => p.includes(idx) ? p.filter(x => x !== idx) : [...p, idx])}>
                    <Text style={[s.dayChipTxt, newDays.includes(idx) && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.addBtn} onPress={handleAddSchedule}>
                <Text style={s.addBtnTxt}>Add Pill Schedule</Text>
              </TouchableOpacity>
            </View>

            {/* Notifications toggle */}
            <View style={s.notifRow}>
              <Ionicons name="notifications-outline" size={20} color="#e11d48" />
              <Text style={s.notifLabel}>Daily reminders</Text>
              <Switch value={notificationsOn} onValueChange={setNotificationsOn}
                trackColor={{ false: '#e2e8f0', true: '#fce7f3' }} thumbColor={notificationsOn ? '#e11d48' : '#cbd5e1'} />
            </View>

            {/* Existing schedules */}
            <Text style={s.sectionTitle}>Your Schedules</Text>
            {(schedules ?? []).map((pill, i) => (
              <View key={i} style={[s.pillCard, { borderLeftColor: pill.color }]}>
                <View style={[s.pillDot, { backgroundColor: pill.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.pillName}>{pill.pillName}</Text>
                  <Text style={s.pillTime}>{pill.reminderTime} · {pill.daysOfWeek.length === 7 ? 'Every day' : `${pill.daysOfWeek.length} days/week`}</Text>
                </View>
                <TouchableOpacity onPress={() => deletePillSchedule({ scheduleId: pill._id })}
                  style={s.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fdf2f8' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fce7f3' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#fed7aa' },
  streakEmoji: { fontSize: 14 },
  streakVal: { fontSize: 15, fontWeight: '900', color: '#ea580c' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fce7f3' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#e11d48' },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  tabLabelActive: { color: '#e11d48', fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginTop: 4 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 30, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  statVal: { fontSize: 22, fontWeight: '900', color: '#e11d48' },
  statLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  pillCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  pillDot: { width: 14, height: 14, borderRadius: 7 },
  pillName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  pillTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  takeBtnWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillHistCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderLeftWidth: 4 },
  pillHistStats: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deleteBtn: { padding: 6 },
  // Calendar
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fce7f3' },
  calNavTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  calDowRow: { flexDirection: 'row', marginBottom: 6 },
  calDow: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  calCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  calCellToday: { backgroundColor: '#fdf2f8', borderRadius: 100 },
  calDayNum: { fontSize: 13, fontWeight: '600', color: '#334155' },
  dotRow: { flexDirection: 'row', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', marginTop: 1 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  calDotMore: { fontSize: 7, color: '#94a3b8', fontWeight: '700' },
  calLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  // Heatmap
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 20 },
  heatCell: { width: (SW - 32 - 87) / 13, height: (SW - 32 - 87) / 13, borderRadius: 3 },
  // Settings form
  formCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  formLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 13, fontSize: 15, color: '#0f172a', marginBottom: 4 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  shapeRow: { flexDirection: 'row', gap: 8 },
  shapeChip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  shapeChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  shapeChipTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  dayChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  dayChipTxt: { fontSize: 12, fontWeight: '700', color: '#475569' },
  addBtn: { backgroundColor: '#e11d48', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  addBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14 },
  notifLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sheetClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
});
