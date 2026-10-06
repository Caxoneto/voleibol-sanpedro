'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { INITIAL_ARTICLES } from '@/lib/data-store';
import { formatMadridDate } from '@/lib/date-utils';
import SponsorBanner from '@/components/SponsorBanner';

interface ArticleDetailProps {
  params: {
    slug: string;
  };
}

export default function ArticleDetailPage({ params }: ArticleDetailProps) {
  const [copied, setCopied] = useState(false);
  const article = INITIAL_ARTICLES.find((a) => a.slug === params.slug);

  if (!article) {
    return notFound();
  }

  const relatedArticles = INITIAL_ARTICLES.filter((a) => a.id !== article.id).slice(0, 2);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://cdvoleibolsanpedro.es/noticias/${article.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
        <div className="mb-6">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-white transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Volver a Noticias y Sala de Prensa</span>
          </Link>

          <div className="flex items-center gap-3 text-xs text-tertiary mb-3">
            <span className="px-2.5 py-0.5 bg-primary-container text-white text-[10px] uppercase font-bold tracking-wider">
              {article.categoryName}
            </span>
            <span>•</span>
            <span>{formatMadridDate(article.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>•</span>
            <span>{article.readingTimeMinutes} min de lectura</span>
          </div>

          <h1 className="font-display-xl text-3xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-[1.05]">
            {article.title}
          </h1>

          <p className="font-body-lg text-base sm:text-lg text-on-surface-variant font-medium mt-4 leading-relaxed">
            {article.excerpt}
          </p>
        </div>

        {/* Cover Image */}
        <div className="relative h-[320px] sm:h-[460px] w-full overflow-hidden border border-white/10 mb-8 shadow-2xl">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none text-on-surface text-sm sm:text-base leading-relaxed space-y-6">
          {article.contentMarkdown.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3
                  key={idx}
                  className="font-display-xl text-2xl uppercase text-white pt-4 pb-1 border-b border-white/10"
                >
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            return (
              <p key={idx} className="text-tertiary-fixed leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Galería de Fotos si existe */}
        {article.galleryUrls && article.galleryUrls.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="font-display-xl text-2xl uppercase text-white mb-4">
              Galería Fotográfica del Partido
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {article.galleryUrls.map((url, i) => (
                <div key={i} className="relative h-48 border border-white/10 overflow-hidden">
                  <Image
                    src={url}
                    alt={`Foto ${i + 1} de la crónica`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-tertiary mt-2">
              Fotografía oficial C.D. Voleibol San Pedro • Cobertura en directo con hashtag #VoleibolSanPedro
            </p>
          </div>
        )}

        {/* Social Share Bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">share</span>
            <span className="text-xs uppercase font-bold text-white tracking-wider">
              Compartir esta crónica:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${article.title} - ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#25D366] text-black text-xs font-bold uppercase flex items-center gap-1.5"
            >
              WhatsApp
            </a>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-black border border-white/20 text-white text-xs font-bold uppercase flex items-center gap-1.5"
            >
              X / Twitter
            </a>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">link</span>
              <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        {/* Related Articles */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <h3 className="font-display-xl text-2xl uppercase text-white mb-6">
            Otras Crónicas y Noticias
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/noticias/${rel.slug}`}
                className="group bg-surface-container-low border border-white/5 p-4 flex gap-4 hover:border-primary-container transition-all"
              >
                <div className="relative w-24 h-24 shrink-0 overflow-hidden">
                  <Image
                    src={rel.coverImageUrl}
                    alt={rel.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <span className="text-[10px] text-primary uppercase font-bold">
                    {rel.categoryName}
                  </span>
                  <h4 className="font-headline-sm text-sm uppercase text-white font-bold line-clamp-2 group-hover:text-primary transition-colors">
                    {rel.title}
                  </h4>
                  <span className="text-[10px] text-tertiary">
                    {formatMadridDate(rel.publishedAt, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </article>

      <SponsorBanner />
    </div>
  );
}
