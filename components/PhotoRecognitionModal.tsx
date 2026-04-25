import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform, Alert, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useAction } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useTranslation } from 'react-i18next';

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
  isPro?: boolean;
}

export default function PhotoRecognitionModal({ visible, onClose, onRecognized, meal, isPro = false }: PhotoRecognitionModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
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
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
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
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
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
    <Modal visible={visible} animationType="slide" transparent presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={styles.container}>
        {!canRecognize && (permission?.granted ?? true) ? (
          <CameraView
            ref={(r) => { cameraRef.current = r; }}
            style={StyleSheet.absoluteFill}
            facing="back"
            active={visible && !canRecognize}
            onCameraReady={() => setCameraReady(true)}
          >
            {/* Top Bar with Instruction and Close */}
            <SafeAreaView
              style={[styles.topBar, { paddingTop: Math.max(insets.top, 44) }]}
              edges={['top']}
            >
              <View style={styles.topInfo}>
                <Text style={styles.scanTitle}>{t('modals.photo.title', 'Photo AI Log')}</Text>
                <Text style={styles.scanSubtitle}>{t('modals.photo.extract', 'Extract macros from your meal')}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.iconCloseBtn}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Scan Frame Overlay */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              {captureError && <Text style={styles.errorFloatText}>{captureError}</Text>}
            </View>

            <SafeAreaView style={styles.bottomControls} edges={['bottom']}>
              <View style={styles.buttonRow}>
                <View style={{ width: 44 }} />
                
                <TouchableOpacity style={styles.shutterBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.galleryIconBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </CameraView>
        ) : (
          <View style={styles.resultsOverlay}>
            <View style={[styles.resultsHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.resultsHeaderBtn} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={22} color="#1e293b" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultsTitle}>{t('modals.photo.title', 'Photo AI Log')}</Text>
                <Text style={styles.resultsSub}>{t('modals.photo.ready', 'Ready to analyze')}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

             {permission && !permission.granted ? (
                <View style={styles.permContainer}>
                   <Ionicons name="camera-outline" size={48} color="#64748b" />
                   <Text style={styles.permTitle}>{t('modals.photo.camRequired', 'Camera access required')}</Text>
                   <Text style={styles.permSub}>{t('modals.photo.scanFood', 'Scan food to extract macros automatically.')}</Text>
                   <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                      <Text style={styles.permBtnText}>{t('modals.photo.enableCam', 'Enable Camera')}</Text>
                   </TouchableOpacity>
                </View>
             ) : (
                <View style={styles.analysisCard}>
                  <View style={styles.successHeader}>
                    <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                    <Text style={styles.analysisTitle}>{t('modals.photo.captured', 'Photo Captured')}</Text>
                  </View>

                  {recognizeError && <Text style={styles.errorText}>{recognizeError}</Text>}

                  <View style={styles.resultActions}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={resetCapture} disabled={loading}>
                      <Text style={styles.retakeText}>{t('modals.photo.retake', 'Retake')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.analyzeBtn, loading && styles.disabledBtn]} 
                      onPress={handleRecognize} 
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator size="small" color="#ffffff"/> : (
                        <>
                          <Text style={styles.analyzeBtnText}>{t('modals.photo.analyze', 'Analyze Food')}</Text>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
             )}
          </View>
        )}
        <ProUpgradeModal 
          visible={showUpgrade} 
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => {
            setShowUpgrade(false);
            handleClose();
            router.push('/(tabs)/profile');
          }}
          title={t('modals.photo.title', 'AI Photo Log')}
          message={t('modals.photo.upsell', 'Unlock instant AI food recognition and macro tracking with Bluom Pro.')}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topInfo: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  iconCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  galleryIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFloatText: {
    position: 'absolute',
    bottom: 120,
    color: '#ef4444',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resultsOverlay: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F4F0',
  },
  resultsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  resultsSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748b' },
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  permTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  permSub: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 40 },
  permBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
  },
  permBtnText: { color: '#ffffff', fontWeight: 'bold' },
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  retakeText: { color: '#475569', fontWeight: 'bold', fontSize: 15 },
  analyzeBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  disabledBtn: { opacity: 0.6 },
  errorText: { color: '#ef4444', marginBottom: 12, textAlign: 'center', fontWeight: '600' },
});
