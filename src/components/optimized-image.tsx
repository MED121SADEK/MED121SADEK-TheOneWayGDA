'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * OptimizedImage
 *
 * A wrapper around next/image with sensible defaults for:
 * - Responsive `sizes` attribute
 * - Priority loading for above-the-fold content
 * - Blur placeholder with loading state
 * - Error fallback
 * - Automatic format hints
 *
 * Usage:
 *   <OptimizedImage src="/images/hero.png" alt="Hero" priority />
 *   <OptimizedImage src="/images/photo.jpg" alt="Photo" className="rounded-xl" sizes="(max-width: 768px) 100vw, 50vw" />
 */

interface OptimizedImageProps {
  /** Image source — local path or external URL */
  src: string
  /** Alt text (required for accessibility) */
  alt: string
  /** Additional CSS classes */
  className?: string
  /** Image width */
  width?: number
  /** Image height */
  height?: number
  /** Fill container instead of width/height */
  fill?: boolean
  /** Whether this image is above the fold and should be prioritized */
  priority?: boolean
  /** Custom sizes attribute for responsive loading */
  sizes?: string
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
  /** Rounded corners */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Custom fallback component for errors */
  fallback?: React.ReactNode
}

const roundedClasses: Record<string, string> = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  fill,
  priority = false,
  sizes,
  objectFit = 'cover',
  rounded,
  fallback,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Default responsive sizes
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px'

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/30',
        rounded && roundedClasses[rounded],
        fill ? 'w-full h-full' : 'inline-block',
        className
      )}
    >
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-muted/20',
            rounded && roundedClasses[rounded]
          )}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        sizes={sizes || defaultSizes}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          fill && 'object-cover',
          objectFit !== 'cover' && !fill && `object-${objectFit}`
        )}
      />
    </div>
  )
}
