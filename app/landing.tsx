import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { useUser } from '@clerk/clerk-expo';
import { MASTER_ADMINS } from '../convex/permissions';
import { Link } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Asset } from 'expo-asset';

// Standard HTML Landing Page for Web
export default function LandingPage() {
    // If we're on native, we don't render this (handled by app/index.tsx)
    if (Platform.OS !== 'web') {
        return null;
    }

    // Static assets (on web, require() returns a module id; use Asset to get a real URI for <img />)
    const logoModule = require('../assets/images/logo.png');
    const imgGamesHubModule = require('../assets/images/landing/games-hub.png');
    const imgWaterLogModule = require('../assets/images/landing/Newwater-log.png');
    const imgWellnessModule = require('../assets/images/landing/wellness-soundscapes.png');
    const imgBehavioralModule = require('../assets/images/landing/behavioral-hub.png');
    const imgTabsModule = require('../assets/images/landing/tabs-overview.png');
    const imgMoveModule = require('../assets/images/landing/move.png');
    const imgNutritionCollageModule = require('../assets/images/landing/nutrition-collage.png');
    const imgSupplementsModule = require('../assets/images/landing/Newsupplements.png');

    const logoSrc = Asset.fromModule(logoModule).uri;
    const imgGamesHub = Asset.fromModule(imgGamesHubModule).uri;
    const imgWaterLog = Asset.fromModule(imgWaterLogModule).uri;
    const imgWellness = Asset.fromModule(imgWellnessModule).uri;
    const imgBehavioral = Asset.fromModule(imgBehavioralModule).uri;
    const imgTabs = Asset.fromModule(imgTabsModule).uri;
    const imgMove = Asset.fromModule(imgMoveModule).uri;
    const imgNutritionCollage = Asset.fromModule(imgNutritionCollageModule).uri;
    const imgSupplements = Asset.fromModule(imgSupplementsModule).uri;

    const { user } = useUser();
    const currentEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const isMasterAdmin = currentEmail && MASTER_ADMINS.map(e => e.toLowerCase()).includes(currentEmail);

    const submitTestUser = useMutation((api as any).testUsers?.submit);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

    const canSubmit = useMemo(() => email.trim().includes('@') && status !== 'saving', [email, status]);

    return (
        <>
            <Head>
                <title>Bluom | Precision in Living</title>
                <meta name="description" content="Precision Living. Power in Bloom." />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet" />
            </Head>

            <div className="bg-[#ebf1fe] text-[#1e293b] min-h-screen font-sans selection:bg-blue-200 overflow-y-auto">
                <style dangerouslySetInnerHTML={{
                    __html: `
            body { margin: 0; background-color: #ebf1fe !important; }
            .font-outfit { font-family: 'Outfit', sans-serif; }
            .font-inter { font-family: 'Inter', sans-serif; }
            html { scroll-behavior: smooth; background-color: #ebf1fe; }
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #ebf1fe; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          `}} />

                {/* Navigation */}
                <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-blue-100">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <img src={logoSrc} alt="Bluom Logo" className="h-10 w-auto" />

                        <nav className="hidden md:flex items-center space-x-10 text-sm font-bold tracking-tight text-slate-600">
                            <a href="#fuel" className="hover:text-[#2563eb] transition-colors">Fuel</a>
                            <a href="#move" className="hover:text-[#5fc660] transition-colors">Move</a>
                            <a href="#wellness" className="hover:text-[#ef8a34] transition-colors">Wellness</a>
                            <a href="#shop" className="hover:text-[#2563eb] transition-colors">Shop</a>
                            {isMasterAdmin && (
                                <Link href={"/admin" as any} className="text-[#2563eb] font-black hover:text-blue-700 transition-colors border-l border-blue-100 pl-8 ml-8">
                                    ADMIN
                                </Link>
                            )}
                        </nav>

                        <div className="flex items-center gap-4">
                            <a href="#download" className="bg-[#2563eb] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all transform hover:scale-105">
                                Download App
                            </a>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-12">
                    {/* Hero Section */}
                    <section className="text-center py-16">
                        <h1 className="text-6xl md:text-8xl font-black font-outfit mb-6 tracking-tight leading-tight text-slate-900">
                            Precision in Living.<br />
                            <span className="text-[#2563eb]">Power in Bloom.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto font-inter font-medium">
                            Transforming biological data into daily vigor.
                        </p>

                        {/* Early access */}
                        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 p-6 md:p-8 mb-10">
                            <h3 className="text-xl font-black font-outfit text-slate-900 mb-2">Get early access</h3>
                            <p className="text-slate-500 font-inter font-medium mb-4">Join the tester waitlist. We’ll email you when new builds drop.</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    value={email}
                                    onChange={(e) => setEmail((e.target as any).value)}
                                    placeholder="you@email.com"
                                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 font-inter font-semibold text-slate-900 outline-none focus:border-blue-400"
                                />
                                <button
                                    disabled={!canSubmit}
                                    onClick={async () => {
                                        try {
                                            setStatus('saving');
                                            await submitTestUser({ email: email.trim(), source: 'landing' });
                                            setStatus('done');
                                        } catch {
                                            setStatus('error');
                                        }
                                    }}
                                    className={`px-6 py-3 rounded-2xl font-black ${canSubmit ? 'bg-blue-600 text-white hover:shadow-lg hover:shadow-blue-200' : 'bg-slate-200 text-slate-500'} transition-all`}
                                >
                                    {status === 'saving' ? 'Saving…' : status === 'done' ? 'Saved' : 'Join'}
                                </button>
                            </div>
                            {status === 'error' ? (
                                <p className="text-rose-600 font-bold mt-3">Couldn’t save. Try again.</p>
                            ) : status === 'done' ? (
                                <p className="text-emerald-700 font-bold mt-3">You’re on the list.</p>
                            ) : null}
                        </div>

                        <div id="download" className="flex flex-wrap items-center justify-center gap-4">
                            <a href="#" className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:transform hover:scale-105 transition-all no-underline shadow-xl">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold opacity-60 m-0">Download on the</p>
                                    <p className="text-xl font-bold font-inter leading-none m-0">App Store</p>
                                </div>
                            </a>
                            <a href="#" className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:transform hover:scale-105 transition-all no-underline shadow-xl">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase font-bold opacity-60 m-0">Get it on</p>
                                    <p className="text-xl font-bold font-inter leading-none m-0">Google Play</p>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Content Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Hydration Card */}
                        <section id="fuel" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-sky-600 text-sm font-black uppercase tracking-widest mb-4 block">Hydration</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Hydrate with precision.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Track water intake in seconds, build streaks, and keep your performance baseline consistent.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgWaterLog} alt="Water logging UI" className="w-full h-full object-contain" />
                            </div>
                        </section>

                        {/* Nutrition Card */}
                        <section className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-orange-300/20 blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-orange-600 text-sm font-black uppercase tracking-widest mb-4 block">Nutrition</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">See your fuel, instantly.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Photo calorie counter, recipes, and shopping list — everything you need to eat with intention.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgNutritionCollage} alt="Fuel logging, photo calorie counter, and recipes" className="w-full h-full object-contain" />
                            </div>
                        </section>

                        {/* Wellness Card */}
                        <section id="wellness" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-violet-300/15 blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-violet-600 text-sm font-black uppercase tracking-widest mb-4 block">Mental Health</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Equilibrium Refined.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Master your habits. Game-ified wellness for consistency.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgWellness} alt="Wellness & soundscapes" className="w-full h-full object-contain" />
                            </div>
                        </section>

                        {/* Shop Card */}
                        <section id="shop" className="bg-white rounded-[40px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[#2563eb] text-sm font-black uppercase tracking-widest mb-4 block">Precision Gear</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Elite Performance Store.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed mb-10">
                                    Curated supplements and activewear designed for the high-performance life.
                                </p>
                            </div>
                            <div className="aspect-[4/3] rounded-3xl bg-white border border-slate-100 overflow-hidden">
                                <img src={imgSupplements} alt="Bluom supplements" className="w-full h-full object-contain" />
                            </div>
                        </section>
                    </div>

                    {/* Full Width Dashboard Preview */}
                    <section className="bg-slate-900 rounded-[60px] p-10 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black font-outfit text-white mb-8 tracking-tight">One Dashboard.<br />Total Control.</h2>
                            <div className="max-w-4xl mx-auto rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl overflow-hidden">
                                <img src={imgBehavioral} alt="Behavioral Hub" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </section>

                    {/* Move showcase */}
                    <section className="bg-white rounded-[50px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div>
                                <span className="text-[#5fc660] text-sm font-black uppercase tracking-widest mb-4 block">Move</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Train. Track. Improve.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed">
                                    Keep your workouts, activity, and weekly progress in one place — built for momentum and consistency.
                                </p>
                            </div>
                            <div className="rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgMove} alt="Move overview" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </section>

                    {/* Games showcase */}
                    <section className="bg-white rounded-[50px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div>
                                <span className="text-emerald-600 text-sm font-black uppercase tracking-widest mb-4 block">Mind</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Mind Games Hub</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed">
                                    Train focus, reaction, and mindfulness — quick sessions that feel like a game, but build real consistency.
                                </p>
                            </div>
                            <div className="rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgGamesHub} alt="Mind Games Hub" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </section>

                    {/* Tabs overview (4 pillars) */}
                    <section className="bg-white rounded-[50px] p-10 md:p-14 shadow-2xl shadow-blue-900/5 border border-white overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            <div>
                                <span className="text-[#2563eb] text-sm font-black uppercase tracking-widest mb-4 block">All-in-one</span>
                                <h2 className="text-4xl font-black font-outfit mb-6 text-slate-900 leading-tight">Four pillars. One app.</h2>
                                <p className="text-lg text-slate-500 font-inter font-medium leading-relaxed">
                                    Home, Fuel, Move, Wellness — designed to work together so your day runs on precision.
                                </p>
                            </div>
                            <div className="rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden">
                                <img src={imgTabs} alt="Home, Fuel, Move, Wellness tabs" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-blue-100 pt-24 pb-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center gap-3 mb-10">
                            <img src={logoSrc} alt="Bluom" className="h-10 w-auto" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 pb-14 border-b border-slate-100">
                            {/* About */}
                            <div>
                                <p className="text-slate-600 font-inter font-medium leading-relaxed">
                                    Blüom is built on Wellness, Vigor, and Scientific Precision. We believe a ‘Blümie’ is more than just a user; they are a glow of satisfaction and the start of a transformative lifestyle. Focused on personal development and high achievement, Blüom empowers you to prove to yourself—and the world—what you are truly made of. By sustaining your Body, Mind, and Spirit, Blüom is the ultimate definition of Life.
                                </p>
                            </div>

                            {/* Company */}
                            <div>
                                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Company</h4>
                                <div className="space-y-3 text-slate-500 text-sm font-bold">
                                    <a href="/legal/privacy" className="block hover:text-[#2563eb] transition-colors">Privacy</a>
                                    <a href="/legal/terms" className="block hover:text-[#2563eb] transition-colors">Terms</a>
                                    <a href="/legal/ai-safety" className="block hover:text-[#2563eb] transition-colors">AI Safety</a>
                                    <a href="/legal/refund-policy" className="block hover:text-[#2563eb] transition-colors">Refund Policy</a>
                                    <a href="/legal/data-deletion" className="block hover:text-[#2563eb] transition-colors">Data Deletion</a>
                                </div>
                            </div>

                            {/* Support */}
                            <div>
                                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Support</h4>
                                <div className="space-y-3 text-slate-500 text-sm font-bold">
                                    <a href="/support" className="block hover:text-[#2563eb] transition-colors">Help Center</a>
                                    <a href="/legal/subscription-faq" className="block hover:text-[#2563eb] transition-colors">Billing FAQ</a>
                                    <a href="/feedback" className="block hover:text-[#2563eb] transition-colors">Feedback</a>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.25em]">
                                © 2026 Bluom Precision Technology
                            </p>
                            <p className="text-slate-300 text-xs font-bold uppercase tracking-[0.25em]">Precision in Living. Power in Bloom.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
