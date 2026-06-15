'use client'

import { useRef, useCallback } from 'react'

interface AIHandlersDeps {
  store: any
  chatInput: string
  setChatInput: (v: string) => void
  chatAbortRef: React.MutableRefObject<AbortController | null>
  agentAbortRef: React.MutableRefObject<AbortController | null>
}

export function useAIHandlers(deps: AIHandlersDeps) {
  const {
    store, chatInput, setChatInput, chatAbortRef, agentAbortRef,
  } = deps

  const handleCancelAgent = useCallback(() => {
    if (agentAbortRef.current) {
      agentAbortRef.current.abort()
      agentAbortRef.current = null
    }
    store.setAgentStatus('idle')
    store.addOutput({
      id: Date.now().toString(36),
      title: 'AI Agent Cancelled',
      type: 'text',
      content: 'The AI analysis was cancelled by the user. Any results already computed are still available above.',
      timestamp: new Date().toISOString(),
    })
  }, [store, agentAbortRef])

  const handleRunAgentAnalysis = useCallback(async (goal?: string) => {
    if (store.variables.length === 0) return

    // Cancel any previous in-flight request
    if (agentAbortRef.current) agentAbortRef.current.abort()
    const controller = new AbortController()
    agentAbortRef.current = controller

    const AGENT_TIMEOUT_MS = 60_000 // 60 seconds hard limit
    const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

    store.setAgentStatus('planning')

    store.addOutput({
      id: Date.now().toString(36),
      title: 'AI Agent: Starting Analysis...',
      type: 'text',
      content: 'The AI Agent is analyzing your dataset. This may take a moment.',
      timestamp: new Date().toISOString(),
    })

    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          data: store.data,
          variables: store.variables,
          goal: goal || undefined,
        }),
      })

      if (!res.ok) throw new Error(`Agent request failed (${res.status})`)

      const data = await res.json()
      clearTimeout(timeoutId)

      for (const result of (data.results || [])) {
        store.addOutput({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          title: result.title,
          type: result.type || 'text',
          content: result.content,
          timestamp: new Date().toISOString(),
        })
      }

      store.setAgentStatus('done')
      store.addAgentResults(data.results || [])
      store.addSyntax(`AI AGENT ANALYSIS${goal ? `: ${goal}` : ''}`)
    } catch (error) {
      clearTimeout(timeoutId)
      store.setAgentStatus('error')
      const isTimeout = error instanceof DOMException && error.name === 'AbortError'
      const msg = isTimeout
        ? `Analysis timed out after ${AGENT_TIMEOUT_MS / 1000}s. The dataset may be too large or the AI service is slow. Try with fewer variables or try again.`
        : `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      store.addOutput({
        id: Date.now().toString(36),
        title: 'AI Agent Error',
        type: 'text',
        content: msg,
        timestamp: new Date().toISOString(),
      })
    } finally {
      agentAbortRef.current = null
    }
  }, [store, agentAbortRef])

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return

    // Cancel any previous in-flight chat request
    if (chatAbortRef.current) chatAbortRef.current.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller

    const CHAT_TIMEOUT_MS = 30_000 // 30 seconds hard limit
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

    const userMsg = { id: Date.now().toString(36), role: 'user' as const, content: chatInput.trim(), timestamp: new Date().toISOString() }
    store.addChatMessage(userMsg)
    setChatInput('')
    store.setAiTyping(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...store.chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          data: store.data,
          variables: store.variables,
        }),
      })
      const data = await res.json()
      clearTimeout(timeoutId)
      const aiContent = data.choices?.[0]?.message?.content || data.error || 'Sorry, I could not process your request.'
      store.addChatMessage({ id: (Date.now() + 1).toString(36), role: 'ai', content: aiContent, timestamp: new Date().toISOString() })
    } catch (error) {
      clearTimeout(timeoutId)
      const isTimeout = error instanceof DOMException && error.name === 'AbortError'
      store.addChatMessage({
        id: (Date.now() + 1).toString(36),
        role: 'ai',
        content: isTimeout ? 'Response timed out. The AI service may be busy. Please try again.' : 'Network error. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      store.setAiTyping(false)
      chatAbortRef.current = null
    }
  }, [chatInput, store, chatAbortRef, setChatInput])

  return {
    handleSendChat,
    handleRunAgentAnalysis,
    handleCancelAgent,
  }
}