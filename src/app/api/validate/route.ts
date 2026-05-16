import { NextRequest, NextResponse } from 'next/server'

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

interface ValidationIssue {
  row: number
  column: string
  value: any
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion: string
}

function isNumeric(val: any): boolean {
  if (typeof val === 'number') return true
  if (typeof val === 'string' && val.trim() !== '') return !isNaN(parseFloat(val))
  return false
}

function isDateString(val: any): boolean {
  if (typeof val !== 'string' || val.trim() === '') return false
  return !isNaN(Date.parse(val)) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(val.trim())
}

export async function POST(request: NextRequest) {
  try {
    const { data, variables } = (await request.json()) as {
      data: Record<string, any[]>
      variables: Variable[]
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

    const variableMap: Record<string, Variable> = {}
    for (const v of variables || []) {
      variableMap[v.name] = v
    }

    const numCols = Math.max(...columns.map((c) => (data[c]?.length ?? 0)))
    const issues: ValidationIssue[] = []

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[\d\s\-+().]{7,20}$/

    for (const col of columns) {
      const varDef = variableMap[col]
      const values = data[col] || []

      for (let i = 0; i < numCols; i++) {
        const val = values[i]

        // Check for missing values
        if (val === null || val === undefined || val === '') {
          issues.push({
            row: i,
            column: col,
            value: val,
            severity: 'warning',
            message: `Missing value in "${col}"`,
            suggestion: varDef
              ? `Consider imputing: ${varDef.type === 'numeric' ? 'mean/median' : 'mode'}`
              : 'Consider filling in or removing this row',
          })
          continue
        }

        if (!varDef) continue

        const colLower = col.toLowerCase()

        // Validate data type match
        if (varDef.type === 'numeric' || varDef.type === 'currency') {
          if (!isNumeric(val)) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'error',
              message: `Expected numeric value but got "${val}" (${typeof val})`,
              suggestion: `Convert to number or remove invalid characters from "${val}"`,
            })
            continue
          }

          const numVal = typeof val === 'number' ? val : parseFloat(val)

          // Check for impossible values based on column name heuristics
          if (
            (colLower.includes('age') || colLower.includes('edad') || colLower.includes('العمر')) &&
            (numVal < 0 || numVal > 150)
          ) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'error',
              message: `Age value ${numVal} is out of valid range (0-150)`,
              suggestion: `Verify this value. Could be a data entry error.`,
            })
          }

          if (
            (colLower.includes('percent') || colLower.includes('pct') || colLower.includes('ratio')) &&
            (numVal < 0 || numVal > 100)
          ) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'warning',
              message: `Percentage value ${numVal} is outside 0-100 range`,
              suggestion: `Verify if the value should be between 0-100 or if it's expressed as a decimal (0-1).`,
            })
          }

          if (
            colLower.includes('count') &&
            numVal < 0
          ) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'error',
              message: `Count value cannot be negative: ${numVal}`,
              suggestion: `Correct the value to a non-negative integer.`,
            })
          }

          if (
            (colLower.includes('year') || colLower.includes('anio') || colLower.includes('سنة')) &&
            (numVal < 1800 || numVal > 2100)
          ) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'warning',
              message: `Year value ${numVal} seems unlikely`,
              suggestion: `Verify this year value is correct.`,
            })
          }

          if (
            (colLower.includes('scale') || colLower.includes('likert') || colLower.includes('score')) &&
            !Number.isInteger(numVal)
          ) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'info',
              message: `Scale/Score value ${numVal} is not an integer`,
              suggestion: `Scale values are typically integers. Round to nearest integer if appropriate.`,
            })
          }

          // Check for NaN and Infinity
          if (typeof numVal === 'number' && (!isFinite(numVal) || isNaN(numVal))) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'error',
              message: `Invalid numeric value: ${val}`,
              suggestion: 'Replace with a valid number or mark as missing.',
            })
          }

          // Validate against coded values
          if (varDef.values && Object.keys(varDef.values).length > 0) {
            const validKeys = Object.keys(varDef.values)
            const strVal = String(numVal)
            if (!validKeys.includes(strVal)) {
              // Check if closest valid value
              const closest = validKeys.find((k) => {
                const diff = Math.abs(parseFloat(k) - numVal)
                return diff < 0.1
              })
              issues.push({
                row: i,
                column: col,
                value: val,
                severity: 'warning',
                message: `Value "${numVal}" is not a valid coded value for "${col}"`,
                suggestion: closest
                  ? `Did you mean "${closest}" (${varDef.values[closest]})?`
                  : `Valid values are: ${validKeys.map((k) => `${k}=${varDef.values[k]}`).join(', ')}`,
              })
            }
          }
        } else if (varDef.type === 'string') {
          if (typeof val !== 'string') {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'warning',
              message: `Expected string but got ${typeof val}: "${val}"`,
              suggestion: 'Convert to string or correct the data type.',
            })
          } else {
            // Check email format
            if (
              colLower.includes('email') ||
              colLower.includes('e-mail') ||
              colLower.includes('correo')
            ) {
              if (!emailRegex.test(val.trim())) {
                issues.push({
                  row: i,
                  column: col,
                  value: val,
                  severity: 'error',
                  message: `Invalid email format: "${val}"`,
                  suggestion: 'Check for typos or missing @ domain.',
                })
              }
            }

            // Check phone format
            if (
              colLower.includes('phone') ||
              colLower.includes('tel') ||
              colLower.includes('mobile') ||
              colLower.includes('هاتف')
            ) {
              if (!phoneRegex.test(val.trim())) {
                issues.push({
                  row: i,
                  column: col,
                  value: val,
                  severity: 'warning',
                  message: `Unexpected phone format: "${val}"`,
                  suggestion: 'Standardize to include only digits, +, -, and spaces.',
                })
              }
            }

            // Check ID format consistency
            if (
              colLower.includes('id') &&
              !colLower.includes('grid')
            ) {
              const idPattern = /^[A-Za-z0-9\-_]+$/
              if (!idPattern.test(val.trim())) {
                issues.push({
                  row: i,
                  column: col,
                  value: val,
                  severity: 'warning',
                  message: `ID contains unexpected characters: "${val}"`,
                  suggestion: 'IDs should contain only alphanumeric characters, hyphens, or underscores.',
                })
              }
            }

            // Check for unusually long strings
            if (val.length > 500) {
              issues.push({
                row: i,
                column: col,
                value: val,
                severity: 'info',
                message: `Very long string (${val.length} characters)`,
                suggestion: 'Verify this value is not corrupted or contains unintended data.',
              })
            }
          }
        } else if (varDef.type === 'date') {
          if (typeof val !== 'string' || !isDateString(val)) {
            issues.push({
              row: i,
              column: col,
              value: val,
              severity: 'error',
              message: `Invalid date format: "${val}"`,
              suggestion: 'Use ISO format (YYYY-MM-DD) or a recognizable date format.',
            })
          } else {
            const parsed = new Date(val)
            const now = new Date()

            // Check for future dates (likely errors unless for scheduled events)
            const dateRelatedWords = ['birth', 'dob', 'death', 'deceased', 'start', 'end', 'event']
            const hasDateHint = dateRelatedWords.some((w) => colLower.includes(w))

            if (
              parsed > now &&
              !colLower.includes('future') &&
              !colLower.includes('due') &&
              !colLower.includes('expiry') &&
              !colLower.includes('target')
            ) {
              issues.push({
                row: i,
                column: col,
                value: val,
                severity: 'warning',
                message: `Future date detected: "${val}"`,
                suggestion: 'Verify this date is correct. Future dates may indicate data entry errors.',
              })
            }

            // Check for very old dates
            if (parsed.getFullYear() < 1900 && !colLower.includes('historic')) {
              issues.push({
                row: i,
                column: col,
                value: val,
                severity: 'warning',
                message: `Date is before 1900: "${val}"`,
                suggestion: 'Verify this historical date is intentional.',
              })
            }
          }
        }
      }
    }

    // Check for duplicates
    const seenRows = new Map<string, number>()
    for (let i = 0; i < numCols; i++) {
      const rowKey = columns.map((c) => String(data[c]?.[i] ?? '')).join('|||')
      if (seenRows.has(rowKey)) {
        const firstRow = seenRows.get(rowKey)!
        issues.push({
          row: i,
          column: columns[0] || '',
          value: `(entire row)`,
          severity: 'warning',
          message: `Duplicate row detected — identical to row ${firstRow}`,
          suggestion: 'Review and remove duplicate rows if unintended.',
        })
      } else {
        seenRows.set(rowKey, i)
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length
    const warningCount = issues.filter((i) => i.severity === 'warning').length
    const infoCount = issues.filter((i) => i.severity === 'info').length

    return NextResponse.json({
      valid: errorCount === 0,
      issues,
      summary: {
        total: issues.length,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        columnsChecked: columns.length,
        rowsChecked: numCols,
      },
    })
  } catch (error: any) {
    console.error('Validate API error:', error.message)
    return NextResponse.json(
      { error: 'Validation failed. Please check your data format.' },
      { status: 500 }
    )
  }
}
