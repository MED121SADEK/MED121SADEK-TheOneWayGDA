'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle,
  CheckCheck,
  Users,
  Star,
  Megaphone,
  ShieldCheck,
  CreditCard,
  Settings,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

// ── Notification type definitions ──
interface NotificationTypeConfig {
  key: string
  label: string
  description: string
  icon: React.ElementType
  defaultEnabled: boolean
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    key: 'comment',
    label: 'Comments',
    description: 'When someone comments on your posts',
    icon: MessageCircle,
    defaultEnabled: true,
  },
  {
    key: 'answer_accepted',
    label: 'Answer Accepted',
    description: 'When your answer is marked as accepted',
    icon: CheckCheck,
    defaultEnabled: true,
  },
  {
    key: 'team_invite',
    label: 'Team Invitations',
    description: 'When you receive a team invitation',
    icon: Users,
    defaultEnabled: true,
  },
  {
    key: 'team_member_joined',
    label: 'Team Activity',
    description: 'When new members join your teams',
    icon: Users,
    defaultEnabled: true,
  },
  {
    key: 'resource_shared',
    label: 'Resource Sharing',
    description: 'When resources are shared with you',
    icon: Star,
    defaultEnabled: true,
  },
  {
    key: 'usage_alert',
    label: 'Usage Alerts',
    description: 'When approaching usage limits',
    icon: Megaphone,
    defaultEnabled: true,
  },
  {
    key: 'system',
    label: 'System',
    description: 'Important system announcements',
    icon: ShieldCheck,
    defaultEnabled: true,
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Billing and subscription updates',
    icon: CreditCard,
    defaultEnabled: true,
  },
]

// ── LocalStorage helpers ──
const STORAGE_KEY = 'oneway-notification-prefs'

type PreferencesMap = Record<string, boolean>

function loadPreferences(): PreferencesMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PreferencesMap
  } catch {
    // ignore
  }
  return {}
}

function savePreferences(prefs: PreferencesMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

// ── Component ──

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<PreferencesMap>(() => {
    if (typeof window === 'undefined') return {}
    return loadPreferences()
  })

  const toggleType = useCallback((key: string, enabled: boolean) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: enabled }
      savePreferences(next)
      return next
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    const defaults: PreferencesMap = {}
    NOTIFICATION_TYPES.forEach((t) => {
      defaults[t.key] = t.defaultEnabled
    })
    setPreferences(defaults)
    savePreferences(defaults)
  }, [])

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Settings className="size-4 text-teal-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Choose which notifications you want to receive as toasts
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="text-[11px] text-muted-foreground hover:text-foreground gap-1.5 h-7 px-2"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((ntype) => {
            const isEnabled =
              preferences[ntype.key] !== undefined
                ? preferences[ntype.key]
                : ntype.defaultEnabled

            const Icon = ntype.icon

            return (
              <div
                key={ntype.key}
                className="flex items-center justify-between gap-3 py-1.5 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isEnabled
                        ? 'bg-teal-500/10'
                        : 'bg-muted/50'
                    }`}
                  >
                    <Icon
                      className={`size-4 transition-colors ${
                        isEnabled
                          ? 'text-teal-400'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor={`notif-${ntype.key}`}
                      className={`text-xs font-medium leading-none cursor-pointer transition-colors ${
                        isEnabled ? 'text-foreground' : 'text-muted-foreground/60'
                      }`}
                    >
                      {ntype.label}
                    </Label>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed truncate">
                      {ntype.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`notif-${ntype.key}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleType(ntype.key, checked)}
                  className="flex-shrink-0"
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
