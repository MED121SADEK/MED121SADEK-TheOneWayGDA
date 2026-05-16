'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/* ─── Types ─── */
interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: number
}

/* ─── Quick Actions ─── */
const QUICK_ACTIONS = [
  { label: "What's trending?", message: "What are the latest trending topics in AI right now?" },
  { label: 'Top models', message: 'What are the top-performing AI models on the leaderboard?' },
  { label: 'How to contribute?', message: 'How can I contribute to the community? What are the guidelines?' },
  { label: 'Recent discussions', message: 'What are the most recent community discussions and posts?' },
] as const

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 py-2">
      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-muted-foreground/40"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Streaming Bot Message ─── */
function StreamingBotMessage({ content }: { content: string }) {
  return (
    <div className="flex items-end gap-2 px-4 py-2">
      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        <motion.span
          className="inline-block size-0.5 bg-foreground/60 rounded-full ml-0.5 align-text-bottom"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
    </div>
  )
}

/* ─── Bot Avatar ─── */
function BotAvatar() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
        <Bot className="size-4 text-primary" />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">Community Assistant</span>
    </div>
  )
}

/* ─── Main Component ─── */
export function CommunityChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ─── Send Message ─── */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping || isStreaming) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsTyping(true)

      try {
        const res = await fetch('/api/community/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            context: 'community-page',
          }),
        })

        const data = await res.json()
        setIsTyping(false)

        if (data.reply) {
          setIsStreaming(true)
          setStreamingContent('')

          // Streaming-like effect: reveal characters progressively
          const fullReply = data.reply
          let currentIndex = 0
          const chunkSize = Math.max(1, Math.floor(fullReply.length / 60)) // reveal in ~60 steps

          const streamInterval = setInterval(() => {
            currentIndex += chunkSize
            if (currentIndex >= fullReply.length) {
              clearInterval(streamInterval)
              setStreamingContent(fullReply)
              setTimeout(() => {
                setIsStreaming(false)
                setStreamingContent('')
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `bot-${Date.now()}`,
                    role: 'bot',
                    content: fullReply,
                    timestamp: Date.now(),
                  },
                ])
              }, 300)
            } else {
              setStreamingContent(fullReply.slice(0, currentIndex))
            }
          }, 20)
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              role: 'bot',
              content: "Sorry, I couldn't generate a response. Please try again.",
              timestamp: Date.now(),
            },
          ])
        }
      } catch {
        setIsTyping(false)
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'bot',
            content: "I'm having trouble connecting. Please check your internet connection and try again.",
            timestamp: Date.now(),
          },
        ])
      }
    },
    [isTyping, isStreaming]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  /* ─── Open with welcome message ─── */
  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: 'welcome',
            role: 'bot' as const,
            content:
              "Hi there! 👋 I'm your Community Assistant. I can help you with AI model questions, trending topics, community guidelines, and more. What would you like to know?",
            timestamp: Date.now(),
          },
        ]
      }
      return prev
    })
  }, [])

  /* ─── Render ─── */
  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-3 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(560px, calc(100vh - 8rem))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Bot className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Community Assistant</p>
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                    Online
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-lg hover:bg-muted/60"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className="px-4 py-1.5">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="size-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="px-4 py-1.5">
                  <div className="flex items-end gap-2">
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="size-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
                      <motion.span
                        className="inline-block size-0.5 bg-foreground/60 rounded-full ml-0.5 align-text-bottom"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (shown when no active streaming/typing) */}
            {messages.length <= 1 && !isTyping && !isStreaming && (
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Quick Actions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.message)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-2.5 border-t border-border/40 bg-muted/20"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 h-9 text-sm rounded-xl border-border/50 bg-background/80"
                disabled={isTyping || isStreaming}
                aria-label="Chat message input"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping || isStreaming}
                className="size-9 rounded-xl flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bubble */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleOpen}
          className="group relative flex size-14 items-center justify-center rounded-2xl border border-border/40 bg-card/90 text-muted-foreground shadow-lg shadow-black/20 backdrop-blur-xl transition-colors hover:text-primary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Open community assistant chatbot"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping opacity-20" />
          {/* Glow */}
          <div className="absolute inset-0 rounded-2xl bg-primary/0 blur-xl transition-all group-hover:bg-primary/15 group-hover:blur-lg" />
          <Bot className="relative size-6" />
        </motion.button>
      )}
    </div>
  )
}
