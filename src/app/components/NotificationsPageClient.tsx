'use client'

import { useState, useCallback } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  data?: Record<string, unknown>
}

const TYPE_ICON: Record<string, string> = {
  booking_new:              '📋',
  booking_accepted:         '✅',
  booking_declined:         '✕',
  booking_cancelled:        '❌',
  booking_cancelled_unpaid: '❌',
  booking_in_progress:      '🔄',
  booking_completed:        '🏁',
  booking_change_requested: '📝',
  booking_change_resolved:  '✅',
  payment_received:         '💳',
  payment_reminder:         '⚠️',
  leave_request:            '🌴',
  complaint_raised:         '⚖️',
  profile_approved:         '✅',
  profile_rejected:         '❌',
  admin_message:            '📢',
  system:                   '🔔',
}

const TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  booking_new:              { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
  booking_accepted:         { bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
  booking_declined:         { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
  booking_cancelled:        { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
  booking_cancelled_unpaid: { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
  booking_in_progress:      { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C' },
  booking_completed:        { bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
  booking_change_requested: { bg: 'rgba(184,94,0,0.1)',    color: '#b85e00' },
  booking_change_resolved:  { bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
  payment_received:         { bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
  payment_reminder:         { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A' },
  leave_request:            { bg: 'rgba(123,47,190,0.1)',  color: '#7B2FBE' },
  complaint_raised:         { bg: 'rgba(192,57,43,0.08)',  color: '#C0392B' },
  profile_approved:         { bg: 'rgba(39,168,105,0.1)',  color: '#27A869' },
  profile_rejected:         { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A' },
  admin_message:            { bg: 'rgba(10,191,204,0.1)',  color: '#0ABFCC' },
  system:                   { bg: 'rgba(138,155,170,0.08)', color: '#8A9BAA' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FILTER_TABS = [
  { key: '',        label: 'All' },
  { key: 'unread',  label: 'Unread' },
  { key: 'booking', label: 'Bookings' },
  { key: 'payment', label: 'Payments' },
  { key: 'system',  label: 'System' },
]

interface Props {
  initialNotifications: Notification[]
  initialUnread: number
}

export default function NotificationsPageClient({ initialNotifications, initialUnread }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unread, setUnread] = useState(initialUnread)
  const [tab, setTab] = useState('')
  const [marking, setMarking] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const filtered = notifications.filter(n => {
    if (tab === 'unread')  return !n.is_read
    if (tab === 'booking') return n.type.startsWith('booking')
    if (tab === 'payment') return n.type.startsWith('payment')
    if (tab === 'system')  return n.type === 'system' || n.type === 'admin_message'
    return true
  })

  const markAll = useCallback(async () => {
    setMarking(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } finally {
      setMarking(false)
    }
  }, [])

  const markOne = useCallback(async (id: string) => {
    if (notifications.find(n => n.id === id)?.is_read) return
    setMarkingId(id)
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } finally {
      setMarkingId(null)
    }
  }, [notifications])

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Notifications</h1>
          <p className="dash-sub">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            disabled={marking}
            style={{
              background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
              color: '#fff', padding: '10px 20px',
              borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
              border: 'none', cursor: marking ? 'not-allowed' : 'pointer',
              opacity: marking ? 0.7 : 1,
            }}
          >
            {marking ? 'Marking…' : '✓ Mark all as read'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', border: tab === t.key ? 'none' : '1px solid var(--border)',
              background: tab === t.key ? 'var(--teal)' : 'var(--card)',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              transition: 'all 0.12s',
            }}
          >
            {t.label}
            {t.key === 'unread' && unread > 0 && (
              <span style={{ marginLeft: 5, background: '#E04A4A', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 50 }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="dash-card">
        {filtered.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No notifications</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {tab === 'unread' ? 'You\'ve read everything!' : 'Nothing here yet.'}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((n, i) => {
              const icon = TYPE_ICON[n.type] ?? '🔔'
              const col = TYPE_COLOR[n.type] ?? { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C' }
              const isLoading = markingId === n.id
              return (
                <div
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  style={{
                    display: 'flex', gap: 14, padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: n.is_read ? 'var(--card)' : 'rgba(14,123,140,0.025)',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: col.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', flexShrink: 0,
                  }}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: n.is_read ? 600 : 700, color: 'var(--ink)', lineHeight: 1.35 }}>
                        {n.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {!n.is_read && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0E7B8C', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                      {n.body}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: col.bg, color: col.color,
                        fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50,
                      }}>
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                        {new Date(n.created_at).toLocaleString('en-SA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
