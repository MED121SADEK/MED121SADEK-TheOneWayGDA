'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bell, BellRing, Wifi, WifiOff, Check, CheckCheck,
  ExternalLink, Settings, X, ChevronDown, Loader2,
  MessageSquare, TrendingUp, Users, AlertCircle, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStream } from '@/hooks/use-notification-stream'

/* ─── Icon mapping per notification type ─── */
const typeIcons: Record<string, React.ElementType> = {
  benchmark: TrendingUp,
  community: MessageSquare,
  team: Users,
  alert: AlertCircle,
  update: Sparkles,
  default: Bell,
}

const typeColors: Record<string, string> = {
  benchmark: 'text-blue-400 bg-blue-500/10',
  community: 'text-emerald-400 bg-emerald-500/10',
  team: 'text-violet-400 bg-violet-500/10',
  alert: 'text-amber-400 bg-amber-500/10',
  update: 'text-sky-400 bg-sky-500/10',
  default: 'text-muted-foreground bg-muted/50',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationBell() {
  const { liveNotifications, isConnected, status } = useNotificationStream()
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unreadCount = liveNotifications.filter(n => !n.isRead && !readIds.has(n.id)).length

  const markAllRead = useCallback(() => {
    const allIds = new Set(readIds)
    liveNotifications.forEach(n => allIds.add(n.id))
    setReadIds(allIds)
  }, [liveNotifications, readIds])

  const markRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id))
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current && !panelRef.current.contains(target) &&
          buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Auto-close after 10 minutes
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => setIsOpen(false), 10 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [isOpen])

  return (
    <>
      {/* Bell trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed top-3 right-3 z-[90] size-9 rounded-full flex items-center justify-center',
          'transition-all duration-200',
          'hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none',
          isOpen && 'bg-muted',
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {unreadCount > 0 ? (
          <BellRing className="size-[18px] text-primary" />
        ) : (
          <Bell className="size-[18px] text-muted-foreground" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full',
            'bg-destructive text-destructive-foreground',
            'flex items-center justify-center',
            'text-[9px] font-bold leading-none px-1',
            'ring-2 ring-background',
            unreadCount > 9 && 'min-w-[18px]',
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection status dot */}
        <span
          className={cn(
            'absolute bottom-0 right-0 size-2 rounded-full ring-1.5 ring-background',
            isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse',
          )}
          title={isConnected ? 'Connected' : status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
        />
      </button>

      {/* Notification dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed top-14 right-3 z-[95]',
            'w-[380px] max-h-[520px] rounded-xl',
            'bg-popover/95 backdrop-blur-xl border border-border/60',
            'shadow-xl shadow-black/10',
            'flex flex-col overflow-hidden',
            'animate-in slide-in-from-top-2 fade-in duration-200',
          )}
          role="dialog"
          aria-label="Notification panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-muted/50"
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close notifications"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Connection status bar */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-[10px] border-b border-border/30 flex-shrink-0',
            isConnected ? 'text-emerald-500' : 'text-amber-500',
          )}>
            {isConnected ? (
              <><Wifi className="size-3" /><span>Live updates active</span></>
            ) : status === 'reconnecting' ? (
              <><Loader2 className="size-3 animate-spin" /><span>Reconnecting...</span></>
            ) : (
              <><WifiOff className="size-3" /><span>Disconnected</span></>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {liveNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="size-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">No notifications yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {isConnected
                    ? 'You\'ll see real-time updates about benchmarks, community activity, and team changes here.'
                    : 'Connect to see live notifications from the platform.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {liveNotifications.map(notif => {
                  const isUnread = !notif.isRead && !readIds.has(notif.id)
                  const IconComp = typeIcons[notif.type] || typeIcons.default
                  const colorClass = typeColors[notif.type] || typeColors.default

                  return (
                    <button
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors group',
                        isUnread ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-muted/30',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type icon */}
                        <div className={cn(
                          'size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                          colorClass,
                        )}>
                          <IconComp className="size-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-xs leading-relaxed',
                              isUnread ? 'font-semibold text-foreground' : 'text-foreground/80',
                            )}>
                              {notif.title}
                            </p>
                            {isUnread && (
                              <span className="size-2 rounded-full bg-primary flex-shrink-0 mt-1.5 ring-2 ring-background" />
                            )}
                          </div>
                          {notif.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-muted-foreground/60">
                              {timeAgo(notif.createdAt)}
                            </span>
                            {notif.actionUrl && (
                              <a
                                href={notif.actionUrl}
                                onClick={e => e.stopPropagation()}
                                className="text-[9px] text-primary hover:text-primary/80 flex items-center gap-0.5"
                              >
                                {notif.actionLabel || 'View'} <ExternalLink className="size-2" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/20 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">
              {liveNotifications.length} notification{liveNotifications.length !== 1 ? 's' : ''}
            </span>
            <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Settings className="size-3" />
              Settings
            </button>
          </div>
        </div>
      )}
    </>
  )
}
