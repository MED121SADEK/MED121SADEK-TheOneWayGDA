'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Globe, ChevronRight, Loader2, Check } from 'lucide-react'

const LOCALE_META: Record<Locale, { label: string; flag: string; nativeLabel: string }> = {
  en: { label: 'English', flag: '\u{1F1EC}\u{1F1E7}', nativeLabel: 'English' },
  fr: { label: 'French', flag: '\u{1F1EB}\u{1F1F7}', nativeLabel: 'Fran\u00e7ais' },
  ar: { label: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}', nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  es: { label: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}', nativeLabel: 'Espa\u00f1ol' },
  de: { label: 'German', flag: '\u{1F1E9}\u{1F1EA}', nativeLabel: 'Deutsch' },
  zh: { label: 'Chinese', flag: '\u{1F1E8}\u{1F1F3}', nativeLabel: '\u4e2d\u6587' },
  ja: { label: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}', nativeLabel: '\u65e5\u672c\u8a9e' },
  ko: { label: 'Korean', flag: '\u{1F1F0}\u{1F1F7}', nativeLabel: '\ud55c\uad6d\uc5b4' },
}

const STORAGE_KEY = 'oneway-locale'

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null
  try {
    const langs = navigator.languages || [navigator.language || 'en']
    for (const lang of langs) {
      const code = lang.split('-')[0].toLowerCase() as Locale
      if ((localeNames as string[]).includes(code)) return code
    }
  } catch { /* ignore */ }
  return null
}

export function LanguageGate() {
  const { setLocale, dir } = useTranslation()
  const [visible, setVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [detected, setDetected] = useState<Locale | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Only run on client
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (localeNames as string[]).includes(saved)) {
      // Already has a language selected — skip gate
      setVisible(false)
    } else {
      setDetected(detectBrowserLocale())
    }
    setMounted(true)
  }, [])

  const handleSelect = useCallback((locale: Locale) => {
    if (isConfirming || confirmed) return
    setIsConfirming(true)
    setLocale(locale)
    // Small delay so the user sees the check animation
    setTimeout(() => {
      setConfirmed(true)
      setIsExiting(true)
      setTimeout(() => {
        setVisible(false)
      }, 400)
    }, 300)
  }, [isConfirming, confirmed, setLocale])

  // Don't render on server or if already dismissed
  if (!mounted || !visible) return null

  const isRtl = detected === 'ar'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-8 shadow-2xl shadow-primary/5">
              {/* Logo */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Image
                  src="/images/logo.png"
                  alt="TheOneWayGDA"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold gradient-text-premium">TheOneWayGDA</span>
              </div>

              {/* Heading */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Globe className="size-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-1">Choose Your Language</h2>
                <p className="text-sm text-muted-foreground">
                  {detected ? (
                    <>We detected <span className="font-medium text-foreground">{LOCALE_META[detected]?.nativeLabel}</span> — confirm or pick another</>
                  ) : (
                    <>Select your preferred language to continue</>
                  )}
                </p>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {localeNames.map((loc) => {
                  const meta = LOCALE_META[loc]
                  const isDetected = loc === detected
                  const isSelected = confirmed && loc === detected
                  const isDisabled = isConfirming

                  return (
                    <motion.button
                      key={loc}
                      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                      onClick={() => handleSelect(loc)}
                      disabled={isDisabled}
                      className={`
                        relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200
                        ${isDetected && !isConfirming
                          ? 'border-primary/50 bg-primary/10 shadow-sm shadow-primary/10'
                          : 'border-border/40 bg-muted/30 hover:border-primary/30 hover:bg-muted/50'
                        }
                        ${isDisabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
                      `}
                    >
                      {/* Check indicator for confirmed selection */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="size-3 text-primary-foreground" />
                        </motion.div>
                      )}

                      <span className="text-lg flex-shrink-0">{meta.flag}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{meta.nativeLabel}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{meta.label}</p>
                      </div>

                      {isDetected && !isConfirming && (
                        <div className="ml-auto flex-shrink-0">
                          <span className="text-[9px] uppercase tracking-wider text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Suggested
                          </span>
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Quick confirm for detected language */}
              {detected && !isConfirming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    onClick={() => handleSelect(detected)}
                    className="w-full gap-2 h-11 text-sm font-semibold"
                  >
                    Continue in {LOCALE_META[detected]?.nativeLabel}
                    <ChevronRight className="size-4" />
                  </Button>
                </motion.div>
              )}

              {/* Confirming state */}
              {isConfirming && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Setting up your language...</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}