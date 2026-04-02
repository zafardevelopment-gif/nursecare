'use client'

import { useState, useTransition, useRef } from 'react'
import { createTemplate, updateTemplate, deleteTemplate, uploadLogo, deleteLogo } from '../actions'

type Template = {
  id: string; title: string; content: string; logo_url: string | null
  version: number; is_active: boolean; created_at: string
}
type Logo = { id: string; name: string; file_url: string }

export default function TemplatesClient({
  templates, logos,
}: { templates: Template[]; logos: Logo[] }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<Template | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [selectedLogo, setSelectedLogo] = useState<string>('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoName, setLogoName] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  function handleSubmitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('logo_url', selectedLogo)
    startTransition(async () => {
      const res = await createTemplate(fd)
      if (res?.error) flash('error', res.error)
      else { flash('success', 'Template created!'); setShowNew(false); setSelectedLogo('') }
    })
  }

  function handleSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('logo_url', selectedLogo)
    startTransition(async () => {
      const res = await updateTemplate(fd)
      if (res?.error) flash('error', res.error)
      else { flash('success', 'Template updated!'); setEditing(null); setSelectedLogo('') }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => {
      await deleteTemplate(fd)
      setDeleteConfirm(null)
      flash('success', 'Template deleted')
    })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setLogoUploading(true)
    const fd = new FormData(); fd.append('logo', file); fd.set('name', logoName || file.name)
    const res = await uploadLogo(fd)
    setLogoUploading(false)
    if (res.error) flash('error', res.error)
    else { flash('success', 'Logo uploaded!'); setLogoName('') }
  }

  function handleDeleteLogo(id: string) {
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => { await deleteLogo(fd) })
  }

  const placeholders = ['{{nurse_name}}','{{nurse_email}}','{{nurse_phone}}','{{nurse_city}}','{{nurse_specialization}}','{{hospital_name}}','{{hospital_email}}','{{agreement_date}}','{{agreement_id}}']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

      {/* Left: Templates */}
      <div>
        {msg && (
          <div style={{ background: msg.type === 'success' ? '#E8F9F0' : '#FEE8E8', color: msg.type === 'success' ? '#1A7A4A' : '#C0392B', padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: '0.85rem', fontWeight: 600 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Agreement Templates ({templates.length})</span>
          <button onClick={() => { setShowNew(true); setEditing(null); setSelectedLogo('') }} style={btnTeal}>+ New Template</button>
        </div>

        {/* New / Edit form */}
        {(showNew || editing) && (
          <div className="dash-card" style={{ marginBottom: '1.2rem' }}>
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="dash-card-title">{editing ? 'Edit Template' : 'New Template'}</span>
              <button onClick={() => { setShowNew(false); setEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div className="dash-card-body">
              <form onSubmit={editing ? handleSubmitEdit : handleSubmitNew}>
                {editing && <input type="hidden" name="id" value={editing.id} />}
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={labelStyle}>Agreement Title</label>
                  <input name="title" defaultValue={editing?.title} required style={inputStyle} placeholder="e.g. Standard Nurse Service Agreement" />
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={labelStyle}>Select Logo</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <button type="button" onClick={() => setSelectedLogo('')} style={{ ...logoPill, border: selectedLogo === '' ? '2px solid #0E7B8C' : '1px solid var(--border)' }}>None</button>
                    {logos.map(l => (
                      <button key={l.id} type="button" onClick={() => setSelectedLogo(l.file_url)} style={{ ...logoPill, border: selectedLogo === l.file_url ? '2px solid #0E7B8C' : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img src={l.file_url} alt={l.name} style={{ height: 20, maxWidth: 50, objectFit: 'contain' }} />
                        <span>{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={labelStyle}>Template Content</label>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>
                    Available placeholders: {placeholders.map(p => <code key={p} style={{ background: 'var(--cream)', padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>{p}</code>)}
                  </div>
                  <textarea name="content" defaultValue={editing?.content} required rows={14} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }} placeholder="Write agreement content here. Use placeholders like {{nurse_name}}, {{hospital_name}}, {{agreement_date}}..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={isPending} style={btnTeal}>{isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}</button>
                  <button type="button" onClick={() => { setShowNew(false); setEditing(null) }} style={btnSecondary}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Template list */}
        {templates.length === 0 ? (
          <div className="dash-card"><div className="dash-card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No templates yet. Create your first one.</div></div>
        ) : templates.map(tpl => (
          <div key={tpl.id} className="dash-card" style={{ marginBottom: '1rem' }}>
            <div className="dash-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {tpl.logo_url && <img src={tpl.logo_url} alt="logo" style={{ height: 28, maxWidth: 70, objectFit: 'contain' }} />}
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tpl.title}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--cream)', padding: '2px 8px', borderRadius: 50 }}>v{tpl.version}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{tpl.content.substring(0, 180)}…</p>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6 }}>Created: {new Date(tpl.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditing(tpl); setShowNew(false); setSelectedLogo(tpl.logo_url ?? '') }} style={btnSecondary}>Edit</button>
                  {deleteConfirm === tpl.id
                    ? <button onClick={() => handleDelete(tpl.id)} style={{ ...btnSecondary, color: '#E04A4A', borderWidth: '1px', borderStyle: 'solid', borderColor: '#E04A4A' }}>Confirm?</button>
                    : <button onClick={() => setDeleteConfirm(tpl.id)} style={btnSecondary}>Delete</button>
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Logos */}
      <div>
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Logo Library</span></div>
          <div className="dash-card-body">
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Logo Name</label>
              <input value={logoName} onChange={e => setLogoName(e.target.value)} placeholder="e.g. NurseCare Logo" style={{ ...inputStyle, marginBottom: 8 }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={logoUploading} style={{ ...btnTeal, width: '100%' }}>
                {logoUploading ? 'Uploading…' : '+ Upload Logo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
            {logos.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center' }}>No logos yet</p>
            ) : logos.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <img src={l.file_url} alt={l.name} style={{ height: 32, maxWidth: 60, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4, padding: 2, background: '#fff' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                </div>
                <button onClick={() => handleDeleteLogo(l.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder guide */}
        <div className="dash-card" style={{ marginTop: '1rem' }}>
          <div className="dash-card-header"><span className="dash-card-title">Placeholders</span></div>
          <div className="dash-card-body" style={{ padding: '0.8rem 1rem' }}>
            {placeholders.map(p => (
              <div key={p} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--teal)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: 'var(--input-bg)',
  color: 'var(--ink)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 5,
}
const btnTeal: React.CSSProperties = {
  background: '#0E7B8C', color: '#fff', border: 'none',
  padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const btnSecondary: React.CSSProperties = {
  background: 'var(--cream)', color: 'var(--ink)',
  borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
  padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}
const logoPill: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
  background: 'var(--card)', fontSize: '0.78rem',
  fontFamily: 'inherit', fontWeight: 500,
}
