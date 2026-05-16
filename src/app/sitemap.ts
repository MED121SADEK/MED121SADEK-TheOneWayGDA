import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://theonewaygda.com'

  const staticPages = [
    '', '/about', '/community', '/company', '/directory', '/leaderboard',
    '/modules', '/privacy', '/security', '/terms', '/tutorials', '/updates',
    '/ai', '/ai/sdk', '/ai/extensions', '/ai/workflows', '/ai/templates', '/ai/governance',
    '/auth/login', '/auth/register', '/auth/forgot-password',
    '/workspace', '/workflow/new',
  ]

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : path === '/leaderboard' ? 0.9 : 0.7,
  }))
}
