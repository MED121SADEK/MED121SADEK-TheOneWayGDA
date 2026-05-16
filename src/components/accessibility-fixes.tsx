'use client'

import React from 'react'

/**
 * SkipLink — A "Skip to main content" link for keyboard navigation.
 * Visible only on focus (Tab key), positioned at the top of the page.
 * Must be the first focusable element inside <body>.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[99999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background focus:shadow-lg"
    >
      Skip to main content
    </a>
  )
}

/**
 * VisuallyHidden — Screen-reader-only text utility.
 * Content is accessible to assistive technologies but visually hidden.
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  ...props
}: {
  children: React.ReactNode
  as?: React.ElementType
  [key: string]: unknown
}) {
  return (
    <Component
      className="sr-only"
      {...props}
    >
      {children}
    </Component>
  )
}
