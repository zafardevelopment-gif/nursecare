import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import HospitalBookingEditForm from './HospitalBookingEditForm'

export const dynamic = 'force-dynamic'

export default async function HospitalBookingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, city')
    .eq('user_id', user.id)
    .single()

  if (!hospital) notFound()

  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('*')
    .eq('id', id)
    .eq('hospital_id', hospital.id)
    .single()

  if (!booking) notFound()

  // Only pending or reviewing can be edited
  if (booking.status !== 'pending' && booking.status !== 'reviewing') {
    redirect(`/hospital/booking/${id}`)
  }

  const { data: departments } = await supabase
    .from('hospital_departments')
    .select('id, name, icon, color, nurses_needed, nurses_active')
    .eq('hospital_id', hospital.id)
    .eq('status', 'active')

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('min_advance_hours, max_advance_days')
    .limit(1)
    .single()

  return (
    <div className="dash-shell">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/hospital/booking/${id}`} style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Booking
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)', margin: '10px 0 4px' }}>Edit Booking Request</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
          Updating requirements will reset nurse selections and resubmit for admin review.
        </p>
      </div>

      <div style={{ background: 'rgba(181,94,0,0.05)', border: '1px solid rgba(181,94,0,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#b85e00', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '1rem' }}>⚠️</span>
        <span><strong>Note:</strong> Saving changes will clear previously selected nurses and reset status to Pending Review.</span>
      </div>

      <HospitalBookingEditForm
        booking={booking}
        hospital={{ id: hospital.id, name: hospital.hospital_name, city: hospital.city ?? 'Riyadh' }}
        departments={departments ?? []}
        requestedBy={user.full_name}
        minAdvanceHours={settings?.min_advance_hours ?? 2}
        maxAdvanceDays={settings?.max_advance_days ?? 30}
      />
    </div>
  )
}
