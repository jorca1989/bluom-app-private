import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/context/ThemeContext';

export type VoiceSetProposal = {
  transcript: string;
  operation: 'log_set' | 'undo_last' | 'add_set' | 'unknown';
  setIndex: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  complete?: boolean;
  confidence: number;
};

type Props = {
  visible: boolean;
  exerciseName: string;
  targetSetIndex: number;
  existingSetIndexes: number[];
  unit: 'kg' | 'lb';
  onClose: () => void;
  onApply: (proposal: VoiceSetProposal) => void;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceWorkoutLogModal({ visible, exerciseName, targetSetIndex, existingSetIndexes, unit, onClose, onApply }: Props) {
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const parseVoiceWorkout = useAction(api.aiVoice.parseVoiceWorkoutLog);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [stage, setStage] = useState<'idle' | 'recording' | 'processing' | 'review'>('idle');
  const [proposal, setProposal] = useState<VoiceSetProposal | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | 'add'>(targetSetIndex);

  useEffect(() => {
    if (visible) setSelectedTarget(targetSetIndex);
  }, [targetSetIndex, visible]);

  const reset = () => {
    setStage('idle');
    setProposal(null);
  };

  const close = () => {
    recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    recordingRef.current = null;
    reset();
    onClose();
  };

  const start = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('voiceWorkout.permissionTitle', 'Microphone permission'), t('voiceWorkout.permissionMessage', 'Allow microphone access to log a set by voice.'));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setStage('recording');
    } catch {
      Alert.alert(t('voiceWorkout.startFailed', 'Could not start recording'), t('voiceWorkout.tryAgain', 'Please try again.'));
    }
  };

  const stop = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    setStage('processing');
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      recordingRef.current = null;
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording was captured.');
      const response = await fetch(uri);
      const audioBase64 = await blobToBase64(await response.blob());
      const selectedIndex = selectedTarget === 'add'
        ? Math.max(...existingSetIndexes, 0) + 1
        : selectedTarget;
      const result = await parseVoiceWorkout({
        audioBase64,
        mimeType: 'audio/m4a',
        platform: Platform.OS,
        language: i18n.language,
        exerciseName,
        targetSetIndex: selectedIndex,
        allowAddSet: selectedTarget === 'add',
        unit,
      });
      if (result.status !== 'ok' || result.operation === 'unknown') {
        Alert.alert(t('voiceWorkout.cannotUnderstand', 'Could not understand that set'), t('voiceWorkout.example', 'Try saying, for example: “80 kilos for 8 reps, complete.”'));
        reset();
        return;
      }
      if (selectedTarget !== 'add' && result.operation !== 'undo_last' && !existingSetIndexes.includes(result.setIndex)) {
        Alert.alert(t('voiceWorkout.selectExisting', 'Choose an existing set'), t('voiceWorkout.notInExercise', 'Set {{set}} is not in this exercise. Choose Add a new set if you need another row.', { set: result.setIndex }));
        reset();
        return;
      }
      setProposal(selectedTarget === 'add' && result.operation === 'log_set'
        ? { ...result, operation: 'add_set', setIndex: selectedIndex }
        : result);
      setStage('review');
    } catch {
      Alert.alert(t('voiceWorkout.unavailable', 'Voice logging is unavailable'), t('voiceWorkout.notLogged', 'Your set was not logged. Please try again or enter it manually.'));
      reset();
    }
  };

  const proposalText = proposal?.operation === 'undo_last'
    ? t('voiceWorkout.undoLast', 'Undo the last completed set')
    : proposal?.operation === 'add_set'
      ? t('voiceWorkout.addSet', 'Add set {{set}}', { set: proposal.setIndex })
      : t('voiceWorkout.updateSummary', 'Update set {{set}} · {{weight}} {{unit}} · {{reps}} reps', { set: proposal?.setIndex ?? targetSetIndex, weight: proposal?.weight ?? '—', unit, reps: proposal?.reps ?? '—' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.48)' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('voiceWorkout.title', 'Log {{exercise}}', { exercise: exerciseName })}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 3, fontSize: 13 }}>{t('voiceWorkout.subtitle', 'Speak one set at a time. You review it before saving.')}</Text>
            </View>
            <TouchableOpacity onPress={close} accessibilityLabel={t('voiceWorkout.close', 'Close voice logger')} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {stage !== 'review' && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>{t('voiceWorkout.targetSet', 'Target set')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {existingSetIndexes.map(index => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedTarget(index)}
                    style={{
                      minWidth: 72,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selectedTarget === index ? colors.primary : colors.border,
                      backgroundColor: selectedTarget === index ? colors.primary : colors.surfaceMuted,
                    }}
                    accessibilityLabel={t('voiceWorkout.updateSet', 'Update set {{set}}', { set: index })}
                  >
                    <Text style={{ color: selectedTarget === index ? '#fff' : colors.text, fontWeight: '800', textAlign: 'center' }}>{t('move.setShort', 'Set')} {index}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setSelectedTarget('add')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selectedTarget === 'add' ? colors.primary : colors.border,
                    backgroundColor: selectedTarget === 'add' ? colors.primary : colors.surfaceMuted,
                  }}
                  accessibilityLabel={t('voiceWorkout.addNewAccessibility', 'Add a new set by voice')}
                >
                  <Text style={{ color: selectedTarget === 'add' ? '#fff' : colors.text, fontWeight: '800' }}>{t('voiceWorkout.addNew', 'Add new set')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {stage === 'review' && proposal ? (
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{proposalText}</Text>
                <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>{proposal.transcript || t('voiceWorkout.noTranscript', 'No transcript available')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={reset} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{t('voiceWorkout.tryAgain', 'Try again')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onApply(proposal); close(); }} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>{t('common.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={stage === 'recording' ? stop : start}
              disabled={stage === 'processing'}
              style={{ minHeight: 132, backgroundColor: stage === 'recording' ? '#dc2626' : colors.primary, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              {stage === 'processing' ? <ActivityIndicator color="#fff" /> : <Ionicons name={stage === 'recording' ? 'stop' : 'mic'} size={34} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                {stage === 'processing' ? t('voiceWorkout.understanding', 'Understanding your set…') : stage === 'recording' ? t('voiceWorkout.tapToStop', 'Tap to stop') : t('voiceWorkout.tapToSpeak', 'Tap to speak')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
