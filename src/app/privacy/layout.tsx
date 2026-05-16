import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'TheOneWayGDA privacy policy — how we collect, use, and protect your data. Learn about GDPR, CCPA compliance, data minimization, consent management, and your rights including data portability and erasure.',
  openGraph: {
    title: 'TheOneWayGDA — Privacy Policy',
    description:
      'TheOneWayGDA privacy policy — how we protect your data and respect your privacy.',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
