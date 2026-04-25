'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

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

const TYPE_COLOR: Record<string, string> = {
  booking_new:              '#0E7B8C',
  booking_accepted:         '#27A869',
  booking_declined:         '#E04A4A',
  booking_cancelled:        '#E04A4A',
  booking_cancelled_unpaid: '#E04A4A',
  booking_in_progress:      '#0E7B8C',
  booking_completed:        '#27A869',
  booking_change_requested: '#b85e00',
  booking_change_resolved:  '#27A869',
  payment_received:         '#27A869',
  payment_reminder:         '#F5842A',
  leave_request:            '#7B2FBE',
  complaint_raised:         '#C0392B',
  profile_approved:         '#27A869',
  profile_rejected:         '#E04A4A',
  admin_message:            '#0ABFCC',
  system:                   '#8A9BAA',
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
  return new Date(iso).toLocaleDateString('en-SA', { day: '2-digit', month: 'short' })
}

interface Props {
  role: string
}

export default function NotificationBell({ role }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnread(data.unreadCount ?? 0)
    } catch {
      // silently fail — non-critical
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll every 30 seconds
  useEffect(() => {
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // Fetch when panel opens
  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
    }
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnread(0)
    } finally {
      setMarkingAll(false)
    }
  }

  async function markOneRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const notifHref = `/${role}/notifications`

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          width: 36, height: 36,
          borderRadius: 9,
          border: open ? '1px solid rgba(10,191,204,0.4)' : '1px solid rgba(255,255,255,0.12)',
          background: open ? 'rgba(10,191,204,0.15)' : 'rgba(255,255,255,0.06)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            background: '#E04A4A',
            color: '#fff',
            fontSize: '0.55rem',
            fontWeight: 800,
            minWidth: 16, height: 16,
            borderRadius: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: '2px solid #05111A',
            lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="notif-panel"
        >
          {/* Panel header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E5EDF0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#F8FAFC',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0B1E2D' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: '#E04A4A', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 50 }}>
                  {unread}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  style={{
                    fontSize: '0.72rem', fontWeight: 600, color: '#0E7B8C',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                    borderRadius: 5, opacity: markingAll ? 0.6 : 1,
                  }}
                >
                  {markingAll ? 'Marking…' : 'Mark all read'}
                </button>
              )}
              <Link
                href={notifHref}
                onClick={() => setOpen(false)}
                style={{ fontSize: '0.72rem', color: '#0E7B8C', fontWeight: 600, textDecoration: 'none' }}
              >
                View all →
              </Link>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#8A9BAA', fontSize: '0.85rem' }}>
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: '0.85rem', color: '#8A9BAA', fontWeight: 500 }}>No notifications yet</div>
              </div>
            ) : (
              notifications.slice(0, 20).map((n, i) => {
                const icon = TYPE_ICON[n.type] ?? '🔔'
                const color = TYPE_COLOR[n.type] ?? '#0E7B8C'
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.is_read) markOneRead(n.id) }}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 16px',
                      borderBottom: i < notifications.length - 1 ? '1px solid #F0F4F7' : 'none',
                      background: n.is_read ? '#fff' : 'rgba(14,123,140,0.03)',
                      cursor: n.is_read ? 'default' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', flexShrink: 0, marginTop: 2,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: n.is_read ? 600 : 700, color: '#0B1E2D', lineHeight: 1.3 }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0E7B8C', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#5A7184', marginTop: 3, lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#A0B3BF', marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E5EDF0', background: '#F8FAFC', flexShrink: 0, textAlign: 'center' }}>
              <Link
                href={notifHref}
                onClick={() => setOpen(false)}
                style={{ fontSize: '0.78rem', color: '#0E7B8C', fontWeight: 700, textDecoration: 'none' }}
              >
                See all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
