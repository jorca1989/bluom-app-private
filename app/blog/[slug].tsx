import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Asset } from 'expo-asset';
import { DEFAULT_BLOG_ARTICLES, BlogArticle } from '@/constants/defaultArticles';

function renderMarkdownInline(text: string): React.ReactNode {
  const tokenRegex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(tokenRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (match) {
            const isExternal = match[2].startsWith('http');
            return (
              <a
                key={i}
                href={match[2]}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-[#2563eb] font-semibold underline hover:text-blue-800 transition-colors"
              >
                {match[1]}
              </a>
            );
          }
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={i} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return <em key={i} className="italic text-slate-800">{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

export default function BlogArticlePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const logoModule = require('../../assets/images/logo.png');
  const logoSrc = Asset.fromModule(logoModule).uri;

  const currentSlug = typeof slug === 'string' ? slug : '';

  // 1. Fetch from Convex by slug
  const dbArticle = useQuery(api.admin.getArticleBySlug, currentSlug ? { slug: currentSlug } : 'skip');
  const allDbArticles = useQuery(api.admin.getPublishedArticles, {});

  // 2. Fallback to static default articles
  const staticMatch = useMemo(() => {
    return DEFAULT_BLOG_ARTICLES.find(
      (a) => a.slug === currentSlug || a._id === currentSlug
    );
  }, [currentSlug]);

  const [selectedLang, setSelectedLang] = useState<'en' | 'pt' | 'es' | 'fr' | 'de' | 'nl'>('en');
  const [copied, setCopied] = useState(false);

  // Active article data
  const article: BlogArticle | null = useMemo(() => {
    if (dbArticle) {
      return {
        _id: dbArticle._id,
        slug: dbArticle.slug || dbArticle._id,
        title: dbArticle.title,
        category: dbArticle.category || 'Health',
        emoji: '📖',
        time: `${Math.max(3, Math.ceil((dbArticle.content?.length || 500) / 700))} min read`,
        featuredImage:
          dbArticle.featuredImage ||
          'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
        excerpt:
          dbArticle.content
            ?.replace(/^#+\s+/gm, '')
            ?.replace(/\*\*/g, '')
            ?.slice(0, 160) + '...' ||
          'Evidence-based health protocol on Bluom.',
        content: dbArticle.content || '',
        author: 'Bluom Health Research Team',
        publishedAt: new Date(dbArticle.createdAt || Date.now()).toISOString().slice(0, 10),
        tags: dbArticle.tags || [dbArticle.category || 'Health'],
        titlePt: dbArticle.titlePt,
        contentPt: dbArticle.contentPt,
        titleEs: dbArticle.titleEs,
        contentEs: dbArticle.contentEs,
        titleFr: dbArticle.titleFr,
        contentFr: dbArticle.contentFr,
        titleDe: dbArticle.titleDe,
        contentDe: dbArticle.contentDe,
        titleNl: dbArticle.titleNl,
        contentNl: dbArticle.contentNl,
      };
    }
    return staticMatch || null;
  }, [dbArticle, staticMatch]);

  // Related articles (pick 3 from other categories or list)
  const relatedArticles = useMemo(() => {
    const combined = [...(allDbArticles || []), ...DEFAULT_BLOG_ARTICLES];
    const filtered = combined.filter((a) => a.slug !== currentSlug);
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of filtered) {
      const s = item.slug || item._id;
      if (!seen.has(s)) {
        seen.add(s);
        unique.push(item);
      }
    }
    return unique.slice(0, 3);
  }, [allDbArticles, currentSlug]);

  const activeTitle = useMemo(() => {
    if (!article) return '';
    if (selectedLang === 'pt' && article.titlePt) return article.titlePt;
    if (selectedLang === 'es' && article.titleEs) return article.titleEs;
    if (selectedLang === 'fr' && article.titleFr) return article.titleFr;
    if (selectedLang === 'de' && article.titleDe) return article.titleDe;
    if (selectedLang === 'nl' && article.titleNl) return article.titleNl;
    return article.title;
  }, [article, selectedLang]);

  const activeContent = useMemo(() => {
    if (!article) return '';
    if (selectedLang === 'pt' && article.contentPt) return article.contentPt;
    if (selectedLang === 'es' && article.contentEs) return article.contentEs;
    if (selectedLang === 'fr' && article.contentFr) return article.contentFr;
    if (selectedLang === 'de' && article.contentDe) return article.contentDe;
    if (selectedLang === 'nl' && article.contentNl) return article.contentNl;
    return article.content;
  }, [article, selectedLang]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (dbArticle === undefined && !staticMatch) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex items-center justify-center p-6 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-64 mx-auto" />
          <div className="h-4 bg-slate-200 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-black font-outfit text-slate-900 mb-4">Article Not Found</h1>
        <p className="text-slate-600 mb-6">The article you are looking for does not exist or has been moved.</p>
        <a
          href="/blog"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all no-underline"
        >
          ← Back to Blog Hub
        </a>
      </div>
    );
  }

  // JSON-LD Article Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.bluom.app/blog/${article.slug}`,
    },
    headline: article.title,
    description: article.excerpt,
    image: [article.featuredImage],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.author,
      url: 'https://www.bluom.app',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Bluom',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.bluom.app/logo.png',
      },
    },
    keywords: article.tags?.join(', '),
  };

  return (
    <>
      <Head>
        <title>{`${activeTitle} | Bluom Blog`}</title>
        <meta name="description" content={article.excerpt} />
        <meta name="keywords" content={article.tags?.join(', ')} />
        <link rel="canonical" href={`https://www.bluom.app/blog/${article.slug}`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.bluom.app/blog/${article.slug}`} />
        <meta property="og:title" content={`${activeTitle} | Bluom`} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:image" content={article.featuredImage} />
        <meta property="article:published_time" content={article.publishedAt} />
        <meta property="article:section" content={article.category} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`https://www.bluom.app/blog/${article.slug}`} />
        <meta name="twitter:title" content={`${activeTitle} | Bluom`} />
        <meta name="twitter:description" content={article.excerpt} />
        <meta name="twitter:image" content={article.featuredImage} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
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
          .font-article { font-family: 'Newsreader', Georgia, serif; font-size: 1.15rem; line-height: 1.85; }
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
              <a href="/blog" className="text-[#2563eb] font-extrabold">Blog</a>
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

        {/* ── ARTICLE CONTAINER ──────────────────────────────────────── */}
        <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-8 overflow-x-auto whitespace-nowrap">
            <a href="/" className="hover:text-slate-700 transition-colors no-underline text-inherit">Home</a>
            <span>/</span>
            <a href="/blog" className="hover:text-slate-700 transition-colors no-underline text-inherit">Blog</a>
            <span>/</span>
            <span className="text-blue-600">{article.category}</span>
          </nav>

          {/* Article Header */}
          <header className="space-y-6 mb-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                {article.category}
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500">{article.time}</span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500">Published {article.publishedAt}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-outfit text-slate-900 leading-[1.15]">
              {activeTitle}
            </h1>

            <p className="text-lg md:text-xl text-slate-600 font-inter font-medium leading-relaxed">
              {article.excerpt}
            </p>

            {/* Author bar & Language switch */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  BL
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 m-0">{article.author}</p>
                  <p className="text-xs text-slate-400 m-0">Medical & Athletic Review Board</p>
                </div>
              </div>

              {/* Multilingual Selector (if translations exist) */}
              {(article.titlePt || article.titleEs || article.titleFr || article.titleDe || article.titleNl) && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['en', 'pt', 'es', 'fr', 'de', 'nl'] as const).map((lang) => {
                    const hasLang = lang === 'en' || (article as any)[`title${lang.charAt(0).toUpperCase() + lang.slice(1)}`];
                    if (!hasLang) return null;
                    return (
                      <button
                        key={lang}
                        onClick={() => setSelectedLang(lang)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                          selectedLang === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </header>

          {/* Featured Image */}
          <div className="rounded-3xl overflow-hidden shadow-xl mb-12 bg-slate-100 max-h-[460px]">
            <img
              src={article.featuredImage}
              alt={activeTitle}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Body Content */}
          <article className="prose prose-slate max-w-none space-y-6 text-slate-800 font-article leading-relaxed">
            {activeContent.split('\n\n').map((block, idx) => {
              const trimmed = block.trim();

              // Heading 2
              if (trimmed.startsWith('## ')) {
                return (
                  <h2
                    key={idx}
                    className="text-2xl sm:text-3xl font-black font-outfit text-slate-900 pt-6 pb-2 border-b border-slate-100"
                  >
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }

              // Heading 3
              if (trimmed.startsWith('### ')) {
                return (
                  <h3
                    key={idx}
                    className="text-xl sm:text-2xl font-bold font-outfit text-slate-900 pt-4 pb-1"
                  >
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }

              // Divider
              if (trimmed === '---') {
                return <hr key={idx} className="my-8 border-slate-200" />;
              }

              // Blockquote
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="border-l-4 border-blue-500 pl-4 py-1 my-4 bg-blue-50/50 rounded-r-xl italic text-slate-700">
                    <p className="font-inter text-base leading-relaxed m-0">
                      {renderMarkdownInline(trimmed.replace(/^>\s*/, ''))}
                    </p>
                  </blockquote>
                );
              }

              // Bullet List
              if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
                const items = trimmed.split('\n');
                return (
                  <ul key={idx} className="space-y-3 pl-2 my-4 list-none">
                    {items.map((it, i) => {
                      const clean = it.replace(/^[•-]\s*/, '');
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-blue-600 font-bold mt-1">•</span>
                          <span className="text-slate-700 leading-relaxed font-inter text-base flex-1">
                            {renderMarkdownInline(clean)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Numbered List
              if (/^\d+\.\s+/.test(trimmed)) {
                const items = trimmed.split('\n');
                return (
                  <ol key={idx} className="space-y-3 pl-2 my-4 list-none">
                    {items.map((it, i) => {
                      const numMatch = it.match(/^(\d+)\.\s*(.*)/);
                      if (!numMatch) return null;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className="bg-blue-100 text-blue-700 font-extrabold text-xs px-2 py-0.5 rounded-full mt-1">
                            {numMatch[1]}
                          </span>
                          <span className="text-slate-700 leading-relaxed font-inter text-base flex-1">
                            {renderMarkdownInline(numMatch[2])}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                );
              }

              // Inline Image
              const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
              if (imgMatch) {
                return (
                  <figure key={idx} className="my-8 rounded-2xl overflow-hidden shadow-lg">
                    <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto" />
                    {imgMatch[1] && (
                      <figcaption className="text-xs text-center text-slate-500 py-2 bg-slate-50">
                        {imgMatch[1]}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              // Standard Paragraph
              return (
                <p key={idx} className="text-slate-700 font-inter text-base sm:text-lg leading-relaxed">
                  {renderMarkdownInline(trimmed)}
                </p>
              );
            })}
          </article>

          {/* Social Share & Tags */}
          <div className="mt-14 pt-8 border-t border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Tags:</span>
                {article.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Share */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? '✓ Copied URL' : '🔗 Share Article'}
                </button>
              </div>
            </div>

            {/* Medical Disclaimer */}
            <div className="bg-slate-100 rounded-2xl p-5 text-slate-500 text-xs leading-relaxed flex items-start gap-3">
              <span className="text-lg">ℹ️</span>
              <p className="m-0">
                <strong>Medical Disclaimer:</strong> This article is published for educational and informational purposes only. It is not intended as medical advice or as a substitute for professional clinical diagnosis or treatment. Always seek the advice of your physician before undertaking any new fasting regimen, hormonal protocol, or intense exercise program.
              </p>
            </div>
          </div>

          {/* ── IN-ARTICLE APP CONVERSION CARD ───────────────────────── */}
          <div className="my-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <span className="bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-4 border border-blue-400/30">
                Try Bluom Today
              </span>
              <h3 className="text-2xl sm:text-4xl font-black font-outfit mb-4">
                Track your biology in real-time.
              </h3>
              <p className="text-slate-300 font-inter text-sm sm:text-base leading-relaxed mb-6">
                Put these scientific principles into practice with our AI photo meal scanner, cycle-aware fitness plans, and hormonal wellness tracker.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://apps.apple.com/pt/app/bluom-nutrition-fitness-ai/id6759072102?l=en-GB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all no-underline shadow-md"
                >
                  Download for iOS
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.jwfca.bluom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl text-xs font-bold transition-all no-underline"
                >
                  Get on Android
                </a>
              </div>
            </div>
          </div>

          {/* ── RELATED ARTICLES ─────────────────────────────────────── */}
          {relatedArticles.length > 0 && (
            <section className="space-y-6">
              <h3 className="text-2xl font-black font-outfit text-slate-900">
                Related Health & Science Reads
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedArticles.map((rel) => {
                  const s = rel.slug || rel._id;
                  return (
                    <a
                      key={s}
                      href={`/blog/${s}`}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-lg transition-all no-underline text-inherit group flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {rel.category}
                        </span>
                        <h4 className="text-base font-bold font-outfit text-slate-900 group-hover:text-blue-600 transition-colors mt-2 mb-2 line-clamp-2">
                          {rel.title}
                        </h4>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Read →
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
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
