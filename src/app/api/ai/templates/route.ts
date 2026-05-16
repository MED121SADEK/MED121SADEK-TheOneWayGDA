import { NextRequest, NextResponse } from 'next/server'

/* ─── Types ─── */
interface TemplateStep {
  id: string
  order: number
  name: string
  description: string
  type: 'data_prep' | 'analysis' | 'visualization' | 'interpretation'
  config: Record<string, unknown>
}

interface AnalysisTemplate {
  id: string
  name: string
  description: string
  category: 'statistical' | 'machine_learning' | 'data_cleaning' | 'visualization' | 'reporting' | 'benchmarking'
  author: string
  authorType: 'community' | 'official'
  tags: string[]
  steps: TemplateStep[]
  requiredVariables: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  rating: number
  uses: number
  isFeatured: boolean
  createdAt: string
}

/* ─── In-Memory Seed Data ─── */
function generateId(): string {
  return `tmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const seedTemplates: AnalysisTemplate[] = [
  {
    id: 'tmpl_sales_trend',
    name: 'Sales Trend Analysis',
    description: 'Comprehensive time-series analysis of sales data to identify trends, seasonality, and growth patterns for informed business decisions.',
    category: 'statistical',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['sales', 'trend', 'time-series', 'revenue'],
    steps: [
      { id: 's1', order: 1, name: 'Import CSV', description: 'Load your sales data from a CSV file with date and revenue columns.', type: 'data_prep', config: { format: 'csv', expectedColumns: 'date,revenue,quantity' } },
      { id: 's2', order: 2, name: 'Clean missing values', description: 'Handle missing dates and revenue gaps using interpolation.', type: 'data_prep', config: { method: 'interpolation' } },
      { id: 's3', order: 3, name: 'Descriptive statistics', description: 'Calculate mean, median, std dev, and trend direction.', type: 'analysis', config: { metrics: 'mean,median,std,mode,percentiles' } },
      { id: 's4', order: 4, name: 'Time series chart', description: 'Generate line chart with moving averages and trend lines.', type: 'visualization', config: { chartType: 'line', overlay: 'moving_average' } },
      { id: 's5', order: 5, name: 'Generate report', description: 'Create a summary report with key findings and recommendations.', type: 'interpretation', config: { format: 'summary' } },
    ],
    requiredVariables: ['date', 'revenue'],
    difficulty: 'intermediate',
    rating: 4.7,
    uses: 1243,
    isFeatured: true,
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'tmpl_customer_segment',
    name: 'Customer Segmentation',
    description: 'Use K-means clustering and PCA to segment customers into meaningful groups based on behavior and demographics.',
    category: 'machine_learning',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['clustering', 'k-means', 'PCA', 'segmentation', 'customers'],
    steps: [
      { id: 's1', order: 1, name: 'Load data', description: 'Import customer data with demographic and behavioral features.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's2', order: 2, name: 'Normalize features', description: 'Scale all features to standard range for clustering.', type: 'data_prep', config: { method: 'standard_scaler' } },
      { id: 's3', order: 3, name: 'K-means clustering', description: 'Apply K-means algorithm to identify customer segments.', type: 'analysis', config: { algorithm: 'kmeans', kRange: '3-8' } },
      { id: 's4', order: 4, name: 'PCA visualization', description: 'Reduce dimensions to 2D for visual cluster inspection.', type: 'visualization', config: { dimensions: 2, chartType: 'scatter' } },
      { id: 's5', order: 5, name: 'Segment profiles', description: 'Generate detailed profiles for each customer segment.', type: 'interpretation', config: { format: 'profiles' } },
    ],
    requiredVariables: ['customer_id', 'feature_1', 'feature_2'],
    difficulty: 'advanced',
    rating: 4.8,
    uses: 876,
    isFeatured: true,
    createdAt: '2025-01-20T14:00:00Z',
  },
  {
    id: 'tmpl_ab_test',
    name: 'A/B Test Evaluation',
    description: 'Statistically evaluate A/B test results with proper hypothesis testing, effect size calculation, and business recommendations.',
    category: 'statistical',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['A/B test', 'hypothesis', 't-test', 'experiment'],
    steps: [
      { id: 's1', order: 1, name: 'Load experiment data', description: 'Import control and treatment group data.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's2', order: 2, name: 'Check sample sizes', description: 'Verify power and minimum detectable effect.', type: 'analysis', config: { power: '0.8', alpha: '0.05' } },
      { id: 's3', order: 3, name: 'Run t-test', description: 'Perform independent samples t-test.', type: 'analysis', config: { test: 'welch_ttest', tails: 'two' } },
      { id: 's4', order: 4, name: 'Calculate effect size', description: "Compute Cohen's d and confidence intervals.", type: 'analysis', config: { metric: 'cohens_d' } },
      { id: 's5', order: 5, name: 'Business recommendation', description: 'Generate actionable recommendation based on results.', type: 'interpretation', config: { format: 'recommendation' } },
    ],
    requiredVariables: ['group', 'metric'],
    difficulty: 'intermediate',
    rating: 4.6,
    uses: 654,
    isFeatured: false,
    createdAt: '2025-02-01T09:00:00Z',
  },
  {
    id: 'tmpl_data_quality',
    name: 'Data Quality Audit',
    description: 'Comprehensive audit of your dataset for missing values, outliers, type inconsistencies, and overall data health scoring.',
    category: 'data_cleaning',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['quality', 'audit', 'cleaning', 'validation', 'outliers'],
    steps: [
      { id: 's1', order: 1, name: 'Import dataset', description: 'Load the dataset to be audited.', type: 'data_prep', config: { format: 'any' } },
      { id: 's2', order: 2, name: 'Check missing values', description: 'Identify patterns and percentages of missing data.', type: 'analysis', config: { method: 'comprehensive' } },
      { id: 's3', order: 3, name: 'Detect outliers', description: 'Find statistical outliers using IQR and Z-score methods.', type: 'analysis', config: { methods: 'iqr,zscore' } },
      { id: 's4', order: 4, name: 'Validate types', description: 'Check data type consistency across all columns.', type: 'analysis', config: { strictMode: 'false' } },
      { id: 's5', order: 5, name: 'Quality score report', description: 'Generate overall quality score with detailed breakdown.', type: 'interpretation', config: { format: 'score_card' } },
    ],
    requiredVariables: [],
    difficulty: 'beginner',
    rating: 4.5,
    uses: 1089,
    isFeatured: true,
    createdAt: '2025-02-05T11:00:00Z',
  },
  {
    id: 'tmpl_correlation',
    name: 'Correlation Matrix Explorer',
    description: 'Visualize and explore correlations between all numeric variables in your dataset with an interactive heatmap.',
    category: 'visualization',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['correlation', 'heatmap', 'matrix', 'variables'],
    steps: [
      { id: 's1', order: 1, name: 'Load numeric data', description: 'Import dataset with numeric columns.', type: 'data_prep', config: { format: 'any' } },
      { id: 's2', order: 2, name: 'Compute correlation matrix', description: 'Calculate Pearson correlation for all variable pairs.', type: 'analysis', config: { method: 'pearson' } },
      { id: 's3', order: 3, name: 'Heatmap', description: 'Generate a color-coded correlation heatmap.', type: 'visualization', config: { chartType: 'heatmap', colorScale: 'diverging' } },
      { id: 's4', order: 4, name: 'Identify strong correlations', description: 'Flag variable pairs with |r| > 0.7.', type: 'interpretation', config: { threshold: '0.7' } },
      { id: 's5', order: 5, name: 'Export', description: 'Export correlation matrix as CSV.', type: 'visualization', config: { format: 'csv' } },
    ],
    requiredVariables: [],
    difficulty: 'beginner',
    rating: 4.4,
    uses: 923,
    isFeatured: false,
    createdAt: '2025-02-10T16:00:00Z',
  },
  {
    id: 'tmpl_regression',
    name: 'Regression Analysis',
    description: 'Build and validate regression models with assumption checking, residual diagnostics, and prediction reports.',
    category: 'statistical',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['regression', 'linear', 'prediction', 'modeling'],
    steps: [
      { id: 's1', order: 1, name: 'Select variables', description: 'Choose dependent and independent variables.', type: 'data_prep', config: {} },
      { id: 's2', order: 2, name: 'Check assumptions', description: 'Verify linearity, normality, homoscedasticity.', type: 'analysis', config: { tests: 'shapiro,breusch_pagan' } },
      { id: 's3', order: 3, name: 'Fit model', description: 'Fit the regression model and extract coefficients.', type: 'analysis', config: { method: 'OLS' } },
      { id: 's4', order: 4, name: 'Residual diagnostics', description: 'Analyze residual plots for model adequacy.', type: 'visualization', config: { plots: 'fitted_vs_residual,qq,histogram' } },
      { id: 's5', order: 5, name: 'Prediction report', description: 'Generate predictions with confidence intervals.', type: 'interpretation', config: { ci: '95' } },
    ],
    requiredVariables: ['dependent', 'independent'],
    difficulty: 'intermediate',
    rating: 4.7,
    uses: 756,
    isFeatured: false,
    createdAt: '2025-02-15T08:00:00Z',
  },
  {
    id: 'tmpl_survey',
    name: 'Survey Data Analysis',
    description: 'Complete survey analysis workflow from frequency tables to chi-square tests with summary slide generation.',
    category: 'statistical',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['survey', 'questionnaire', 'chi-square', 'frequency'],
    steps: [
      { id: 's1', order: 1, name: 'Import survey', description: 'Load survey response data.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's2', order: 2, name: 'Frequency tables', description: 'Generate frequency distributions for all items.', type: 'analysis', config: { include: 'percent,cumulative' } },
      { id: 's3', order: 3, name: 'Cross-tabulations', description: 'Create cross-tab tables for key variable pairs.', type: 'analysis', config: { include: 'chi2,phi' } },
      { id: 's4', order: 4, name: 'Chi-square tests', description: 'Test independence between categorical variables.', type: 'analysis', config: { alpha: '0.05' } },
      { id: 's5', order: 5, name: 'Summary slides', description: 'Auto-generate presentation-ready summary slides.', type: 'interpretation', config: { format: 'slides' } },
    ],
    requiredVariables: ['responses'],
    difficulty: 'beginner',
    rating: 4.3,
    uses: 567,
    isFeatured: false,
    createdAt: '2025-02-20T13:00:00Z',
  },
  {
    id: 'tmpl_financial',
    name: 'Financial Dashboard',
    description: 'Build a comprehensive financial dashboard with KPIs, trend charts, variance analysis, and executive summary.',
    category: 'reporting',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['finance', 'dashboard', 'KPI', 'executive', 'reporting'],
    steps: [
      { id: 's1', order: 1, name: 'Load financial data', description: 'Import revenue, expenses, and profit data.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's2', order: 2, name: 'KPI calculations', description: 'Compute key financial indicators and ratios.', type: 'analysis', config: { kpis: 'revenue,profit_margin,roi,growth_rate' } },
      { id: 's3', order: 3, name: 'Trend charts', description: 'Create time-series charts for financial metrics.', type: 'visualization', config: { chartType: 'multi_line' } },
      { id: 's4', order: 4, name: 'Variance analysis', description: 'Compare actual vs budget with variance highlighting.', type: 'analysis', config: { method: 'budget_vs_actual' } },
      { id: 's5', order: 5, name: 'Executive summary', description: 'Generate C-suite ready executive summary.', type: 'interpretation', config: { format: 'executive' } },
    ],
    requiredVariables: ['date', 'revenue', 'expenses'],
    difficulty: 'intermediate',
    rating: 4.6,
    uses: 432,
    isFeatured: true,
    createdAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'tmpl_anomaly',
    name: 'Anomaly Detection',
    description: 'Detect anomalies in time-series data using multiple statistical methods with visualization and alert configuration.',
    category: 'machine_learning',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['anomaly', 'outlier', 'time-series', 'alert', 'detection'],
    steps: [
      { id: 's1', order: 1, name: 'Load time series', description: 'Import time-series data for anomaly detection.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's2', order: 2, name: 'Z-score analysis', description: 'Apply Z-score method to flag extreme values.', type: 'analysis', config: { threshold: '3' } },
      { id: 's3', order: 3, name: 'IQR method', description: 'Use interquartile range for robust outlier detection.', type: 'analysis', config: { multiplier: '1.5' } },
      { id: 's4', order: 4, name: 'Visualization', description: 'Plot data with anomaly points highlighted.', type: 'visualization', config: { chartType: 'line_with_markers' } },
      { id: 's5', order: 5, name: 'Alert configuration', description: 'Set thresholds and notification rules.', type: 'interpretation', config: { format: 'alert_rules' } },
    ],
    requiredVariables: ['timestamp', 'value'],
    difficulty: 'advanced',
    rating: 4.5,
    uses: 321,
    isFeatured: false,
    createdAt: '2025-03-05T15:00:00Z',
  },
  {
    id: 'tmpl_text_summary',
    name: 'Text Data Summary',
    description: 'Process and summarize text data with cleaning, word frequency analysis, sentiment scoring, and automated reports.',
    category: 'data_cleaning',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['text', 'NLP', 'sentiment', 'cleaning', 'summary'],
    steps: [
      { id: 's1', order: 1, name: 'Import text data', description: 'Load text data from CSV or plain text.', type: 'data_prep', config: { format: 'csv,text' } },
      { id: 's2', order: 2, name: 'Clean/normalize', description: 'Remove stopwords, punctuation, and normalize text.', type: 'data_prep', config: { language: 'auto_detect' } },
      { id: 's3', order: 3, name: 'Word frequency', description: 'Compute word and n-gram frequency distributions.', type: 'analysis', config: { ngrams: '1,2,3' } },
      { id: 's4', order: 4, name: 'Sentiment analysis', description: 'Score text sentiment (positive, negative, neutral).', type: 'analysis', config: { model: 'lexicon_based' } },
      { id: 's5', order: 5, name: 'Summary report', description: 'Generate comprehensive text analysis report.', type: 'interpretation', config: { format: 'report' } },
    ],
    requiredVariables: ['text'],
    difficulty: 'beginner',
    rating: 4.2,
    uses: 498,
    isFeatured: false,
    createdAt: '2025-03-10T12:00:00Z',
  },
  {
    id: 'tmpl_benchmark',
    name: 'Model Benchmark Config',
    description: 'Configure and run model benchmarks with statistical comparison, ranking tables, and visual performance charts.',
    category: 'benchmarking',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['benchmark', 'model', 'comparison', 'ranking', 'metrics'],
    steps: [
      { id: 's1', order: 1, name: 'Define metrics', description: 'Select evaluation metrics (accuracy, F1, latency, etc.).', type: 'data_prep', config: {} },
      { id: 's2', order: 2, name: 'Load model results', description: 'Import results from multiple model runs.', type: 'data_prep', config: { format: 'csv' } },
      { id: 's3', order: 3, name: 'Statistical comparison', description: 'Run paired tests to compare model performance.', type: 'analysis', config: { test: 'wilcoxon' } },
      { id: 's4', order: 4, name: 'Ranking table', description: 'Generate ranked comparison table with highlights.', type: 'visualization', config: { format: 'table' } },
      { id: 's5', order: 5, name: 'Visualization', description: 'Create radar charts and bar comparisons.', type: 'visualization', config: { chartType: 'radar,bar' } },
    ],
    requiredVariables: ['model_name', 'metric_value'],
    difficulty: 'advanced',
    rating: 4.4,
    uses: 234,
    isFeatured: false,
    createdAt: '2025-03-15T09:00:00Z',
  },
  {
    id: 'tmpl_predictive',
    name: 'Predictive Pipeline',
    description: 'End-to-end predictive modeling pipeline from feature engineering to model validation and prediction export.',
    category: 'machine_learning',
    author: 'TheOneWayGDA',
    authorType: 'official',
    tags: ['prediction', 'pipeline', 'ML', 'cross-validation', 'modeling'],
    steps: [
      { id: 's1', order: 1, name: 'Feature engineering', description: 'Create, select, and transform features for modeling.', type: 'data_prep', config: { auto: 'true' } },
      { id: 's2', order: 2, name: 'Train/test split', description: 'Split data into training and testing sets.', type: 'data_prep', config: { testRatio: '0.2', stratify: 'true' } },
      { id: 's3', order: 3, name: 'Model training', description: 'Train the selected model on training data.', type: 'analysis', config: { models: 'random_forest,gradient_boosting' } },
      { id: 's4', order: 4, name: 'Cross-validation', description: 'Evaluate model stability with k-fold CV.', type: 'analysis', config: { folds: '5' } },
      { id: 's5', order: 5, name: 'Prediction export', description: 'Export predictions with confidence intervals.', type: 'interpretation', config: { format: 'csv,json' } },
    ],
    requiredVariables: ['features', 'target'],
    difficulty: 'advanced',
    rating: 4.8,
    uses: 389,
    isFeatured: true,
    createdAt: '2025-03-20T14:00:00Z',
  },
]

/* ─── In-Memory Store ─── */
const templates: Map<string, AnalysisTemplate> = new Map()

// Initialize seed data
for (const t of seedTemplates) {
  templates.set(t.id, { ...t })
}

/* ─── GET: List Templates ─── */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const difficulty = searchParams.get('difficulty')
    const authorType = searchParams.get('authorType')

    let results = Array.from(templates.values())

    // Filter by category
    if (category && category !== 'all') {
      results = results.filter(t => t.category === category)
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      results = results.filter(t => t.difficulty === difficulty)
    }

    // Filter by author type
    if (authorType) {
      results = results.filter(t => t.authorType === authorType)
    }

    // Search by name, description, or tags
    if (search) {
      const q = search.toLowerCase()
      results = results.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // Sort: featured first, then by uses desc
    results.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
      return b.uses - a.uses
    })

    return NextResponse.json({
      templates: results,
      total: results.length,
      categories: ['statistical', 'machine_learning', 'data_cleaning', 'visualization', 'reporting', 'benchmarking'] as const,
    })
  } catch (error) {
    console.error('Templates list error:', error)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}

/* ─── POST: Create Template ─── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, description, category, author, tags,
      steps, requiredVariables, difficulty,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Template name is required.' }, { status: 400 })
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Template description is required.' }, { status: 400 })
    }
    if (!category || !['statistical', 'machine_learning', 'data_cleaning', 'visualization', 'reporting', 'benchmarking'].includes(category)) {
      return NextResponse.json({ error: 'Valid category is required.' }, { status: 400 })
    }

    const id = generateId()
    const template: AnalysisTemplate = {
      id,
      name: name.trim(),
      description: description.trim(),
      category,
      author: author?.trim() || 'Anonymous',
      authorType: 'community',
      tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
      steps: Array.isArray(steps) ? steps.map((s: TemplateStep, i: number) => ({
        id: s.id || `step_${id}_${i}`,
        order: s.order ?? i + 1,
        name: String(s.name || '').trim(),
        description: String(s.description || '').trim(),
        type: s.type || 'analysis',
        config: s.config || {},
      })) : [],
      requiredVariables: Array.isArray(requiredVariables) ? requiredVariables.map(String) : [],
      difficulty: difficulty || 'beginner',
      rating: 0,
      uses: 0,
      isFeatured: false,
      createdAt: new Date().toISOString(),
    }

    templates.set(id, template)

    return NextResponse.json({ template, success: true }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
