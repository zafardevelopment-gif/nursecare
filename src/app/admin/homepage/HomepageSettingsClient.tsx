'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveSettings, upsertSection, deleteSection,
  upsertService, deleteService,
  upsertTestimonial, deleteTestimonial,
  upsertFaq, deleteFaq,
  setFeaturedProvider, removeFeaturedProvider,
} from './actions'

type Row = Record<string, any>

const TABS = [
  { key: 'general',   label: '⚙️ General' },
  { key: 'hero',      label: '🏠 Hero' },
  { key: 'features',  label: '🚀 Features' },
  { key: 'howitworks', label: '📋 How It Works' },
  { key: 'services',  label: '🩺 Services' },
  { key: 'testimonials', label: '💬 Testimonials' },
  { key: 'faqs',      label: '❓ FAQs' },
  { key: 'featured',  label: '⭐ Featured Nurses' },
  { key: 'footer',    label: '📋 Footer & SEO' },
]

interface Props {
  settings: Record<string, string>
  features: Row[]
  howItWorks: Row[]
  services: Row[]
  testimonials: Row[]
  faqs: Row[]
  featuredProviders: Row[]
  allNurses: Row[]
  featuredNurseIds: string[]
}

export default function HomepageSettingsClient({
  settings, features, howItWorks, services, testimonials, faqs, featuredProviders, allNurses, featuredNurseIds,
}: Props) {
  const [tab, setTab] = useState('general')
  const [saving, startSave] = useTransition()
  const [msg, setMsg] = useState('')
  const router = useRouter()

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function handleSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startSave(async () => {
      const fd = new FormData(e.currentTarget)
      await saveSettings(fd)
      showMsg('✅ Saved successfully!')
      router.refresh()
    })
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Homepage Settings</h1>
          <p className="dash-sub">Control every section of the public homepage from here</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" style={{
          background: 'rgba(14,123,140,0.1)', border: '1px solid rgba(14,123,140,0.3)',
          color: 'var(--teal)', padding: '8px 16px', borderRadius: 8,
          fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
        }}>
          👁 Preview Homepage →
        </a>
      </div>

      {msg && (
        <div style={{ background: 'rgba(39,168,105,0.1)', border: '1px solid rgba(39,168,105,0.3)', color: '#27A869', padding: '10px 16px', borderRadius: 8, marginBottom: '1rem', fontWeight: 600, fontSize: '0.88rem' }}>
          {msg}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            fontWeight: tab === t.key ? 800 : 600, fontSize: '0.82rem',
            background: tab === t.key ? 'var(--teal)' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <form onSubmit={handleSettings}>
          <div className="dash-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.2rem' }}>General Settings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Site Title" name="site_title" defaultValue={settings.site_title} />
              <Field label="Meta Description" name="meta_description" defaultValue={settings.meta_description} />
              <Field label="Meta Keywords" name="meta_keywords" defaultValue={settings.meta_keywords} />
              <Field label="OG Image URL" name="og_image" defaultValue={settings.og_image} placeholder="https://…" />
            </div>
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '1rem' }}>Stats Section</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <Field label="Stat 1 — Number"  name="hero_stat1_num"    defaultValue={settings.hero_stat1_num} />
                <Field label="Stat 1 — Label"   name="hero_stat1_label"  defaultValue={settings.hero_stat1_label} />
                <Field label="Stat 2 — Number"  name="hero_stat2_num"    defaultValue={settings.hero_stat2_num} />
                <Field label="Stat 2 — Label"   name="hero_stat2_label"  defaultValue={settings.hero_stat2_label} />
                <Field label="Stat 3 — Number"  name="hero_stat3_num"    defaultValue={settings.hero_stat3_num} />
                <Field label="Stat 3 — Label"   name="hero_stat3_label"  defaultValue={settings.hero_stat3_label} />
                <Field label="Cities Value"      name="stats_cities_value" defaultValue={settings.stats_cities_value} />
              </div>
            </div>
            <SaveBtn saving={saving} />
          </div>
        </form>
      )}

      {/* ── HERO ── */}
      {tab === 'hero' && (
        <form onSubmit={handleSettings}>
          <div className="dash-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.2rem' }}>Hero Section</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Badge Text"       name="hero_badge"         defaultValue={settings.hero_badge} />
              <Field label="Heading Line 1"   name="hero_heading_line1" defaultValue={settings.hero_heading_line1} />
              <Field label="Heading Line 2 (gradient)" name="hero_heading_line2" defaultValue={settings.hero_heading_line2} />
              <Field label="Heading Line 3"   name="hero_heading_line3" defaultValue={settings.hero_heading_line3} />
              <Field label="CTA Button 1 Text" name="hero_cta1_text"   defaultValue={settings.hero_cta1_text} />
              <Field label="CTA Button 1 Link" name="hero_cta1_link"   defaultValue={settings.hero_cta1_link} />
              <Field label="CTA Button 2 Text" name="hero_cta2_text"   defaultValue={settings.hero_cta2_text} />
              <Field label="CTA Button 2 Link" name="hero_cta2_link"   defaultValue={settings.hero_cta2_link} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field label="Sub-heading paragraph" name="hero_subheading" defaultValue={settings.hero_subheading} textarea />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>Hero Enabled</label>
              <select name="hero_enabled" defaultValue={settings.hero_enabled ?? 'true'} style={inputStyle}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <SaveBtn saving={saving} />
          </div>
        </form>
      )}

      {/* ── FEATURES ── */}
      {tab === 'features' && (
        <SectionEditor
          title="Why Choose Us — Feature Cards"
          sectionKey="features"
          items={features}
          onSave={showMsg}
        />
      )}

      {/* ── HOW IT WORKS ── */}
      {tab === 'howitworks' && (
        <SectionEditor
          title="How It Works — Steps"
          sectionKey="how_it_works"
          items={howItWorks}
          onSave={showMsg}
        />
      )}

      {/* ── SERVICES ── */}
      {tab === 'services' && (
        <ServicesEditor items={services} onSave={showMsg} />
      )}

      {/* ── TESTIMONIALS ── */}
      {tab === 'testimonials' && (
        <TestimonialsEditor items={testimonials} onSave={showMsg} />
      )}

      {/* ── FAQS ── */}
      {tab === 'faqs' && (
        <FaqsEditor items={faqs} onSave={showMsg} />
      )}

      {/* ── FEATURED NURSES ── */}
      {tab === 'featured' && (
        <FeaturedNursesEditor
          featuredProviders={featuredProviders}
          allNurses={allNurses}
          featuredNurseIds={featuredNurseIds}
          onSave={showMsg}
        />
      )}

      {/* ── FOOTER & SEO ── */}
      {tab === 'footer' && (
        <form onSubmit={handleSettings}>
          <div className="dash-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.2rem' }}>Footer & SEO Settings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Contact Email"    name="footer_email"     defaultValue={settings.footer_email} />
              <Field label="Contact Phone"    name="footer_phone"     defaultValue={settings.footer_phone} />
              <Field label="Twitter URL"      name="footer_twitter"   defaultValue={settings.footer_twitter} placeholder="https://twitter.com/…" />
              <Field label="Instagram URL"    name="footer_instagram" defaultValue={settings.footer_instagram} placeholder="https://instagram.com/…" />
              <Field label="LinkedIn URL"     name="footer_linkedin"  defaultValue={settings.footer_linkedin} placeholder="https://linkedin.com/…" />
              <Field label="Copyright Text"   name="footer_copyright" defaultValue={settings.footer_copyright} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field label="About / Brand Description" name="footer_about" defaultValue={settings.footer_about} textarea />
            </div>
            <SaveBtn saving={saving} />
          </div>
        </form>
      )}
    </div>
  )
}

/* ── Field helper ──────────────────────────────────────────────── */
function Field({ label, name, defaultValue, placeholder, textarea }: { label: string; name: string; defaultValue?: string; placeholder?: string; textarea?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue ?? ''} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
      ) : (
        <input name={name} defaultValue={defaultValue ?? ''} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  )
}

function SaveBtn({ saving }: { saving: boolean }) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <button type="submit" disabled={saving} style={{
        background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
        border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700,
        fontSize: '0.88rem', cursor: 'pointer', opacity: saving ? 0.7 : 1,
      }}>
        {saving ? '⏳ Saving…' : '💾 Save Changes'}
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px',
  fontSize: '0.85rem', color: 'var(--ink)', background: 'var(--input-bg)',
  outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
}

/* ── Generic Section Editor (features / how_it_works) ─────────── */
function SectionEditor({ title, sectionKey, items, onSave }: { title: string; sectionKey: string; items: Row[]; onSave: (m: string) => void }) {
  const [list, setList] = useState<Row[]>(items)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  const blank: Row = { section_key: sectionKey, icon: '⭐', title: '', description: '', sort_order: list.length + 1, enabled: true }

  async function handleSave(row: Row) {
    startSave(async () => {
      await upsertSection({ section_key: row.section_key, icon: row.icon, title: row.title, description: row.description, sort_order: Number(row.sort_order), enabled: Boolean(row.enabled), ...(row.id ? { id: row.id } : {}) })
      onSave('✅ Saved!')
      setEditing(null)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    startSave(async () => {
      await deleteSection(id)
      setList(l => l.filter(r => r.id !== id))
      onSave('🗑 Deleted')
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{title}</h2>
        <button onClick={() => setEditing(blank)} style={addBtnStyle}>+ Add Item</button>
      </div>

      {editing && (
        <RowForm row={editing} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
          fields={[
            { key: 'icon', label: 'Icon (emoji)', type: 'text' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'sort_order', label: 'Sort Order', type: 'number' },
            { key: 'enabled', label: 'Enabled', type: 'toggle' },
          ]}
        />
      )}

      <div className="dash-card">
        {list.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No items yet. Click + Add Item.</div>}
        {list.map((row, i) => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>{row.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{row.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{row.description?.slice(0, 80)}…</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: row.enabled ? 'rgba(39,168,105,0.1)' : 'rgba(138,155,170,0.1)', color: row.enabled ? '#27A869' : 'var(--muted)' }}>
                {row.enabled ? '● On' : '○ Off'}
              </span>
              <button onClick={() => setEditing(row)} style={editBtnStyle}>Edit</button>
              <button onClick={() => handleDelete(row.id)} style={delBtnStyle}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Services Editor ───────────────────────────────────────────── */
function ServicesEditor({ items, onSave }: { items: Row[]; onSave: (m: string) => void }) {
  const [list, setList] = useState<Row[]>(items)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()
  const blank: Row = { icon: '🩺', name: '', description: '', sort_order: list.length + 1, enabled: true }

  async function handleSave(row: Row) {
    startSave(async () => {
      await upsertService({ icon: row.icon, name: row.name, description: row.description, sort_order: Number(row.sort_order), enabled: Boolean(row.enabled), ...(row.id ? { id: row.id } : {}) })
      onSave('✅ Saved!')
      setEditing(null)
      router.refresh()
    })
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete?')) return
    startSave(async () => {
      await deleteService(id)
      setList(l => l.filter(r => r.id !== id))
      onSave('🗑 Deleted')
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Services / Specialties</h2>
        <button onClick={() => setEditing(blank)} style={addBtnStyle}>+ Add Service</button>
      </div>
      {editing && (
        <RowForm row={editing} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
          fields={[
            { key: 'icon', label: 'Icon (emoji)', type: 'text' },
            { key: 'name', label: 'Service Name', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'sort_order', label: 'Sort Order', type: 'number' },
            { key: 'enabled', label: 'Enabled', type: 'toggle' },
          ]}
        />
      )}
      <div className="dash-card">
        {list.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No services yet.</div>}
        {list.map((row, i) => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>{row.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{row.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{row.description}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(row)} style={editBtnStyle}>Edit</button>
              <button onClick={() => handleDelete(row.id)} style={delBtnStyle}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Testimonials Editor ───────────────────────────────────────── */
function TestimonialsEditor({ items, onSave }: { items: Row[]; onSave: (m: string) => void }) {
  const [list, setList] = useState<Row[]>(items)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()
  const blank: Row = { stars: 5, text: '', author_name: '', author_role: '', author_emoji: '👤', sort_order: list.length + 1, enabled: true }

  async function handleSave(row: Row) {
    startSave(async () => {
      await upsertTestimonial({ stars: parseInt(row.stars), text: row.text, author_name: row.author_name, author_role: row.author_role, author_emoji: row.author_emoji, sort_order: Number(row.sort_order), enabled: Boolean(row.enabled), ...(row.id ? { id: row.id } : {}) })
      onSave('✅ Saved!')
      setEditing(null)
      router.refresh()
    })
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete?')) return
    startSave(async () => {
      await deleteTestimonial(id)
      setList(l => l.filter(r => r.id !== id))
      onSave('🗑 Deleted')
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Testimonials</h2>
        <button onClick={() => setEditing(blank)} style={addBtnStyle}>+ Add Testimonial</button>
      </div>
      {editing && (
        <RowForm row={editing} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
          fields={[
            { key: 'author_name', label: 'Author Name', type: 'text' },
            { key: 'author_role', label: 'Role / City', type: 'text' },
            { key: 'author_emoji', label: 'Avatar Emoji', type: 'text' },
            { key: 'stars', label: 'Stars (1-5)', type: 'number' },
            { key: 'text', label: 'Testimonial Text', type: 'textarea' },
            { key: 'sort_order', label: 'Sort Order', type: 'number' },
            { key: 'enabled', label: 'Enabled', type: 'toggle' },
          ]}
        />
      )}
      <div className="dash-card">
        {list.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No testimonials yet.</div>}
        {list.map((row, i) => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>{row.author_emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{row.author_name} <span style={{ color: '#F59E0B' }}>{'★'.repeat(row.stars)}</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{row.text?.slice(0, 80)}…</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(row)} style={editBtnStyle}>Edit</button>
              <button onClick={() => handleDelete(row.id)} style={delBtnStyle}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── FAQs Editor ───────────────────────────────────────────────── */
function FaqsEditor({ items, onSave }: { items: Row[]; onSave: (m: string) => void }) {
  const [list, setList] = useState<Row[]>(items)
  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()
  const blank: Row = { question: '', answer: '', sort_order: list.length + 1, enabled: true }

  async function handleSave(row: Row) {
    startSave(async () => {
      await upsertFaq({ question: row.question, answer: row.answer, sort_order: Number(row.sort_order), enabled: Boolean(row.enabled), ...(row.id ? { id: row.id } : {}) })
      onSave('✅ Saved!')
      setEditing(null)
      router.refresh()
    })
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete?')) return
    startSave(async () => {
      await deleteFaq(id)
      setList(l => l.filter(r => r.id !== id))
      onSave('🗑 Deleted')
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>FAQs</h2>
        <button onClick={() => setEditing(blank)} style={addBtnStyle}>+ Add FAQ</button>
      </div>
      {editing && (
        <RowForm row={editing} saving={saving} onSave={handleSave} onCancel={() => setEditing(null)}
          fields={[
            { key: 'question', label: 'Question', type: 'text' },
            { key: 'answer', label: 'Answer', type: 'textarea' },
            { key: 'sort_order', label: 'Sort Order', type: 'number' },
            { key: 'enabled', label: 'Enabled', type: 'toggle' },
          ]}
        />
      )}
      <div className="dash-card">
        {list.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No FAQs yet.</div>}
        {list.map((row, i) => (
          <div key={row.id} style={{ padding: '12px 16px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', marginBottom: 4 }}>Q: {row.question}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>A: {row.answer?.slice(0, 100)}…</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <button onClick={() => setEditing(row)} style={editBtnStyle}>Edit</button>
                <button onClick={() => handleDelete(row.id)} style={delBtnStyle}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Featured Nurses ───────────────────────────────────────────── */
function FeaturedNursesEditor({ featuredProviders, allNurses, featuredNurseIds, onSave }: {
  featuredProviders: Row[]; allNurses: Row[]; featuredNurseIds: string[]; onSave: (m: string) => void
}) {
  const [featured, setFeatured] = useState<Set<string>>(new Set(featuredNurseIds))
  const [priorities, setPriorities] = useState<Record<string, number>>(
    Object.fromEntries(featuredProviders.map(f => [f.nurse_id, f.priority]))
  )
  const [saving, startSave] = useTransition()
  const router = useRouter()

  async function toggle(nurseId: string) {
    startSave(async () => {
      if (featured.has(nurseId)) {
        await removeFeaturedProvider(nurseId)
        setFeatured(s => { const n = new Set(s); n.delete(nurseId); return n })
        onSave('Removed from featured')
      } else {
        await setFeaturedProvider(nurseId, priorities[nurseId] ?? 0)
        setFeatured(s => new Set([...s, nurseId]))
        onSave('✅ Added to featured!')
      }
      router.refresh()
    })
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: '0 0 0.4rem' }}>Featured Providers on Homepage</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>Toggle which approved nurses appear in the &ldquo;Featured Providers&rdquo; section.</p>
      </div>
      <div className="dash-card">
        {allNurses.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>No approved nurses found.</div>}
        {allNurses.map((nurse, i) => (
          <div key={nurse.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < allNurses.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>👩‍⚕️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{nurse.full_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{nurse.specialization} · {nurse.city}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {featured.has(nurse.user_id) && (
                <input
                  type="number"
                  value={priorities[nurse.user_id] ?? 0}
                  onChange={e => setPriorities(p => ({ ...p, [nurse.user_id]: parseInt(e.target.value) }))}
                  placeholder="Priority"
                  style={{ width: 70, ...inputStyle, padding: '5px 8px', fontSize: '0.78rem' }}
                />
              )}
              <button
                onClick={() => toggle(nurse.user_id)}
                disabled={saving}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
                  background: featured.has(nurse.user_id) ? 'rgba(224,74,74,0.1)' : 'rgba(39,168,105,0.1)',
                  color: featured.has(nurse.user_id) ? '#E04A4A' : '#27A869',
                }}
              >
                {featured.has(nurse.user_id) ? '✕ Remove' : '⭐ Feature'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Generic Row Form ──────────────────────────────────────────── */
type FieldDef = { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'toggle' }

function RowForm({ row, fields, saving, onSave, onCancel }: {
  row: Row; fields: FieldDef[]; saving: boolean
  onSave: (row: Row) => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState<Row>({ ...row })

  return (
    <div className="dash-card" style={{ padding: '1.2rem', marginBottom: '1rem', border: '2px solid rgba(14,123,140,0.25)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        {fields.map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                value={draft[f.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              />
            ) : f.type === 'toggle' ? (
              <select
                value={String(draft[f.key] ?? true)}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value === 'true' }))}
                style={inputStyle}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            ) : (
              <input
                type={f.type}
                value={draft[f.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.key]: f.type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                style={inputStyle}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
        <button onClick={() => onSave(draft)} disabled={saving} style={{
          background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
          border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
        }}>
          {saving ? '⏳…' : '💾 Save'}
        </button>
        <button onClick={onCancel} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Button styles ─────────────────────────────────────────────── */
const addBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', border: 'none',
  padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
}
const editBtnStyle: React.CSSProperties = {
  background: 'rgba(14,123,140,0.1)', color: 'var(--teal)', border: '1px solid rgba(14,123,140,0.2)',
  padding: '5px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
}
const delBtnStyle: React.CSSProperties = {
  background: 'rgba(224,74,74,0.08)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.2)',
  padding: '5px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
}
