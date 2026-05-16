'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={stagger} className={className}>
      {children}
    </motion.div>
  )
}
