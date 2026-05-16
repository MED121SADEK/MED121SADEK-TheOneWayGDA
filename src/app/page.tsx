'use client'

import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Navbar, HeroSection, FeaturesSection, ComparisonSection, DemoSection, PricingSection, CTASection, FooterSection } from '@/components/landing'

export default function Home() {
  const store = useAppStore()
  const router = useRouter()

  /* ─── WORKSPACE VIEW → redirect to /workspace route ─── */
  if (store.view === 'workspace') {
    if (typeof window !== 'undefined') {
      router.push('/workspace')
    }
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
