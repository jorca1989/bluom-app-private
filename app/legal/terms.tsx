import React from 'react';
import Head from 'expo-router/head';

export default function TermsOfService() {
    return (
        <>
            <Head>
                <title>Terms of Service | Bluom</title>
                <meta name="description" content="Bluom Terms of Service - Medical disclaimer and user agreement" />
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet" />
            </Head>

            <div className="bg-[#ebf1fe] text-[#1e293b] min-h-screen font-sans">
                <style dangerouslySetInnerHTML={{
                    __html: `
                        body { margin: 0; background-color: #ebf1fe !important; }
                        .font-outfit { font-family: 'Outfit', sans-serif; }
                        .font-inter { font-family: 'Inter', sans-serif; }
                        html { scroll-behavior: smooth; background-color: #ebf1fe; }
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
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg">
                        <h1 className="text-4xl font-black font-outfit mb-8 text-slate-900">Terms of Service</h1>
                        <p className="text-sm text-slate-500 mb-8">Last updated: January 8, 2025</p>

                        <div className="space-y-8">
                            {/* CRITICAL Medical Disclaimer */}
                            <section className="bg-red-50 border-2 border-red-200 rounded-xl p-8">
                                <h2 className="text-3xl font-black font-outfit mb-6 text-red-900">⚠️ MEDICAL DISCLAIMER</h2>
                                <div className="bg-white rounded-lg p-6 border border-red-200">
                                    <p className="text-red-900 font-bold text-lg leading-relaxed mb-4">
                                        <strong>Bluom is a lifestyle optimization tool, NOT a medical device.</strong>
                                    </p>
                                    <p className="text-slate-700 leading-relaxed mb-4">
                                        The insights provided (Hormonal Blueprint, Sugar Control, Fasting Intelligence, etc.) are for educational purposes only and do not replace professional medical advice.
                                    </p>
                                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                        <p className="text-slate-800 font-semibold">
                                            <strong>ALWAYS consult a physician before:</strong>
                                        </p>
                                        <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                                            <li>Starting a new fasting protocol</li>
                                            <li>Beginning any exercise regimen</li>
                                            <li>Making significant dietary changes</li>
                                            <li>If you have pre-existing medical conditions</li>
                                            <li>If you are pregnant, nursing, or have hormonal disorders</li>
                                        </ul>
                                    </div>
                                    <p className="text-slate-700 mt-4 text-sm">
                                        <strong>Emergency:</strong> If you experience severe symptoms, dizziness, chest pain, or any medical emergency, seek immediate medical attention.
                                    </p>
                                </div>
                            </section>

                            {/* Acceptance of Terms */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📋 Agreement to Terms</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    By downloading, installing, or using Bluom ("the App"), you agree to be bound by these Terms of Service ("Terms"). 
                                    If you do not agree to these Terms, do not use the App.
                                </p>
                            </section>

                            {/* Services Description */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">🎯 Our Services</h2>
                                <p className="text-slate-700 leading-relaxed mb-4">
                                    Bluom provides lifestyle optimization tools including:
                                </p>
                                <ul className="list-disc list-inside text-slate-700 space-y-2">
                                    <li>Fasting tracking and metabolic phase analysis</li>
                                    <li>Hormonal cycle insights and recommendations</li>
                                    <li>Sugar impact analysis and food scanning</li>
                                    <li>Exercise and activity tracking</li>
                                    <li>Sleep and wellness monitoring</li>
                                    <li>AI-powered lifestyle coaching (Pro tier)</li>
                                    <li>Educational content and protocols</li>
                                </ul>
                            </section>

                            {/* User Responsibilities */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">👤 User Responsibilities</h2>
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <ul className="list-disc list-inside text-slate-700 space-y-2">
                                        <li><strong>Accuracy:</strong> Provide accurate information when entering health data</li>
                                        <li><strong>Health Monitoring:</strong> Pay attention to your body's signals and stop any activity that causes discomfort</li>
                                        <li><strong>Medical Consultation:</strong> Consult healthcare professionals for medical advice</li>
                                        <li><strong>Account Security:</strong> Keep your login credentials secure</li>
                                        <li><strong>Appropriate Use:</strong> Use the app for personal, non-commercial purposes only</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Limitation of Liability */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">⚖️ Limitation of Liability</h2>
                                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                                    <p className="text-slate-700 leading-relaxed mb-4">
                                        <strong>To the fullest extent permitted by law:</strong>
                                    </p>
                                    <ul className="list-disc list-inside text-slate-700 space-y-2">
                                        <li>Bluom is not liable for any health complications, injuries, or medical issues arising from app use</li>
                                        <li>We do not guarantee specific health outcomes or results</li>
                                        <li>Users assume full responsibility for their health decisions</li>
                                        <li>Our liability is limited to the amount paid for the service (if any)</li>
                                        <li>We are not responsible for device malfunctions, data loss, or service interruptions</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Subscription Terms */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">💳 Subscription Terms</h2>
                                <div className="bg-green-50 rounded-xl p-6">
                                    <ul className="list-disc list-inside text-slate-700 space-y-2">
                                        <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled 24 hours before period end</li>
                                        <li><strong>Management:</strong> Manage subscriptions through your app store account settings</li>
                                        <li><strong>Refunds:</strong> Handled according to app store policies (Google Play/Apple App Store)</li>
                                        <li><strong>Price Changes:</strong> We may change prices with 30 days notice</li>
                                        <li><strong>Pro Features:</strong> Some features require active Pro subscription</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Intellectual Property */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📚 Intellectual Property</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    All content, features, and functionality of the App are owned by Bluom Precision Technology and protected by copyright, trademark, and other intellectual property laws. 
                                    You may not copy, modify, distribute, or create derivative works without our explicit permission.
                                </p>
                            </section>

                            {/* Termination */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">🚪 Account Termination</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    We reserve the right to suspend or terminate accounts that violate these Terms or engage in harmful activities. 
                                    You may delete your account at any time through the app settings or by contacting us.
                                </p>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📧 Contact Information</h2>
                                <div className="bg-blue-50 rounded-xl p-6">
                                    <p className="text-slate-700 mb-2">For questions about these Terms of Service:</p>
                                    <p className="font-bold text-slate-900">Email: legal@bluom.app</p>
                                    <p className="text-slate-700 mt-2">Response time: Within 48 hours</p>
                                </div>
                            </section>

                            {/* Governing Law */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">⚖️ Governing Law</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    These Terms are governed by and construed in accordance with the laws of the jurisdiction where Bluom Precision Technology operates, 
                                    without regard to conflict of law principles.
                                </p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
