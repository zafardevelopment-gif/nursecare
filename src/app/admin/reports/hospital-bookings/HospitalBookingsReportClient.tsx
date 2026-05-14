'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import ReportShell, { StatusBadge, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate } from '@/lib/export'
import Link from 'next/link'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { total: number; pending: number; approved: number; completed: number }
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

export default function HospitalBookingsReportClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  const navigate = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString())
    Object.entries({ ...initialFilters, ...overrides }).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }, [sp, initialFilters, router, pathname])

  const handleFilter = useCallback((values: Record<string, string>) => {
    navigate({ ...values, page: '1' })
  }, [navigate])

  const summaryCards: SummaryCard[] = useMemo(() => [
    { label: 'Total',     value: summary.total,     icon: '🏥', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Pending',   value: summary.pending,   icon: '⏳', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
    { label: 'Approved',  value: summary.approved,  icon: '✅', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Completed', value: summary.completed, icon: '🏁', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
  ], [summary])

  const columns: ColDef[] = [
    { key: 'hospital_name', header: 'Hospital', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>🏥 {String(v ?? '—')}</span> },
    { key: 'department', header: 'Department', sortable: true,
      render: v => v ? String(v) : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'shift', header: 'Shift',
      render: v => v ? <span style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>{String(v)}</span> : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'nurses_required', header: 'Nurses Req.', sortable: true,
      render: v => <span style={{ fontWeight: 700, color: '#0E7B8C' }}>{String(v ?? '—')}</span> },
    { key: 'city', header: 'City', sortable: true },
    { key: 'start_date', header: 'Start Date', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'end_date', header: 'End Date', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'pending')} map={HOSP_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'created_at', header: 'Created',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'id', header: 'Action', width: '80px',
      render: v => <Link href={`/admin/hospital-bookings/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <ReportShell
      title="Hospital Bookings Report"
      subtitle="Nurse staffing requests submitted by hospitals"
      summary={summaryCards}
      filters={[
        { key: 'q',         label: 'Search',    type: 'text',   placeholder: 'Hospital or department…' },
        { key: 'status',    label: 'Status',    type: 'select', options: STATUS_OPTIONS },
        { key: 'city',      label: 'City',      type: 'text',   placeholder: 'Filter by city' },
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to',   label: 'Date To',   type: 'date' },
      ]}
      filterValues={initialFilters}
      onFilter={handleFilter}
      columns={columns}
      data={initialData}
      total={initialCount}
      page={initialPage}
      pageSize={25}
      onPageChange={p => navigate({ page: String(p) })}
      exportFilename="hospital-bookings-report"
    />
  )
}
