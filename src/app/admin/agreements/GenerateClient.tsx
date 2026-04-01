'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateAgreement } from './actions'

type Template = { id: string; title: string }
type Nurse    = { id: string; full_name: string; email: string }
type Hospital = { id: string; full_name: string; email: string }

export default function GenerateClient({ templates, nurses, hospitals }: {
  templates: Template[]; nurses: Nurse[]; hospitals: Hospital[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await generateAgreement(fd)
      if (res?.error) { setErr(res.error); return }
      setOpen(false)
      router.push(`/admin/agreements/${res.id}`)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', fontSize: '0.85rem',
    fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--ink)',
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: '#0E7B8C', color: '#fff', border: 'none',
        padding: '9px 20px', borderRadius: 9, fontWeight: 700,
        fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        + Generate Agreement
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>Generate New Agreement</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {err && <div style={{ background: '#FEE8E8', color: '#C0392B', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.83rem' }}>{err}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={lbl}>Agreement Template</label>
                <select name="template_id" required style={inputStyle}>
                  <option value="">Select template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Nurse (Provider)</label>
                <select name="nurse_id" required style={inputStyle}>
                  <option value="">Select nurse…</option>
                  {nurses.map(n => <option key={n.id} value={n.id}>{n.full_name} — {n.email}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Hospital</label>
                <select name="hospital_id" required style={inputStyle}>
                  <option value="">Select hospital…</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.full_name || h.email}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" disabled={isPending} style={{ background: '#0E7B8C', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', opacity: isPending ? 0.7 : 1 }}>
                  {isPending ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 5,
}
