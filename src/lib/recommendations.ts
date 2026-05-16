// ═══════════════════════════════════════════════════════════════
// Smart AI Recommendations Engine — Client-Side
// TheOneWayGDA Platform
// ═══════════════════════════════════════════════════════════════

export type RecommendationType = 'model' | 'feature' | 'workflow'

export interface Recommendation {
  type: RecommendationType
  id: string
  title: string
  reason: string
  score: number // 0–100
}

// ─── User Action Tracking ───────────────────────────────────

interface UserAction {
  action: string
  data?: Record<string, unknown>
  timestamp: number
  page?: string
}

interface UserProfile {
  actions: UserAction[]
  dismissedIds: string[]
  categories: Record<string, number> // category → weight
  createdAt: number
  lastActive: number
}

const STORAGE_KEY = 'oneway-recommendations-profile'
const CACHE_KEY = 'oneway-recommendations-cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MIN_ACTIONS = 3

// ─── Category Classification ────────────────────────────────

const PAGE_CATEGORIES: Record<string, string[]> = {
  '/leaderboard': ['coding', 'research', 'multimodal'],
  '/workspace': ['coding', 'research'],
  '/community': ['research', 'creative'],
  '/modules': ['coding', 'research'],
  '/assistants': ['coding', 'research', 'creative'],
  '/workflow': ['coding', 'research', 'workflow'],
  '/teams': ['workflow', 'collaboration'],
  '/billing': ['account'],
  '/developers': ['coding'],
  '/analytics': ['research'],
  '/tutorials': ['learning'],
}

const MODEL_CATALOG: Record<string, { name: string; categories: string[]; provider: string }> = {
  'gpt-4o': { name: 'GPT-4o', categories: ['coding', 'research', 'multimodal', 'creative'], provider: 'OpenAI' },
  'claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', categories: ['coding', 'research', 'creative'], provider: 'Anthropic' },
  'gemini-pro': { name: 'Gemini Pro', categories: ['research', 'multimodal', 'creative'], provider: 'Google' },
  'deepseek-v3': { name: 'DeepSeek V3', categories: ['coding', 'research'], provider: 'DeepSeek' },
  'llama-3.1': { name: 'Llama 3.1', categories: ['research', 'coding'], provider: 'Meta' },
  'glm-4': { name: 'GLM-4', categories: ['coding', 'research', 'multimodal'], provider: 'Zhipu AI' },
  'mistral-large': { name: 'Mistral Large', categories: ['coding', 'research', 'creative'], provider: 'Mistral AI' },
  'qwen-2.5': { name: 'Qwen 2.5', categories: ['research', 'creative', 'multimodal'], provider: 'Alibaba' },
}

const FEATURE_CATALOG: Record<string, { name: string; categories: string[]; description: string }> = {
  'workspace': { name: 'Workspace', categories: ['coding', 'research'], description: 'Import data and run professional statistical analyses' },
  'flagship-workflow': { name: 'AI Workflow Wizard', categories: ['workflow', 'coding', 'research'], description: '5-step guided AI analysis workflow' },
  'model-comparison': { name: 'Model Comparison', categories: ['research', 'coding'], description: 'Compare AI models side-by-side on benchmarks' },
  'team-collab': { name: 'Team Collaboration', categories: ['collaboration', 'workflow'], description: 'Share resources and collaborate in real-time' },
  'automations': { name: 'Automation Engine', categories: ['workflow', 'coding'], description: 'Schedule and chain automated analysis tasks' },
  'assistants': { name: 'AI Specialist Assistants', categories: ['coding', 'research', 'creative'], description: '7 domain-expert AI assistants' },
  'community': { name: 'Community Hub', categories: ['research', 'learning'], description: 'Browse shared workflows and community insights' },
  'api-keys': { name: 'API Key Management', categories: ['coding'], description: 'Generate and manage API keys for programmatic access' },
}

const WORKFLOW_CATALOG: Record<string, { name: string; categories: string[]; description: string }> = {
  'compare-llms': { name: 'Compare LLMs on Your Data', categories: ['coding', 'research'], description: 'Run multiple models on the same dataset and compare results' },
  'sentiment-analysis': { name: 'Sentiment Analysis Pipeline', categories: ['research', 'creative'], description: 'End-to-end text analysis with AI-powered insights' },
  'data-cleaning': { name: 'Smart Data Cleaning', categories: ['coding', 'research'], description: 'Auto-detect and fix data quality issues' },
  'benchmark-suite': { name: 'Full Benchmark Suite', categories: ['research', 'coding'], description: 'Run all benchmarks across selected models' },
  'report-generation': { name: 'AI Report Generator', categories: ['research', 'creative'], description: 'Generate professional analysis reports automatically' },
}

// ─── Recommendation Engine ──────────────────────────────────

class RecommendationEngine {
  private profile: UserProfile | null = null
  private cachedRecommendations: Recommendation[] | null = null
  private cacheTimestamp: number = 0

  /**
   * Initialize the engine — load user profile from localStorage
   */
  init(): void {
    if (typeof window === 'undefined') return
    this.profile = this.loadProfile()
    this.loadCache()
  }

  /**
   * Track a user action (page visit, model view, feature use, etc.)
   */
  trackAction(action: string, data?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return
    if (!this.profile) this.profile = this.loadProfile()

    const page = typeof window !== 'undefined' ? window.location.pathname : undefined
    const entry: UserAction = {
      action,
      data,
      timestamp: Date.now(),
      page,
    }

    this.profile.actions.push(entry)
    this.profile.lastActive = Date.now()

    // Keep last 200 actions to avoid storage bloat
    if (this.profile.actions.length > 200) {
      this.profile.actions = this.profile.actions.slice(-200)
    }

    // Update category weights
    this.updateCategoryWeights(entry)

    // Invalidate cache on new action
    this.cachedRecommendations = null

    this.saveProfile()
  }

  /**
   * Get personalized recommendations based on user behavior
   */
  getRecommendations(): Recommendation[] {
    if (typeof window === 'undefined') return []

    if (!this.profile) this.profile = this.loadProfile()

    // Not enough data
    if (this.profile.actions.length < MIN_ACTIONS) return []

    // Check cache
    if (this.cachedRecommendations && Date.now() - this.cacheTimestamp < CACHE_TTL) {
      return this.cachedRecommendations.filter(
        (r) => !this.profile!.dismissedIds.includes(r.id)
      )
    }

    // Generate new recommendations
    const recommendations = this.generateRecommendations()

    // Cache them
    this.cachedRecommendations = recommendations
    this.cacheTimestamp = Date.now()
    this.saveCache()

    return recommendations.filter((r) => !this.profile!.dismissedIds.includes(r.id))
  }

  /**
   * Dismiss a recommendation (user clicked "Not interested")
   */
  dismiss(id: string): void {
    if (!this.profile) this.profile = this.loadProfile()
    if (!this.profile.dismissedIds.includes(id)) {
      this.profile.dismissedIds.push(id)
      this.saveProfile()
    }
    // Invalidate cache
    this.cachedRecommendations = null
  }

  /**
   * Get the user's dominant category
   */
  getDominantCategory(): string | null {
    if (!this.profile) return null
    const cats = this.profile.categories
    if (Object.keys(cats).length === 0) return null
    return Object.entries(cats).sort(([, a], [, b]) => b - a)[0]?.[0] || null
  }

  /**
   * Get the number of tracked actions
   */
  getActionCount(): number {
    if (!this.profile) return 0
    return this.profile.actions.length
  }

  // ─── Private Methods ────────────────────────────────────

  private loadProfile(): UserProfile {
    if (typeof window === 'undefined') {
      return this.createEmptyProfile()
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return this.createEmptyProfile()
      const parsed = JSON.parse(raw) as UserProfile
      if (parsed && Array.isArray(parsed.actions)) return parsed
      return this.createEmptyProfile()
    } catch {
      return this.createEmptyProfile()
    }
  }

  private createEmptyProfile(): UserProfile {
    return {
      actions: [],
      dismissedIds: [],
      categories: {},
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
  }

  private saveProfile(): void {
    if (typeof window === 'undefined' || !this.profile) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile))
    } catch {
      // Storage full — trim older actions
      this.profile.actions = this.profile.actions.slice(-50)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile))
      } catch {
        // Give up silently
      }
    }
  }

  private loadCache(): void {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { recommendations: Recommendation[]; timestamp: number }
      if (parsed && Array.isArray(parsed.recommendations)) {
        this.cachedRecommendations = parsed.recommendations
        this.cacheTimestamp = parsed.timestamp
      }
    } catch {
      this.cachedRecommendations = null
    }
  }

  private saveCache(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          recommendations: this.cachedRecommendations,
          timestamp: this.cacheTimestamp,
        })
      )
    } catch {
      // Silent fail
    }
  }

  private updateCategoryWeights(entry: UserAction): void {
    if (!this.profile) return

    // From page
    if (entry.page) {
      const pageCats = PAGE_CATEGORIES[entry.page]
      if (pageCats) {
        for (const cat of pageCats) {
          this.profile.categories[cat] = (this.profile.categories[cat] || 0) + 2
        }
      }
    }

    // From action type
    const actionCategories: Record<string, string[]> = {
      'view_model': ['research', 'coding'],
      'view_benchmark': ['research', 'coding'],
      'use_workspace': ['coding', 'research'],
      'run_analysis': ['research', 'coding'],
      'view_creative': ['creative'],
      'use_workflow': ['workflow', 'coding', 'research'],
      'use_automation': ['workflow', 'coding'],
      'use_team': ['collaboration', 'workflow'],
      'use_copilot': ['research', 'coding', 'creative'],
      'compare_models': ['research', 'coding'],
    }

    const cats = actionCategories[entry.action]
    if (cats) {
      for (const cat of cats) {
        this.profile.categories[cat] = (this.profile.categories[cat] || 0) + 1
      }
    }

    // From explicit data categories
    if (entry.data?.categories) {
      const dataCats = entry.data.categories
      if (Array.isArray(dataCats)) {
        for (const cat of dataCats) {
          this.profile.categories[cat] = (this.profile.categories[cat] || 0) + 1.5
        }
      }
    }
  }

  private generateRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = []
    const profile = this.profile!
    const cats = profile.categories
    const dominantCategories = Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat)

    if (dominantCategories.length === 0) return []

    // Score models
    for (const [modelId, model] of Object.entries(MODEL_CATALOG)) {
      const matchScore = this.calculateMatchScore(model.categories, dominantCategories, cats)
      if (matchScore > 20) {
        const reason = this.generateModelReason(model, dominantCategories[0])
        recommendations.push({
          type: 'model',
          id: `model-${modelId}`,
          title: model.name,
          reason,
          score: Math.min(100, Math.round(matchScore)),
        })
      }
    }

    // Score features
    for (const [featureId, feature] of Object.entries(FEATURE_CATALOG)) {
      // Don't recommend features the user has already used
      const hasUsed = profile.actions.some((a) => a.data?.featureId === featureId || a.action === `use_${featureId}`)
      if (hasUsed) continue

      const matchScore = this.calculateMatchScore(feature.categories, dominantCategories, cats)
      if (matchScore > 15) {
        const reason = `You haven't tried the ${feature.name} yet — ${feature.description.toLowerCase()}`
        recommendations.push({
          type: 'feature',
          id: `feature-${featureId}`,
          title: feature.name,
          reason,
          score: Math.min(100, Math.round(matchScore * 1.1)), // Boost undiscovered features
        })
      }
    }

    // Score workflows
    for (const [workflowId, workflow] of Object.entries(WORKFLOW_CATALOG)) {
      const hasUsed = profile.actions.some((a) => a.action === 'use_workflow' && a.data?.workflowId === workflowId)
      if (hasUsed) continue

      const matchScore = this.calculateMatchScore(workflow.categories, dominantCategories, cats)
      if (matchScore > 20) {
        recommendations.push({
          type: 'workflow',
          id: `workflow-${workflowId}`,
          title: workflow.name,
          reason: `Popular workflow: ${workflow.description}`,
          score: Math.min(100, Math.round(matchScore)),
        })
      }
    }

    // Sort by score and return top 5
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5)
  }

  private calculateMatchScore(
    itemCategories: string[],
    dominantCategories: string[],
    allCats: Record<string, number>
  ): number {
    if (itemCategories.length === 0 || dominantCategories.length === 0) return 0

    let score = 0
    const totalWeight = Object.values(allCats).reduce((a, b) => a + b, 0) || 1

    for (const cat of itemCategories) {
      const weight = allCats[cat] || 0
      if (weight > 0) {
        const normalizedWeight = (weight / totalWeight) * 100
        // Boost if category is dominant (top 3)
        const rankBoost = dominantCategories.includes(cat) ? 1.5 : 1.0
        score += normalizedWeight * rankBoost
      }
    }

    // Small bonus for variety (if model has multiple matching categories)
    const matchCount = itemCategories.filter((c) => (allCats[c] || 0) > 0).length
    if (matchCount > 1) score *= 1.2

    return score
  }

  private generateModelReason(
    model: { name: string; provider: string; categories: string[] },
    dominantCategory: string
  ): string {
    const categoryLabels: Record<string, string> = {
      coding: 'coding benchmarks',
      research: 'research tasks',
      creative: 'creative writing',
      multimodal: 'multimodal analysis',
      workflow: 'automated workflows',
      collaboration: 'team collaboration',
      learning: 'learning resources',
      account: 'account management',
    }

    const catLabel = categoryLabels[dominantCategory] || 'this area'

    const reasons: string[] = [
      `Based on your interest in ${catLabel}, try ${model.name} by ${model.provider}`,
      `${model.name} excels at ${catLabel} — a great match for your usage patterns`,
      `Users focused on ${catLabel} rate ${model.name} highly — try it out`,
    ]

    return reasons[Math.floor(Math.random() * reasons.length)]
  }
}

// ─── Singleton Export ────────────────────────────────────────

export const recommendationEngine = new RecommendationEngine()
