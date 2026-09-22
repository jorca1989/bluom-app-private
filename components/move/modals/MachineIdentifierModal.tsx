import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/context/ThemeContext';

type Result = { confidence: number; equipmentName: string; exerciseName: string; primaryMuscles: string[]; setupSteps: string[]; safetyNote: string; uncertain: boolean };

export default function MachineIdentifierModal({ visible, onClose, onUseExercise }: { visible: boolean; onClose: () => void; onUseExercise?: (name: string) => void }) {
  const { colors } = useTheme();
  const { i18n, t } = useTranslation();
  const recognize = useAction(api.ai.recognizeGymMachine);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const scan = async (fromCamera: boolean) => {
    try {
      const image = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.65, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.65, base64: true });
      if (image.canceled || !image.assets[0]?.base64) return;
      setLoading(true);
      const output = await recognize({ imageBase64: image.assets[0].base64, mimeType: image.assets[0].mimeType ?? 'image/jpeg', platform: 'mobile', language: i18n.language });
      setResult(output);
    } catch {
      Alert.alert(
        t('machineIdentifier.errorTitle', 'Could not identify this machine'),
        t('machineIdentifier.errorMessage', 'Try another well-lit photo that includes the equipment label.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setResult(null); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View><Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{t('machineIdentifier.title', 'Identify a machine')}</Text><Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{t('machineIdentifier.subtitle', 'Confirm the suggestion before you add it.')}</Text></View>
          <TouchableOpacity onPress={close} style={{ padding: 8 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          {!result && !loading && <>
            <TouchableOpacity onPress={() => scan(true)} style={{ minHeight: 110, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ionicons name="camera" size={30} color="#fff" /><Text style={{ color: '#fff', fontWeight: '900' }}>{t('machineIdentifier.takePhoto', 'Take a photo')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => scan(false)} style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, fontWeight: '800' }}>{t('machineIdentifier.choosePhoto', 'Choose from library')}</Text></TouchableOpacity>
          </>}
          {loading && <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textMuted }}>{t('machineIdentifier.checking', 'Checking the equipment…')}</Text></View>}
          {result && <>
            <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800' }}>{result.uncertain ? t('machineIdentifier.lowConfidence', 'LOW CONFIDENCE') : t('machineIdentifier.likelyMatch', 'LIKELY MATCH')}</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{result.equipmentName || t('machineIdentifier.unidentified', 'Unidentified equipment')}</Text>
              {!!result.exerciseName && <Text style={{ color: colors.primary, fontWeight: '800' }}>{result.exerciseName}</Text>}
              {!!result.primaryMuscles.length && <Text style={{ color: colors.textMuted }}>{result.primaryMuscles.join(' · ')}</Text>}
            </View>
            {!!result.setupSteps.length && <View style={{ gap: 7 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{t('machineIdentifier.setup', 'Setup')}</Text>{result.setupSteps.map((step, index) => <Text key={index} style={{ color: colors.textMuted, lineHeight: 20 }}>{index + 1}. {step}</Text>)}</View>}
            <View style={{ padding: 13, borderRadius: 12, backgroundColor: colors.surfaceMuted }}><Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{result.safetyNote}</Text></View>
            {!!result.exerciseName && <TouchableOpacity onPress={() => { onUseExercise?.(result.exerciseName); close(); }} style={{ minHeight: 52, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>{t('machineIdentifier.useExercise', 'Use this exercise')}</Text></TouchableOpacity>}
            <TouchableOpacity onPress={() => setResult(null)} style={{ minHeight: 46, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>{t('machineIdentifier.scanAnother', 'Scan another machine')}</Text></TouchableOpacity>
          </>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
