'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { useModuleRegistry, APP_VERSION } from '@/lib/modules'
import { checkForUpdates } from '@/lib/update-checker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Download, RefreshCw } from 'lucide-react'

export function UpdateBanner() {
  const { t, dir } = useTranslation()
  const registry = useModuleRegistry()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  // Check for updates on mount (if not checked recently)
  const checkUpdates = useCallback(async () => {
    if (registry.isChecking) return
    // Only check if last checked was more than 30 minutes ago or never
    if (registry.lastChecked) {
      const lastCheck = new Date(registry.lastChecked).getTime()
      const thirtyMinutes = 30 * 60 * 1000
      if (Date.now() - lastCheck < thirtyMinutes) {
        if (registry.pendingUpdates.length > 0) {
          setVisible(true)
        }
        return
      }
    }
    registry.setChecking(true)
    try {
      const updates = await checkForUpdates(registry.modules)
      registry.setPendingUpdates(updates)
      registry.setLastChecked(new Date().toISOString())
      if (updates.length > 0) {
        setVisible(true)
      }
    } catch {
      // Silently handle
    }
    registry.setChecking(false)
  }, [registry])

  useEffect(() => {
    // Check after a short delay to avoid blocking initial load
    const timer = setTimeout(checkUpdates, 2000)
    return () => clearTimeout(timer)
  }, [checkUpdates])

  // Don't render if dismissed or no updates or still loading with no previous results
  if (dismissed) return null
  if (registry.pendingUpdates.length === 0 && !registry.isChecking) return null
  if (!visible && registry.pendingUpdates.length === 0) return null

  const updateCount = registry.pendingUpdates.length
  const criticalCount = registry.pendingUpdates.filter(u => u.critical).length

  return (
    <div
      className="relative z-50 border-b border-amber-500/20"
      dir={dir}
    >
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-2">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs min-w-0">
            {registry.isChecking ? (
              <>
                <RefreshCw className="size-3.5 text-muted-foreground animate-spin flex-shrink-0" />
                <span className="text-muted-foreground">{t('modules.checking')}</span>
              </>
            ) : (
              <>
                <Download className="size-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-foreground">
                  {updateCount} {t('modules.updatesAvailable')}
                  {criticalCount > 0 && (
                    <Badge className="ml-1.5 bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-1.5 py-0">
                      {criticalCount} {t('modules.critical')}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{t('modules.appVersion')} v{APP_VERSION}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!registry.isChecking && (
              <Link href="/updates">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-amber-400 hover:text-amber-300">
                  {t('updates.title')}
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
