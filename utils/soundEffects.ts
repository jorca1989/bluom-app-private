import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Canonical, typed sound names for the app.
 * These map to the real files inside `assets/sounds/*`.
 */
export enum SoundEffect {
  LOG_MEAL = 'LOG_MEAL',
  LOG_WATER = 'LOG_WATER',
  LOG_STEPS = 'LOG_STEPS',
  LOG_WORKOUT = 'LOG_WORKOUT',

  WELLNESS_LOG = 'WELLNESS_LOG', // habits/mood/sleep
  ENTER_MEDITATION_HUB = 'ENTER_MEDITATION_HUB',
  ENTER_GAMES_HUB = 'ENTER_GAMES_HUB', // also game select

  GAME_WIN = 'GAME_WIN',
  GAME_LOSS = 'GAME_LOSS',
  GAME_REWARD = 'GAME_REWARD',

  UPGRADE_MORE_GAMES = 'UPGRADE_MORE_GAMES',
  UPGRADE_ALL_FEATURES = 'UPGRADE_ALL_FEATURES',

  NAV_TABS = 'NAV_TABS',
  UI_TAP = 'UI_TAP',
  ERROR = 'ERROR',
}

// Compatibility layer (old string names used in some screens)
export type LegacySoundEffectType =
  | 'chime'
  | 'tick'
  | 'pop'
  | 'waterDroplet'
  | 'swipe'
  | 'pageTurn'
  | 'impact'
  | 'ding'
  | 'heartbeat'
  | 'whistle'
  | 'click'
  | 'spark'
  | 'paper'
  | 'gong'
  | 'breathingIn'
  | 'breathingOut'
  | 'success';

export type SoundSettings = {
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  volume: number; // 0..1
};

const DEFAULT_SETTINGS: SoundSettings = {
  soundEffectsEnabled: true,
  hapticsEnabled: true,
  volume: 0.7,
};

let currentSettings: SoundSettings = DEFAULT_SETTINGS;
let audioModeReady = false;

// Static requires (must be literals for Metro bundler).
const LOG_MEAL_PRIMARY = require('../assets/sounds/LogMeal.wav');
const LOG_MEAL_FALLBACK = require('../assets/sounds/LogWater.wav');

const SOUND_ASSETS: Record<SoundEffect, any> = {
  [SoundEffect.LOG_MEAL]: require('../assets/sounds/LogWater.wav'), // Fallback until LogMeal.wav is fixed
  [SoundEffect.LOG_WATER]: require('../assets/sounds/LogWater.wav'),
  [SoundEffect.LOG_STEPS]: require('../assets/sounds/LogSteps.wav'),
  // Note: filename has a typo in your assets: LogWorkot.wav
  [SoundEffect.LOG_WORKOUT]: require('../assets/sounds/LogWorkot.wav'),

  [SoundEffect.WELLNESS_LOG]: require('../assets/sounds/MarkCheckedHabitsLogSleepAndMood.wav'),
  // Note: file is mp3 in your assets folder
  [SoundEffect.ENTER_MEDITATION_HUB]: require('../assets/sounds/MeditationHub.mp3'),
  [SoundEffect.ENTER_GAMES_HUB]: require('../assets/sounds/JumpingInTheGame.wav'),

  [SoundEffect.GAME_WIN]: require('../assets/sounds/LevelGameCompletion.wav'),
  [SoundEffect.GAME_LOSS]: require('../assets/sounds/FailedLostInGame.wav'),
  [SoundEffect.GAME_REWARD]: require('../assets/sounds/WinningGameCoinRewards.wav'),

  // Note: filename has typos in your assets: UpGradeToPrpToUnlockMoreGames.wav
  [SoundEffect.UPGRADE_MORE_GAMES]: require('../assets/sounds/UpGradeToPrpToUnlockMoreGames.wav'),
  [SoundEffect.UPGRADE_ALL_FEATURES]: require('../assets/sounds/UpDateToProAllTheFeatures.wav'),

  [SoundEffect.NAV_TABS]: require('../assets/sounds/NavigationTabsTappingSound.wav'),
  [SoundEffect.UI_TAP]: require('../assets/sounds/NavigationTabsTappingSound.wav'),
  [SoundEffect.ERROR]: require('../assets/sounds/FailedLostInGame.wav'),
};

const soundCache = new Map<SoundEffect, Audio.Sound>();

export function getSoundSettings(): SoundSettings {
  return currentSettings;
}

export function setSoundSettings(next: Partial<SoundSettings>) {
  currentSettings = { ...currentSettings, ...next };
}

async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    // Respect silent mode on iOS by default (playsInSilentModeIOS: false).
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // ignore
  }
}

async function loadSound(effect: SoundEffect): Promise<Audio.Sound | null> {
  try {
    if (soundCache.has(effect)) return soundCache.get(effect)!;
    await ensureAudioMode();

    const asset = SOUND_ASSETS[effect];
    let sound: Audio.Sound | null = null;
    try {
      const created = await Audio.Sound.createAsync(asset, {
        shouldPlay: false,
        volume: currentSettings.volume,
      });
      sound = created.sound;
    } catch (e: any) {
      // Special-case LOG_MEAL: some Android decoders fail on Broadcast WAV (bext) chunks.
      if (effect === SoundEffect.LOG_MEAL) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            '[soundEffects] LOG_MEAL failed to load. If this persists, re-export LogMeal.wav as a plain PCM WAV (16-bit, 44.1kHz) without bext chunk, or provide LogMeal.mp3.',
            e?.message ?? e
          );
        }
        try {
          const createdFallback = await Audio.Sound.createAsync(LOG_MEAL_FALLBACK, {
            shouldPlay: false,
            volume: currentSettings.volume,
          });
          sound = createdFallback.sound;
        } catch (e2: any) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[soundEffects] LOG_MEAL fallback also failed', e2?.message ?? e2);
          }
          sound = null;
        }
      } else {
        throw e;
      }
    }

    if (!sound) return null;
    soundCache.set(effect, sound);
    return sound;
  } catch (e: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[soundEffects] failed to load sound', effect, e?.message ?? e);
    }
    return null;
  }
}

export async function preloadAllSounds() {
  await ensureAudioMode();
  const effects = Object.values(SoundEffect) as SoundEffect[];
  await Promise.all(effects.map((e) => loadSound(e)));
}

export async function unloadAllSounds() {
  const sounds = [...soundCache.values()];
  soundCache.clear();
  await Promise.all(
    sounds.map(async (s) => {
      try {
        await s.unloadAsync();
      } catch {
        // ignore
      }
    })
  );
}

function mapLegacyToEffect(type: LegacySoundEffectType): SoundEffect {
  switch (type) {
    case 'waterDroplet':
      return SoundEffect.LOG_WATER;
    case 'swipe':
      return SoundEffect.LOG_MEAL;
    case 'pageTurn':
      return SoundEffect.UI_TAP;
    case 'success':
      return SoundEffect.LOG_MEAL;
    case 'chime':
    case 'tick':
    case 'pop':
      return SoundEffect.WELLNESS_LOG;
    case 'click':
      return SoundEffect.UI_TAP;
    case 'spark':
      return SoundEffect.GAME_REWARD;
    case 'impact':
      return SoundEffect.UI_TAP;
    case 'gong':
      return SoundEffect.ENTER_MEDITATION_HUB;
    default:
      return SoundEffect.UI_TAP;
  }
}

/**
 * Primary API.
 * - Plays a mapped sound file (expo-av)
 * - Adds a medium haptic impact when a sound is triggered
 */
export async function triggerSound(effect: SoundEffect) {
  try {
    const s = currentSettings ?? DEFAULT_SETTINGS;
    if (!s.soundEffectsEnabled && !s.hapticsEnabled) return;

    if (s.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (__DEV__ && effect === SoundEffect.LOG_MEAL) {
      // eslint-disable-next-line no-console
      console.log('[soundEffects] trigger LOG_MEAL', { platform: Platform.OS, enabled: s.soundEffectsEnabled, volume: s.volume });
    }

    // Web playback can be restricted without a user gesture; keep haptics-only fallback.
    if (Platform.OS === 'web') {
      if (!s.soundEffectsEnabled) return;
      // Attempt anyway (some environments allow it).
    }

    if (!s.soundEffectsEnabled) return;
    const sound = await loadSound(effect);
    if (!sound) return;
    await sound.setVolumeAsync(s.volume);
    // More robust than replayAsync across platforms/codecs.
    try {
      await sound.stopAsync();
    } catch {
      // ignore
    }
    try {
      await sound.setPositionAsync(0);
    } catch {
      // ignore
    }
    await sound.playAsync();
  } catch {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[soundEffects] triggerSound failed', effect);
    }
  }
}

/**
 * Back-compat API used across the app.
 * Prefer `triggerSound(SoundEffect.X)` in new code.
 */
export function playSound(effect: SoundEffect | LegacySoundEffectType) {
  const resolved = typeof effect === 'string' ? mapLegacyToEffect(effect as LegacySoundEffectType) : effect;
  // fire-and-forget
  triggerSound(resolved);
}








