
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WeightManagement() {
    const router = useRouter();
    const { convexUser, isPro, isLoading } = useAccessControl();
    const updateUser = useMutation(api.users.updateUser);
    const [newWeight, setNewWeight] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Syncing with onboarding data
    const currentWeightKg = convexUser?.weight || 0;
    const targetWeightKg = convexUser?.targetWeight || 0;
    const prefersLbs = (convexUser?.preferredUnits?.weight ?? 'kg') === 'lbs';
    const unitLabel = prefersLbs ? 'lb' : 'kg';
    const currentWeight = prefersLbs ? currentWeightKg * 2.2046226218 : currentWeightKg;
    const targetWeight = prefersLbs ? targetWeightKg * 2.2046226218 : targetWeightKg;
    const difference = Math.abs(currentWeight - targetWeight).toFixed(1);

    async function handleSave() {
        if (!convexUser?._id || !newWeight) return;
        setIsSaving(true);
        try {
            const entered = parseFloat(newWeight);
            const nextKg = prefersLbs ? entered / 2.2046226218 : entered;
            await updateUser({
                userId: convexUser._id,
                updates: { weight: nextKg }
            });
            setNewWeight('');
        } catch (error) {
            console.error("Failed to update weight:", error);
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View className="flex-1 items-center justify-center bg-slate-50">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header */}
                <View className="flex-row items-center p-4">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black ml-4 text-slate-900">Weight Journey</Text>
                </View>

                {/* Progress Card */}
                <View className="m-4 p-6 bg-blue-600 rounded-3xl shadow-lg">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-blue-100 font-bold">Current</Text>
                            <Text className="text-white text-3xl font-black">
                                {Number.isFinite(currentWeight) ? currentWeight.toFixed(1) : '0.0'} {unitLabel}
                            </Text>
                        </View>
                        <Ionicons name="trending-down" size={32} color="white" />
                        <View className="items-end">
                            <Text className="text-blue-100 font-bold">Goal</Text>
                            <Text className="text-white text-3xl font-black">
                                {Number.isFinite(targetWeight) ? targetWeight.toFixed(1) : '0.0'} {unitLabel}
                            </Text>
                        </View>
                    </View>
                    <View className="mt-4 pt-4 border-t border-blue-400/30 items-center">
                        <Text className="text-blue-50 font-medium">
                            {currentWeight > targetWeight ? `${difference} ${unitLabel} to go!` : 'Goal Reached! 🌟'}
                        </Text>
                    </View>
                </View>

                {/* Quick Log Section */}
                <View className="mx-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Text className="text-slate-900 font-black mb-4">Log Today&apos;s Weight</Text>
                    <View className="flex-row items-center space-x-3">
                        <TextInput
                            className="flex-1 bg-slate-50 p-4 rounded-2xl text-lg font-bold text-slate-900"
                            placeholder="00.0"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={newWeight}
                            onChangeText={setNewWeight}
                        />
                        <View className="px-2">
                            <Text style={{ color: '#64748b', fontWeight: '700' }}>{unitLabel}</Text>
                        </View>
                        <TouchableOpacity
                            className="bg-blue-600 p-4 rounded-2xl"
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            <Text className="text-white font-bold px-4">
                                {isSaving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Chart Placeholder (The Trend) */}
                <View className="m-4 p-6 bg-white rounded-3xl border border-slate-100 h-64 justify-center items-center">
                    <Ionicons name="stats-chart" size={40} color="#e2e8f0" />
                    <Text className="text-slate-400 mt-2 font-medium">Weight Trend Chart will appear here</Text>
                    {!isPro && (
                        <TouchableOpacity className="mt-4 bg-amber-100 px-4 py-2 rounded-full" onPress={() => router.push('/premium')}>
                            <Text className="text-amber-700 text-xs font-bold">PRO: Detailed Analysis</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
});
