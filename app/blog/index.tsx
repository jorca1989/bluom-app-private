import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { Link, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Asset } from 'expo-asset';
import { DEFAULT_BLOG_ARTICLES, BlogArticle } from '@/constants/defaultArticles';

const CATEGORIES = [
  'All',
  'Fasting',
  "Women's Health",
  "Men's Health",
  'Nutrition',
  'Fitness',
  'Wellness',
  'Hormones',
];

export default function BlogIndexPage() {
  const router = useRouter();
  const logoModule = require('../../assets/images/logo.png');
  const logoSrc = Asset.fromModule(logoModule).uri;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch published articles from Convex
  const dbArticles = useQuery(api.admin.getPublishedArticles, {
    category: selectedCategory === 'All' ? undefined : selectedCategory,
  });

  // Merge DB articles with defaults (avoiding duplicates by slug)
  const articles: BlogArticle[] = useMemo(() => {
    const defaultList = DEFAULT_BLOG_ARTICLES.filter((a) =>
      selectedCategory === 'All' ? true : a.category.toLowerCase() === selectedCategory.toLowerCase()
    );

    if (!dbArticles || dbArticles.length === 0) {
      return defaultList;
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
          ?.slice(0, 160) + '...' ||
        'Read this science-backed health and wellness article on Bluom.',
      content: a.content || '',
      author: 'Bluom Health Research Team',
      publishedAt: new Date(a.createdAt || Date.now()).toISOString().slice(0, 10),
      tags: a.tags || [a.category || 'Health'],
      titlePt: a.titlePt,
      contentPt: a.contentPt,
    }));

    const seenSlugs = new Set(dbMapped.map((a) => a.slug));
    const uniqueDefaults = defaultList.filter((a) => !seenSlugs.has(a.slug));
    return [...dbMapped, ...uniqueDefaults];
  }, [dbArticles, selectedCategory]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  const featuredArticle = filteredArticles[0];
  const gridArticles = filteredArticles.slice(1);

  // SEO Structured Data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Bluom Health & Performance Blog',
    description:
      'Science-backed articles and evidence-based protocols on fasting, autophagy, cycle syncing, hypertrophy, postpartum recovery, and metabolic health.',
    url: 'https://www.bluom.app/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Bluom Precision Technology',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.bluom.app/logo.png',
      },
    },
    hasPart: articles.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.title,
      description: a.excerpt,
      url: `https://www.bluom.app/blog/${a.slug}`,
      image: a.featuredImage,
      datePublished: a.publishedAt,
      author: {
        '@type': 'Organization',
        name: a.author,
      },
    })),
  };

  return (
    <>
      <Head>
        <title>Blog & Health Insights | Bluom — Precision Longevity & Fitness</title>
        <meta
          name="description"
          content="Science-backed articles and evidence-based guides on autophagy, cycle syncing, hypertrophy, hormones, postpartum recovery, and metabolic flexibility."
        />
        <meta name="keywords" content="health blog, fasting, autophagy, cycle syncing, postpartum recovery, hypertrophy, metabolic flexibility, longevity, fitness" />
        <link rel="canonical" href="https://www.bluom.app/blog" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.bluom.app/blog" />
        <meta property="og:title" content="Blog & Health Insights | Bluom" />
        <meta
          property="og:description"
          content="Science-backed health guides and evidence-based protocols to optimize every biological system in your body."
        />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80"
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.bluom.app/blog" />
        <meta name="twitter:title" content="Blog & Health Insights | Bluom" />
        <meta
          name="twitter:description"
          content="Evidence-based protocols to optimize nutrition, sleep, hormones, and fitness."
        />
        <meta
          name="twitter:image"
          content="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80"
        />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen font-sans selection:bg-blue-200 overflow-y-auto">
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body { margin: 0; background-color: #F8FAFC !important; }
          .font-outfit { font-family: 'Outfit', sans-serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
          html { scroll-behavior: smooth; background-color: #F8FAFC; }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #F8FAFC; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        `,
          }}
        />

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src={logoSrc} alt="Bluom Logo" className="h-9 w-auto" />
            </a>
            <nav className="hidden md:flex items-center gap-8 text-sm font-bold tracking-tight text-slate-600">
              <a href="/#fuel" className="hover:text-[#2563eb] transition-colors">Fuel</a>
              <a href="/#move" className="hover:text-[#2563eb] transition-colors">Move</a>
              <a href="/#wellness" className="hover:text-[#2563eb] transition-colors">Wellness</a>
              <a href="/#womens" className="hover:text-[#2563eb] transition-colors">Women</a>
              <a href="/#mens" className="hover:text-[#2563eb] transition-colors">Men</a>
              <a href="/blog" className="text-[#2563eb] font-extrabold border-b-2 border-blue-600 pb-0.5">Blog</a>
              <a href="/about" className="hover:text-[#2563eb] transition-colors">About</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="/#download"
                className="bg-[#2563eb] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all hover:scale-105 no-underline"
              >
                Get the app
              </a>
            </div>
          </div>
        </header>

        {/* ── MAIN ───────────────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-16">
          {/* ── HERO BANNER ──────────────────────────────────────────── */}
          <section className="text-center max-w-3xl mx-auto pt-6">
            <span className="inline-block bg-blue-100 text-[#2563eb] text-xs font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-4">
              Bluom Knowledge Hub
            </span>
            <h1 className="text-4xl md:text-6xl font-black font-outfit tracking-tight text-slate-900 mb-6">
              Health, Longevity & <span className="text-[#2563eb]">Performance</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-inter font-medium leading-relaxed mb-8">
              Evidence-based deep dives into cellular metabolism, hormonal rhythms, hypertrophy, and nervous system health.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative mb-6">
              <input
                type="text"
                placeholder="Search articles (e.g. autophagy, cycle, cortisol)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3.5 pl-12 rounded-2xl bg-white border border-slate-200 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <svg
                className="w-5 h-5 text-slate-400 absolute left-4 top-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Categories Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* ── FEATURED POST ────────────────────────────────────────── */}
          {featuredArticle && !searchQuery && (
            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-900/5 overflow-hidden transition-all hover:shadow-2xl">
              <a href={`/blog/${featuredArticle.slug}`} className="grid lg:grid-cols-12 no-underline text-inherit group">
                <div className="lg:col-span-7 relative h-72 lg:h-[420px] overflow-hidden bg-slate-100">
                  <img
                    src={featuredArticle.featuredImage}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-5 left-5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    Featured Deep Dive
                  </div>
                </div>
                <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mb-4">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                        {featuredArticle.category}
                      </span>
                      <span>•</span>
                      <span>{featuredArticle.time}</span>
                      <span>•</span>
                      <span>{featuredArticle.publishedAt}</span>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-black font-outfit text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-4">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-slate-600 font-inter leading-relaxed line-clamp-3 mb-6">
                      {featuredArticle.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500">By {featuredArticle.author}</span>
                    <span className="text-sm font-extrabold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read full article →
                    </span>
                  </div>
                </div>
              </a>
            </section>
          )}

          {/* ── ARTICLES GRID ────────────────────────────────────────── */}
          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl font-black font-outfit text-slate-900">
                {selectedCategory === 'All' ? 'Latest Articles' : `${selectedCategory} Articles`}
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Showing {filteredArticles.length} article{filteredArticles.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <p className="text-lg font-bold text-slate-700 mb-2">No articles found</p>
                <p className="text-sm text-slate-500">Try a different search term or category filter.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(searchQuery ? filteredArticles : gridArticles).map((post) => (
                  <article
                    key={post.slug}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden flex flex-col group"
                  >
                    <a href={`/blog/${post.slug}`} className="block relative h-52 overflow-hidden bg-slate-100 no-underline">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                        {post.category}
                      </span>
                    </a>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3">
                          <span>{post.time}</span>
                          <span>•</span>
                          <span>{post.publishedAt}</span>
                        </div>
                        <h4 className="text-lg font-bold font-outfit text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3 line-clamp-2">
                          <a href={`/blog/${post.slug}`} className="no-underline text-inherit">
                            {post.title}
                          </a>
                        </h4>
                        <p className="text-sm text-slate-600 font-inter leading-relaxed line-clamp-3 mb-4">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">By {post.author.replace('Bluom ', '')}</span>
                        <a
                          href={`/blog/${post.slug}`}
                          className="text-xs font-extrabold text-blue-600 hover:text-blue-800 no-underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                          Read →
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── APP CTA BANNER ───────────────────────────────────────── */}
          <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-3xl p-10 md:p-14 text-white text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent pointer-events-none" />
            <h3 className="text-3xl md:text-5xl font-black font-outfit mb-4">
              Turn Knowledge Into Action
            </h3>
            <p className="text-base md:text-lg text-blue-100 font-inter max-w-xl mx-auto mb-8">
              Bluom unites AI nutrition scanning, cycle-synced workouts, fasting timers, and somatic wellness routines into one seamless app.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102?l=en-GB"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all no-underline shadow-lg"
              >
                Download for iOS
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.jwfca.bluom"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900/60 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all no-underline shadow-lg"
              >
                Get on Android
              </a>
            </div>
          </section>
        </main>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-slate-100 pt-16 pb-10 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
              <div className="col-span-2">
                <a href="/">
                  <img src={logoSrc} alt="Bluom" className="h-9 w-auto mb-4" />
                </a>
                <p className="text-slate-500 font-inter text-sm font-medium max-w-xs">
                  Precision Living. Power in Bloom. Science-based tools to optimize every system in your body.
                </p>
                <div className="flex gap-3 mt-6">
                  <a
                    href="https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102?l=en-GB"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg no-underline"
                  >
                    App Store
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.jwfca.bluom"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg no-underline"
                  >
                    Google Play
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Content Hub</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="/blog" className="block text-blue-600">All Articles</a>
                  <a href="/blog?cat=Fasting" className="block hover:text-[#2563eb]">Fasting & Autophagy</a>
                  <a href="/blog?cat=Women's+Health" className="block hover:text-[#2563eb]">Women's Health</a>
                  <a href="/blog?cat=Fitness" className="block hover:text-[#2563eb]">Hypertrophy & Training</a>
                  <a href="/blog?cat=Wellness" className="block hover:text-[#2563eb]">Cortisol & Sleep</a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Product</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="/#fuel" className="block hover:text-[#2563eb]">Fuel & AI Scanner</a>
                  <a href="/#move" className="block hover:text-[#2563eb]">Move & Workouts</a>
                  <a href="/#wellness" className="block hover:text-[#2563eb]">Wellness Hub</a>
                  <a href="/#womens" className="block hover:text-[#2563eb]">Cycle & Postpartum</a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-4">Company & Legal</h4>
                <div className="space-y-2.5 text-slate-500 text-sm font-semibold">
                  <a href="/about" className="block hover:text-[#2563eb]">About Us</a>
                  <a href="/support" className="block hover:text-[#2563eb]">Help Center</a>
                  <a href="/legal/privacy" className="block hover:text-[#2563eb]">Privacy Policy</a>
                  <a href="/legal/terms" className="block hover:text-[#2563eb]">Terms of Service</a>
                  <a href="/legal/ai-safety" className="block hover:text-[#2563eb]">AI Safety</a>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.25em]">
                © 2026 Bluom Precision Technology
              </p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.25em]">
                Precision in Living. Power in Bloom.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
