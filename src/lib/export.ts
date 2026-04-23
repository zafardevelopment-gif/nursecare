/**
 * Client-side Excel / CSV export helper for NurseCare+ reports.
 * Uses the `xlsx` library — runs in the browser via dynamic import.
 */

export interface ExportColumn {
  key: string
  header: string
  format?: (val: unknown) => string | number
}

export function formatDate(val: unknown): string {
  if (!val) return ''
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(val: unknown): string {
  if (!val) return ''
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? String(val) : d.toLocaleString('en-SA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatCurrency(val: unknown): string {
  if (val === null || val === undefined || val === '') return ''
  const n = parseFloat(String(val))
  return isNaN(n) ? '' : `SAR ${n.toFixed(2)}`
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
): Promise<void> {
  // Dynamic import so it only loads in the browser when needed
  const XLSX = await import('xlsx')

  const rows = data.map(row => {
    const out: Record<string, string | number> = {}
    for (const col of columns) {
      const raw = row[col.key]
      out[col.header] = col.format ? col.format(raw) : (raw === null || raw === undefined ? '' : String(raw))
    }
    return out
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto column widths
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length + 2, 16),
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}-${date}.xlsx`)
}
