'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Cookie, Shield, ChevronDown, ChevronUp, BarChart3, Megaphone } from 'lucide-react'
import Link from 'next/link'

const CONSENT_KEY = 'theoneway_cookie_consent'

type ConsentState = {
  essential: boolean
  analytics: boolean
  marketing: boolean
  decided: boolean
}

const defaultConsent: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  decided: false,
}

export function GdprConsent() {
  const { t, dir } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [consent, setConsent] = useState<ConsentState>(defaultConsent)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(CONSENT_KEY)
        if (!stored) {
          setVisible(true)
        }
      } catch {
        setVisible(true)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const saveConsent = (state: ConsentState) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...state, decided: true }))
    } catch {
      // localStorage may be unavailable
    }
    setVisible(false)
  }

  const handleAcceptAll = () => {
    const full = { essential: true, analytics: true, marketing: true, decided: true }
    setConsent(full)
    saveConsent(full)
  }

  const handleRejectNonEssential = () => {
    const minimal = { essential: true, analytics: false, marketing: false, decided: true }
    setConsent(minimal)
    saveConsent(minimal)
  }

  const handleSavePreferences = () => {
    saveConsent(consent)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4"
          dir={dir}
        >
          <div className="max-w-3xl mx-auto">
            <Card className="border-primary/20 bg-card/90 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cookie className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base">{t('gdpr.title')}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      {t('gdpr.desc')}
                    </p>
                  </div>
                  <Link
                    href="/privacy"
                    className="text-xs text-primary hover:underline flex-shrink-0 mt-0.5"
                  >
                    {t('gdpr.moreInfo')}
                  </Link>
                </div>

                {/* Expandable Preferences */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        {/* Essential */}
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Shield className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{t('gdpr.essential')}</p>
                              <p className="text-xs text-muted-foreground">{t('gdpr.essentialDesc')}</p>
                            </div>
                          </div>
                          <Switch checked={true} disabled aria-label={t('gdpr.essential')} />
                        </div>

                        {/* Analytics */}
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                              <BarChart3 className="size-4 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{t('gdpr.analytics')}</p>
                              <p className="text-xs text-muted-foreground">{t('gdpr.analyticsDesc')}</p>
                            </div>
                          </div>
                          <Switch
                            checked={consent.analytics}
                            onCheckedChange={(checked) => setConsent(prev => ({ ...prev, analytics: checked }))}
                            aria-label={t('gdpr.analytics')}
                          />
                        </div>

                        {/* Marketing */}
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <Megaphone className="size-4 text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{t('gdpr.marketing')}</p>
                              <p className="text-xs text-muted-foreground">{t('gdpr.marketingDesc')}</p>
                            </div>
                          </div>
                          <Switch
                            checked={consent.marketing}
                            onCheckedChange={(checked) => setConsent(prev => ({ ...prev, marketing: checked }))}
                            aria-label={t('gdpr.marketing')}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button size="sm" onClick={handleSavePreferences} className="gap-2">
                          {t('gdpr.save')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {!expanded ? (
                    <>
                      <Button size="sm" onClick={handleAcceptAll} className="gap-1.5">
                        {t('gdpr.accept')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleRejectNonEssential}>
                        {t('gdpr.reject')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded(true)}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {t('gdpr.manage')}
                        <ChevronUp className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(false)}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      {t('gdpr.manage')}
                      <ChevronDown className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
