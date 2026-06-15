'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Brain, Send, Bot, Zap, Target, Layers, Sparkles, Ban,
  FileText, Terminal, ChevronRight, Copy, FileSpreadsheet, Download,
} from 'lucide-react'
import type { HandlerHook } from './types'

/* ─── Panel 1: AI Assistant ─── */
export function AIPanel(h: HandlerHook) {
  const [agentGoal, setAgentGoal] = useState('')
  const isAgentActive = h.store.agentStatus !== 'idle' && h.store.agentStatus !== 'done' && h.store.agentStatus !== 'error'

  return (
    <div className="flex flex-col h-full">
      {/* Agent Section */}
      <div className="flex-shrink-0 border-b border-border/50 p-3 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-semibold">AI Agent</span>
          {isAgentActive && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-purple-400">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {h.store.agentStatus === 'planning' ? 'Planning...' : h.store.agentStatus === 'analyzing' ? 'Analyzing...' : 'Interpreting...'}
            </span>
          )}
          {h.store.agentStatus === 'done' && (
            <span className="ml-auto text-[10px] text-emerald-400">✓ Complete</span>
          )}
          {h.store.agentStatus === 'error' && (
            <span className="ml-auto text-[10px] text-red-400">✗ Failed</span>
          )}
        </div>

        <div className="flex gap-1.5 mb-2">
          <input
            className="flex-1 text-[10px] bg-background border border-border/50 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-purple-500/30 text-foreground placeholder:text-muted-foreground"
            placeholder="Goal: e.g., Find patterns..."
            value={agentGoal}
            onChange={e => setAgentGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isAgentActive && h.store.variables.length > 0 && h.handleRunAgentAnalysis(agentGoal || undefined)}
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => h.handleRunAgentAnalysis(agentGoal || undefined)}
            disabled={h.store.variables.length === 0 || isAgentActive}
            className="flex-1 flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded-md py-1.5 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Auto-Analyze
          </button>
          {isAgentActive && (
            <button
              onClick={() => h.handleCancelAgent()}
              className="flex items-center justify-center gap-1 bg-red-600/80 hover:bg-red-700 text-white text-[10px] font-medium rounded-md py-1.5 px-2.5 transition-colors"
              title="Cancel analysis"
            >
              <Ban className="w-3 h-3" />
              Cancel
            </button>
          )}
        </div>

        <div className="flex gap-1 mt-2">
          {[
            { label: 'Full Analysis', goal: 'Run a comprehensive analysis of all variables', icon: Zap },
            { label: 'Patterns', goal: 'Find patterns and relationships in the data', icon: Target },
            { label: 'Groups', goal: 'Compare groups and find significant differences', icon: Layers },
          ].map(q => (
            <button
              key={q.label}
              onClick={() => { setAgentGoal(q.goal); h.handleRunAgentAnalysis(q.goal) }}
              disabled={h.store.variables.length === 0 || isAgentActive}
              className="text-[9px] px-2 py-1 rounded bg-muted/50 hover:bg-muted border border-border/30 disabled:opacity-30 transition-colors flex items-center gap-0.5"
            >
              <q.icon className="w-2.5 h-2.5" />
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin" style={{ contain: 'layout style paint' }}>
        {h.store.chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Bot className="w-6 h-6 text-purple-400/40 mb-1.5" />
            <p className="text-[10px] text-muted-foreground">{h.t('ai.welcome')}</p>
          </div>
        )}
        {h.store.chatMessages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-1.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'ai' && (
              <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-2.5 h-2.5 text-purple-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-lg px-2.5 py-1.5 text-[10px] leading-relaxed',
              msg.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-foreground',
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {h.store.isAiTyping && (
          <div className="flex gap-1.5 items-start">
            <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-2.5 h-2.5 text-purple-400" />
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-muted/50 rounded-lg">
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={h.chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 border-t border-border/50 p-2.5">
        <div className="flex gap-1.5">
          <Input
            value={h.chatInput}
            onChange={(e) => h.setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && h.handleSendChat()}
            placeholder={h.t('ai.placeholder')}
            className="text-[10px] h-7"
          />
          <Button size="sm" className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700" onClick={h.handleSendChat} disabled={!h.chatInput.trim() || h.store.isAiTyping}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Panel 8: Syntax & Reports ─── */
export function SyntaxPanel(h: HandlerHook) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full scrollbar-thin" style={{ contain: 'layout style paint' }}>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white" onClick={h.handleExportPDF}>
          <FileText className="w-3 h-3 mr-1" />Export PDF
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={h.handleExportCSV}>
          <FileSpreadsheet className="w-3 h-3 mr-1" />CSV
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={h.handleExportJSON}>
          <Download className="w-3 h-3 mr-1" />JSON
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Syntax History</p>
          <Badge variant="outline" className="text-[9px]">{h.store.syntaxHistory.length}</Badge>
        </div>
        {h.store.syntaxHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Terminal className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No syntax generated yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Run analyses to generate SPSS syntax</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {h.store.syntaxHistory.map((syntax, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/20 rounded-lg p-2.5 group">
                <ChevronRight className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <code className="flex-1 text-[10px] font-mono text-foreground/80 break-all">{syntax}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => navigator.clipboard.writeText(syntax)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}