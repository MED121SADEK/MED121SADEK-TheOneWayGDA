// ═══════════════════════════════════════════════════════════════
// Speech Recognition Utilities
// Web Speech API helpers for the Voice Input component
// ═══════════════════════════════════════════════════════════════

// ─── Type Definitions ───────────────────────────────────────

export interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

export interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

export interface SpeechRecognitionErrorEvent {
  readonly error: string
  readonly message: string
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  grammars: unknown
  onaudiostart: ((ev: Event) => void) | null
  onaudioend: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onnomatch: ((ev: Event) => void) | null
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onsoundstart: ((ev: Event) => void) | null
  onsoundend: ((ev: Event) => void) | null
  onspeechstart: ((ev: Event) => void) | null
  onspeechend: ((ev: Event) => void) | null
  onstart: ((ev: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

// ─── Window extension for SpeechRecognition ─────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// ─── Language Mapping ────────────────────────────────────────

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-BR',
  it: 'it-IT',
  ru: 'ru-RU',
  nl: 'nl-NL',
  hi: 'hi-IN',
  tr: 'tr-TR',
  sv: 'sv-SE',
  pl: 'pl-PL',
  da: 'da-DK',
  no: 'nb-NO',
  fi: 'fi-FI',
  el: 'el-GR',
  he: 'he-IL',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
  ms: 'ms-MY',
  uk: 'uk-UA',
  cs: 'cs-CZ',
  ro: 'ro-RO',
  hu: 'hu-HU',
}

/**
 * Map a locale code to a BCP-47 speech recognition language code
 * Falls back to en-US if the locale is not recognized
 */
export function getSpeechLocale(locale: string): string {
  // Try exact match
  if (LOCALE_MAP[locale]) return LOCALE_MAP[locale]

  // Try primary subtag (e.g., "en" from "en-GB")
  const primary = locale.split('-')[0]?.toLowerCase()
  if (primary && LOCALE_MAP[primary]) return LOCALE_MAP[primary]

  // Try matching just the first two characters of the primary
  if (primary && primary.length >= 2) {
    const twoChar = primary.slice(0, 2)
    if (LOCALE_MAP[twoChar]) return LOCALE_MAP[twoChar]
  }

  // Default fallback
  return 'en-US'
}

/**
 * Check if the browser supports the Web Speech API SpeechRecognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  )
}

/**
 * Get a SpeechRecognition instance
 * Throws if not supported
 */
export function getSpeechRecognition(): SpeechRecognitionInstance {
  if (typeof window === 'undefined') {
    throw new Error('SpeechRecognition is not available in server-side rendering')
  }

  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition

  if (!SpeechRecognitionCtor) {
    throw new Error(
      'SpeechRecognition is not supported in this browser. ' +
      'Please use Chrome, Edge, or Safari for voice input support.'
    )
  }

  return new SpeechRecognitionCtor()
}

/**
 * Get a human-readable browser support message
 */
export function getBrowserSupportMessage(): string | null {
  if (typeof window === 'undefined') return null

  if (isSpeechRecognitionSupported()) return null

  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('firefox')) {
    return 'Voice input is not supported in Firefox. Please try Chrome or Edge.'
  }
  if (ua.includes('opera') || ua.includes('opr')) {
    return 'Voice input may have limited support in Opera. Chrome or Edge recommended.'
  }
  return 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.'
}

/**
 * Error messages for common speech recognition errors
 */
export const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access was denied. Please allow microphone access in your browser settings.',
  'no-speech': 'No speech detected. Please try again.',
  'audio-capture': 'No microphone found. Please connect a microphone and try again.',
  'network': 'A network error occurred during speech recognition. Please check your connection.',
  'aborted': 'Speech recognition was cancelled.',
  'service-not-available': 'Speech recognition service is currently unavailable. Please try again later.',
  'language-not-supported': 'The selected language is not supported for speech recognition.',
}
