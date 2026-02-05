import React, { createContext, useContext, useState, useRef } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';

type CelebrationType = 'confetti' | 'fireworks';

type CelebrationContextType = {
  trigger: (type?: CelebrationType) => void;
};

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<CelebrationType>('confetti');

  const trigger = (t: CelebrationType = 'confetti') => {
    setType(t);
    setVisible(true);
    setTimeout(() => setVisible(false), 3000);
  };

  return (
    <CelebrationContext.Provider value={{ trigger }}>
      {children}
      {visible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LottieView
            source={
              type === 'fireworks'
                ? require('../assets/lottie/fireworks.json')
                : require('../assets/lottie/confetti.json')
            }
            autoPlay
            loop={false}
            style={styles.lottie}
          />
        </View>
      )}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within CelebrationProvider');
  return ctx;
}

const styles = StyleSheet.create({
  lottie: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 9999,
  },
});

