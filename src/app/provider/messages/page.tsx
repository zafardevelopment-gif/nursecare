import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import ChatDisabled from '@/components/ChatDisabled'

export default async function ProviderMessagesPage() {
  await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('chat_enabled')
    .limit(1)
    .single()

  const chatEnabled = settings?.chat_enabled ?? true

  if (!chatEnabled) {
    return (
      <div className="dash-shell">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Messages</h1>
            <p className="dash-sub">Chat with patients and hospitals</p>
          </div>
        </div>
        <div className="dash-card">
          <ChatDisabled />
        </div>
      </div>
    )
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Messages</h1>
          <p className="dash-sub">Chat with patients and hospitals</p>
        </div>
      </div>
      <div className="dash-card">
        <div className="dash-card-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>No messages yet</p>
          <p style={{ fontSize: '0.83rem' }}>Messages from patients and hospitals will appear here.</p>
        </div>
      </div>
    </div>
  )
}
