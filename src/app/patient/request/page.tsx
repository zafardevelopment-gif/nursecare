import { requireRole } from '@/lib/auth'
import BookingForm from './BookingForm'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RequestBookingPage({ searchParams }: Props) {
  await requireRole('patient')
  const params = await searchParams

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Request a Nurse</h1>
          <p className="dash-sub">Book a one-time or recurring healthcare provider</p>
        </div>
      </div>

      <div className="dash-card" style={{ maxWidth: 700 }}>
        <div className="dash-card-header">
          <span className="dash-card-title">Booking Details</span>
        </div>
        <div className="dash-card-body">
          <BookingForm error={params.error} />
        </div>
      </div>
    </div>
  )
}
