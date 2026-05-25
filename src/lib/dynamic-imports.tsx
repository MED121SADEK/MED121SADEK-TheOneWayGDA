/**
 * Dynamic Imports Registry
 *
 * Central registry for lazy-loading heavy components via next/dynamic.
 * These components pull in large dependencies (recharts, xlsx, jspdf,
 * react-syntax-highlighter, etc.) and should not be bundled into
 * the initial page load.
 *
 * Usage:
 *   import { LazyCommunityChatbot } from '@/lib/dynamic-imports'
 *   // then use <LazyCommunityChatbot /> just like the original component
 */

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Chart / Visualization Components ───

/** CorrelationHeatmap — recharts-based correlation matrix */
export const LazyCorrelationHeatmap = dynamic(
  () =>
    import('@/components/workspace/CorrelationHeatmap').then(
      (m) => ({ default: m.CorrelationHeatmap })
    ),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
    ssr: false,
  }
)

/** QQPlot — recharts-based Q-Q plot */
export const LazyQQPlot = dynamic(
  () =>
    import('@/components/workspace/QQPlot').then(
      (m) => ({ default: m.QQPlot })
    ),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
    ssr: false,
  }
)

/** Charts — recharts wrapper (ChartBar, ChartScatter, etc.) */
export const LazyChartBar = dynamic(
  () =>
    import('@/components/workspace/Charts').then(
      (m) => ({ default: m.ChartBar })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

export const LazyChartScatter = dynamic(
  () =>
    import('@/components/workspace/Charts').then(
      (m) => ({ default: m.ChartScatter })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

export const LazyChartPie = dynamic(
  () =>
    import('@/components/workspace/Charts').then(
      (m) => ({ default: m.ChartPie })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

export const LazyChartHistogram = dynamic(
  () =>
    import('@/components/workspace/Charts').then(
      (m) => ({ default: m.ChartHistogram })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

export const LazyChartBoxPlot = dynamic(
  () =>
    import('@/components/workspace/Charts').then(
      (m) => ({ default: m.ChartBoxPlot })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

// ─── Spreadsheet / Data Components ───

/** SpreadsheetEditor — xlsx dependency */
export const LazySpreadsheetEditor = dynamic(
  () =>
    import('@/components/workspace/SpreadsheetEditor').then(
      (m) => ({ default: m.SpreadsheetEditor })
    ),
  {
    loading: () => <Skeleton className="h-[500px] w-full rounded-xl" />,
    ssr: false,
  }
)

/** SmartDataImport — file processing */
export const LazySmartDataImport = dynamic(
  () =>
    import('@/components/smart-data-import').then(
      (m) => ({ default: m.SmartDataImport })
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
)

/** VisualizationPanel — chart rendering */
export const LazyVisualizationPanel = dynamic(
  () => import('@/components/visualization-panel'),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
    ssr: false,
  }
)

// ─── AI Integration Components ───

/** CommunityChatbot — AI integration component */
export const LazyCommunityChatbot = dynamic(
  () =>
    import('@/components/community-chatbot').then(
      (m) => ({ default: m.CommunityChatbot })
    ),
  {
    loading: () => (
      <Skeleton className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full" />
    ),
    ssr: false,
  }
)

/** AiCopilot — AI integration
 *  Note: Cannot use ssr: false here because layout.tsx is a Server Component.
 *  AiCopilot has 'use client' directive, so Next.js handles client boundary automatically.
 *  Import directly in layout.tsx: import AiCopilot from '@/components/ai/AiCopilot'
 */
// LazyAiCopilot is available for use in Client Components via:
//   import { LazyAiCopilot } from '@/lib/dynamic-imports'
export const LazyAiCopilot = dynamic(
  () => import('@/components/ai/AiCopilot'),
  {
    loading: () => (
      <Skeleton className="fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full" />
    ),
    ssr: false,
  }
)
