import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'TheOneWayGDA terms of service — terms and conditions governing the use of our AI model comparison platform, including account terms, acceptable use, intellectual property, and liability.',
  openGraph: {
    title: 'TheOneWayGDA — Terms of Service',
    description:
      'TheOneWayGDA terms of service — terms and conditions for using our AI platform.',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
