import React from 'react';
import Head from 'expo-router/head';

export default function PrivacyPolicy() {
    return (
        <>
            <Head>
                <title>Privacy Policy | Bluom</title>
                <meta name="description" content="Bluom Privacy Policy - How we handle your health and personal data" />
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
                        <h1 className="text-4xl font-black font-outfit mb-8 text-slate-900">Privacy Policy</h1>
                        <p className="text-sm text-slate-500 mb-8">Last updated: January 8, 2025</p>

                        <div className="space-y-8">
                            {/* Health Data Section */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">4. Health and Fitness Data (Apple Health & Google Health Connect)</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <p className="text-slate-700 leading-relaxed mb-4">
                                        If you grant permission, Bluom will access data from the Apple HealthKit or Google Health Connect APIs.
                                    </p>
                                    <ul className="list-disc list-inside text-slate-700 space-y-2">
                                        <li><strong>Data Accessed:</strong> We read steps, active energy (calories), sleep patterns, and heart rate.</li>
                                        <li><strong>Purpose:</strong> This data is used exclusively to populate your Wellness Dashboard and provide AI-generated health insights.</li>
                                        <li><strong>Sharing:</strong> Your health data is never shared with third parties, advertisers, or data brokers. It is stored securely on our encrypted servers and you can delete it at any time by deleting your Bluom account.</li>
                                        <li><strong>Note:</strong> Bluom is not a medical device. Always consult a doctor for medical advice.</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Permissions Section */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📱 App Permissions</h2>
                                <div className="space-y-4">
                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">📷 Camera Access</h3>
                                        <p className="text-slate-700">
                                            <strong>Purpose:</strong> Used exclusively for Sugar Vision feature to scan food items and analyze metabolic impact.
                                            <br />
                                            <strong>Data Handling:</strong> Images are processed locally when possible; when cloud processing is needed, images are encrypted and immediately deleted after analysis.
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">⏰ Background Services</h3>
                                        <p className="text-slate-700">
                                            <strong>Purpose:</strong> Required for Fasting Timer to continue tracking during device sleep and for timely notifications.
                                            <br />
                                            <strong>Data Handling:</strong> Minimal battery usage; no personal data processed in background.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Third-Party Services */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">🤝 Third-Party Services</h2>
                                <div className="space-y-4">
                                    <div className="bg-green-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">🔐 Clerk (Authentication)</h3>
                                        <p className="text-slate-700">
                                            Handles user authentication, password management, and session security.
                                            <a href="https://clerk.com/privacy" className="text-[#2563eb] hover:underline" target="_blank" rel="noopener">Clerk Privacy Policy</a>
                                        </p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">💳 RevenueCat (Payments)</h3>
                                        <p className="text-slate-700">
                                            Processes subscription payments and manages Pro tier access.
                                            <a href="https://www.revenuecat.com/privacy" className="text-[#2563eb] hover:underline" target="_blank" rel="noopener">RevenueCat Privacy Policy</a>
                                        </p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">🗄️ Convex (Database)</h3>
                                        <p className="text-slate-700">
                                            Secure database backend for storing user data and app content.
                                            <a href="https://convex.dev/privacy" className="text-[#2563eb] hover:underline" target="_blank" rel="noopener">Convex Privacy Policy</a>
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Data Collection */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📊 Data We Collect</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">Health & Biological Data</h3>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Fasting logs and duration</li>
                                            <li>• Menstrual cycle tracking</li>
                                            <li>• Blood sugar readings (if provided)</li>
                                            <li>• Heart rate data (if provided)</li>
                                            <li>• Exercise and activity logs</li>
                                            <li>• Sleep patterns</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <h3 className="font-bold text-slate-900 mb-2">App Usage Data</h3>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Feature usage analytics</li>
                                            <li>• Crash reports and error logs</li>
                                            <li>• Device type and OS version</li>
                                            <li>• Subscription status</li>
                                            <li>• User preferences and settings</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Contact */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📧 Contact & Questions</h2>
                                <p className="text-slate-700 leading-relaxed">
                                    If you have questions about this Privacy Policy or how we handle your data, please contact us at:
                                </p>
                                <div className="bg-blue-50 rounded-xl p-6 mt-4">
                                    <p className="font-bold text-slate-900">Email: privacy@bluom.app</p>
                                    <p className="text-slate-700 mt-2">We respond to all privacy inquiries within 48 hours.</p>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
