import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SoundEffect, triggerSound } from '../utils/soundEffects';
import { SparkleEffect, GlowView } from '../components/MicroInteractions';
import { getBottomContentPadding } from '@/utils/layout';

const { width } = Dimensions.get('window');

const GRATITUDE_PROMPTS = [
    "What made you smile today?",
    "Who is someone you're grateful for?",
    "What is a challenge you've overcome recently?",
    "Describe a small win from this week.",
    "What is something in nature you enjoyed?",
    "What is a skill you are thankful to have?",
];

const JOURNAL_PROMPTS = [
    "What did you learn about yourself today?",
    "Describe a moment of peace.",
    "What is weighing on your mind right now?",
    "What are you most excited about for tomorrow?",
    "If you could change one thing about today, what would it be?",
    "What does your ideal day look like?",
    "How did you practice self-care today?",
];

export default function ReflectionsHub() {
    const router = useRouter();
    const { user: clerkUser } = useUser();
    const insets = useSafeAreaInsets();

    // Data Fetching
    const user = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");
    const today = new Date().toISOString().split('T')[0];
    const hubData = useQuery(api.aimind.getReflectionsHubData, user ? { userId: user._id } : "skip");
    const moodLogs = useQuery(api.wellness.getMoodLogs, user ? { userId: user._id, startDate: "2024-01-01", endDate: today } : "skip");

    // Mutations
    const saveGratitudeMutation = useMutation(api.aimind.saveGratitude);
    const saveJournalMutation = useMutation(api.aimind.saveJournal);
    const upsertMoodMutation = useMutation(api.wellness.upsertMoodForDate);
    const generateInsightAction = useAction(api.ai.generateReflectionInsight);

    // State
    const [activeTab, setActiveTab] = useState<'gratitude' | 'journal'>('gratitude');

    // AI Insight State
    const [showInsightModal, setShowInsightModal] = useState(false);
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
    const [aiInsight, setAiInsight] = useState<{ theme: string; moodCorrelation: string; nudge: string } | null>(null);

    // Gratitude State
    const [gratitudeEntry, setGratitudeEntry] = useState('');
    const [gratitudeLines, setGratitudeLines] = useState<string[]>(['', '', '']);
    const [gratitudePrompt, setGratitudePrompt] = useState<string>(GRATITUDE_PROMPTS[0]);

    // Journal State
    const [journalContent, setJournalContent] = useState('');
    const [journalPrompt, setJournalPrompt] = useState<string>('');
    const [quickThoughts, setQuickThoughts] = useState<string[]>([]);
    const [newQuickThought, setNewQuickThought] = useState('');

    // Mood Picker State (for Journal Save flow)
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [pendingJournalSave, setPendingJournalSave] = useState(false);

    // Effects
    const [triggerSparkle, setTriggerSparkle] = useState(false);
    const [triggerGlow, setTriggerGlow] = useState(false);

    const shuffleGratitudePrompt = () => {
        const random = GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)];
        setGratitudePrompt(random);
        triggerSound(SoundEffect.UI_TAP);
    };

    const generateJournalPrompt = () => {
        const random = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
        setJournalPrompt(random);
        triggerSound(SoundEffect.UI_TAP);
    };

    const addQuickThought = () => {
        if (!newQuickThought.trim()) return;
        setQuickThoughts([...quickThoughts, newQuickThought.trim()]);
        setNewQuickThought('');
        triggerSound(SoundEffect.UI_TAP);
    };

    const removeQuickThought = (index: number) => {
        setQuickThoughts(quickThoughts.filter((_, i) => i !== index));
    };

    // AI Insight Generator
    const handleGenerateInsight = async () => {
        if (!hubData || isGeneratingInsight) return;

        setIsGeneratingInsight(true);
        setShowInsightModal(true);
        triggerSound(SoundEffect.UI_TAP);

        try {
            // Prepare context for AI
            const recentJournals = hubData.recentEntries
                .filter(e => e.type === 'journal')
                .map(e => e.content)
                .join('\n');

            const recentGratitudes = hubData.recentEntries
                .filter(e => e.type === 'gratitude')
                .map(e => e.entry)
                .join('\n');

            const moodHistory = moodLogs ? moodLogs.slice(0, 7).map(m => `${m.date}: ${m.moodEmoji}`).join(' | ') : "No recent mood logs";

            const result = await generateInsightAction({
                journalText: recentJournals || "No recent journals.",
                gratitudeText: recentGratitudes || "No recent gratitude entries.",
                moodHistory
            });

            setAiInsight(result);
        } catch (e) {
            Alert.alert("AI Error", "Could not generate insight right now.");
            setShowInsightModal(false);
        } finally {
            setIsGeneratingInsight(false);
        }
    };

    const handleSaveGratitude = async () => {
        if (!user) return;
        try {
            const payloads: string[] = [];
            const freeform = gratitudeEntry.trim();
            if (freeform) payloads.push(freeform);
            gratitudeLines.forEach((l) => {
                const t = l.trim();
                if (t) payloads.push(t);
            });
            const unique = Array.from(new Set(payloads)).slice(0, 5);

            if (unique.length === 0) {
                Alert.alert("Empty", "Please write something to be grateful for!");
                return;
            }

            setTriggerGlow(true);
            setTriggerSparkle(true);
            triggerSound(SoundEffect.WELLNESS_LOG);

            for (const entry of unique) {
                await saveGratitudeMutation({
                    userId: user._id,
                    entry,
                    date: today,
                });
            }

            // Reset
            setGratitudeEntry('');
            setGratitudeLines(['', '', '']);
            setTimeout(() => setTriggerSparkle(false), 2000);
            setTimeout(() => setTriggerGlow(false), 2000);

            // Minimal toast instead of alert for better flow
            // Alert.alert('Saved!', 'Your gratitude has been recorded.'); 
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save gratitude');
        }
    };

    // Step 1: User clicks "Save Entry" -> Validate & Show Mood Picker
    const initiateJournalSave = () => {
        const content = journalContent.trim();
        const thoughts = quickThoughts.join('\n• ');
        let finalContent = "";
        if (journalPrompt) finalContent += `Prompt: ${journalPrompt}\n\n`;
        if (thoughts) finalContent += `Quick Thoughts:\n• ${thoughts}\n\n`;
        if (content) finalContent += `Entry:\n${content}`;

        if (!finalContent.trim()) {
            Alert.alert("Empty", "Please write something in your journal!");
            return;
        }

        // Show Mood Picker
        setPendingJournalSave(true);
        setShowMoodPicker(true);
    };

    // Step 2: User selects mood -> Save Everything
    const finalizeJournalSave = async (selectedMood: number | null) => {
        setShowMoodPicker(false);
        setPendingJournalSave(false);

        if (!user) return;

        const content = journalContent.trim();
        const thoughts = quickThoughts.join('\n• ');
        let finalContent = "";
        if (journalPrompt) finalContent += `Prompt: ${journalPrompt}\n\n`;
        if (thoughts) finalContent += `Quick Thoughts:\n• ${thoughts}\n\n`;
        if (content) finalContent += `Entry:\n${content}`;

        try {
            setTriggerGlow(true);
            setTriggerSparkle(true);
            triggerSound(SoundEffect.WELLNESS_LOG);


            // Perform both actions concurrently (TypeScript: typed as any[] to allow mixed return types)
            const promises: Promise<any>[] = [
                saveJournalMutation({
                    userId: user._id,
                    content: finalContent,
                    date: today,
                    moodTag: selectedMood ? ['😢', '😟', '😐', '🙂', '😄'][selectedMood - 1] : 'Journal'
                })
            ];

            if (selectedMood) {
                promises.push(upsertMoodMutation({
                    userId: user._id,
                    mood: selectedMood as 1 | 2 | 3 | 4 | 5,
                    date: today,
                    note: "Logged via Reflections Hub"
                }));
            }

            await Promise.all(promises);

            // Reset
            setJournalContent('');
            setJournalPrompt('');
            setQuickThoughts([]);
            setNewQuickThought(''); // Clear input too
            setTimeout(() => setTriggerSparkle(false), 2000);
            setTimeout(() => setTriggerGlow(false), 2000);

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save journal');
        }
    };

    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Reflections</Text>
                    {hubData && hubData.streak > 0 && (
                        <View style={styles.streakBadge}>
                            <Ionicons name="flame" size={14} color="#f59e0b" />
                            <Text style={styles.streakText}>{hubData.streak} Day Streak</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.aiButton}
                    onPress={handleGenerateInsight}
                >
                    <Ionicons name="sparkles" size={20} color="#8b5cf6" />
                </TouchableOpacity>
            </View>

            {/* AI Insight Modal/Overlay */}
            {showInsightModal && (
                <View style={styles.insightOverlay}>
                    <View style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <Text style={styles.insightTitle}>✨ Digital Mirror</Text>
                            <TouchableOpacity onPress={() => setShowInsightModal(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {isGeneratingInsight ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#8b5cf6" />
                                <Text style={styles.loadingText}>Analyzing your mental weather...</Text>
                            </View>
                        ) : aiInsight ? (
                            <View>
                                <View style={styles.insightSection}>
                                    <Text style={styles.insightLabel}>THEME</Text>
                                    <Text style={styles.insightBody}>{aiInsight.theme}</Text>
                                </View>
                                <View style={styles.insightSection}>
                                    <Text style={styles.insightLabel}>MOOD LINK</Text>
                                    <Text style={styles.insightBody}>{aiInsight.moodCorrelation}</Text>
                                </View>
                                <View style={[styles.insightSection, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.insightLabel}>NUDGE</Text>
                                    <Text style={styles.insightBody}>{aiInsight.nudge}</Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.errorText}>Unable to generate insight.</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Mood Picker Overlay */}
            {showMoodPicker && (
                <View style={styles.moodOverlay}>
                    <View style={styles.moodCard}>
                        <Text style={styles.moodTitle}>How did writing this make you feel?</Text>
                        <View style={styles.moodRow}>
                            {[
                                { val: 1, emoji: '😢', label: 'Rough' },
                                { val: 2, emoji: '😟', label: 'Down' },
                                { val: 3, emoji: '😐', label: 'Okay' },
                                { val: 4, emoji: '🙂', label: 'Good' },
                                { val: 5, emoji: '😄', label: 'Great' },
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.val}
                                    style={styles.moodBtn}
                                    onPress={() => finalizeJournalSave(m.val)}
                                >
                                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                    <Text style={styles.moodLabel}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.skipBtn} onPress={() => finalizeJournalSave(null)}>
                            <Text style={styles.skipText}>Skip Mood Log</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'gratitude' && styles.activeTab]}
                    onPress={() => setActiveTab('gratitude')}
                >
                    <Ionicons name="heart" size={20} color={activeTab === 'gratitude' ? '#fff' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'gratitude' && styles.activeTabText]}>Gratitude</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'journal' && styles.activeTab]}
                    onPress={() => setActiveTab('journal')}
                >
                    <Ionicons name="book" size={20} color={activeTab === 'journal' ? '#fff' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>Journal</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}>

                    <GlowView visible={triggerGlow} color={activeTab === 'gratitude' ? "#f43f5e" : "#f59e0b"}>
                        {activeTab === 'gratitude' ? (
                            <View style={styles.card}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Daily Gratitude</Text>
                                    <SparkleEffect visible={triggerSparkle} />
                                </View>

                                <View style={styles.promptContainer}>
                                    <Text style={styles.promptText}>{gratitudePrompt}</Text>
                                    <TouchableOpacity onPress={shuffleGratitudePrompt} style={styles.shuffleButton}>
                                        <Ionicons name="shuffle" size={16} color="#f43f5e" />
                                        <Text style={styles.shuffleText}>Surprise Me</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Quick 3 (Optional)</Text>
                                {gratitudeLines.map((line, i) => (
                                    <View key={i} style={styles.lineInputContainer}>
                                        <Text style={styles.lineNumber}>{i + 1}.</Text>
                                        <TextInput
                                            style={styles.lineInput}
                                            placeholder="I'm grateful for..."
                                            value={line}
                                            onChangeText={(t) => {
                                                const newLines = [...gratitudeLines];
                                                newLines[i] = t;
                                                setGratitudeLines(newLines);
                                            }}
                                        />
                                    </View>
                                ))}

                                <Text style={[styles.label, { marginTop: 16 }]}>Deep Dive</Text>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Elaborate on what you're feeling..."
                                    multiline
                                    numberOfLines={4}
                                    value={gratitudeEntry}
                                    onChangeText={setGratitudeEntry}
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveGratitude}>
                                    <Text style={styles.saveButtonText}>Save Gratitude</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.card, { borderColor: '#fef3c7' }]}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: '#d97706' }]}>My Journal</Text>
                                    <SparkleEffect visible={triggerSparkle} />
                                </View>

                                {/* Prompt Generator */}
                                <View style={[styles.promptContainer, { backgroundColor: '#fffbeb' }]}>
                                    {journalPrompt ? (
                                        <Text style={[styles.promptText, { color: '#92400e' }]}>{journalPrompt}</Text>
                                    ) : (
                                        <Text style={[styles.promptText, { color: '#9ca3af', fontStyle: 'italic' }]}>Need inspiration?</Text>
                                    )}
                                    <TouchableOpacity onPress={generateJournalPrompt} style={[styles.shuffleButton, { backgroundColor: '#fef3c7' }]}>
                                        <Ionicons name="bulb" size={16} color="#d97706" />
                                        <Text style={[styles.shuffleText, { color: '#d97706' }]}>Journal Prompt</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Quick Thoughts */}
                                <Text style={styles.label}>Quick Thoughts</Text>
                                <View style={styles.quickInputContainer}>
                                    <TextInput
                                        style={[styles.lineInput, { flex: 1, marginBottom: 0 }]}
                                        placeholder="Add a bullet point..."
                                        value={newQuickThought}
                                        onChangeText={setNewQuickThought}
                                        onSubmitEditing={addQuickThought}
                                    />
                                    <TouchableOpacity onPress={addQuickThought} style={styles.addButton}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                {quickThoughts.length > 0 && (
                                    <View style={styles.thoughtsList}>
                                        {quickThoughts.map((qt, idx) => (
                                            <View key={idx} style={styles.thoughtItem}>
                                                <Text style={styles.thoughtText}>• {qt}</Text>
                                                <TouchableOpacity onPress={() => removeQuickThought(idx)}>
                                                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Main Entry */}
                                <Text style={[styles.label, { marginTop: 16 }]}>Journal Entry</Text>
                                <TextInput
                                    style={[styles.textArea, { height: 200 }]}
                                    placeholder="Pour your heart out..."
                                    multiline
                                    value={journalContent}
                                    onChangeText={setJournalContent}
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#f59e0b' }]} onPress={initiateJournalSave}>
                                    <Text style={styles.saveButtonText}>Save Entry</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </GlowView>

                    {/* Recent Entries from Unified Feed */}
                    {hubData && hubData.recentEntries.length > 0 && (
                        <View style={styles.recentSection}>
                            <Text style={styles.recentHeader}>Recent Reflections</Text>
                            {hubData.recentEntries.map((e, idx) => (
                                <View key={idx} style={[styles.recentCard, { borderLeftColor: e.type === 'gratitude' ? '#f43f5e' : '#f59e0b' }]}>
                                    <Text style={styles.recentDate}>{e.date}</Text>
                                    <Text style={styles.recentText} numberOfLines={2}>
                                        {e.type === 'gratitude' ? e.entry : e.content}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    tabsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#1e293b',
        borderColor: '#1e293b',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    activeTabText: {
        color: '#fff',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#ffe4e6', // Default pinkish for gratitude
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f43f5e',
    },
    promptContainer: {
        backgroundColor: '#fff1f2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    promptText: {
        fontSize: 16,
        color: '#9f1239',
        marginBottom: 12,
        lineHeight: 24,
        fontWeight: '500',
    },
    shuffleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ffe4e6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    shuffleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f43f5e',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    lineInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    lineNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#cbd5e1',
        width: 20,
    },
    lineInput: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#334155',
    },
    textArea: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#334155',
        minHeight: 120,
    },
    saveButton: {
        backgroundColor: '#f43f5e',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#f43f5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    quickInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    addButton: {
        backgroundColor: '#f59e0b',
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thoughtsList: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    thoughtItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    thoughtText: {
        fontSize: 14,
        color: '#475569',
        flex: 1,
        marginRight: 8,
    },
    headerCenter: {
        alignItems: 'center',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    streakText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#d97706',
    },
    aiButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f5f3ff',
        borderWidth: 1,
        borderColor: '#ddd6fe',
    },
    recentSection: {
        marginTop: 24,
    },
    recentHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    recentCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    recentDate: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 6,
        fontWeight: '600',
    },
    recentText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    // Modals/Overlays
    insightOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        padding: 20,
    },
    insightCard: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    insightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    insightTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#7c3aed',
    },
    insightSection: {
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 12,
    },
    insightLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 6,
    },
    insightBody: {
        fontSize: 16,
        color: '#334155',
        lineHeight: 24,
        fontWeight: '500',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
        gap: 16,
    },
    loadingText: {
        color: '#64748b',
        fontWeight: '500',
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        padding: 20,
    },
    moodOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 60,
    },
    moodCard: {
        alignItems: 'center',
        width: '85%',
    },
    moodTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 32,
    },
    moodRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 32,
    },
    moodBtn: {
        alignItems: 'center',
        gap: 8,
    },
    moodEmoji: {
        fontSize: 32,
    },
    moodLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    skipBtn: {
        padding: 12,
    },
    skipText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '500',
    }
});
