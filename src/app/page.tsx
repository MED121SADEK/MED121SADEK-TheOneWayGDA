'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Navbar, HeroSection, FeaturesSection, ComparisonSection, DemoSection, PricingSection, CTASection, FooterSection } from '@/components/landing'

export default function Home() {
  const store = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)

  /* ─── WORKSPACE VIEW → redirect to /workspace route ─── */
  useEffect(() => {
    if (store.view === 'workspace' && !hasRedirected.current) {
      hasRedirected.current = true
      // Use replace instead of push to avoid polluting browser history
      // This prevents the back-button infinite loop bug
      router.replace('/workspace')
    }
  }, [store.view, router])

  // Reset the redirect flag when pathname changes (user navigated back)
  useEffect(() => {
    hasRedirected.current = false
  }, [pathname])

  /* ─── WORKSPACE VIEW → loading state ─── */
  if (store.view === 'workspace') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  /* ─── LANDING PAGE ─── */
  return (
    <div className="min-h-screen flex flex-col noise-overlay">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ComparisonSection />
      <DemoSection />
      <PricingSection />
      <CTASection />
      <FooterSection />
    </div>
  )
}
