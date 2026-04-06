import React from 'react';
import Head from 'expo-router/head';

export default function AboutPage() {
    return (
        <>
            <Head>
                <title>About Us | Bluom</title>
                <meta name="description" content="About Bluom - Precision in Living" />
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet" />
            </Head>

            <div className="bg-[#F5F4F0] text-[#1e293b] min-h-screen font-sans">
                <style dangerouslySetInnerHTML={{
                    __html: `
                        body { margin: 0; background-color: #F5F4F0 !important; }
                        .font-outfit { font-family: 'Outfit', sans-serif; }
                        .font-inter { font-family: 'Inter', sans-serif; }
                        html { scroll-behavior: smooth; background-color: #F5F4F0; }
                    `}} />

                {/* Header */}
                <header className="bg-white border-b border-blue-100">
                    <div className="max-w-4xl mx-auto px-6 py-6">
                        <a href="/" className="text-[#2563eb] font-black hover:text-blue-700 transition-colors">
                            ← Back to Bluom
                        </a>
                    </div>
                </header>

                {/* Content */}
                <main className="max-w-4xl mx-auto px-6 py-12">
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg text-center">
                        <img src="/logo.png" alt="Bluom Logo" className="h-16 w-auto mx-auto mb-8" />
                        <h1 className="text-4xl font-black font-outfit mb-8 text-slate-900">About Us</h1>

                        <div className="prose prose-slate max-w-none text-left">
                            <p className="text-xl text-slate-700 leading-relaxed font-medium mb-6">
                                Blüom is built on Wellness, Vigor, and Scientific Precision.
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed mb-6">
                                We believe a ‘Blümie’ is more than just a user; they are a glow of satisfaction and the start of a transformative lifestyle. Focused on personal development and high achievement, Blüom empowers you to prove to yourself—and the world—what you are truly made of.
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                By sustaining your Body, Mind, and Spirit, Blüom is the ultimate definition of Life.
                            </p>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-blue-100 pt-16 pb-12 px-6 mt-12">
                    <div className="max-w-7xl mx-auto text-center">
                        <img src="/logo.png" alt="Bluom" className="h-10 w-auto mx-auto mb-8" />
                        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-slate-400 text-xs font-black uppercase tracking-widest mb-12">
                            <a href="/legal/privacy" className="hover:text-[#2563eb] transition-colors">Privacy</a>
                            <a href="/legal/terms" className="hover:text-[#2563eb] transition-colors">Terms</a>
                            <a href="/legal/data-deletion" className="hover:text-[#2563eb] transition-colors">Data Deletion</a>
                            <a href="/legal/subscription-faq" className="hover:text-[#2563eb] transition-colors">Billing FAQ</a>
                            <a href="/legal/ai-safety" className="hover:text-[#2563eb] transition-colors">AI Safety</a>
                            <a href="/legal/refund-policy" className="hover:text-[#2563eb] transition-colors">Refund Policy</a>
                            <a href="/support" className="hover:text-[#2563eb] transition-colors">Support</a>
                        </div>
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em]">
                            © 2026 Bluom Precision Technology
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
