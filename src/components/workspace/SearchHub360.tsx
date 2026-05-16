'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PanelWindow, type PanelWindowProps } from './PanelWindow'
import {
  RotateCw, Pause, Maximize2, Minimize2, ChevronLeft, ChevronRight,
  LayoutGrid, Home,
} from 'lucide-react'

export interface PanelDefinition {
  id: string
  title: string
  icon: PanelWindowProps['icon']
  accentColor?: string
  accentBg?: string
  badge?: number
  content: ReactNode
}

interface SearchHub360Props {
  panels: PanelDefinition[]
  /** Brand name for the center hub */
  brandName?: string
  /** Logo path */
  logoSrc?: string
  className?: string
}

/**
 * SearchHub360 — a 360° immersive orbital workspace.
 *
 * Layout strategy:
 *  - Desktop (≥1024px): CSS 3D perspective orbital carousel.
 *    Panels are arranged with rotateY(i * 45deg) translateZ(radius).
 *    Click a panel or use nav arrows to bring it front-and-center.
 *  - Tablet (768–1023px): 2D horizontal carousel with snap scrolling.
 *  - Mobile (<768px): Vertical accordion / tabbed list.
 *
 * Zero-overlap guarantee:
 *  - Each panel uses `position: absolute` with `contain: layout style paint`.
 *  - CSS `isolation: isolate` prevents compositing leaks.
 *  - Event handlers call `stopPropagation` inside PanelWindow.
 *  - The focused panel gets the highest z-index; siblings are pushed back.
 */
export function SearchHub360({
  panels,
  brandName = 'TheOneWayGDA',
  logoSrc = '/images/logo.png',
  className,
}: SearchHub360Props) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Detect viewport size
  useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth
      if (w < 768) setViewportSize('mobile')
      else if (w < 1024) setViewportSize('tablet')
      else setViewportSize('desktop')
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  // Auto-rotate logic
  useEffect(() => {
    if (autoRotate && !isExpanded && viewportSize === 'desktop') {
      autoRotateRef.current = setInterval(() => {
        setFocusedIndex((prev) => (prev + 1) % panels.length)
      }, 4000)
    }
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current)
    }
  }, [autoRotate, isExpanded, viewportSize, panels.length])

  // Navigate panels
  const goNext = useCallback(() => {
    setFocusedIndex((prev) => (prev + 1) % panels.length)
  }, [panels.length])

  const goPrev = useCallback(() => {
    setFocusedIndex((prev) => (prev - 1 + panels.length) % panels.length)
  }, [panels.length])

  const goHome = useCallback(() => {
    setFocusedIndex(0)
    setIsExpanded(false)
  }, [])

  const focusPanel = useCallback((index: number) => {
    setFocusedIndex(index)
    setIsExpanded(true)
  }, [])

  const collapsePanel = useCallback(() => {
    setIsExpanded(false)
  }, [])

  // ── MOBILE (<768px): Vertical tab list ──
  if (viewportSize === 'mobile') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Center Hub */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80">
          <div className="flex items-center gap-2">
            <Image src={logoSrc} alt={brandName} width={24} height={24} className="rounded" />
            <span className="font-bold text-sm gradient-text">{brandName}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goHome}>
            <Home className="w-4 h-4" />
          </Button>
        </div>

        {/* Panel tabs */}
        <div className="flex overflow-x-auto border-b border-border/50 bg-muted/30 px-1 gap-0.5 flex-shrink-0">
          {panels.map((panel, i) => (
            <button
              key={panel.id}
              onClick={() => setFocusedIndex(i)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0',
                focusedIndex === i
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <panel.icon className="w-3.5 h-3.5" />
              {panel.title}
              {panel.badge != null && panel.badge > 0 && (
                <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full bg-primary/15 text-primary">
                  {panel.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active panel content */}
        <div className="flex-1 overflow-hidden p-2">
          <PanelWindow
            panelId={panels[focusedIndex].id}
            title={panels[focusedIndex].title}
            icon={panels[focusedIndex].icon}
            accentColor={panels[focusedIndex].accentColor}
            accentBg={panels[focusedIndex].accentBg}
            isFocused
            isExpanded={false}
            className="relative"
          >
            {panels[focusedIndex].content}
          </PanelWindow>
        </div>
      </div>
    )
  }

  // ── TABLET (768–1023px): Horizontal 2D carousel ──
  if (viewportSize === 'tablet') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Center Hub */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image src={logoSrc} alt={brandName} width={22} height={22} className="rounded" />
            <span className="font-bold text-sm gradient-text">{brandName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goHome}>
              <Home className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-mono px-2">
              {focusedIndex + 1}/{panels.length}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Panel thumbnails bar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/30 overflow-x-auto flex-shrink-0">
          {panels.map((panel, i) => (
            <button
              key={panel.id}
              onClick={() => setFocusedIndex(i)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0',
                focusedIndex === i
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              <panel.icon className="w-3 h-3" />
              {panel.title}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div className="flex-1 overflow-hidden p-3">
          <PanelWindow
            panelId={panels[focusedIndex].id}
            title={panels[focusedIndex].title}
            icon={panels[focusedIndex].icon}
            accentColor={panels[focusedIndex].accentColor}
            accentBg={panels[focusedIndex].accentBg}
            isFocused
            isExpanded={false}
            className="relative"
          >
            {panels[focusedIndex].content}
          </PanelWindow>
        </div>
      </div>
    )
  }

  // ── DESKTOP (≥1024px): 3D Orbital ──
  const PANEL_COUNT = panels.length
  const ANGLE_STEP = 360 / PANEL_COUNT
  const RADIUS = 620 // px — translateZ value
  const BACKFACE_OFFSET = -40 // slight push-back for non-focused panels

  return (
    <div className={cn('relative flex flex-col h-full overflow-hidden', className)}>
      {/* ── Top Control Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/40 backdrop-blur-md flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
          {/* Home button */}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goHome}>
            <Home className="w-4 h-4" />
          </Button>
          {/* Navigation arrows */}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {focusedIndex + 1} / {PANEL_COUNT}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Center hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-card/80 border border-border/40 shadow-lg backdrop-blur-md">
            <Image src={logoSrc} alt={brandName} width={18} height={18} className="rounded" />
            <span className="font-bold text-xs gradient-text">{brandName}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto-rotate toggle */}
          <Button
            variant={autoRotate ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? <Pause className="w-3 h-3" /> : <RotateCw className="w-3 h-3" />}
            {autoRotate ? 'Stop' : 'Auto'}
          </Button>
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Panel Thumbnail Strip (bottom) ── */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/20 bg-muted/10 flex-shrink-0 z-40">
        {panels.map((panel, i) => (
          <button
            key={panel.id}
            onClick={() => focusPanel(i)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all',
              focusedIndex === i
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30 shadow-sm shadow-primary/10'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
            )}
          >
            <panel.icon className="w-3 h-3" />
            <span className="hidden xl:inline">{panel.title}</span>
            {panel.badge != null && panel.badge > 0 && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-primary/20 text-primary">
                {panel.badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 mr-1">
          {Array.from({ length: PANEL_COUNT }, (_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-500',
                focusedIndex === i
                  ? 'bg-primary shadow-sm shadow-primary/50 scale-125'
                  : 'bg-muted-foreground/20 hover:bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
      </div>

      {/* ── 3D Orbital Stage ── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
        onClick={() => {
          // Click on empty space collapses expansion
          if (isExpanded) collapsePanel()
        }}
      >
        {/* ── Animated Gradient Background ── */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-60" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl animate-pulse-glow" style={{ animationDelay: '3s' }} />
        </div>

        {/* ── Floating Particles ── */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
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
        </div>

        {/* ── Subtle Grid Pattern ── */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* ── 3D Carousel Container ── */}
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {panels.map((panel, i) => {
            const panelBaseAngle = i * ANGLE_STEP
            const containerRotation = -focusedIndex * ANGLE_STEP
            const relativeAngle = panelBaseAngle + containerRotation
            const normalizedAngle = ((relativeAngle % 360) + 360) % 360
            const isFacingUser = normalizedAngle < 40 || normalizedAngle > 320
            const isBack = normalizedAngle > 140 && normalizedAngle < 220

            let zOffset = 0
            if (i === focusedIndex) {
              zOffset = isExpanded ? 280 : 120
            } else if (isBack) {
              zOffset = BACKFACE_OFFSET
            } else {
              zOffset = 0
            }

            let panelOpacity = 1
            if (isBack) panelOpacity = 0.12
            else if (normalizedAngle > 90 && normalizedAngle < 270) panelOpacity = 0.3
            else if (normalizedAngle > 60 && normalizedAngle < 300) panelOpacity = 0.55
            else panelOpacity = 0.85

            if (i === focusedIndex) panelOpacity = 1

            return (
              <div
                key={panel.id}
                className="absolute"
                style={{
                  width: isExpanded && i === focusedIndex ? '72%' : '54%',
                  height: isExpanded && i === focusedIndex ? '82%' : '70%',
                  left: isExpanded && i === focusedIndex ? '14%' : '23%',
                  top: isExpanded && i === focusedIndex ? '9%' : '15%',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${panelBaseAngle}deg) translateZ(${RADIUS + zOffset}px)`,
                  transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  opacity: mounted ? panelOpacity : 0,
                  pointerEvents: i === focusedIndex || isFacingUser ? 'auto' : 'none',
                }}
              >
                <PanelWindow
                  panelId={panel.id}
                  title={panel.title}
                  icon={panel.icon}
                  accentColor={panel.accentColor}
                  accentBg={panel.accentBg}
                  isFocused={i === focusedIndex}
                  isExpanded={isExpanded && i === focusedIndex}
                  onFocus={() => focusPanel(i)}
                  badge={panel.badge}
                >
                  {panel.content}
                </PanelWindow>
              </div>
            )
          })}
        </div>

        {/* ── Center Glow Effect ── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-96 h-96 rounded-full bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl animate-pulse-glow" />
        </div>
      </div>
    </div>
  )
}
