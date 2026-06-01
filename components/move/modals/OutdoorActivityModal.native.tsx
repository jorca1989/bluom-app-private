import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OutdoorActivityScreen from './OutdoorActivityScreen.native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function OutdoorActivityModal({ visible, onClose }: Props) {
  if (!visible) return null;
  return <OutdoorActivityScreen visible={visible} onClose={onClose} />;
}
