import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface NorthStarWidgetProps {
    goal?: string;
    onPress: () => void;
}

export default function NorthStarWidget({ goal, onPress }: NorthStarWidgetProps) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
            <LinearGradient
                colors={goal ? ['#1e293b', '#0f172a'] : ['#eff6ff', '#dbeafe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={[styles.iconBox, { backgroundColor: goal ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                        <Ionicons name="flag" size={20} color={goal ? '#f59e0b' : '#3b82f6'} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: goal ? '#94a3b8' : '#64748b' }]}>
                            {goal ? "My North Star" : "Set Your North Star"}
                        </Text>
                        <Text style={[styles.title, { color: goal ? '#fff' : '#1e293b' }]} numberOfLines={2}>
                            {goal || "Define your major 12-month milestone to stay focused."}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={goal ? '#64748b' : '#94a3b8'} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    gradient: {
        borderRadius: 16,
        padding: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
});
