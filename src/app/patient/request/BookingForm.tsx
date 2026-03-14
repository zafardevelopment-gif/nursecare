'use client'

import { useState } from 'react'
import { createBookingAction } from './actions'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function BookingForm({ error }: { error?: string }) {
  const [bookingType, setBookingType] = useState<'one_time' | 'weekly' | 'monthly'>('one_time')
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const minDate = tomorrow()

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  return (
    <form action={createBookingAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

      {error && (
        <div className="auth-error">
          <span>⚠️</span> {decodeURIComponent(error)}
        </div>
      )}

      {/* Booking Type */}
      <div className="form-group">
        <label className="form-label">Booking Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem' }}>
          {(['one_time', 'weekly', 'monthly'] as const).map(type => (
            <label key={type} style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="booking_type"
                value={type}
                checked={bookingType === type}
                onChange={() => setBookingType(type)}
                style={{ display: 'none' }}
              />
              <div style={{
                border: `1.5px solid ${bookingType === type ? 'var(--teal)' : 'var(--border)'}`,
                background: bookingType === type ? 'rgba(14,123,140,0.07)' : 'var(--cream)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 3 }}>
                  {type === 'one_time' ? '📅' : type === 'weekly' ? '🔁' : '📆'}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: bookingType === type ? 'var(--teal)' : 'var(--ink)' }}>
                  {type === 'one_time' ? 'One-Time' : type === 'weekly' ? 'Weekly' : 'Monthly'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>
                  {type === 'one_time' ? 'Single session' : type === 'weekly' ? 'Pick days/week' : 'Same day each month'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Service Type */}
      <div className="form-group">
        <label className="form-label">Service Type</label>
        <select name="service_type" required className="form-input">
          <option value="">Select service type</option>
          {['Home Nursing','ICU Care','Post-Surgery Care','Elderly Care','Pediatric Care','Wound Care','IV Therapy','Physiotherapy','General Care'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Patient Condition */}
      <div className="form-group">
        <label className="form-label">Patient Condition</label>
        <input
          type="text"
          name="patient_condition"
          required
          className="form-input"
          placeholder="e.g. Diabetes Type 2, post-surgery recovery"
        />
      </div>

      {/* Dates */}
      {bookingType === 'one_time' ? (
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" name="start_date" required min={minDate} className="form-input" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" name="start_date" required min={minDate} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input type="date" name="end_date" required min={minDate} className="form-input" />
          </div>
        </div>
      )}

      {/* Days of week — only for weekly */}
      {bookingType === 'weekly' && (
        <div className="form-group">
          <label className="form-label">Days of the Week</label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {DAYS.map((day, i) => (
              <label key={i} style={{ cursor: 'pointer' }}>
                {/* Hidden checkboxes submitted with the form */}
                <input
                  type="checkbox"
                  name="days_of_week"
                  value={i}
                  checked={selectedDays.includes(i)}
                  onChange={() => toggleDay(i)}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${selectedDays.includes(i) ? 'var(--teal)' : 'var(--border)'}`,
                  background: selectedDays.includes(i) ? 'var(--teal)' : 'var(--cream)',
                  color: selectedDays.includes(i) ? '#fff' : 'var(--ink)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.15s',
                }}>
                  {day}
                </div>
              </label>
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
            {selectedDays.length === 0
              ? 'Select at least one day'
              : `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`}
          </p>
        </div>
      )}

      {/* Shift + Duration */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Shift</label>
          <select name="shift" required className="form-input">
            <option value="">Select shift</option>
            <option value="Morning (8AM–4PM)">Morning (8AM–4PM)</option>
            <option value="Evening (4PM–12AM)">Evening (4PM–12AM)</option>
            <option value="Night (12AM–8AM)">Night (12AM–8AM)</option>
            <option value="Full Day (24hrs)">Full Day (24hrs)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Duration (Hours)</label>
          <select name="duration" className="form-input">
            <option value="4">4 Hours</option>
            <option value="8">8 Hours</option>
            <option value="12">12 Hours</option>
            <option value="24">24 Hours</option>
          </select>
        </div>
      </div>

      {/* City + Address */}
      <div className="form-group">
        <label className="form-label">City</label>
        <select name="city" required className="form-input">
          <option value="">Select city</option>
          {['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Full Address</label>
        <input
          type="text"
          name="address"
          required
          className="form-input"
          placeholder="Street, district, building number"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Additional Notes (Optional)</label>
        <textarea
          name="notes"
          className="form-input"
          rows={3}
          placeholder="Any special requirements or medical notes..."
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Summary preview */}
      <div style={{
        background: 'rgba(14,123,140,0.06)',
        border: '1px solid rgba(14,123,140,0.15)',
        borderRadius: 10,
        padding: '0.8rem 1rem',
        fontSize: '0.78rem',
        color: 'var(--muted)',
      }}>
        {bookingType === 'one_time' && '📅 Single session will be created'}
        {bookingType === 'weekly' && `🔁 Individual bookings will be created for every ${selectedDays.map(d => DAYS[d]).join(', ') || '(selected days)'} between the start and end dates`}
        {bookingType === 'monthly' && '📆 One booking per month on the same date will be created'}
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
        Submit Booking Request →
      </button>
    </form>
  )
}
