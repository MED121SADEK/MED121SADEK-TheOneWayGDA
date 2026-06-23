'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { BreadcrumbNav } from '@/components/breadcrumb-nav'
import { Loader2 } from 'lucide-react'

function getSession() {
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (!session) {
      // Use replace to avoid polluting browser history (prevents back-button loops)
      router.replace('/auth/login')
    }
  }, [router])

  const session = getSession()
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center mesh-gradient">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex mesh-gradient noise-overlay">
        <DashboardSidebar />
        <motion.main
          className="flex-1 min-w-0 flex flex-col"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Breadcrumb Navigation */}
          <div className="px-4 sm:px-6 pt-4 pb-0">
            <BreadcrumbNav />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </motion.main>
      </div>
    </AuthGuard>
  )
}
