import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

// ── Tests ──────────────────────────────────────────────────

describe('cn utility', () => {
  it('should merge basic class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle a single class name', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('should handle empty inputs and return empty string', () => {
    expect(cn()).toBe('')
  })

  it('should filter out falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz')
  })

  it('should merge conflicting Tailwind classes (tailwind-merge)', () => {
    // tailwind-merge should resolve conflicting utilities
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('should merge conflicting text color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should merge conflicting background classes', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('should merge conflicting padding classes', () => {
    expect(cn('p-2', 'p-6')).toBe('p-6')
  })

  it('should keep non-conflicting classes', () => {
    expect(cn('text-red-500', 'bg-blue-500', 'p-4')).toBe('text-red-500 bg-blue-500 p-4')
  })

  it('should handle conditional classes with objects', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', { 'active-class': isActive, 'disabled-class': isDisabled })).toBe(
      'base active-class'
    )
  })

  it('should handle conditional classes with ternaries', () => {
    const isLarge = true
    expect(cn('text-sm', isLarge && 'text-lg')).toBe('text-lg')
  })

  it('should handle arrays of class names', () => {
    expect(cn(['text-red-500', 'bg-blue-500'], 'p-4')).toBe('text-red-500 bg-blue-500 p-4')
  })

  it('should handle complex nested inputs', () => {
    const condition = true
    expect(cn(
      'flex',
      ['items-center', condition ? 'justify-center' : 'justify-start'],
      { 'gap-2': condition, 'gap-4': !condition }
    )).toBe('flex items-center justify-center gap-2')
  })

  it('should merge responsive breakpoint classes correctly', () => {
    // Responsive variants should be treated as non-conflicting
    expect(cn('text-sm', 'md:text-lg')).toBe('text-sm md:text-lg')
  })

  it('should merge dark mode classes correctly', () => {
    expect(cn('text-gray-500', 'dark:text-gray-100')).toBe('text-gray-500 dark:text-gray-100')
  })
})
