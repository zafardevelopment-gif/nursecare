'use client'

import { useState } from 'react'
import Link from 'next/link'

type Dept = {
  id: number
  name: string
  head: string
  totalBeds: number
  occupiedBeds: number
  nurses: number
  status: 'active' | 'maintenance' | 'closed'
  icon: string
  color: string
}

const INITIAL_DEPTS: Dept[] = [
  { id: 1, name: 'Intensive Care Unit (ICU)', head: 'Dr. Ahmed Al-Rashid', totalBeds: 20, occupiedBeds: 16, nurses: 8, status: 'active', icon: '🫀', color: '#0E7B8C' },
  { id: 2, name: 'General Ward', head: 'Dr. Sara Mohammed', totalBeds: 60, occupiedBeds: 43, nurses: 14, status: 'active', icon: '🏥', color: '#0ABFCC' },
  { id: 3, name: 'Pediatrics', head: 'Dr. Fatima Hassan', totalBeds: 30, occupiedBeds: 18, nurses: 6, status: 'active', icon: '🧒', color: '#7B2FBE' },
  { id: 4, name: 'Emergency', head: 'Dr. Khaled Al-Omar', totalBeds: 15, occupiedBeds: 12, nurses: 10, status: 'active', icon: '🚨', color: '#b85e00' },
  { id: 5, name: 'Surgery', head: 'Dr. Nour Al-Anzi', totalBeds: 25, occupiedBeds: 10, nurses: 5, status: 'active', icon: '🔬', color: '#1A7A4A' },
  { id: 6, name: 'Radiology', head: 'Dr. Yousuf Al-Khalid', totalBeds: 0, occupiedBeds: 0, nurses: 4, status: 'active', icon: '🩻', color: '#EC4899' },
  { id: 7, name: 'Physiotherapy', head: 'Dr. Lina Al-Saad', totalBeds: 10, occupiedBeds: 4, nurses: 3, status: 'maintenance', icon: '🦾', color: '#F59E0B' },
]

const statusConfig = {
  active:      { bg: '#F0FDF4', color: '#1A7A4A', label: 'Active' },
  maintenance: { bg: '#FFF7ED', color: '#b85e00', label: 'Maintenance' },
  closed:      { bg: '#F3F4F6', color: '#6B7280', label: 'Closed' },
}

export default function HospitalDepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>(INITIAL_DEPTS)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newDept, setNewDept] = useState({ name: '', head: '', totalBeds: '', nurses: '' })

  const filtered = depts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  )

  const totalNurses = depts.reduce((s, d) => s + d.nurses, 0)
  const totalBeds = depts.reduce((s, d) => s + d.totalBeds, 0)
  const occupiedBeds = depts.reduce((s, d) => s + d.occupiedBeds, 0)

  function handleAdd() {
    if (!newDept.name.trim()) return
    const colors = ['#0E7B8C', '#7B2FBE', '#1A7A4A', '#b85e00', '#EC4899']
    const icons = ['🏥', '🫀', '🔬', '🧒', '🚨']
    const idx = depts.length % colors.length
    setDepts(prev => [...prev, {
      id: Date.now(),
      name: newDept.name,
      head: newDept.head || 'Unassigned',
      totalBeds: parseInt(newDept.totalBeds) || 0,
      occupiedBeds: 0,
      nurses: parseInt(newDept.nurses) || 0,
      status: 'active',
      icon: icons[idx],
      color: colors[idx],
    }])
    setNewDept({ name: '', head: '', totalBeds: '', nurses: '' })
    setShowAdd(false)
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Departments</h1>
          <p className="dash-sub">Manage hospital departments, staff allocation, and bed capacity</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
            padding: '10px 20px', borderRadius: 10, fontWeight: 700,
            fontSize: '0.88rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          + Add Department
        </button>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Departments', value: depts.length, color: '#0E7B8C', icon: '🏢' },
          { label: 'Total Nurses', value: totalNurses, color: '#7B2FBE', icon: '👩‍⚕️' },
          { label: 'Total Beds', value: totalBeds, color: '#1A7A4A', icon: '🛏️' },
          { label: 'Occupied Beds', value: occupiedBeds, color: '#b85e00', icon: '📊' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search departments or department head..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: 400, fontSize: '0.88rem' }}
        />
      </div>

      {/* Department Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filtered.map(dept => {
          const occupancy = dept.totalBeds > 0 ? Math.round((dept.occupiedBeds / dept.totalBeds) * 100) : 0
          const sc = statusConfig[dept.status]
          return (
            <div key={dept.id} className="dash-card" style={{ borderTop: `3px solid ${dept.color}` }}>
              <div style={{ padding: '1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: dept.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                    }}>{dept.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.2 }}>{dept.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>Head: {dept.head}</div>
                    </div>
                  </div>
                  <span style={{
                    background: sc.bg, color: sc.color,
                    fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 50,
                  }}>{sc.label}</span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Nurses', value: dept.nurses, color: dept.color },
                    { label: 'Total Beds', value: dept.totalBeds || '—', color: '#6B7280' },
                    { label: 'Occupied', value: dept.totalBeds ? dept.occupiedBeds : '—', color: occupancy > 80 ? '#b85e00' : '#1A7A4A' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'var(--shell-bg)', borderRadius: 8, padding: '8px 6px', textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Occupancy bar */}
                {dept.totalBeds > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 4 }}>
                      <span>Bed Occupancy</span>
                      <span style={{ fontWeight: 700, color: occupancy > 80 ? '#b85e00' : '#1A7A4A' }}>{occupancy}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${occupancy}%`,
                        background: occupancy > 80 ? '#b85e00' : occupancy > 60 ? '#F59E0B' : '#1A7A4A',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Department Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: '1rem',
        }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440 }}>
            <h2 style={{ margin: '0 0 1.2rem', fontWeight: 700, color: 'var(--ink)', fontSize: '1.1rem' }}>Add Department</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label className="form-label">Department Name *</label>
                <input className="form-input" value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cardiology" />
              </div>
              <div>
                <label className="form-label">Department Head</label>
                <input className="form-input" value={newDept.head} onChange={e => setNewDept(p => ({ ...p, head: e.target.value }))} placeholder="e.g. Dr. Name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label className="form-label">Total Beds</label>
                  <input type="number" className="form-input" value={newDept.totalBeds} onChange={e => setNewDept(p => ({ ...p, totalBeds: e.target.value }))} min="0" />
                </div>
                <div>
                  <label className="form-label">Nurses Needed</label>
                  <input type="number" className="form-input" value={newDept.nurses} onChange={e => setNewDept(p => ({ ...p, nurses: e.target.value }))} min="0" />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem' }}>
              <button onClick={handleAdd} style={{
                flex: 1, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
                padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
                border: 'none', cursor: 'pointer',
              }}>Add Department</button>
              <button onClick={() => setShowAdd(false)} style={{
                flex: 1, background: 'var(--shell-bg)', color: 'var(--ink)',
                padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
