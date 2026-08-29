import { useState, useEffect, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';

export type PrimaryFocus = 'fitness' | 'mental_health' | 'hormonal' | 'holistic';

export type ToolKey =
  | 'aiCoach'
  | 'womens'
  | 'mens'
  | 'fasting'
  | 'library'
  | 'tasks'
  | 'focus'
  | 'recipes'
  | 'workouts'
  | 'metabolic'
  | 'dental'
  | 'pulse'
  | 'fuel'
  | 'move'
  | 'wellness';

export const ALL_TOOLS: ToolKey[] = [
  'aiCoach',
  'womens',
  'mens',
  'fasting',
  'library',
  'tasks',
  'focus',
  'recipes',
  'workouts',
  'metabolic',
  'dental',
  'pulse',
  'fuel',
  'move',
  'wellness',
];

export function getPresetForFocus(focus: PrimaryFocus, gender?: 'male' | 'female'): ToolKey[] {
  const isMale = gender === 'male';
  if (focus === 'mental_health') {
    return ['aiCoach', 'library', 'tasks', 'focus', 'pulse', 'wellness'];
  }
  if (focus === 'fitness') {
    return isMale
      ? ['aiCoach', 'mens', 'fasting', 'recipes', 'workouts', 'metabolic', 'fuel', 'move']
      : ['aiCoach', 'womens', 'fasting', 'recipes', 'workouts', 'metabolic', 'fuel', 'move'];
  }
  if (focus === 'hormonal') {
    return isMale
      ? ['aiCoach', 'mens', 'fasting', 'recipes', 'pulse', 'wellness', 'fuel']
      : ['aiCoach', 'womens', 'fasting', 'recipes', 'pulse', 'wellness', 'fuel'];
  }
  // holistic:
  return isMale
    ? ALL_TOOLS.filter((t) => t !== 'womens')
    : ALL_TOOLS.filter((t) => t !== 'mens');
}

export const WORKSPACE_PRESETS: Record<PrimaryFocus, ToolKey[]> = {
  mental_health: ['aiCoach', 'library', 'tasks', 'focus', 'pulse', 'wellness'],
  fitness: ['aiCoach', 'fasting', 'recipes', 'workouts', 'metabolic', 'fuel', 'move'],
  hormonal: ['aiCoach', 'womens', 'fasting', 'recipes', 'pulse', 'wellness', 'fuel'],
  holistic: ALL_TOOLS,
};

export const ACTIVE_TOOLS_STORAGE_KEY = 'bluom_active_tools_v1';

export function useActiveTools() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : 'skip');
  const updateUser = useMutation(api.users.updateUser);

  const [activeTools, setActiveTools] = useState<Set<ToolKey>>(() => new Set(ALL_TOOLS));
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from SecureStore on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(ACTIVE_TOOLS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ToolKey[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActiveTools(new Set(parsed));
          }
        }
      } catch (err) {
        console.warn('Failed to load active tools from SecureStore', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Sync from Convex if available
  useEffect(() => {
    if (convexUser?.activeTools && Array.isArray(convexUser.activeTools) && convexUser.activeTools.length > 0) {
      const validTools = convexUser.activeTools.filter((t: string): t is ToolKey => ALL_TOOLS.includes(t as ToolKey));
      if (validTools.length > 0) {
        setActiveTools(new Set(validTools));
        SecureStore.setItemAsync(ACTIVE_TOOLS_STORAGE_KEY, JSON.stringify(validTools)).catch(() => {});
      }
    } else if (convexUser?.primaryFocus) {
      const preset = getPresetForFocus(
        convexUser.primaryFocus as PrimaryFocus,
        convexUser?.biologicalSex as 'male' | 'female'
      );
      setActiveTools(new Set(preset));
      SecureStore.setItemAsync(ACTIVE_TOOLS_STORAGE_KEY, JSON.stringify(preset)).catch(() => {});
    }
  }, [convexUser?.activeTools, convexUser?.primaryFocus, convexUser?.biologicalSex]);

  const persistTools = useCallback(
    async (toolsSet: Set<ToolKey>) => {
      const toolsArr = Array.from(toolsSet);
      try {
        await SecureStore.setItemAsync(ACTIVE_TOOLS_STORAGE_KEY, JSON.stringify(toolsArr));
      } catch (err) {
        console.warn('Failed to save tools to SecureStore', err);
      }
      if (convexUser?._id) {
        try {
          await updateUser({
            userId: convexUser._id,
            updates: { activeTools: toolsArr },
          });
        } catch (err) {
          console.warn('Failed to sync active tools to Convex', err);
        }
      }
    },
    [convexUser?._id, updateUser]
  );

  const toggleTool = useCallback(
    (key: ToolKey) => {
      setActiveTools((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        persistTools(next);
        return next;
      });
    },
    [persistTools]
  );

  const applyPreset = useCallback(
    (focus: PrimaryFocus, gender?: 'male' | 'female') => {
      const g = gender || (convexUser?.biologicalSex as 'male' | 'female');
      const preset = getPresetForFocus(focus, g);
      const next = new Set(preset);
      setActiveTools(next);
      persistTools(next);
    },
    [convexUser?.biologicalSex, persistTools]
  );

  const isToolActive = useCallback(
    (key: ToolKey) => {
      return activeTools.has(key);
    },
    [activeTools]
  );

  return {
    activeTools,
    isToolActive,
    toggleTool,
    applyPreset,
    isLoaded,
    ALL_TOOLS,
  };
}
