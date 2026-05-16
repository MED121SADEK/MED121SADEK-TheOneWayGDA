'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Path display name mapping ─── */
const PATH_LABELS: Record<string, string> = {
  '': 'Home',
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  workspace: 'Workspace',
  assistants: 'Assistants',
  teams: 'Teams',
  billing: 'Billing',
  settings: 'Settings',
  developers: 'Developers',
  notifications: 'Notifications',
  leaderboard: 'Leaderboard',
  community: 'Community',
  updates: 'Updates',
  about: 'About',
  tutorials: 'Tutorials',
  company: 'Company',
  privacy: 'Privacy',
  terms: 'Terms',
  security: 'Security',
  modules: 'Modules',
  ai: 'AI Platform',
  sdk: 'SDK',
  extensions: 'Extensions',
  workflows: 'Workflows',
  templates: 'Templates',
  governance: 'Governance',
  auth: 'Account',
  login: 'Sign In',
  register: 'Register',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  workflow: 'Workflow',
  new: 'New',
  admin: 'Admin',
  approvals: 'Approvals',
  action: 'Actions',
  visitors: 'Visitors',
  directory: 'Directory',
}

function getLabel(segment: string): string {
  return PATH_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

/* ─── BreadcrumbNav Component ─── */
export function BreadcrumbNav({ className }: { className?: string }) {
  const pathname = usePathname()

  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    return parts.map((segment, index) => {
      const href = '/' + parts.slice(0, index + 1).join('/')
      const label = getLabel(segment)
      const isLast = index === parts.length - 1
      return { segment, href, label, isLast }
    })
  }, [pathname])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex items-center', className)}
    >
      <Breadcrumb>
        <BreadcrumbList>
          {/* Home / Main Menu */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                href="/"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
              >
                <Home className="size-3" />
                <span className="hidden sm:inline">Main Menu</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {segments.map((seg, i) => (
            <AnimatePresence key={seg.href}>
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex items-center"
              >
                <BreadcrumbSeparator>
                  <ChevronRight className="size-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {seg.isLast ? (
                    <BreadcrumbPage className="text-xs font-medium text-foreground">
                      {seg.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={seg.href}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {seg.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </motion.div>
            </AnimatePresence>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </motion.div>
  )
}
