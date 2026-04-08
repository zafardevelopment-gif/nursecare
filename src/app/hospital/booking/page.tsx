import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import HospitalBookingClient from './HospitalBookingClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FFF8F0', color: '#b85e00', label: '⏳ Pending' },
  reviewing: { bg: '#EFF6FF', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Cancelled' },
}

export default async function HospitalBookingPage() {
  const user     = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, city, status')
    .eq('user_id', user.id)
    .single()

  // Block if not active
  if (!hospital || hospital.status !== 'active') {
    return (
      <div className="dash-shell">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Bulk Nurse Booking</h1>
            <p className="dash-sub">Request multiple nurses for your departments</p>
          </div>
        </div>
        <div style={{ background: 'rgba(245,132,42,0.05)', border: '1px solid rgba(245,132,42,0.2)', borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#b85e00', marginBottom: 6 }}>Agreement Required</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            You need an active service agreement with NurseCare+ before you can book nurses.<br />
            Please complete registration and sign the service agreement first.
          </div>
        </div>
      </div>
    )
  }

  const [{ data: departments }, { data: nursesRaw }, { data: pastBookings }] = await Promise.all([
    supabase
      .from('hospital_departments')
      .select('id, name, icon, color, nurses_needed, nurses_active')
      .eq('hospital_id', hospital.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),

    supabase
      .from('nurses')
      .select(`
        user_id, full_name, specialization, city,
        hourly_rate, daily_rate, gender, nationality,
        experience_years, bio, languages, is_available, status,
        nurse_documents ( doc_type, file_url )
      `)
      .limit(100),

    supabase
      .from('hospital_booking_requests')
      .select('id, status, start_date, end_date, total_nurses, shifts, created_at, nurse_selections')
      .eq('hospital_id', hospital.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const nurses = (nursesRaw ?? []).map((n: any) => ({
    id:              n.user_id,
    name:            n.full_name ?? 'Unknown',
    specialization:  n.specialization  ?? 'General Nursing',
    city:            n.city            ?? 'Riyadh',
    hourlyRate:      Number(n.hourly_rate)    || 0,
    dailyRate:       Number(n.daily_rate)     || 0,
    gender:          (n.gender as string)?.toLowerCase() ?? 'female',
    nationality:     n.nationality     ?? '',
    experienceYears: n.experience_years ?? 0,
    bio:             n.bio             ?? '',
    languages:       Array.isArray(n.languages) ? n.languages : [],
    photoUrl:        (n.nurse_documents as any[])?.find((d: any) => d.doc_type === 'photo')?.file_url ?? null,
    isAvailable:     n.is_available ?? false,
  }))

  const bookings = pastBookings ?? []

  return (
    <div className="dash-shell" style={{ padding: 0 }}>
      {/* Past Bookings List — shown above the form if there are any */}
      {bookings.length > 0 && (
        <div style={{ padding: '1.5rem 1.5rem 0' }}>
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">My Booking Requests</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{bookings.length} request{bookings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="dash-card-body" style={{ padding: 0 }}>
              {bookings.map((b, i) => {
                const sm = STATUS_META[b.status] ?? STATUS_META.pending
                const nurseCount = (b.nurse_selections as any[])?.length ?? 0
                return (
                  <Link key={b.id} href={`/hospital/booking/${b.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 16px',
                      borderBottom: i < bookings.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
                          {new Date(b.start_date).toLocaleDateString('en-GB')} – {new Date(b.end_date).toLocaleDateString('en-GB')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                          {b.total_nurses} nurses · {nurseCount} selected · {(b.shifts as string[])?.join(', ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {new Date(b.created_at).toLocaleDateString('en-GB')}
                        </span>
                        <span style={{ background: sm.bg, color: sm.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                          {sm.label}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>›</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <HospitalBookingClient
        hospital={{ id: hospital.id, name: hospital.hospital_name, city: hospital.city ?? 'Riyadh' }}
        departments={departments ?? []}
        requestedBy={user.full_name}
        nurses={nurses}
      />
    </div>
  )
}
