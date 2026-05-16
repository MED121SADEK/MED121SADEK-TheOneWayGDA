'use client'

import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { PanelWindow, type PanelWindowProps } from './PanelWindow'
import { Home, RotateCcw, Maximize2, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'

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
  brandName?: string
  logoSrc?: string
  className?: string
}

type ViewMode = 'orbit' | 'focus'

/**
 * SearchHub360 — 360° Immersive Orbital Workspace
 *
 * Two view modes:
 *  1. ORBIT MODE: All 8 panels arranged in a CSS 3D orbital carousel.
 *     Drag to rotate, click a panel card to enter focus mode.
 *  2. FOCUS MODE: One panel fills the main area — zero overlap guaranteed.
 *     Press Escape or click "Back to Orbit" to return.
 *
 * Zero-overlap guarantee:
 *  - Orbit mode: Each panel card is positioned via CSS 3D transforms at
 *    calculated radial coordinates. No absolute positioning overlaps.
 *  - Focus mode: Only one panel is rendered in the main area.
 *  - CSS `contain: layout style paint` on all panels for isolation.
 *
 * No Three.js dependency — pure CSS 3D transforms that work in any iframe.
 */
export function SearchHub360({
  panels,
  brandName = 'TheOneWayGDA',
  logoSrc = '/images/logo.png',
  className,
}: SearchHub360Props) {
  const [mode, setMode] = useState<ViewMode>('orbit')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [orbitAngle, setOrbitAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const dragStartRef = useRef({ x: 0, angle: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const panelCount = panels.length
  const angleStep = 360 / panelCount // 45° for 8 panels
  const orbitRadius = 380

  // Detect viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode === 'orbit') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setOrbitAngle(prev => prev - angleStep)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          setOrbitAngle(prev => prev + angleStep)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          focusPanel(getFrontPanelIndex())
        }
      } else if (e.key === 'Escape') {
        backToOrbit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, orbitAngle])

  // Get which panel is at the front
  const getFrontPanelIndex = useCallback(() => {
    const normalized = (((-orbitAngle) % 360) + 360) % 360
    const index = Math.round(normalized / angleStep) % panelCount
    return index
  }, [orbitAngle, angleStep, panelCount])

  // Snap orbit to nearest panel
  const snapToNearest = useCallback(() => {
    const normalized = ((orbitAngle % 360) + 360) % 360
    const nearest = Math.round(normalized / angleStep) * angleStep
    // Find which panel this corresponds to
    const delta = normalized - nearest
    setOrbitAngle(prev => prev - delta)
  }, [orbitAngle, angleStep])

  // Drag handlers for orbit rotation
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (mode !== 'orbit') return
    e.preventDefault()
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragStartRef.current = { x: e.clientX, angle: orbitAngle }
  }, [mode, orbitAngle])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || mode !== 'orbit') return
    const delta = e.clientX - dragStartRef.current.x
    const sensitivity = 0.35
    const newAngle = dragStartRef.current.angle + delta * sensitivity
    setOrbitAngle(newAngle)
  }, [isDragging, mode])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    snapToNearest()
  }, [isDragging, snapToNearest])

  // Enter focus mode on a specific panel
  const focusPanel = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setFocusedIndex(index)
    // Align orbit so clicked panel is front
    setOrbitAngle(-index * angleStep)
    setTimeout(() => {
      setMode('focus')
      setTransitioning(false)
    }, 350)
  }, [angleStep, transitioning])

  // Return to orbit view
  const backToOrbit = useCallback(() => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setMode('orbit')
      setTransitioning(false)
    }, 100)
  }, [transitioning])

  // Quick nav buttons in orbit mode
  const rotateOrbit = useCallback((direction: 1 | -1) => {
    setOrbitAngle(prev => prev + direction * angleStep)
  }, [angleStep])

  // Navigate via sidebar (desktop) or tabs (mobile)
  const sidebarSelect = useCallback((index: number) => {
    setFocusedIndex(index)
    setOrbitAngle(-index * angleStep)
    if (mode === 'focus') {
      // Already in focus, just switch panel
    } else {
      setTransitioning(true)
      setTimeout(() => {
        setMode('focus')
        setTransitioning(false)
      }, 350)
    }
  }, [angleStep, mode, transitioning])

  // Calculate each panel's 3D position
  const panelTransforms = useMemo(() => {
    return panels.map((_, i) => {
      const angle = i * angleStep
      const rad = (angle * Math.PI) / 180
      return {
        transform: `rotateY(${angle}deg) translateZ(${orbitRadius}px)`,
        x: Math.sin(rad) * orbitRadius,
        z: Math.cos(rad) * orbitRadius,
      }
    })
  }, [panels.length, angleStep, orbitRadius])

  // Determine front panel for highlighting
  const frontIndex = getFrontPanelIndex()

  // ════════════════════════════════════════
  //  MOBILE (<768px): Bottom tab bar
  // ════════════════════════════════════════
  if (isMobile) {
    const panel = panels[focusedIndex]
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex-1 overflow-hidden relative">
          <WorkspaceBackground />
          <div className="h-full p-2 relative z-10">
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
        <nav className="flex-shrink-0 border-t border-border/50 bg-card/90 backdrop-blur-md z-50">
          <div className="flex items-center justify-around px-1 py-1.5">
            {panels.map((p, i) => {
              const isActive = i === focusedIndex
              return (
                <button
                  key={p.id}
                  onClick={() => setFocusedIndex(i)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-all min-w-[44px]',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                    isActive && 'bg-primary/15',
                  )}>
                    <p.icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                  </div>
                  <span className="text-[9px] font-medium leading-tight truncate max-w-[48px]">{p.title}</span>
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

  // ════════════════════════════════════════
  //  DESKTOP (≥768px): Sidebar + Orbit/Focus
  // ════════════════════════════════════════
  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* ── Left Sidebar (Activity Bar) ── */}
      <aside className="flex-shrink-0 w-14 bg-card/90 backdrop-blur-md border-r border-border/50 flex flex-col items-center z-50 relative">
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-12 border-b border-border/30 flex-shrink-0">
          <Image src={logoSrc} alt={brandName} width={24} height={24} className="rounded" />
        </div>

        {/* Panel icons */}
        <div className="flex-1 flex flex-col items-center py-2 gap-0.5 overflow-y-auto scrollbar-none">
          {panels.map((p, i) => {
            const isActive = i === focusedIndex
            return (
              <div key={p.id} className="relative">
                <button
                  onClick={() => sidebarSelect(i)}
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
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                  )}
                  <p.icon className={cn('w-[18px] h-[18px]', isActive && 'text-primary')} />
                  {p.badge != null && p.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-card" />
                  )}
                </button>
                {hoveredIcon === i && <div className="sidebar-tooltip">{p.title}</div>}
              </div>
            )
          })}
        </div>

        {/* Home button */}
        <div className="flex items-center justify-center w-14 h-12 border-t border-border/30 flex-shrink-0">
          <button
            onClick={() => { setFocusedIndex(0); setOrbitAngle(0); if (mode === 'focus') backToOrbit() }}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-hidden relative">
        <WorkspaceBackground />

        {/* ORBIT MODE — 360° Immersive Carousel */}
        {mode === 'orbit' && (
          <div
            ref={containerRef}
            className={cn(
              'absolute inset-0 z-10 flex flex-col items-center justify-center',
              transitioning && 'animate-orbit-exit',
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Orbit Header */}
            <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-card/70 backdrop-blur-md rounded-full px-4 py-2 border border-border/40 shadow-lg">
                <LayoutGrid className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">360° Workspace</span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">Drag to rotate • Click to open</span>
              </div>
            </div>

            {/* Left / Right nav arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); rotateOrbit(-1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/70 backdrop-blur-md border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shadow-lg"
              aria-label="Rotate left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); rotateOrbit(1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/70 backdrop-blur-md border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shadow-lg"
              aria-label="Rotate right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* 3D Orbit Container */}
            <div className="orbit-perspective" style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Decorative orbit ring lines */}
              <div className="orbit-ring-line" style={{ width: orbitRadius * 2 + 80, height: orbitRadius * 1.4 + 40, marginLeft: -(orbitRadius + 40), marginTop: -(orbitRadius * 0.7 + 20) }} />
              <div className="orbit-ring-line" style={{ width: orbitRadius * 2 + 160, height: orbitRadius * 1.4 + 80, marginLeft: -(orbitRadius + 80), marginTop: -(orbitRadius * 0.7 + 40), opacity: 0.5 }} />

              {/* Center glow */}
              <div className="orbit-center-glow" />

              {/* 3D Orbit Ring with panels */}
              <div
                className={cn(
                  'orbit-ring',
                  isDragging ? 'orbit-ring-smooth' : 'orbit-ring-snap',
                )}
                style={{
                  width: 280,
                  height: 200,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginLeft: -140,
                  marginTop: -100,
                  transform: `rotateX(-12deg) rotateY(${orbitAngle}deg)`,
                }}
              >
                {panels.map((panel, i) => {
                  const isFront = i === frontIndex
                  return (
                    <div
                      key={panel.id}
                      className={cn(
                        'orbit-panel-card',
                        isFront && 'is-front',
                      )}
                      style={{
                        width: 260,
                        height: 185,
                        transform: panelTransforms[i].transform,
                        marginLeft: -130,
                        marginTop: -92.5,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        focusPanel(i)
                      }}
                    >
                      <div className={cn(
                        'w-full h-full rounded-2xl border bg-card/95 backdrop-blur-md flex flex-col overflow-hidden transition-all',
                        isFront
                          ? 'border-primary/40 shadow-2xl shadow-primary/10 scale-[1.02]'
                          : 'border-border/50 shadow-lg opacity-80 hover:opacity-100',
                      )}>
                        {/* Panel card header */}
                        <div className={cn(
                          'flex items-center gap-2.5 px-4 py-3 border-b border-border/30 flex-shrink-0',
                          'bg-gradient-to-r',
                          panel.accentBg,
                        )}>
                          <div className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-lg',
                            isFront
                              ? `bg-gradient-to-br ${panel.accentBg} ring-1 ring-current ${panel.accentColor}`
                              : 'bg-muted/60',
                          )}>
                            <panel.icon className={cn('w-4 h-4', isFront ? panel.accentColor : 'text-muted-foreground')} />
                          </div>
                          <span className={cn(
                            'text-xs font-semibold tracking-wide',
                            isFront ? 'text-foreground' : 'text-muted-foreground',
                          )}>
                            {panel.title}
                          </span>
                          {panel.badge != null && panel.badge > 0 && (
                            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                              {panel.badge}
                            </span>
                          )}
                          {isFront && (
                            <button className="ml-auto flex items-center gap-1 text-[10px] text-primary font-medium hover:text-primary/80 transition-colors">
                              <Maximize2 className="w-3 h-3" />
                              Open
                            </button>
                          )}
                        </div>

                        {/* Panel card body — mini preview */}
                        <div className="flex-1 flex items-center justify-center p-4">
                          <div className="text-center">
                            <div className={cn(
                              'w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center',
                              isFront ? `bg-gradient-to-br ${panel.accentBg}` : 'bg-muted/30',
                            )}>
                              <panel.icon className={cn('w-6 h-6', isFront ? panel.accentColor : 'text-muted-foreground/50')} />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium">{panel.title}</p>
                            {isFront && (
                              <p className="text-[9px] text-primary mt-0.5 animate-pulse">Click to open panel</p>
                            )}
                          </div>
                        </div>

                        {/* Shimmer effect for front panel */}
                        {isFront && (
                          <div className="orbit-shimmer absolute inset-0 rounded-2xl pointer-events-none" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Panel indicator dots at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {panels.map((p, i) => (
                <button
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); setOrbitAngle(-i * angleStep) }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === frontIndex
                      ? 'bg-primary w-6'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                  )}
                  aria-label={p.title}
                />
              ))}
            </div>
          </div>
        )}

        {/* FOCUS MODE — Single Panel (Zero Overlap) */}
        {mode === 'focus' && (
          <div className={cn(
            'absolute inset-0 z-10 p-3',
            transitioning ? 'animate-orbit-exit' : 'animate-focus-enter',
          )}>
            {/* Back to orbit button */}
            <button
              onClick={backToOrbit}
              className="animate-slide-in-left absolute top-2 left-2 z-30 flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-border/40 shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>360° View</span>
            </button>

            {/* Panel navigation hint */}
            <div className="animate-slide-in-left absolute top-2 right-4 z-30 flex items-center gap-1">
              {panels.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => sidebarSelect(i)}
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg transition-all',
                    i === focusedIndex
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/40',
                  )}
                  title={p.title}
                >
                  <p.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Active panel */}
            <div
              className="h-full pt-10"
              style={{ contain: 'layout style paint' } as React.CSSProperties}
            >
              <PanelWindow
                panelId={panels[focusedIndex].id}
                title={panels[focusedIndex].title}
                icon={panels[focusedIndex].icon}
                accentColor={panels[focusedIndex].accentColor}
                accentBg={panels[focusedIndex].accentBg}
                isFocused
                isExpanded={false}
                badge={panels[focusedIndex].badge}
                className="relative h-full"
              >
                {panels[focusedIndex].content}
              </PanelWindow>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * WorkspaceBackground — animated visual effects (the background the user liked).
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
            left: `${((i * 37 + 13) % 100)}%`,
            top: `${((i * 53 + 7) % 100)}%`,
            animation: `float ${6 + (i % 8)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.7) % 6}s`,
            opacity: 0.2 + (i % 5) * 0.1,
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
