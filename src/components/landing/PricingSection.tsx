'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Check, ChevronRight, Loader2 } from 'lucide-react'
import { AnimatedSection } from './AnimatedSection'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function PricingSection() {
  const { t } = useTranslation()
  const store = useAppStore()
  const router = useRouter()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const pricingPlans = [
    { name: t('plan.free'), price: '$0', period: t('plan.month'), desc: t('plan.freeDesc'), features: [t('planFeature.datasets'), t('planFeature.basicAI'), t('planFeature.offline'), t('planFeature.basicImport'), t('planFeature.community')], cta: t('plan.cta'), highlighted: false, planKey: 'free' },
    { name: t('plan.pro'), price: '$19', period: t('plan.month'), desc: t('plan.proDesc'), features: [t('planFeature.unlimited'), t('planFeature.advancedAI'), t('planFeature.ocr'), t('planFeature.exportFormats'), t('planFeature.priority'), t('planFeature.realtime')], cta: t('plan.cta'), highlighted: true, planKey: 'pro' },
    { name: t('plan.enterprise'), price: 'Custom', period: '', desc: t('plan.enterpriseDesc'), features: [t('planFeature.customAI'), t('planFeature.onpremise'), t('planFeature.api'), t('planFeature.dedicated'), t('planFeature.sla'), t('planFeature.team')], cta: t('plan.contactSales'), highlighted: false, planKey: 'enterprise' },
  ]

  /** Handle Stripe checkout redirect for paid plans */
  const handleCheckout = async (planKey: string) => {
    // Try to get auth token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('oneway-auth-token') : null

    setCheckoutLoading(planKey)
    try {
      const res = await fetch(`/api/checkout?token=${token || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const json = await res.json()

      if (json.success && json.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = json.data.url
      } else {
        // No auth or checkout failed — redirect to auth page
        store.setView('workspace')
      }
    } catch {
      store.setView('workspace')
    } finally {
      setCheckoutLoading(null)
    }
  }

  /** Handle enterprise contact */
  const handleContactSales = () => {
    window.open('mailto:sales@theonewaygda.com?subject=Enterprise%20Plan%20Inquiry', '_blank')
  }

  /** Handle free plan */
  const handleFreePlan = () => {
    store.setView('workspace')
  }

  /** Get onClick handler for a plan */
  const getButtonHandler = (planKey: string) => {
    switch (planKey) {
      case 'pro':
        return () => handleCheckout('pro')
      case 'enterprise':
        return handleContactSales
      case 'free':
      default:
        return handleFreePlan
    }
  }

  return (
    <section id="pricing" className="py-20 md:py-32 mesh-gradient relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="text-center mb-16">
            <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/30 bg-primary/5 mb-4"><Zap className="size-3.5 text-primary" />{t('pricing.badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">{t('pricing.title1')} <span className="gradient-text-premium">{t('pricing.titleHighlight')}</span></h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">{t('pricing.subtitle')}</p>
          </motion.div>
        </AnimatedSection>
        <AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.name} variants={fadeUp} custom={i} className={plan.highlighted ? 'md:-mt-4' : ''}>
                <Card className={`card-premium h-full relative flex flex-col bg-card/80 backdrop-blur-sm ${plan.highlighted ? 'gradient-border !border-transparent shadow-2xl shadow-primary/10' : ''}`}>
                  {plan.highlighted && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2"><Badge className="btn-glow rounded-full px-4 py-1 bg-primary text-primary-foreground shadow-md shadow-primary/20">{t('pricing.popular')}</Badge></div>}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-muted-foreground">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-2"><span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>{plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}</div>
                    <CardDescription className="mt-2">{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1"><ul className="space-y-3 mt-2">{plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-400 flex-shrink-0" /><span className="text-muted-foreground">{f}</span></li>)}</ul></CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full rounded-full ${plan.highlighted ? '' : ''}`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                      disabled={checkoutLoading === plan.planKey}
                      onClick={getButtonHandler(plan.planKey)}
                    >
                      {checkoutLoading === plan.planKey ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : null}
                      {plan.cta}
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
