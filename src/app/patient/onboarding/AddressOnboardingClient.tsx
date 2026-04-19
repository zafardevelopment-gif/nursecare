'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { savePatientAddress, type AddressPayload } from './actions'

interface AddressFields {
  full_address: string
  building:     string
  street:       string
  area:         string
  city:         string
  state:        string
  country:      string
  postal_code:  string
  latitude:     number | null
  longitude:    number | null
}

const LABEL_OPTIONS = [
  { value: 'home',     icon: '🏠', title: 'Home',     desc: 'My residence' },
  { value: 'office',   icon: '🏢', title: 'Office',   desc: 'Work address' },
  { value: 'mother',   icon: '👩', title: 'Mother',   desc: "Mother's place" },
  { value: 'father',   icon: '👨', title: 'Father',   desc: "Father's place" },
  { value: 'relative', icon: '👪', title: 'Relative', desc: 'Family member' },
  { value: 'child',    icon: '👶', title: 'Child',    desc: "Child's location" },
  { value: 'other',    icon: '📍', title: 'Other',    desc: 'Custom label' },
]

const RELATIONSHIPS = ['Self', 'Mother', 'Father', 'Spouse', 'Child', 'Sibling', 'Relative', 'Office Staff', 'Other']
const STEP_LABELS   = ['Location', 'Label', 'Contact', 'Confirm']

declare global {
  interface Window { google: any; initMap?: () => void }
}

function emptyAddr(lat: number | null = null, lng: number | null = null): AddressFields {
  return { full_address: '', building: '', street: '', area: '', city: '', state: '', country: '', postal_code: '', latitude: lat, longitude: lng }
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<AddressFields> {
  try {
    const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`)
    const json = await res.json()
    const result = json.results?.[0]
    if (!result) return emptyAddr(lat, lng)
    const get = (type: string) =>
      result.address_components?.find((c: any) => c.types.includes(type))?.long_name ?? ''
    return {
      full_address: result.formatted_address ?? '',
      building:     get('premise') || get('street_number'),
      street:       get('route'),
      area:         get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
      city:         get('locality') || get('administrative_area_level_2'),
      state:        get('administrative_area_level_1'),
      country:      get('country'),
      postal_code:  get('postal_code'),
      latitude:     lat,
      longitude:    lng,
    }
  } catch {
    return emptyAddr(lat, lng)
  }
}

export default function AddressOnboardingClient({ userName, apiKey }: { userName: string; apiKey: string }) {
  const [step, setStep]         = useState(1)
  const [addr, setAddr]         = useState<AddressFields>(emptyAddr())
  const [label, setLabel]       = useState('')
  const [customLabel, setCustomLabel]   = useState('')
  const [personName, setPersonName]     = useState(userName)
  const [mobile, setMobile]             = useState('')
  const [altMobile, setAltMobile]       = useState('')
  const [relationship, setRelationship] = useState('Self')
  const [mapReady, setMapReady]   = useState(false)   // Google SDK loaded
  const [locating, setLocating]   = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const mapRef    = useRef<HTMLDivElement>(null)
  const mapObj    = useRef<any>(null)
  const markerObj = useRef<any>(null)
  const acInput   = useRef<HTMLInputElement>(null)
  const mapInited = useRef(false)

  // ── Load Google Maps SDK ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.google?.maps) { setMapReady(true); return }

    window.initMap = () => setMapReady(true)

    const script = document.createElement('script')
    script.id    = 'gmaps-sdk'
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`
    script.async = true
    script.defer = true
    script.onerror = () => setError('Failed to load Google Maps. Check your API key.')
    document.head.appendChild(script)

    return () => { try { delete window.initMap } catch {} }
  }, [apiKey])

  // ── Init map once SDK is ready ────────────────────────────
  const updateMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapObj.current) return
    const G   = window.google.maps
    const pos = { lat, lng }
    mapObj.current.panTo(pos)
    mapObj.current.setZoom(17)

    if (markerObj.current) {
      markerObj.current.setPosition(pos)
    } else {
      markerObj.current = new G.Marker({
        position: pos, map: mapObj.current,
        draggable: true, animation: G.Animation.DROP,
      })
      markerObj.current.addListener('dragend', async (e: any) => {
        setGeocoding(true)
        const r = await reverseGeocode(e.latLng.lat(), e.latLng.lng(), apiKey)
        setAddr(r)
        setGeocoding(false)
      })
    }
    setGeocoding(true)
    const r = await reverseGeocode(lat, lng, apiKey)
    setAddr(r)
    setGeocoding(false)
  }, [apiKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInited.current) return
    mapInited.current = true

    const G = window.google.maps
    mapObj.current = new G.Map(mapRef.current, {
      center: { lat: 24.7136, lng: 46.6753 },
      zoom: 11,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      styles: MAP_STYLES,
    })

    mapObj.current.addListener('click', (e: any) => {
      updateMarker(e.latLng.lat(), e.latLng.lng())
    })

    if (acInput.current && G.places) {
      const ac = new G.places.Autocomplete(acInput.current, {
        fields: ['geometry', 'formatted_address', 'address_components'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place.geometry?.location) return
        updateMarker(place.geometry.location.lat(), place.geometry.location.lng())
      })
    }
  }, [mapReady, updateMarker])

  // ── GPS ───────────────────────────────────────────────────
  function handleDetectLocation() {
    if (!navigator.geolocation) { setError('GPS not supported by your browser'); return }
    setLocating(true); setError(null)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await updateMarker(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      err => {
        setLocating(false)
        setError(err.code === 1
          ? 'Location permission denied. Search manually or click on the map.'
          : 'Could not get location. Try searching manually.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ── Validation + navigation ───────────────────────────────
  function validate(): string | null {
    if (step === 1 && !addr.full_address.trim()) return 'Please select a location on the map or search for your address'
    if (step === 2) {
      if (!label) return 'Please select an address label'
      if (label === 'other' && !customLabel.trim()) return 'Please enter a custom label'
    }
    if (step === 3) {
      if (!personName.trim()) return 'Contact person name is required'
      if (!mobile.trim()) return 'Mobile number is required'
      if (mobile.trim().length < 9) return 'Please enter a valid mobile number'
    }
    return null
  }

  function next() { const e = validate(); if (e) { setError(e); return }; setError(null); setStep(s => s + 1) }
  function back() { setError(null); setStep(s => s - 1) }

  function submit() {
    const e = validate(); if (e) { setError(e); return }; setError(null)
    startTransition(async () => {
      const res = await savePatientAddress({
        latitude: addr.latitude, longitude: addr.longitude,
        full_address: addr.full_address, building: addr.building,
        street: addr.street, area: addr.area, city: addr.city,
        state: addr.state, country: addr.country, postal_code: addr.postal_code,
        label, custom_label: customLabel,
        person_name: personName, mobile, alternate_mobile: altMobile, relationship,
      })
      if (res?.error) setError(res.error)
    })
  }

  const selectedLabel = LABEL_OPTIONS.find(l => l.value === label)

  return (
    <div style={S.shell}>

      {/* ── Progress ── */}
      <div style={S.progressWrap}>
        {STEP_LABELS.map((lbl, i) => {
          const n = i + 1; const done = step > n; const active = step === n
          return (
            <div key={lbl} style={S.progressItem}>
              {i > 0 && <div style={{ ...S.progressLine, background: done ? '#27A869' : 'var(--border)', left: '-50%' }} />}
              <div style={{ ...S.progressDot, background: done ? '#27A869' : active ? '#0E7B8C' : 'var(--border)', color: (done || active) ? '#fff' : 'var(--muted)', transform: active ? 'scale(1.15)' : 'none' }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: active ? 700 : 500, color: active ? '#0E7B8C' : done ? '#27A869' : 'var(--muted)', marginTop: 4 }}>{lbl}</span>
            </div>
          )
        })}
      </div>

      {/* ── Error ── */}
      {error && <div style={S.errorBanner}>⚠ {error}</div>}

      {/* ══ STEP 1: Map ══ */}
      {step === 1 && (
        <div style={S.card}>
          <StepHeader icon="📍" title="Confirm Your Service Address" sub="We'll use this to connect you with nearby nurses" />

          {/* Search row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <input
              ref={acInput}
              type="text"
              placeholder="Search address, area, or landmark…"
              style={{ ...S.inp, flex: 1 }}
            />
            <button onClick={handleDetectLocation} disabled={locating} style={S.gpsBtn} title="Use my location">
              {locating ? <Spin size={16} /> : '🎯'}
            </button>
          </div>

          {/* Map */}
          <div style={S.mapOuter}>
            {!mapReady && (
              <div style={S.mapLoader}>
                <Spin size={36} />
                <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: '0.88rem' }}>Loading map…</p>
              </div>
            )}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            <div style={S.mapHint}>Click anywhere on the map to set location</div>
          </div>

          {/* Address result */}
          {geocoding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: '0.82rem', padding: '10px 0' }}>
              <Spin size={16} /> Fetching address details…
            </div>
          ) : addr.full_address ? (
            <div style={S.addrBox}>
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>📍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{addr.full_address}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                  {[
                    { l: 'Building', v: addr.building }, { l: 'Street', v: addr.street },
                    { l: 'Area', v: addr.area }, { l: 'City', v: addr.city },
                    { l: 'State', v: addr.state }, { l: 'Country', v: addr.country },
                    { l: 'Postal Code', v: addr.postal_code },
                  ].filter(f => f.v).map(f => (
                    <div key={f.l} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>{f.l}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink)', fontWeight: 500 }}>{f.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: 'var(--cream)', borderRadius: 10, border: '1px dashed var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🗺️</span>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '6px 0 0' }}>Search above or click on the map to set your location</p>
            </div>
          )}

          {/* Manual override */}
          {addr.full_address && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600, padding: '6px 0', userSelect: 'none' }}>
                ✏️ Edit address details manually
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginTop: 10 }}>
                {([
                  ['building', 'Building / House No'], ['street', 'Street'], ['area', 'Area'],
                  ['city', 'City'], ['state', 'State'], ['country', 'Country'], ['postal_code', 'Postal Code'],
                ] as [keyof AddressFields, string][]).map(([k, lbl]) => (
                  <div key={k}>
                    <label style={S.fieldLbl}>{lbl}</label>
                    <input value={(addr[k] as string) ?? ''} onChange={e => setAddr(a => ({ ...a, [k]: e.target.value }))} style={S.inp} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ══ STEP 2: Label ══ */}
      {step === 2 && (
        <div style={S.card}>
          <StepHeader icon="🏷️" title="This address is for…" sub="Select the best label for this location" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {LABEL_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setLabel(opt.value); setError(null) }} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '18px 10px', borderRadius: 14, cursor: 'pointer', gap: 4, fontFamily: 'inherit',
                border:     `2px solid ${label === opt.value ? '#0E7B8C' : 'var(--border)'}`,
                background: label === opt.value ? 'rgba(14,123,140,0.07)' : 'var(--card)',
                transform:  label === opt.value ? 'translateY(-2px)' : 'none',
                boxShadow:  label === opt.value ? '0 4px 16px rgba(14,123,140,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.18s ease', position: 'relative',
              }}>
                <span style={{ fontSize: '2rem', marginBottom: 4 }}>{opt.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: label === opt.value ? '#0E7B8C' : 'var(--ink)' }}>{opt.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{opt.desc}</span>
                {label === opt.value && (
                  <span style={{ position: 'absolute', top: 8, right: 8, background: '#0E7B8C', color: '#fff', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>✓</span>
                )}
              </button>
            ))}
          </div>
          {label === 'other' && (
            <div style={{ marginTop: 16 }}>
              <label style={S.fieldLbl}>Custom Label *</label>
              <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="e.g. Grandmother, Clinic…" style={S.inp} autoFocus />
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 3: Contact ══ */}
      {step === 3 && (
        <div style={S.card}>
          <StepHeader icon="👤" title="Contact Person Details" sub="Who should the nurse contact at this address?" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.fieldLbl}>Person Name *</label>
              <input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Full name" style={S.inp} />
            </div>
            <div>
              <label style={S.fieldLbl}>Mobile Number *</label>
              <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+966 5X XXX XXXX" type="tel" style={S.inp} />
            </div>
            <div>
              <label style={S.fieldLbl}>Alternate Number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <input value={altMobile} onChange={e => setAltMobile(e.target.value)} placeholder="+966 5X XXX XXXX" type="tel" style={S.inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.fieldLbl}>Relationship <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} style={S.inp}>
                <option value="">Select…</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 4: Confirm ══ */}
      {step === 4 && (
        <div style={S.card}>
          <StepHeader icon="✅" title="Confirm Your Details" sub="Review everything before saving" />
          <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <Section title="📍 Location">
              <p style={{ fontWeight: 700, margin: '0 0 8px', fontSize: '0.9rem' }}>{addr.full_address}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[addr.city, addr.state, addr.country].filter(Boolean).map(v => (
                  <span key={v} style={{ background: 'rgba(14,123,140,0.08)', color: '#0E7B8C', fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(14,123,140,0.2)' }}>{v}</span>
                ))}
              </div>
            </Section>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <Section title="🏷️ Label">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.4rem' }}>{selectedLabel?.icon}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedLabel?.title}</div>
                  {label === 'other' && customLabel && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{customLabel}</div>}
                </div>
              </div>
            </Section>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <Section title="👤 Contact">
              {([['Name', personName], ['Mobile', mobile], altMobile ? ['Alternate', altMobile] : null, relationship ? ['Relation', relationship] : null] as ([string, string] | null)[])
                .filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, fontSize: '0.85rem', padding: '3px 0' }}>
                  <span style={{ color: 'var(--muted)', width: 80, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </Section>
          </div>
        </div>
      )}

      {/* ── Nav buttons ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {step > 1 && (
          <button onClick={back} disabled={isPending} style={S.btnBack}>← Back</button>
        )}
        <div style={{ flex: 1 }} />
        {step < 4 ? (
          <button onClick={next} style={S.btnNext}>Continue →</button>
        ) : (
          <button onClick={submit} disabled={isPending} style={{ ...S.btnNext, background: isPending ? 'var(--border)' : 'linear-gradient(135deg,#27A869,#1A7A4A)', minWidth: 200 }}>
            {isPending ? <><Spin size={16} color="#fff" /> Saving…</> : '✓ Save Address & Continue'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Small helper components ───────────────────────────────────

function StepHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14,123,140,0.12), rgba(10,191,204,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--ink)', fontFamily: 'Georgia,serif' }}>{title}</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '3px 0 0' }}>{sub}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Spin({ size = 18, color = '#0E7B8C' }: { size?: number; color?: string }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}33`, borderTopColor: color,
      display: 'inline-block', animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Styles ────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  shell:       { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 680, margin: '0 auto' },
  progressWrap:{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0.5rem 0' },
  progressItem:{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  progressDot: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.25s ease', zIndex: 1, border: '2px solid transparent' },
  progressLine:{ position: 'absolute', top: 16, width: '100%', height: 2, zIndex: 0, transition: 'background 0.25s ease' },
  errorBanner: { background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.25)', color: '#C0392B', padding: '12px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 },
  card:        { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.8rem', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
  mapOuter:    { width: '100%', height: 300, borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--border)', position: 'relative', background: '#e8e8e0', marginBottom: 12 },
  mapLoader:   { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', zIndex: 10 },
  mapHint:     { position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.72rem', padding: '5px 12px', borderRadius: 50, pointerEvents: 'none', whiteSpace: 'nowrap' },
  addrBox:     { display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(14,123,140,0.05)', border: '1.5px solid rgba(14,123,140,0.2)', borderRadius: 12, marginBottom: 8 },
  inp:         { width: '100%', padding: '10px 13px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--input-bg)', color: 'var(--ink)', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' as const },
  fieldLbl:    { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 5 },
  gpsBtn:      { width: 42, height: 42, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  btnBack:     { padding: '11px 20px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnNext:     { padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #0E7B8C, #0ABFCC)', border: 'none', color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(14,123,140,0.3)', display: 'flex', alignItems: 'center', gap: 8 },
}

const MAP_STYLES = [
  { featureType: 'water',       elementType: 'geometry',        stylers: [{ color: '#C8E6F5' }] },
  { featureType: 'road',        elementType: 'geometry',        stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'landscape',   elementType: 'geometry',        stylers: [{ color: '#F5F5F0' }] },
  { featureType: 'poi.park',    elementType: 'geometry',        stylers: [{ color: '#D4EAD4' }] },
  { featureType: 'road',        elementType: 'labels.text.fill',stylers: [{ color: '#555555' }] },
]
