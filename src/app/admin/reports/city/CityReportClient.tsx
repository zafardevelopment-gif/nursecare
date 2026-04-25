'use client'

import { exportToExcel } from '@/lib/export'
import { useTransition } from 'react'

interface CityData {
  city: string
  bookings: number
  completed: number
  revenue: number
  nurses: number
}

interface Props {
  cityData: CityData[]
  totalBookings: number
}

export default function CityReportClient({ cityData, totalBookings }: Props) {
  const [exporting, startExport] = useTransition()

  const totalRevenue = cityData.reduce((s, c) => s + c.revenue, 0)
  const maxBookings  = Math.max(...cityData.map(c => c.bookings), 1)

  function handleExport() {
    startExport(async () => {
      await exportToExcel(
        cityData as unknown as Record<string, unknown>[],
        [
          { key: 'city',      header: 'City' },
          { key: 'bookings',  header: 'Total Bookings' },
          { key: 'completed', header: 'Completed' },
          { key: 'nurses',    header: 'Active Nurses' },
          { key: 'revenue',   header: 'Revenue (SAR)', format: v => parseFloat(String(v ?? 0)) },
        ],
        'city-demand-report'
      )
    })
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">City-wise Demand</h1>
          <p className="dash-sub">Bookings, nurses and revenue broken down by city</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-export">
          {exporting ? '⏳ Exporting…' : '📥 Export Excel'}
        </button>
      </div>

      {/* Summary */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Cities',         value: cityData.length,               icon: '🗺️', bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
          { label: 'Total Bookings', value: totalBookings,                  icon: '📋', bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
          { label: 'Total Revenue',  value: `SAR ${totalRevenue.toFixed(0)}`, icon: '💰', bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
          { label: 'Top City',       value: cityData[0]?.city ?? '—',      icon: '🏆', bg: 'rgba(107,63,160,0.1)', color: '#6B3FA0' },
        ].map(k => (
          <div key={k.label} className="dash-kpi">
            <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
            <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
            <div className="dash-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Horizontal bar chart */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '1.2rem' }}>
          📊 Bookings by City
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cityData.slice(0, 10).map(c => (
            <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.city}
              </div>
              <div style={{ flex: 1, height: 22, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(c.bookings / maxBookings) * 100}%`,
                  background: 'linear-gradient(90deg,#0E7B8C,#0ABFCC)',
                  borderRadius: 4,
                  transition: 'width 0.4s',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                }}>
                  <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 700 }}>{c.bookings}</span>
                </div>
              </div>
              <div style={{ width: 60, fontSize: '0.7rem', color: '#27A869', fontWeight: 700, flexShrink: 0 }}>
                SAR {c.revenue.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full table */}
      <div className="dash-card">
        <div className="table-scroll-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>City</th>
                <th>Total Bookings</th>
                <th>Completed</th>
                <th>Completion Rate</th>
                <th>Active Nurses</th>
                <th>Revenue (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {cityData.map((c, i) => (
                <tr key={c.city}>
                  <td><span className="report-seq">{i + 1}</span></td>
                  <td><span style={{ fontWeight: 700 }}>🗺️ {c.city}</span></td>
                  <td>{c.bookings}</td>
                  <td><span style={{ color: '#27A869', fontWeight: 600 }}>{c.completed}</span></td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: '#0E7B8C', fontWeight: 600 }}>
                      {c.bookings > 0 ? `${Math.round((c.completed / c.bookings) * 100)}%` : '—'}
                    </span>
                  </td>
                  <td><span style={{ color: '#6B3FA0', fontWeight: 600 }}>👩‍⚕️ {c.nurses}</span></td>
                  <td><span style={{ color: '#27A869', fontWeight: 700 }}>SAR {c.revenue.toFixed(0)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
