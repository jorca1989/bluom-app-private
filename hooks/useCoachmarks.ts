import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { CoachmarkStep } from '@/components/SpotlightOverlay';

const COACHMARKS_KEY = 'bluom_coachmarks_completed_v1';

export function useCoachmarks(steps: CoachmarkStep[]) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // default true to avoid flash

  useEffect(() => {
    (async () => {
      try {
        const completed = await SecureStore.getItemAsync(COACHMARKS_KEY);
        if (completed !== 'true' && steps.length > 0) {
          setHasCompletedTour(false);
          // Small delay before showing tour
          setTimeout(() => setIsActive(true), 1200);
        }
      } catch (err) {
        console.warn('Failed to read coachmark status', err);
      }
    })();
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (currentStepIndex + 1 < steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStepIndex, steps.length]);

  const completeTour = useCallback(async () => {
    setIsActive(false);
    setHasCompletedTour(true);
    try {
      await SecureStore.setItemAsync(COACHMARKS_KEY, 'true');
    } catch (err) {
      console.warn('Failed to save coachmark completion', err);
    }
  }, []);

  const resetTour = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(COACHMARKS_KEY);
      setHasCompletedTour(false);
      setCurrentStepIndex(0);
      setIsActive(true);
    } catch (err) {
      console.warn('Failed to reset coachmark tour', err);
    }
  }, []);

  return {
    isActive,
    currentStep: steps[currentStepIndex] ?? null,
    currentStepIndex,
    totalSteps: steps.length,
    nextStep,
    completeTour,
    resetTour,
    hasCompletedTour,
  };
}
