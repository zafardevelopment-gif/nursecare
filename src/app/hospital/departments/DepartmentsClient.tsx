'use client'

import { useState, useTransition } from 'react'
import { addDepartmentAction, updateDepartmentAction, deleteDepartmentAction } from './actions'

type Dept = {
  id: string
  hospital_id: string
  name: string
  icon: string
  color: string
  bg_color: string
  department_head: string | null
  total_beds: number
  occupied_beds: number
  nurses_needed: number
  nurses_active: number
  status: 'active' | 'maintenance' | 'closed'
  notes: string | null
}

// Preset dept options for quick add
const DEPT_PRESETS = [
  { name: 'ICU / Critical Care',  icon: '🫀', color: '#E53E3E', bg_color: '#FFF5F5' },
  { name: 'Emergency Dept',       icon: '🚨', color: '#DD6B20', bg_color: '#FFFAF0' },
  { name: 'Paediatrics',          icon: '🧒', color: '#D69E2E', bg_color: '#FFFFF0' },
  { name: 'Cardiac Ward',         icon: '❤️', color: '#E53E3E', bg_color: '#FFF5F5' },
  { name: 'Maternity',            icon: '🤱', color: '#805AD5', bg_color: '#FAF5FF' },
  { name: 'General Ward',         icon: '🏥', color: '#0E7B8C', bg_color: '#E8F4FD' },
  { name: 'Surgery',              icon: '🔬', color: '#1A7A4A', bg_color: '#F0FFF4' },
  { name: 'Orthopaedics',         icon: '🦴', color: '#0ABFCC', bg_color: '#E8FAFA' },
  { name: 'Radiology',            icon: '🩻', color: '#EC4899', bg_color: '#FFF0F7' },
  { name: 'Physiotherapy',        icon: '🦾', color: '#F59E0B', bg_color: '#FFFBEB' },
  { name: 'Neurology',            icon: '🧠', color: '#7B2FBE', bg_color: '#F5F0FF' },
  { name: 'Oncology',             icon: '🎗️', color: '#D53F8C', bg_color: '#FFF5F9' },
]

const ALL_ICONS = ['🏥','🫀','🚨','🧒','❤️','🤱','🔬','🦴','🩻','🦾','🧠','🎗️','💊','🩺','🧬','⚕️']
const ALL_COLORS = [
  { color: '#E53E3E', bg: '#FFF5F5' },
  { color: '#DD6B20', bg: '#FFFAF0' },
  { color: '#D69E2E', bg: '#FFFFF0' },
  { color: '#805AD5', bg: '#FAF5FF' },
  { color: '#0E7B8C', bg: '#E8F4FD' },
  { color: '#1A7A4A', bg: '#F0FFF4' },
  { color: '#0ABFCC', bg: '#E8FAFA' },
  { color: '#EC4899', bg: '#FFF0F7' },
  { color: '#F59E0B', bg: '#FFFBEB' },
  { color: '#7B2FBE', bg: '#F5F0FF' },
]

export default function DepartmentsClient({
  departments,
  hospitalId,
}: {
  departments: Dept[]
  hospitalId: string | null
}) {
  const [depts, setDepts] = useState<Dept[]>(departments)
  const [showAdd, setShowAdd]     = useState(false)
  const [editing, setEditing]     = useState<Dept | null>(null)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [msg, setMsg]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTx]      = useTransition()

  // New dept form state
  const [newName, setNewName]       = useState('')
  const [newHead, setNewHead]       = useState('')
  const [newBeds, setNewBeds]       = useState('')
  const [newNurses, setNewNurses]   = useState('')
  const [newIcon, setNewIcon]       = useState('🏥')
  const [newColor, setNewColor]     = useState(ALL_COLORS[4])

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  function applyPreset(p: typeof DEPT_PRESETS[0]) {
    setNewName(p.name)
    setNewIcon(p.icon)
    const found = ALL_COLORS.find(c => c.color === p.color)
    if (found) setNewColor(found)
  }

  function handleAdd() {
    if (!newName.trim()) return
    const fd = new FormData()
    fd.set('name', newName)
    fd.set('icon', newIcon)
    fd.set('color', newColor.color)
    fd.set('bg_color', newColor.bg)
    fd.set('department_head', newHead)
    fd.set('total_beds', newBeds)
    fd.set('nurses_needed', newNurses)
    startTx(async () => {
      const res = await addDepartmentAction(fd)
      if (res?.error) { flash('error', res.error); return }
      flash('success', `${newName} department added!`)
      // Optimistic add with temp id
      setDepts(prev => [...prev, {
        id: 'temp-' + Date.now(),
        hospital_id: hospitalId ?? '',
        name: newName, icon: newIcon,
        color: newColor.color, bg_color: newColor.bg,
        department_head: newHead || null,
        total_beds: parseInt(newBeds) || 0,
        occupied_beds: 0,
        nurses_needed: parseInt(newNurses) || 0,
        nurses_active: 0,
        status: 'active', notes: null,
      }])
      setNewName(''); setNewHead(''); setNewBeds(''); setNewNurses('')
      setNewIcon('🏥'); setNewColor(ALL_COLORS[4])
      setShowAdd(false)
    })
  }

  function handleUpdate(dept: Dept) {
    const fd = new FormData()
    fd.set('id', dept.id)
    fd.set('name', dept.name)
    fd.set('icon', dept.icon)
    fd.set('color', dept.color)
    fd.set('bg_color', dept.bg_color)
    fd.set('department_head', dept.department_head ?? '')
    fd.set('total_beds', String(dept.total_beds))
    fd.set('nurses_needed', String(dept.nurses_needed))
    fd.set('status', dept.status)
    startTx(async () => {
      const res = await updateDepartmentAction(fd)
      if (res?.error) { flash('error', res.error); return }
      setDepts(prev => prev.map(d => d.id === dept.id ? dept : d))
      setEditing(null)
      flash('success', 'Department updated!')
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    startTx(async () => {
      const res = await deleteDepartmentAction(fd)
      if (res?.error) { flash('error', res.error); return }
      setDepts(prev => prev.filter(d => d.id !== id))
      setDeleteId(null)
      flash('success', 'Department removed.')
    })
  }

  const vacancies = (d: Dept) => Math.max(0, d.nurses_needed - d.nurses_active)
  const isStaffed = (d: Dept) => vacancies(d) === 0

  return (
    <>
      {msg && (
        <div style={{
          background: msg.type === 'success' ? '#E8F9F0' : '#FEE8E8',
          color: msg.type === 'success' ? '#1A7A4A' : '#C0392B',
          padding: '10px 16px', borderRadius: 9, marginBottom: 14,
          fontSize: '0.85rem', fontWeight: 600,
        }}>{msg.type === 'success' ? '✓' : '⚠️'} {msg.text}</div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Departments', value: depts.length,                                              color: '#0E7B8C', icon: '🏢' },
          { label: 'Total Nurses', value: depts.reduce((s, d) => s + d.nurses_active, 0),           color: '#7B2FBE', icon: '👩‍⚕️' },
          { label: 'Vacancies',    value: depts.reduce((s, d) => s + vacancies(d), 0),              color: '#b85e00', icon: '🪑' },
          { label: 'Total Beds',   value: depts.reduce((s, d) => s + d.total_beds, 0),              color: '#1A7A4A', icon: '🛏️' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Card grid — matches screenshot layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'stretch' }}>
        {depts.map(dept => {
          const gaps = vacancies(dept)
          const staffed = isStaffed(dept)
          return (
            <div key={dept.id} style={{
              background: dept.bg_color,
              border: `1.5px solid ${dept.color}22`,
              borderRadius: 16,
              padding: '20px 18px',
              width: 200,
              minWidth: 180,
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
            }}>
              {/* Edit btn */}
              <button
                onClick={() => setEditing({ ...dept })}
                style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Edit"
              >✏️</button>

              {/* Icon */}
              <div style={{ fontSize: '2rem', lineHeight: 1 }}>{dept.icon}</div>

              {/* Name */}
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1a202c', lineHeight: 1.3 }}>{dept.name}</div>

              {/* Sub info */}
              <div style={{ fontSize: '0.72rem', color: '#718096' }}>
                {dept.nurses_active} nurses active
                {gaps > 0 ? ` · ${gaps} vacanc${gaps === 1 ? 'y' : 'ies'}` : ' · fully staffed'}
              </div>

              {/* Badge */}
              {staffed ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.7)', border: `1px solid ${dept.color}44`, color: dept.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700, alignSelf: 'flex-start' }}>
                  ✓ Staffed
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.7)', border: `1px solid ${dept.color}55`, color: dept.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700, alignSelf: 'flex-start' }}>
                  ⚠ {gaps} Gap{gaps > 1 ? 's' : ''}
                </div>
              )}

              {/* Action button */}
              <a
                href={`/hospital/booking?dept=${dept.id}`}
                style={{
                  marginTop: 'auto',
                  background: '#fff',
                  border: `1px solid ${dept.color}44`,
                  color: dept.color,
                  padding: '8px 0',
                  borderRadius: 9,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  width: '100%',
                  textDecoration: 'none',
                  display: 'block',
                  textAlign: 'center',
                }}
              >
                {staffed ? 'View Roster →' : `Fill Gap${gaps > 1 ? 's' : ''} →`}
              </a>
            </div>
          )
        })}

        {/* Add Department card */}
        <div
          onClick={() => setShowAdd(true)}
          style={{
            background: '#fff',
            border: '2px dashed #0E7B8C66',
            borderRadius: 16,
            padding: '20px 18px',
            width: 200,
            minWidth: 180,
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0fdfd')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <div style={{ fontSize: '2rem', color: '#0E7B8C', fontWeight: 300 }}>+</div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0E7B8C' }}>Add Department</div>
          <div style={{ fontSize: '0.7rem', color: '#718096', textAlign: 'center' }}>Click to register a new department</div>
        </div>
      </div>

      {/* ── Add Department Modal ── */}
      {showAdd && (
        <Modal title="Add Department" onClose={() => setShowAdd(false)}>
          {/* Presets */}
          <div style={{ marginBottom: 14 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Quick Select</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEPT_PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => applyPreset(p)}
                  style={{ background: p.bg_color, border: `1.5px solid ${p.color}44`, color: p.color, padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Department Name *</label>
              <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Cardiology" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Department Head</label>
              <input className="form-input" value={newHead} onChange={e => setNewHead(e.target.value)} placeholder="e.g. Dr. Ahmed" />
            </div>
            <div>
              <label className="form-label">Total Beds</label>
              <input type="number" className="form-input" value={newBeds} onChange={e => setNewBeds(e.target.value)} min="0" placeholder="0" />
            </div>
            <div>
              <label className="form-label">Nurses Needed</label>
              <input type="number" className="form-input" value={newNurses} onChange={e => setNewNurses(e.target.value)} min="0" placeholder="0" />
            </div>
          </div>

          {/* Icon picker */}
          <div style={{ marginTop: 12 }}>
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {ALL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setNewIcon(ic)}
                  style={{ width: 36, height: 36, borderRadius: 8, fontSize: '1.1rem', border: `2px solid ${newIcon === ic ? '#0E7B8C' : 'var(--border)'}`, background: newIcon === ic ? 'rgba(14,123,140,0.08)' : 'var(--cream)', cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div style={{ marginTop: 12 }}>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {ALL_COLORS.map(c => (
                <button key={c.color} type="button" onClick={() => setNewColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, border: `3px solid ${newColor.color === c.color ? '#0F172A' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ marginTop: 14, background: newColor.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${newColor.color}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.8rem' }}>{newIcon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1a202c' }}>{newName || 'Department Name'}</div>
              <div style={{ fontSize: '0.7rem', color: '#718096' }}>0 nurses active · fully staffed</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleAdd} disabled={!newName.trim() || isPending}
              style={{ flex: 1, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', padding: 11, borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.6, fontFamily: 'inherit' }}>
              {isPending ? '⏳ Saving…' : '+ Add Department'}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ flex: 1, background: 'var(--shell-bg)', color: 'var(--ink)', padding: 11, borderRadius: 10, fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Department Modal ── */}
      {editing && (
        <Modal title="Edit Department" onClose={() => setEditing(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Department Name *</label>
              <input className="form-input" value={editing.name} onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Department Head</label>
              <input className="form-input" value={editing.department_head ?? ''} onChange={e => setEditing(p => p && ({ ...p, department_head: e.target.value }))} placeholder="e.g. Dr. Ahmed" />
            </div>
            <div>
              <label className="form-label">Total Beds</label>
              <input type="number" className="form-input" value={editing.total_beds} onChange={e => setEditing(p => p && ({ ...p, total_beds: parseInt(e.target.value) || 0 }))} min="0" />
            </div>
            <div>
              <label className="form-label">Nurses Needed</label>
              <input type="number" className="form-input" value={editing.nurses_needed} onChange={e => setEditing(p => p && ({ ...p, nurses_needed: parseInt(e.target.value) || 0 }))} min="0" />
            </div>
            <div>
              <label className="form-label">Nurses Active</label>
              <input type="number" className="form-input" value={editing.nurses_active} onChange={e => setEditing(p => p && ({ ...p, nurses_active: parseInt(e.target.value) || 0 }))} min="0" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={editing.status} onChange={e => setEditing(p => p && ({ ...p, status: e.target.value as any }))}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Icon picker */}
          <div style={{ marginTop: 12 }}>
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {ALL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setEditing(p => p && ({ ...p, icon: ic }))}
                  style={{ width: 36, height: 36, borderRadius: 8, fontSize: '1.1rem', border: `2px solid ${editing.icon === ic ? '#0E7B8C' : 'var(--border)'}`, background: editing.icon === ic ? 'rgba(14,123,140,0.08)' : 'var(--cream)', cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div style={{ marginTop: 12 }}>
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {ALL_COLORS.map(c => (
                <button key={c.color} type="button"
                  onClick={() => setEditing(p => p && ({ ...p, color: c.color, bg_color: c.bg }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c.color, border: `3px solid ${editing.color === c.color ? '#0F172A' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => handleUpdate(editing)} disabled={!editing.name.trim() || isPending}
              style={{ flex: 1, background: 'var(--teal)', color: '#fff', padding: 11, borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {isPending ? '⏳ Saving…' : '💾 Save Changes'}
            </button>
            <button onClick={() => setDeleteId(editing.id)}
              style={{ background: 'rgba(224,74,74,0.08)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.2)', padding: '11px 16px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              🗑️
            </button>
            <button onClick={() => setEditing(null)}
              style={{ flex: 1, background: 'var(--shell-bg)', color: 'var(--ink)', padding: 11, borderRadius: 10, fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <Modal title="Delete Department?" onClose={() => setDeleteId(null)}>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: 16 }}>
            This will permanently remove the department and all associated data. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(deleteId)} disabled={isPending}
              style={{ flex: 1, background: '#E04A4A', color: '#fff', padding: 11, borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {isPending ? '⏳ Deleting…' : 'Yes, Delete'}
            </button>
            <button onClick={() => setDeleteId(null)}
              style={{ flex: 1, background: 'var(--shell-bg)', color: 'var(--ink)', padding: 11, borderRadius: 10, fontWeight: 600, fontSize: '0.88rem', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ── Reusable Modal ── */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <h2 style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontSize: '1.05rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
