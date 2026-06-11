import { NextRequest } from 'next/server'

// Type-specific styling
const TYPE_STYLES: Record<string, {
  gradient1: string
  gradient2: string
  accent: string
  label: string
  icon: string
}> = {
  home: {
    gradient1: '#0f172a',
    gradient2: '#1e1b4b',
    accent: '#38bdf8',
    label: 'AI Model Comparison & Leaderboard',
    icon: '◆',
  },
  leaderboard: {
    gradient1: '#052e16',
    gradient2: '#0f172a',
    accent: '#34d399',
    label: 'Model Leaderboard',
    icon: '🏆',
  },
  community: {
    gradient1: '#1c1917',
    gradient2: '#0f172a',
    accent: '#fb923c',
    label: 'Community Hub',
    icon: '⚡',
  },
  workspace: {
    gradient1: '#1e1b4b',
    gradient2: '#0f172a',
    accent: '#c084fc',
    label: 'AI Workspace',
    icon: '✦',
  },
}

export const runtime = 'edge'
export const alt = 'TheOneWayGDA - AI Model Comparison Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const type = searchParams.get('type') || 'home'
  const title = searchParams.get('title') || 'TheOneWayGDA'
  const description = searchParams.get('description') || 'Compare AI models, explore leaderboards, and collaborate with the community.'

  const style = TYPE_STYLES[type] || TYPE_STYLES.home

  const svg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${style.gradient1}"/>
        <stop offset="50%" style="stop-color:${style.gradient2}"/>
        <stop offset="100%" style="stop-color:#0c0a1a"/>
      </linearGradient>
      <radialGradient id="glow1" cx="80%" cy="10%" r="35%">
        <stop offset="0%" style="stop-color:${style.accent};stop-opacity:0.15"/>
        <stop offset="100%" style="stop-color:transparent"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow1)"/>
    <text x="56" y="60" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="white">TheOneWayGDA</text>
    <text x="56" y="78" font-family="system-ui,sans-serif" font-size="12" fill="rgba(255,255,255,0.5)">AI Intelligence Platform</text>
    <text x="56" y="340" font-family="system-ui,sans-serif" font-size="52" font-weight="800" fill="white">${title}</text>
    <text x="56" y="375" font-family="system-ui,sans-serif" font-size="20" fill="rgba(255,255,255,0.6)">${description}</text>
    <rect x="56" y="590" width="80" height="3" rx="2" fill="url(#accentLine)"/>
    <defs><linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${style.accent}"/>
      <stop offset="100%" style="stop-color:transparent"/>
    </linearGradient></defs>
    <text x="${size.width - 200}" y="600" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" text-anchor="end">200+ AI Models</text>
    <text x="${size.width - 80}" y="600" font-family="system-ui,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" text-anchor="end">50K+ Evaluations</text>
  </svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
