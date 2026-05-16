'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
  MessageSquare,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { useAppStore, type ChatMessage } from '@/lib/store'
import { useTranslation } from '@/lib/i18n'
import ReactMarkdown from 'react-markdown'

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface PageContext {
  id: string
  label: string
  icon: string
  quickActions: QuickAction[]
}

interface QuickAction {
  label: string
  prompt: string
}

type AiInsight = {
  title: string
  description: string
  action?: string
}

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'oneway-copilot-history'

const PAGE_CONTEXTS: Record<string, PageContext> = {
  '/workspace': {
    id: 'workspace',
    label: 'Workspace',
    icon: '📊',
    quickActions: [
      { label: 'Analyze my data', prompt: 'Analyze the current dataset and provide a summary of key statistical insights.' },
      { label: 'Explain this chart', prompt: 'Explain the visualizations and charts currently shown in the workspace.' },
      { label: 'Suggest a model', prompt: 'Based on the data variables, suggest the most appropriate statistical model or test.' },
      { label: 'Create report', prompt: 'Generate a comprehensive analysis report from the current data.' },
    ],
  },
  '/leaderboard': {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: '🏆',
    quickActions: [
      { label: 'Compare models', prompt: 'Compare the top AI models on the leaderboard and highlight key differences.' },
      { label: 'Best value pick', prompt: 'Which model offers the best value for money considering performance and pricing?' },
      { label: 'Speed analysis', prompt: 'Analyze the latency metrics and identify the fastest models.' },
      { label: 'Recommend model', prompt: 'Recommend the best AI model for a production use case.' },
    ],
  },
  '/community': {
    id: 'community',
    label: 'Community',
    icon: '👥',
    quickActions: [
      { label: 'Trending topics', prompt: 'What are the trending discussions in the community right now?' },
      { label: 'Help me post', prompt: 'Help me write a community post about my data analysis findings.' },
      { label: 'Find answers', prompt: 'Search for answers related to statistical analysis questions.' },
      { label: 'Expert advice', prompt: 'What are the community experts recommending for data analysis workflows?' },
    ],
  },
  '/modules': {
    id: 'modules',
    label: 'Modules',
    icon: '🧩',
    quickActions: [
      { label: 'Module overview', prompt: 'Explain all available modules and what they do.' },
      { label: 'Recommend modules', prompt: 'Which modules should I install for advanced statistical analysis?' },
      { label: 'Update status', prompt: 'Check if there are any important module updates available.' },
      { label: 'Custom module', prompt: 'How can I create or request a custom analysis module?' },
    ],
  },
}

const DEFAULT_CONTEXT: PageContext = {
  id: 'general',
  label: 'The One-Way',
  icon: '✨',
  quickActions: [
    { label: 'Getting started', prompt: 'How do I get started with The One-Way platform?' },
    { label: 'AI features', prompt: 'What AI-powered features are available on this platform?' },
    { label: 'Statistical tests', prompt: 'What statistical tests and analyses can I run here?' },
    { label: 'Import data', prompt: 'How do I import and prepare my data for analysis?' },
  ],
}

const WORKSPACE_INSIGHTS: AiInsight[] = [
  { title: 'Data Summary Ready', description: 'Your dataset has been loaded. I can help you explore distributions, correlations, and run statistical tests.', action: 'Analyze my data' },
  { title: 'Missing Values Detected', description: 'I found some gaps in your data. Let me suggest imputation strategies to handle them.', action: 'Fix missing data' },
  { title: 'Correlation Opportunity', description: 'Several numeric variables show potential correlations. Want me to run a correlation analysis?', action: 'Run correlation' },
]

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function detectContext(pathname: string): PageContext {
  // Exact match first
  if (PAGE_CONTEXTS[pathname]) return PAGE_CONTEXTS[pathname]
  // Prefix match
  const matched = Object.keys(PAGE_CONTEXTS).find((key) => pathname.startsWith(key))
  if (matched) return PAGE_CONTEXTS[matched]
  return DEFAULT_CONTEXT
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function loadHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    // Keep last 100 messages
    const trimmed = messages.slice(-100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full — silently fail
  }
}

// Simulated AI responses per context
function generateSimulatedResponse(userMessage: string, context: PageContext): string {
  const msg = userMessage.toLowerCase()

  if (context.id === 'workspace') {
    if (msg.includes('analyz') || msg.includes('summar')) {
      return `## Data Analysis Summary\n\nBased on your dataset, here are the key findings:\n\n- **Variables detected**: Your data contains both numeric and categorical variables\n- **Data quality**: Overall good, with a few areas to review\n- **Recommended tests**:\n  1. **Descriptive statistics** — Get mean, median, and distribution metrics\n  2. **Correlation analysis** — Check relationships between numeric variables\n  3. **Normality tests** — Verify assumptions for parametric tests\n\n> 💡 *Tip: Start with descriptive statistics to understand your data shape before running advanced tests.*\n\nWould you like me to run any of these analyses?`
    }
    if (msg.includes('chart') || msg.includes('visuali')) {
      return `## Chart Interpretation\n\nHere's how to read the current visualizations:\n\n### Distribution Chart\n- Look for **skewness** in the histogram\n- The box plot shows **quartiles** and potential **outliers**\n\n### Scatter Plot\n- **Positive correlation** if points trend upward\n- Check the **R² value** for fit strength\n\n\`\`\`\n# Key metrics to observe\n# - Mean vs Median gap → Skewness\n# - Interquartile Range → Spread\n# - Outlier count → Data quality\n\`\`\`\n\nWant a deeper dive into any specific chart?`
    }
    if (msg.includes('model') || msg.includes('suggest') || msg.includes('test')) {
      return `## Recommended Statistical Approach\n\nBased on your data structure, I recommend:\n\n### Primary Analysis\n| Test | Purpose | Assumption |\n|------|---------|------------|\n| Pearson Correlation | Linear relationship | Normality, linearity |\n| Independent T-Test | Group differences | Equal variances |\n| Chi-Square | Categorical association | Expected freq ≥ 5 |\n\n### Steps\n1. **Check assumptions** first (normality, homogeneity)\n2. Run the appropriate test\n3. Interpret p-values with effect sizes\n\n> ⚠️ *Always report effect sizes (Cohen's d, η²) alongside p-values.*\n\nShall I guide you through any of these?`
    }
    if (msg.includes('report')) {
      return `## Report Generation\n\nI'll help you create a comprehensive report. Here's the structure:\n\n### 📋 Report Outline\n1. **Executive Summary** — Key findings at a glance\n2. **Data Description** — Variables, sample size, collection method\n3. **Descriptive Statistics** — Central tendency, dispersion\n4. **Inferential Analysis** — Tests, results, interpretations\n5. **Visualizations** — Charts and graphs\n6. **Conclusions** — Actionable insights\n7. **Appendix** — Technical details, code\n\nClick **Export** in the output panel to generate a PDF or Word document.\n\nWant me to fill in specific sections?`
    }
  }

  if (context.id === 'leaderboard') {
    if (msg.includes('compare') || msg.includes('best')) {
      return `## AI Model Comparison\n\n### Top Performers\n\n| Model | Score | Price | Latency |\n|-------|-------|-------|---------|\n| GPT-4o | 94.2 | $5/M | 180ms |\n| Claude 3.5 | 93.8 | $3/M | 150ms |\n| GLM-4 | 92.1 | $1/M | 120ms |\n\n### Key Takeaways\n- **Best overall**: GPT-4o for accuracy\n- **Best value**: GLM-4 offers 85% of GPT-4o performance at 1/5 the price\n- **Fastest**: GLM-4 with lowest latency\n\n> 💰 *For most production workloads, the mid-tier models offer the best cost-performance ratio.*\n\nNeed a comparison for your specific use case?`
    }
  }

  // Generic fallback
  return `## Thanks for your question!\n\nI'm your AI copilot for **The One-Way** platform. Here's what I can help with:\n\n- **Data Analysis** — Run statistical tests and interpret results\n- **Visualizations** — Create and explain charts\n- **Reports** — Generate professional analysis reports\n- **Guidance** — Step-by-step statistical methodology help\n\n### Quick Start\n1. Navigate to **Workspace** to load your data\n2. Ask me to analyze or visualize it\n3. Export results as reports\n\nHow can I assist you today?`
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

/** Three bouncing dots for AI typing indicator */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-2 rounded-full bg-primary"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut' as const,
          }}
        />
      ))}
    </div>
  )
}

/** AI avatar with gradient ring */
function AiAvatar() {
  return (
    <div className="relative flex-shrink-0">
      <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/20">
        <Bot className="size-4 text-white" />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full border border-card bg-emerald-500">
        <Zap className="size-1.5 text-white" />
      </div>
    </div>
  )
}

/** Render markdown content for AI messages */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-base font-semibold mb-1 mt-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="mb-1 ml-4 list-disc space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs font-mono text-primary">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-muted/40 border border-border/30 p-3 text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-1.5 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/30 px-2 py-1.5 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/20 px-2 py-1.5 text-muted-foreground">{children}</td>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────

export default function AiCopilot() {
  const { t } = useTranslation()
  const store = useAppStore()

  // ── State ──
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [context, setContext] = useState<PageContext>(DEFAULT_CONTEXT)
  const [hasNewInsight, setHasNewInsight] = useState(false)
  const [showInsight, setShowInsight] = useState(true)

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Detect page context ──
  useEffect(() => {
    if (typeof window === 'undefined') return

    const detect = () => {
      const pathname = window.location.pathname
      const ctx = detectContext(pathname)
      setContext(ctx)
    }

    detect()
    window.addEventListener('popstate', detect)
    // Also detect on pushState/replaceState
    const originalPush = history.pushState
    const originalReplace = history.replaceState
    history.pushState = function (...args) {
      originalPush.apply(this, args)
      detect()
    }
    history.replaceState = function (...args) {
      originalReplace.apply(this, args)
      detect()
    }

    return () => {
      window.removeEventListener('popstate', detect)
      history.pushState = originalPush
      history.replaceState = originalReplace
    }
  }, [])

  // ── Load chat history from localStorage ──
  useEffect(() => {
    const history = loadHistory()
    if (history.length > 0) {
      setMessages(history)
    }
  }, [])

  // ── Persist messages ──
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages)
    }
  }, [messages])

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isTyping])

  // ── Focus input when panel opens ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // ── Show AI insight badge when context is workspace with data ──
  useEffect(() => {
    if (context.id === 'workspace' && store.data && Object.keys(store.data).length > 0) {
      setHasNewInsight(true)
    } else {
      setHasNewInsight(false)
    }
    setShowInsight(true)
  }, [context, store.data])

  // ── Streaming simulation ──
  const simulateStream = useCallback((fullContent: string) => {
    setIsStreaming(true)
    setStreamingContent('')
    let index = 0
    const speed = Math.max(8, Math.min(25, 1500 / fullContent.length)) // Adaptive speed

    const interval = setInterval(() => {
      if (index < fullContent.length) {
        // Add characters in chunks for smoother feel
        const chunk = fullContent.slice(index, index + 3)
        setStreamingContent((prev) => prev + chunk)
        index += 3
      } else {
        clearInterval(interval)
        setIsStreaming(false)
        setStreamingContent('')
      }
    }, speed)

    return interval
  }, [])

  // ── Send message ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping || isStreaming) return

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsTyping(true)
      setShowInsight(false)

      // Build page context data for the API
      const pageData: Record<string, unknown> = {}
      pageData.pageLabel = context.label

      if (context.id === 'workspace' && store.variables && store.variables.length > 0) {
        const varCount = store.variables.length
        const keys = Object.keys(store.data || {})
        const rowCount = keys.length > 0
          ? Math.max(...keys.map((k) => (store.data[k]?.length ?? 0)))
          : 0
        const types = store.variables.reduce((acc, v) => {
          acc[v.type] = (acc[v.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        pageData.datasetInfo = {
          variableCount: varCount,
          rowCount,
          variableTypes: types,
          variableNames: store.variables.map((v) => v.name),
        }
        if (store.currentProject) pageData.projectName = store.currentProject.name
      }

      try {
        // Call real AI backend
        const response = await fetch('/api/ai/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: text.trim() }],
            context: context.id,
            pageData,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiContent = data.message || 'No response generated.'

          const aiMsg: ChatMessage = {
            id: uid(),
            role: 'ai',
            content: aiContent,
            timestamp: new Date().toISOString(),
          }

          setIsTyping(false)
          setMessages((prev) => [...prev, aiMsg])
          simulateStream(aiContent)
        } else {
          // API error — fall back to simulated response
          throw new Error(`API returned ${response.status}`)
        }
      } catch {
        // Fallback to local simulated response when API is unavailable
        const aiContent = generateSimulatedResponse(text, context)
        const aiMsg: ChatMessage = {
          id: uid(),
          role: 'ai',
          content: aiContent,
          timestamp: new Date().toISOString(),
        }
        setIsTyping(false)
        setMessages((prev) => [...prev, aiMsg])
        simulateStream(aiContent)
      }
    },
    [isTyping, isStreaming, context, store.variables, store.data, store.currentProject, simulateStream, messages],
  )

  // ── Clear chat ──
  const clearChat = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    setShowInsight(true)
  }, [])

  // ── Quick action handler ──
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      sendMessage(action.prompt)
    },
    [sendMessage],
  )

  // ── Form submit ──
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // ── Keyboard shortcut ──
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ── Pick a workspace insight ──
  const currentInsight = WORKSPACE_INSIGHTS[Math.floor(Date.now() / 60000) % WORKSPACE_INSIGHTS.length]

  // ── Animation variants ──
  const panelVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transformOrigin: 'bottom right',
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 25,
        stiffness: 350,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2,
        ease: 'easeIn' as const,
      },
    },
  }

  const messageVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.97 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.03, duration: 0.3, ease: 'easeOut' as const },
    }),
  }

  const fabVariants = {
    idle: { scale: 1 },
    pulse: {
      scale: [1, 1.08, 1],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
    },
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-3">
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
            style={{ width: 380, height: 520 }}
          >
            {/* ── Header ── */}
            <div className="relative flex items-center justify-between border-b border-border/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <AiAvatar />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">AI Copilot</h3>
                    <Badge variant="secondary" className="gap-1 border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">
                      <Sparkles className="size-2.5" />
                      Pro
                    </Badge>
                  </div>
                  {/* Context indicator */}
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="outline" className="gap-1 border-border/30 px-1.5 py-0 text-[10px] text-muted-foreground">
                      <span>{context.icon}</span>
                      <span>{context.label}</span>
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {messages.length > 0 ? `${messages.length} messages` : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Clear chat */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={clearChat}
                      aria-label="Clear chat"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">New conversation</TooltipContent>
                </Tooltip>

                {/* Close */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close copilot"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Close</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* ── AI Insight (workspace only) ── */}
            <AnimatePresence>
              {showInsight && context.id === 'workspace' && store.data && Object.keys(store.data).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-3 mt-2.5 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 via-transparent to-primary/5 p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-md bg-primary/15">
                        <Zap className="size-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{currentInsight.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {currentInsight.description}
                        </p>
                        {currentInsight.action && (
                          <button
                            onClick={() => handleQuickAction({ label: currentInsight.action!, prompt: currentInsight.action! })}
                            className="mt-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            {currentInsight.action} →
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setShowInsight(false)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Dismiss insight"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
              {/* Empty state */}
              {messages.length === 0 && !isTyping && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-2">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                    <MessageSquare className="size-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">How can I help?</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {context.id === 'workspace'
                        ? 'Ask about your data, run analyses, or get recommendations.'
                        : 'Ask me anything about this page or the platform.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Message list */}
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    custom={idx}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className={`mb-3 flex gap-2.5 ${
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    {msg.role === 'ai' && <AiAvatar />}

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        msg.role === 'ai'
                          ? 'rounded-tl-md border-l-2 border-primary bg-primary/8'
                          : 'rounded-tr-md bg-muted/50'
                      }`}
                    >
                      {msg.role === 'ai' ? (
                        <MarkdownContent content={msg.content} />
                      ) : (
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <p
                        className={`mt-1.5 text-[10px] text-muted-foreground/60 ${
                          msg.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Streaming text */}
              {isStreaming && streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex gap-2.5"
                >
                  <AiAvatar />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md border-l-2 border-primary bg-primary/8 px-3.5 py-2.5">
                    <div className="relative">
                      <MarkdownContent content={streamingContent} />
                      <motion.span
                        className="inline-block size-0.5 translate-y-1 rounded-full bg-primary"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex gap-2.5"
                >
                  <AiAvatar />
                  <div className="rounded-2xl rounded-tl-md border-l-2 border-primary bg-primary/8 px-4 py-1">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Action Chips ── */}
            {messages.length === 0 && !isTyping && (
              <div className="border-t border-border/20 px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {context.quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
                    >
                      <Sparkles className="size-2.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Input Area ── */}
            <form onSubmit={handleSubmit} className="border-t border-border/30 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('ai.placeholder') || 'Ask me anything...'}
                  disabled={isTyping || isStreaming}
                  className="h-9 flex-1 rounded-xl border-border/30 bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || isTyping || isStreaming}
                      className="size-9 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-40 transition-all"
                      aria-label="Send message"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Send</TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
                AI may produce inaccurate information. Verify important results.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Action Button ── */}
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className="relative"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsOpen(true)}
                  className="group relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-2xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Open AI Copilot"
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 opacity-0 blur-xl transition-opacity group-hover:opacity-50" />

                  {/* Pulse ring */}
                  <motion.div
                    variants={fabVariants}
                    animate={hasNewInsight ? 'pulse' : 'idle'}
                    className="absolute inset-0 rounded-2xl border-2 border-violet-400/40"
                  />

                  <motion.div
                    initial={false}
                    animate={{ rotate: hasNewInsight ? 360 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <Sparkles className="size-6" />
                  </motion.div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs font-medium">AI Copilot</p>
                {hasNewInsight && (
                  <p className="text-[10px] text-violet-300">New insights available</p>
                )}
              </TooltipContent>
            </Tooltip>

            {/* Notification badge */}
            <AnimatePresence>
              {hasNewInsight && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[9px] font-bold text-white shadow-lg"
                >
                  <Zap className="size-2.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
