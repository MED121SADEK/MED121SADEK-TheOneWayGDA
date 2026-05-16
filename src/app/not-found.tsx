'use client'

import Link from 'next/link'
import { FileQuestion, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground/20">404</h1>
          <h2 className="text-xl font-bold text-foreground">
            Page not found
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Check the URL or head back to the homepage.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/leaderboard">
              <Search className="w-4 h-4" />
              Leaderboard
            </Link>
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="gap-2"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
