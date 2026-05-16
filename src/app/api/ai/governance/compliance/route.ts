import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getPolicies } from '@/app/api/ai/policies/route'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */

interface ComplianceCategory {
  id: string
  name: string
  score: number
  maxScore: number
  percentage: number
  status: 'compliant' | 'partial' | 'non_compliant' | 'unknown'
  checks: ComplianceCheck[]
}

interface ComplianceCheck {
  id: string
  name: string
  status: 'pass' | 'fail' | 'warning' | 'unknown'
  score: number
  maxScore: number
  details: string
}

interface ComplianceRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  effort: 'quick' | 'moderate' | 'significant'
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/governance/compliance
   Returns compliance status across all governance areas
   ══════════════════════════════════════════════════════ */

export async function GET() {
  try {
    const categories: ComplianceCategory[] = []
    const recommendations: ComplianceRecommendation[] = []

    // ─── 1. Data Retention Compliance ───────────────────
    const retentionChecks: ComplianceCheck[] = []
    let retentionScore = 0
    let retentionMax = 0

    // Check if retention policy exists
    const policies = getPolicies()
    const compliancePolicy = policies.find(
      (p) => p.category === 'compliance' && p.isActive
    )
    const retentionRule = compliancePolicy?.rules.find(
      (r) => r.key === 'data_retention_days'
    )
    const retentionDays =
      typeof retentionRule?.value === 'number' ? retentionRule.value : 90

    retentionMax += 25
    if (retentionRule) {
      retentionScore += 25
      retentionChecks.push({
        id: 'retention-policy-defined',
        name: 'Data retention policy defined',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `Retention period set to ${retentionDays} days`,
      })
    } else {
      retentionChecks.push({
        id: 'retention-policy-defined',
        name: 'Data retention policy defined',
        status: 'warning' as const,
        score: 0,
        maxScore: 25,
        details: 'No explicit data retention policy found in compliance rules',
      })
      recommendations.push({
        id: 'rec-retention-policy',
        priority: 'high' as const,
        category: 'data_retention',
        title: 'Define Data Retention Policy',
        description: `Add a data_retention_days rule to your compliance policy. Recommended: 90 days.`,
        effort: 'quick' as const,
      })
    }

    // Check if old audit logs are being cleaned up
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    )
    const expiredLogsCount = await prisma.aiAuditLog.count({
      where: { createdAt: { lt: cutoffDate } },
    })
    const totalLogsCount = await prisma.aiAuditLog.count()

    retentionMax += 25
    if (totalLogsCount === 0 || expiredLogsCount === 0) {
      retentionScore += 25
      retentionChecks.push({
        id: 'retention-enforcement',
        name: 'Expired data cleanup',
        status: totalLogsCount === 0 ? ('unknown' as const) : ('pass' as const),
        score: 25,
        maxScore: 25,
        details:
          totalLogsCount === 0
            ? 'No audit logs to evaluate retention cleanup'
            : `No expired audit logs found within ${retentionDays}-day retention window`,
      })
    } else {
      retentionScore += 10
      retentionChecks.push({
        id: 'retention-enforcement',
        name: 'Expired data cleanup',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `${expiredLogsCount} audit logs exceed the ${retentionDays}-day retention period`,
      })
      recommendations.push({
        id: 'rec-retention-cleanup',
        priority: 'medium' as const,
        category: 'data_retention',
        title: 'Implement Automated Data Cleanup',
        description: `${expiredLogsCount} records exceed retention period. Implement a scheduled job to purge expired audit logs.`,
        effort: 'moderate' as const,
      })
    }

    // Check right to deletion support
    retentionMax += 25
    const deletionRule = compliancePolicy?.rules.find(
      (r) => r.key === 'right_to_deletion'
    )
    if (deletionRule && deletionRule.value === true) {
      retentionScore += 25
      retentionChecks.push({
        id: 'right-to-deletion',
        name: 'Right to deletion supported',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: 'Policy supports user right to deletion of AI-processed data',
      })
    } else {
      retentionChecks.push({
        id: 'right-to-deletion',
        name: 'Right to deletion supported',
        status: 'fail' as const,
        score: 0,
        maxScore: 25,
        details: 'Right to deletion policy rule not enabled',
      })
      recommendations.push({
        id: 'rec-right-to-deletion',
        priority: 'high' as const,
        category: 'data_retention',
        title: 'Enable Right to Deletion',
        description: 'Enable the right_to_deletion rule in your compliance policy to meet GDPR requirements.',
        effort: 'quick' as const,
      })
    }

    // Check audit trail completeness
    retentionMax += 25
    const recentLogs = await prisma.aiAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const logsWithError = recentLogs.filter((l) => l.error !== null)
    const errorRate =
      recentLogs.length > 0 ? logsWithError.length / recentLogs.length : 0
    if (errorRate < 0.1) {
      retentionScore += 25
      retentionChecks.push({
        id: 'audit-completeness',
        name: 'Audit trail completeness',
        status: recentLogs.length === 0 ? ('unknown' as const) : ('pass' as const),
        score: 25,
        maxScore: 25,
        details:
          recentLogs.length === 0
            ? 'No recent audit logs to evaluate'
            : `${Math.round(errorRate * 100)}% error rate in last 50 audit entries (healthy: <10%)`,
      })
    } else {
      retentionScore += 10
      retentionChecks.push({
        id: 'audit-completeness',
        name: 'Audit trail completeness',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `${Math.round(errorRate * 100)}% error rate in last 50 audit entries (threshold: 10%)`,
      })
      recommendations.push({
        id: 'rec-audit-error-rate',
        priority: 'medium' as const,
        category: 'data_retention',
        title: 'Reduce Audit Log Error Rate',
        description: `Current error rate is ${Math.round(errorRate * 100)}%. Investigate and fix failing AI operations.`,
        effort: 'moderate' as const,
      })
    }

    categories.push({
      id: 'data_retention',
      name: 'Data Retention & Cleanup',
      score: retentionScore,
      maxScore: retentionMax,
      percentage: retentionMax > 0 ? Math.round((retentionScore / retentionMax) * 100) : 0,
      status:
        retentionMax === 0
          ? 'unknown'
          : retentionScore / retentionMax >= 0.8
            ? 'compliant'
            : retentionScore / retentionMax >= 0.5
              ? 'partial'
              : 'non_compliant',
      checks: retentionChecks,
    })

    // ─── 2. GDPR Compliance ─────────────────────────────
    const gdprChecks: ComplianceCheck[] = []
    let gdprScore = 0
    let gdprMax = 0

    gdprMax += 25
    const gdprRule = compliancePolicy?.rules.find(
      (r) => r.key === 'gdpr_compliant'
    )
    if (gdprRule && gdprRule.value === true) {
      gdprScore += 25
      gdprChecks.push({
        id: 'gdpr-declared',
        name: 'GDPR compliance declared',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: 'GDPR compliance rule is active in policy configuration',
      })
    } else {
      gdprChecks.push({
        id: 'gdpr-declared',
        name: 'GDPR compliance declared',
        status: 'fail' as const,
        score: 0,
        maxScore: 25,
        details: 'GDPR compliance rule is not enabled in compliance policy',
      })
      recommendations.push({
        id: 'rec-gdpr-declare',
        priority: 'high' as const,
        category: 'gdpr',
        title: 'Enable GDPR Compliance',
        description: 'Set gdpr_compliant to true in your compliance policy to declare GDPR adherence.',
        effort: 'quick' as const,
      })
    }

    gdprMax += 25
    const consentRule = policies
      .find((p) => p.category === 'data_access' && p.isActive)
      ?.rules.find((r) => r.key === 'require_consent')
    if (consentRule && consentRule.value === true) {
      gdprScore += 25
      gdprChecks.push({
        id: 'gdpr-consent',
        name: 'Explicit consent required',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: 'User consent is required before accessing sensitive data',
      })
    } else {
      gdprChecks.push({
        id: 'gdpr-consent',
        name: 'Explicit consent required',
        status: 'fail' as const,
        score: 0,
        maxScore: 25,
        details: 'Consent requirement not enforced in data access policy',
      })
      recommendations.push({
        id: 'rec-gdpr-consent',
        priority: 'high' as const,
        category: 'gdpr',
        title: 'Require Explicit Consent',
        description: 'Enable the require_consent rule in your data access policy for GDPR compliance.',
        effort: 'quick' as const,
      })
    }

    gdprMax += 25
    const auditLoggingRule = policies
      .find((p) => p.category === 'data_access' && p.isActive)
      ?.rules.find((r) => r.key === 'audit_logging')
    if (auditLoggingRule && auditLoggingRule.value === true) {
      gdprScore += 25
      gdprChecks.push({
        id: 'gdpr-audit-logging',
        name: 'Audit logging enabled',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: 'All data access events are audit logged',
      })
    } else {
      gdprChecks.push({
        id: 'gdpr-audit-logging',
        name: 'Audit logging enabled',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: 'Audit logging may not be fully enabled for all data access events',
      })
    }

    gdprMax += 25
    // Check if personal data (visitorId) is properly handled in audit logs
    const anonymizedLogsCount = await prisma.aiAuditLog.count({
      where: { visitorId: null },
    })
    const identifiableLogsCount = totalLogsCount - anonymizedLogsCount
    if (totalLogsCount === 0 || anonymizedLogsCount > 0) {
      gdprScore += 25
      gdprChecks.push({
        id: 'gdpr-data-minimization',
        name: 'Data minimization',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `${anonymizedLogsCount} of ${totalLogsCount} audit entries are anonymized (no visitor ID)`,
      })
    } else {
      gdprScore += 10
      gdprChecks.push({
        id: 'gdpr-data-minimization',
        name: 'Data minimization',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `All ${totalLogsCount} audit entries contain identifiable visitor IDs. Consider anonymization.`,
      })
      recommendations.push({
        id: 'rec-gdpr-anonymize',
        priority: 'low' as const,
        category: 'gdpr',
        title: 'Implement Data Anonymization',
        description: 'Consider anonymizing older audit logs by removing visitor IDs while preserving analytics value.',
        effort: 'significant' as const,
      })
    }

    categories.push({
      id: 'gdpr',
      name: 'GDPR Compliance',
      score: gdprScore,
      maxScore: gdprMax,
      percentage: gdprMax > 0 ? Math.round((gdprScore / gdprMax) * 100) : 0,
      status:
        gdprMax === 0
          ? 'unknown'
          : gdprScore / gdprMax >= 0.8
            ? 'compliant'
            : gdprScore / gdprMax >= 0.5
              ? 'partial'
              : 'non_compliant',
      checks: gdprChecks,
    })

    // ─── 3. AI Bias Detection ───────────────────────────
    const biasChecks: ComplianceCheck[] = []
    let biasScore = 0
    let biasMax = 0

    // Check for model diversity in AI operations
    biasMax += 25
    const modelUsageRaw = await prisma.aiAuditLog.groupBy({
      by: ['model'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
    const totalAuditQueries = modelUsageRaw.reduce(
      (sum, m) => sum + m._count.id,
      0
    )
    const topModelCount =
      modelUsageRaw.length > 0 ? modelUsageRaw[0]._count.id : 0
    const topModelPercentage =
      totalAuditQueries > 0
        ? topModelCount / totalAuditQueries
        : 0

    if (modelUsageRaw.length >= 2 && topModelPercentage < 0.9) {
      biasScore += 25
      biasChecks.push({
        id: 'bias-model-diversity',
        name: 'Model diversity',
        status: totalAuditQueries === 0 ? ('unknown' as const) : ('pass' as const),
        score: 25,
        maxScore: 25,
        details:
          totalAuditQueries === 0
            ? 'No AI queries to evaluate model diversity'
            : `${modelUsageRaw.length} different models used. Top model at ${Math.round(topModelPercentage * 100)}% (threshold: 90%)`,
      })
    } else if (totalAuditQueries === 0) {
      biasScore += 15
      biasChecks.push({
        id: 'bias-model-diversity',
        name: 'Model diversity',
        status: 'unknown' as const,
        score: 15,
        maxScore: 25,
        details: 'No AI queries recorded yet — cannot evaluate model diversity',
      })
    } else {
      biasScore += 10
      biasChecks.push({
        id: 'bias-model-diversity',
        name: 'Model diversity',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `Only ${modelUsageRaw.length} model(s) used. Top model accounts for ${Math.round(topModelPercentage * 100)}% of queries.`,
      })
      recommendations.push({
        id: 'rec-bias-model-diversity',
        priority: 'medium' as const,
        category: 'bias_detection',
        title: 'Diversify AI Model Usage',
        description: `One model dominates at ${Math.round(topModelPercentage * 100)}%. Consider testing alternative models for bias mitigation.`,
        effort: 'moderate' as const,
      })
    }

    // Check action type diversity
    biasMax += 25
    const actionTypesRaw = await prisma.aiAuditLog.groupBy({
      by: ['action'],
      _count: { id: true },
    })
    if (actionTypesRaw.length >= 3) {
      biasScore += 25
      biasChecks.push({
        id: 'bias-action-diversity',
        name: 'Action type coverage',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `${actionTypesRaw.length} different action types recorded: ${actionTypesRaw.map((a) => a.action).join(', ')}`,
      })
    } else {
      biasScore += 10
      biasChecks.push({
        id: 'bias-action-diversity',
        name: 'Action type coverage',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `Only ${actionTypesRaw.length} action type(s) recorded. Broader coverage improves bias detection.`,
      })
    }

    // Check for regular monitoring
    biasMax += 25
    const now = new Date()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const monthlyLogs = await prisma.aiAuditLog.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    })
    if (monthlyLogs > 0) {
      biasScore += 25
      biasChecks.push({
        id: 'bias-monitoring-active',
        name: 'Active bias monitoring',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `${monthlyLogs} audit entries in the last 30 days — monitoring is active`,
      })
    } else {
      biasChecks.push({
        id: 'bias-monitoring-active',
        name: 'Active bias monitoring',
        status: 'warning' as const,
        score: 5,
        maxScore: 25,
        details: 'No audit activity in the last 30 days — bias monitoring is inactive',
      })
      recommendations.push({
        id: 'rec-bias-monitoring',
        priority: 'medium' as const,
        category: 'bias_detection',
        title: 'Activate Bias Monitoring',
        description: 'No AI activity detected in the last 30 days. Ensure monitoring pipelines are running.',
        effort: 'moderate' as const,
      })
    }

    // Check for token usage patterns (potential bias indicator)
    biasMax += 25
    const tokenAgg = await prisma.aiAuditLog.aggregate({
      _sum: { tokensUsed: true },
      where: { tokensUsed: { gt: 0 } },
    })
    const totalTokensUsed = tokenAgg._sum.tokensUsed || 0
    if (totalTokensUsed > 1000) {
      biasScore += 25
      biasChecks.push({
        id: 'bias-token-analysis',
        name: 'Token usage tracking',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `Total tokens tracked: ${totalTokensUsed.toLocaleString()}. Sufficient data for bias analysis.`,
      })
    } else if (totalTokensUsed === 0) {
      biasScore += 10
      biasChecks.push({
        id: 'bias-token-analysis',
        name: 'Token usage tracking',
        status: 'unknown' as const,
        score: 10,
        maxScore: 25,
        details: 'No token usage data available for bias analysis',
      })
    } else {
      biasScore += 15
      biasChecks.push({
        id: 'bias-token-analysis',
        name: 'Token usage tracking',
        status: 'warning' as const,
        score: 15,
        maxScore: 25,
        details: `Only ${totalTokensUsed.toLocaleString()} tokens tracked. More data needed for robust bias analysis.`,
      })
    }

    categories.push({
      id: 'bias_detection',
      name: 'AI Bias Detection',
      score: biasScore,
      maxScore: biasMax,
      percentage: biasMax > 0 ? Math.round((biasScore / biasMax) * 100) : 0,
      status:
        biasMax === 0
          ? 'unknown'
          : biasScore / biasMax >= 0.8
            ? 'compliant'
            : biasScore / biasMax >= 0.5
              ? 'partial'
              : 'non_compliant',
      checks: biasChecks,
    })

    // ─── 4. Audit Completeness ──────────────────────────
    const auditChecks: ComplianceCheck[] = []
    let auditScore = 0
    let auditMax = 0

    // Check automation audit coverage
    auditMax += 25
    const automationRuns = await prisma.aiAuditLog.count({
      where: { action: 'automation_run' },
    })
    const automationRules = await prisma.automationRule.count({
      where: { runCount: { gt: 0 } },
    })
    if (automationRuns >= automationRules && automationRules > 0) {
      auditScore += 25
      auditChecks.push({
        id: 'audit-automation-coverage',
        name: 'Automation run audit coverage',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `All ${automationRules} automation rules with runs have audit entries (${automationRuns} total)`,
      })
    } else if (automationRules === 0) {
      auditScore += 15
      auditChecks.push({
        id: 'audit-automation-coverage',
        name: 'Automation run audit coverage',
        status: 'unknown' as const,
        score: 15,
        maxScore: 25,
        details: 'No automation rules with execution history to audit',
      })
    } else {
      auditScore += 10
      auditChecks.push({
        id: 'audit-automation-coverage',
        name: 'Automation run audit coverage',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `${automationRules} rules with runs but only ${automationRuns} audit entries — possible gaps`,
      })
    }

    // Check decision record audit coverage
    auditMax += 25
    const decisionRecords = await prisma.decisionRecord.count()
    const decisionAuditLogs = await prisma.aiAuditLog.count({
      where: {
        action: 'ai_query',
        details: { contains: 'decision_recorded' },
      },
    })
    if (decisionRecords === 0) {
      auditScore += 15
      auditChecks.push({
        id: 'audit-decision-coverage',
        name: 'Decision record audit coverage',
        status: 'unknown' as const,
        score: 15,
        maxScore: 25,
        details: 'No decision records to audit',
      })
    } else if (decisionAuditLogs >= decisionRecords) {
      auditScore += 25
      auditChecks.push({
        id: 'audit-decision-coverage',
        name: 'Decision record audit coverage',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `All ${decisionRecords} decision records have corresponding audit entries`,
      })
    } else {
      auditScore += 10
      auditChecks.push({
        id: 'audit-decision-coverage',
        name: 'Decision record audit coverage',
        status: 'warning' as const,
        score: 10,
        maxScore: 25,
        details: `${decisionRecords} decisions but only ${decisionAuditLogs} audit entries`,
      })
    }

    // Check audit log freshness
    auditMax += 25
    const latestLog = await prisma.aiAuditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    const hoursSinceLastLog = latestLog
      ? (now.getTime() - latestLog.createdAt.getTime()) / (1000 * 60 * 60)
      : Infinity
    if (hoursSinceLastLog < 24) {
      auditScore += 25
      auditChecks.push({
        id: 'audit-freshness',
        name: 'Audit log freshness',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `Last audit entry: ${hoursSinceLastLog.toFixed(1)} hours ago`,
      })
    } else if (hoursSinceLastLog < 72) {
      auditScore += 15
      auditChecks.push({
        id: 'audit-freshness',
        name: 'Audit log freshness',
        status: 'warning' as const,
        score: 15,
        maxScore: 25,
        details: `Last audit entry: ${hoursSinceLastLog.toFixed(1)} hours ago (threshold: 24h)`,
      })
    } else if (latestLog) {
      auditScore += 5
      auditChecks.push({
        id: 'audit-freshness',
        name: 'Audit log freshness',
        status: 'fail' as const,
        score: 5,
        maxScore: 25,
        details: `Last audit entry: ${hoursSinceLastLog.toFixed(1)} hours ago — stale audit trail`,
      })
      recommendations.push({
        id: 'rec-audit-freshness',
        priority: 'high' as const,
        category: 'audit_completeness',
        title: 'Restore Audit Logging',
        description: 'No audit entries for over 3 days. Verify AI services are logging correctly.',
        effort: 'moderate' as const,
      })
    } else {
      auditScore += 0
      auditChecks.push({
        id: 'audit-freshness',
        name: 'Audit log freshness',
        status: 'fail' as const,
        score: 0,
        maxScore: 25,
        details: 'No audit logs exist',
      })
    }

    // Check data access audit coverage
    auditMax += 25
    const dataAccessLogs = await prisma.aiAuditLog.count({
      where: { action: 'data_access' },
    })
    const suggestionLogs = await prisma.aiAuditLog.count({
      where: {
        action: { in: ['suggestion_accepted', 'suggestion_dismissed'] },
      },
    })
    const aiQueryLogs = await prisma.aiAuditLog.count({
      where: { action: 'ai_query' },
    })
    if (dataAccessLogs > 0 || aiQueryLogs > 0) {
      auditScore += 25
      auditChecks.push({
        id: 'audit-data-access',
        name: 'Data access audit coverage',
        status: 'pass' as const,
        score: 25,
        maxScore: 25,
        details: `Data access: ${dataAccessLogs}, AI queries: ${aiQueryLogs}, Suggestions: ${suggestionLogs}`,
      })
    } else if (totalLogsCount > 0) {
      auditScore += 15
      auditChecks.push({
        id: 'audit-data-access',
        name: 'Data access audit coverage',
        status: 'warning' as const,
        score: 15,
        maxScore: 25,
        details: `${totalLogsCount} audit entries but no data_access or ai_query type entries found`,
      })
    } else {
      auditScore += 5
      auditChecks.push({
        id: 'audit-data-access',
        name: 'Data access audit coverage',
        status: 'unknown' as const,
        score: 5,
        maxScore: 25,
        details: 'No audit entries to evaluate data access coverage',
      })
    }

    categories.push({
      id: 'audit_completeness',
      name: 'Audit Completeness',
      score: auditScore,
      maxScore: auditMax,
      percentage: auditMax > 0 ? Math.round((auditScore / auditMax) * 100) : 0,
      status:
        auditMax === 0
          ? 'unknown'
          : auditScore / auditMax >= 0.8
            ? 'compliant'
            : auditScore / auditMax >= 0.5
              ? 'partial'
              : 'non_compliant',
      checks: auditChecks,
    })

    // ─── Calculate Overall Score ────────────────────────
    const totalWeight = categories.reduce((sum, c) => sum + c.maxScore, 0)
    const totalAchieved = categories.reduce((sum, c) => sum + c.score, 0)
    const overallScore =
      totalWeight > 0 ? Math.round((totalAchieved / totalWeight) * 100) : 0

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    )

    return NextResponse.json({
      overallScore,
      evaluatedAt: now.toISOString(),
      summary: {
        totalCategories: categories.length,
        compliant: categories.filter((c) => c.status === 'compliant').length,
        partial: categories.filter((c) => c.status === 'partial').length,
        nonCompliant: categories.filter((c) => c.status === 'non_compliant').length,
        unknown: categories.filter((c) => c.status === 'unknown').length,
        totalRecommendations: recommendations.length,
        highPriorityRecs: recommendations.filter((r) => r.priority === 'high')
          .length,
      },
      categories,
      recommendations,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
