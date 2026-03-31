import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  await requireRole('admin')

  // Use service role to bypass RLS and fetch all users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, phone, city, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Users</h1>
          <p className="dash-sub">All registered users on the platform</p>
        </div>
        <div style={{
          background: 'var(--cream)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: '0.88rem',
          color: 'var(--ink)',
        }}>
          {users?.length ?? 0} total
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE8E8', color: '#C0392B', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
          Error loading users: {error.message}
        </div>
      )}

      <UsersClient users={users ?? []} />
    </div>
  )
}
