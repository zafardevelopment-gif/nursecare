'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAgreement } from '../actions'

type Agreement = {
  id: string
  title: string
  status: string
  rendered_html: string
  generated_at: string
  template_version: number
  nurse_id: string
  hospital_id: string
  nurse_approved_at: string | null
  hospital_approved_at: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending — Awaiting Both Approvals', color: '#b85e00', bg: '#FFF8F0' },
  nurse_approved:    { label: 'Nurse Approved — Awaiting Hospital', color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved: { label: 'Hospital Approved — Awaiting Nurse', color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:    { label: 'Fully Executed', color: '#1A7A4A', bg: '#E8F9F0' },
}

export default function AgreementDetailClient({ agreement }: { agreement: Agreement }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const s = STATUS_LABELS[agreement.status] ?? STATUS_LABELS.pending

  function handleDelete() {
    const fd = new FormData()
    fd.set('id', agreement.id)
    startTransition(async () => {
      await deleteAgreement(fd)
      router.push('/admin/agreements')
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

      {/* Left: HTML preview */}
      <div className="dash-card" style={{ overflow: 'hidden' }}>
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="dash-card-title">Agreement Preview</span>
          <a
            href={`/api/agreements/${agreement.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#0E7B8C', color: '#fff', border: 'none',
              padding: '7px 16px', borderRadius: 8, fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'none',
            }}
          >
            ⬇ Download PDF
          </a>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          <iframe
            srcDoc={agreement.rendered_html}
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
            title="Agreement Preview"
          />
        </div>
      </div>

      {/* Right: Meta + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Status */}
        <div className="dash-card">
          <div className="dash-card-body">
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Status</div>
            <div style={{ background: s.bg, color: s.color, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
              {s.label}
            </div>
          </div>
        </div>

        {/* Approval timeline */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Approval Status</span></div>
          <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: agreement.nurse_approved_at ? '#E8F9F0' : '#FFF8F0', border: `2px solid ${agreement.nurse_approved_at ? '#27A869' : '#F5842A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                {agreement.nurse_approved_at ? '✓' : '⏳'}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nurse</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {agreement.nurse_approved_at
                    ? new Date(agreement.nurse_approved_at).toLocaleString()
                    : 'Awaiting approval'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: agreement.hospital_approved_at ? '#E8F9F0' : '#FFF8F0', border: `2px solid ${agreement.hospital_approved_at ? '#27A869' : '#F5842A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                {agreement.hospital_approved_at ? '✓' : '⏳'}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Hospital</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {agreement.hospital_approved_at
                    ? new Date(agreement.hospital_approved_at).toLocaleString()
                    : 'Awaiting approval'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Details</span></div>
          <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: 'Agreement ID', val: agreement.id.substring(0, 8).toUpperCase() },
              { label: 'Template Version', val: `v${agreement.template_version}` },
              { label: 'Generated', val: new Date(agreement.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="dash-card" style={{ borderColor: '#FECACA' }}>
          <div className="dash-card-body">
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Danger Zone</div>
            {deleteConfirm ? (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 10 }}>This action cannot be undone. Permanently delete this agreement?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleDelete} disabled={isPending} style={{ background: '#E04A4A', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                    {isPending ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                  <button onClick={() => setDeleteConfirm(false)} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} style={{ background: 'none', border: '1px solid #E04A4A', color: '#E04A4A', padding: '7px 14px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                Delete Agreement
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
