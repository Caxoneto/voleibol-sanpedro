'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { INITIAL_ARTICLES } from '@/lib/data-store';
import { formatMadridDate } from '@/lib/date-utils';
import SponsorBanner from '@/components/SponsorBanner';

function renderInline(text: string): React.ReactNode {
  // Regex para emparejar enlaces [label](url) y negritas **bold**
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const closingBracket = part.indexOf('](');
      const label = part.slice(1, closingBracket);
      const url = part.slice(closingBracket + 2, -1);
      const isExternal = url.startsWith('http');
      return (
        <a
          key={i}
          href={url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          download={url.endsWith('.pdf') ? true : undefined}
          className="text-primary hover:text-white underline font-semibold transition-colors inline-flex items-center gap-1"
        >
          <span>{label}</span>
          {isExternal && (
            <span className="material-symbols-outlined text-[13px] inline-block">open_in_new</span>
          )}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdownBlocks(content: string) {
  const rawBlocks = content.split(/\n\n+/);

  return rawBlocks.map((block, bIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Bloque especial para enlace de acción único
    const singleLinkMatch = trimmed.match(/^\[(.*?)\]\((.*?)\)$/);
    if (singleLinkMatch) {
      const label = singleLinkMatch[1];
      const url = singleLinkMatch[2];
      const isFavb = url.includes('cloudflarestorage') || url.includes('favoley');
      const isPdf = url.endsWith('.pdf');
      const isWhatsApp = url.includes('wa.me');

      if (isFavb) {
        return (
          <div
            key={bIdx}
            className="my-6 p-5 sm:p-6 bg-surface-container-lowest border border-primary-container/40 relative overflow-hidden group shadow-xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary-container/20 text-primary border border-primary-container/30 text-[10px] uppercase font-bold tracking-wider">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Documento Oficial FAVB / RFEVB</span>
                </div>
                <h4 className="text-white font-bold text-base sm:text-lg">
                  Presentación Técnica Oficial de Reglas 2026
                </h4>
                <p className="text-tertiary text-xs max-w-xl">
                  Accede a la circular oficial y diapositivas de la Federación Andaluza de Voleibol en su servidor de descargas (Cloudflare R2 / favoley.net).
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-primary-container hover:bg-secondary-container text-white text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-2 transition-all shadow-md group-hover:scale-105"
              >
                <span>{label}</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>
        );
      }

      if (isPdf) {
        return (
          <div
            key={bIdx}
            className="my-4 p-4 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded bg-red-950/60 border border-red-500/30 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </span>
              <div>
                <h5 className="text-white font-bold text-sm">Copia Archivada en el Club</h5>
                <span className="text-[11px] text-tertiary">Archivo PDF Oficial • Descarga directa local</span>
              </div>
            </div>
            <a
              href={url}
              download
              className="px-4 py-2 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{label}</span>
            </a>
          </div>
        );
      }

      if (isWhatsApp) {
        return (
          <div
            key={bIdx}
            className="my-6 p-5 sm:p-6 bg-surface-container-low border border-[#25D366]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#25D366]/20 text-[#25D366] text-[10px] uppercase font-bold tracking-wider">
                <span className="material-symbols-outlined text-[12px]">chat</span>
                <span>Atención Oficial del Club</span>
              </div>
              <h4 className="text-white font-bold text-base">Reserva tu Décimo de Lotería</h4>
              <p className="text-tertiary text-xs">
                Escríbenos directamente para apartar tus décimos del 15.586 y coordinar la entrega en el Pabellón Sergio Scariolo.
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-2 transition-all shadow-md"
            >
              <span>{label}</span>
              <span className="material-symbols-outlined text-[16px]">send</span>
            </a>
          </div>
        );
      }
    }

    // Encabezado H3
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace('### ', '');
      if (headingText === '15.586') {
        return (
          <div key={bIdx} className="my-6 p-6 bg-surface-container-lowest border-2 border-primary-container text-center relative overflow-hidden">
            <span className="text-xs uppercase font-bold tracking-widest text-primary block mb-1">
              Número Oficial C.D. Voleibol San Pedro
            </span>
            <div className="font-mono text-5xl sm:text-6xl font-black text-white tracking-widest my-2 drop-shadow-[0_2px_12px_rgba(217,4,41,0.3)]">
              15.586
            </div>
            <span className="text-xs text-tertiary">
              22 de diciembre de 2026 • Lotería Nacional de Navidad • 23 €
            </span>
          </div>
        );
      }

      return (
        <h3
          key={bIdx}
          className="font-display-xl text-xl sm:text-2xl uppercase text-white pt-6 pb-2 border-b border-white/10 mt-6 mb-3"
        >
          {headingText}
        </h3>
      );
    }

    // Encabezado H2
    if (trimmed.startsWith('## ')) {
      return (
        <h2
          key={bIdx}
          className="font-display-xl text-2xl sm:text-3xl uppercase text-white pt-6 pb-2 border-b border-white/10 mt-8 mb-4"
        >
          {trimmed.replace('## ', '')}
        </h2>
      );
    }

    // Lista desordenada
    const lines = trimmed.split('\n');
    const isBulletList = lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('• '));
    if (isBulletList) {
      return (
        <ul key={bIdx} className="space-y-2.5 my-4 pl-1">
          {lines.map((line, lIdx) => {
            const clean = line.trim().replace(/^[-•]\s*/, '');
            return (
              <li key={lIdx} className="flex items-start gap-3 text-on-surface-variant text-sm sm:text-base leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0 mt-2.5" />
                <span>{renderInline(clean)}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    // Lista numerada
    const isNumberedList = lines.every((l) => /^\d+\.\s/.test(l.trim()));
    if (isNumberedList) {
      return (
        <ol key={bIdx} className="space-y-3 my-4 pl-1">
          {lines.map((line, lIdx) => {
            const match = line.trim().match(/^(\d+)\.\s*(.*)$/);
            const num = match ? match[1] : lIdx + 1;
            const content = match ? match[2] : line;
            return (
              <li key={lIdx} className="flex items-start gap-3 text-on-surface-variant text-sm sm:text-base leading-relaxed">
                <span className="px-1.5 py-0.5 bg-primary-container/20 text-primary border border-primary-container/40 text-[10px] font-mono font-bold shrink-0 mt-1">
                  {num}
                </span>
                <span>{renderInline(content)}</span>
              </li>
            );
          })}
        </ol>
      );
    }

    // Párrafo general
    return (
      <p key={bIdx} className="text-on-surface-variant text-sm sm:text-base leading-relaxed my-3">
        {renderInline(trimmed)}
      </p>
    );
  });
}

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
        <div className="relative h-[320px] sm:h-[460px] w-full overflow-hidden border border-white/10 mb-8 shadow-2xl bg-[#0c0c0c] flex items-center justify-center">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Content Body */}
        <div className="max-w-none text-on-surface text-sm sm:text-base leading-relaxed space-y-4">
          {renderMarkdownBlocks(article.contentMarkdown)}
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
