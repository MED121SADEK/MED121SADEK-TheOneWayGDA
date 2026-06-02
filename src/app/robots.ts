import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow major search engines full access
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider', 'YandexBot'],
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/reset-password',
          '/dashboard/',
          '/teams/',
          '/developers/',
          '/billing/',
          '/notifications/',
          '/settings/',
          '/workspace/',
          '/workflow/',
        ],
      },
      // Block AI scrapers
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Bytespider',
        disallow: '/',
      },
    ],
    sitemap: 'https://theonewaygda.com/sitemap.xml',
    host: 'https://theonewaygda.com',
  }
}
