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
  rain: { id: 'rain', name: 'Rain', category: 'nature', description: 'Gentle rain on leaves', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/rain.mp3' } },
  forest: { id: 'forest', name: 'Forest', category: 'nature', description: 'Birds and nature sounds', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/forest.mp3' } },
  ocean: { id: 'ocean', name: 'Ocean Waves', category: 'nature', description: 'Calming ocean waves', file: { uri: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/ocean.mp3' } },
  waterfall: { id: 'waterfall', name: 'Waterfall', category: 'nature', description: 'Flowing waterfall', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/river.mp3' } },
  river: { id: 'river', name: 'River', category: 'nature', description: 'Flowing river stream', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/river.mp3' } },
  fireplace: { id: 'fireplace', name: 'Fireplace', category: 'nature', description: 'Crackling fire', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/campfire.mp3' } },
  wind: { id: 'wind', name: 'Wind', category: 'nature', description: 'Wind through trees', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/wind.mp3' } },
  city: { id: 'city', name: 'City Ambience', category: 'urban', description: 'Soft city sounds', file: { uri: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/sounds/coffee-shop.mp3' } },
  whiteNoise: { id: 'whiteNoise', name: 'White Noise', category: 'noise', description: 'Focus-enhancing white noise', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/white.mp3' } },
  pinkNoise: { id: 'pinkNoise', name: 'Pink Noise', category: 'noise', description: 'Softer than white noise', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/white.mp3' } },
  brownNoise: { id: 'brownNoise', name: 'Brown Noise', category: 'noise', description: 'Deep, calming noise', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/brown.mp3' } },
  riverFlow: { id: 'riverFlow', name: 'River Flow', category: 'water', description: 'Gentle river flow', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/river.mp3' } },
  underwaterHum: { id: 'underwaterHum', name: 'Underwater', category: 'water', description: 'Deep underwater ambience', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/brown.mp3' } },
  dropletEcho: { id: 'dropletEcho', name: 'Droplet Echo', category: 'water', description: 'Echoing water droplets', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/rain.mp3' } },
  slowRain: { id: 'slowRain', name: 'Slow Rain', category: 'water', description: 'Slow, meditative rain', file: { uri: 'https://raw.githubusercontent.com/danielrosehill/HA-White-Noise-Component/master/audio/rain.mp3' } },
  lakeAmbience: { id: 'lakeAmbience', name: 'Lake Ambience', category: 'water', description: 'Peaceful lake sounds', file: { uri: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/sounds/night.mp3' } },
};

export const getSoundscapesByCategory = (category: Soundscape['category']): Soundscape[] => {
  return Object.values(SOUNDSCAPES).filter(s => s.category === category);
};

export const getAllSoundscapes = (): Soundscape[] => {
  return Object.values(SOUNDSCAPES);
};
