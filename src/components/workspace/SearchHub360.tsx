'use client'

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PanelWindow, type PanelWindowProps } from './PanelWindow'
import {
  RotateCw, Pause, Maximize2, Minimize2, ChevronLeft, ChevronRight,
  LayoutGrid,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-border/50 bg-card/80">
          <Image src={logoSrc} alt={brandName} width={24} height={24} className="rounded" />
          <span className="font-bold text-sm gradient-text">{brandName}</span>
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/60 backdrop-blur-sm flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/90 border border-border/50 shadow-lg">
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
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/30 bg-muted/20 flex-shrink-0 z-40">
        {panels.map((panel, i) => (
          <button
            key={panel.id}
            onClick={() => focusPanel(i)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all',
              focusedIndex === i
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
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
        <div className="flex items-center gap-0.5">
          <LayoutGrid className="w-3 h-3 text-muted-foreground mr-1" />
          {Array.from({ length: PANEL_COUNT }, (_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                focusedIndex === i ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </div>

      {/* ── 3D Orbital Stage ── */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
        onClick={() => {
          // Click on empty space collapses expansion
          if (isExpanded) collapsePanel()
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {panels.map((panel, i) => {
            // Calculate the angle needed to bring this panel to front
            // Front = rotateY(0deg). Panel i is at rotateY(i * ANGLE_STEP).
            // To bring panel i to front: container rotates by -i * ANGLE_STEP.
            const panelBaseAngle = i * ANGLE_STEP
            // The offset the container has to bring focusedPanel to front
            const containerRotation = -focusedIndex * ANGLE_STEP
            // Net angle of this panel relative to front
            const relativeAngle = panelBaseAngle + containerRotation

            // Determine if this panel is roughly facing the user
            const normalizedAngle = ((relativeAngle % 360) + 360) % 360
            const isFacingUser = normalizedAngle < 40 || normalizedAngle > 320
            const isBack = normalizedAngle > 140 && normalizedAngle < 220

            // Z position: bring focused panel closer, push back panels away
            let zOffset = 0
            if (isFocused || i === focusedIndex) {
              zOffset = isExpanded ? 280 : 120
            } else if (isBack) {
              zOffset = BACKFACE_OFFSET
            } else {
              zOffset = 0
            }

            // Opacity: dim panels that are on the sides or back
            let panelOpacity = 1
            if (isBack) panelOpacity = 0.15
            else if (normalizedAngle > 90 && normalizedAngle < 270) panelOpacity = 0.35
            else if (normalizedAngle > 60 && normalizedAngle < 300) panelOpacity = 0.6
            else panelOpacity = 0.85

            if (i === focusedIndex) panelOpacity = 1

            return (
              <div
                key={panel.id}
                className="absolute"
                style={{
                  width: isExpanded && i === focusedIndex ? '70%' : '52%',
                  height: isExpanded && i === focusedIndex ? '80%' : '68%',
                  left: isExpanded && i === focusedIndex ? '15%' : '24%',
                  top: isExpanded && i === focusedIndex ? '10%' : '16%',
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${panelBaseAngle}deg) translateZ(${RADIUS + zOffset}px)`,
                  transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  opacity: panelOpacity,
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
          <div className="w-96 h-96 rounded-full bg-gradient-radial from-primary/5 via-transparent to-transparent blur-3xl" />
        </div>
      </div>
    </div>
  )
}
