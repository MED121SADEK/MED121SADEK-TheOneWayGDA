'use client'

import React, { useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  Minus,
  Square,
  X,
  Maximize2,
  Minimize2,
  type LucideIcon,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────
   SearchWindow360 – an isolated floating panel rendered inside
   a Shadow DOM.  Each window owns its own styles and event
   handling, guaranteeing zero cross-window style or state leaks.

   Props
   ----------
   title     – window title
   icon      – Lucide icon component
   color     – accent colour (used for glow & title bar)
   windowId  – unique identifier (scoping CSS classes)
   children  – panel content (rendered inside Shadow DOM)
   onFocus   – callback when the panel receives focus
   onClose   – callback when close is clicked
   onMinimize – callback when minimize is clicked
   ────────────────────────────────────────────────────────────── */

interface SearchWindow360Props {
  title: string
  icon: LucideIcon
  color: string
  windowId: string
  children: ReactNode
  isFocused?: boolean
  onFocus?: () => void
  onClose?: () => void
  onMinimize?: () => void
  /** Width of the panel in px – default 420 */
  width?: number
  /** Height of the panel in px – default 320 */
  height?: number
}

export default function SearchWindow360({
  title,
  icon: Icon,
  color,
  windowId,
  children,
  isFocused = false,
  onFocus,
  onClose,
  onMinimize,
  width = 420,
  height = 320,
}: SearchWindow360Props) {
  /* ── Refs ── */
  const hostRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<ShadowRoot | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  /* ── Local state (isolated per window) ── */
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [panelSize, setPanelSize] = useState({ w: width, h: height })

  /* ── Unique CSS scope class ── */
  const scopeClass = `sw360-${windowId}`

  /* ── Inject Shadow DOM with scoped styles on mount ── */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Only attach once
    if (!host.shadowRoot) {
      const shadow = host.attachShadow({ mode: 'open' })
      shadowRef.current = shadow
    }

    const shadow = host.shadowRoot!
    shadow.innerHTML = ''

    /* Scoped CSS injected into Shadow DOM */
    const style = document.createElement('style')
    style.textContent = `
      /* ── Base reset inside shadow ── */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      /* ── Window shell ── */
      .${scopeClass} {
        width: ${panelSize.w}px;
        height: ${panelSize.h}px;
        display: flex;
        flex-direction: column;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        transition: box-shadow 0.3s ease, transform 0.3s ease;
        position: relative;
        user-select: none;
      }

      /* Glassmorphism background */
      .${scopeClass}-bg {
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* Focus glow */
      .${scopeClass}-focused .${scopeClass}-bg {
        border-color: ${color}44;
        box-shadow:
          0 0 20px ${color}33,
          0 0 60px ${color}11,
          inset 0 0 30px ${color}08;
      }

      /* Hover glow */
      .${scopeClass}-hover:hover .${scopeClass}-bg {
        border-color: ${color}66;
        box-shadow:
          0 0 24px ${color}40,
          0 0 48px ${color}18;
      }

      /* ── Title bar ── */
      .${scopeClass}-titlebar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: rgba(15, 23, 42, 0.55);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        cursor: grab;
        flex-shrink: 0;
      }

      .${scopeClass}-titlebar-icon {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: ${color}22;
        color: ${color};
      }

      .${scopeClass}-titlebar-icon svg {
        width: 14px;
        height: 14px;
      }

      .${scopeClass}-titlebar-text {
        flex: 1;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .${scopeClass}-titlebar-dots {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }

      .${scopeClass}-dot {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease, filter 0.15s ease;
        border: none;
        padding: 0;
      }
      .${scopeClass}-dot:hover { transform: scale(1.25); filter: brightness(1.3); }

      .${scopeClass}-dot-minimize  { background: #eab308; }
      .${scopeClass}-dot-maximize  { background: #22c55e; }
      .${scopeClass}-dot-close     { background: #ef4444; }

      .${scopeClass}-dot svg {
        width: 7px;
        height: 7px;
        opacity: 0;
        transition: opacity 0.15s;
        color: #000;
      }
      .${scopeClass}-titlebar:hover .${scopeClass}-dot svg { opacity: 1; }

      /* ── Content area ── */
      .${scopeClass}-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 14px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.12) transparent;
      }
      .${scopeClass}-content::-webkit-scrollbar { width: 5px; }
      .${scopeClass}-content::-webkit-scrollbar-track { background: transparent; }
      .${scopeClass}-content::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.12);
        border-radius: 4px;
      }

      /* ── Minimized state ── */
      .${scopeClass}-minimized .${scopeClass}-content {
        display: none;
      }

      /* ── Resize handle ── */
      .${scopeClass}-resize {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 18px;
        height: 18px;
        cursor: nwse-resize;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .${scopeClass}-resize::after {
        content: '';
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(255,255,255,0.2);
        border-bottom: 2px solid rgba(255,255,255,0.2);
      }

      /* ── Pulse animation for focused state ── */
      @keyframes ${scopeClass}-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      .${scopeClass}-focused .${scopeClass}-titlebar::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, ${color}, transparent);
        animation: ${scopeClass}-pulse 2.5s ease-in-out infinite;
      }
      .${scopeClass}-titlebar { position: relative; }

      /* ── Status indicator dot ── */
      .${scopeClass}-status {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${color};
        animation: ${scopeClass}-pulse 2.5s ease-in-out infinite;
      }
    `
    shadow.appendChild(style)

    /* Container element */
    const container = document.createElement('div')
    container.className = `${scopeClass} ${scopeClass}-bg ${isFocused ? `${scopeClass}-focused` : ''} ${scopeClass}-hover ${isMinimized ? `${scopeClass}-minimized` : ''}`

    /* Title bar */
    const titlebar = document.createElement('div')
    titlebar.className = `${scopeClass}-titlebar`
    titlebar.innerHTML = `
      <div class="${scopeClass}-status"></div>
      <div class="${scopeClass}-titlebar-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
      </div>
      <div class="${scopeClass}-titlebar-text">${title}</div>
      <div class="${scopeClass}-titlebar-dots">
        <button class="${scopeClass}-dot ${scopeClass}-dot-minimize" data-action="minimize">
          <svg viewBox="0 0 8 8"><line x1="1" y1="4" x2="7" y2="4" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button class="${scopeClass}-dot ${scopeClass}-dot-maximize" data-action="maximize">
          <svg viewBox="0 0 8 8"><rect x="1" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <button class="${scopeClass}-dot ${scopeClass}-dot-close" data-action="close">
          <svg viewBox="0 0 8 8"><line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    `

    /* Content slot */
    const contentSlot = document.createElement('div')
    contentSlot.className = `${scopeClass}-content`
    contentSlot.id = `${scopeClass}-content-slot`

    /* Resize handle */
    const resizeHandle = document.createElement('div')
    resizeHandle.className = `${scopeClass}-resize`

    container.appendChild(titlebar)
    container.appendChild(contentSlot)
    container.appendChild(resizeHandle)
    shadow.appendChild(container)

    /* ── Event delegation inside Shadow DOM ── */
    titlebar.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement
      const action = target.closest('[data-action]')?.getAttribute('data-action')
      if (action === 'minimize') {
        setIsMinimized(prev => !prev)
        onMinimize?.()
      } else if (action === 'maximize') {
        setIsMaximized(prev => !prev)
      } else if (action === 'close') {
        onClose?.()
      } else {
        // Clicked the title bar itself -> focus
        onFocus?.()
      }
    })

    // Prevent events from bubbling out of shadow
    container.addEventListener('mousedown', (e: Event) => {
      e.stopPropagation()
      onFocus?.()
    })
    container.addEventListener('click', (e: Event) => {
      e.stopPropagation()
    })
    container.addEventListener('pointerdown', (e: Event) => {
      e.stopPropagation()
    })

    // Resize handling inside Shadow DOM
    resizeHandle.addEventListener('pointerdown', (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      isResizing.current = true
      const pe = e as PointerEvent
      resizeStart.current = { x: pe.clientX, y: pe.clientY, w: panelSize.w, h: panelSize.h }
    })

    return () => {
      shadow.innerHTML = ''
    }
    // Intentional: mount-once Shadow DOM setup – color/scopeClass/title/windowId are stable props
  }, [color, scopeClass, title, windowId])

  /* ── Mount React children into the Shadow DOM content slot ── */
  useEffect(() => {
    const shadow = shadowRef.current
    if (!shadow) return
    const slot = shadow.querySelector(`#${scopeClass}-content-slot`) as HTMLElement
    if (!slot || !contentRef.current) return

    slot.innerHTML = ''
    slot.appendChild(contentRef.current)

    return () => {
      try { if (contentRef.current) slot.removeChild(contentRef.current) } catch { /* already detached */ }
    }
  }, [scopeClass])

  /* ── Update focused class ── */
  useEffect(() => {
    const shadow = shadowRef.current
    if (!shadow) return
    const container = shadow.querySelector(`.${scopeClass}`) as HTMLElement
    if (!container) return
    if (isFocused) {
      container.classList.add(`${scopeClass}-focused`)
    } else {
      container.classList.remove(`${scopeClass}-focused`)
    }
  }, [isFocused, scopeClass])

  /* ── Update minimized class ── */
  useEffect(() => {
    const shadow = shadowRef.current
    if (!shadow) return
    const container = shadow.querySelector(`.${scopeClass}`) as HTMLElement
    if (!container) return
    if (isMinimized) {
      container.classList.add(`${scopeClass}-minimized`)
    } else {
      container.classList.remove(`${scopeClass}-minimized`)
    }
  }, [isMinimized, scopeClass])

  /* ── Global resize move/up listeners ── */
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!isResizing.current) return
      const dx = e.clientX - resizeStart.current.x
      const dy = e.clientY - resizeStart.current.y
      setPanelSize({
        w: Math.max(280, resizeStart.current.w + dx),
        h: Math.max(200, resizeStart.current.h + dy),
      })
    }
    function onPointerUp() {
      isResizing.current = false
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  /* ── Render: a hidden div that hosts the Shadow DOM ── */
  return (
    <div
      ref={hostRef}
      style={{
        width: isMaximized ? 600 : panelSize.w,
        height: isMaximized ? 450 : panelSize.h,
        display: 'inline-block',
      }}
      data-window-id={windowId}
    >
      {/* React children are teleported into Shadow DOM via ref */}
      <div
        ref={contentRef}
        style={{ display: isMinimized ? 'none' : 'block' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
