'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import ReportShell, { StatusBadge, PAYMENT_STATUS_MAP, BOOKING_STATUS_MAP, type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate, formatCurrency } from '@/lib/export'
import Link from 'next/link'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { totalRevenue: number; totalCommission: number; totalPayouts: number; totalRefunds: number }
  serviceBreakdown: { service: string; amount: number }[]
  initialFilters: Record<string, string>
}

const FILTER_OPTIONS = [
  { value: 'commission', label: 'Commission Only' },
  { value: 'payouts',    label: 'Nurse Payouts' },
  { value: 'refunds',    label: 'Refunds' },
  { value: 'service',    label: 'Service-wise' },
]

export default function RevenueReportClient({ initialData, initialCount, initialPage, summary, serviceBreakdown, initialFilters }: Props) {
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
    { label: 'Total Revenue',   value: `SAR ${summary.totalRevenue.toFixed(0)}`,    icon: '💰', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Platform (15%)',  value: `SAR ${summary.totalCommission.toFixed(0)}`, icon: '📊', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Nurse Payouts',   value: `SAR ${summary.totalPayouts.toFixed(0)}`,    icon: '💸', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
    { label: 'Total Refunds',   value: `SAR ${summary.totalRefunds.toFixed(0)}`,    icon: '↩',  bg: 'rgba(224,74,74,0.1)',  color: '#E04A4A' },
  ], [summary])

  const columns: ColDef[] = [
    { key: 'patient_name', header: 'Patient', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>{String(v ?? '—')}</span> },
    { key: 'nurse_name', header: 'Nurse',
      render: v => v ? <span style={{ color: '#0E7B8C' }}>👩‍⚕️ {String(v)}</span> : <span style={{ color: 'var(--muted)' }}>Unassigned</span> },
    { key: 'service_type', header: 'Service', sortable: true },
    { key: 'city', header: 'City', sortable: true },
    { key: 'start_date', header: 'Date', sortable: true,
      render: v => <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'status', header: 'Status', sortable: true,
      render: v => <StatusBadge status={String(v ?? '')} map={BOOKING_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'payment_status', header: 'Payment', sortable: true,
      render: v => <StatusBadge status={String(v ?? 'unpaid')} map={PAYMENT_STATUS_MAP} />,
      exportFormat: v => String(v ?? '') },
    { key: 'total_amount', header: 'Amount', sortable: true,
      render: v => v ? <span style={{ fontWeight: 700, color: '#27A869' }}>{formatCurrency(v)}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
      exportFormat: v => parseFloat(String(v ?? 0)) },
    { key: 'total_amount', header: 'Commission (15%)', width: '110px',
      render: v => v ? <span style={{ color: '#0E7B8C' }}>{formatCurrency(parseFloat(String(v)) * 0.15)}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
      exportFormat: v => parseFloat(String(v ?? 0)) * 0.15 },
    { key: 'id', header: 'Action', width: '80px',
      render: v => <Link href={`/admin/bookings/${v}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>View →</Link> },
  ]

  return (
    <div>
      {/* Service-wise breakdown (shown when filter=service or no filter) */}
      {serviceBreakdown.length > 0 && (
        <div className="dash-shell" style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: '#27A869' }} />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Service-wise Revenue</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem' }}>
            {serviceBreakdown.map(s => (
              <div key={s.service} className="dash-card" style={{ padding: '0.9rem 1.2rem', minWidth: 160, flex: '1 1 160px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>{s.service}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#27A869' }}>SAR {s.amount.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReportShell
        title="Revenue Report"
        subtitle="Platform earnings, commissions, nurse payouts and refunds"
        summary={summaryCards}
        filters={[
          { key: 'filter',    label: 'View',       type: 'select', options: FILTER_OPTIONS },
          { key: 'q',         label: 'Search',     type: 'text',   placeholder: 'Patient, nurse, service…' },
          { key: 'nurse',     label: 'Nurse',      type: 'text',   placeholder: 'Filter by nurse name' },
          { key: 'date_from', label: 'Date From',  type: 'date' },
          { key: 'date_to',   label: 'Date To',    type: 'date' },
        ]}
        filterValues={initialFilters}
        onFilter={handleFilter}
        columns={columns}
        data={initialData}
        total={initialCount}
        page={initialPage}
        pageSize={25}
        onPageChange={p => navigate({ page: String(p) })}
        exportFilename="revenue-report"
      />
    </div>
  )
}
