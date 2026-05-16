import type { AppModule, ModuleUpdate } from './modules'

/**
 * Simulated remote update server.
 * In production, this would call an actual update API.
 */

interface RemoteModuleVersion {
  moduleId: string
  latestVersion: string
  changelog: string
  releaseDate: string
  priority: 'critical' | 'recommended' | 'optional'
}

const REMOTE_VERSIONS: RemoteModuleVersion[] = [
  {
    moduleId: 'data-cleaning-engine',
    latestVersion: '2.4.0',
    changelog: '- Added AI-powered deduplication with fuzzy matching\n- New date format auto-detection for 15+ formats\n- Improved outlier detection with IQR+Z-score hybrid method\n- Fixed: Missing value imputation now handles categorical variables',
    releaseDate: '2026-04-20',
    priority: 'recommended',
  },
  {
    moduleId: 'correlation-matrix',
    latestVersion: '2.4.0',
    changelog: '- Added Kendall\'s tau-b correlation coefficient\n- New heatmap visualization with significance indicators\n- Support for partial correlation analysis\n- Performance: 3x faster computation for large datasets',
    releaseDate: '2026-04-18',
    priority: 'recommended',
  },
  {
    moduleId: 'linear-regression',
    latestVersion: '2.4.0',
    changelog: '- Added multiple regression support (up to 10 predictors)\n- New residual diagnostic plots (Q-Q, residuals vs fitted)\n- Cook\'s distance for outlier influence detection\n- Added VIF (Variance Inflation Factor) for multicollinearity',
    releaseDate: '2026-04-15',
    priority: 'optional',
  },
  {
    moduleId: 'descriptive-statistics',
    latestVersion: '2.3.0',
    changelog: '- Added trimmed mean (5%, 10%, 20%)\n- New coefficient of variation calculation\n- Standard error of the mean\n- Improved handling of missing values in percentile calculations',
    releaseDate: '2026-04-10',
    priority: 'optional',
  },
  {
    moduleId: 'data-validation',
    latestVersion: '2.2.0',
    changelog: '- Added IBAN and credit card number validation\n- New custom rule engine for domain-specific validation\n- Batch validation with progress reporting\n- Fixed: Phone number validation for international formats\n- CRITICAL: Patched validation bypass in email format check',
    releaseDate: '2026-04-08',
    priority: 'critical',
  },
  {
    moduleId: 'multi-language-support',
    latestVersion: '2.1.0',
    changelog: '- Added Portuguese (pt-BR) language support\n- Improved RTL rendering for Arabic text in tables\n- New auto-detect language from browser settings\n- Fixed: Japanese character encoding in CSV export',
    releaseDate: '2026-04-05',
    priority: 'optional',
  },
  {
    moduleId: 'export-system',
    latestVersion: '2.1.0',
    changelog: '- Added Excel (.xlsx) export format\n- New PDF report generation with charts\n- Export customization: select columns and rows\n- Fixed: JSON export encoding for special characters',
    releaseDate: '2026-04-02',
    priority: 'recommended',
  },
]

/**
 * Simulates checking a remote update server.
 * Returns a list of modules that have updates available.
 */
export async function checkForUpdates(
  localModules: AppModule[]
): Promise<ModuleUpdate[]> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))

  const updates: ModuleUpdate[] = []

  for (const remote of REMOTE_VERSIONS) {
    const local = localModules.find(m => m.id === remote.moduleId)
    if (!local) continue

    // Compare versions (simple semver-like comparison)
    if (compareVersions(remote.latestVersion, local.version) > 0) {
      updates.push({
        moduleId: remote.moduleId,
        moduleName: local.name,
        currentVersion: local.version,
        latestVersion: remote.latestVersion,
        changelog: remote.changelog,
        releaseDate: remote.releaseDate,
        critical: remote.priority === 'critical',
        priority: remote.priority,
      })
    }
  }

  return updates
}

/**
 * Simple semver-like version comparison.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const clean = v.replace(/^v/, '')
    return clean.split('.').map(Number)
  }

  const pa = parseVersion(a)
  const pb = parseVersion(b)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0
    const vb = pb[i] || 0
    if (va !== vb) return va - vb
  }

  return 0
}
