'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation, localeNames, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BarChart3, Settings, CreditCard, Bell, Code2,
  Bot, Users, PanelLeftClose, PanelLeft, Menu, LogOut, Globe,
  FolderOpen, Workflow, Sparkles, ChevronDown, Trophy, ExternalLink,
  type LucideIcon,
} from 'lucide-react'

/* ─── Types ─── */
interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  badgeColor?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface UserData {
  id: string
  email: string
  name: string | null
  role: string
}

/* ─── Helpers ─── */
function getSession(): { token: string; user: UserData } | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('oneway-auth-token')
    const userStr = localStorage.getItem('oneway-user')
    if (!token || !userStr) return null
    return { token, user: JSON.parse(userStr) }
  } catch {
    return null
  }
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2)
  return email.charAt(0).toUpperCase()
}

/* ─── Nav Sections ─── */
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Workspace', href: '/workspace', icon: FolderOpen },
      { label: 'Workflow', href: '/workflow/new', icon: Workflow },
      { label: 'Assistants', href: '/assistants', icon: Bot },
      { label: 'AI Platform', href: '/ai', icon: Sparkles },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Teams', href: '/teams', icon: Users },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Billing', href: '/billing', icon: CreditCard },
      { label: 'Notifications', href: '/notifications', icon: Bell, badge: '0', badgeColor: 'bg-primary text-primary-foreground' },
      { label: 'Developers', href: '/developers', icon: Code2 },
    ],
  },
]

/* ─── Sidebar Content (shared between desktop & mobile) ─── */
function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { locale, setLocale } = useTranslation()
  const session = getSession()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (session) {
      fetch(`/api/notifications?token=${session.token}&limit=1&unreadOnly=true`)
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.total || 0))
        .catch(() => {})
    }
  }, [session, pathname])

  const handleLogout = useCallback(async () => {
    if (session) {
      await fetch(`/api/auth/logout?token=${session.token}`, { method: 'POST' }).catch(() => {})
    }
    localStorage.removeItem('oneway-auth-token')
    localStorage.removeItem('oneway-user')
    // Use replace so back button doesn't loop back to dashboard after logout
    router.replace('/')
  }, [session, router])

  const user = session?.user
  const initials = user ? getInitials(user.name, user.email) : 'U'
  const roleColor = user?.role === 'admin'
    ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
    : user?.role === 'pro'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
      : 'bg-primary/15 text-primary border-primary/25'

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const notifBadge = unreadCount > 0
    ? String(unreadCount)
    : undefined

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-border/50 flex-shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0" onClick={onNavigate}>
          <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg" />
          {!collapsed && (
            <span className="text-base font-bold gradient-text-premium whitespace-nowrap">
              TheOneWayGDA
            </span>
          )}
        </Link>
      </div>

      {/* ── Navigation ── */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  const showBadge = item.label === 'Notifications' ? notifBadge : item.badge
                  const badgeCls = item.label === 'Notifications' && notifBadge
                    ? 'bg-primary text-primary-foreground'
                    : item.badgeColor

                  const linkContent = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                        collapsed && 'justify-center px-2',
                        active
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <item.icon className={cn(
                        'size-4 flex-shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )} />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {!collapsed && showBadge && (
                        <Badge className={cn('ml-auto text-[9px] px-1.5 py-0 h-4', badgeCls)}>
                          {showBadge}
                        </Badge>
                      )}
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <TooltipProvider key={item.href} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {item.label}
                            {showBadge && <span className="ml-1">({showBadge})</span>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Footer: User + Locale + Logout + Public Link ── */}
      <div className="border-t border-border/50 px-3 py-3 flex-shrink-0 space-y-2">
        {/* Visit Public Site */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 text-muted-foreground hover:text-primary hover:bg-primary/5',
            collapsed && 'justify-center px-2'
          )}
        >
          <ExternalLink className="size-3.5 flex-shrink-0" />
          {!collapsed && <span>Visit Public Site</span>}
        </Link>
        {/* Locale selector */}
        {!collapsed && (
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-7 w-full text-[10px] bg-muted/30 border-border/30">
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
        )}

        {user && (
          <div className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg bg-muted/30',
            collapsed ? 'justify-center' : ''
          )}>
            <Avatar className="size-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  <Badge variant="outline" className={cn('text-[8px] px-1 py-0 border flex-shrink-0', roleColor)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </div>
            )}
            {!collapsed && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 flex-shrink-0"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Logout</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main DashboardSidebar Export ─── */
export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        className="hidden lg:flex flex-col h-screen border-r border-border/50 bg-background/80 backdrop-blur-xl fixed top-0 left-0 z-40"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <SidebarContent collapsed={collapsed} />
        {/* Collapse Toggle */}
        <div className="absolute -right-3 top-16 z-50 hidden lg:block">
          <Button
            variant="outline"
            size="icon"
            className="size-6 rounded-full border-border/60 bg-background shadow-sm hover:bg-muted/50"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="size-3" />
            ) : (
              <PanelLeftClose className="size-3" />
            )}
          </Button>
        </div>
      </motion.aside>

      {/* ── Mobile Hamburger + Sheet ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 ml-2">
          <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded-md" />
          <span className="text-sm font-bold gradient-text-premium">TheOneWayGDA</span>
        </Link>
      </div>

      {/* ── Spacer hook for consumers ── */}
      <DashboardSpacer collapsed={collapsed} />
    </>
  )
}

/* ── Utility: main content spacer ── */
function DashboardSpacer({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      {/* Desktop spacer */}
      <motion.div
        className="hidden lg:block flex-shrink-0"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      {/* Mobile top spacer */}
      <div className="lg:hidden h-14 flex-shrink-0" />
    </>
  )
}
