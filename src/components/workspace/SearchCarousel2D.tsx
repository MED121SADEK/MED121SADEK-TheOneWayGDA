'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { HUB_PANELS, type HubPanel } from '@/hooks/useThreeHub'
import {
  Brain,
  Upload,
  BarChart3,
  TrendingUp,
  ScatterChart,
  List,
  ScanLine,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────
   SearchCarousel2D – a pure-CSS circular carousel fallback
   for mobile / low-powered devices that cannot use WebGL.

   Features
   ----------
   • Cards arranged in a 3D-perspective circle
   • Swipe / drag to rotate (pointer events)
   • Tap to focus a card
   • Auto-play rotation (pauses on touch)
   • Glassmorphism card styling
   ────────────────────────────────────────────────────────────── */

/* Map icon name string → React component */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Upload,
  BarChart3,
  TrendingUp,
  ScatterChart,
  List,
  ScanLine,
  FileText,
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[name] || Brain
}

export default function SearchCarousel2D() {
  const panels = HUB_PANELS
  const count = panels.length
  const radius = 320 // px – distance of each card from center

  const [angle, setAngle] = useState(0)       // current rotation in degrees
  const [focused, setFocused] = useState<string | null>(null)
  const [autoPlay, setAutoPlay] = useState(true)

  const isDragging = useRef(false)
  const [isDragState, setIsDragState] = useState(false)
  const lastX = useRef(0)
  const autoPlayRef = useRef(autoPlay)
  const rafRef = useRef<number>(0)

  useEffect(() => { autoPlayRef.current = autoPlay }, [autoPlay])

  /* ── Auto-play rotation ── */
  useEffect(() => {
    if (!autoPlay || focused || isDragging.current) return

    const SPEED = 0.06 // deg/frame
    function tick() {
      setAngle(prev => (prev + SPEED) % 360)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [autoPlay, focused])

  /* ── Pointer gesture handlers ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    setIsDragState(true)
    lastX.current = e.clientX
    setAutoPlay(false)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    setAngle(prev => prev + dx * 0.25)
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    setIsDragState(false)
    // Resume autoplay after 3 seconds of inactivity
    setTimeout(() => setAutoPlay(true), 3000)
  }, [])

  /* ── Snap to nearest card on tap ── */
  const handleCardClick = useCallback((panel: HubPanel) => {
    setFocused(prev => prev === panel.id ? null : panel.id)
  }, [])

  /* ── Reset view ── */
  const handleReset = useCallback(() => {
    setAngle(0)
    setFocused(null)
    setAutoPlay(true)
  }, [])

  /* Compute the angle offset for each card */
  const angleStep = 360 / count

  return (
    <div className="relative w-full h-[500px] md:h-[600px] flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Background ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-6 px-4">
        <h2 className="text-lg font-bold gradient-text mb-1">TheOneWayGDA</h2>
        <p className="text-xs text-muted-foreground">
          Swipe to explore • Tap to focus
        </p>
      </div>

      {/* Carousel viewport */}
      <div
        className="relative w-full flex-1"
        style={{ perspective: '1200px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Carousel stage */}
        <div
          className="absolute left-1/2 top-1/2 w-0 h-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${angle}deg)`,
            transition: isDragState ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {panels.map((panel, i) => {
            const Icon = getIcon(panel.icon)
            const cardAngle = i * angleStep
            const isFront = focused === panel.id

            return (
              <div
                key={panel.id}
                className="absolute cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${cardAngle}deg) translateZ(${radius}px)`,
                  width: 220,
                  marginLeft: -110,
                  marginTop: -110,
                }}
                onClick={() => handleCardClick(panel)}
              >
                <div
                  className="rounded-2xl p-5 transition-all duration-300 border border-white/10"
                  style={{
                    background: isFront
                      ? `linear-gradient(135deg, ${panel.color}33, rgba(15,23,42,0.9))`
                      : 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: isFront
                      ? `0 0 30px ${panel.color}44, 0 8px 32px rgba(0,0,0,0.4)`
                      : '0 4px 24px rgba(0,0,0,0.3)',
                    transform: isFront ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${panel.color}22` }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {panel.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {panel.description}
                  </p>

                  {/* Color accent bar */}
                  <div
                    className="mt-3 h-0.5 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${panel.color}, transparent)`,
                      opacity: isFront ? 1 : 0.4,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-3 mt-4">
        <button
          onClick={() => setAngle(prev => prev - angleStep)}
          className="w-9 h-9 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-card transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>

        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-card transition-colors"
          aria-label="Reset view"
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        <button
          onClick={() => setAngle(prev => prev + angleStep)}
          className="w-9 h-9 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-card transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Focused panel detail overlay */}
      {focused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md">
            {(() => {
              const panel = panels.find(p => p.id === focused)
              if (!panel) return null
              const Icon = getIcon(panel.icon)
              return (
                <div
                  className="rounded-2xl p-6 border"
                  style={{
                    background: `linear-gradient(135deg, ${panel.color}18, rgba(15,23,42,0.95))`,
                    backdropFilter: 'blur(20px)',
                    borderColor: `${panel.color}33`,
                    boxShadow: `0 0 40px ${panel.color}22`,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${panel.color}22` }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        {panel.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setFocused(null)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {panel.description}
                  </p>
                  <div
                    className="h-1 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${panel.color}, transparent)`,
                    }}
                  />
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
