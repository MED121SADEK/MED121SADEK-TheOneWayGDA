'use client'

import * as React from 'react'
import { useIsMobile } from '@/hooks/use-is-mobile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/* ════════════════════════════════════════
   Responsive Dialog / Sheet Adapter
   
   On mobile: renders as a bottom Sheet (native drawer feel)
   On desktop: renders as a centered Dialog
   
   Usage:
   <ResponsiveDialog open={open} onOpenChange={setOpen}>
     <ResponsiveDialogContent>
       <ResponsiveDialogHeader>
         <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
         <ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
       </ResponsiveDialogHeader>
       Content here
       <ResponsiveDialogFooter>Footer here</ResponsiveDialogFooter>
     </ResponsiveDialogContent>
   </ResponsiveDialog>
   ════════════════════════════════════════ */

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

/**
 * ResponsiveDialog — wrapper that conditionally renders Sheet (mobile) or Dialog (desktop).
 */
export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

/**
 * ResponsiveDialogContent — renders SheetContent (bottom) or DialogContent.
 */
export function ResponsiveDialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <SheetContent side="bottom" className={cn('rounded-t-2xl max-h-[85vh] safe-bottom', className)}>
        {children}
      </SheetContent>
    )
  }

  return (
    <DialogContent className={className}>
      {children}
    </DialogContent>
  )
}

/**
 * ResponsiveDialogHeader
 */
export function ResponsiveDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <SheetHeader className={className}>{children}</SheetHeader>
  }

  return <DialogHeader className={className}>{children}</DialogHeader>
}

/**
 * ResponsiveDialogTitle
 */
export function ResponsiveDialogTitle({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <SheetTitle className={className} {...props}>{children}</SheetTitle>
  }

  return <DialogTitle className={className} {...props}>{children}</DialogTitle>
}

/**
 * ResponsiveDialogDescription
 */
export function ResponsiveDialogDescription({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <SheetDescription className={className} {...props}>{children}</SheetDescription>
  }

  return <DialogDescription className={className} {...props}>{children}</DialogDescription>
}

/**
 * ResponsiveDialogFooter
 */
export function ResponsiveDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <SheetFooter className={className}>{children}</SheetFooter>
  }

  return <DialogFooter className={className}>{children}</DialogFooter>
}

/**
 * ResponsivePopover — On mobile uses Sheet (bottom), on desktop uses Popover.
 * This is for NotificationBell and similar components.
 */
interface ResponsivePopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
}

export function ResponsivePopover({
  open,
  onOpenChange,
  children,
  title,
  description,
}: ResponsivePopoverProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] safe-bottom">
          {title && (
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  // On desktop, render children directly (caller wraps in Popover)
  return <>{children}</>
}
