import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about TheOneWayGDA — our mission, values, team, and vision. We are building the most comprehensive AI model comparison and evaluation platform for researchers, developers, and enterprises.',
  openGraph: {
    title: 'About TheOneWayGDA',
    description:
      'Learn about TheOneWayGDA — our mission, values, team, and vision. We are building the most comprehensive AI model comparison and evaluation platform.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
