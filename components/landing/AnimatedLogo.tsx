import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';

// Simple check for web platform
const isWeb = Platform.OS === 'web';

// Only import framer-motion on web
let motion: any;
if (isWeb) {
    try {
        motion = require('framer-motion').motion;
    } catch (e) {
        console.warn('Framer Motion not available');
    }
}

// Native animation library
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    Easing
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const COLORS = [
    "#ef8a34", "#ea4442", "#ea4b99", "#5fc660", "#2563eb", "#4ea44b", "#874aec"
];

export const AnimatedLogo = () => {
    const gradientId = "bluom-gradient";

    // Native Animation Values
    const oY = useSharedValue(20);
    const dotsY = useSharedValue(-20);
    const dotsScale = useSharedValue(0);

    useEffect(() => {
        if (!isWeb) {
            // Native Animation Sequence
            oY.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
            dotsY.value = withSequence(
                withTiming(0, { duration: 600 }),
                withRepeat(withTiming(2, { duration: 1000 }), -1, true)
            );
            dotsScale.value = withTiming(1, { duration: 800 });
        }
    }, []);

    const animatedOStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: oY.value }]
    }));

    if (isWeb && motion) {
        return (
            <motion.svg
                width="200"
                height="70"
                viewBox="0 0 400 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="cursor-pointer"
                initial="initial"
                animate="animate"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {COLORS.map((color, i) => (
                            <stop key={i} offset={`${(i / (COLORS.length - 1)) * 100}%`} stopColor={color} />
                        ))}
                    </linearGradient>
                </defs>

                {/* Simplified high-end shapes for B, L, U, M based on the image */}
                <g fill="white">
                    {/* B */}
                    <path d="M40 30h20c15 0 25 10 25 20s-10 20-25 20H40v40H30V30h10zm10 32h10c8 0 15-5 15-12s-7-12-15-12H40v24h10z" />
                    {/* L */}
                    <path d="M100 30v70h40v10H90V30h10z" />
                    {/* U */}
                    <path d="M160 30v50c0 15 10 25 25 25s25-10 25-25V30h10v50c0 20-15 35-35 35s-35-15-35-35V30h10z" />
                    {/* M */}
                    <path d="M250 30l20 50 20-50h10v80h-10V50l-20 50-20-50v60h-10V30h10z" />
                </g>

                {/* The Dots above U */}
                <motion.g
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    <circle cx="175" cy="15" r="8" fill={`url(#${gradientId})`} />
                    <circle cx="200" cy="15" r="8" fill={`url(#${gradientId})`} />
                </motion.g>

                {/* The Rising O */}
                <motion.g
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: 1.2,
                        type: "spring",
                        stiffness: 100,
                        damping: 15
                    }}
                >
                    <circle cx="330" cy="70" r="45" stroke={`url(#${gradientId})`} strokeWidth="18" />
                </motion.g>
            </motion.svg>
        );
    }

    // Native Fallback / Standard Component
    return (
        <View style={{ width: 200, height: 70 }}>
            <Svg width="100%" height="100%" viewBox="0 0 400 140">
                <Defs>
                    <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {COLORS.map((color, i) => (
                            <Stop key={i} offset={`${(i / (COLORS.length - 1)) * 100}%`} stopColor={color} />
                        ))}
                    </LinearGradient>
                </Defs>

                <G fill="white">
                    <Path d="M40 30h20c15 0 25 10 25 20s-10 20-25 20H40v40H30V30h10zm10 32h10c8 0 15-5 15-12s-7-12-15-12H40v24h10z" />
                    <Path d="M100 30v70h40v10H90V30h10z" />
                    <Path d="M160 30v50c0 15 10 25 25 25s25-10 25-25V30h10v50c0 20-15 35-35 35s-35-15-35-35V30h10z" />
                    <Path d="M250 30l20 50 20-50h10v80h-10V50l-20 50-20-50v60h-10V30h10z" />
                </G>

                <G transform={`translate(0, ${dotsY.value})`} opacity={dotsScale.value}>
                    <Circle cx="175" cy="15" r="8" fill={`url(#${gradientId})`} />
                    <Circle cx="200" cy="15" r="8" fill={`url(#${gradientId})`} />
                </G>

                <G transform={`translate(0, ${oY.value})`}>
                    <Circle cx="330" cy="70" r="45" stroke={`url(#${gradientId})`} strokeWidth="18" />
                </G>
            </Svg>
        </View>
    );
};
