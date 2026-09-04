import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { useUser } from '@clerk/clerk-expo';
import { MASTER_ADMINS } from '../convex/permissions';
import { Link } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Asset } from 'expo-asset';
import { DEFAULT_BLOG_ARTICLES, BlogArticle } from '@/constants/defaultArticles';

export default function LandingPage() {
  if (Platform.OS !== 'web') return null;

  const logoModule = require('../assets/images/logo.png');
  const logoSrc = Asset.fromModule(logoModule).uri;

  const imgTabs = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/Imagessection%201%20-%202%20screenshots%20of%20index.tsx.png";
  const imgNutritionCollage = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/imagesection%202%20-%203%20screenshots%20of%20fuel.tsx%20and%20ai%20calorie%20photo%20detector%20camera%20model.png";
  const imgWaterLog = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/image%203-%20shopping%20list%20%2B%20recipes.tsx.png";
  const imgMove = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/imagesection%204%20Move.tsx%2C%20the%20exercise%20accordeon%20where%20you%20enter%20the%20sets%20and%20reps%2C%20%2B%20workouts.tsx.png";
  const imgBehavioral = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/image%205%20the%20meal%2C%20mental%20health%20and%20fitness%20plans.png.png";
  const imgWellness = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/image%206%20-%20screenshots%20of%20wellness.tsx.png";
  const imgGamesHub = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/Image%206%20wellness.tsx.png";
  const imgWomensHealth = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/image%207%20womens%20health%20cycle%20come%20we%20see%20the%20today%20tab%2C%20thr%20symtomns%20form%20and%20the%20pevic%20protocol%20timmer.png";
  const imgSupplements = "https://pub-4fce1c6ae7bb4045806c88b43ee6ab5d.r2.dev/image%208%20-%20%20Menrs%20health%20screen%20shots.png";

  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isMasterAdmin = currentEmail && MASTER_ADMINS.map(e => e.toLowerCase()).includes(currentEmail);

  const submitTestUser = useMutation((api as any).testUsers?.submit);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const canSubmit = useMemo(() => email.trim().includes('@') && status !== 'saving', [email, status]);

  const onSubmitEmail = async () => {
    try { setStatus('saving'); await submitTestUser({ email: email.trim(), source: 'landing' }); setStatus('done'); }
    catch { setStatus('error'); }
  };

  const FAQ_ITEMS: [string, string][] = [
    ['Does it sync with Apple Health and Google Fit?', 'Yes — steps, active calories, and workouts flow in automatically.'],
    ['Is my data private?', 'Your data is yours. We never sell it. Full GDPR export and deletion available anytime.'],
    ['Can I cancel anytime?', 'Yes. Monthly and yearly plans cancel in two taps. No questions asked.'],
    ['What languages are supported?', '14 languages including English, Portuguese, Spanish, French, German, Dutch, Polish, Turkish.'],
    ['Does the AI calorie scanner actually work?', 'It uses a vision model trained on millions of meals. Always editable if it gets a portion wrong.'],
    ['Is there a women\'s health mode?', 'Yes — Cycle, Pregnancy, and Menopause modes with phase-aware insights and a pelvic floor timer.'],
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Bluom',
    url: 'https://www.bluom.app',
    logo: 'https://www.bluom.app/logo.png',
    sameAs: [
      'https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102',
      'https://play.google.com/store/apps/details?id=com.jwfca.bluom',
    ],
  };

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Bluom',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'iOS, Android',
    description: "All-in-one health and fitness tracker with an AI calorie scanner, macro tracker, workout tracker, habit tracker, weight loss tools, cycle tracker, glucose/keto tracker, dental health tracker, camera-based pulse (HRV) tracker, and a focus timer.",
    url: 'https://www.bluom.app',
    image: 'https://www.bluom.app/logo.png',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Premium', price: '11.99', priceCurrency: 'USD' },
    ],
  };
  const dbArticles = useQuery(api.admin.getPublishedArticles, {});
  const landingArticles = useMemo(() => {
    if (!dbArticles || dbArticles.length === 0) {
      return DEFAULT_BLOG_ARTICLES.slice(0, 3);
    }
    const dbMapped: BlogArticle[] = dbArticles.map((a: any) => ({
      _id: a._id,
      slug: a.slug || a._id,
      title: a.title,
      category: a.category || 'Health',
      emoji: '📖',
      time: `${Math.max(3, Math.ceil((a.content?.length || 500) / 700))} min read`,
      featuredImage:
        a.featuredImage ||
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
      excerpt:
        a.content
          ?.replace(/^#+\s+/gm, '')
          ?.replace(/\*\*/g, '')
          ?.slice(0, 150) + '...' || 'Read on Bluom.',
      content: a.content || '',
      author: 'Bluom Health Research Team',
      publishedAt: new Date(a.createdAt || Date.now()).toISOString().slice(0, 10),
      tags: a.tags || [a.category || 'Health'],
    }));
    const seen = new Set(dbMapped.map((a) => a.slug));
    const merged = [
      ...dbMapped,
      ...DEFAULT_BLOG_ARTICLES.filter((a) => !seen.has(a.slug)),
    ];
    return merged.slice(0, 3);
  }, [dbArticles]);

  return (
    <>
      <Head>
        <title>Bluom | AI Calorie Scanner, Macro Tracker & Habit Tracker App</title>
        <meta name="description" content="All-in-one health and fitness tracker: AI calorie scanner, macro tracker, workout tracker, habit tracker, weight loss tools, and cycle & glucose tracking — unified in one app instead of seven." />
        <meta name="keywords" content="health and fitness tracker, macro tracker app, ai calorie scanner, workout tracker, habit tracker app, weight loss app, cycle tracking app, glucose tracker app, keto tracker app, running tracker app, focus timer app" />
        <link rel="canonical" href="https://www.bluom.app/" />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.bluom.app/" />
        <meta property="og:title" content="Bluom | AI Calorie Scanner, Macro Tracker & Habit Tracker App" />
        <meta property="og:description" content="All-in-one health and fitness tracker: AI calorie scanner, macro tracker, workout tracker, habit tracker, weight loss tools, and cycle & glucose tracking — unified in one app instead of seven." />
        <meta property="og:image" content="https://www.bluom.app/logo.png" />
        <meta property="og:site_name" content="Bluom" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.bluom.app/" />
        <meta name="twitter:title" content="Bluom | AI Calorie Scanner, Macro Tracker & Habit Tracker App" />
        <meta name="twitter:description" content="All-in-one health and fitness tracker: AI calorie scanner, macro tracker, workout tracker, habit tracker, weight loss tools, and cycle & glucose tracking." />
        <meta name="twitter:image" content="https://www.bluom.app/logo.png" />

        {/* Structured data — helps both classic search snippets and AI/LLM answer engines cite Bluom accurately */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&family=Instrument+Serif&display=swap" rel="stylesheet" />
      </Head>

      <div className="bg-[#F5F4F0] text-[#0F172A] min-h-screen font-sans selection:bg-blue-200 overflow-y-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          body { margin: 0; background-color: #F5F4F0 !important; }
          .font-outfit { font-family: 'Outfit', sans-serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
          .font-serif-display { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; }
          html { scroll-behavior: smooth; background-color: #F5F4F0; }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #F5F4F0; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `}} />

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/75 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2"><img src={logoSrc} alt="Bluom" className="h-9 w-auto" /></a>
            <nav className="hidden lg:flex items-center gap-8 text-sm font-bold tracking-tight text-slate-600">
              <a href="#fuel" className="hover:text-[#2563eb]">Fuel</a>
              <a href="#move" className="hover:text-[#2563eb]">Move</a>
              <a href="#plans" className="hover:text-[#2563eb]">Plans</a>
              <a href="#wellness" className="hover:text-[#2563eb]">Wellness</a>
              <a href="#womens" className="hover:text-[#2563eb]">Women</a>
              <a href="#mens" className="hover:text-[#2563eb]">Men</a>
              <a href="#tools" className="hover:text-[#2563eb]">Tools</a>
              <a href="/blog" className="hover:text-[#2563eb]">Blog</a>
              <a href="#pricing" className="hover:text-[#2563eb]">Pricing</a>
              <a href="#faq" className="hover:text-[#2563eb]">FAQ</a>
              {isMasterAdmin && (
                <Link href={"/admin" as any} className="text-[#2563eb] font-black border-l border-slate-200 pl-6">ADMIN</Link>
              )}
            </nav>
            <a href="#download" className="bg-[#2563eb] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all hover:scale-105">Get the app</a>
          </div>
        </header>

        <main id="top" className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-24">

          {/* ── HERO ──────────────────────────────────────────────────── */}
          <section className="grid lg:grid-cols-2 gap-12 items-center pt-8">
            <div>
              <span className="inline-block bg-blue-100 text-[#2563eb] text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">Now in early access</span>
              <h1 className="text-5xl md:text-7xl font-black font-outfit tracking-tight leading-[1.02] text-slate-900 mb-6">
                One app. <span className="font-serif-display text-[#2563eb]">Every system</span> in your body.
              </h1>
              <p className="text-xl text-slate-500 font-inter font-medium mb-8 max-w-xl">
                Nutrition, training, sleep, mood, cycle, supplements — finally unified. Stop juggling seven apps.
              </p>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-blue-900/5 p-3 flex flex-col sm:flex-row gap-2 max-w-lg mb-6">
                <input value={email} onChange={(e) => setEmail((e.target as any).value)} placeholder="you@email.com"
                  className="flex-1 px-4 py-3 rounded-xl border-0 font-inter font-semibold text-slate-900 outline-none focus:bg-slate-50" />
                <button disabled={!canSubmit} onClick={onSubmitEmail}
                  className={`px-6 py-3 rounded-xl font-black whitespace-nowrap ${canSubmit ? 'bg-blue-600 text-white hover:shadow-lg hover:shadow-blue-200' : 'bg-slate-200 text-slate-500'} transition-all`}>
                  {status === 'saving' ? 'Saving…' : status === 'done' ? '✓ On the list' : 'Get early access'}
                </button>
              </div>
              {status === 'error' && <p className="text-rose-600 font-bold text-sm mb-4">Couldn't save. Try again.</p>}

              <div id="download" className="flex flex-wrap items-center gap-3">
                <a href="https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102?l=en-GB" target="_blank" rel="noopener noreferrer"
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-all no-underline">
                  <div className="text-left"><p className="text-[9px] uppercase font-bold opacity-60 m-0">Download on the</p><p className="text-base font-bold leading-none m-0">App Store</p></div>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.jwfca.bluom" target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-all no-underline">
                  <div className="text-left"><p className="text-[9px] uppercase font-bold opacity-60 m-0">Get it on</p><p className="text-base font-bold leading-none m-0">Google Play</p></div>
                </a>
                <a href="https://startupbase.io/products/bluom-app?utm_source=startupbase&utm_medium=badge&utm_campaign=launch-badge-dark" target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-all">
                  <img src="https://statics.startupbase.io/site/badges/launched-on-sb-dark.svg" alt="Launched on StartupBase" height="55" style={{ height: '55px', width: 'auto' }} />
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-6 font-semibold uppercase tracking-widest">Trusted by 10,000+ early users · 14 languages</p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 via-orange-200/20 to-violet-300/20 blur-3xl" />
              <div className="relative rounded-[40px] bg-white border border-slate-200 shadow-2xl shadow-blue-900/10 overflow-hidden p-4">
                <img src={imgTabs} alt="Bluom app dashboard" className="w-full h-auto object-contain rounded-3xl" />
              </div>
            </div>
          </section>

          {/* ── PILLAR STRIP ─────────────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { k: 'Fuel', d: 'Macro tracker & Ai calorie counter', c: '#2563eb' },
              { k: 'Move', d: 'Fitness tracker & running tracker', c: '#5fc660' },
              { k: 'Mind', d: 'Meditation, sleep & habits tracker', c: '#a855f7' },
              { k: 'You', d: "Women & Men health, fasting timer", c: '#ef8a34' },
            ].map((p) => (
              <div key={p.k} className="bg-white rounded-2xl p-6 border border-slate-100">
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: p.c }}>{p.k}</span>
                <p className="text-slate-900 font-bold font-inter mt-2">{p.d}</p>
              </div>
            ))}
          </section>

          {/* ── SECTION: AI CALORIE SCANNER ─────────────────────────── */}
          <section id="fuel" className="grid lg:grid-cols-2 gap-12 items-center bg-white rounded-[40px] p-10 md:p-14 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden order-2 lg:order-1">
              <img src={imgNutritionCollage} alt="AI photo calorie scanner" className="w-full h-full object-contain" />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-[#2563eb] text-xs font-black uppercase tracking-widest">Fuel</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-6">Snap your plate. <span className="font-serif-display text-[#2563eb]">We do the math.</span></h2>
              <p className="text-lg text-slate-500 font-inter font-medium mb-8">Point your camera at any meal — AI detects food, portions, and macros in seconds. Or scan barcodes. Or search 1M+ foods in 14 languages.</p>
              <ul className="space-y-3 text-slate-700 font-inter font-semibold">
                <li>📸 Ai calorie counter & macro tracker</li>
                <li>🌍 Ai meal Maker & guided recipes</li>
                <li>💧 Metabolic tracker, keto tracker app, glucose tracker app</li>
                <li>🍽️ Personalized meal plans & shopping list</li>
              </ul>
            </div>
          </section>

          {/* ── SECTION: RECIPES + SHOPPING ─────────────────────────── */}
          <section className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-orange-600 text-xs font-black uppercase tracking-widest">Recipes & Shopping</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-6">From recipe to <span className="font-serif-display text-orange-600">receipt</span>, in one tap.</h2>
              <p className="text-lg text-slate-500 font-inter font-medium mb-8">Cook smarter. Shop faster. Share with your partner — one list, two phones, real-time sync.</p>
              <ul className="space-y-3 text-slate-700 font-inter font-semibold">
                <li>🛒 Smart shopping list and meal plans</li>
                <li>👥 Partner-synced grocery lists</li>
                <li>🗂️ Dieting protocols: keto tracker app, glucose tracker app</li>
                <li>👨‍🍳 Guided recipes & Ai meal Maker</li>
              </ul>
            </div>
            <div className="rounded-[32px] bg-white border border-slate-100 overflow-hidden p-4 shadow-xl shadow-orange-900/5">
              <img src={imgWaterLog} alt="Recipes and shopping list" className="w-full h-auto object-contain rounded-2xl" />
            </div>
          </section>

          {/* ── SECTION: MOVE ───────────────────────────────────────── */}
          <section id="move" className="grid lg:grid-cols-2 gap-12 items-center bg-slate-900 rounded-[40px] p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-500/20 blur-3xl rounded-full" />
            <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden order-2 lg:order-1 relative z-10">
              <img src={imgMove} alt="Workouts and exercise logger" className="w-full h-full object-contain" />
            </div>
            <div className="order-1 lg:order-2 relative z-10">
              <span className="text-[#5fc660] text-xs font-black uppercase tracking-widest">Move</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit leading-tight mt-3 mb-6">Train like you have a <span className="font-serif-display text-[#5fc660]">coach</span> in your pocket.</h2>
              <p className="text-lg text-slate-300 font-inter font-medium mb-8">Sets, reps, weights — logged in 3 taps. MET-based calorie burn. Real science, not made-up numbers.</p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[['1000+', 'Exercises'], ['MET', 'Calorie math'], ['Strava', 'Sync']].map(([k, v]) => (
                  <div key={k} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-2xl font-black font-outfit text-white">{k}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">{v}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400 font-inter">Personalized fitness plan, fitness tracker, running tracker, steps counter, and more.</p>
            </div>
          </section>

          {/* ── SECTION: 3 PLANS ────────────────────────────────────── */}
          <section id="plans">
            <div className="text-center mb-12">
              <span className="text-[#2563eb] text-xs font-black uppercase tracking-widest">Personalized</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-4">Three plans. One you. <span className="font-serif-display text-[#2563eb]">Built in 60 seconds.</span></h2>
              <p className="text-lg text-slate-500 font-inter font-medium max-w-2xl mx-auto">AI plans calibrated to your biometrics, goals, stress level, and schedule. Recalculates as you progress.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: '🥗', title: 'Nutrition', desc: 'Calorie + macro targets via Mifflin-St Jeor. Meal templates that fit your diet.', color: 'bg-orange-50 border-orange-100', accent: 'text-orange-600' },
                { icon: '🏋️', title: 'Fitness', desc: 'Split based on experience, equipment, and days per week you can train.', color: 'bg-green-50 border-green-100', accent: 'text-green-700' },
                { icon: '🧘', title: 'Wellness', desc: 'Sleep, meditation, and habit stack tuned to your top stressors.', color: 'bg-violet-50 border-violet-100', accent: 'text-violet-700' },
              ].map((p) => (
                <div key={p.title} className={`rounded-3xl p-8 border ${p.color}`}>
                  <div className="text-4xl mb-4">{p.icon}</div>
                  <h3 className={`text-2xl font-black font-outfit mb-3 ${p.accent}`}>{p.title} Plan</h3>
                  <p className="text-slate-600 font-inter">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-3xl bg-white border border-slate-100 p-4 shadow-xl">
              <img src={imgBehavioral} alt="Personalized plans dashboard" className="w-full h-auto object-contain rounded-2xl" />
            </div>
          </section>

          {/* ── SECTION: WELLNESS ───────────────────────────────────── */}
          <section id="wellness" className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-[32px] bg-white border border-slate-100 overflow-hidden p-4 shadow-xl shadow-violet-900/5">
              <img src={imgWellness} alt="Meditation and soundscapes" className="w-full h-auto object-contain rounded-2xl" />
            </div>
            <div>
              <span className="text-violet-600 text-xs font-black uppercase tracking-widest">Wellness</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-6">Your mind deserves a <span className="font-serif-display text-violet-600">gym</span> too.</h2>
              <p className="text-lg text-slate-500 font-inter font-medium mb-8">Meditate. Journal. Grow. Your streak literally blooms in the Mind Garden.</p>
              <ul className="space-y-3 text-slate-700 font-inter font-semibold">
                <li>🧘 Meditation, guided meditation & Focus app</li>
                <li>🎧 Peak biology soundscapes & fasting timer</li>
                <li>🌱 Habits tracker — XP, levels, tokens per session</li>
                <li>📝 Mood tracker, sleep tracker, & journalling</li>
                <li>💊 Medication & supplement reminders — any pill, any schedule</li>
              </ul>
              <div className="mt-8 rounded-2xl border border-slate-100 overflow-hidden">
                <img src={imgGamesHub} alt="Mind games hub" className="w-full h-auto object-contain" />
              </div>
            </div>
          </section>

          {/* ── SECTION: WOMEN'S HEALTH ─────────────────────────────── */}
          <section id="womens" className="bg-gradient-to-br from-rose-50 to-pink-100 rounded-[40px] p-10 md:p-14 border border-rose-100">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-rose-600 text-xs font-black uppercase tracking-widest">Women's Health</span>
                <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-6">Built for <span className="font-serif-display text-rose-600">every phase</span> of being a woman.</h2>
                <p className="text-lg text-slate-600 font-inter font-medium mb-8">Cycle. Pregnancy. Menopause. One app, all three — phase-aware insights, not generic advice.</p>
                <ul className="space-y-3 text-slate-700 font-inter font-semibold">
                  <li>🌸 Phase-aware Today tab (follicular · ovulation · luteal · menstrual)</li>
                  <li>📋 Symptoms form — cramps, mood, flow, energy, libido</li>
                  <li>⏱️ Pelvic floor protocol timer with breath cues</li>
                  <li>🤰 Pregnancy week tracker · baby movement logs</li>
                  <li>🔥 Menopause mode — hot flash severity & HRT tracking</li>
                </ul>
              </div>
              {/* Women's health screenshot */}
              <div className="rounded-[32px] bg-white border border-rose-100 overflow-hidden p-4 shadow-xl shadow-rose-900/5">
                <img src={imgWomensHealth} alt="Women's Health features" className="w-full h-auto object-contain rounded-2xl" />
              </div>
            </div>
          </section>

          {/* ── SECTION: MEN'S HEALTH ───────────────────────────────── */}
          <section id="mens" className="bg-slate-900 rounded-[40px] p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden p-4">
                <img src={imgSupplements} alt="Men's health supplement stacks" className="w-full h-auto object-contain rounded-2xl" />
              </div>
              <div>
                <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Men's Health</span>
                <h2 className="text-4xl md:text-5xl font-black font-outfit leading-tight mt-3 mb-6">Optimization for men who <span className="font-serif-display text-blue-400">actually train.</span></h2>
                <p className="text-lg text-slate-300 font-inter font-medium mb-8">Testosterone. Recovery. Drive. Tracked.</p>
                <ul className="space-y-3 text-slate-200 font-inter font-semibold">
                  <li>💊 Supplement Stack builder — creatine, zinc, ashwagandha…</li>
                  <li>🔄 Cycle phase tracking (On Cycle / PCT / Cruising)</li>
                  <li>⏰ Pill reminders by color, shape & time</li>
                  <li>📊 Drive · recovery · focus · strength logs</li>
                  <li>🚫 Habit quitter (alcohol, nicotine, sugar) with money saved</li>
                  <li>⏳ Fasting protocols 16:8 · 18:6 · 20:4</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── SECTION: PRECISION TOOLS ────────────────────────────── */}
          <section id="tools">
            <div className="text-center mb-12">
              <span className="text-[#2563eb] text-xs font-black uppercase tracking-widest">Precision Tools</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3 mb-4">Six more tools <span className="font-serif-display text-[#2563eb]">hiding inside</span> Bluom.</h2>
              <p className="text-lg text-slate-500 font-inter font-medium max-w-2xl mx-auto">Features most trackers don't even attempt — built in, not bolted on.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { icon: '🩸', title: 'Metabolic Hub', desc: 'A glucose tracker and keto tracker in one command center — net carbs, fat/carb ratio, ketosis state, and a keto-safe food list.', color: 'bg-red-50 border-red-100', accent: 'text-red-600' },
                { icon: '🦷', title: 'Dental Health Hub', desc: 'A 2-minute guided brushing timer, sensitive-teeth map, flossing & mouthwash checklist, and an AI dental scan.', color: 'bg-cyan-50 border-cyan-100', accent: 'text-cyan-700' },
                { icon: '❤️', title: 'PPG Pulse Tracker', desc: 'Point your camera at your fingertip for a heart rate, HRV, and stress reading — no wearable required.', color: 'bg-rose-50 border-rose-100', accent: 'text-rose-600' },
                { icon: '🎯', title: 'Focus Mode', desc: 'A distraction-free focus timer for deep work sessions, with productivity tracking for Pro users.', color: 'bg-indigo-50 border-indigo-100', accent: 'text-indigo-600' },
                { icon: '🏆', title: 'Achievements', desc: 'XP-style badges — Food Detective, Protein Streak, Ocean Mind — that turn daily consistency into a game.', color: 'bg-amber-50 border-amber-100', accent: 'text-amber-600' },
                { icon: '⌚', title: 'Wearable Sync', desc: 'Apple Health, Health Connect, Samsung Health, Oura Ring, Galaxy Watch & Ring, and Strava — synced automatically.', color: 'bg-slate-50 border-slate-200', accent: 'text-slate-700' },
              ].map((t) => (
                <div key={t.title} className={`rounded-3xl p-8 border ${t.color}`}>
                  <div className="text-4xl mb-4">{t.icon}</div>
                  <h3 className={`text-xl font-black font-outfit mb-3 ${t.accent}`}>{t.title}</h3>
                  <p className="text-slate-600 font-inter text-sm leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── PRICING ─────────────────────────────────────────────── */}
          <section id="pricing">
            <div className="text-center mb-12">
              <span className="text-[#2563eb] text-xs font-black uppercase tracking-widest">Pricing</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3">Simple, honest pricing.</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl p-8 border border-slate-100">
                <h3 className="text-2xl font-black font-outfit text-slate-900">Free</h3>
                <p className="text-4xl font-black font-outfit text-slate-900 mt-4">$0<span className="text-base text-slate-400 font-bold">/mo</span></p>
                <ul className="space-y-2 mt-6 text-slate-600 font-inter font-semibold text-sm">
                  <li>✓ 4 meal slots/day</li><li>✓ Basic workouts</li><li>✓ 2 mind games/day</li><li>✓ Cycle tracking</li>
                </ul>
              </div>
              <div className="bg-slate-900 text-white rounded-3xl p-8 border-2 border-[#2563eb] relative">
                <span className="absolute -top-3 left-8 bg-[#2563eb] text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">Most popular</span>
                <h3 className="text-2xl font-black font-outfit">Premium</h3>
                <p className="text-4xl font-black font-outfit mt-4"><span className="text-2xl">$</span>11.99<span className="text-base text-slate-400 font-bold">/mo</span></p>
                <p className="text-xs text-slate-400 font-bold mt-1">iOS: $12.99 (US) / €14.99 (EU)</p>
                <ul className="space-y-2 mt-6 text-slate-200 font-inter font-semibold text-sm">
                  <li>✓ Everything in Free</li><li>✓ AI photo calorie scanner</li><li>✓ 5th premium meal slot</li><li>✓ Unlimited AI coach messages</li><li>✓ Premium recipes & video workouts</li><li>✓ Advanced analytics & reports</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── FAQ ─────────────────────────────────────────────────── */}
          <section id="faq" className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[#2563eb] text-xs font-black uppercase tracking-widest">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-tight mt-3">Questions, answered.</h2>
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map(([q, a]) => (
                <details key={q} className="bg-white rounded-2xl border border-slate-100 p-6 group">
                  <summary className="font-bold font-inter text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    {q}<span className="text-[#2563eb] text-2xl font-black group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-slate-500 font-inter mt-3">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── SECTION: BLOG & INSIGHTS ────────────────────────────── */}
          <section id="blog" className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#2563eb]">Knowledge Hub</span>
                <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 mt-2">
                  Health, Longevity & <span className="font-serif-display text-[#2563eb]">Science</span>
                </h2>
                <p className="text-slate-500 font-inter font-medium mt-2 max-w-xl">
                  Deep-dive research into metabolic flexibility, cycle syncing, autophagy, and nervous system regulation.
                </p>
              </div>
              <a
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-[#2563eb] hover:text-blue-700 transition-colors no-underline group"
              >
                View all articles
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {landingArticles.map((article) => (
                <article
                  key={article.slug}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  <a href={`/blog/${article.slug}`} className="block relative h-48 overflow-hidden bg-slate-100 no-underline">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                      {article.category}
                    </span>
                  </a>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3">
                        <span>{article.time}</span>
                        <span>•</span>
                        <span>{article.publishedAt}</span>
                      </div>
                      <h3 className="text-lg font-bold font-outfit text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3 line-clamp-2">
                        <a href={`/blog/${article.slug}`} className="no-underline text-inherit">
                          {article.title}
                        </a>
                      </h3>
                      <p className="text-sm text-slate-600 font-inter leading-relaxed line-clamp-3 mb-4">
                        {article.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">By {article.author.replace('Bluom ', '')}</span>
                      <a
                        href={`/blog/${article.slug}`}
                        className="text-xs font-extrabold text-[#2563eb] hover:text-blue-800 no-underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                      >
                        Read article →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── FINAL CTA ───────────────────────────────────────────── */}
          <section className="bg-gradient-to-br from-[#2563eb] to-blue-700 rounded-[40px] p-12 md:p-20 text-center text-white relative overflow-hidden">
            <h2 className="text-4xl md:text-6xl font-black font-outfit leading-tight mb-6">Start your <span className="font-serif-display">transformation</span> today.</h2>
            <p className="text-xl text-blue-100 font-inter font-medium mb-8 max-w-2xl mx-auto">Join 10,000+ early users redesigning how they care for their body.</p>
            <div className="max-w-md mx-auto bg-white rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
              <input value={email} onChange={(e) => setEmail((e.target as any).value)} placeholder="you@email.com"
                className="flex-1 px-4 py-3 rounded-xl border-0 font-inter font-semibold text-slate-900 outline-none" />
              <button disabled={!canSubmit} onClick={onSubmitEmail}
                className={`px-6 py-3 rounded-xl font-black whitespace-nowrap ${canSubmit ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'} transition-all`}>
                {status === 'saving' ? 'Saving…' : status === 'done' ? '✓ Joined' : 'Join the waitlist'}
              </button>
            </div>
          </section>
        </main>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-slate-100 pt-20 pb-10 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
              <div className="col-span-2">
                <img src={logoSrc} alt="Bluom" className="h-9 w-auto mb-4" />
                <p className="text-slate-500 font-inter font-medium max-w-xs">Precision Living. Power in Bloom. Live with vigor — optimize with precision.</p>
                <div className="flex gap-3 mt-6">
                  <a href="https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102?l=en-GB" target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg no-underline">App Store</a>
                  <a href="https://play.google.com/store/apps/details?id=com.jwfca.bluom" target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg no-underline">Google Play</a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Product</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="#fuel" className="block hover:text-[#2563eb]">Fuel & AI Scanner</a>
                  <a href="#move" className="block hover:text-[#2563eb]">Move & Workouts</a>
                  <a href="#plans" className="block hover:text-[#2563eb]">Personalized Plans</a>
                  <a href="#wellness" className="block hover:text-[#2563eb]">Wellness & Mind Garden</a>
                  <a href="#tools" className="block hover:text-[#2563eb]">Precision Tools</a>
                  <a href="#pricing" className="block hover:text-[#2563eb]">Pricing</a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Content & Blog</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="/blog" className="block text-blue-600 font-bold hover:text-blue-800">Knowledge Hub</a>
                  <a href="/blog/autophagy-cellular-renewal-fasting" className="block hover:text-[#2563eb]">Autophagy & Fasting</a>
                  <a href="/blog/cycle-syncing-female-hormones-training" className="block hover:text-[#2563eb]">Cycle Syncing</a>
                  <a href="/blog/postpartum-recovery-pelvic-floor-core-rehab" className="block hover:text-[#2563eb]">Postpartum Rehab</a>
                  <a href="/blog/muscle-protein-synthesis-hypertrophy-timing" className="block hover:text-[#2563eb]">Muscle Hypertrophy</a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Company</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="https://www.bluom.app/about" className="block hover:text-[#2563eb]">About</a>
                  <a href="https://www.bluom.app/support" className="block hover:text-[#2563eb]">Help Center</a>
                  <a href="https://www.bluom.app/feedback" className="block hover:text-[#2563eb]">Feedback</a>
                  <a href="https://www.bluom.app/legal/subscription-faq" className="block hover:text-[#2563eb]">Billing FAQ</a>
                  <a href="https://www.bluom.app/legal/privacy" className="block hover:text-[#2563eb]">Privacy</a>
                  <a href="https://www.bluom.app/legal/terms" className="block hover:text-[#2563eb]">Terms</a>
                  <a href="https://www.bluom.app/legal/ai-safety" className="block hover:text-[#2563eb]">AI Safety</a>
                  <a href="https://www.bluom.app/legal/refund-policy" className="block hover:text-[#2563eb]">Refund</a>
                  <a href="https://www.bluom.app/legal/data-deletion" className="block hover:text-[#2563eb]">Data Deletion</a>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.25em]">© 2026 Bluom Precision Technology</p>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-[0.25em]">Precision in Living. Power in Bloom.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
