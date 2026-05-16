'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowRight, Menu, ChevronDown, Globe,
} from 'lucide-react'

export function Navbar() {
  const { t, locale, setLocale } = useTranslation()
  const store = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="sticky top-0 z-50 nav-premium">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="TheOneWayGDA" width={36} height={36} className="rounded-lg" />
          <span className="text-xl font-bold gradient-text-premium">{t('brand.name')}</span>
        </button>
        {/* Primary nav links - always visible on lg+ */}
        <div className="hidden lg:flex items-center gap-6 flex-shrink-0">
          {[
            { label: t('nav.features'), href: '#features' },
            { label: t('nav.comparison'), href: '#comparison' },
            { label: t('nav.workspace'), href: '#demo' },
            { label: t('nav.pricing'), href: '#pricing' },
          ].map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">{l.label}</button>
          ))}
          {/* Secondary links in More dropdown to prevent overflow */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap">
                {t('nav.more') || 'More'} <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {[
                { label: t('nav.community') || 'Community', href: '/community' },
                { label: t('lb.badge') || 'Leaderboard', href: '/leaderboard' },
                { label: 'AI Automation', href: '/ai' },
                { label: 'AI Governance', href: '/ai/governance' },
                { label: t('nav.about'), href: '/about' },
                { label: t('nav.security'), href: '/security' },
                { label: t('nav.company'), href: '/company' },
                { label: t('nav.updates'), href: '/updates' },
                { label: t('nav.tutorials'), href: '/tutorials' },
                { label: t('modules.title'), href: '/modules' },
              ].map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href} className="cursor-pointer">{l.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-9 w-32 text-xs"><Globe className="size-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" className="rounded-full px-5" onClick={() => store.setView('workspace')}><ArrowRight className="size-4" /> {t('nav.workspace')}</Button>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /></Button></SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader><SheetTitle className="flex items-center gap-2"><Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded" />{t('brand.name')}</SheetTitle></SheetHeader>
            <div className="flex flex-col gap-4 mt-8 px-4">
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger className="h-9 text-xs"><Globe className="size-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>{localeNames.map(l => <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>)}</SelectContent>
              </Select>
              {[
                { label: t('nav.features'), href: '#features' },
                { label: t('nav.comparison'), href: '#comparison' },
                { label: t('nav.workspace'), href: '#demo' },
                { label: t('nav.pricing'), href: '#pricing' },
                { label: t('nav.community') || 'Community', href: '/community' },
                { label: t('lb.badge') || 'Leaderboard', href: '/leaderboard' },
                { label: 'AI Automation', href: '/ai' },
                { label: 'AI Governance', href: '/ai/governance' },
                { label: t('nav.about'), href: '/about' },
                { label: t('nav.security'), href: '/security' },
                { label: t('nav.company'), href: '/company' },
                { label: t('nav.updates'), href: '/updates' },
                { label: t('nav.tutorials'), href: '/tutorials' },
                { label: t('modules.title'), href: '/modules' },
              ].map((l) => (
                l.href.startsWith('/') ? (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2">{l.label}</Link>
                ) : (
                  <button key={l.href} onClick={() => scrollTo(l.href)} className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2">{l.label}</button>
                )
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
