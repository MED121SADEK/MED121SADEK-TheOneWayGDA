import { NextRequest, NextResponse } from 'next/server'

interface CleanRule {
  field: string
  action: 'fix_typos' | 'normalize_dates' | 'standardize_case' | 'trim_whitespace'
  params?: Record<string, any>
}

interface Variable {
  id: string
  name: string
  type: 'numeric' | 'string' | 'date' | 'currency'
  label: string
  width: number
  decimals: number
  missing: string
  values: Record<string, string>
}

function levenshtein(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  const matrix = Array.from({ length: an + 1 }, (_, i) =>
    Array.from({ length: bn + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return matrix[an][bn]
}

function detectAndNormalizeDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null

  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }

  let m: RegExpMatchArray | null = null

  // DD/MM/YYYY or MM/DD/YYYY
  m = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[2]), year = m[3]
    if (a > 12 && b <= 12) return `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    if (b > 12 && a <= 12) return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
    return `${year}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`
  }

  // YYYY-MM-DD
  m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  // Month DD, YYYY
  m = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m) {
    const mm = monthNames[m[1].toLowerCase().slice(0, 3) as keyof typeof monthNames]
    if (mm) return `${m[3]}-${mm}-${m[2].padStart(2, '0')}`
  }

  // DD Month YYYY
  m = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const mm = monthNames[m[2].toLowerCase().slice(0, 3) as keyof typeof monthNames]
    if (mm) return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`
  }

  return null
}

function isNumericColumn(values: any[]): boolean {
  const nonEmpty = values.filter(
    (v) => v !== '' && v !== null && v !== undefined
  )
  if (nonEmpty.length === 0) return false
  return nonEmpty.every((v) => {
    if (typeof v === 'number') return true
    if (typeof v === 'string') return !isNaN(parseFloat(v)) && isFinite(Number(v))
    return false
  })
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[]): number {
  const m = mean(values)
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length)
}

function mode(values: any[]): any {
  const freq: Record<string, number> = {}
  let maxFreq = 0
  let modeVal: any = values[0]
  for (const v of values) {
    const key = String(v ?? '')
    freq[key] = (freq[key] || 0) + 1
    if (freq[key] > maxFreq) {
      maxFreq = freq[key]
      modeVal = v
    }
  }
  return modeVal
}

export async function POST(request: NextRequest) {
  try {
    const { data, variables, rules } = (await request.json()) as {
      data: Record<string, any[]>
      variables: Variable[]
      rules?: CleanRule[]
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid data: expected an object with column arrays' },
        { status: 400 }
      )
    }

    const columns = Object.keys(data)
    if (columns.length === 0) {
      return NextResponse.json(
        { error: 'No data columns found' },
        { status: 400 }
      )
    }

    const numCols = Math.max(...columns.map((c) => (data[c]?.length ?? 0)))
    const cleanedData: Record<string, any[]> = {}
    for (const col of columns) {
      cleanedData[col] = [...(data[col] || [])]
    }
    while (columns.some((c) => cleanedData[c].length < numCols)) {
      for (const col of columns) {
        if (cleanedData[col].length < numCols) cleanedData[col].push(null)
      }
    }

    const variableMap: Record<string, Variable> = {}
    for (const v of variables || []) {
      variableMap[v.name] = v
    }

    const validationReport: {
      field: string
      issues: { type: string; message: string; row?: number; oldVal?: any; newVal?: any }[]
      suggestions: string[]
    }[] = []

    let cleanedCells = 0
    let outlierCount = 0
    let duplicateCount = 0
    let missingCount = 0

    for (const col of columns) {
      const varDef = variableMap[col]
      const report: typeof validationReport[0] = {
        field: col,
        issues: [],
        suggestions: [],
      }

      const values = cleanedData[col]

      // 1. Trim whitespace for string columns
      if (!varDef || varDef.type === 'string') {
        for (let i = 0; i < values.length; i++) {
          if (typeof values[i] === 'string') {
            const trimmed = values[i].trim()
            if (trimmed !== values[i]) {
              report.issues.push({
                type: 'whitespace',
                message: `Trimmed whitespace`,
                row: i,
                oldVal: values[i],
                newVal: trimmed,
              })
              cleanedData[col][i] = trimmed
              cleanedCells++
            }
          }
        }
      }

      // 2. Standardize text casing
      const hasCaseRule = rules?.some(
        (r) => r.field === col && r.action === 'standardize_case'
      )
      if (hasCaseRule || varDef?.type === 'string') {
        for (let i = 0; i < values.length; i++) {
          if (typeof values[i] === 'string' && values[i].length > 1) {
            // Title case for labels/names (capitalize first letter of each word)
            const standardized = values[i].charAt(0).toUpperCase() + values[i].slice(1).toLowerCase()
            if (standardized !== values[i] && values[i] !== values[i].toUpperCase() && values[i] !== values[i].toLowerCase()) {
              cleanedData[col][i] = standardized
              cleanedCells++
              report.issues.push({
                type: 'casing',
                message: `Standardized casing`,
                row: i,
                oldVal: values[i],
                newVal: standardized,
              })
            }
          }
        }
      }

      // 3. Fix typos using fuzzy matching within column values
      const hasTypoRule = rules?.some(
        (r) => r.field === col && r.action === 'fix_typos'
      )
      if (hasTypoRule && varDef?.type === 'string') {
        const valueFreq: Record<string, number> = {}
        for (const v of values) {
          if (v !== null && v !== undefined && v !== '') {
            const key = String(v)
            valueFreq[key] = (valueFreq[key] || 0) + 1
          }
        }

        const commonValues = Object.entries(valueFreq)
          .filter(([, count]) => count > 1)
          .sort((a, b) => b[1] - a[1])
          .map(([val]) => val)

        for (let i = 0; i < values.length; i++) {
          const v = String(values[i] ?? '')
          if (v === '' || v.length < 2) continue
          if (commonValues.includes(v)) continue

          let bestMatch = ''
          let bestDist = Infinity
          for (const common of commonValues) {
            if (Math.abs(common.length - v.length) > 2) continue
            const dist = levenshtein(v.toLowerCase(), common.toLowerCase())
            if (dist < bestDist) {
              bestDist = dist
              bestMatch = common
            }
          }

          if (bestDist > 0 && bestDist <= 2 && bestDist < v.length * 0.3) {
            report.issues.push({
              type: 'typo',
              message: `Fixed typo "${v}" → "${bestMatch}"`,
              row: i,
              oldVal: values[i],
              newVal: bestMatch,
            })
            cleanedData[col][i] = bestMatch
            cleanedCells++
          }
        }
      }

      // 4. Detect and normalize date formats
      const hasDateRule = rules?.some(
        (r) => r.field === col && r.action === 'normalize_dates'
      )
      if ((varDef?.type === 'date' || hasDateRule) && varDef?.type !== 'numeric') {
        for (let i = 0; i < values.length; i++) {
          const normalized = detectAndNormalizeDate(String(values[i] ?? ''))
          if (normalized && normalized !== values[i]) {
            report.issues.push({
              type: 'date_format',
              message: `Normalized date "${values[i]}" → "${normalized}"`,
              row: i,
              oldVal: values[i],
              newVal: normalized,
            })
            cleanedData[col][i] = normalized
            cleanedCells++
          }
        }
      }

      // 5. Validate data types and coerce
      if (varDef) {
        for (let i = 0; i < values.length; i++) {
          const v = values[i]
          if (v === null || v === undefined || v === '') {
            missingCount++
            continue
          }

          if (varDef.type === 'numeric' || varDef.type === 'currency') {
            if (typeof v === 'string') {
              const num = parseFloat(v.replace(/[^0-9.\-]/g, ''))
              if (!isNaN(num)) {
                cleanedData[col][i] = num
                cleanedCells++
                report.issues.push({
                  type: 'type_coercion',
                  message: `Coerced "${v}" to number ${num}`,
                  row: i,
                  oldVal: v,
                  newVal: num,
                })
              }
            }
          }
        }
      }

      // 6. Detect outliers (values > 3 std dev from mean for numeric columns)
      const numericValues = values
        .filter((v) => typeof v === 'number' && isFinite(v))
        .map(Number)
      if (numericValues.length > 2 && isNumericColumn(values)) {
        const sd = stdDev(numericValues)
        const avg = mean(numericValues)
        if (sd > 0) {
          for (let i = 0; i < values.length; i++) {
            const v = typeof values[i] === 'number' ? values[i] : parseFloat(values[i])
            if (isNaN(v) || !isFinite(v)) continue
            if (Math.abs(v - avg) > 3 * sd) {
              outlierCount++
              report.issues.push({
                type: 'outlier',
                message: `Possible outlier: ${v} (mean=${avg.toFixed(2)}, std=${sd.toFixed(2)})`,
                row: i,
                oldVal: values[i],
              })
            }
          }
        }
      }

      // 7. Impute missing values
      for (let i = 0; i < cleanedData[col].length; i++) {
        if (
          cleanedData[col][i] === null ||
          cleanedData[col][i] === undefined ||
          cleanedData[col][i] === ''
        ) {
          if (isNumericColumn(values)) {
            const nums = numericValues
            if (nums.length > 0) {
              const avg = mean(nums)
              cleanedData[col][i] = parseFloat(avg.toFixed(varDef?.decimals ?? 2))
              missingCount++
              report.issues.push({
                type: 'imputed',
                message: `Imputed missing value with mean: ${cleanedData[col][i]}`,
                row: i,
              })
            }
          } else {
            const nonEmpty = values.filter(
              (v) => v !== null && v !== undefined && v !== ''
            )
            if (nonEmpty.length > 0) {
              const m = mode(nonEmpty)
              cleanedData[col][i] = m
              missingCount++
              report.issues.push({
                type: 'imputed',
                message: `Imputed missing value with mode: "${m}"`,
                row: i,
              })
            }
          }
        }
      }

      validationReport.push(report)
    }

    // 8. Flag duplicates (exact row matches)
    const seenRows = new Set<string>()
    for (let i = 0; i < numCols; i++) {
      const rowKey = columns
        .map((c) => String(cleanedData[c][i] ?? ''))
        .join('|||')
      if (seenRows.has(rowKey)) {
        duplicateCount++
        // Add to first column's report
        if (validationReport.length > 0) {
          validationReport[0].issues.push({
            type: 'duplicate',
            message: `Duplicate row detected at row ${i}`,
            row: i,
          })
        }
      } else {
        seenRows.add(rowKey)
      }
    }

    return NextResponse.json({
      cleanedData,
      validationReport,
      stats: {
        totalRows: numCols,
        cleanedCells,
        outliers: outlierCount,
        duplicates: duplicateCount,
        missing: missingCount,
      },
    })
  } catch (error: any) {
    console.error('Clean API error:', error.message)
    return NextResponse.json(
      { error: 'Data cleaning failed. Please check your data format.' },
      { status: 500 }
    )
  }
}
