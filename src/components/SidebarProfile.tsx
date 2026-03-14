import UserAvatar from './UserAvatar'
import Link from 'next/link'

interface NurseData {
  specialties?: string | null
  status?: string
}

interface SidebarProfileProps {
  name: string
  email: string
  role: 'admin' | 'provider' | 'patient'
  avatarUrl?: string | null
  nurseData?: NurseData | null
}

const roleLabel: Record<string, string> = {
  admin:    'Administrator',
  provider: 'Healthcare Provider',
  patient:  'Patient',
}

const roleColor: Record<string, string> = {
  admin:    '#C9A84C',
  provider: '#0ABFCC',
  patient:  '#27A869',
}

export default function SidebarProfile({
  name, email, role, avatarUrl, nurseData,
}: SidebarProfileProps) {
  return (
    <div style={{
      padding: '1rem',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: '1rem',
      }}>
        {/* Avatar + Name Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.7rem' }}>
          <UserAvatar name={name} avatarUrl={avatarUrl} size={44} online={true} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700,
              fontSize: '0.88rem',
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </div>
            <div style={{ fontSize: '0.7rem', color: roleColor[role], fontWeight: 600, marginTop: 1 }}>
              {roleLabel[role]}
            </div>
          </div>
        </div>

        {/* Role-specific details */}
        {role === 'provider' && nurseData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            marginBottom: '0.5rem',
          }}>
            {nurseData.specialties && (
              <div style={{
                gridColumn: '1 / -1',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.5)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {nurseData.specialties}
              </div>
            )}
            <StatusChip status={nurseData.status} />
          </div>
        )}

        {role === 'admin' && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {email}
          </div>
        )}

        {role === 'patient' && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {email}
          </div>
        )}

        {/* Dropdown links */}
        <div style={{
          marginTop: '0.8rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
        }}>
          <ProfileLink href={`/${role === 'provider' ? 'provider/onboarding' : role + '/dashboard'}`} label="Profile" />
          <SignOutInline />
        </div>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status?: string }) {
  if (!status) return null
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: 'rgba(245,132,42,0.15)', color: '#F5842A', label: '⏳ Pending' },
    approved: { bg: 'rgba(39,168,105,0.15)', color: '#27A869', label: '✓ Approved' },
    rejected: { bg: 'rgba(224,74,74,0.15)',  color: '#E04A4A', label: '✕ Rejected' },
  }
  const s = map[status]
  if (!s) return null
  return (
    <div style={{
      fontSize: '0.65rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 50,
      background: s.bg,
      color: s.color,
      display: 'inline-block',
    }}>
      {s.label}
    </div>
  )
}

function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{
      fontSize: '0.72rem',
      color: 'rgba(255,255,255,0.5)',
      textDecoration: 'none',
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.05)',
      transition: 'all 0.2s',
    }}>
      {label}
    </Link>
  )
}

// Inline sign-out using a form (server-compatible)
function SignOutInline() {
  return (
    <form action="/auth/signout" method="POST">
      <button type="submit" style={{
        fontSize: '0.72rem',
        color: 'rgba(224,74,74,0.8)',
        background: 'rgba(224,74,74,0.08)',
        border: 'none',
        padding: '3px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        Logout
      </button>
    </form>
  )
}
