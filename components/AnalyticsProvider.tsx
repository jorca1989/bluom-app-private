import React, { useEffect } from 'react';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useUser } from '@clerk/clerk-expo';
import { AppState } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

function AnalyticsTracker() {
    const posthog = usePostHog();
    const { user, isSignedIn } = useUser();

    // Identify user when they sign in
    useEffect(() => {
        if (isSignedIn && user && posthog) {
            posthog.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress ?? null,
                // Detailed info as requested
                username: user.username ?? null,
                firstName: user.firstName ?? null,
                lastName: user.lastName ?? null,
            });
        } else if (!isSignedIn && posthog) {
            posthog.reset();
        }
    }, [isSignedIn, user, posthog]);

    // Send "Test Event" on mount
    useEffect(() => {
        if (posthog) {
            posthog.capture('app_opened');
        }
    }, [posthog]);

    // Handle App State changes (optional, but good for session tracking)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                posthog?.capture('App Become Active');
            } else if (state === 'background') {
                posthog?.flush(); // Ensure events are sent before backgrounding
            }
        });
        return () => subscription.remove();
    }, [posthog]);

    return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    if (!apiKey) {
        console.warn("PostHog Analytics: Missing EXPO_PUBLIC_POSTHOG_API_KEY. Analytics disabled.");
        return <>{children}</>;
    }

    return (
        <PostHogProvider
            apiKey={apiKey}
            options={{
                host: host,
                enableSessionReplay: false, // Keep it lightweight
            }}
            autocapture={true} // Explicitly enable autocapture
        >
            <AnalyticsTracker />
            {children}
        </PostHogProvider>
    );
}
