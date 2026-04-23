'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import ReportShell, { StatusBadge, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate } from '@/lib/export'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { total: number; pending: number; approved: number; rejected: number }
  initialFilters: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const LEAVE_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  approved: { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✅ Approved' },
  rejected: { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Rejected' },
}

export default function LeaveReportClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
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
    { label: 'Total Requests', value: summary.total,    icon: '🌴', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Pending',        value: summary.pending,  icon: '⏳', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
    { label: 'Approved',       value: summary.approved, icon: '✅', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Rejected',       value: summary.rejected, icon: '✕',  bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
  ]

  const columns: ColDef[] = [
    { key: 'nurse_name', header: 'Nurse', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>👩‍⚕️ {String(v ?? '—')}</span> },
    { key: 'nurse_city', header: 'City', sortable: true,
      render: v => v ? String(v) : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'reason', header: 'Reason',
      render: v => <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 220 }}>{String(v ?? '—')}</span> },
    { key: 'start_date', header: 'From', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'end_date', header: 'To', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'pending')} map={LEAVE_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'created_at', header: 'Applied',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
  ]

  return (
    <ReportShell
      title="Leave Requests Report"
      subtitle="Nurse leave history, approvals and rejections"
      summary={summaryCards}
      filters={[
        { key: 'q',         label: 'Search',    type: 'text',   placeholder: 'Nurse name or reason…' },
        { key: 'status',    label: 'Status',    type: 'select', options: STATUS_OPTIONS },
        { key: 'date_from', label: 'Leave From', type: 'date' },
        { key: 'date_to',   label: 'Leave To',   type: 'date' },
      ]}
      filterValues={initialFilters}
      onFilter={handleFilter}
      columns={columns}
      data={initialData}
      total={initialCount}
      page={initialPage}
      pageSize={25}
      onPageChange={p => navigate({ page: String(p) })}
      exportFilename="leave-report"
    />
  )
}
