import React, { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

type RecognizedFood = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function PhotoRecognitionModal(props: {
  visible: boolean;
  onClose: () => void;
  onRecognized: (item: RecognizedFood) => void;
  meal: string;
  /**
   * Optional: pass base64 + mimeType if the caller already captured a photo.
   * This keeps the UI component compatible while enabling Gemini multimodal input.
   */
  imageBase64?: string;
  mimeType?: string; // e.g. "image/jpeg"
}) {
  const { visible, onClose, onRecognized, meal, imageBase64, mimeType } = props;
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const recognizeFood = useAction(api.ai.recognizeFoodFromImage);

  const effectiveBase64 = imageBase64 ?? capturedBase64 ?? undefined;
  const effectiveMimeType = mimeType ?? capturedMimeType ?? undefined;
  const canRecognize = useMemo(() => !!effectiveBase64 && !!effectiveMimeType, [effectiveBase64, effectiveMimeType]);

  function resetCapture() {
    setCapturedBase64(null);
    setCapturedMimeType(null);
    setCaptureError(null);
  }

  async function handleTakePhoto() {
    setCaptureError(null);
    try {
      if (!permission?.granted) {
        const next = await requestPermission();
        if (!next.granted) return;
      }
      const cam = cameraRef.current;
      if (!cam) return;
      const photo = await cam.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.base64) {
        setCaptureError('Could not capture image data. Try again.');
        return;
      }
      setCapturedBase64(photo.base64);
      // Expo Camera returns JPEG by default on native
      setCapturedMimeType('image/jpeg');
    } catch (e: any) {
      setCaptureError(e?.message ? String(e.message) : 'Failed to take photo.');
    }
  }

  async function handleRecognize() {
    if (!canRecognize) return;
    setLoading(true);
    try {
      const result = await recognizeFood({ imageBase64: effectiveBase64!, mimeType: effectiveMimeType! });
      onRecognized({
        name: result.name ?? 'Unknown',
        calories: Number(result.calories ?? 0),
        protein: Number(result.protein ?? 0),
        carbs: Number(result.carbs ?? 0),
        fat: Number(result.fat ?? 0),
      });
      resetCapture();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={[styles.card, { marginBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.title}>Photo Recognition</Text>
          <Text style={styles.subtitle}>Take a photo of your food and we&apos;ll estimate calories and macros.</Text>

          {/* Permission gate */}
          {permission && !permission.granted && (
            <View style={styles.permissionCard}>
              <Text style={styles.permissionText}>Camera permission is required.</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={requestPermission} activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Camera / Capture */}
          {!canRecognize && (permission?.granted ?? true) && (
            <View style={styles.cameraWrap}>
              <CameraView
                ref={(r) => {
                  cameraRef.current = r;
                }}
                style={styles.camera}
                facing="back"
              />
              {!!captureError && <Text style={styles.errorText}>{captureError}</Text>}
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto} activeOpacity={0.85}>
                <Text style={styles.captureButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Captured state */}
          {canRecognize && (
            <View style={styles.capturedRow}>
              <Text style={styles.capturedText}>Photo captured.</Text>
              {!imageBase64 && (
                <TouchableOpacity style={styles.linkButton} onPress={resetCapture} activeOpacity={0.8}>
                  <Text style={styles.linkButtonText}>Retake</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!canRecognize || loading) && styles.buttonDisabled]}
            onPress={handleRecognize}
            activeOpacity={0.8}
            disabled={!canRecognize || loading}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Recognize Food</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={() => {
              resetCapture();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  cameraWrap: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#0b1220',
  },
  camera: {
    width: '100%',
    height: 260,
  },
  captureButton: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  permissionCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  permissionText: {
    color: '#0f172a',
    marginBottom: 10,
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  capturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  capturedText: {
    color: '#166534',
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  linkButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#fff1f2',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  closeButton: {
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});


