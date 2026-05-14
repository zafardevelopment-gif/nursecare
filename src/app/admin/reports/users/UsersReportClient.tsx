'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import ReportShell, { type ColDef, type SummaryCard } from '@/app/components/ReportShell'
import { formatDate } from '@/lib/export'

interface Props {
  initialData: Record<string, unknown>[]
  initialCount: number
  initialPage: number
  summary: { totalUsers: number; totalPatients: number; totalNurses: number; totalHospitals: number; activeUsers: number }
  initialFilters: Record<string, string>
}

const ROLE_OPTIONS = [
  { value: 'patient',  label: 'Patients' },
  { value: 'provider', label: 'Nurses' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'admin',    label: 'Admins' },
]

const ACTIVE_OPTIONS = [
  { value: 'true',  label: 'Active (30 days)' },
  { value: 'false', label: 'Inactive' },
]

const ROLE_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  patient:  { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '🤒 Patient' },
  provider: { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '👩‍⚕️ Nurse' },
  hospital: { bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0', label: '🏥 Hospital' },
  admin:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '🛡 Admin' },
}

export default function UsersReportClient({ initialData, initialCount, initialPage, summary, initialFilters }: Props) {
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
    { label: 'Total Users',    value: summary.totalUsers,    icon: '👥', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
    { label: 'Patients',       value: summary.totalPatients, icon: '🤒', bg: 'rgba(14,123,140,0.08)', color: '#0ABFCC' },
    { label: 'Nurses',         value: summary.totalNurses,   icon: '👩‍⚕️', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
    { label: 'Hospitals',      value: summary.totalHospitals, icon: '🏥', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
    { label: 'Active (30d)',   value: summary.activeUsers,   icon: '✅', bg: 'rgba(39,168,105,0.08)', color: '#27A869' },
  ], [summary])

  const columns: ColDef[] = [
    { key: 'full_name', header: 'Name', sortable: true,
      render: v => <span style={{ fontWeight: 700 }}>{String(v ?? '—')}</span> },
    { key: 'email', header: 'Email', sortable: true,
      render: v => <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{String(v ?? '—')}</span> },
    { key: 'role', header: 'Role', sortable: true,
      render: v => {
        const r = ROLE_COLOR[String(v ?? '')] ?? { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: String(v ?? '—') }
        return <span style={{ background: r.bg, color: r.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{r.label}</span>
      },
      exportFormat: v => String(v ?? '') },
    { key: 'city', header: 'City', sortable: true,
      render: v => v ? String(v) : <span style={{ color: 'var(--muted)' }}>—</span> },
    { key: 'created_at', header: 'Joined', sortable: true,
      render: v => <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>,
      exportFormat: formatDate },
    { key: 'last_sign_in_at', header: 'Last Active', sortable: true,
      render: v => v
        ? <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(v)}</span>
        : <span style={{ fontSize: '0.72rem', color: '#E04A4A' }}>Never</span>,
      exportFormat: v => v ? formatDate(v) : 'Never' },
  ]

  return (
    <ReportShell
      title="User Report"
      subtitle="All registered users — patients, nurses and hospitals"
      summary={summaryCards}
      filters={[
        { key: 'q',      label: 'Search',  type: 'text',   placeholder: 'Name or email…' },
        { key: 'role',   label: 'Role',    type: 'select', options: ROLE_OPTIONS },
        { key: 'active', label: 'Status',  type: 'select', options: ACTIVE_OPTIONS },
        { key: 'city',   label: 'City',    type: 'text',   placeholder: 'Filter by city' },
      ]}
      filterValues={initialFilters}
      onFilter={handleFilter}
      columns={columns}
      data={initialData}
      total={initialCount}
      page={initialPage}
      pageSize={25}
      onPageChange={p => navigate({ page: String(p) })}
      exportFilename="users-report"
    />
  )
}
