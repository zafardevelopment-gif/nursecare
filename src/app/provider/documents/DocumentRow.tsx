'use client'

import { useRef, useState, useTransition } from 'react'
import { replaceDocument, deleteDocument } from './actions'

interface Doc {
  id: string
  file_url: string
  file_name: string
  uploaded_at: string
}

interface Props {
  docType: string
  label: string
  icon: string
  doc: Doc | null
}

export default function DocumentRow({ docType, label, icon, doc }: Props) {
  const fileRef         = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const form = new FormData()
    form.append('doc_type', docType)
    form.append('file', file)

    startTransition(async () => {
      const res = await replaceDocument(form)
      if (res?.error) setError(res.error)
      // reset input so same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function handleDelete() {
    if (!confirm) { setConfirm(true); return }
    setConfirm(false)
    setError(null)

    const form = new FormData()
    form.append('doc_type', docType)

    startTransition(async () => {
      const res = await deleteDocument(form)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)',
      opacity: isPending ? 0.6 : 1,
    }}>
      {/* Icon */}
      <div style={{ fontSize: '1.3rem', width: 32, textAlign: 'center' }}>{icon}</div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {doc ? (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
            {doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString()}
          </div>
        ) : (
          <div style={{ fontSize: '0.74rem', color: '#E04A4A', marginTop: '2px' }}>Not uploaded</div>
        )}
        {error && (
          <div style={{ fontSize: '0.72rem', color: '#E04A4A', marginTop: '3px' }}>{error}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* View */}
        {doc && (
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal)',
              background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.2)',
              padding: '5px 12px', borderRadius: '7px', textDecoration: 'none',
            }}
          >
            View
          </a>
        )}

        {/* Replace — hidden file input triggered by button */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={handleReplace}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          style={{
            fontSize: '0.78rem', fontWeight: 600,
            color: doc ? '#2266BB' : 'var(--teal)',
            background: doc ? '#EBF5FF' : 'rgba(14,123,140,0.08)',
            border: `1px solid ${doc ? '#BDD6F5' : 'rgba(14,123,140,0.2)'}`,
            padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
          }}
        >
          {doc ? 'Replace' : 'Upload'}
        </button>

        {/* Delete — two-click confirmation */}
        {doc && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            style={{
              fontSize: '0.78rem', fontWeight: 600,
              color: confirm ? '#fff' : '#E04A4A',
              background: confirm ? '#E04A4A' : 'rgba(224,74,74,0.08)',
              border: '1px solid rgba(224,74,74,0.25)',
              padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {confirm ? 'Confirm?' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}
