/**
 * Content-based AI context detection.
 *
 * Analyzes the user's message to determine the most appropriate AI context
 * (workspace, leaderboard, community, modules, etc.) independent of the
 * current URL. Falls back to URL-based context when no content signal is found.
 */

/**
 * Detect the most appropriate AI context from the user's message.
 * Falls back to URL-based context if no content match is found.
 */
export function detectContextFromMessage(message: string, urlContext: string): string {
  const lower = message.toLowerCase()

  // Community/social signals
  if (/\b(post|comment|discuss|thread|community|share|question)\b/.test(lower)) return 'community'
  if (/\b(news|article|trending|breaking|update)\b/.test(lower)) return 'community'

  // Leaderboard/model signals
  if (/\b(leaderboard|benchmark|model|ranking|score|evaluate|compare model)\b/.test(lower)) return 'leaderboard'
  if (/\b(arena|vote|battle|vs\.? )\b/.test(lower)) return 'leaderboard'

  // Workspace/data signals (strongest signal)
  if (/\b(data|dataset|csv|import|column|row|variable|statistic|regression|correlation|p-value|anova|t-test|histogram|scatter|distribution|transform|clean|normalize|z-score|outlier)\b/.test(lower)) return 'workspace'
  if (/\b(analysis|analyze|chart|plot|graph|visualization|mean|median|std|variance|hypothesis)\b/.test(lower)) return 'workspace'

  // Module/assistant signals
  if (/\b(assistant|agent|specialist|automate|workflow|pipeline|extension|plugin)\b/.test(lower)) return 'modules'

  // Fall back to URL-based context
  return urlContext
}