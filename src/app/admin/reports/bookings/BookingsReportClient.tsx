'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import ReportShell, { StatusBadge, BOOKING_STATUS_MAP, PAYMENT_STATUS_MAP, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate, formatCurrency } from '@/lib/export'
import Link from 'next/link'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { total: number; completed: number; pending: number; cancelled: number; totalRevenue: number }
  initialFilters: Record<string, string>
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'work_done', label: 'Work Done' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'refunded', label: 'Refunded' },
]

export default function BookingsReportClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

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
    { label: 'Total Bookings', value: summary.total, icon: '📋', bg: 'rgba(14,123,140,0.1)', color: '#0E7B8C' },
    { label: 'Completed', value: summary.completed, icon: '🏁', bg: 'rgba(39,168,105,0.1)', color: '#27A869' },
    { label: 'Pending', value: summary.pending, icon: '⏳', bg: 'rgba(245,132,42,0.1)', color: '#F5842A' },
    { label: 'Cancelled', value: summary.cancelled, icon: '❌', bg: 'rgba(224,74,74,0.1)', color: '#E04A4A' },
    { label: 'Total Revenue', value: `SAR ${summary.totalRevenue.toFixed(0)}`, icon: '💰', bg: 'rgba(39,168,105,0.08)', color: '#27A869' },
  ], [summary])

  const columns: ColDef[] = [
    { key: 'patient_name', header: 'Patient', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>{String(v ?? '—')}</span> },
    { key: 'nurse_name', header: 'Nurse',
      render: v => v ? <span style={{ color: '#0E7B8C' }}>👩‍⚕️ {String(v)}</span> : <span style={{ color: 'var(--muted)' }}>Unassigned</span> },
    { key: 'service_type', header: 'Service', sortable: true },
    { key: 'start_date', header: 'Date', sortable: true,
      render: v => <span style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'city', header: 'City', sortable: true },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? '')} map={BOOKING_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'payment_status', header: 'Payment', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'unpaid')} map={PAYMENT_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'total_amount', header: 'Amount', sortable: true,
      render: v => v ? <span style={{ fontWeight: 700, color: '#27A869' }}>{formatCurrency(v)}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
      exportFormat: v => parseFloat(String(v ?? 0)) },
    { key: 'created_at', header: 'Created',
      render: v => <span style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'id', header: 'Action', width: '80px',
      render: (v) => <Link href={`/admin/bookings/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <ReportShell
      title="Bookings Report"
      subtitle="All patient booking requests — filter, search and export"
      summary={summaryCards}
      filters={[
        { key: 'q', label: 'Search', type: 'text', placeholder: 'Patient, nurse, service…' },
        { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
        { key: 'payment', label: 'Payment', type: 'select', options: PAYMENT_OPTIONS },
        { key: 'city', label: 'City', type: 'text', placeholder: 'Filter by city' },
        { key: 'date_from', label: 'Date From', type: 'date' },
        { key: 'date_to', label: 'Date To', type: 'date' },
      ]}
      filterValues={initialFilters}
      onFilter={handleFilter}
      columns={columns}
      data={initialData}
      total={initialCount}
      page={initialPage}
      pageSize={25}
      onPageChange={p => navigate({ page: String(p) })}
      exportFilename="bookings-report"
    />
  )
}
