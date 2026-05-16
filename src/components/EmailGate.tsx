'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, Locale, localeNames } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Mail, ArrowRight, ShieldCheck, Globe, Users, Sparkles,
  Check, AlertCircle, Loader2, ChevronRight, UserCircle,
} from 'lucide-react'

// Lightweight animation variants — reduced from heavy spring/bounce to fast linear
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: 'easeOut' } }
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }

const SESSION_KEY = 'oneway-visitor-session'

interface VisitorSession {
  email: string
  name: string
  timestamp: string
  token: string
}

function generateToken(): string {
  const arr = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

function hasValidSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const session = localStorage.getItem(SESSION_KEY)
    if (!session) return false
    const parsed: VisitorSession = JSON.parse(session)
    const age = Date.now() - new Date(parsed.timestamp).getTime()
    if (age > 30 * 24 * 60 * 60 * 1000) { localStorage.removeItem(SESSION_KEY); return false }
    return !!parsed.email && !!parsed.token
  } catch { return false }
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
}

export function EmailGate() {
  const { t, locale, setLocale, dir } = useTranslation()
  const [isGateVisible, setIsGateVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [showExtraFields, setShowExtraFields] = useState(false)
  const [visitorType, setVisitorType] = useState('general')
  const [currentStep, setCurrentStep] = useState<'email' | 'details' | 'success'>('email')
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Pre-compute session validity — avoids re-check on every render
  const hasSession = useMemo(() => hasValidSession(), [])

  useEffect(() => {
    if (hasSession) setIsGateVisible(false)
  }, [hasSession])

  // Instant focus — no artificial delay
  useEffect(() => {
    if (isGateVisible && !isSubmitted && currentStep === 'email') {
      inputRef.current?.focus()
    }
  }, [isGateVisible, isSubmitted, currentStep])

  useEffect(() => {
    if (isGateVisible && currentStep === 'details') {
      nameInputRef.current?.focus()
    }
  }, [isGateVisible, currentStep])

  const handleDismiss = () => { setIsExiting(true); setTimeout(() => setIsGateVisible(false), 200) }

  const handleSubmitEmail = () => {
    if (!email.trim()) { setError(t('gate.emailRequired') || 'Please enter your email address.'); return }
    if (!isValidEmail(email.trim())) { setError(t('gate.emailInvalid') || 'Please enter a valid email address.'); return }
    setError(''); setShowExtraFields(true); setCurrentStep('details')
  }

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) { setError(t('gate.emailInvalid') || 'Please enter a valid email.'); return }
    setIsLoading(true); setError('')
    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: name.trim() || null, visitorType }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || (t('gate.error') || 'Something went wrong.')); setIsLoading(false); return }
      const session: VisitorSession = { email: normalizedEmail, name: name.trim(), timestamp: new Date().toISOString(), token: generateToken() }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setIsSubmitted(true); setCurrentStep('success')
      setTimeout(() => handleDismiss(), 600)
    } catch { setError(t('gate.networkError') || 'Network error. Please try again.') }
    finally { setIsLoading(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { currentStep === 'email' ? handleSubmitEmail() : handleSubmit() }
  }

  // Returning visitors: skip rendering entirely for instant access
  if (!isGateVisible && hasSession) return null

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ direction: dir }}>
          {/* Simplified background — no particles, no grid, no animated blurs */}
          <div className="absolute inset-0 bg-background">
            <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
          </div>
          <motion.div {...fadeUp} exit={{ opacity: 0 }} className="relative z-10 w-full max-w-lg mx-4">
            <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
              <div className="px-8 pt-8 pb-4 text-center">
                <motion.div {...fadeIn} transition={{ duration: 0.1 }} className="mx-auto mb-5">
                  <div className="relative inline-flex">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Image src="/images/logo.png" alt="TheOneWayGDA" width={48} height={48} className="rounded-xl" /></div>
                    <div className="absolute -top-1 -right-1 size-5 rounded-full bg-primary flex items-center justify-center"><Sparkles className="size-3 text-primary-foreground" /></div>
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">{t('gate.title') || 'Welcome to TheOneWayGDA'}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{t('gate.subtitle') || 'Enter your email to access the AI-powered statistical analysis platform.'}</p>
              </div>
              <div className="px-8 pb-6">
                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                      <div className="flex flex-wrap justify-center gap-2 mb-5">
                        {[{ icon: ShieldCheck, label: t('gate.trustSecure') || 'Secure' }, { icon: Users, label: t('gate.trustFree') || 'Free Access' }, { icon: Mail, label: t('gate.trustNoSpam') || 'No Spam' }].map((badge) => (
                          <Badge key={badge.label} variant="outline" className="gap-1.5 px-2.5 py-1 text-xs rounded-full border-border/50 bg-muted/30"><badge.icon className="size-3 text-primary" />{badge.label}</Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t('gate.emailLabel') || 'Email Address'}</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input ref={inputRef} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} onKeyDown={handleKeyDown} placeholder={t('gate.emailPlaceholder') || 'you@example.com'} className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-all" disabled={isLoading} autoComplete="email" />
                        </div>
                      </div>
                      <AnimatePresence>
                        {showExtraFields && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">{t('gate.nameLabel') || 'Your Name'} <span className="text-muted-foreground font-normal ml-1">({t('gate.optional') || 'optional'})</span></label>
                              <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input ref={nameInputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('gate.namePlaceholder') || 'John Doe'} className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-all" disabled={isLoading} autoComplete="name" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                <UserCircle className="size-4 text-primary" />
                                {t('gate.visitorType') || 'I am a...'}
                              </label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[{ value: 'researcher', icon: '🔬' }, { value: 'student', icon: '🎓' }, { value: 'professional', icon: '💼' }, { value: 'enterprise', icon: '🏢' }, { value: 'developer', icon: '💻' }, { value: 'educator', icon: '📚' }, { value: 'general', icon: '🌐' }].map((vt) => (
                                  <button key={vt.value} type="button" onClick={() => setVisitorType(vt.value)} disabled={isLoading}
                                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${visitorType === vt.value ? 'border-primary bg-primary/10 ring-1 ring-primary/20' : 'border-border/40 bg-muted/20 hover:border-border/60 hover:bg-muted/30'}`}>
                                    <span className="text-base">{vt.icon}</span>
                                    <span className={`text-[10px] leading-tight ${visitorType === vt.value ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{t(`gate.type.${vt.value}`) || vt.value}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4 flex-shrink-0" /><span>{error}</span></motion.div>
                        )}
                      </AnimatePresence>
                      <Button onClick={currentStep === 'email' ? handleSubmitEmail : handleSubmit} disabled={isLoading || !email.trim()} className="w-full h-12 rounded-xl text-base font-semibold gap-2" size="lg">
                        {isLoading ? (<><Loader2 className="size-4 animate-spin" />{t('gate.loading') || 'Verifying...'}</>) : currentStep === 'email' ? (<>{t('gate.continue') || 'Continue'}<ChevronRight className="size-4" /></>) : (<>{t('gate.submit') || 'Access Platform'}<ArrowRight className="size-4" /></>)}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground leading-relaxed mt-2"><ShieldCheck className="inline size-3 mr-1 text-emerald-500" />{t('gate.privacy') || 'Your information is protected. We never share your data.'}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center space-y-4">
                      <div className="mx-auto size-16 rounded-full bg-emerald-500/10 flex items-center justify-center"><Check className="size-8 text-emerald-500" /></div>
                      <h3 className="text-xl font-bold">{t('gate.welcome') || 'Welcome!'}</h3>
                      <p className="text-sm text-muted-foreground">{t('gate.redirecting') || 'Redirecting you to the platform...'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="px-8 py-4 border-t border-border/30 bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('gate.visitorCount') || 'Join thousands of researchers'}</span>
                  <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                    <SelectTrigger className="h-8 w-28 text-xs border-border/30"><Globe className="size-3 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-4">GDPR &middot; SOC 2 &middot; ISO 27001 Compliant</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
