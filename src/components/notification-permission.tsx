'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { PushNotifications } from '@/lib/push-notifications'

export function NotificationPermission() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on client side
    if (typeof window === 'undefined') return

    // Don't show if:
    // 1. Notifications not supported
    // 2. Permission already granted
    // 3. Permission already denied
    // 4. Dismissed within 7-day cooldown
    if (!PushNotifications.isSupported()) return
    if (PushNotifications.getPermissionStatus() !== 'default') return
    if (PushNotifications.isDismissedWithinCooldown()) return

    // Small delay so the page loads first
    const timer = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleAllow = async () => {
    const permission = await PushNotifications.requestPermission()

    if (permission === 'granted') {
      toast.success('Notifications enabled!', {
        description: 'You\'ll receive real-time updates on AI benchmarks and community news.',
      })
      PushNotifications.scheduleWelcomeNotification()
    } else {
      toast.info('Notifications declined', {
        description: 'You can enable them later in your browser settings.',
      })
    }

    setVisible(false)
  }

  const handleDismiss = () => {
    PushNotifications.markDismissed()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg animate-in slide-in-from-top-4 fade-in duration-500">
        <div className="relative rounded-xl border border-primary/20 bg-background/80 backdrop-blur-xl shadow-lg shadow-primary/5 overflow-hidden">
          {/* Subtle gradient accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="flex items-start gap-3 p-4">
            {/* Animated bell icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-primary/10 animate-ping opacity-30" />
              <div className="relative size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bell className="size-5 text-primary animate-[swing_1s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                Stay Updated
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Get notified about new AI model benchmarks, community highlights, and workflow updates.
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Dismiss notification prompt"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 pb-4 pt-0">
            <button
              onClick={handleAllow}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
            >
              <Bell className="size-3.5" />
              Allow Notifications
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 h-9 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe for bell swing animation */}
      <style jsx>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          75% { transform: rotate(2deg); }
        }
      `}</style>
    </div>
  )
}
