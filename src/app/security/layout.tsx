import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security',
  description:
    'TheOneWayGDA security practices — AES-256 encryption, TLS 1.3, zero-knowledge architecture, SOC 2, GDPR, HIPAA compliance, audit logging, penetration testing, and comprehensive data protection.',
  openGraph: {
    title: 'TheOneWayGDA — Security',
    description:
      'TheOneWayGDA security practices — encryption, compliance, audit logging, and data protection.',
  },
}

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children
}
