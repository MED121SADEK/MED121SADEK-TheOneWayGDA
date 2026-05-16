'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ShieldCheck, Mail } from 'lucide-react'
import { LinkedInIcon, InstagramIcon, TikTokIcon } from '@/components/BrandIcons'

export function FooterSection() {
  const { t } = useTranslation()

  const scrollTo = (href: string) => {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const footerColumns = [
    { title: t('footer.product'), links: [{ label: t('nav.features'), href: '#features' }, { label: t('nav.pricing'), href: '#pricing' }, { label: t('nav.workspace'), href: '/workspace' }] },
    { title: t('footer.resources'), links: [{ label: t('footer.documentation'), href: '/tutorials' }, { label: t('footer.api'), href: '/leaderboard' }, { label: t('nav.community') || 'Community', href: '/community' }] },
    { title: t('footer.company'), links: [{ label: t('footer.about'), href: '/about' }, { label: t('footer.blog'), href: '/updates' }, { label: t('footer.contact'), href: '/company' }] },
  ]

  return (
    <footer className="mt-auto footer-premium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4"><Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded-lg" /><span className="text-lg font-bold gradient-text-premium">{t('brand.name')}</span></div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mt-3">{t('footer.desc')}</p>
          </div>
          {footerColumns.map(col => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">{col.links.map(l => (
                <li key={l.href}>
                  {l.href.startsWith('/') ? (
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                  ) : (
                    <button onClick={() => scrollTo(l.href)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</button>
                  )}
                </li>
              ))}</ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t border-border/50 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">{t('footer.compliance')}</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <a href="mailto:msad41855@gmail.com" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
              <Mail className="size-4" />
            </a>
            <a href="https://www.linkedin.com/in/mohammed-essadek-549a17229" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
              <LinkedInIcon size={16} />
            </a>
            <a href="https://www.instagram.com/the_one_way_community/" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
              <InstagramIcon size={16} />
            </a>
            <a href="https://www.tiktok.com/@the1way1" target="_blank" rel="noopener noreferrer" className="size-9 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
              <TikTokIcon size={16} />
            </a>
          </div>
        </div>
        <div className="mt-4 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.about')}</Link>
            <Link href="/company" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.company')}</Link>
            <Link href="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.security')}</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
            <Link href="/modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('modules.title')}</Link>
            <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('lb.badge') || 'Leaderboard'}</Link>
            <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.community') || 'Community'}</Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
