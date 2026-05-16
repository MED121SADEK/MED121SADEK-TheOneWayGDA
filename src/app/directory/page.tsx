'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Home, BookOpen, Compass, Trophy, Users, Sparkles,
  Settings, CreditCard, Bell, Code2, Bot, FolderOpen,
  Workflow, BarChart3, LayoutDashboard, Shield, FileText,
  Map, Lock, User, KeyRound, Building2, Eye, Cpu,
  Puzzle, GitBranch, Blocks, Scale, MessageSquare, Newspaper,
  ChevronRight, type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { PublicNavbar } from '@/components/public-navbar'

/* ─── Types ─── */
interface PageEntry {
  title: string
  href: string
  description: string
  icon: LucideIcon
  badge?: string
}

interface SitemapCategory {
  title: string
  icon: LucideIcon
  color: string
  pages: PageEntry[]
}

/* ─── Sitemap Data ─── */
const SITEMAP_CATEGORIES: SitemapCategory[] = [
  {
    title: 'Getting Started',
    icon: Compass,
    color: 'text-sky-400',
    pages: [
      { title: 'Home', href: '/', description: 'Platform homepage with overview and features', icon: Home },
      { title: 'About', href: '/about', description: 'Learn about TheOneWayGDA platform', icon: BookOpen },
      { title: 'Tutorials', href: '/tutorials', description: 'Guides and tutorials to get started', icon: FileText },
    ],
  },
  {
    title: 'AI Platform',
    icon: Sparkles,
    color: 'text-purple-400',
    pages: [
      { title: 'AI Overview', href: '/ai', description: 'Explore AI tools and capabilities', icon: Cpu },
      { title: 'AI SDK', href: '/ai/sdk', description: 'Software development kit for AI integration', icon: Code2 },
      { title: 'Extensions', href: '/ai/extensions', description: 'Browse and install AI extensions', icon: Puzzle },
      { title: 'Workflows', href: '/ai/workflows', description: 'AI workflow automation engine', icon: GitBranch },
      { title: 'Templates', href: '/ai/templates', description: 'Pre-built AI templates for common tasks', icon: Blocks },
      { title: 'Governance', href: '/ai/governance', description: 'AI governance, compliance, and usage policies', icon: Scale },
    ],
  },
  {
    title: 'Leaderboard',
    icon: Trophy,
    color: 'text-amber-400',
    pages: [
      { title: 'AI Model Leaderboard', href: '/leaderboard', description: 'Compare AI model performance across benchmarks', icon: Trophy },
    ],
  },
  {
    title: 'Community',
    icon: MessageSquare,
    color: 'text-teal-400',
    pages: [
      { title: 'Community Hub', href: '/community', description: 'Connect, share, and collaborate with peers', icon: Users },
      { title: 'Updates', href: '/updates', description: 'Latest platform news and announcements', icon: Newspaper },
    ],
  },
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-primary',
    pages: [
      { title: 'Dashboard', href: '/dashboard', description: 'Your personal dashboard and analytics', icon: LayoutDashboard, badge: 'Auth' },
      { title: 'Analytics', href: '/analytics', description: 'In-depth analytics and performance metrics', icon: BarChart3, badge: 'Auth' },
      { title: 'Workspace', href: '/workspace', description: 'Your data analysis workspace', icon: FolderOpen, badge: 'Auth' },
      { title: 'Assistants', href: '/assistants', description: 'Configure AI-powered assistants', icon: Bot, badge: 'Auth' },
      { title: 'Teams', href: '/teams', description: 'Team management and collaboration', icon: Users, badge: 'Auth' },
      { title: 'Billing', href: '/billing', description: 'Subscription and billing management', icon: CreditCard, badge: 'Auth' },
      { title: 'Settings', href: '/settings', description: 'Account and profile settings', icon: Settings, badge: 'Auth' },
      { title: 'Developers', href: '/developers', description: 'Developer tools and API documentation', icon: Code2, badge: 'Auth' },
      { title: 'Notifications', href: '/notifications', description: 'Manage notification preferences', icon: Bell, badge: 'Auth' },
    ],
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-rose-400',
    pages: [
      { title: 'Sign In', href: '/auth/login', description: 'Sign in to your account', icon: Lock },
      { title: 'Register', href: '/auth/register', description: 'Request access to the platform', icon: User },
      { title: 'Forgot Password', href: '/auth/forgot-password', description: 'Reset your password', icon: KeyRound },
      { title: 'Reset Password', href: '/auth/reset-password', description: 'Set a new password with your reset link', icon: Shield },
    ],
  },
  {
    title: 'Company',
    icon: Building2,
    color: 'text-emerald-400',
    pages: [
      { title: 'Company', href: '/company', description: 'About our company and mission', icon: Building2 },
      { title: 'Privacy Policy', href: '/privacy', description: 'Our privacy practices and data handling', icon: Eye },
      { title: 'Terms of Service', href: '/terms', description: 'Terms, conditions, and usage policies', icon: FileText },
      { title: 'Security', href: '/security', description: 'Security practices and certifications', icon: Shield },
    ],
  },
  {
    title: 'Tools',
    icon: Workflow,
    color: 'text-orange-400',
    pages: [
      { title: 'Modules', href: '/modules', description: 'Browse available modules and integrations', icon: Puzzle },
      { title: 'Workflow Builder', href: '/workflow/new', description: 'Create and configure AI workflows', icon: Workflow },
      { title: 'Site Directory', href: '/directory', description: 'Browse all pages and features of the platform', icon: Map },
    ],
  },
]

/* ─── Animation ─── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

/* ─── MAIN PAGE ─── */
export default function SitemapPage() {
  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay">
      <PublicNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <BreadcrumbNav />

        {/* Page Header */}
        <motion.div {...fadeUp} className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Map className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">
            <span className="gradient-text-premium">Site Directory</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Browse all pages and features of TheOneWayGDA platform. Find exactly what you need.
          </p>
          <Badge variant="outline" className="text-xs border-primary/20 text-primary/60">
            {SITEMAP_CATEGORIES.reduce((sum, cat) => sum + cat.pages.length, 0)} Pages
          </Badge>
        </motion.div>

        {/* Categories */}
        <motion.div className="space-y-6" {...stagger}>
          {SITEMAP_CATEGORIES.map((category, catIdx) => (
            <motion.div
              key={category.title}
              {...fadeUp}
              transition={{ ...fadeUp.animate.transition, delay: catIdx * 0.06 }}
            >
              <Card className="card-premium overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2.5">
                    <div className={`size-8 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center flex-shrink-0`}>
                      <category.icon className={`size-4 ${category.color}`} />
                    </div>
                    {category.title}
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {category.pages.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {category.pages.map((page) => (
                      <Link key={page.href} href={page.href}>
                        <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-all duration-150 group cursor-pointer border border-transparent hover:border-border/50">
                          <div className={`size-7 rounded-md bg-muted/40 flex items-center justify-center flex-shrink-0`}>
                            <page.icon className={`size-3.5 ${category.color} group-hover:scale-110 transition-transform`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                {page.title}
                              </span>
                              {page.badge && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-primary/20 text-primary/60">
                                  {page.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{page.description}</p>
                          </div>
                          <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border/30 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TheOneWayGDA. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/security" className="hover:text-foreground transition-colors">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
