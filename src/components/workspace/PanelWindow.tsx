'use client'

import { useRef, useCallback, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface PanelWindowProps {
  /** Unique panel identifier for isolation */
  panelId: string
  /** Panel display title */
  title: string
  /** Panel icon from lucide-react */
  icon: LucideIcon
  /** Accent color theme (Tailwind class) */
  accentColor?: string
  /** Accent bg gradient (Tailwind class) */
  accentBg?: string
  /** Whether this panel is currently focused */
  isFocused?: boolean
  /** Whether this panel is in focused-expanded mode */
  isExpanded?: boolean
  /** Click handler to focus this panel */
  onFocus?: () => void
  /** Panel content */
  children: ReactNode
  /** Badge count (optional) */
  badge?: number
  /** Additional CSS class */
  className?: string
}

/**
 * PanelWindow — an isolated, non-overlapping panel wrapper.
 *
 * Key isolation guarantees:
 *  1. CSS `isolation: isolate` prevents compositing leaks.
 *  2. All pointer events use `stopPropagation` so no cross-panel bubbling.
 *  3. Each panel has its own scroll container (`overflow-y: auto`).
 *  4. A unique `data-panel-id` attribute scopes all content.
 *  5. The panel root div captures wheel events and prevents them from
 *     reaching sibling panels.
 */
export function PanelWindow({
  panelId,
  title,
  icon: Icon,
  accentColor = 'text-teal-500',
  accentBg = 'from-teal-500/20 to-teal-600/5',
  isFocused = false,
  isExpanded = false,
  onFocus,
  children,
  badge,
  className,
}: PanelWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Block wheel events from bubbling past this panel
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }, [])

  // Block all pointer events from bubbling
  const stopAll = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
  }, [])

  // When expanded, ensure scroll is at top
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [isExpanded])

  return (
    <div
      data-panel-id={panelId}
      className={cn(
        // Base styles — relative positioning for sidebar layout
        'relative flex flex-col h-full w-full rounded-2xl border shadow-xl',
        'bg-card/95 backdrop-blur-md',
        'transition-all duration-500 ease-out',
        // CSS isolation — prevents compositing and stacking context leaks
        'isolate',
        // Pointer events
        'pointer-events-auto',
        // Focused state styling
        isFocused
          ? 'border-primary/40 shadow-2xl shadow-primary/10'
          : 'border-border/60 shadow-lg opacity-90 hover:opacity-100 hover:border-border',
        className,
      )}
      onWheel={onWheel}
      onPointerDown={stopAll}
      onPointerUp={stopAll}
      onClick={(e) => {
        e.stopPropagation()
        onFocus?.()
      }}
      style={{ contain: 'layout style paint' } as React.CSSProperties}
    >
      {/* ── Panel Header ── */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-3 border-b border-border/50 flex-shrink-0',
          'bg-gradient-to-r',
          accentBg,
        )}
        data-panel-header={panelId}
      >
        <div
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-lg',
            isFocused
              ? `bg-gradient-to-br ${accentBg} ring-1 ring-current ${accentColor}`
              : 'bg-muted/60',
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', isFocused ? accentColor : 'text-muted-foreground')} />
        </div>
        <span className={cn(
          'text-xs font-semibold tracking-wide uppercase',
          isFocused ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {title}
        </span>
        {badge != null && badge > 0 && (
          <span className={cn(
            'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            'bg-primary/15 text-primary',
          )}>
            {badge}
          </span>
        )}
        {isFocused && (
          <span className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-600 font-medium">ACTIVE</span>
          </span>
        )}
      </div>

      {/* ── Panel Body (independent scroll) ── */}
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
        )}
        data-panel-body={panelId}
        onWheel={onWheel}
        onPointerDown={stopAll}
        onPointerUp={stopAll}
      >
        <div data-panel-content={panelId}>
          {children}
        </div>
      </div>
    </div>
  )
}
