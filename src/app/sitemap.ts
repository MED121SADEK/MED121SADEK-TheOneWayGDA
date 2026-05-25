import { MetadataRoute } from 'next'
import { db as prisma } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://theonewaygda.com'

  // Static pages with proper SEO priorities and change frequencies
  const staticPages: Array<{ path: string; priority: number; changeFreq: "daily" | "weekly" | "monthly" | "yearly" }> = [
    // Core pages (highest priority)
    { path: '', priority: 1.0, changeFreq: 'daily' },
    { path: '/leaderboard', priority: 0.95, changeFreq: 'daily' },       // Models update frequently
    { path: '/community', priority: 0.9, changeFreq: 'daily' },          // New posts daily
    { path: '/workspace', priority: 0.85, changeFreq: 'weekly' },
    { path: '/ai', priority: 0.8, changeFreq: 'weekly' },

    // Secondary pages
    { path: '/about', priority: 0.6, changeFreq: 'monthly' },
    { path: '/company', priority: 0.5, changeFreq: 'monthly' },
    { path: '/tutorials', priority: 0.75, changeFreq: 'weekly' },
    { path: '/updates', priority: 0.7, changeFreq: 'weekly' },
    { path: '/modules', priority: 0.65, changeFreq: 'monthly' },
    { path: '/directory', priority: 0.5, changeFreq: 'monthly' },

    // AI Platform sub-pages
    { path: '/ai/sdk', priority: 0.55, changeFreq: 'monthly' },
    { path: '/ai/extensions', priority: 0.55, changeFreq: 'monthly' },
    { path: '/ai/workflows', priority: 0.6, changeFreq: 'weekly' },
    { path: '/ai/templates', priority: 0.55, changeFreq: 'monthly' },
    { path: '/ai/governance', priority: 0.4, changeFreq: 'yearly' },

    // Legal & info (lowest priority)
    { path: '/privacy', priority: 0.3, changeFreq: 'yearly' },
    { path: '/terms', priority: 0.3, changeFreq: 'yearly' },
    { path: '/security', priority: 0.3, changeFreq: 'yearly' },

    // Auth pages (low priority, but still indexable)
    { path: '/auth/login', priority: 0.4, changeFreq: 'yearly' },
    { path: '/auth/register', priority: 0.4, changeFreq: 'yearly' },
    { path: '/workflow/new', priority: 0.6, changeFreq: 'monthly' },
  ]

  // Build static sitemap entries
  const staticEntries = staticPages.map(({ path, priority, changeFreq }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: changeFreq as "daily" | "weekly" | "monthly" | "yearly",
    priority,
  }))

  // Dynamically fetch community posts for sitemap
  let communityEntries: MetadataRoute.Sitemap = []
  try {
    const posts = await prisma.communityPost.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      take: 50, // Top 50 featured posts
      select: { id: true, createdAt: true },
    })
    communityEntries = posts.map((post) => ({
      url: `${baseUrl}/community/${post.id}`,
      lastModified: post.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7, // High priority for featured posts
    }))
  } catch {
    // If DB fails, skip dynamic entries
  }

  return [...staticEntries, ...communityEntries]
}
