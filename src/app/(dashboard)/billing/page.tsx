'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Globe, CreditCard, Zap, Crown, Building2, Check,
  Loader2, Shield, Users, Database, BarChart3, Workflow, Star,
  Rocket, HeadphonesIcon, Lock,
} from 'lucide-react'

interface BillingData {
  plan: string; status: string
  limits: { apiCallsPerDay: number; workflowsPerMonth: number; teamMembers: number; storageMb: number }
  usage: { apiCallsToday: number; workflowsThisMonth: number; teamMembers: number; storageUsedMb: number }
  currentPeriodStart: string; currentPeriodEnd: string | null
  upgradeOptions: { plan: string; price: number; currency: string; period: string; features: string[] }[]
}

interface UsageData {
  totalRequests: number; totalTokens: number; totalCost: number
  byCategory: Record<string, number>; dailyUsage: { date: string; requests: number }[]
}

function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) as { id: string; email: string; name: string | null; role: string } }
  } catch { return null }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

const PLANS = [
  {
    key: 'free', name: 'Free', price: 0, icon: Zap, color: 'text-gray-400',
    gradient: 'from-gray-500 to-gray-600', features: [
      '100 API calls / day', '5 workflows / month', '3 team members', '100 MB storage',
      'Community templates', 'Basic analytics',
    ]
  },
  {
    key: 'pro', name: 'Pro', price: 29, icon: Crown, popular: true, color: 'text-primary',
    gradient: 'from-primary to-violet-600', features: [
      '1,000 API calls / day', 'Unlimited workflows', '25 team members', '10 GB storage',
      'AI Copilot access', 'Advanced analytics', 'Priority support', 'Custom automations',
    ]
  },
  {
    key: 'enterprise', name: 'Enterprise', price: 99, icon: Building2, color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-600', features: [
      'Unlimited API calls', 'Unlimited everything', 'Unlimited team members', '100 GB storage',
      'Dedicated support', 'Custom integrations', 'SLA guarantee', 'SSO / SAML', 'Audit logs',
    ]
  },
]

export default function BillingPage() {
  const router = useRouter()
  const { locale, setLocale, dir } = useTranslation()
  const session = getSession()

  const [billing, setBilling] = useState<BillingData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [upgradedPlan, setUpgradedPlan] = useState<string | null>(null)

  useEffect(() => {
    if (!session) { router.push('/auth/login'); return }
    Promise.all([fetchBilling(), fetchUsage()])
  }, [router, session])

  const fetchBilling = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/billing?token=${session.token}`)
      const json = await res.json()
      if (json.success) setBilling(json.data)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [session])

  const fetchUsage = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/usage?token=${session.token}&period=month`)
      const json = await res.json()
      if (json.success) setUsage(json.data)
    } catch { /* silent */ }
  }, [session])

  const handleUpgrade = async (plan: string) => {
    if (!session) return
    setUpgrading(plan)
    try {
      const res = await fetch(`/api/billing?token=${session.token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (json.success) {
        setUpgradedPlan(plan)
        fetchBilling()
        setTimeout(() => setUpgradedPlan(null), 3000)
      }
    } catch { /* silent */ } finally { setUpgrading(null) }
  }

  if (!session) return null
  if (loading) return <div className="h-screen flex items-center justify-center mesh-gradient"><Loader2 className="size-8 text-primary animate-spin" /></div>

  const currentPlan = billing?.plan || 'free'
  const planIndex = PLANS.findIndex(p => p.key === currentPlan)

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="size-4" /></Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">Billing & Plans</span>
          </div>
          <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'fr' | 'ar' | 'zh' | 'es' | 'de' | 'ja' | 'ko')}>
            <SelectTrigger className="h-8 w-20 text-xs"><Globe className="size-3 mr-0.5" /><SelectValue /></SelectTrigger>
            <SelectContent>{['en','fr','ar','zh','es','de','ja','ko'].map(l => <SelectItem key={l} value={l} className="text-xs">{l.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">
        {/* ── Current Plan ── */}
        <motion.div {...fadeUp} className="hero-gradient rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white">
                <CreditCard className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Current Plan: <span className="gradient-text-premium capitalize">{currentPlan}</span></h1>
                <p className="text-sm text-muted-foreground">
                  Status: <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/25">{billing?.status || 'active'}</Badge>
                </p>
              </div>
            </div>

            {billing && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'API Calls Today', used: billing.usage.apiCallsToday, limit: billing.limits.apiCallsPerDay, icon: Zap },
                  { label: 'Workflows / Month', used: billing.usage.workflowsThisMonth, limit: billing.limits.workflowsPerMonth, icon: Workflow },
                  { label: 'Team Members', used: billing.usage.teamMembers, limit: billing.limits.teamMembers, icon: Users },
                  { label: 'Storage', used: billing.usage.storageUsedMb, limit: billing.limits.storageMb, icon: Database, suffix: ' MB' },
                ].map(item => {
                  const pct = item.limit > 0 ? Math.min((item.used / item.limit) * 100, 100) : 0
                  const isUnlimited = item.limit >= 999999
                  return (
                    <div key={item.label} className="p-4 rounded-xl bg-black/20 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="size-4 text-primary" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-xl font-bold">
                        {isUnlimited ? 'Unlimited' : (
                          <><span className={pct > 80 ? 'text-amber-400' : ''}>{item.used}</span>
                          <span className="text-sm text-muted-foreground font-normal"> / {item.limit.toLocaleString()}{item.suffix || ''}</span></>
                        )}
                      </p>
                      {!isUnlimited && (
                        <Progress value={pct} className="mt-2 h-1.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Usage Summary ── */}
        {usage && (
          <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Requests', value: usage.totalRequests.toLocaleString(), icon: BarChart3, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Tokens Used', value: usage.totalTokens.toLocaleString(), icon: Zap, color: 'text-purple-400 bg-purple-500/10' },
              { label: 'Est. Cost', value: `$${usage.totalCost.toFixed(2)}`, icon: CreditCard, color: 'text-emerald-400 bg-emerald-500/10' },
              { label: 'Categories', value: Object.keys(usage.byCategory).length.toString(), icon: Star, color: 'text-amber-400 bg-amber-500/10' },
            ].map(s => (
              <Card key={s.label} className="card-premium p-4">
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <s.icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        )}

        {/* ── Plan Cards ── */}
        <div>
          <h2 className="text-xl font-bold mb-4">Choose Your Plan</h2>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6" {...stagger}>
            {PLANS.map((plan, i) => {
              const isCurrent = plan.key === currentPlan
              const isDowngrade = PLANS.findIndex(p => p.key === plan.key) < planIndex
              return (
                <motion.div key={plan.key} {...fadeUp} transition={{ ...fadeUp.animate.transition, delay: i * 0.06 }}>
                  <Card className={`card-premium relative h-full flex flex-col ${plan.popular ? 'ring-1 ring-primary/30' : ''} ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-3">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                          <plan.icon className="size-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">${plan.price}</span>
                            {plan.price > 0 && <span className="text-xs text-muted-foreground">/month</span>}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col">
                      <ul className="space-y-2 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <Check className="size-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Separator className="my-4" />
                      {isCurrent ? (
                        <Button className="w-full" variant="outline" disabled>
                          <Check className="size-3.5 mr-1.5" />Current Plan
                          {upgradedPlan === plan.key && <span className="ml-2 text-emerald-400">Upgraded!</span>}
                        </Button>
                      ) : plan.key === 'enterprise' ? (
                        <Button className="w-full" variant="outline" onClick={() => handleUpgrade(plan.key)} disabled={upgrading === plan.key}>
                          {upgrading === plan.key ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Rocket className="size-3.5 mr-1.5" />}
                          Contact Sales
                        </Button>
                      ) : (
                        <Button className="w-full" onClick={() => handleUpgrade(plan.key)} disabled={upgrading === plan.key || isDowngrade}>
                          {upgrading === plan.key ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Crown className="size-3.5 mr-1.5" />}
                          Upgrade to {plan.name}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* ── Feature Comparison ── */}
        <motion.div {...fadeUp}>
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="size-4 text-primary" />Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Feature</th>
                    {PLANS.map(p => (
                      <th key={p.key} className="text-center py-2 px-3 font-medium capitalize">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'API Calls / Day', values: ['100', '1,000', 'Unlimited'] },
                    { feature: 'Workflows / Month', values: ['5', 'Unlimited', 'Unlimited'] },
                    { feature: 'Team Members', values: ['3', '25', 'Unlimited'] },
                    { feature: 'Storage', values: ['100 MB', '10 GB', '100 GB'] },
                    { feature: 'AI Copilot', values: ['Basic', 'Full', 'Full'] },
                    { feature: 'Priority Support', values: ['No', 'Yes', 'Dedicated'] },
                    { feature: 'Custom Integrations', values: ['No', 'No', 'Yes'] },
                    { feature: 'SSO / SAML', values: ['No', 'No', 'Yes'] },
                    { feature: 'SLA Guarantee', values: ['No', 'No', '99.9%'] },
                    { feature: 'Audit Logs', values: ['No', '7 days', 'Unlimited'] },
                  ].map(row => (
                    <tr key={row.feature} className="border-b border-border/10">
                      <td className="py-2 pr-4 text-muted-foreground">{row.feature}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          {v === 'No' ? <span className="text-red-400/60">&mdash;</span> :
                           v === 'Unlimited' || v === 'Yes' || v === 'Full' || v === 'Dedicated' ? <Check className="size-4 text-emerald-400 mx-auto" /> :
                           <span>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
