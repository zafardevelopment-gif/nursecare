'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import ReportShell, { StatusBadge, BOOKING_STATUS_MAP, PAYMENT_STATUS_MAP, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate, formatCurrency } from '@/lib/export'
import Link from 'next/link'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { totalJobs: number; completedJobs: number; pendingJobs: number; cancelledJobs: number; totalEarned: number; pendingPay: number; totalLeave: number }
  initialFilters: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'accepted',    label: 'Accepted' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'work_done',   label: 'Work Done' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'declined',    label: 'Declined' },
]

const PAYMENT_OPTIONS = [
  { value: 'paid',     label: 'Paid' },
  { value: 'unpaid',   label: 'Unpaid' },
  { value: 'refunded', label: 'Refunded' },
]

export default function ProviderReportsClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
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
    { label: 'Total Jobs',    value: summary.totalJobs,                        icon: '📋', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Completed',     value: summary.completedJobs,                    icon: '✅', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Active',        value: summary.pendingJobs,                      icon: '🔄', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
    { label: 'Total Earned',  value: `SAR ${summary.totalEarned.toFixed(0)}`,  icon: '💰', bg: 'rgba(39,168,105,0.08)', color: '#27A869' },
    { label: 'Pending Pay',   value: `SAR ${summary.pendingPay.toFixed(0)}`,   icon: '⏳', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
    { label: 'Leave Taken',   value: summary.totalLeave,                       icon: '🌴', bg: 'rgba(14,123,140,0.08)', color: '#0ABFCC' },
  ]

  const columns: ColDef[] = [
    { key: 'patient_name', header: 'Patient', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>🤒 {String(v ?? '—')}</span> },
    { key: 'service_type', header: 'Service', sortable: true },
    { key: 'start_date', header: 'Date', sortable: true,
      render: v => <span style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'duration_hours', header: 'Hours',
      render: v => v ? <span style={{ fontWeight: 600, color: '#0E7B8C' }}>{String(v)}h</span> : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'city', header: 'City', sortable: true },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? '')} map={BOOKING_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'payment_status', header: 'Payment', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'unpaid')} map={PAYMENT_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'total_amount', header: 'My Earnings (85%)', sortable: true,
      render: v => v
        ? <span style={{ fontWeight: 700, color: '#27A869' }}>{formatCurrency(parseFloat(String(v)) * 0.85)}</span>
        : <span style={{ color: 'var(--muted)' }}>—</span>,
      exportFormat: v => parseFloat(String(v ?? 0)) * 0.85 },
    { key: 'created_at', header: 'Booked',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'id', header: 'Action', width: '80px',
      render: v => <Link href={`/provider/bookings/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <ReportShell
      title="My Jobs & Earnings"
      subtitle="Your assigned jobs, completion history and payouts"
      summary={summaryCards}
      filters={[
        { key: 'q',         label: 'Search',    type: 'text',   placeholder: 'Patient, service, city…' },
        { key: 'status',    label: 'Status',    type: 'select', options: STATUS_OPTIONS },
        { key: 'payment',   label: 'Payment',   type: 'select', options: PAYMENT_OPTIONS },
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
      exportFilename="my-jobs-earnings"
    />
  )
}
