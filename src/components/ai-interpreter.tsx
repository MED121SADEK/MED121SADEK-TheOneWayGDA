'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Brain, Sparkles, Copy, Check, Send, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AIInterpreterProps {
  analysisType: string
  results: Record<string, any>
  variableNames?: string[]
  visible: boolean
}

const SUGGESTION_CHIPS = [
  'What does this mean?',
  'Is this significant?',
  'What should I do next?',
]

function SparkleLoader() {
  return (
    <div className="flex items-center gap-1 py-6 justify-center">
      <Sparkles className="size-4 text-violet-400 animate-pulse" />
      <div className="flex gap-1 ml-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-2 rounded-full bg-violet-400"
            style={{
              animation: `sparkle-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="ml-2 text-sm text-muted-foreground animate-pulse">
        Analyzing results...
      </span>
    </div>
  )
}

/**
 * Parse the AI response text and render with highlighted statistical values.
 * Extracts p-values, R², t/F/χ² statistics, confidence intervals, etc.
 */
function renderInterpretation(text: string) {
  const parts: React.ReactNode[] = []

  // Regex that captures bold markers, inline code, and statistical tokens
  const tokenRegex =
    /\*\*(.+?)\*\*|`(.+?)`|(p\s*[<>=≈]\s*[\d.]+)|(R²?\s*=\s*[\d.]+|[r²]\s*=\s*[\d.]+)|(?:t|F|χ²|z)\s*\(\s*\d+\s*\)\s*=\s*[\d.]+|(?:t|F|χ²|z)\s*=\s*[\d.]+|CI\s*\[[\d.,\s]+\]/gi

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    // Push any plain text before this token
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const full = match[0]

    if (match[1]) {
      // **bold** text
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      )
    } else if (match[2]) {
      // `inline code`
      parts.push(
        <code
          key={`c-${match.index}`}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
        >
          {match[2]}
        </code>
      )
    } else if (match[3]) {
      // p-value
      const pVal = full.replace(/\s/g, '')
      const isSignificant = pVal.includes('<') || pVal.includes('≈')
      const numMatch = pVal.match(/[\d.]+$/)
      const num = numMatch ? parseFloat(numMatch[0]) : null
      const significant = num !== null ? num < 0.05 : isSignificant

      parts.push(
        <Badge
          key={`p-${match.index}`}
          variant="outline"
          className={cn(
            'font-mono text-xs border-0',
            significant
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          )}
        >
          {significant ? '✓' : '✗'} {full.trim()}
        </Badge>
      )
    } else if (match[4]) {
      // R² value
      parts.push(
        <Badge
          key={`r-${match.index}`}
          variant="outline"
          className="font-mono text-xs border-0 bg-sky-500/20 text-sky-400"
        >
          {full.trim()}
        </Badge>
      )
    } else if (match[5]) {
      // test statistic
      parts.push(
        <Badge
          key={`s-${match.index}`}
          variant="outline"
          className="font-mono text-xs border-0 bg-amber-500/20 text-amber-400"
        >
          {full.trim()}
        </Badge>
      )
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // Process newline → paragraph breaks
  return parts.reduce<React.ReactNode[]>((acc, part, idx) => {
    if (typeof part === 'string') {
      // Split by newlines, keeping empty lines as paragraph breaks
      const lines = part.split('\n')
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) {
          acc.push(<br key={`br-${idx}-${lineIdx}`} />)
        }
        // Check if line starts with "- " or "* " for bullet points
        const trimmed = line.trim()
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          acc.push(
            <span key={`li-${idx}-${lineIdx}`} className="flex gap-2 ml-2">
              <span className="text-violet-400 select-none">•</span>
              <span>{trimmed.slice(2)}</span>
            </span>
          )
        } else {
          acc.push(line)
        }
      })
    } else {
      acc.push(part)
    }
    return acc
  }, [])
}

export function AIInterpreter({
  analysisType,
  results,
  variableNames,
  visible,
}: AIInterpreterProps) {
  const [interpretation, setInterpretation] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [conversation, setConversation] = useState<
    Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  >([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const systemPrompt = useCallback(() => {
    return `You are a statistical analysis interpreter. Explain results in plain language for non-statisticians. Include: what the test measured, key findings, whether results are significant, practical implications, and recommended next steps. Use markdown formatting: **bold** for key terms, backticks \`...\` for variable names and values. Always include p-values, R² values, and test statistics explicitly. Use bullet points for lists.`
  }, [])

  const interpretResults = useCallback(
    async (userContent: string, messages: Array<{ role: string; content: string }> = []) => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
          }),
        })

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`)
        }

        const data = await res.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
          throw new Error('No content in AI response')
        }

        setInterpretation(content)
        setConversation((prev) => [
          ...prev,
          { role: 'user', content: userContent },
          { role: 'assistant', content },
        ])
      } catch (err: any) {
        console.error('AI Interpreter error:', err)
        setError(err.message || 'Failed to interpret results')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Auto-trigger interpretation when results change and component is visible
  useEffect(() => {
    if (!visible || !results || Object.keys(results).length === 0) return

    const userContent = `Interpret these ${analysisType} results:\nVariables: ${variableNames?.join(', ') || 'N/A'}\nResults: ${JSON.stringify(results)}`
    const messages = [
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: userContent },
    ]

    interpretResults(userContent, messages)
  }, [analysisType, results, variableNames, visible, systemPrompt, interpretResults])

  // Scroll to bottom when interpretation changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [interpretation])

  const handleCopy = async () => {
    if (!interpretation) return
    try {
      await navigator.clipboard.writeText(interpretation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = interpretation
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFollowUp = async (question?: string) => {
    const q = question || followUp.trim()
    if (!q || followUpLoading) return

    setFollowUp('')
    setFollowUpLoading(true)

    try {
      const contextMsg = {
        role: 'user' as const,
        content: `[Follow-up question about previous ${analysisType} results]\n${q}\n\nOriginal results context: Variables: ${variableNames?.join(', ') || 'N/A'}, Results: ${JSON.stringify(results)}`,
      }

      const messages = [
        { role: 'system', content: systemPrompt() },
        ...conversation.filter((m) => m.role !== 'system'),
        contextMsg,
      ]

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })

      if (!res.ok) throw new Error(`API returned ${res.status}`)

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) throw new Error('No content in AI response')

      setInterpretation((prev) => `${prev}\n\n---\n\n**Follow-up:** ${q}\n\n${content}`)
      setConversation((prev) => [...prev, contextMsg, { role: 'assistant', content }])
    } catch (err: any) {
      console.error('Follow-up error:', err)
      setError(err.message || 'Failed to get follow-up response')
    } finally {
      setFollowUpLoading(false)
    }
  }

  const handleRetry = () => {
    setInterpretation('')
    setConversation([])
    setError(null)
    const userContent = `Interpret these ${analysisType} results:\nVariables: ${variableNames?.join(', ') || 'N/A'}\nResults: ${JSON.stringify(results)}`
    const messages = [
      { role: 'system', content: systemPrompt() },
      { role: 'user', content: userContent },
    ]
    interpretResults(userContent, messages)
  }

  if (!visible) return null

  return (
    <>
      {/* Keyframe styles for the sparkle bounce animation */}
      <style jsx global>{`
        @keyframes sparkle-bounce {
          0%,
          80%,
          100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <Card
        className={cn(
          'overflow-hidden',
          'border-white/10',
          'bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80',
          'backdrop-blur-xl',
          'shadow-2xl shadow-violet-500/5'
        )}
      >
        {/* Header */}
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Brain className="size-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  AI Statistical Interpreter
                </CardTitle>
                <p className="text-xs text-slate-400">
                  {loading
                    ? 'Analyzing your results...'
                    : interpretation
                      ? 'Interpretation complete'
                      : 'Waiting for results...'}
                </p>
              </div>
            </div>

            {interpretation && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRetry}
                  className="size-8 text-slate-400 hover:text-white hover:bg-white/10"
                  title="Regenerate interpretation"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="size-8 text-slate-400 hover:text-white hover:bg-white/10"
                  title="Copy interpretation"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            className="max-h-96 overflow-y-auto px-6 py-4 custom-scrollbar"
          >
            {loading && !interpretation ? (
              <SparkleLoader />
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex size-10 items-center justify-center rounded-full bg-red-500/20">
                  <span className="text-red-400 text-lg">⚠</span>
                </div>
                <p className="text-sm text-red-400 text-center">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            ) : interpretation ? (
              <div className="space-y-3">
                {/* Analysis type badge */}
                <Badge
                  variant="outline"
                  className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-normal"
                >
                  <Sparkles className="size-3 mr-1" />
                  {analysisType}
                </Badge>

                {/* Rendered interpretation */}
                <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {renderInterpretation(interpretation)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                <Brain className="size-8 opacity-40" />
                <p className="text-sm">Run an analysis to see AI interpretation</p>
              </div>
            )}

            {/* Follow-up loading indicator */}
            {followUpLoading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Sparkles className="size-3.5 animate-pulse text-violet-400" />
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}
          </div>

          {/* Follow-up section */}
          {interpretation && (
            <div className="border-t border-white/10 px-6 py-4 space-y-3">
              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleFollowUp(chip)}
                    disabled={followUpLoading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5',
                      'text-xs text-slate-300 transition-all',
                      'hover:bg-white/10 hover:text-white hover:border-white/20',
                      'disabled:opacity-50 disabled:pointer-events-none'
                    )}
                  >
                    <Sparkles className="size-3 text-violet-400" />
                    {chip}
                  </button>
                ))}
              </div>

              {/* Follow-up input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleFollowUp()
                    }
                  }}
                  placeholder="Ask a follow-up question..."
                  disabled={followUpLoading}
                  className={cn(
                    'flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2',
                    'text-sm text-slate-200 placeholder:text-slate-500',
                    'outline-none transition-all',
                    'focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
                <Button
                  onClick={() => handleFollowUp()}
                  disabled={followUpLoading || !followUp.trim()}
                  size="sm"
                  className={cn(
                    'bg-violet-600 hover:bg-violet-500 text-white',
                    'shadow-lg shadow-violet-500/20',
                    'disabled:opacity-50'
                  )}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  )
}
