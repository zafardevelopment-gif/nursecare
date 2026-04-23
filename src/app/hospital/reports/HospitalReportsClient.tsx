'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import ReportShell, { StatusBadge, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate } from '@/lib/export'
import Link from 'next/link'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { total: number; pending: number; approved: number; completed: number }
  deptBreakdown: { dept: string; requests: number; nurses: number; completed: number }[]
  hospitalName: string
  initialFilters: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending' },
  { value: 'approved',  label: 'Approved' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const HOSP_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  approved:  { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Approved' },
  active:    { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 Active' },
  completed: { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled: { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Cancelled' },
}

export default function HospitalReportsClient({ initialData, initialCount, initialPage, summary, deptBreakdown, hospitalName, initialFilters }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries({ ...initialFilters, ...overrides }).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleFilter = useCallback((values: Record<string, string>) => {
    navigate({ ...values, page: '1' })
  }, [sp])

  const summaryCards: SummaryCard[] = [
    { label: 'Total Requests', value: summary.total,     icon: '📋', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Pending',        value: summary.pending,   icon: '⏳', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
    { label: 'Approved',       value: summary.approved,  icon: '✅', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Completed',      value: summary.completed, icon: '🏁', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
  ]

  const columns: ColDef[] = [
    { key: 'department', header: 'Department', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>🏢 {String(v ?? '—')}</span> },
    { key: 'shift', header: 'Shift',
      render: v => v ? <span style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>{String(v)}</span> : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'nurses_required', header: 'Nurses', sortable: true,
      render: v => <span style={{ fontWeight: 700, color: '#0E7B8C' }}>{String(v ?? '—')}</span> },
    { key: 'start_date', header: 'Start Date', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'end_date', header: 'End Date',
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'pending')} map={HOSP_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'created_at', header: 'Submitted',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'id', header: 'Action', width: '80px',
      render: v => <Link href={`/hospital/booking/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <div>
      {/* Department breakdown */}
      {deptBreakdown.length > 0 && (
        <div className="dash-shell" style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: '#7B2FBE' }} />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Department-wise Breakdown</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem' }}>
            {deptBreakdown.map(d => (
              <div key={d.dept} className="dash-card" style={{ padding: '0.9rem 1.2rem', minWidth: 160, flex: '1 1 160px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>🏢 {d.dept}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7B2FBE' }}>{d.requests}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>requests</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0E7B8C' }}>{d.nurses}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>nurses req.</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReportShell
        title={`${hospitalName} — Staffing Report`}
        subtitle="All nurse staffing requests by department, shift and status"
        summary={summaryCards}
        filters={[
          { key: 'q',          label: 'Search',     type: 'text',   placeholder: 'Department…' },
          { key: 'department', label: 'Department', type: 'text',   placeholder: 'Filter by department' },
          { key: 'status',     label: 'Status',     type: 'select', options: STATUS_OPTIONS },
          { key: 'date_from',  label: 'Date From',  type: 'date' },
          { key: 'date_to',    label: 'Date To',    type: 'date' },
        ]}
        filterValues={initialFilters}
        onFilter={handleFilter}
        columns={columns}
        data={initialData}
        total={initialCount}
        page={initialPage}
        pageSize={25}
        onPageChange={p => navigate({ page: String(p) })}
        exportFilename="hospital-staffing-report"
      />
    </div>
  )
}
