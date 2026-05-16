'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/* ──────────────────────────────────────────────────────────────
   useThreeHub – manages the 360° immersive search-hub state.
   Provides:
     • is3DAvailable  – true when the browser supports WebGL
     • focusedWindow   – the currently-focused panel id (null = none)
     • rotation        – current Y-rotation in degrees (auto-rotate)
     • autoRotate      – toggle slow auto-rotation
     • zoom            – camera distance / zoom level
     • gesture handling helpers (pinch-zoom baseline)
   ────────────────────────────────────────────────────────────── */

export interface HubPanel {
  id: string
  title: string
  icon: string          // lucide icon name
  color: string         // CSS accent color
  description: string
}

/** The 8 panels that orbit the hub */
export const HUB_PANELS: HubPanel[] = [
  { id: 'ai-assistant',     title: 'AI Assistant',      icon: 'Brain',      color: '#06b6d4', description: 'Chat with AI for data analysis' },
  { id: 'data-import',      title: 'Data Import',       icon: 'Upload',     color: '#14b8a6', description: 'Upload CSV, Excel, JSON files' },
  { id: 'descriptive-stats',title: 'Descriptive Stats', icon: 'BarChart3',  color: '#0d9488', description: 'Mean, median, std dev & more' },
  { id: 'correlation',      title: 'Correlation',       icon: 'TrendingUp', color: '#059669', description: 'Pearson correlation matrix' },
  { id: 'regression',       title: 'Regression',        icon: 'Scatter',    color: '#0891b2', description: 'Linear & multiple regression' },
  { id: 'frequencies',      title: 'Frequencies',       icon: 'List',       color: '#0284c7', description: 'Frequency tables & distributions' },
  { id: 'scan-ocr',         title: 'Scan & OCR',        icon: 'ScanLine',   color: '#7c3aed', description: 'Document scanning & OCR extraction' },
  { id: 'report-generator', title: 'Report Generator',  icon: 'FileText',   color: '#dc2626', description: 'Generate PDF analysis reports' },
]

/* ── WebGL capability detection ── */
function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

/* ── Detect mobile / low-powered device ── */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

export function useThreeHub() {
  /* ── Core state ── */
  const [is3DAvailable, setIs3DAvailable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return detectWebGL() && !isMobileDevice()
  })
  const [focusedWindow, setFocusedWindow] = useState<string | null>(null)
  const [rotation, setRotation] = useState<number>(0)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [zoom, setZoom] = useState<number>(1800)
  const [isDragging, setIsDragging] = useState(false)

  /* ── Refs for gesture tracking ── */
  const lastTouchDist = useRef<number>(0)
  const dragStartX = useRef<number>(0)
  const dragStartRotation = useRef<number>(0)
  const autoRotateRef = useRef(autoRotate)
  const animFrameRef = useRef<number>(0)

  /* Keep the ref in sync with state for the rAF callback */
  useEffect(() => {
    autoRotateRef.current = autoRotate
  }, [autoRotate])

  /* ── Auto-rotate loop ── */
  useEffect(() => {
    if (!autoRotate || focusedWindow || isDragging) return

    const TICK = 0.08 // degrees per frame (~4.8°/s at 60fps)

    function tick() {
      setRotation(prev => (prev + TICK) % 360)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [autoRotate, focusedWindow, isDragging])

  /* ── Gesture: pointer down (start drag) ── */
  const handlePointerDown = useCallback((e: React.PointerEvent | PointerEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartRotation.current = rotation
  }, [rotation])

  /* ── Gesture: pointer move (drag to rotate) ── */
  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartX.current
    const newRotation = dragStartRotation.current + dx * 0.15
    setRotation(newRotation % 360)
  }, [isDragging])

  /* ── Gesture: pointer up (end drag) ── */
  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  /* ── Gesture: pinch-zoom (touch) ── */
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const delta = lastTouchDist.current - dist
      lastTouchDist.current = dist

      setZoom(prev => Math.max(800, Math.min(4000, prev + delta * 2)))
    }
  }, [])

  /* ── Focus / unfocus helpers ── */
  const focusWindow = useCallback((id: string | null) => {
    setFocusedWindow(prev => (prev === id ? null : id))
  }, [])

  const resetView = useCallback(() => {
    setFocusedWindow(null)
    setRotation(0)
    setZoom(1800)
    setAutoRotate(true)
  }, [])

  return {
    /* state */
    is3DAvailable,
    focusedWindow,
    rotation,
    setRotation,
    autoRotate,
    setAutoRotate,
    zoom,
    setZoom,
    isDragging,

    /* actions */
    setFocusedWindow: focusWindow,
    focusWindow,
    resetView,

    /* gesture handlers (attach to container) */
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,

    /* data */
    panels: HUB_PANELS,
  }
}
