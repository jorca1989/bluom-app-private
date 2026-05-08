import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface LandingSectionProps {
    id: string;
    title: string;
    subtitle: string;
    screenshotUrl: string;
    isReversed?: boolean;
    color?: string;
}

export const LandingSection: React.FC<LandingSectionProps> = ({
    id,
    title,
    subtitle,
    screenshotUrl,
    isReversed = false,
    color = "#3b82f6"
}) => {
    const ref = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
    const xTranslate = useTransform(
        scrollYProgress,
        [0, 0.5],
        [isReversed ? 100 : -100, 0]
    );

    return (
        <section
            id={id}
            ref={ref}
            className={`min-h-screen flex flex-col items-center justify-center px-6 py-24 md:py-32 ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
                } gap-12 overflow-hidden`}
        >
            <motion.div
                style={{ x: xTranslate, opacity }}
                className="flex-1 max-w-xl text-center md:text-left"
            >
                <h2 className="text-4xl md:text-6xl font-black mb-6 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {title}
                </h2>
                <p className="text-xl md:text-2xl text-white/60 leading-relaxed font-medium">
                    {subtitle}
                </p>
                <motion.div
                    className="h-1 w-24 mt-8 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </motion.div>

            <motion.div
                style={{ scale, opacity }}
                className="flex-1 w-full max-w-2xl"
            >
                <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900/50">
                    {/* Mock Screenshot Placeholder - In a real app we'd use actual images */}
                    <div className="absolute inset-0 flex items-center justify-center text-white/10 font-bold text-4xl italic">
                        {title} Screenshot
                    </div>
                    <div
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{ backgroundColor: color }}
                    />
                </div>
            </motion.div>
        </section>
    );
};
