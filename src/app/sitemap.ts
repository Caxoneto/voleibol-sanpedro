import type { MetadataRoute } from 'next';
import { INITIAL_ARTICLES } from '@/lib/public-content';

function getCanonicalSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // Fallback al dominio oficial si la variable tiene formato inválido
    }
  }
  return 'https://voleibolsanpedro.es';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalSiteUrl();
  const staticLastModified = new Date('2026-11-16T00:00:00.000Z');

  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: staticLastModified,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/partidos`,
      lastModified: staticLastModified,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calendario`,
      lastModified: staticLastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/clasificacion`,
      lastModified: staticLastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/plantillas`,
      lastModified: staticLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/noticias`,
      lastModified: staticLastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/patrocinio`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/proteccion-menor`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/fan-zone`,
      lastModified: staticLastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/aviso-legal`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/accesibilidad`,
      lastModified: staticLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = INITIAL_ARTICLES.map((art) => ({
    url: `${baseUrl}/noticias/${art.slug}`,
    lastModified: new Date(art.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...publicRoutes, ...articleRoutes];
}
