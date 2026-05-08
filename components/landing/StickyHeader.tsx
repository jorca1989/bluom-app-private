import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedLogo } from './AnimatedLogo';

export const StickyHeader = () => {
    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-black/5 border-b border-white/5"
            style={{
                height: '80px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            <div className="flex items-center transform scale-75 md:scale-100">
                <AnimatedLogo />
            </div>

            <nav className="hidden md:flex items-center gap-8">
                {['Fuel', 'Move', 'Wellness', 'Shop'].map((item) => (
                    <a
                        key={item}
                        href={`#${item.toLowerCase()}`}
                        className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                    >
                        {item}
                    </a>
                ))}
            </nav>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold"
            >
                Open App
            </motion.button>
        </motion.header>
    );
};
