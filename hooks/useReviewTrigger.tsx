import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import ReviewCaptureModal from "@/components/ReviewCaptureModal";

const STORAGE_PREFIX = "bluom.review-prompt.v1";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

type PromptState = { lastPromptedAt?: number; hasReviewed?: boolean; promptDismissedCount?: number };
type ReviewTriggerContextValue = { triggerReviewPrompt: () => Promise<void> };
const ReviewTriggerContext = createContext<ReviewTriggerContextValue | null>(null);

export function useReviewTrigger() {
  const context = useContext(ReviewTriggerContext);
  if (!context) throw new Error("useReviewTrigger must be used within ReviewTriggerProvider.");
  return context;
}

export function ReviewTriggerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const serverStatus = useQuery(api.reviews.getUserReviewStatus, user ? {} : "skip");
  const [state, setState] = useState<PromptState>({});
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const storageKey = `${STORAGE_PREFIX}.${user?.id ?? "anonymous"}`;

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setVisible(false);
    setState({});
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!cancelled && value) setState(JSON.parse(value) as PromptState);
      })
      .catch(() => null)
      .finally(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [storageKey]);

  const persist = useCallback(async (next: PromptState) => {
    setState(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => null);
  }, [storageKey]);

  const triggerReviewPrompt = useCallback(async () => {
    if (!user || !hydrated || serverStatus === undefined) return;
    if (state.hasReviewed || serverStatus.hasSubmittedRecently) return;
    if (state.lastPromptedAt && Date.now() - state.lastPromptedAt < COOLDOWN_MS) return;
    await persist({ ...state, lastPromptedAt: Date.now() });
    setVisible(true);
  }, [hydrated, persist, serverStatus, state, user]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    await persist({ ...state, lastPromptedAt: Date.now(), promptDismissedCount: (state.promptDismissedCount ?? 0) + 1 });
  }, [persist, state]);

  const handleSubmitted = useCallback(async () => {
    setVisible(false);
    await persist({ ...state, hasReviewed: true, lastPromptedAt: Date.now() });
  }, [persist, state]);

  return (
    <ReviewTriggerContext.Provider value={{ triggerReviewPrompt }}>
      {children}
      <ReviewCaptureModal visible={visible} onDismiss={handleDismiss} onSubmitted={handleSubmitted} />
    </ReviewTriggerContext.Provider>
  );
}