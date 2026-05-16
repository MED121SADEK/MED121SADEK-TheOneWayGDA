import { NextRequest, NextResponse } from 'next/server'

const UPDATES = [
  { id: 1, version: 'v2.4.0', date: '2026-04-18', category: 'ai', title: 'GLM-4.6V Vision Model', desc: 'Upgraded OCR engine with state-of-the-art vision AI for 40% better form recognition accuracy.', highlights: ['40% better OCR accuracy', 'Multi-language form support', 'Table extraction improvements'] },
  { id: 2, version: 'v2.4.0', date: '2026-04-18', category: 'features', title: 'Batch OCR Processing', desc: 'Upload and process 100+ scanned documents in a single batch operation.', highlights: ['Batch ZIP upload', 'Parallel processing', 'Consolidated CSV/JSON export'] },
  { id: 3, version: 'v2.3.2', date: '2026-04-10', category: 'security', title: 'SOC 2 Type II Audit', desc: 'Completed SOC 2 Type II audit with zero findings. Security posture strengthened.', highlights: ['Zero findings', 'Annual audit complete', 'New encryption keys'] },
  { id: 4, version: 'v2.3.1', date: '2026-04-05', category: 'stats', title: 'Bayesian Analysis Module', desc: 'New Bayesian inference methods including MCMC sampling and posterior analysis.', highlights: ['MCMC sampling', 'Posterior distributions', 'Credible intervals'] },
  { id: 5, version: 'v2.3.0', date: '2026-03-28', category: 'uiux', title: 'Redesigned Variable View', desc: 'Complete overhaul of variable view with inline editing and drag-drop reordering.', highlights: ['Inline editing', 'Drag-drop reorder', 'Type detection'] },
  { id: 6, version: 'v2.2.0', date: '2026-03-15', category: 'ai', title: 'AI Chat Context Memory', desc: 'AI assistant now remembers conversation context across sessions within a project.', highlights: ['Session memory', 'Context awareness', 'Project-level context'] },
  { id: 7, version: 'v2.1.0', date: '2026-03-01', category: 'stats', title: 'Mixed-Effects Models', desc: 'Support for linear mixed-effects models with random intercepts and slopes.', highlights: ['Random intercepts', 'Random slopes', 'REML estimation'] },
  { id: 8, version: 'v2.0.0', date: '2026-02-20', category: 'features', title: '8-Language Support', desc: 'Full interface translation for AR, EN, FR, ES, DE, ZH, JA, RU with RTL support.', highlights: ['8 languages', 'RTL Arabic', 'Auto-detection'] },
  { id: 9, version: 'v1.9.0', date: '2026-02-10', category: 'security', title: 'Zero-Knowledge Encryption', desc: 'Implemented zero-knowledge architecture. Data encrypted before leaving browser.', highlights: ['E2E encryption', 'Zero-knowledge proofs', 'Client-side keys'] },
  { id: 10, version: 'v1.8.0', date: '2026-01-25', category: 'ai', title: 'Smart Data Cleaning', desc: 'AI-powered cleaning: typo correction, outlier detection, missing value imputation.', highlights: ['Levenshtein typo fix', 'IQR outlier detection', 'Mean/mode imputation'] },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  let filtered = UPDATES
  if (category && category !== 'all') {
    filtered = filtered.filter(u => u.category === category)
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(u => u.title.toLowerCase().includes(q) || u.desc.toLowerCase().includes(q))
  }

  return NextResponse.json({ updates: filtered, total: filtered.length })
}
