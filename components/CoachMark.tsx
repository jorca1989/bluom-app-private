import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CoachMarkProps {
    message: string;
    visible: boolean;
    onClose: () => void;
    position?: 'top' | 'bottom';
}

export default function CoachMark({ message, visible, onClose, position = 'bottom' }: CoachMarkProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            // Fade In
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Pulse Loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            // Fade Out
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[
            styles.container,
            { opacity, transform: [{ scale: pulseAnim }] },
            position === 'bottom' ? styles.bottom : styles.top
        ]}>
            <View style={styles.bubble}>
                <View style={styles.iconContainer}>
                    <Ionicons name="sparkles" size={16} color="#fbbf24" />
                </View>
                <Text style={styles.text}>{message}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
            <View style={[styles.arrow, position === 'bottom' ? styles.arrowBottom : styles.arrowTop]} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 999,
        alignItems: 'center',
        width: 240,
        // Center horizontally
        alignSelf: 'center',
    },
    top: {
        bottom: '100%',
        marginBottom: 12,
    },
    bottom: {
        top: '100%',
        marginTop: 12,
    },
    bubble: {
        backgroundColor: '#1e293b', // Dark tooltip for contrast
        padding: 12,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#2563eb', // Blue shadow/glow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#334155'
    },
    iconContainer: {
        marginRight: 8,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        lineHeight: 20
    },
    closeBtn: {
        marginLeft: 8,
        padding: 4,
        alignSelf: 'flex-start'
    },
    arrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#1e293b',
    },
    arrowBottom: {
        top: -8,
        transform: [{ rotate: '0deg' }]
    },
    arrowTop: {
        position: 'absolute',
        bottom: -8,
        transform: [{ rotate: '180deg' }]
    }
});
