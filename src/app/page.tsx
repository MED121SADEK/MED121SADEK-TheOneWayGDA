'use client'

import { Navbar, HeroSection, FeaturesSection, ComparisonSection, DemoSection, PricingSection, CTASection, FooterSection } from '@/components/landing'

export default function Home() {
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
