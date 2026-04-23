'use client'

import { exportToExcel } from '@/lib/export'
import { useTransition } from 'react'

interface MonthData {
  month: string
  label: string
  bookings: number
  users: number
  revenue: number
  completed: number
}

interface Props {
  monthlyData: MonthData[]
  totalBookings: number
  totalUsers: number
  period: string
}

export default function GrowthReportClient({ monthlyData, totalBookings, totalUsers }: Props) {
  const [exporting, startExport] = useTransition()

  const totalRevenue  = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const totalNewUsers = monthlyData.reduce((s, m) => s + m.users, 0)
  const maxBookings   = Math.max(...monthlyData.map(m => m.bookings), 1)
  const maxRevenue    = Math.max(...monthlyData.map(m => m.revenue), 1)

  function handleExport() {
    startExport(async () => {
      await exportToExcel(
        monthlyData as unknown as Record<string, unknown>[],
        [
          { key: 'label',     header: 'Month' },
          { key: 'bookings',  header: 'New Bookings' },
          { key: 'completed', header: 'Completed' },
          { key: 'users',     header: 'New Users' },
          { key: 'revenue',   header: 'Revenue (SAR)', format: v => parseFloat(String(v ?? 0)) },
        ],
        'growth-report'
      )
    })
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Growth Report</h1>
          <p className="dash-sub">Monthly trends — bookings, users, and revenue over last 12 months</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-export">
          {exporting ? '⏳ Exporting…' : '📥 Export Excel'}
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Bookings',  value: totalBookings,                   icon: '📋', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
          { label: 'Total Users',     value: totalUsers,                      icon: '👥', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
          { label: 'Revenue (12m)',   value: `SAR ${totalRevenue.toFixed(0)}`, icon: '💰', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
          { label: 'New Users (12m)', value: totalNewUsers,                   icon: '📈', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
        ].map(k => (
          <div key={k.label} className="dash-kpi">
            <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
            <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
            <div className="dash-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Bookings bar chart */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '1.2rem' }}>
          📋 Monthly Bookings
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, overflowX: 'auto', paddingBottom: 4 }}>
          {monthlyData.map(m => (
            <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44, flex: '1 1 44px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>{m.bookings}</span>
              <div style={{
                width: '100%',
                height: Math.max(4, (m.bookings / maxBookings) * 110),
                background: 'linear-gradient(180deg,#0E7B8C,#0ABFCC)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s',
              }} title={`${m.label}: ${m.bookings} bookings`} />
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue bar chart */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '1.2rem' }}>
          💰 Monthly Revenue (SAR)
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, overflowX: 'auto', paddingBottom: 4 }}>
          {monthlyData.map(m => (
            <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44, flex: '1 1 44px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>{m.revenue > 0 ? m.revenue.toFixed(0) : '0'}</span>
              <div style={{
                width: '100%',
                height: Math.max(4, (m.revenue / maxRevenue) * 110),
                background: 'linear-gradient(180deg,#27A869,#20c997)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s',
              }} title={`${m.label}: SAR ${m.revenue.toFixed(0)}`} />
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly data table */}
      <div className="dash-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Month</th>
                <th>New Bookings</th>
                <th>Completed</th>
                <th>Completion Rate</th>
                <th>New Users</th>
                <th>Revenue (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, i) => (
                <tr key={m.month}>
                  <td><span className="report-seq">{i + 1}</span></td>
                  <td><span style={{ fontWeight: 700 }}>{m.label}</span></td>
                  <td>{m.bookings}</td>
                  <td><span style={{ color: '#27A869', fontWeight: 600 }}>{m.completed}</span></td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: m.bookings > 0 ? '#0E7B8C' : 'var(--muted)', fontWeight: 600 }}>
                      {m.bookings > 0 ? `${Math.round((m.completed / m.bookings) * 100)}%` : '—'}
                    </span>
                  </td>
                  <td><span style={{ color: '#6B3FA0', fontWeight: 600 }}>{m.users}</span></td>
                  <td><span style={{ color: '#27A869', fontWeight: 700 }}>SAR {m.revenue.toFixed(0)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
