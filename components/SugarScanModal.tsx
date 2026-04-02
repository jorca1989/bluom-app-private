import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert, StyleSheet as RNStyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export type SugarScanResult = {
  productName: string;
  estimatedSugarGrams: number;
  estimatedCalories: number;
  hiddenSugarsFound: string[];
  smartAlternative: string;
  notes: string;
};

export function SugarScanModal({
  visible,
  onClose,
  onResult,
  isPro,
  onUpgrade
}: {
  visible: boolean;
  onClose: () => void;
  onResult: (result: SugarScanResult) => void;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useAction(api.ai.scanSugarProductFromImage);

  const canScan = useMemo(() => !!capturedBase64, [capturedBase64]);

  // Ask for permission as soon as the modal opens so the preview isn't a black box.
  useEffect(() => {
    if (!visible) return;
    if (permission && !permission.granted) {
      requestPermission().catch(() => {});
    }
  }, [visible, permission?.granted]);

  async function takePhoto() {
    setError(null);
    try {
      if (!isPro) {
        onUpgrade();
        return;
      }
      if (!permission?.granted) {
        const next = await requestPermission();
        if (!next.granted) return;
      }
      const cam = cameraRef.current;
      if (!cam) return;
      const photo = await cam.takePictureAsync({
        base64: true,
        quality: 0.75,
        skipProcessing: true,
      });
      if (!photo?.base64) {
        setError('Could not capture image. Try again.');
        return;
      }
      setCapturedBase64(photo.base64);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Failed to take photo.');
    }
  }

  async function pickFromGallery() {
    if (!isPro) {
      onUpgrade();
      return;
    }
    setError(null);
    try {
      // Avoid redbox/crash if the currently installed build doesn't include the native module yet.
      const native = requireOptionalNativeModule('ExponentImagePicker');
      if (!native) {
        Alert.alert(
          'Build Required',
          'Gallery upload requires a new native build. Please use the camera for now (or rebuild the app).'
        );
        return;
      }

      const ImagePicker = await import('expo-image-picker');
      if (typeof ImagePicker.launchImageLibraryAsync !== 'function') {
        Alert.alert(
          'Build Required',
          'Gallery upload requires a new native build. Please rebuild and try again.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        setError('Could not read image. Please try a different photo.');
        return;
      }
      setCapturedBase64(asset.base64);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : 'Failed to pick image.';
      setError(msg.includes('ExponentImagePicker') ? 'Gallery upload requires a new native build.' : msg);
    }
  }

  async function runScan() {
    if (!capturedBase64) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scan({ imageBase64: capturedBase64, mimeType: 'image/jpeg', platform: Platform.OS });
      if (res?.status === 'maintenance') {
        setError('Temporarily unavailable. Please try again later.');
        return;
      }
      onResult({
        productName: String(res.productName ?? 'Unknown'),
        estimatedSugarGrams: Number(res.estimatedSugarGrams ?? 0),
        estimatedCalories: Number(res.estimatedCalories ?? 0),
        hiddenSugarsFound: Array.isArray(res.hiddenSugarsFound) ? res.hiddenSugarsFound : [],
        smartAlternative: String(res.smartAlternative ?? ''),
        notes: String(res.notes ?? ''),
      });
      setCapturedBase64(null);
      onClose();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={st.container}>
        {!capturedBase64 && (permission?.granted ?? true) ? (
          <CameraView
            ref={(r) => { cameraRef.current = r; }}
            style={RNStyleSheet.absoluteFill}
            facing="back"
            active={visible && !capturedBase64}
          >
            {/* Top Bar */}
            <SafeAreaView style={st.topBar} edges={['top']}>
              <View style={st.topInfo}>
                <Text style={st.scanTitle}>Scan Product</Text>
                <Text style={st.scanSubtitle}>Identify hidden sugars & alternatives</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={st.iconCloseBtn}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </SafeAreaView>

            {/* Frame Overlay */}
            <View style={st.scanOverlay}>
              <View style={st.scanFrame} />
              {!!error && <Text style={st.errorFloatText}>{error}</Text>}
            </View>

            {/* Bottom Controls */}
            <SafeAreaView style={st.bottomControls} edges={['bottom']}>
              <View style={st.buttonRow}>
                <View style={{ width: 44 }} />
                
                <TouchableOpacity style={st.shutterBtn} onPress={takePhoto} activeOpacity={0.8}>
                  <View style={st.shutterInner} />
                </TouchableOpacity>

                <TouchableOpacity style={st.galleryIconBtn} onPress={pickFromGallery} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </CameraView>
        ) : (
          <SafeAreaView style={st.resultsOverlay} edges={['top', 'bottom']}>
             <TouchableOpacity onPress={onClose} style={st.resultsCloseBtn}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>

             {permission && !permission.granted ? (
                <View style={st.permContainer}>
                   <Ionicons name="camera-outline" size={48} color="#64748b" />
                   <Text style={st.permTitle}>Camera access required</Text>
                   <Text style={st.permSub}>Scan food products to find hidden sugars.</Text>
                   <TouchableOpacity style={st.permBtn} onPress={requestPermission}>
                      <Text style={st.permBtnText}>Enable Camera</Text>
                   </TouchableOpacity>
                </View>
             ) : (
                <View style={st.analysisCard}>
                  <View style={st.successHeader}>
                    <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                    <Text style={st.analysisTitle}>Photo Captured</Text>
                  </View>

                  {!!error && <Text style={st.errorText}>{error}</Text>}

                  <View style={st.resultActions}>
                    <TouchableOpacity style={st.retakeBtn} onPress={() => setCapturedBase64(null)} disabled={loading}>
                      <Text style={st.retakeText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[st.analyzeBtn, loading && st.disabledBtn]} 
                      onPress={runScan} 
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator size="small" color="#ffffff"/> : (
                        <>
                          <Text style={st.analyzeBtnText}>Analyze Product</Text>
                          <Ionicons name="sparkles" size={18} color="#ffffff" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
             )}
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

const st = RNStyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  topInfo: { flex: 1 },
  scanTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  iconCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanOverlay: { ...RNStyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: screenWidth * 0.7, height: screenWidth * 0.7,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 30, paddingBottom: 20,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  galleryIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  errorFloatText: {
    position: 'absolute', bottom: 120,
    color: '#ef4444', fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  resultsOverlay: { flex: 1, backgroundColor: '#F5F4F0', padding: 20 },
  resultsCloseBtn: {
    alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  permContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  permTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  permSub: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 40 },
  permBtn: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  permBtnText: { color: '#fff', fontWeight: 'bold' },
  analysisCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  analysisTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  resultActions: { flexDirection: 'row', gap: 12 },
  retakeBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  retakeText: { color: '#475569', fontWeight: 'bold', fontSize: 15 },
  analyzeBtn: {
    flex: 2, flexDirection: 'row', backgroundColor: '#3b82f6',
    paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  disabledBtn: { opacity: 0.6 },
  errorText: { color: '#ef4444', marginBottom: 12, textAlign: 'center', fontWeight: '600' },
});
