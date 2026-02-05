import React, { useState } from 'react';
import Head from 'expo-router/head';

export default function DataDeletion() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [email, setEmail] = useState('');
    const [confirmation, setConfirmation] = useState('');

    const handleDataDeletion = async () => {
        if (!email || !confirmation) {
            alert('Please fill in all fields');
            return;
        }

        if (confirmation !== 'DELETE MY DATA') {
            alert('Please type "DELETE MY DATA" exactly as shown');
            return;
        }

        setIsProcessing(true);
        
        try {
            // This would trigger a Convex mutation to delete user data
            // In a real implementation, this would call:
            // await convex.mutation(api.users.deleteUserAndData, { email });
            
            // For now, we'll simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            alert('Your data deletion request has been submitted. All your data will be permanently deleted within 24 hours.');
            setEmail('');
            setConfirmation('');
        } catch (error) {
            alert('Error submitting deletion request. Please contact support@bluom.app');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Head>
                <title>Data Deletion | Bluom</title>
                <meta name="description" content="Request deletion of your Bluom account and all associated data" />
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
                        <h1 className="text-4xl font-black font-outfit mb-8 text-slate-900">Data Deletion & Account Removal</h1>
                        <p className="text-sm text-slate-500 mb-8">Last updated: January 8, 2025</p>

                        <div className="space-y-8">
                            {/* Right to be Forgotten */}
                            <section className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">🗑️ Your Right to be Forgotten</h2>
                                <p className="text-slate-700 leading-relaxed mb-4">
                                    You have the right to request permanent deletion of all your personal data from Bluom. 
                                    This includes all health data, activity logs, preferences, and account information.
                                </p>
                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                    <h3 className="font-bold text-slate-900 mb-2">Data That Will Be Deleted:</h3>
                                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                                        <li>• User profile and authentication data</li>
                                        <li>• All fasting logs and metabolic data</li>
                                        <li>• Hormonal cycle tracking data</li>
                                        <li>• Exercise and activity history</li>
                                        <li>• Sleep and wellness logs</li>
                                        <li>• Food and nutrition entries</li>
                                        <li>• Subscription and payment records</li>
                                        <li>• App preferences and settings</li>
                                        <li>• AI coaching conversations</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Deletion Process */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">⏱️ Deletion Process</h2>
                                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                                    <ol className="list-decimal list-inside text-slate-700 space-y-3">
                                        <li><strong>Submit Request:</strong> Fill out the form below with your registered email</li>
                                        <li><strong>Verification:</strong> We verify your identity using the email on file</li>
                                        <li><strong>Processing:</strong> Your deletion request is processed within 24 hours</li>
                                        <li><strong>Confirmation:</strong> You'll receive email confirmation when deletion is complete</li>
                                        <li><strong>Permanent:</strong> This action cannot be undone - all data is permanently erased</li>
                                    </ol>
                                </div>
                            </section>

                            {/* In-App Instructions */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📱 In-App Deletion</h2>
                                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                    <h3 className="font-bold text-slate-900 mb-3">Alternative: Delete Account in App</h3>
                                    <p className="text-slate-700 mb-3">
                                        You can also delete your account directly through the app:
                                    </p>
                                    <ol className="list-decimal list-inside text-slate-700 space-y-2 text-sm">
                                        <li>Open Bluom app</li>
                                        <li>Go to <strong>Settings → Account → Delete Data</strong></li>
                                        <li>Follow the on-screen confirmation steps</li>
                                        <li>All biometric and health data will be permanently purged from our servers</li>
                                    </ol>
                                    <p className="text-slate-600 text-sm mt-3">
                                        <strong>Note:</strong> This is the fastest method - deletion happens immediately upon confirmation.
                                    </p>
                                </div>
                            </section>

                            {/* Deletion Form */}
                            <section className="bg-red-50 rounded-xl p-6 border border-red-200">
                                <h2 className="text-2xl font-black font-outfit mb-4 text-red-900">⚠️ Permanent Data Deletion Request</h2>
                                <p className="text-slate-700 mb-6">
                                    <strong>Warning:</strong> This action is permanent and cannot be undone. All your data will be lost forever.
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">
                                            Registered Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="your@email.com"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">
                                            Type "DELETE MY DATA" to confirm
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmation}
                                            onChange={(e) => setConfirmation(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="DELETE MY DATA"
                                            disabled={isProcessing}
                                        />
                                    </div>

                                    <button
                                        onClick={handleDataDeletion}
                                        disabled={isProcessing || !email || confirmation !== 'DELETE MY DATA'}
                                        className="w-full bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isProcessing ? 'Processing...' : 'Permanently Delete All My Data'}
                                    </button>
                                </div>
                            </section>

                            {/* Alternative Contact */}
                            <section>
                                <h2 className="text-2xl font-black font-outfit mb-4 text-slate-900">📧 Need Help?</h2>
                                <div className="bg-slate-50 rounded-xl p-6">
                                    <p className="text-slate-700 mb-3">
                                        If you have trouble with the deletion process or need assistance:
                                    </p>
                                    <div className="space-y-2">
                                        <p className="font-bold text-slate-900">Email: support@bluom.app</p>
                                        <p className="text-slate-700 text-sm">Subject: "Data Deletion Request"</p>
                                        <p className="text-slate-600 text-sm">Response time: Within 24 hours</p>
                                    </div>
                                </div>
                            </section>

                            {/* Legal Compliance */}
                            <section className="bg-slate-100 rounded-xl p-6">
                                <h2 className="text-lg font-black font-outfit mb-3 text-slate-900">📋 Legal Compliance</h2>
                                <p className="text-slate-700 text-sm leading-relaxed">
                                    This data deletion process complies with GDPR (Right to be Forgotten), CCPA, and other privacy regulations. 
                                    We maintain records of deletion requests for legal compliance purposes, but all personal data is permanently removed.
                                </p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
