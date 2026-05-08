export type SoundscapeType =
  | 'rain' | 'forest' | 'ocean' | 'waterfall' | 'river' | 'fireplace' | 'wind' | 'city'
  | 'whiteNoise' | 'pinkNoise' | 'brownNoise' | 'riverFlow' | 'underwaterHum' | 'dropletEcho'
  | 'slowRain' | 'lakeAmbience';

export interface Soundscape {
  id: SoundscapeType;
  name: string;
  category: 'nature' | 'water' | 'noise' | 'urban';
  description: string;
  duration?: number;
  file: any | null;
}

export const SOUNDSCAPES: Record<SoundscapeType, Soundscape> = {
  rain: { id: 'rain', name: 'Rain', category: 'nature', description: 'Gentle rain on leaves', file: null },
  forest: { id: 'forest', name: 'Forest', category: 'nature', description: 'Birds and nature sounds', file: null },
  ocean: { id: 'ocean', name: 'Ocean Waves', category: 'nature', description: 'Calming ocean waves', file: null },
  waterfall: { id: 'waterfall', name: 'Waterfall', category: 'nature', description: 'Flowing waterfall', file: null },
  river: { id: 'river', name: 'River', category: 'nature', description: 'Flowing river stream', file: null },
  fireplace: { id: 'fireplace', name: 'Fireplace', category: 'nature', description: 'Crackling fire', file: null },
  wind: { id: 'wind', name: 'Wind', category: 'nature', description: 'Wind through trees', file: null },
  city: { id: 'city', name: 'City Ambience', category: 'urban', description: 'Soft city sounds', file: null },
  whiteNoise: { id: 'whiteNoise', name: 'White Noise', category: 'noise', description: 'Focus-enhancing white noise', file: null },
  pinkNoise: { id: 'pinkNoise', name: 'Pink Noise', category: 'noise', description: 'Softer than white noise', file: null },
  brownNoise: { id: 'brownNoise', name: 'Brown Noise', category: 'noise', description: 'Deep, calming noise', file: null },
  riverFlow: { id: 'riverFlow', name: 'River Flow', category: 'water', description: 'Gentle river flow', file: null },
  underwaterHum: { id: 'underwaterHum', name: 'Underwater', category: 'water', description: 'Deep underwater ambience', file: null },
  dropletEcho: { id: 'dropletEcho', name: 'Droplet Echo', category: 'water', description: 'Echoing water droplets', file: null },
  slowRain: { id: 'slowRain', name: 'Slow Rain', category: 'water', description: 'Slow, meditative rain', file: null },
  lakeAmbience: { id: 'lakeAmbience', name: 'Lake Ambience', category: 'water', description: 'Peaceful lake sounds', file: null },
};

export const getSoundscapesByCategory = (category: Soundscape['category']): Soundscape[] => {
  return Object.values(SOUNDSCAPES).filter(s => s.category === category);
};

export const getAllSoundscapes = (): Soundscape[] => {
  return Object.values(SOUNDSCAPES);
};
