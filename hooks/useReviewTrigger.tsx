import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import ReviewCaptureModal from "@/components/ReviewCaptureModal";

const STORAGE_PREFIX = "bluom.review-prompt.v2";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cooldown if dismissed

type PromptState = { lastPromptedAt?: number; hasReviewed?: boolean; promptDismissedCount?: number };
type ReviewTriggerContextValue = { triggerReviewPrompt: (force?: boolean) => Promise<void> };
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
  const autoCheckedRef = useRef(false);
  const storageKey = `${STORAGE_PREFIX}.${user?.id ?? "anonymous"}`;

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setVisible(false);
    setState({});
    autoCheckedRef.current = false;
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

  const triggerReviewPrompt = useCallback(async (force = false) => {
    if (!hydrated) return;
    if (!force) {
      if (state.hasReviewed || serverStatus?.hasSubmittedRecently) return;
      if (state.lastPromptedAt && Date.now() - state.lastPromptedAt < COOLDOWN_MS) return;
    }
    await persist({ ...state, lastPromptedAt: Date.now() });
    setVisible(true);
  }, [hydrated, persist, serverStatus, state]);

  // Automatic trigger on app usage (e.g. after 25s on session or on 2nd open)
  useEffect(() => {
    if (!hydrated || !user || autoCheckedRef.current) return;
    if (state.hasReviewed || serverStatus?.hasSubmittedRecently) return;
    if (state.lastPromptedAt && Date.now() - state.lastPromptedAt < COOLDOWN_MS) return;

    autoCheckedRef.current = true;
    const sessionCountKey = `bluom.session_count.${user.id}`;
    
    AsyncStorage.getItem(sessionCountKey).then(async (val) => {
      const count = (parseInt(val || "0", 10)) + 1;
      await AsyncStorage.setItem(sessionCountKey, String(count)).catch(() => null);

      // On session 2 or higher, trigger after 4 seconds of opening the app
      if (count >= 2) {
        const timer = setTimeout(() => {
          triggerReviewPrompt();
        }, 4000);
        return () => clearTimeout(timer);
      } else {
        // First session: trigger after 40 seconds of exploring the app
        const timer = setTimeout(() => {
          triggerReviewPrompt();
        }, 40000);
        return () => clearTimeout(timer);
      }
    });
  }, [hydrated, user, serverStatus, state, triggerReviewPrompt]);

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