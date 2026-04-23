'use client'

import { useState, useTransition } from 'react'
import { exportToExcel, type ExportColumn } from '@/lib/export'

/* ─── Types ────────────────────────────────────────────────── */
export interface ColDef {
  key: string
  header: string
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode
  exportFormat?: (val: unknown) => string | number
  sortable?: boolean
  width?: string
}

export interface FilterDef {
  key: string
  label: string
  type: 'text' | 'select' | 'date'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface SummaryCard {
  label: string
  value: string | number
  icon: string
  color: string
  bg: string
}

interface ReportShellProps {
  title: string
  subtitle?: string
  summary?: SummaryCard[]
  filters?: FilterDef[]
  filterValues?: Record<string, string>
  onFilter?: (values: Record<string, string>) => void
  columns: ColDef[]
  data: Record<string, unknown>[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (p: number) => void
  exportFilename?: string
  exportColumns?: ExportColumn[]
  loading?: boolean
  emptyMessage?: string
}

const PAGE_SIZE_DEFAULT = 20

export default function ReportShell({
  title, subtitle, summary = [], filters = [], filterValues = {}, onFilter,
  columns, data, total, page = 1, pageSize = PAGE_SIZE_DEFAULT, onPageChange,
  exportFilename, exportColumns, loading, emptyMessage,
}: ReportShellProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filterValues)
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exporting, startExport] = useTransition()

  const totalPages = total !== undefined ? Math.ceil(total / pageSize) : 1

  function handleFilterChange(key: string, val: string) {
    setLocalFilters(prev => ({ ...prev, [key]: val }))
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFilter?.(localFilters)
  }

  function handleClear() {
    const empty: Record<string, string> = {}
    filters.forEach(f => { empty[f.key] = '' })
    setLocalFilters(empty)
    onFilter?.(empty)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  function handleExport() {
    startExport(async () => {
      const cols: ExportColumn[] = (exportColumns ?? columns.map(c => ({
        key: c.key,
        header: c.header,
        format: c.exportFormat,
      })))
      await exportToExcel(data, cols, exportFilename ?? title.toLowerCase().replace(/\s+/g, '-'))
    })
  }

  const hasFilters = filters.some(f => localFilters[f.key])

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">{title}</h1>
          {subtitle && <p className="dash-sub">{subtitle}</p>}
        </div>
        {exportFilename !== undefined && (
          <button
            onClick={handleExport}
            disabled={exporting || data.length === 0}
            className="btn-export"
          >
            {exporting ? '⏳ Exporting…' : '📥 Export Excel'}
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="dash-kpi-row" style={{ marginBottom: '1.25rem' }}>
          {summary.map((s, i) => (
            <div key={i} className="dash-kpi">
              <div className="dash-kpi-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div className="dash-kpi-num" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-kpi-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {filters.length > 0 && (
        <div className="dash-card report-filter-card">
          <form onSubmit={handleFilterSubmit}>
            <div className="report-filter-grid">
              {filters.map(f => (
                <div key={f.key} className="report-filter-field">
                  <label className="report-filter-label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      value={localFilters[f.key] ?? ''}
                      onChange={e => handleFilterChange(f.key, e.target.value)}
                      className="report-input"
                    >
                      <option value="">All</option>
                      {f.options?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={localFilters[f.key] ?? ''}
                      onChange={e => handleFilterChange(f.key, e.target.value)}
                      placeholder={f.placeholder ?? ''}
                      className="report-input"
                    />
                  )}
                </div>
              ))}
              <div className="report-filter-actions">
                <button type="submit" className="btn-filter">Apply</button>
                {hasFilters && (
                  <button type="button" onClick={handleClear} className="btn-clear">Clear</button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Results info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          {loading ? 'Loading…' : `${total ?? data.length} record${(total ?? data.length) !== 1 ? 's' : ''}${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}`}
        </span>
      </div>

      {/* Table */}
      <div className="dash-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading report…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📊</div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No data found</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--muted)' }}>{emptyMessage ?? 'Try adjusting your filters.'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  {columns.map(c => (
                    <th
                      key={c.key}
                      style={{ width: c.width, cursor: c.sortable ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={() => c.sortable && handleSort(c.key)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {c.header}
                        {c.sortable && (
                          <span style={{ fontSize: '0.6rem', color: sortKey === c.key ? 'var(--teal)' : 'var(--muted)' }}>
                            {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={String(row.id ?? i)}>
                    <td><span className="report-seq">{(page - 1) * pageSize + i + 1}</span></td>
                    {columns.map(c => (
                      <td key={c.key}>
                        {c.render ? c.render(row[c.key], row) : (row[c.key] === null || row[c.key] === undefined ? <span style={{ color: 'var(--muted)' }}>—</span> : String(row[c.key]))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="report-pagination">
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {page > 1 && <button onClick={() => onPageChange?.(page - 1)} className="pag-btn">← Prev</button>}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, j) => {
                const p = j + 1
                return <button key={p} onClick={() => onPageChange?.(p)} className={`pag-btn${p === page ? ' active' : ''}`}>{p}</button>
              })}
              {page < totalPages && <button onClick={() => onPageChange?.(page + 1)} className="pag-btn">Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────── */
export function StatusBadge({ status, map }: { status: string; map: Record<string, { bg: string; color: string; label: string }> }) {
  const s = map[status] ?? { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: status }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

export const BOOKING_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  cancelled:   { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Cancelled' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
}

export const PAYMENT_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  paid:     { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✅ Paid' },
  unpaid:   { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⚠️ Unpaid' },
  refunded: { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '↩ Refunded' },
}
