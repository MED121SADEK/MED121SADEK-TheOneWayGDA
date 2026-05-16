'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { PanelWindow, type PanelWindowProps } from './PanelWindow'
import { Home } from 'lucide-react'

export interface PanelDefinition {
  id: string
  title: string
  icon: PanelWindowProps['icon'] // LucideIcon
  accentColor?: string
  accentBg?: string
  badge?: number
  content: ReactNode
}

interface SearchHub360Props {
  panels: PanelDefinition[]
  brandName?: string
  logoSrc?: string
  className?: string
}

/**
 * SearchHub360 — a professional sidebar + main panel workspace layout.
 *
 * Layout strategy:
 *  - Desktop (≥768px): Left sidebar (56px) with icon buttons + main content area.
 *    One panel visible at a time with smooth fade transitions.
 *  - Mobile (<768px): Bottom tab bar with icons + full-screen main content area.
 *
 * Zero-overlap guarantee:
 *  - Only one panel rendered in the main area at a time.
 *  - Each panel uses `contain: layout style paint` for isolation.
 *  - Clean flexbox layout — no absolute positioning or 3D transforms.
 */
export function SearchHub360({
  panels,
  brandName = 'TheOneWayGDA',
  logoSrc = '/images/logo.png',
  className,
}: SearchHub360Props) {
  const [activePanel, setActivePanel] = useState(0)
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  // Detect viewport for responsive layout
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  // Switch panel with animation reset
  const switchPanel = useCallback((index: number) => {
    if (index !== activePanel) {
      setAnimKey((prev) => prev + 1)
      setActivePanel(index)
    }
  }, [activePanel])

  // ── MOBILE (<768px): Bottom tab bar ──
  if (isMobile) {
    const panel = panels[activePanel]
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Main content area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Animated background effects */}
          <WorkspaceBackground />

          {/* Active panel */}
          <div
            key={`mobile-${panel.id}-${animKey}`}
            className="animate-panel-enter h-full p-2 relative z-10"
          >
            <PanelWindow
              panelId={panel.id}
              title={panel.title}
              icon={panel.icon}
              accentColor={panel.accentColor}
              accentBg={panel.accentBg}
              isFocused
              isExpanded={false}
              badge={panel.badge}
              className="relative"
            >
              {panel.content}
            </PanelWindow>
          </div>
        </div>

        {/* Bottom tab bar */}
        <nav className="flex-shrink-0 border-t border-border/50 bg-card/90 backdrop-blur-md z-50">
          <div className="flex items-center justify-around px-1 py-1.5">
            {panels.map((p, i) => {
              const isActive = i === activePanel
              return (
                <button
                  key={p.id}
                  onClick={() => switchPanel(i)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-all min-w-[44px]',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                      isActive && 'bg-primary/15',
                    )}
                  >
                    <p.icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                  </div>
                  <span className="text-[9px] font-medium leading-tight truncate max-w-[48px]">
                    {p.title}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                  )}
                  {p.badge != null && p.badge > 0 && (
                    <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 rounded-full bg-destructive text-[8px] font-bold flex items-center justify-center text-white">
                      {p.badge > 9 ? '9+' : p.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    )
  }

  // ── DESKTOP (≥768px): Left sidebar + main content ──
  const panel = panels[activePanel]
  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* ── Left Sidebar (Activity Bar) ── */}
      <aside className="flex-shrink-0 w-14 bg-card/90 backdrop-blur-md border-r border-border/50 flex flex-col items-center z-50 relative">
        {/* Logo at top */}
        <div className="flex items-center justify-center w-14 h-12 border-b border-border/30 flex-shrink-0">
          <Image
            src={logoSrc}
            alt={brandName}
            width={24}
            height={24}
            className="rounded"
          />
        </div>

        {/* Panel icon buttons */}
        <div className="flex-1 flex flex-col items-center py-2 gap-0.5 overflow-y-auto scrollbar-none">
          {panels.map((p, i) => {
            const isActive = i === activePanel
            return (
              <div key={p.id} className="relative">
                <button
                  onClick={() => switchPanel(i)}
                  onMouseEnter={() => setHoveredIcon(i)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  aria-label={p.title}
                >
                  {/* Active indicator: left border accent */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary"
                      style={{
                        backgroundColor: p.accentColor?.replace('text-', '')
                          ? undefined
                          : undefined,
                      }}
                    />
                  )}
                  <p.icon className={cn('w-[18px] h-[18px]', isActive && 'text-primary')} />

                  {/* Badge dot */}
                  {p.badge != null && p.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-card" />
                  )}
                </button>

                {/* Tooltip */}
                {hoveredIcon === i && (
                  <div className="sidebar-tooltip">{p.title}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Home button at bottom */}
        <div className="flex items-center justify-center w-14 h-12 border-t border-border/30 flex-shrink-0">
          <button
            onClick={() => switchPanel(0)}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-hidden relative">
        {/* Animated background effects */}
        <WorkspaceBackground />

        {/* Active panel with fade transition */}
        <div
          key={`desktop-${panel.id}-${animKey}`}
          className="animate-panel-enter h-full p-3 relative z-10"
          style={{ contain: 'layout style paint' } as React.CSSProperties}
        >
          <PanelWindow
            panelId={panel.id}
            title={panel.title}
            icon={panel.icon}
            accentColor={panel.accentColor}
            accentBg={panel.accentBg}
            isFocused
            isExpanded={false}
            badge={panel.badge}
            className="relative"
          >
            {panel.content}
          </PanelWindow>
        </div>
      </main>
    </div>
  )
}

/**
 * WorkspaceBackground — animated visual effects the user liked.
 * Gradient blobs, floating particles, and a subtle grid pattern.
 */
function WorkspaceBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-60" />
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl animate-pulse-glow"
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl animate-pulse-glow"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl animate-pulse-glow"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${6 + Math.random() * 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 6}s`,
            opacity: 0.2 + Math.random() * 0.4,
          }}
        />
      ))}

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Center glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl animate-pulse-glow" />
      </div>
    </div>
  )
}
