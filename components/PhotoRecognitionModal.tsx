import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

type RecognizedFood = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

interface PhotoRecognitionModalProps {
  visible: boolean;
  onClose: () => void;
  onRecognized: (item: RecognizedFood) => void;
  meal: string;
}

export default function PhotoRecognitionModal({ visible, onClose, onRecognized, meal }: PhotoRecognitionModalProps) {
  const [loading, setLoading] = useState(false);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  
  const cameraRef = React.useRef<CameraView | null>(null);
  const recognizeFood = useAction(api.ai.recognizeFoodFromImage);

  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const canRecognize = !!capturedBase64 && !!capturedMimeType;

  function resetCapture() {
    setCapturedBase64(null);
    setCapturedMimeType(null);
    setCaptureError(null);
    setRecognizeError(null);
  }

  const handleClose = () => {
    resetCapture();
    onClose();
  };

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
      setCapturedMimeType('image/jpeg');
    } catch (e: any) {
      setCaptureError(e?.message ? String(e.message) : 'Failed to take photo.');
    }
  }

  async function handlePickFromGallery() {
    setCaptureError(null);
    setRecognizeError(null);
    try {
      const native = requireOptionalNativeModule('ExponentImagePicker');
      if (!native) {
        Alert.alert(
          'Build Required',
          'Gallery upload requires a new native build. Please use the camera for now (or rebuild the app).'
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        setCaptureError('Could not read image. Please try a different photo.');
        return;
      }
      setCapturedBase64(asset.base64);
      setCapturedMimeType(asset.mimeType ?? 'image/jpeg');
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : 'Failed to pick image.';
      setCaptureError(msg.includes('ExponentImagePicker') ? 'Gallery upload requires a new native build.' : msg);
    }
  }

  async function handleRecognize() {
    if (!canRecognize) return;
    setLoading(true);
    setRecognizeError(null);
    try {
      const result = await recognizeFood({
        imageBase64: capturedBase64!,
        mimeType: capturedMimeType!,
        platform: Platform.OS,
      });
      if (result?.status === 'maintenance') {
        setRecognizeError('Temporarily unavailable. Please try again in a bit.');
        return;
      }
      onRecognized({
        name: result.name ?? 'Unknown',
        calories: Number(result.calories ?? 0),
        protein: Number(result.protein ?? 0),
        carbs: Number(result.carbs ?? 0),
        fat: Number(result.fat ?? 0),
      });
      handleClose();
    } catch (e) {
      setRecognizeError('Failed to analyze food. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <SafeAreaView style={styles.overlay} edges={['bottom', 'top']}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Photo AI Log</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Take a photo of your food, and we'll automatically extract the macros and calories.</Text>

          {permission && !permission.granted && (
            <View style={styles.permissionCard}>
              <Ionicons name="camera-outline" size={32} color="#64748b" style={styles.permIcon}/>
              <Text style={styles.permissionText}>Camera access is required to take photos</Text>
              <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
                <Text style={styles.permButtonText}>Allow Camera Access</Text>
              </TouchableOpacity>
            </View>
          )}

          {!canRecognize && (permission?.granted ?? true) && (
            <View style={styles.cameraWrapper}>
              <View style={styles.cameraViewWrap}>
                 <CameraView
                  ref={(r) => { cameraRef.current = r; }}
                  style={styles.camera}
                  facing="back"
                  active={visible && !canRecognize}
                  onCameraReady={() => setCameraReady(true)}
                />
                {!cameraReady && (
                   <View style={styles.cameraLoading}>
                      <ActivityIndicator size="small" color="#ffffff" />
                   </View>
                )}
              </View>
              {captureError && <Text style={styles.errorText}>{captureError}</Text>}
              
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.primaryActionButton} onPress={handleTakePhoto} activeOpacity={0.8}>
                   <Ionicons name="camera" size={20} color="#ffffff" />
                   <Text style={styles.primaryActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryActionButton} onPress={handlePickFromGallery} activeOpacity={0.8}>
                   <Ionicons name="images" size={20} color="#475569" />
                   <Text style={styles.secondaryActionText}>Upload from Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {canRecognize && (
            <View style={styles.capturedView}>
              <View style={styles.successBadge}>
                 <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                 <Text style={styles.successText}>Photo Captured</Text>
              </View>
              
              {recognizeError && <Text style={styles.errorText}>{recognizeError}</Text>}

              <View style={styles.actionButtonsRow}>
                 <TouchableOpacity style={styles.secondaryActionButton} onPress={resetCapture} disabled={loading}>
                   <Text style={styles.secondaryActionText}>Retake Photo</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.primaryActionButton, loading && styles.disabledButton]} onPress={handleRecognize} disabled={loading}>
                   {loading ? <ActivityIndicator size="small" color="#ffffff"/> : (
                     <>
                        <Text style={styles.primaryActionText}>Analyze Food</Text>
                        <Ionicons name="sparkles" size={18} color="#ffffff" />
                     </>
                   )}
                 </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permIcon: {
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  permButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  cameraWrapper: {
    gap: 16,
  },
  cameraViewWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraLoading: {
    position: 'absolute',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabledButton: {
     opacity: 0.7,
  },
  capturedView: {
    gap: 20,
  },
  successBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successText: {
    color: '#166534',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
  },
});
