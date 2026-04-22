'use client'

import { useState, useTransition } from 'react'
import {
  addNurseService,
  updateNurseServicePrice,
  toggleNurseService,
  removeNurseService,
  type NurseServiceRow,
  type MasterServiceOption,
} from './actions'

/* ── Types ──────────────────────────────────────────────────── */

interface Props {
  nurseStatus: string
  nurseId: string
  initialNurseServices: NurseServiceRow[]
  masterServices: MasterServiceOption[]
  flagEnabled: boolean
}

/* ── Helpers ────────────────────────────────────────────────── */

const SAR = (n: number | null | undefined) =>
  n == null ? '—' : `SAR ${Number(n).toFixed(0)}`

const cardSt: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  overflow: 'hidden',
}

const inputSt: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: 'var(--cream)',
  width: '100%', boxSizing: 'border-box',
}

const btnSt = (color: string, bg: string, border?: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 8,
  border: `1px solid ${border ?? color + '33'}`,
  background: bg, color,
  fontSize: '0.76rem', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})

/* ── Main ───────────────────────────────────────────────────── */

export default function NurseServicesClient({
  nurseStatus,
  initialNurseServices,
  masterServices,
  flagEnabled,
}: Props) {
  const [nurseServices, setNurseServices] = useState<NurseServiceRow[]>(initialNurseServices)
  const [isPending, startTransition]      = useTransition()

  // Add-service panel state
  const [showAdd,      setShowAdd]      = useState(false)
  const [selectedSvc,  setSelectedSvc]  = useState<string>('')
  const [addPrice,     setAddPrice]     = useState<string>('')
  const [addErr,       setAddErr]       = useState<string | null>(null)
  const [catFilter,    setCatFilter]    = useState<string>('all')

  // Edit-price inline state: id → draft price string
  const [editPrices,   setEditPrices]   = useState<Record<string, string>>({})
  const [editErrors,   setEditErrors]   = useState<Record<string, string>>({})

  // Toast
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  /* ── Derived ── */

  const addedServiceIds = new Set(nurseServices.map(ns => ns.service_id))

  // Unique categories from master services
  const categories = Array.from(
    new Map(
      masterServices
        .filter(s => s.service_categories)
        .map(s => [s.service_categories!.id, s.service_categories!])
    ).values()
  )

  // Available services (not already added) filtered by category
  const availableServices = masterServices.filter(s => {
    if (addedServiceIds.has(s.id)) return false
    if (catFilter !== 'all' && s.category_id !== catFilter) return false
    return true
  })

  // Selected master service details (for price hint)
  const selectedMaster = masterServices.find(s => s.id === selectedSvc)

  /* ── Add service ── */
  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddErr(null)

    const price = parseFloat(addPrice)
    if (!selectedSvc) { setAddErr('Please select a service'); return }
    if (isNaN(price) || price <= 0) { setAddErr('Enter a valid price'); return }

    if (selectedMaster) {
      if (price < selectedMaster.min_price) {
        setAddErr(`Price cannot be less than the minimum SAR ${selectedMaster.min_price}`)
        return
      }
      if (selectedMaster.max_price !== null && price > selectedMaster.max_price) {
        setAddErr(`Price cannot exceed the maximum SAR ${selectedMaster.max_price}`)
        return
      }
    }

    const fd = new FormData()
    fd.set('service_id', selectedSvc)
    fd.set('my_price',   addPrice)

    startTransition(async () => {
      const result = await addNurseService(fd)
      if (result.error) { setAddErr(result.error); return }
      setShowAdd(false)
      setSelectedSvc('')
      setAddPrice('')
      showToast('Service added to your profile')
      window.location.reload()
    })
  }

  /* ── Update price ── */
  function handlePriceUpdate(ns: NurseServiceRow) {
    const draft = editPrices[ns.id]
    if (draft === undefined) return
    const price = parseFloat(draft)

    setEditErrors(prev => ({ ...prev, [ns.id]: '' }))

    const svc = ns.services
    if (svc) {
      if (price < svc.min_price) {
        setEditErrors(prev => ({ ...prev, [ns.id]: `Min is SAR ${svc.min_price}` }))
        return
      }
      if (svc.max_price !== null && price > svc.max_price) {
        setEditErrors(prev => ({ ...prev, [ns.id]: `Max is SAR ${svc.max_price}` }))
        return
      }
    }

    const fd = new FormData()
    fd.set('id', ns.id)
    fd.set('my_price', draft)

    startTransition(async () => {
      const result = await updateNurseServicePrice(fd)
      if (result.error) { setEditErrors(prev => ({ ...prev, [ns.id]: result.error! })); return }
      setEditPrices(prev => { const n = { ...prev }; delete n[ns.id]; return n })
      setNurseServices(prev =>
        prev.map(r => r.id === ns.id ? { ...r, my_price: price } : r)
      )
      showToast('Price updated')
    })
  }

  /* ── Toggle ── */
  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleNurseService(id, !current)
      if (result.error) { showToast(result.error, false); return }
      setNurseServices(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r))
      showToast(!current ? 'Service activated' : 'Service deactivated')
    })
  }

  /* ── Remove ── */
  function handleRemove(id: string, name: string) {
    if (!confirm(`Remove "${name}" from your services?`)) return
    startTransition(async () => {
      const result = await removeNurseService(id)
      if (result.error) { showToast(result.error, false); return }
      setNurseServices(prev => prev.filter(r => r.id !== id))
      showToast('Service removed')
    })
  }

  const isApproved = nurseStatus === 'approved'
  const activeCount = nurseServices.filter(s => s.is_active).length

  /* ── Render ── */
  return (
    <div className="dash-shell">

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

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Services</h1>
          <p className="dash-sub">
            {nurseServices.length === 0
              ? 'Add services you offer to patients'
              : `${nurseServices.length} service${nurseServices.length !== 1 ? 's' : ''} · ${activeCount} active`}
          </p>
        </div>
        {isApproved && (
          <button
            type="button"
            onClick={() => { setShowAdd(true); setAddErr(null) }}
            style={{
              background: 'var(--teal)', color: '#fff', border: 'none',
              padding: '9px 20px', borderRadius: 9, fontSize: '0.85rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 10px rgba(14,123,140,0.25)',
            }}
          >
            + Add Service
          </button>
        )}
      </div>

      {/* Feature flag info banner */}
      {!flagEnabled && (
        <div style={{
          background: 'rgba(184,94,0,0.06)', border: '1px solid rgba(184,94,0,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: '1.2rem',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔧</span>
          <div style={{ fontSize: '0.82rem', color: '#b85e00' }}>
            <strong>Setup mode:</strong> Service Master is not yet live for patients. You can set up your services now — they will be visible to patients once the admin enables the catalog.
          </div>
        </div>
      )}

      {/* Profile not approved warning */}
      {!isApproved && (
        <div style={{
          background: 'rgba(245,132,42,0.06)', border: '1px solid rgba(245,132,42,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: '1.2rem',
          fontSize: '0.82rem', color: '#b85e00',
        }}>
          ⚠️ Your profile status is <strong>{nurseStatus}</strong>. Services can only be added once your profile is approved.
        </div>
      )}

      {/* ── ADD SERVICE PANEL ── */}
      {showAdd && (
        <div style={{ ...cardSt, marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Add a Service You Offer</span>
            <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
          </div>

          <div style={{ padding: '1.2rem' }}>
            {/* Category filter chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => { setCatFilter('all'); setSelectedSvc(''); setAddPrice('') }}
                style={btnSt(catFilter === 'all' ? '#fff' : 'var(--muted)', catFilter === 'all' ? 'var(--teal)' : 'var(--cream)', catFilter === 'all' ? 'transparent' : undefined)}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCatFilter(c.id); setSelectedSvc(''); setAddPrice('') }}
                  style={btnSt(catFilter === c.id ? '#fff' : 'var(--muted)', catFilter === c.id ? 'var(--teal)' : 'var(--cream)', catFilter === c.id ? 'transparent' : undefined)}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>

            {/* Service grid */}
            {availableServices.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>
                No more services to add in this category.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.2rem',
              }}>
                {availableServices.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setSelectedSvc(svc.id)
                      setAddPrice(String(svc.base_price))
                      setAddErr(null)
                    }}
                    style={{
                      background: selectedSvc === svc.id ? 'rgba(14,123,140,0.08)' : 'var(--cream)',
                      border: selectedSvc === svc.id ? '2px solid var(--teal)' : '1px solid var(--border)',
                      borderRadius: 10, padding: '0.85rem', textAlign: 'left',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'border 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 3 }}>
                      {svc.service_categories?.icon} {svc.name}
                    </div>
                    {svc.description && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 5, lineHeight: 1.4 }}>
                        {svc.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#27A869', fontWeight: 700 }}>
                        Min {SAR(svc.min_price)}
                      </span>
                      {svc.max_price && (
                        <span style={{ fontSize: '0.72rem', color: '#b85e00', fontWeight: 700 }}>
                          Max {SAR(svc.max_price)}
                        </span>
                      )}
                      {svc.duration_minutes && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {svc.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Price entry + submit (only shows when a service is selected) */}
            {selectedSvc && selectedMaster && (
              <form onSubmit={handleAddSubmit}>
                {addErr && (
                  <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.75rem', color: '#c0392b', fontSize: '0.82rem', fontWeight: 600 }}>
                    ⚠️ {addErr}
                  </div>
                )}

                <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                    {selectedMaster.service_categories?.icon} {selectedMaster.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 10 }}>
                    Admin range: {SAR(selectedMaster.min_price)} – {selectedMaster.max_price ? SAR(selectedMaster.max_price) : 'no cap'}
                    {selectedMaster.duration_minutes && ` · ${selectedMaster.duration_minutes} min session`}
                  </div>

                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Your Price (SAR) *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      name="my_price"
                      value={addPrice}
                      onChange={e => { setAddPrice(e.target.value); setAddErr(null) }}
                      min={selectedMaster.min_price}
                      max={selectedMaster.max_price ?? undefined}
                      step="1"
                      required
                      style={{ ...inputSt, width: 120 }}
                      placeholder={String(selectedMaster.base_price)}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>SAR per session</span>
                  </div>

                  {/* Live range indicator */}
                  {addPrice && !isNaN(parseFloat(addPrice)) && (
                    <div style={{ marginTop: 8, fontSize: '0.74rem' }}>
                      {parseFloat(addPrice) < selectedMaster.min_price ? (
                        <span style={{ color: '#E04A4A', fontWeight: 700 }}>⚠ Below minimum ({SAR(selectedMaster.min_price)})</span>
                      ) : selectedMaster.max_price !== null && parseFloat(addPrice) > selectedMaster.max_price ? (
                        <span style={{ color: '#E04A4A', fontWeight: 700 }}>⚠ Above maximum ({SAR(selectedMaster.max_price)})</span>
                      ) : (
                        <span style={{ color: '#27A869', fontWeight: 700 }}>✓ Price within allowed range</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setSelectedSvc(''); setAddPrice(''); setAddErr(null) }} style={btnSt('var(--muted)', 'var(--cream)')}>
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      ...btnSt('#fff', 'var(--teal)'),
                      border: 'none', padding: '8px 22px',
                      opacity: isPending ? 0.7 : 1,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPending ? 'Adding…' : 'Add to My Services'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MY SERVICES LIST ── */}
      {nurseServices.length === 0 ? (
        <div style={{ ...cardSt, padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🩺</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>No services added yet</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Add the services you offer and set your own price within the platform&apos;s allowed range.
          </div>
          {isApproved && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              style={{
                background: 'var(--teal)', color: '#fff', border: 'none',
                padding: '10px 24px', borderRadius: 9, fontSize: '0.88rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Add Your First Service
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {nurseServices.map(ns => {
            const svc      = ns.services
            const isDraft  = editPrices[ns.id] !== undefined
            const draftVal = editPrices[ns.id] ?? ''
            const editErr  = editErrors[ns.id]

            // Out-of-range warning (admin may have changed bounds after nurse set price)
            const outOfRange = svc && (
              ns.my_price < svc.min_price ||
              (svc.max_price !== null && ns.my_price > svc.max_price)
            )

            return (
              <div
                key={ns.id}
                style={{
                  ...cardSt,
                  opacity: ns.is_active ? 1 : 0.65,
                  borderLeft: ns.is_active ? '3px solid var(--teal)' : '3px solid var(--border)',
                }}
              >
                {/* Mobile-friendly flex layout */}
                <div style={{ padding: '1rem 1.2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>

                  {/* Left: service info */}
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {svc?.service_categories?.icon} {svc?.name ?? 'Unknown service'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: ns.is_active ? 'rgba(39,168,105,0.1)' : 'rgba(203,213,224,0.3)',
                        color: ns.is_active ? '#27A869' : '#718096',
                      }}>
                        {ns.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {!ns.is_active && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Hidden from patients</span>
                      )}
                    </div>

                    {svc?.service_categories && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 3 }}>
                        {svc.service_categories.icon} {svc.service_categories.name}
                        {svc.duration_minutes && ` · ${svc.duration_minutes} min`}
                        {svc.requires_equipment && ' · 🔧 Equipment needed'}
                      </div>
                    )}

                    {svc?.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {svc.description}
                      </div>
                    )}

                    {svc && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6 }}>
                        Admin range: {SAR(svc.min_price)} – {svc.max_price ? SAR(svc.max_price) : 'no cap'}
                      </div>
                    )}

                    {outOfRange && (
                      <div style={{ fontSize: '0.74rem', color: '#E04A4A', fontWeight: 700, marginTop: 5 }}>
                        ⚠️ Your price is outside the current allowed range — please update.
                      </div>
                    )}
                  </div>

                  {/* Right: price editor + actions */}
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 180 }}>
                    {/* Price display / edit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isDraft ? (
                        <>
                          <input
                            type="number"
                            value={draftVal}
                            onChange={e => setEditPrices(prev => ({ ...prev, [ns.id]: e.target.value }))}
                            min={svc?.min_price ?? 0}
                            max={svc?.max_price ?? undefined}
                            step="1"
                            style={{ ...inputSt, width: 90, padding: '5px 8px' }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handlePriceUpdate(ns)}
                            disabled={isPending}
                            style={{ ...btnSt('#fff', '#27A869'), border: 'none', padding: '5px 12px' }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditPrices(prev => { const n = { ...prev }; delete n[ns.id]; return n }); setEditErrors(prev => { const n = { ...prev }; delete n[ns.id]; return n }) }}
                            style={btnSt('var(--muted)', 'var(--cream)')}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--teal)' }}>
                            {SAR(ns.my_price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditPrices(prev => ({ ...prev, [ns.id]: String(ns.my_price) }))}
                            style={btnSt('var(--teal)', 'rgba(14,123,140,0.07)')}
                          >
                            Edit Price
                          </button>
                        </>
                      )}
                    </div>

                    {editErr && (
                      <div style={{ fontSize: '0.72rem', color: '#E04A4A', fontWeight: 700, textAlign: 'right' }}>
                        ⚠ {editErr}
                      </div>
                    )}

                    {/* Live range check while editing */}
                    {isDraft && svc && draftVal && !isNaN(parseFloat(draftVal)) && (
                      <div style={{ fontSize: '0.72rem', textAlign: 'right' }}>
                        {parseFloat(draftVal) < svc.min_price ? (
                          <span style={{ color: '#E04A4A', fontWeight: 700 }}>Below min {SAR(svc.min_price)}</span>
                        ) : svc.max_price !== null && parseFloat(draftVal) > svc.max_price ? (
                          <span style={{ color: '#E04A4A', fontWeight: 700 }}>Above max {SAR(svc.max_price)}</span>
                        ) : (
                          <span style={{ color: '#27A869', fontWeight: 700 }}>✓ Valid</span>
                        )}
                      </div>
                    )}

                    {/* Toggle + Remove */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(ns.id, ns.is_active)}
                        disabled={isPending}
                        style={btnSt(
                          ns.is_active ? '#b85e00' : '#27A869',
                          ns.is_active ? 'rgba(184,94,0,0.07)' : 'rgba(39,168,105,0.07)'
                        )}
                      >
                        {ns.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(ns.id, svc?.name ?? 'this service')}
                        disabled={isPending}
                        style={btnSt('#E04A4A', 'rgba(224,74,74,0.06)')}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom hint */}
      {nurseServices.length > 0 && isApproved && !showAdd && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{
              background: 'none', border: '1px dashed var(--border)',
              color: 'var(--muted)', padding: '10px 24px',
              borderRadius: 9, fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add Another Service
          </button>
        </div>
      )}
    </div>
  )
}
