import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${style.gradient1} 0%, ${style.gradient2} 50%, #0c0a1a 100%)`,
          }}
        />

        {/* Decorative grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Accent glow orb — top right */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${style.accent}22 0%, transparent 70%)`,
          }}
        />

        {/* Accent glow orb — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${style.accent}15 0%, transparent 70%)`,
          }}
        />

        {/* Top row: Logo + badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${style.accent}, ${style.accent}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              G
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                TheOneWayGDA
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>
                AI Intelligence Platform
              </div>
            </div>
          </div>

          {/* Type badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '100px',
              background: `${style.accent}18`,
              border: `1px solid ${style.accent}40`,
            }}
          >
            <div style={{ fontSize: '14px' }}>{style.icon}</div>
            <div style={{ fontSize: '13px', color: style.accent, fontWeight: 500 }}>
              {style.label}
            </div>
          </div>
        </div>

        {/* Center: Title & Description */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              margin: '0 0 12px 0',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.5,
              maxWidth: '700px',
            }}
          >
            {description}
          </div>
        </div>

        {/* Bottom row: Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Decorative accent line */}
          <div
            style={{
              height: '3px',
              width: '80px',
              borderRadius: '2px',
              background: `linear-gradient(90deg, ${style.accent}, transparent)`,
            }}
          />

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '32px' }}>
            {[
              { value: '200+', label: 'AI Models' },
              { value: '50K+', label: 'Evaluations' },
              { value: '10K+', label: 'Community' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
