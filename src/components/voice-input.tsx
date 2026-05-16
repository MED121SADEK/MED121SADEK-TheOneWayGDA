'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react'
import {
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  getSpeechLocale,
  getBrowserSupportMessage,
  SPEECH_ERROR_MESSAGES,
  type SpeechRecognitionInstance,
  type SpeechRecognitionEvent,
} from '@/lib/speech-utils'

// ─── Props ───────────────────────────────────────────────────

interface VoiceInputProps {
  /** Callback with the final transcribed text */
  onTranscript: (text: string) => void
  /** Current locale for language detection (e.g., 'en', 'fr') */
  locale?: string
  /** Auto-stop after this many ms of silence (default: 5000) */
  silenceTimeout?: number
  /** Additional CSS class for the container */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

// ─── Size Config ─────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { button: 'size-7', icon: 'size-3.5', ring: 'size-9' },
  md: { button: 'size-9', icon: 'size-4', ring: 'size-11' },
  lg: { button: 'size-11', icon: 'size-5', ring: 'size-[52px]' },
}

// ─── Waveform Animation Component ────────────────────────────

function WaveformIndicator({ isListening }: { isListening: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="block w-0.5 rounded-full bg-red-400"
          animate={
            isListening
              ? {
                  height: [4, 12 + i * 3, 6, 14 - i * 2, 4],
                }
              : { height: 4 }
          }
          transition={
            isListening
              ? {
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: 'easeInOut' as const,
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function VoiceInput({
  onTranscript,
  locale = 'en',
  silenceTimeout = 5000,
  className = '',
  size = 'md',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [supportMessage, setSupportMessage] = useState<string | null>(null)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())

  // ─── Check browser support ──────────────────────────────
  useEffect(() => {
    const supported = isSpeechRecognitionSupported()
    setIsSupported(supported)
    if (!supported) {
      setSupportMessage(getBrowserSupportMessage())
    }
  }, [])

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [])

  // ─── Reset silence timer ────────────────────────────────
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    lastSpeechTimeRef.current = Date.now()

    silenceTimerRef.current = setTimeout(() => {
      // Auto-stop after silence
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }, silenceTimeout)
  }, [silenceTimeout])

  // ─── Start listening ────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupported) return

    setError(null)
    setInterimText('')

    try {
      const recognition = getSpeechRecognition()
      recognitionRef.current = recognition

      const speechLang = getSpeechLocale(locale)
      recognition.lang = speechLang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        resetSilenceTimer()
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          // Final result — send to parent
          onTranscript(finalTranscript.trim())
          setInterimText('')
          resetSilenceTimer()
        } else if (interimTranscript) {
          // Interim result — show live transcription
          setInterimText(interimTranscript)
          resetSilenceTimer()
        }
      }

      recognition.onerror = (event) => {
        const errorType = event.error || 'unknown'
        const message =
          SPEECH_ERROR_MESSAGES[errorType] ||
          `Speech recognition error: ${errorType}`

        // Don't show error for no-speech or aborted (these are expected)
        if (errorType !== 'no-speech' && errorType !== 'aborted') {
          setError(message)
        }

        setIsListening(false)
        setInterimText('')
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimText('')
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }
      }

      recognition.start()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start speech recognition'
      setError(msg)
      setIsListening(false)
    }
  }, [isSupported, locale, onTranscript, resetSilenceTimer])

  // ─── Stop listening ─────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    setIsListening(false)
    setInterimText('')
  }, [])

  // ─── Toggle ─────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // ─── Keyboard shortcut (Ctrl+M) ─────────────────────────
  useEffect(() => {
    if (!isSupported) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault()
        toggleListening()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSupported, toggleListening])

  // ─── Not supported ──────────────────────────────────────
  if (!isSupported) {
    if (supportMessage) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className={`${SIZE_CONFIG[size].button} text-muted-foreground/40 ${className}`}
              aria-label="Voice input not supported"
            >
              <MicOff className={SIZE_CONFIG[size].icon} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">{supportMessage}</p>
          </TooltipContent>
        </Tooltip>
      )
    }
    return null
  }

  const sizeCfg = SIZE_CONFIG[size]

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* ── Microphone Button ── */}
      <div className="relative">
        {/* Pulsing ring when recording */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute inset-0 rounded-full bg-red-500/30 ${sizeCfg.ring}`}
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
                className={`absolute inset-0 rounded-full bg-red-500/20 ${sizeCfg.ring}`}
              />
            </>
          )}
        </AnimatePresence>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isListening ? 'destructive' : 'ghost'}
              size="icon"
              onClick={toggleListening}
              className={`
                ${sizeCfg.button} rounded-full transition-all duration-200
                ${isListening
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
              aria-label={isListening ? 'Stop listening' : 'Start voice input (Ctrl+M)'}
            >
              {isListening ? (
                <MicOff className={sizeCfg.icon} />
              ) : (
                <Mic className={sizeCfg.icon} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {isListening ? 'Stop listening' : 'Voice input (Ctrl+M)'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* ── Real-time Transcription Display ── */}
      <AnimatePresence>
        {(isListening || interimText || error) && (
          <motion.div
            initial={{ opacity: 0, width: 0, x: -8 }}
            animate={{ opacity: 1, width: 'auto', x: 0 }}
            exit={{ opacity: 0, width: 0, x: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className={`
                flex items-center gap-2 rounded-xl border px-3 py-1.5
                ${error
                  ? 'border-red-500/30 bg-red-500/5'
                  : isListening
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-border/30 bg-muted/30'
                }
              `}
            >
              {isListening && !error && <WaveformIndicator isListening={isListening} />}
              {error ? (
                <>
                  <AlertCircle className="size-3.5 flex-shrink-0 text-red-400" />
                  <p className="text-[11px] leading-relaxed text-red-400 max-w-[200px]">
                    {error}
                  </p>
                </>
              ) : interimText ? (
                <>
                  <Volume2 className="size-3 flex-shrink-0 text-muted-foreground" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground max-w-[200px] truncate">
                    {interimText}
                  </p>
                </>
              ) : isListening ? (
                <p className="text-[11px] text-muted-foreground animate-pulse">
                  Listening...
                </p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
