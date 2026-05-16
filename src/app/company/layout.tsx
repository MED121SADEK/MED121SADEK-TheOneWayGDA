import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Company',
  description:
    'Discover TheOneWayGDA company — our global offices, leadership team, mission and vision, partnerships, certifications, and how we are transforming AI model evaluation for organizations worldwide.',
  openGraph: {
    title: 'TheOneWayGDA — Company',
    description:
      'Discover TheOneWayGDA company — our global offices, leadership team, mission, and partnerships.',
  },
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children
}
