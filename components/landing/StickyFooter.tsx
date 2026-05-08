import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedLogo } from './AnimatedLogo';

export const StickyFooter = () => {
    return (
        <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl"
            style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ y: -2 }}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-xs font-bold"
                >
                    <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center text-[10px] text-white">A</div>
                    App Store
                </motion.button>

                <motion.button
                    whileHover={{ y: -2 }}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-xs font-bold"
                >
                    <div className="w-5 h-5 bg-black rounded-sm flex items-center justify-center text-[10px] text-white">G</div>
                    Play Store
                </motion.button>
            </div>
            {/* Logo in footer? Usually just store buttons for the dock, but we can add a subtle logo if needed */}
        </motion.footer>
    );
};
