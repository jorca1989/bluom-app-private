import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

interface NorthStarWidgetProps {
    goal?: string;
    onPress: () => void;
}

export default function NorthStarWidget({ goal, onPress }: NorthStarWidgetProps) {
    const { t } = useTranslation();
    const { colors: c } = useTheme();

    // When a goal is set → use accent/primary gradient; otherwise → surface tones
    const gradientColors: [string, string] = goal
        ? [c.primary, c.accent]
        : [c.surface, c.surfaceMuted];

    const iconBg = goal ? 'rgba(255,255,255,0.18)' : c.surfaceMuted;
    const iconColor = goal ? c.onPrimary : c.primary;
    const labelColor = goal ? 'rgba(255,255,255,0.65)' : c.textMuted;
    const titleColor = goal ? c.onPrimary : c.text;
    const chevronColor = goal ? 'rgba(255,255,255,0.5)' : c.textMuted;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.container}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, { borderWidth: goal ? 0 : 1, borderColor: c.border }]}
            >
                <View style={styles.content}>
                    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                        <Ionicons name="flag" size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: labelColor }]}>
                            {goal
                                ? t('home.northStar.myLabel', 'My North Star')
                                : t('home.northStar.setLabel', 'Set Your North Star')}
                        </Text>
                        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
                            {goal || t('home.northStar.placeholder', 'Define your major 12-month milestone to stay focused.')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
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
