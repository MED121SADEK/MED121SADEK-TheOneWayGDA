'use client'

import { useAccessLogger } from '@/hooks/useAccessLogger'

export function AccessLogger() {
  useAccessLogger()
  return null
}