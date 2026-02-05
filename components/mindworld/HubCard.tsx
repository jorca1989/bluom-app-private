import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LucideIcon } from 'lucide-react-native';

interface HubCardProps {
  title: string;
  subtitle: string;
  Icon: any;
  onPress: () => void;
  color?: string;
  bgColor?: string;
}

export function HubCard({ title, subtitle, Icon, onPress, color = '#2563eb', bgColor = '#eff6ff' }: HubCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="w-[47%] bg-white rounded-[32px] p-5 mb-4 border border-slate-100 shadow-sm"
    >
      <View style={{ backgroundColor: bgColor }} className="w-12 h-12 rounded-2xl items-center justify-center mb-4">
        {typeof Icon === 'string' ? (
          <Ionicons name={Icon as any} size={24} color={color} />
        ) : (
          <Icon size={24} color={color} />
        )}
      </View>
      <Text className="text-slate-900 font-black text-base leading-tight mb-1">{title}</Text>
      <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">{subtitle}</Text>
    </TouchableOpacity>
  );
}

