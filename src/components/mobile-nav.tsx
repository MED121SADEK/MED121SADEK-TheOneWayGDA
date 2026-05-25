'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, Users, LayoutDashboard, Trophy, User, Menu, X,
  Bell, Settings, Search, TrendingUp, HelpCircle,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/workspace', label: 'Workspace', icon: LayoutDashboard },
  { path: '/leaderboard', label: 'AI Models', icon: Trophy },
  { path: '/dashboard', label: 'Profile', icon: User },
]

const SHEET_ITEMS = [
  { path: '/community?sort=popular', label: 'Trending', icon: TrendingUp },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/tutorials', label: 'Help', icon: HelpCircle },
]

/**
 * MobileNav — Bottom navigation bar for mobile devices.
 * Only visible on screens < 768px (md:hidden).
 */
export function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/90 backdrop-blur-lg safe-bottom"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around px-1 h-[3.5rem]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-all min-w-[48px] min-h-[44px]',
                'active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-all',
                isActive && 'bg-primary/15',
              )}>
                <Icon className="size-4" />
              </div>
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* More menu (Sheet) */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-all min-w-[48px] min-h-[44px]',
                'text-muted-foreground hover:text-foreground active:scale-95',
              )}
              aria-label="More options"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg">
                {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </div>
              <span className="text-[9px] font-medium leading-tight">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
            <SheetHeader className="pb-2">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="space-y-1 mt-2">
              {SHEET_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
              <div className="px-4 pt-3 border-t border-border/50 mt-2">
                <p className="text-[10px] text-muted-foreground">
                  Press <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1 font-mono text-[9px]">&nbsp;&#8984;K&nbsp;</kbd> to search
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
