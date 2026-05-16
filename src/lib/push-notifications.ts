const PERMISSION_KEY = 'oneway-notification-permission'
const DISMISSED_KEY = 'oneway-notification-dismissed'

export const PushNotifications = {
  /**
   * Check if the browser supports the Notification API
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return 'Notification' in window
  },

  /**
   * Get the current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied'
    return Notification.permission
  },

  /**
   * Check if permission has been previously stored in localStorage
   */
  isPermissionCached(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(PERMISSION_KEY) !== null
  },

  /**
   * Store the permission status in localStorage (internal)
   */
  cachePermissionStatus(status: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(PERMISSION_KEY, status)
  },

  /**
   * Request browser notification permission
   * Returns the granted permission status
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied'

    try {
      const status = await Notification.requestPermission()
      this.cachePermissionStatus(status)
      return status
    } catch {
      return 'denied'
    }
  },

  /**
   * Subscribe to push notifications via service worker (if ready)
   * Note: This is a client-side push subscription — real push requires
   * a VAPID key server endpoint. This sets up the foundation.
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined') return null
    if (!('serviceWorker' in navigator)) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, replace with a real VAPID public key from your server
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-GV3WVDRJxPO7Ti'
        ) as BufferSource,
      })
      return subscription
    } catch (err) {
      console.warn('Push subscription failed (non-critical):', err)
      return null
    }
  },

  /**
   * Show a local notification immediately using the Notification API.
   * No server push required — works with granted permission.
   */
  showLocalNotification(
    title: string,
    body: string,
    icon?: string,
    url?: string
  ): void {
    if (!this.isSupported()) return
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'oneway-notification',
      })

      if (url) {
        notification.onclick = () => {
          window.focus()
          window.open(url, '_self')
        }
      }

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000)
    } catch {
      // Notification API might fail in some environments
    }
  },

  /**
   * Schedule a welcome notification that shows 5 seconds after
   * the user grants notification permission.
   * Uses setTimeout to deliver after a brief delay.
   */
  scheduleWelcomeNotification(): void {
    if (!this.isSupported()) return

    // If already granted, schedule immediately
    if (Notification.permission === 'granted') {
      setTimeout(() => {
        this.showLocalNotification(
          'Welcome to TheOneWayGDA! 🚀',
          'You\'re all set to receive real-time updates on AI model benchmarks, community news, and workflow alerts.',
          '/icons/icon-192x192.png',
          window.location.origin
        )
      }, 5000)
    }
  },

  /**
   * Check if the notification prompt has been dismissed
   * and if the dismissal is still within the 7-day cooldown
   */
  isDismissedWithinCooldown(): boolean {
    if (typeof window === 'undefined') return false
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (!dismissed) return false

    try {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      return Date.now() - dismissedAt < sevenDaysMs
    } catch {
      return false
    }
  },

  /**
   * Mark the notification prompt as dismissed for 7 days
   */
  markDismissed(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  },

  /**
   * Convert URL-safe base64 to Uint8Array for VAPID key
   */
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  },
}
