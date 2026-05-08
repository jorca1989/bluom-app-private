import React from 'react';
import Head from 'expo-router/head';

export default function SubscriptionFAQ() {
    return (
        <>
            <Head>
                <title>Subscription FAQ | Bluom</title>
                <meta name="description" content="Bluom Pro subscription billing, management, and refund information" />
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
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg">
                        <h1 className="text-4xl font-black font-outfit mb-8 text-slate-900">Subscription & Billing FAQ</h1>
                        <p className="text-sm text-slate-500 mb-8">Last updated: January 8, 2025</p>

                        <div className="space-y-8">
                            {/* Pricing Overview */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">💰 Subscription Plans</h2>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                        <h3 className="font-bold text-slate-900 mb-2">Starter Plan</h3>
                                        <p className="text-2xl font-black text-slate-900 mb-3">Free forever</p>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Basic Health Hubs</li>
                                            <li>• Standard tracking</li>
                                            <li>• Community access</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                        <h3 className="font-bold text-slate-900 mb-2">Monthly Pro</h3>
                                        <p className="text-2xl font-black text-slate-900 mb-3">$12.99/month</p>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• All Pro features</li>
                                            <li>• Cancel anytime</li>
                                            <li>• Monthly billing</li>
                                        </ul>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                        <h3 className="font-bold text-slate-900 mb-2">Annual Pro</h3>
                                        <p className="text-2xl font-black text-slate-900 mb-3">$69.99/year</p>
                                        <p className="text-green-700 font-bold text-sm mb-2">Save 55% - Only $1.34/week</p>
                                        <p className="text-slate-600 italic text-xs mb-3">Loyalty Discount: Your subscription price automatically lowers each consecutive year you remain a Blümie.</p>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• All Pro features</li>
                                            <li>• Best value</li>
                                            <li>• Annual billing</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Billing Information */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">💳 Billing Information</h2>
                                <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                                    <div className="bg-white rounded-lg p-4">
                                        <h3 className="font-bold text-slate-900 mb-2">🔄 Auto-Renewal</h3>
                                        <p className="text-slate-700">
                                            Subscriptions automatically renew unless cancelled 24 hours before the end of the current billing period.
                                            You'll receive a reminder email before renewal.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4">
                                        <h3 className="font-bold text-slate-900 mb-2">💳 Payment Methods</h3>
                                        <p className="text-slate-700">
                                            We accept payment through your app store (Google Play Store or Apple App Store).
                                            All payment processing is handled securely by your app store.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4">
                                        <h3 className="font-bold text-slate-900 mb-2">📧 Billing Receipts</h3>
                                        <p className="text-slate-700">
                                            Receipts are sent to your app store email address automatically after each payment.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Subscription Management */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">⚙️ Managing Your Subscription</h2>
                                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                    <h3 className="font-bold text-slate-900 mb-3">📱 Through App Store Settings</h3>
                                    <p className="text-slate-700 mb-4">
                                        Manage your Bluom Pro subscription directly through your device's app store:
                                    </p>

                                    <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-bold text-slate-900 mb-2">🤖 Google Play Store (Android)</h4>
                                            <ol className="list-decimal list-inside text-slate-700 space-y-1 text-sm">
                                                <li>Open Google Play Store</li>
                                                <li>Tap Menu → Subscriptions</li>
                                                <li>Find "Bluom Pro"</li>
                                                <li>Cancel or modify as needed</li>
                                            </ol>
                                        </div>

                                        <div className="bg-white rounded-lg p-4">
                                            <h4 className="font-bold text-slate-900 mb-2">🍎 Apple App Store (iOS)</h4>
                                            <ol className="list-decimal list-inside text-slate-700 space-y-1 text-sm">
                                                <li>Open Settings → Apple ID</li>
                                                <li>Tap Subscriptions</li>
                                                <li>Find "Bluom Pro"</li>
                                                <li>Cancel or modify as needed</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Refund Policy */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">💰 Refund Policy</h2>
                                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-lg p-4">
                                            <h3 className="font-bold text-slate-900 mb-2">🏪 App Store Refunds</h3>
                                            <p className="text-slate-700">
                                                All refunds are handled through your app store (Google Play or Apple App Store).
                                                Bluom does not process refunds directly.
                                            </p>
                                        </div>

                                        <div className="bg-white rounded-lg p-4">
                                            <h3 className="font-bold text-slate-900 mb-2">⏰ Refund Timeframes</h3>
                                            <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                                <li><strong>Google Play:</strong> 48 hours for automatic approval, up to 3 business days for manual review</li>
                                                <li><strong>Apple App Store:</strong> Typically processed within 24-48 hours</li>
                                            </ul>
                                        </div>

                                        <div className="bg-white rounded-lg p-4">
                                            <h3 className="font-bold text-slate-900 mb-2">📋 Refund Eligibility</h3>
                                            <p className="text-slate-700">
                                                Refund eligibility depends on your app store's policy and purchase history.
                                                Common eligible reasons include technical issues, accidental purchases, or unused subscriptions.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Pro Features */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">✨ What's Included in Pro</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">🧠 AI Features</h4>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• AI Biological Coach</li>
                                            <li>• Personalized recommendations</li>
                                            <li>• Advanced insights</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">🌸 Health Hubs</h4>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Women's Health Hub</li>
                                            <li>• Men's Health Hub</li>
                                            <li>• Hormonal optimization</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">⚡ Advanced Tracking</h4>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Metabolic fasting phases</li>
                                            <li>• Autophagy detection</li>
                                            <li>• Advanced protocols</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">🏠 Family Features</h4>
                                        <ul className="text-slate-700 space-y-1 text-sm">
                                            <li>• Household assistant</li>
                                            <li>• Grocery sync</li>
                                            <li>• Family management</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            {/* Troubleshooting */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">🔧 Common Issues</h2>
                                <div className="space-y-4">
                                    <div className="bg-red-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">❌ Subscription Not Working</h4>
                                        <p className="text-slate-700 text-sm">
                                            <strong>Solution:</strong> Restore your purchase in the app settings or restart the app.
                                            Make sure you're logged into the correct app store account.
                                        </p>
                                    </div>

                                    <div className="bg-red-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">💳 Charged After Cancellation</h4>
                                        <p className="text-slate-700 text-sm">
                                            <strong>Solution:</strong> Contact your app store support directly.
                                            Cancellations take effect at the end of the current billing period.
                                        </p>
                                    </div>

                                    <div className="bg-red-50 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-900 mb-2">🔄 Can't Find Subscription</h4>
                                        <p className="text-slate-700 text-sm">
                                            <strong>Solution:</strong> Check if you're using the correct app store account.
                                            Subscriptions are tied to the account used for purchase.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Contact Support */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📧 Need Billing Help?</h2>
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <p className="text-slate-700 mb-4">
                                        For billing issues not resolved through your app store:
                                    </p>
                                    <div className="space-y-2">
                                        <p className="font-bold text-slate-900">Email: billing@bluom.app</p>
                                        <p className="text-slate-700 text-sm">Include: Your email, purchase date, and issue description</p>
                                        <p className="text-slate-600 text-sm">Response time: Within 24-48 hours</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
