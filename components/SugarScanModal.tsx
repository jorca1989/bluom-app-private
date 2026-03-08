import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

export function SugarScanModal(props: {
  visible: boolean;
  onClose: () => void;
  onResult: (result: SugarScanResult) => void;
}) {
  const { visible, onClose, onResult } = props;
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
    // NOTE (Android): the camera preview can render as a SurfaceView which may ignore stacking/clipping
    // inside transparent modals. Using a full-screen modal avoids the "double layer" preview artifact.
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black/60 justify-center px-5" edges={['top', 'bottom']}>
        <View className="bg-white rounded-2xl border border-slate-200 p-5" style={{ marginBottom: Math.max(insets.bottom, 12) }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-900 font-extrabold text-lg">Scan Product</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
              <Text className="text-slate-600 font-black">✕</Text>
            </TouchableOpacity>
          </View>

          {permission && !permission.granted ? (
            <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
              <Text className="text-slate-800 font-bold mb-2">Camera permission is required.</Text>
              <TouchableOpacity onPress={requestPermission} activeOpacity={0.85} className="bg-slate-900 rounded-xl py-3 items-center">
                <Text className="text-white font-extrabold">Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!canScan ? (
            <View className="rounded-2xl overflow-hidden border border-slate-200 mb-3">
              {(permission?.granted ?? false) ? (
                <View
                  className="h-64 bg-slate-900 overflow-hidden"
                  collapsable={false}
                  style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                >
                  <CameraView
                    ref={(r) => {
                      cameraRef.current = r;
                    }}
                    style={{ width: '100%', height: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                    facing="back"
                    active={visible && !canScan}
                  />
                </View>
              ) : (
                <View className="h-64 bg-slate-900 items-center justify-center px-4">
                  <Text className="text-white font-bold text-center">Enable camera permission to scan products.</Text>
                </View>
              )}
              <View className="bg-white px-3 py-3 flex-row items-center justify-between gap-3">
                <TouchableOpacity onPress={takePhoto} activeOpacity={0.9} className="flex-1 bg-orange-500 py-3 items-center rounded-xl">
                  <Text className="text-white font-extrabold">Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromGallery} activeOpacity={0.9} className="bg-slate-100 border border-slate-200 px-3 py-3 rounded-xl">
                  <Text className="text-slate-900 font-extrabold text-xs">Upload from Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex-row items-center justify-between">
              <Text className="text-emerald-800 font-extrabold">Photo captured</Text>
              <TouchableOpacity onPress={() => setCapturedBase64(null)} activeOpacity={0.8}>
                <Text className="text-blue-600 font-extrabold">Retake</Text>
              </TouchableOpacity>
            </View>
          )}

          {!!error ? <Text className="text-red-600 font-bold mb-3">{error}</Text> : null}

          <TouchableOpacity
            onPress={runScan}
            disabled={!canScan || loading}
            activeOpacity={0.9}
            className={`rounded-xl py-3 items-center ${!canScan || loading ? 'bg-slate-300' : 'bg-blue-600'}`}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-extrabold">Analyze</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}


