import React from 'react';
import { Stack } from 'expo-router';

export default function LegalLayout() {
    return (
        <Stack>
            <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
            <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
            <Stack.Screen name="data-deletion" options={{ title: 'Data Deletion' }} />
            <Stack.Screen name="subscription-faq" options={{ title: 'Billing FAQ' }} />
        </Stack>
    );
}
