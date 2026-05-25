/**
 * Export Utilities — CSV, XLSX, PDF, PNG, JSON download helpers.
 * Uses PapaParse (CSV), SheetJS (XLSX), jsPDF + autoTable (PDF), html-to-image (PNG).
 */

/* ─── Browser Download Trigger ─── */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Convert column-oriented data to row-oriented ─── */
export function columnToRows(
  data: Record<string, any[]>,
  headers: string[],
): Record<string, any>[] {
  if (!headers.length) return []
  const maxRows = Math.max(...headers.map(h => (data[h] || []).length), 0)
  const rows: Record<string, any>[] = []
  for (let i = 0; i < maxRows; i++) {
    const row: Record<string, any> = {}
    for (const h of headers) {
      row[h] = data[h]?.[i] ?? ''
    }
    rows.push(row)
  }
  return rows
}

/* ─── CSV Export ─── */
export async function exportToCSV(
  data: Record<string, any[]>,
  headers: string[],
  filename: string,
) {
  try {
    const Papa = (await import('papaparse')).default
    const rows = columnToRows(data, headers)
    const csv = Papa.unparse(rows, { columns: headers })
    downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
    return true
  } catch (err) {
    console.error('CSV export error:', err)
    return false
  }
}

/* ─── XLSX Export ─── */
export async function exportToXLSX(
  data: Record<string, any[]>,
  headers: string[],
  filename: string,
) {
  try {
    const XLSX = (await import('xlsx')).default
    const rows = columnToRows(data, headers)
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    // Auto-size columns
    const colWidths = headers.map(h => ({
      wch: Math.max(h.length, ...rows.map(r => String(r[h] || '').length).slice(0, 50)) + 2,
    }))
    ws['!cols'] = colWidths
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    downloadFile(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return true
  } catch (err) {
    console.error('XLSX export error:', err)
    return false
  }
}

/* ─── PDF Export ─── */
export interface PDFExportConfig {
  title: string
  subtitle?: string
  columns: { header: string; dataKey: string; width?: number }[]
  rows: Record<string, any>[]
  filename: string
  orientation?: 'portrait' | 'landscape'
  headerColor?: number[]
}

export async function exportToPDF(config: PDFExportConfig) {
  try {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const {
      title, subtitle, columns, rows, filename,
      orientation = 'portrait',
      headerColor = [33, 115, 70], // Academic teal #217346
    } = config

    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header band
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 14)

    // Subtitle + date
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.text(`${subtitle || ''}   |   Generated: ${dateStr}`, 14, 22)

    // Reset text color
    doc.setTextColor(0, 0, 0)

    // Table
    const tableData = rows.map(row => columns.map(col => String(row[col.dataKey] ?? '')))

    ;(doc as any).autoTable({
      head: [columns.map(c => c.header)],
      body: tableData,
      startY: 34,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: headerColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: columns.reduce((acc, col, i) => {
        if (col.width) acc[i] = { cellWidth: col.width }
        return acc
      }, {} as Record<number, { cellWidth: number }>),
      margin: { left: 14, right: 14 },
    })

    // Page numbers
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const h = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, h - 8, { align: 'center' })
    }

    doc.save(`${filename}.pdf`)
    return true
  } catch (err) {
    console.error('PDF export error:', err)
    return false
  }
}

/* ─── PNG Export (chart capture) ─── */
export async function exportChartToPNG(elementId: string, filename: string) {
  try {
    const { toPng } = await import('html-to-image')
    const el = document.getElementById(elementId)
    if (!el) { console.error('Element not found:', elementId); return false }
    const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${filename}.png`
    a.click()
    return true
  } catch (err) {
    console.error('PNG export error:', err)
    return false
  }
}

/* ─── JSON Export ─── */
export function exportToJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, `${filename}.json`, 'application/json;charset=utf-8;')
  return true
}
