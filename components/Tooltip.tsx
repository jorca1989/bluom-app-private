import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TooltipProps {
    message: string;
    visible: boolean;
    onClose: () => void;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ message, visible, onClose, position = 'bottom' }: TooltipProps) {
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity }, position === 'bottom' ? styles.bottom : styles.top]}>
            <View style={styles.bubble}>
                <Text style={styles.text}>{message}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={12} color="#fff" />
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
        width: 200,
    },
    top: {
        bottom: '100%',
        marginBottom: 10,
    },
    bottom: {
        top: '100%',
        marginTop: 10,
    },
    bubble: {
        backgroundColor: '#2563eb',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    text: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    closeBtn: {
        marginLeft: 8,
        padding: 4,
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
        borderBottomColor: '#2563eb',
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
