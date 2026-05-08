import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

export type AvatarConfig = {
  seed: string;
  top: string;
  hairColor: string; // hex without leading '#'
  eyes: string;
  eyebrows: string;
  mouth?: string;
  facialHair?: string; // 'none' | dicebear id
  facialHairColor?: string; // hex without leading '#'
  skinColor: string; // hex without leading '#'
};

export default function Avatar({
  config,
  size = 84,
}: {
  config: AvatarConfig;
  size?: number;
}) {
  const xml = useMemo(() => {
    try {
      const normalize = (c: string | undefined) => {
        const v = String(c ?? '').trim();
        return v.startsWith('#') ? v.slice(1) : v;
      };

      const facialHair = (config.facialHair ?? 'none') as string;
      return createAvatar(avataaars, {
        seed: config.seed,
        style: ['circle'],
        top: [config.top as any],
        hairColor: [normalize(config.hairColor)],
        eyes: [config.eyes as any],
        eyebrows: [config.eyebrows as any],
        mouth: [((config.mouth ?? 'smile') as any)],
        facialHair: facialHair !== 'none' ? [facialHair as any] : undefined,
        facialHairProbability: facialHair !== 'none' ? 100 : 0,
        facialHairColor: config.facialHairColor ? [normalize(config.facialHairColor)] : undefined,
        skinColor: [normalize(config.skinColor)],
        backgroundColor: ['transparent'],
      }).toString();
    } catch {
      return '';
    }
  }, [config]);

  if (!xml) {
    return <View style={[s.fallback, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <SvgXml xml={xml} width={size} height={size} />
  );
}

const s = StyleSheet.create({
  fallback: { backgroundColor: 'rgba(255,255,255,0.18)' },
});

