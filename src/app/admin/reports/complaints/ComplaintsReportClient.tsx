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
  summary: { total: number; open: number; resolved: number; rejected: number }
  initialFilters: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'open',     label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
]

const TYPE_OPTIONS = [
  { value: 'service_quality',    label: 'Service Quality' },
  { value: 'nurse_behavior',     label: 'Nurse Behavior' },
  { value: 'payment_dispute',    label: 'Payment Dispute' },
  { value: 'late_arrival',       label: 'Late Arrival' },
  { value: 'wrong_treatment',    label: 'Wrong Treatment' },
  { value: 'other',              label: 'Other' },
]

const COMPLAINT_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '🔴 Open' },
  resolved: { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✅ Resolved' },
  rejected: { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: '✕ Rejected' },
  in_review:{ bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ In Review' },
}

export default function ComplaintsReportClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
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
    { label: 'Total',    value: summary.total,    icon: '⚖️', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Open',     value: summary.open,     icon: '🔴', bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
    { label: 'Resolved', value: summary.resolved, icon: '✅', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Rejected', value: summary.rejected, icon: '✕',  bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA' },
  ], [summary])

  const columns: ColDef[] = [
    { key: 'complaint_type', header: 'Type', sortable: true,
      render: v => <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{String(v ?? '—').replace(/_/g, ' ')}</span>,
      exportFormat: v => String(v ?? '') },
    { key: 'description', header: 'Description',
      render: v => <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 260 }}>{String(v ?? '—')}</span> },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'open')} map={COMPLAINT_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'created_at', header: 'Filed', sortable: true,
      render: v => <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'updated_at', header: 'Updated',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'id', header: 'Action', width: '80px',
      render: v => <Link href={`/admin/complaints/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <ReportShell
      title="Complaints & Disputes Report"
      subtitle="All complaints raised by patients, nurses and hospitals"
      summary={summaryCards}
      filters={[
        { key: 'q',         label: 'Search',    type: 'text',   placeholder: 'Search description…' },
        { key: 'status',    label: 'Status',    type: 'select', options: STATUS_OPTIONS },
        { key: 'type',      label: 'Type',      type: 'select', options: TYPE_OPTIONS },
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
      exportFilename="complaints-report"
    />
  )
}
