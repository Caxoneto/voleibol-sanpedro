'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { INITIAL_ARTICLES, CLUB_INFO } from '@/lib/data-store';
import { formatMadridDate } from '@/lib/date-utils';
import SponsorBanner from '@/components/SponsorBanner';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '@/components/SocialIcons';

function renderInline(text: string): React.ReactNode {
  // Regex para emparejar enlaces [label](url) y negritas **bold**
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-bold">
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

function parseArticleContent(content: string) {
  const rawLines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    // Líneas vacías
    if (!line) {
      i++;
      continue;
    }

    // Tarjeta especial para enlace único de acción
    const singleLinkMatch = line.match(/^\[(.*?)\]\((.*?)\)$/);
    if (singleLinkMatch) {
      const label = singleLinkMatch[1];
      const url = singleLinkMatch[2];
      const isFavb = url.includes('cloudflarestorage') || url.includes('favoley');
      const isPdf = url.endsWith('.pdf');
      const isWhatsApp = url.includes('wa.me');

      if (isFavb) {
        blocks.push(
          <div
            key={`favb-${i}`}
            className="my-8 p-5 sm:p-6 bg-surface-container-low border border-white/10 relative overflow-hidden group shadow-xl"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[10px] uppercase font-bold tracking-widest">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Documento Oficial FAVB / RFEVB</span>
                </div>
                <h4 className="text-white font-bold text-base sm:text-lg font-headline-sm normal-case">
                  Circular Técnica Oficial de Cambios de Reglas 2026
                </h4>
                <p className="text-tertiary text-xs sm:text-sm max-w-xl font-body-sm leading-relaxed">
                  Consulta la presentación original completa de la Federación Andaluza de Voleibol en su servidor oficial de descargas.
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
        i++;
        continue;
      }

      if (isPdf) {
        blocks.push(
          <div
            key={`pdf-${i}`}
            className="my-5 p-4 sm:p-5 bg-surface-container-lowest border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-red-950/60 border border-primary-container/40 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </span>
              <div>
                <h5 className="text-white font-bold text-sm font-headline-sm normal-case">
                  Copia Archivada en el Club
                </h5>
                <span className="text-xs text-tertiary font-body-sm">
                  Archivo PDF Oficial • Descarga directa
                </span>
              </div>
            </div>
            <a
              href={url}
              download
              className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>{label}</span>
            </a>
          </div>
        );
        i++;
        continue;
      }

      if (isWhatsApp) {
        blocks.push(
          <div
            key={`wa-${i}`}
            className="my-8 p-5 sm:p-6 bg-surface-container-low border border-[#25D366]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-lg"
          >
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#25D366]/20 text-[#25D366] text-[10px] uppercase font-bold tracking-widest">
                <span className="material-symbols-outlined text-[12px]">chat</span>
                <span>Atención Oficial del Club</span>
              </div>
              <h4 className="text-white font-bold text-base sm:text-lg font-headline-sm normal-case">
                Reserva de Décimos de Lotería
              </h4>
              <p className="text-tertiary text-xs sm:text-sm font-body-sm leading-relaxed">
                Contacta directamente con los delegados del club para apartar tus décimos del número 15.586 y coordinar su entrega.
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
        i++;
        continue;
      }
    }

    // Número especial conmemorativo de Lotería
    if (line === '### 15.586') {
      blocks.push(
        <div
          key={`lotto-${i}`}
          className="my-8 p-6 bg-surface-container-low border border-white/10 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-3xl pointer-events-none" />
          <span className="font-label-sm text-label-sm uppercase font-bold tracking-widest text-primary block mb-2">
            Número Oficial C.D. Voleibol San Pedro
          </span>
          <div className="font-score-display text-4xl sm:text-6xl text-on-surface tracking-widest my-2 drop-shadow-[0_2px_16px_rgba(217,4,41,0.35)]">
            15.586
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Sorteo Extraordinario de Navidad • 22 de diciembre de 2026 • Precio: 23 €
          </p>
        </div>
      );
      i++;
      continue;
    }

    // Subtítulo H3: únicamente esa línea
    if (line.startsWith('### ')) {
      const headingText = line.replace('### ', '');
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface mt-10 mb-4 pb-2 border-b border-white/10 flex items-center gap-3 normal-case tracking-normal"
        >
          <span className="w-2 h-2 bg-primary-container inline-block shrink-0" />
          <span>{renderInline(headingText)}</span>
        </h3>
      );
      i++;
      continue;
    }

    // Subtítulo H2: únicamente esa línea
    if (line.startsWith('## ')) {
      const headingText = line.replace('## ', '');
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="font-headline-md text-xl sm:text-2xl font-bold text-white mt-12 mb-4 uppercase tracking-wide border-b border-white/15 pb-2"
        >
          <span>{renderInline(headingText)}</span>
        </h2>
      );
      i++;
      continue;
    }

    // Lista desordenada con viñetas: agrupar líneas consecutivas con - o •
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const listItems: string[] = [];
      while (
        i < rawLines.length &&
        (rawLines[i].trim().startsWith('- ') || rawLines[i].trim().startsWith('• '))
      ) {
        listItems.push(rawLines[i].trim().replace(/^[-•]\s*/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-5 space-y-3 pl-2 font-body-md text-sm sm:text-base text-on-surface">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-3 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0 mt-2.5" />
              <span className="text-[#e5e2e1] leading-relaxed font-normal">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Lista numerada: agrupar líneas consecutivas que empiezan con número
    if (/^\d+\.\s/.test(line)) {
      const numItems: { num: string; text: string }[] = [];
      while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i].trim())) {
        const itemLine = rawLines[i].trim();
        const match = itemLine.match(/^(\d+)\.\s*(.*)$/);
        numItems.push({
          num: match ? match[1] : `${numItems.length + 1}`,
          text: match ? match[2] : itemLine,
        });
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-5 space-y-3.5 pl-2 font-body-md text-sm sm:text-base text-on-surface">
          {numItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-3 leading-relaxed">
              <span className="w-6 h-6 bg-surface-container-high border border-white/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.num}
              </span>
              <span className="text-[#e5e2e1] leading-relaxed font-normal">{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Párrafo ordinario: agrupar líneas continuas de texto
    const paragraphLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('## ') &&
      !rawLines[i].trim().startsWith('### ') &&
      !rawLines[i].trim().startsWith('- ') &&
      !rawLines[i].trim().startsWith('• ') &&
      !/^\d+\.\s/.test(rawLines[i].trim()) &&
      !rawLines[i].trim().match(/^\[(.*?)\]\((.*?)\)$/)
    ) {
      paragraphLines.push(rawLines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      const paragraphText = paragraphLines.join(' ');
      blocks.push(
        <p
          key={`p-${i}`}
          className="font-body-md text-sm sm:text-base text-[#e5e2e1] leading-relaxed my-4 font-normal normal-case"
        >
          {renderInline(paragraphText)}
        </p>
      );
    }
  }

  return blocks;
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
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://cdvoleibolsanpedro.es/noticias/${article.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
        <div className="mb-8">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wider text-primary hover:text-white transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Volver a Noticias y Sala de Prensa</span>
          </Link>

          <div className="flex items-center gap-3 text-on-surface-variant mb-3 font-body-sm text-body-sm">
            <span className="px-2.5 py-0.5 bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-wider">
              {article.categoryName}
            </span>
            <span>•</span>
            <span>
              {formatMadridDate(article.publishedAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              {article.readingTimeMinutes} min de lectura
            </span>
          </div>

          <h1 className="font-headline-lg text-2xl sm:text-3xl lg:text-[38px] uppercase text-on-surface tracking-tight leading-[1.14] mb-5">
            {article.title}
          </h1>

          <p className="font-body-lg text-body-lg text-on-surface-variant font-normal leading-relaxed border-l-2 border-primary-container pl-4 py-1.5">
            {article.excerpt}
          </p>
        </div>

        {/* Cover Image */}
        <div className="relative h-[320px] sm:h-[460px] w-full overflow-hidden border border-white/10 mb-10 shadow-2xl bg-surface-container-lowest flex items-center justify-center">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Content Body */}
        <div className="max-w-none text-on-surface leading-relaxed">
          {parseArticleContent(article.contentMarkdown)}
        </div>

        {/* Galería de Fotos si existe */}
        {article.galleryUrls && article.galleryUrls.length > 0 && (
          <div className="mt-14 pt-8 border-t border-white/10">
            <h3 className="font-headline-sm text-headline-sm uppercase text-on-surface mb-4">
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
            <p className="font-body-sm text-[11px] text-tertiary mt-2">
              Fotografía oficial C.D. Voleibol San Pedro • Cobertura en directo con hashtag #VoleibolSanPedro
            </p>
          </div>
        )}

        {/* Social Share Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low p-4 border border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">share</span>
            <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface tracking-wider">
              Difundir y seguir al club:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${article.title} - ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#25D366] text-black font-label-md text-label-md uppercase font-bold flex items-center gap-1.5 transition-transform hover:scale-105 shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <a
              href={CLUB_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-label-md text-label-md uppercase font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <InstagramIcon className="w-4 h-4 text-white" />
              <span>Instagram</span>
            </a>

            <a
              href={CLUB_INFO.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-label-md text-label-md uppercase font-bold flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <FacebookIcon className="w-4 h-4 text-white" />
              <span>Facebook</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md uppercase flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <span className="material-symbols-outlined text-[14px]">link</span>
              <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        {/* Related Articles */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <h3 className="font-headline-sm text-headline-sm uppercase text-on-surface mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary-container inline-block" />
            <span>Otras Noticias y Crónicas</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                href={`/noticias/${rel.slug}`}
                className="group bg-surface-container-low border border-white/5 hover:border-primary-container p-4 flex gap-4 transition-all block"
              >
                <div className="relative w-24 h-24 shrink-0 overflow-hidden bg-surface-container-lowest">
                  <Image
                    src={rel.coverImageUrl}
                    alt={rel.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <span className="font-label-sm text-label-sm text-primary uppercase font-bold">
                    {rel.categoryName}
                  </span>
                  <h4 className="font-headline-sm text-sm uppercase text-on-surface font-bold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {rel.title}
                  </h4>
                  <span className="font-body-sm text-xs text-on-surface-variant">
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
