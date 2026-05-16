'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface Specialist {
  id: string
  name: string
  title: string
  icon: string
  color: string
  description: string
  capabilities: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMeta {
  tokensUsed?: number
  durationMs?: number
  withMemory?: boolean
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

const ICON_MAP: Record<string, string> = {
  BarChart3: '📊',
  Brain: '🧠',
  Sigma: '∑',
  Code2: '💻',
  FileText: '📝',
  GraduationCap: '🎓',
  Workflow: '⚡',
}

function getEmoji(icon: string): string {
  return ICON_MAP[icon] || '🤖'
}

const QUICK_PROMPTS: Record<string, string[]> = {
  data_analyst: [
    'Analyze my dataset and find key patterns',
    'Help me choose the right statistical test',
    'Design an A/B test for my experiment',
    'What insights can I extract from this data?',
  ],
  ml_engineer: [
    'Help me build a classification model',
    'Recommend a model architecture for my use case',
    'How should I evaluate my ML model?',
    'Set up a model training pipeline',
  ],
  statistician: [
    'Explain Bayesian vs frequentist approaches',
    'Help me determine the right sample size',
    'How do I check if my data is normally distributed?',
    'Walk me through regression assumptions',
  ],
  code_generator: [
    'Write a data processing pipeline in Python',
    'Build an API endpoint for data querying',
    'Create an interactive data visualization',
    'Generate SQL queries for complex analysis',
  ],
  report_writer: [
    'Write an executive summary of my analysis',
    'Create a technical documentation structure',
    'Help me write a research paper outline',
    'Draft a business proposal with data insights',
  ],
  research_synthesizer: [
    'Compare different AI model architectures',
    'Review recent advances in NLP',
    'Analyze market trends in data analytics',
    'Compare data visualization frameworks',
  ],
  automation_architect: [
    'Design an automated data pipeline',
    'Set up monitoring and alerting for workflows',
    'Create an event-driven automation system',
    'Optimize my existing workflow performance',
  ],
}

function getQuickPrompts(specialistId: string): string[] {
  return QUICK_PROMPTS[specialistId] || [
    'What can you help me with?',
    'Give me an overview of your expertise',
    'Help me with a complex analysis task',
    'Suggest best practices for my workflow',
  ]
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════ */

export default function AssistantsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [activeSpecialist, setActiveSpecialist] = useState<Specialist | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [fetchingSpecialists, setFetchingSpecialists] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ─── Fetch specialists on mount ─── */
  useEffect(() => {
    async function loadSpecialists() {
      try {
        const res = await fetch('/api/ai/assistant')
        if (!res.ok) throw new Error('Failed to fetch specialists')
        const data = await res.json()
        const list: Specialist[] = data.specialists || []
        setSpecialists(list)
        if (list.length > 0) setActiveSpecialist(list[0])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setFetchingSpecialists(false)
      }
    }
    loadSpecialists()
  }, [])

  /* ─── Auto-scroll to bottom ─── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  /* ─── Clear chat on specialist switch ─── */
  const handleSelectSpecialist = useCallback((specialist: Specialist) => {
    setActiveSpecialist(specialist)
    setMessages([])
    setInput('')
    setError(null)
  }, [])

  /* ─── Send message ─── */
  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeSpecialist || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialist: activeSpecialist.id,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Request failed with status ${res.status}`)
      }

      const data = await res.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'No response received.',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
      // Remove the user message so they can retry
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }, [input, activeSpecialist, isLoading, messages])

  /* ─── Handle quick prompt click ─── */
  const handleQuickPrompt = useCallback((prompt: string) => {
    setInput(prompt)
    // Focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  /* ─── Handle key press ─── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  /* ─── Auto-resize textarea ─── */
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    },
    []
  )

  /* ─── Clear chat ─── */
  const handleClearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */

  if (fetchingSpecialists) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-zinc-400">Loading AI Assistants...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─── Specialist Selection Grid ─── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {specialists.map((specialist) => {
              const isActive = activeSpecialist?.id === specialist.id
              return (
                <button
                  key={specialist.id}
                  onClick={() => handleSelectSpecialist(specialist)}
                  className={`group relative text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer
                    ${
                      isActive
                        ? 'bg-zinc-950 border-opacity-60 shadow-lg'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-950'
                    }
                  `}
                  style={
                    isActive
                      ? {
                          borderColor: specialist.color,
                          boxShadow: `0 0 20px -4px ${specialist.color}40, 0 0 40px -8px ${specialist.color}20`,
                        }
                      : { borderColor: undefined }
                  }
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div
                      className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                      style={{ backgroundColor: specialist.color }}
                    />
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{
                        backgroundColor: `${specialist.color}15`,
                        border: `1px solid ${specialist.color}30`,
                      }}
                    >
                      {getEmoji(specialist.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-zinc-100 truncate">
                        {specialist.name}
                      </h3>
                      <p
                        className="text-xs font-medium mt-0.5"
                        style={{ color: specialist.color }}
                      >
                        {specialist.title}
                      </p>
                    </div>
                    {isActive && (
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse"
                        style={{ backgroundColor: specialist.color }}
                      />
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                    {specialist.description}
                  </p>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {specialist.capabilities.slice(0, 4).map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors"
                        style={{
                          color: specialist.color,
                          backgroundColor: `${specialist.color}10`,
                          borderColor: `${specialist.color}20`,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                    {specialist.capabilities.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        +{specialist.capabilities.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── Chat Interface ─── */}
        {activeSpecialist && (
          <section className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col overflow-hidden" style={{ minHeight: '500px' }}>
            {/* Chat Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800"
              style={{ backgroundColor: `${activeSpecialist.color}08` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{
                    backgroundColor: `${activeSpecialist.color}15`,
                    border: `1px solid ${activeSpecialist.color}30`,
                  }}
                >
                  {getEmoji(activeSpecialist.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm text-zinc-100">
                      {activeSpecialist.name}
                    </h2>
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
                      style={{
                        color: activeSpecialist.color,
                        backgroundColor: `${activeSpecialist.color}15`,
                      }}
                    >
                      {activeSpecialist.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {messages.length > 0
                      ? `${messages.length} message${messages.length > 1 ? 's' : ''} in conversation`
                      : 'Start a conversation'}
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Clear Chat
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4" style={{ maxHeight: 'calc(100vh - 560px)', minHeight: '400px' }}>
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{
                      backgroundColor: `${activeSpecialist.color}10`,
                      border: `1px solid ${activeSpecialist.color}20`,
                    }}
                  >
                    {getEmoji(activeSpecialist.icon)}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-200">
                    Chat with {activeSpecialist.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1 max-w-md">
                    {activeSpecialist.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSpecialist.color }} />
                    <span className="text-xs text-zinc-500">Ready to assist</span>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-zinc-800 text-zinc-100 rounded-bl-md border border-zinc-700/50'
                    }`}
                  >
                    {/* Assistant label */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs">{getEmoji(activeSpecialist.icon)}</span>
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                          {activeSpecialist.name}
                        </span>
                      </div>
                    )}
                    <div className={`text-sm leading-relaxed ${msg.role === 'assistant' ? 'whitespace-pre-wrap' : ''}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs">{getEmoji(activeSpecialist.icon)}</span>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {activeSpecialist.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                      <span className="text-xs text-zinc-500 ml-1">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 max-w-lg">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                      </svg>
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && !isLoading && (
              <div className="border-t border-zinc-800 px-4 sm:px-6 py-3">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {getQuickPrompts(activeSpecialist.id).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-150 cursor-pointer hover:text-zinc-100"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                      </svg>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-zinc-800 p-3 sm:p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeSpecialist
                        ? `Ask ${activeSpecialist.name} anything... (Enter to send, Shift+Enter for new line)`
                        : 'Select a specialist to begin...'
                    }
                    disabled={isLoading}
                    rows={1}
                    className="w-full resize-none rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 px-4 py-3 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ maxHeight: '160px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !activeSpecialist}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-500 text-white transition-all duration-150 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  title="Send message"
                >
                  {isLoading ? (
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                      <path d="m21.854 2.147-10.94 10.939" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-600 mt-2 text-center">
                AI responses may contain inaccuracies. Verify important information.
              </p>
            </div>
          </section>
        )}
    </main>
  )
}
