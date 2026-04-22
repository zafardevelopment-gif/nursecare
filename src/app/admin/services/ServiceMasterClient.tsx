'use client'

import { useState, useTransition } from 'react'
import {
  createCategory, updateCategory, toggleCategory, deleteCategory,
  createService,  updateService,  toggleService,  deleteService,
  toggleServiceMaster,
  type CategoryRow, type ServiceRow,
} from './actions'

/* ── Props ──────────────────────────────────────────────────── */

interface Props {
  initialCategories: CategoryRow[]
  initialServices:   ServiceRow[]
  flagEnabled:       boolean
}

/* ── Helpers ────────────────────────────────────────────────── */

const SAR = (n: number | null | undefined) =>
  n == null ? '—' : `SAR ${Number(n).toFixed(0)}`

const inputSt: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: 'var(--cream)',
  width: '100%', boxSizing: 'border-box',
}

const btnSt = (color: string, bg: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 7,
  border: `1px solid ${color}33`,
  background: bg, color,
  fontSize: '0.76rem', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})

/* ── Main Component ─────────────────────────────────────────── */

export default function ServiceMasterClient({ initialCategories, initialServices, flagEnabled }: Props) {
  const [tab,        setTab]        = useState<'categories' | 'services'>('services')
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [services,   setServices]   = useState<ServiceRow[]>(initialServices)
  const [flag,       setFlag]       = useState(flagEnabled)
  const [flagError,  setFlagError]  = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  /* ── Category modal state ── */
  const [catModal,    setCatModal]    = useState<'add' | 'edit' | null>(null)
  const [editingCat,  setEditingCat]  = useState<CategoryRow | null>(null)
  const [catErr,      setCatErr]      = useState<string | null>(null)

  /* ── Service modal state ── */
  const [svcModal,    setSvcModal]    = useState<'add' | 'edit' | null>(null)
  const [editingSvc,  setEditingSvc]  = useState<ServiceRow | null>(null)
  const [svcErr,      setSvcErr]      = useState<string | null>(null)
  const [catFilter,   setCatFilter]   = useState<string>('all')

  /* ── Inline error banner ── */
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Feature flag toggle ── */
  function handleFlagToggle() {
    const next = !flag
    setFlagError(null)
    startTransition(async () => {
      const result = await toggleServiceMaster(next)
      if (result.error) { setFlagError(result.error); return }
      setFlag(next)
      showToast(next ? 'Service Master enabled for all users' : 'Service Master disabled — booking flows unchanged')
    })
  }

  /* ── Category actions ── */
  function openAddCat()  { setEditingCat(null); setCatErr(null); setCatModal('add') }
  function openEditCat(c: CategoryRow) { setEditingCat(c); setCatErr(null); setCatModal('edit') }
  function closeCatModal() { setCatModal(null); setEditingCat(null); setCatErr(null) }

  function handleCatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setCatErr(null)
    startTransition(async () => {
      const result = catModal === 'edit' ? await updateCategory(fd) : await createCategory(fd)
      if (result.error) { setCatErr(result.error); return }
      closeCatModal()
      showToast(catModal === 'edit' ? 'Category updated' : 'Category created')
      window.location.reload()
    })
  }

  function handleToggleCat(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleCategory(id, !current)
      if (result.error) { showToast(result.error, false); return }
      setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
    })
  }

  function handleDeleteCat(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) { showToast(result.error, false); return }
      setCategories(prev => prev.filter(c => c.id !== id))
      showToast('Category deleted')
    })
  }

  /* ── Service actions ── */
  function openAddSvc()  { setEditingSvc(null); setSvcErr(null); setSvcModal('add') }
  function openEditSvc(s: ServiceRow) { setEditingSvc(s); setSvcErr(null); setSvcModal('edit') }
  function closeSvcModal() { setSvcModal(null); setEditingSvc(null); setSvcErr(null) }

  function handleSvcSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSvcErr(null)
    startTransition(async () => {
      const result = svcModal === 'edit' ? await updateService(fd) : await createService(fd)
      if (result.error) { setSvcErr(result.error); return }
      closeSvcModal()
      showToast(svcModal === 'edit' ? 'Service updated' : 'Service created')
      window.location.reload()
    })
  }

  function handleToggleSvc(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleService(id, !current)
      if (result.error) { showToast(result.error, false); return }
      setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
    })
  }

  function handleDeleteSvc(id: string, name: string) {
    if (!confirm(`Delete service "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteService(id)
      if (result.error) { showToast(result.error, false); return }
      setServices(prev => prev.filter(s => s.id !== id))
      showToast('Service deleted')
    })
  }

  const filteredServices = catFilter === 'all'
    ? services
    : services.filter(s => s.category_id === catFilter)

  const activeCount  = services.filter(s => s.is_active).length
  const totalCount   = services.length
  const catCount     = categories.length

  /* ── Render ── */
  return (
    <div className="dash-shell">

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Service Master</h1>
          <p className="dash-sub">
            {totalCount} service{totalCount !== 1 ? 's' : ''} across {catCount} categor{catCount !== 1 ? 'ies' : 'y'} · {activeCount} active
          </p>
        </div>

        {/* Feature flag toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--cream)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 16px',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)' }}>
              Service Master
            </div>
            <div style={{ fontSize: '0.72rem', color: flag ? '#27A869' : 'var(--muted)', fontWeight: 600 }}>
              {flag ? '● Live — patients see structured services' : '○ Off — current booking unchanged'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleFlagToggle}
            disabled={isPending}
            style={{
              width: 52, height: 28, borderRadius: 14, border: 'none',
              background: flag ? '#27A869' : '#CBD5E0',
              position: 'relative', cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 4,
              left: flag ? 26 : 4,
              width: 20, height: 20,
              borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Flag error */}
      {flagError && (
        <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: '1rem', color: '#c0392b', fontSize: '0.84rem', fontWeight: 600 }}>
          ⚠️ {flagError}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#27A869' : '#E04A4A',
          color: '#fff', borderRadius: 10, padding: '12px 20px',
          fontSize: '0.85rem', fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['services', 'categories'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '9px 20px', borderRadius: 10,
              border: tab === t ? 'none' : '1px solid var(--border)',
              background: tab === t ? 'var(--teal)' : 'var(--cream)',
              color: tab === t ? '#fff' : 'var(--muted)',
              fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: tab === t ? '0 2px 10px rgba(14,123,140,0.25)' : 'none',
            }}
          >
            {t === 'services' ? `🩺 Services (${totalCount})` : `📂 Categories (${catCount})`}
          </button>
        ))}
      </div>

      {/* ── SERVICES TAB ── */}
      {tab === 'services' && (
        <div className="dash-card">
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>All Services</span>
              {/* Category filter */}
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                style={{ ...inputSt, width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={openAddSvc} style={btnSt('var(--teal)', 'rgba(14,123,140,0.07)')}>
              + Add Service
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
                  {['Service', 'Category', 'Base', 'Min', 'Max', 'Duration', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
                      No services found. Add your first service.
                    </td>
                  </tr>
                ) : filteredServices.map(svc => {
                  const cat = svc.service_categories
                  return (
                    <tr key={svc.id} style={{ borderBottom: '1px solid var(--border)', opacity: svc.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700 }}>{svc.name}</div>
                        {svc.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {svc.description}
                          </div>
                        )}
                        {svc.requires_equipment && (
                          <span style={{ fontSize: '0.68rem', color: '#b85e00', background: 'rgba(184,94,0,0.08)', border: '1px solid rgba(184,94,0,0.2)', padding: '1px 6px', borderRadius: 20, marginTop: 3, display: 'inline-block' }}>
                            🔧 Equipment
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {cat
                          ? <span style={{ fontSize: '0.78rem', background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(14,123,140,0.15)', whiteSpace: 'nowrap' }}>{cat.icon} {cat.name}</span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{SAR(svc.base_price)}</td>
                      <td style={{ padding: '12px 14px', color: '#27A869', fontWeight: 600 }}>{SAR(svc.min_price)}</td>
                      <td style={{ padding: '12px 14px', color: '#b85e00' }}>{SAR(svc.max_price)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>
                        {svc.duration_minutes ? `${svc.duration_minutes} min` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                          background: svc.is_active ? 'rgba(39,168,105,0.1)' : 'rgba(203,213,224,0.3)',
                          color: svc.is_active ? '#27A869' : '#718096',
                        }}>
                          {svc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => openEditSvc(svc)} style={btnSt('var(--teal)', 'rgba(14,123,140,0.07)')}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleToggleSvc(svc.id, svc.is_active)} disabled={isPending} style={btnSt(svc.is_active ? '#b85e00' : '#27A869', svc.is_active ? 'rgba(184,94,0,0.07)' : 'rgba(39,168,105,0.07)')}>
                            {svc.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" onClick={() => handleDeleteSvc(svc.id, svc.name)} disabled={isPending} style={btnSt('#E04A4A', 'rgba(224,74,74,0.07)')}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === 'categories' && (
        <div className="dash-card">
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>All Categories</span>
            <button type="button" onClick={openAddCat} style={btnSt('var(--teal)', 'rgba(14,123,140,0.07)')}>
              + Add Category
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
                  {['Category', 'Description', 'Services', 'Order', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
                      No categories yet. Add your first category.
                    </td>
                  </tr>
                ) : categories.map(cat => {
                  const svcCount = services.filter(s => s.category_id === cat.id).length
                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)', opacity: cat.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                          <span style={{ fontWeight: 700 }}>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.8rem', maxWidth: 260 }}>
                        {cat.description ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{svcCount}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{cat.sort_order}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                          background: cat.is_active ? 'rgba(39,168,105,0.1)' : 'rgba(203,213,224,0.3)',
                          color: cat.is_active ? '#27A869' : '#718096',
                        }}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => openEditCat(cat)} style={btnSt('var(--teal)', 'rgba(14,123,140,0.07)')}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleToggleCat(cat.id, cat.is_active)} disabled={isPending} style={btnSt(cat.is_active ? '#b85e00' : '#27A869', cat.is_active ? 'rgba(184,94,0,0.07)' : 'rgba(39,168,105,0.07)')}>
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" onClick={() => handleDeleteCat(cat.id, cat.name)} disabled={isPending} style={btnSt('#E04A4A', 'rgba(224,74,74,0.07)')}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORY MODAL ── */}
      {catModal && (
        <Modal title={catModal === 'add' ? 'Add Category' : 'Edit Category'} onClose={closeCatModal}>
          <form onSubmit={handleCatSubmit}>
            {editingCat && <input type="hidden" name="id" value={editingCat.id} />}

            {catErr && <ErrorBanner msg={catErr} />}

            <FormRow label="Icon (emoji)">
              <input name="icon" type="text" defaultValue={editingCat?.icon ?? '🏥'} placeholder="🏥" style={{ ...inputSt, width: 70 }} />
            </FormRow>
            <FormRow label="Name *">
              <input name="name" type="text" required defaultValue={editingCat?.name ?? ''} placeholder="e.g. Wound Care" style={inputSt} />
            </FormRow>
            <FormRow label="Description">
              <textarea name="description" rows={2} defaultValue={editingCat?.description ?? ''} placeholder="Brief description" style={{ ...inputSt, resize: 'vertical' }} />
            </FormRow>
            <FormRow label="Sort Order" hint="Lower number = shown first">
              <input name="sort_order" type="number" min={0} defaultValue={editingCat?.sort_order ?? 0} style={{ ...inputSt, width: 80 }} />
            </FormRow>

            <ModalActions onCancel={closeCatModal} pending={isPending} submitLabel={catModal === 'add' ? 'Create Category' : 'Save Changes'} />
          </form>
        </Modal>
      )}

      {/* ── SERVICE MODAL ── */}
      {svcModal && (
        <Modal title={svcModal === 'add' ? 'Add Service' : 'Edit Service'} onClose={closeSvcModal}>
          <form onSubmit={handleSvcSubmit}>
            {editingSvc && <input type="hidden" name="id" value={editingSvc.id} />}

            {svcErr && <ErrorBanner msg={svcErr} />}

            <FormRow label="Category">
              <select name="category_id" defaultValue={editingSvc?.category_id ?? ''} style={inputSt}>
                <option value="">— No category —</option>
                {categories.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Service Name *">
              <input name="name" type="text" required defaultValue={editingSvc?.name ?? ''} placeholder="e.g. Wound Dressing" style={inputSt} />
            </FormRow>
            <FormRow label="Description">
              <textarea name="description" rows={2} defaultValue={editingSvc?.description ?? ''} placeholder="What this service includes" style={{ ...inputSt, resize: 'vertical' }} />
            </FormRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '0.75rem 0' }}>
              <div>
                <label style={labelSt}>Base Price (SAR) *</label>
                <input name="base_price" type="number" min={0} step={0.01} required defaultValue={editingSvc?.base_price ?? ''} placeholder="200" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Min Price (SAR) *</label>
                <input name="min_price" type="number" min={0} step={0.01} required defaultValue={editingSvc?.min_price ?? ''} placeholder="150" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Max Price (SAR)</label>
                <input name="max_price" type="number" min={0} step={0.01} defaultValue={editingSvc?.max_price ?? ''} placeholder="No cap" style={inputSt} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '0.75rem 0' }}>
              <div>
                <label style={labelSt}>Duration (mins)</label>
                <input name="duration_minutes" type="number" min={1} defaultValue={editingSvc?.duration_minutes ?? ''} placeholder="30" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Sort Order</label>
                <input name="sort_order" type="number" min={0} defaultValue={editingSvc?.sort_order ?? 0} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Requires Equipment</label>
                <select name="requires_equipment" defaultValue={editingSvc?.requires_equipment ? 'true' : 'false'} style={inputSt}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', background: 'var(--cream)', borderRadius: 8, padding: '8px 12px', margin: '0.5rem 0 0.75rem' }}>
              <strong>Pricing guide:</strong> Base = suggested price · Min = floor (nurse cannot go below) · Max = ceiling (leave blank for no cap)
            </div>

            <ModalActions onCancel={closeSvcModal} pending={isPending} submitLabel={svcModal === 'add' ? 'Create Service' : 'Save Changes'} />
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '0.76rem', fontWeight: 700,
  color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em',
}

function FormRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <label style={labelSt}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.75rem', color: '#c0392b', fontSize: '0.82rem', fontWeight: 600 }}>
      ⚠️ {msg}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--shell-bg)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onCancel, pending, submitLabel }: { onCancel: () => void; pending: boolean; submitLabel: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      <button type="button" onClick={onCancel} style={btnSt('var(--muted)', 'var(--cream)')}>
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        style={{
          ...btnSt('#fff', 'var(--teal)'),
          border: 'none',
          padding: '8px 22px',
          opacity: pending ? 0.7 : 1,
          cursor: pending ? 'not-allowed' : 'pointer',
        }}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
