'use client'

import { useState, useEffect, useRef } from 'react'
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
  Check, AlertCircle, Loader2, ChevronRight,
} from 'lucide-react'

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
  const [showNameField, setShowNameField] = useState(false)
  const [currentStep, setCurrentStep] = useState<'email' | 'name' | 'success'>('email')
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hasValidSession()) setIsGateVisible(false)
  }, [])

  useEffect(() => {
    if (isGateVisible && !isSubmitted && currentStep === 'email') {
      const timer = setTimeout(() => inputRef.current?.focus(), 600)
      return () => clearTimeout(timer)
    }
  }, [isGateVisible, isSubmitted, currentStep])

  useEffect(() => {
    if (isGateVisible && currentStep === 'name') {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [isGateVisible, currentStep])

  const handleDismiss = () => { setIsExiting(true); setTimeout(() => setIsGateVisible(false), 500) }

  const handleSubmitEmail = () => {
    if (!email.trim()) { setError(t('gate.emailRequired') || 'Please enter your email address.'); return }
    if (!isValidEmail(email.trim())) { setError(t('gate.emailInvalid') || 'Please enter a valid email address.'); return }
    setError(''); setShowNameField(true); setCurrentStep('name')
  }

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) { setError(t('gate.emailInvalid') || 'Please enter a valid email.'); return }
    setIsLoading(true); setError('')
    try {
      const res = await fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: name.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || (t('gate.error') || 'Something went wrong.')); setIsLoading(false); return }
      const session: VisitorSession = { email: normalizedEmail, name: name.trim(), timestamp: new Date().toISOString(), token: generateToken() }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setIsSubmitted(true); setCurrentStep('success')
      setTimeout(() => handleDismiss(), 1800)
    } catch { setError(t('gate.networkError') || 'Network error. Please try again.') }
    finally { setIsLoading(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { currentStep === 'email' ? handleSubmitEmail() : handleSubmit() }
  }

  if (!isGateVisible) return null

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.5 }} className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ direction: dir }}>
          <div className="absolute inset-0 bg-background">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-primary/20 rounded-full" initial={{ x: `${15 + i * 14}%`, y: `${20 + (i % 3) * 25}%` }} animate={{ y: [`${20 + (i % 3) * 25}%`, `${10 + (i % 3) * 25}%`, `${20 + (i % 3) * 25}%`], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }} />
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 w-full max-w-lg mx-4">
            <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
              <div className="px-8 pt-8 pb-4 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }} className="mx-auto mb-5">
                  <div className="relative inline-flex">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Image src="/images/logo.png" alt="TheOneWayGDA" width={48} height={48} className="rounded-xl" /></div>
                    <div className="absolute -top-1 -right-1 size-5 rounded-full bg-primary flex items-center justify-center"><Sparkles className="size-3 text-primary-foreground" /></div>
                  </div>
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-2xl font-bold tracking-tight">{t('gate.title') || 'Welcome to TheOneWayGDA'}</motion.h2>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{t('gate.subtitle') || 'Enter your email to access the AI-powered statistical analysis platform.'}</motion.p>
              </div>
              <div className="px-8 pb-6">
                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                      <div className="flex flex-wrap justify-center gap-2 mb-5">
                        {[{ icon: ShieldCheck, label: t('gate.trustSecure') || 'Secure' }, { icon: Users, label: t('gate.trustFree') || 'Free Access' }, { icon: Mail, label: t('gate.trustNoSpam') || 'No Spam' }].map((badge, i) => (
                          <motion.div key={badge.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.1 }}>
                            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs rounded-full border-border/50 bg-muted/30"><badge.icon className="size-3 text-primary" />{badge.label}</Badge>
                          </motion.div>
                        ))}
                      </div>
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t('gate.emailLabel') || 'Email Address'}</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input ref={inputRef} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} onKeyDown={handleKeyDown} placeholder={t('gate.emailPlaceholder') || 'you@example.com'} className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-all" disabled={isLoading} autoComplete="email" />
                        </div>
                      </motion.div>
                      <AnimatePresence>
                        {showNameField && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                            <label className="text-sm font-medium text-foreground">{t('gate.nameLabel') || 'Your Name'} <span className="text-muted-foreground font-normal ml-1">({t('gate.optional') || 'optional'})</span></label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input ref={nameInputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('gate.namePlaceholder') || 'John Doe'} className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-all" disabled={isLoading} autoComplete="name" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4 flex-shrink-0" /><span>{error}</span></motion.div>
                        )}
                      </AnimatePresence>
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                        <Button onClick={currentStep === 'email' ? handleSubmitEmail : handleSubmit} disabled={isLoading || !email.trim()} className="w-full h-12 rounded-xl text-base font-semibold gap-2" size="lg">
                          {isLoading ? (<><Loader2 className="size-4 animate-spin" />{t('gate.loading') || 'Verifying...'}</>) : currentStep === 'email' ? (<>{t('gate.continue') || 'Continue'}<ChevronRight className="size-4" /></>) : (<>{t('gate.submit') || 'Access Platform'}<ArrowRight className="size-4" /></>)}
                        </Button>
                      </motion.div>
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-xs text-muted-foreground leading-relaxed mt-2"><ShieldCheck className="inline size-3 mr-1 text-emerald-500" />{t('gate.privacy') || 'Your information is protected. We never share your data.'}</motion.p>
                    </motion.div>
                  ) : (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-4">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="mx-auto size-16 rounded-full bg-emerald-500/10 flex items-center justify-center"><Check className="size-8 text-emerald-500" /></motion.div>
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
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-center text-xs text-muted-foreground/60 mt-4">GDPR &middot; SOC 2 &middot; ISO 27001 Compliant</motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
