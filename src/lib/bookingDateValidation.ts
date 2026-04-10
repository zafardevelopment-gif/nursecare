/**
 * Shared booking date/time validation for patient and hospital booking flows.
 * Enforces admin-configured min advance hours and max advance days.
 */

export interface BookingDateError {
  type: 'too_soon' | 'too_far'
  message: string
}

/**
 * Validates a booking start date (and optional start time) against platform settings.
 *
 * @param startDate  - ISO date string "YYYY-MM-DD"
 * @param startTime  - Optional "HH:MM" time string (defaults to "00:00" if omitted)
 * @param minAdvanceHours - Minimum hours before start that booking must be created
 * @param maxAdvanceDays  - Maximum days in advance a booking can be placed
 * @returns BookingDateError if invalid, null if valid
 */
export function validateBookingDate(
  startDate: string,
  startTime: string | undefined,
  minAdvanceHours: number,
  maxAdvanceDays: number,
): BookingDateError | null {
  const now = new Date()

  // Build the full start datetime
  const timeStr = startTime ?? '00:00'
  const startDt = new Date(`${startDate}T${timeStr}:00`)

  if (isNaN(startDt.getTime())) return null // invalid date — let other validators handle

  // ── Min advance check ─────────────────────────────────────────────
  const minMs = minAdvanceHours * 60 * 60 * 1000
  const diffMs = startDt.getTime() - now.getTime()

  if (diffMs < minMs) {
    const h = minAdvanceHours
    if (h < 1) {
      return {
        type: 'too_soon',
        message: `Booking must be placed at least ${Math.round(h * 60)} minutes before the start time.`,
      }
    }
    return {
      type: 'too_soon',
      message: `Booking must be placed at least ${h} hour${h !== 1 ? 's' : ''} before the start time. Please choose a later date or time.`,
    }
  }

  // ── Max advance check ─────────────────────────────────────────────
  const maxMs = maxAdvanceDays * 24 * 60 * 60 * 1000
  if (diffMs > maxMs) {
    return {
      type: 'too_far',
      message: `Bookings can only be placed up to ${maxAdvanceDays} day${maxAdvanceDays !== 1 ? 's' : ''} in advance. Please choose a date within the next ${maxAdvanceDays} days.`,
    }
  }

  return null
}

/**
 * Returns the min and max date strings for <input type="date"> attributes.
 * min = today + minAdvanceHours rounded up to next day if needed
 * max = today + maxAdvanceDays
 */
export function getBookingDateBounds(
  minAdvanceHours: number,
  maxAdvanceDays: number,
): { minDate: string; maxDate: string } {
  const now = new Date()

  // min: the earliest date where start-of-day is still >= minAdvanceHours away
  const minDt = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)
  const minDate = minDt.toISOString().split('T')[0]

  // max: today + maxAdvanceDays
  const maxDt = new Date(now)
  maxDt.setDate(maxDt.getDate() + maxAdvanceDays)
  const maxDate = maxDt.toISOString().split('T')[0]

  return { minDate, maxDate }
}
