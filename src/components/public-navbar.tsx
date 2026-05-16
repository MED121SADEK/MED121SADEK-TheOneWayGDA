'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu, Globe, ChevronDown, ArrowRight, LayoutDashboard,
  Trophy, Users, Sparkles, BookOpen, Bell, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserData {
  id: string
  email: string
  name: string | null
  role: string
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Community', href: '/community' },
  { label: 'AI', href: '/ai' },
  { label: 'About', href: '/about' },
  { label: 'Tutorials', href: '/tutorials' },
  { label: 'Updates', href: '/updates' },
]

const AI_DROPDOWN = [
  { label: 'AI SDK', href: '/ai/sdk' },
  { label: 'Extensions', href: '/ai/extensions' },
  { label: 'Workflows', href: '/ai/workflows' },
  { label: 'Templates', href: '/ai/templates' },
  { label: 'Governance', href: '/ai/governance' },
]

function getUser(): UserData | null {
  if (typeof window === 'undefined') return null
  try {
    const userStr = localStorage.getItem('oneway-user')
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function PublicNavbar() {
  const { t, locale, setLocale } = useTranslation()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setUser(getUser())

    const handleStorage = () => setUser(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isAiSection = pathname.startsWith('/ai/')
  const isAiRoot = pathname === '/ai'

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-200',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
          : 'bg-background/60 backdrop-blur-md'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/images/logo.png" alt="TheOneWayGDA" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold gradient-text-premium hidden sm:inline">
            {t('brand.name')}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {NAV_LINKS.filter((l) => l.label !== 'AI').map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                isActive(link.href)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* AI Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1',
                  isAiSection || isAiRoot
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                AI <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/ai" className="cursor-pointer">AI Overview</Link>
              </DropdownMenuItem>
              {AI_DROPDOWN.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="cursor-pointer">{item.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Right */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <Globe className="size-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeNames.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">
                  {l.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <LayoutDashboard className="size-3.5" />
                  Dashboard
                </Button>
              </Link>
              <Avatar className="size-8 cursor-pointer" onClick={() => window.location.href = '/settings'}>
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user.name
                    ? user.name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2)
                    : user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="gap-1.5 rounded-full">
                  <ArrowRight className="size-3.5" />
                  Request Access
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded" />
                {t('brand.name')}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6 px-4">
              {/* Locale */}
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger className="h-8 text-xs">
                  <Globe className="size-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localeNames.map((l) => (
                    <SelectItem key={l} value={l} className="text-xs">
                      {l.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-px bg-border/50 my-2" />

              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'text-left text-sm font-medium py-2.5 px-3 rounded-lg transition-colors',
                    isActive(link.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* AI sub-links */}
              <div className="pl-3 border-l-2 border-primary/20 space-y-0.5 mt-1">
                {AI_DROPDOWN.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block text-left text-xs font-medium py-1.5 px-3 rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="h-px bg-border/50 my-2" />

              {user ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user.name
                        ? user.name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2)
                        : user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full gap-1.5">
                      <ArrowRight className="size-3.5" />
                      Request Access
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
