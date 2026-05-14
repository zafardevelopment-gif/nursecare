import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import HomepageSettingsClient from '../homepage/HomepageSettingsClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/* ── Activity log helpers (copied from activity/page.tsx) ─────────── */
const ACTION_ICON: Record<string, string> = {
  booking_created: '📋', booking_accepted: '✅', booking_declined: '✕',
  booking_cancelled: '❌', booking_cancel_requested: '⚠️', booking_reschedule_requested: '📅',
  booking_on_the_way: '🚗', booking_in_progress: '🔄', booking_work_done: '🎉',
  booking_completed: '🏁', booking_payment_done: '💳', nurse_registered: '👤',
  nurse_approved: '👩‍⚕️', nurse_rejected: '❌', nurse_profile_updated: '📝',
  nurse_availability_updated: '🕐', leave_requested: '🌴', leave_approved: '✅',
  leave_rejected: '✕', complaint_raised: '⚖️', complaint_resolved: '✅',
  complaint_rejected: '✕', agreement_created: '📄', agreement_signed: '✍️',
  agreement_rejected: '❌', hospital_approved: '🏥', hospital_rejected: '❌',
  hospital_booking_created: '🏥', hospital_booking_updated: '🏥',
  payment_received: '💳', payment_reminder_sent: '⚠️',
  admin_settings_changed: '⚙️', homepage_settings_changed: '🌐',
  user_created: '👤', user_updated: '👤', notification_sent: '🔔',
}
const MODULE_ICON: Record<string, string> = {
  booking: '📋', nurse: '👩‍⚕️', patient: '🧑', leave: '🌴',
  complaint: '⚖️', agreement: '📄', hospital: '🏥', payment: '💳',
  settings: '⚙️', homepage: '🌐', auth: '🔐', system: '🖥️',
}
const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  admin:    { bg: 'rgba(201,168,76,0.12)',  color: '#C9A84C' },
  patient:  { bg: 'rgba(39,168,105,0.1)',   color: '#27A869' },
  provider: { bg: 'rgba(10,191,204,0.1)',   color: '#0ABFCC' },
  hospital: { bg: 'rgba(155,89,182,0.1)',   color: '#9B59B6' },
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function getModule(log: any): string {
  return log.module ?? (log.meta as any)?.module ?? log.entity_type ?? ''
}

const PAGE_SIZE = 25

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', borderRadius: 10, fontWeight: 700,
    fontSize: '0.85rem', textDecoration: 'none',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
    boxShadow: active ? '0 2px 10px rgba(14,123,140,0.2)' : 'none',
  }
}

interface Props {
  searchParams: Promise<{
    tab?: string; page?: string; q?: string; role?: string
    action?: string; module?: string; date_from?: string; date_to?: string
  }>
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const activeTab = params.tab === 'activity' ? 'activity' : params.tab === 'homepage' ? 'homepage' : 'reports'

  /* ── Reports data ────────────────────────────────────────────────── */
  const [
    { count: totalBookings },
    { count: completedBookings },
    { count: pendingBookings },
    { count: openComplaints },
    { count: totalNurses },
    { count: totalHospBookings },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }),
  ])

  const REPORT_GROUPS = [
    {
      group: 'Booking Reports', color: '#0E7B8C',
      reports: [
        { href: '/admin/reports/bookings', icon: '📋', label: 'All Bookings', desc: 'Full booking list with filters', badge: totalBookings ?? 0 },
        { href: '/admin/reports/bookings?status=completed', icon: '🏁', label: 'Completed Bookings', desc: 'Successfully completed services', badge: completedBookings ?? 0 },
        { href: '/admin/reports/bookings?status=pending', icon: '⏳', label: 'Pending Bookings', desc: 'Awaiting nurse acceptance', badge: pendingBookings ?? 0 },
        { href: '/admin/reports/bookings?status=cancelled', icon: '❌', label: 'Cancelled Bookings', desc: 'Cancelled or declined bookings' },
        { href: '/admin/reports/hospital-bookings', icon: '🏥', label: 'Hospital Bookings', desc: 'Staffing requests from hospitals', badge: totalHospBookings ?? 0 },
      ],
    },
    {
      group: 'Financial Reports', color: '#27A869',
      reports: [
        { href: '/admin/reports/revenue', icon: '💰', label: 'Revenue Report', desc: 'Total revenue, paid vs unpaid' },
        { href: '/admin/reports/revenue?filter=commission', icon: '📊', label: 'Commission Report', desc: 'Platform commission breakdown' },
        { href: '/admin/reports/revenue?filter=payouts', icon: '💸', label: 'Nurse Payout Report', desc: 'Nurse earnings after commission' },
        { href: '/admin/reports/revenue?filter=refunds', icon: '↩', label: 'Refund Report', desc: 'Refunded bookings and amounts' },
        { href: '/admin/reports/revenue?filter=service', icon: '🩺', label: 'Service-wise Earnings', desc: 'Revenue broken down by service' },
      ],
    },
    {
      group: 'User Reports', color: '#7B2FBE',
      reports: [
        { href: '/admin/reports/users', icon: '👥', label: 'All Users', desc: 'Patients, nurses, hospitals' },
        { href: '/admin/reports/users?role=patient', icon: '🤒', label: 'Patient Report', desc: 'Patient activity and bookings' },
        { href: '/admin/reports/users?role=provider', icon: '👩‍⚕️', label: 'Nurse Performance', desc: 'Jobs, ratings, completion rate', badge: totalNurses ?? 0 },
        { href: '/admin/reports/users?active=true', icon: '✅', label: 'Active Users', desc: 'Users active in last 30 days' },
        { href: '/admin/reports/users?active=false', icon: '💤', label: 'Inactive Users', desc: 'Users with no activity recently' },
      ],
    },
    {
      group: 'Operations Reports', color: '#b85e00',
      reports: [
        { href: '/admin/reports/leave', icon: '🌴', label: 'Leave Requests', desc: 'Nurse leave history and status' },
        { href: '/admin/reports/complaints', icon: '⚖️', label: 'Complaints & Disputes', desc: 'All complaints by type and status', badge: openComplaints ?? 0 },
        { href: '/admin/reports/growth', icon: '📈', label: 'Growth Report', desc: 'Daily/weekly/monthly trends' },
        { href: '/admin/reports/city', icon: '🗺️', label: 'City-wise Demand', desc: 'Bookings by city and area' },
      ],
    },
  ]

  /* ── Activity log data ───────────────────────────────────────────── */
  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const q        = params.q?.trim() ?? ''
  const roleF    = params.role ?? ''
  const actionF  = params.action ?? ''
  const moduleF  = params.module ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  let logQuery = supabase
    .from('activity_logs')
    .select('id, actor_name, actor_role, action, entity_type, entity_id, description, created_at, meta', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (q)        logQuery = logQuery.ilike('description', `%${q}%`)
  if (roleF)    logQuery = logQuery.eq('actor_role', roleF)
  if (actionF)  logQuery = logQuery.eq('action', actionF)
  if (moduleF)  logQuery = logQuery.eq('entity_type', moduleF)
  if (dateFrom) logQuery = logQuery.gte('created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo); end.setDate(end.getDate() + 1)
    logQuery = logQuery.lt('created_at', end.toISOString())
  }
  const { data: logRows, count: logCount } = await logQuery.range(offset, offset + PAGE_SIZE - 1)
  const logs = logRows ?? []
  const totalPages = Math.ceil((logCount ?? 0) / PAGE_SIZE)

  const [
    { count: totalLogs },
    { count: todayLogs },
    { count: bookingLogs },
    { count: adminLogs },
  ] = await Promise.all([
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is fine here
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', 'booking%'),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('actor_role', 'admin'),
  ])

  function buildLogUrl(overrides: Record<string, string>) {
    const sp2 = new URLSearchParams()
    const base = { tab: 'activity', page: '1', q, role: roleF, action: actionF, module: moduleF, date_from: dateFrom, date_to: dateTo, ...overrides }
    Object.entries(base).forEach(([k, v]) => { if (v) sp2.set(k, v) })
    return `/admin/analytics?${sp2.toString()}`
  }
  const isFiltered = q || roleF || actionF || moduleF || dateFrom || dateTo

  /* ── Homepage data ───────────────────────────────────────────────── */
  const [
    { data: settingsRows },
    { data: features },
    { data: howItWorks },
    { data: services },
    { data: testimonials },
    { data: faqs },
    { data: featuredRows },
    { data: allNurses },
  ] = await Promise.all([
    supabase.from('homepage_settings').select('key, value'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'features').order('sort_order'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'how_it_works').order('sort_order'),
    supabase.from('homepage_services').select('*').order('sort_order'),
    supabase.from('homepage_testimonials').select('*').order('sort_order'),
    supabase.from('homepage_faqs').select('*').order('sort_order'),
    supabase.from('homepage_featured_providers').select('nurse_id, priority, enabled').order('priority'),
    supabase.from('nurses').select('user_id, full_name, specialization, city, status').eq('status', 'approved').order('full_name'),
  ])
  const homepageSettings: Record<string, string> = {}
  ;(settingsRows ?? []).forEach((r: any) => { homepageSettings[r.key] = r.value ?? '' })
  const featuredNurseIds = new Set((featuredRows ?? []).map((r: any) => r.nurse_id))

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Analytics</h1>
          <p className="dash-sub">Reports, activity log, and homepage content management</p>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/admin/analytics?tab=reports"  style={tabStyle(activeTab === 'reports')}>📈 Reports</Link>
        <Link href="/admin/analytics?tab=activity" style={tabStyle(activeTab === 'activity')}>📊 Activity Log</Link>
        <Link href="/admin/analytics?tab=homepage" style={tabStyle(activeTab === 'homepage')}>🌐 Homepage</Link>
      </div>

      {/* ══ REPORTS TAB ══ */}
      {activeTab === 'reports' && (
        <>
          <div className="dash-kpi-row" style={{ marginBottom: '2rem' }}>
            {[
              { label: 'Total Bookings',    value: totalBookings ?? 0,    icon: '📋', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
              { label: 'Completed',         value: completedBookings ?? 0,icon: '🏁', bg: 'rgba(39,168,105,0.1)', color: '#27A869' },
              { label: 'Pending',           value: pendingBookings ?? 0,  icon: '⏳', bg: 'rgba(245,132,42,0.1)', color: '#F5842A' },
              { label: 'Active Nurses',     value: totalNurses ?? 0,      icon: '👩‍⚕️',bg: 'rgba(10,191,204,0.1)', color: '#0ABFCC' },
              { label: 'Open Disputes',     value: openComplaints ?? 0,   icon: '⚖️', bg: 'rgba(192,57,43,0.08)', color: '#C0392B' },
              { label: 'Hospital Bookings', value: totalHospBookings ?? 0,icon: '🏥', bg: 'rgba(123,47,190,0.08)',color: '#7B2FBE' },
            ].map(k => (
              <div key={k.label} className="dash-kpi">
                <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {REPORT_GROUPS.map(g => (
            <div key={g.group} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: g.color }} />
                <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{g.group}</h2>
              </div>
              <div className="reports-hub-grid">
                {g.reports.map(r => (
                  <Link key={r.href} href={r.href} className="report-hub-card" style={{ borderTop: `3px solid ${g.color}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="report-hub-icon" style={{ background: g.color + '15' }}>{r.icon}</div>
                      {r.badge !== undefined && r.badge > 0 && (
                        <span style={{ background: g.color + '20', color: g.color, fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>{r.badge}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{r.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{r.desc}</div>
                    <div style={{ fontSize: '0.7rem', color: g.color, fontWeight: 700, marginTop: 2 }}>View Report →</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ══ ACTIVITY LOG TAB ══ */}
      {activeTab === 'activity' && (
        <>
          <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { icon: '📊', label: 'Total Events',   value: totalLogs ?? 0,   bg: 'rgba(14,123,140,0.1)' },
              { icon: '📅', label: 'Last 24h',       value: todayLogs ?? 0,   bg: 'rgba(39,168,105,0.1)' },
              { icon: '📋', label: 'Booking Events', value: bookingLogs ?? 0, bg: 'rgba(245,132,42,0.1)' },
              { icon: '⚙️', label: 'Admin Actions',  value: adminLogs ?? 0,   bg: 'rgba(201,168,76,0.12)'},
            ].map(k => (
              <div key={k.label} className="dash-kpi">
                <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="dash-kpi-num">{k.value}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="dash-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ padding: '1rem 1.2rem' }}>
              <form method="GET" action="/admin/analytics">
                <input type="hidden" name="tab" value="activity" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search</label>
                    <input name="q" defaultValue={q} placeholder="Search description…" style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Module</label>
                    <select name="module" defaultValue={moduleF} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box' }}>
                      <option value="">All Modules</option>
                      <option value="booking">📋 Bookings</option>
                      <option value="nurse">👩‍⚕️ Nurses</option>
                      <option value="patient">🧑 Patients</option>
                      <option value="leave">🌴 Leave</option>
                      <option value="complaint">⚖️ Complaints</option>
                      <option value="agreement">📄 Agreements</option>
                      <option value="hospital">🏥 Hospital</option>
                      <option value="payment">💳 Payments</option>
                      <option value="settings">⚙️ Settings</option>
                      <option value="homepage">🌐 Homepage</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</label>
                    <select name="role" defaultValue={roleF} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box' }}>
                      <option value="">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="patient">Patient</option>
                      <option value="provider">Provider / Nurse</option>
                      <option value="hospital">Hospital</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date From</label>
                    <input type="date" name="date_from" defaultValue={dateFrom} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date To</label>
                    <input type="date" name="date_to" defaultValue={dateTo} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" style={{ flex: 1, padding: '8px 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' }}>Filter</button>
                    {isFiltered && (
                      <Link href="/admin/analytics?tab=activity" style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: '0.83rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Clear</Link>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {logCount ?? 0} event{(logCount ?? 0) !== 1 ? 's' : ''}
              {isFiltered ? ' (filtered)' : ''}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
            </span>
          </div>

          <div className="dash-card">
            {logs.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No activity found</div>
              </div>
            ) : (
              <>
                <div className="table-scroll-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                        {['#', 'Actor', 'Role', 'Module', 'Action', 'Description', 'Time'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.67rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log: any, i: number) => {
                        const icon    = ACTION_ICON[log.action] ?? '📌'
                        const rc      = ROLE_COLOR[log.actor_role] ?? ROLE_COLOR.admin
                        const mod     = getModule(log)
                        const modIcon = MODULE_ICON[mod] ?? '📌'
                        return (
                          <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--card)' : 'rgba(14,123,140,0.012)' }}>
                            <td style={{ padding: '10px 14px' }}><span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 600 }}>{offset + i + 1}</span></td>
                            <td style={{ padding: '10px 14px' }}><span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)' }}>{log.actor_name ?? 'System'}</span></td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: rc.bg, color: rc.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 50, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{log.actor_role}</span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {mod && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><span>{modIcon}</span><span style={{ textTransform: 'capitalize' }}>{mod}</span></span>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '1rem' }}>{icon}</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{log.action.replace(/_/g, ' ')}</span>
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: 300 }}><span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>{log.description}</span></td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--ink)', fontWeight: 600 }}>{timeAgo(log.created_at)}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 1 }}>{new Date(log.created_at).toLocaleString('en-SA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Page {page} of {totalPages} · {logCount} total</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {page > 1 && <Link href={buildLogUrl({ page: String(page - 1) })} style={pBtn(false)}>← Prev</Link>}
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const p = i + 1
                        return <Link key={p} href={buildLogUrl({ page: String(p) })} style={pBtn(p === page)}>{p}</Link>
                      })}
                      {page < totalPages && <Link href={buildLogUrl({ page: String(page + 1) })} style={pBtn(false)}>Next →</Link>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ══ HOMEPAGE TAB ══ */}
      {activeTab === 'homepage' && (
        <HomepageSettingsClient
          settings={homepageSettings}
          features={features ?? []}
          howItWorks={howItWorks ?? []}
          services={services ?? []}
          testimonials={testimonials ?? []}
          faqs={faqs ?? []}
          featuredProviders={featuredRows ?? []}
          allNurses={allNurses ?? []}
          featuredNurseIds={Array.from(featuredNurseIds)}
        />
      )}
    </div>
  )
}

function pBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 11px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
    textDecoration: 'none', border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
  }
}
