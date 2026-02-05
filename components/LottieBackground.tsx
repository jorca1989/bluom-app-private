import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function LottieBackground({ type }: { type: 'waves' | 'particles' | 'aurora' }) {
  // Placeholder for Lottie animation
  return <View style={[styles.container, { backgroundColor: type === 'waves' ? '#e0f7fa' : type === 'particles' ? '#f3e5f5' : '#e8f5e9' }]} />;
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
});

