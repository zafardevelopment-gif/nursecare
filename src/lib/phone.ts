/**
 * Phone number utilities for NurseCare+
 *
 * Accepted input formats (Saudi-first, defaultCC = '966'):
 *   +966 5X XXX XXXX  → 966XXXXXXXXX
 *   00966 5XXXXXXXX   → 966XXXXXXXXX
 *   0555555555        → 966XXXXXXXXX   (leading 0 → strip, prepend CC)
 *   555555555         → 966XXXXXXXXX   (9 digits → prepend CC)
 *   966555555555      → 966XXXXXXXXX   (already E.164 digits)
 *
 * Storage format: E.164 digits without '+' (e.g. 966551234567)
 * This matches what whatsapp.ts sends to Meta Cloud API.
 */

const DEFAULT_CC = '966'

/** Strip everything except digits */
function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

/**
 * Normalise a phone number to E.164 digits (no '+').
 * Returns null when the number is clearly invalid.
 */
export function normalizePhone(raw: string, cc = DEFAULT_CC): string | null {
  if (!raw?.trim()) return null
  const d = digitsOnly(raw.trim())

  if (d.length === 0) return null

  // Already has country code
  if (d.startsWith('00' + cc)) return d.slice(2)               // 00966… → 966…
  if (d.startsWith(cc) && d.length >= cc.length + 7) return d  // 966…

  // Local number with leading 0
  if (d.startsWith('0') && d.length >= 9) return cc + d.slice(1)

  // Bare local digits (e.g. 555555555 — 9 digits for SA mobile)
  if (d.length >= 7 && d.length <= 11) return cc + d

  return null
}

/**
 * Validate a phone number for Saudi WhatsApp use.
 * Returns { ok, normalized, error }.
 * normalized is the storage-ready E.164 string (no '+').
 */
export function validatePhone(raw: string | null | undefined, label = 'Phone number'): {
  ok: boolean
  normalized: string | null
  error: string | null
} {
  if (!raw?.trim()) {
    return { ok: false, normalized: null, error: `${label} is required` }
  }

  const normalized = normalizePhone(raw)
  if (!normalized) {
    return {
      ok: false,
      normalized: null,
      error: `${label} is invalid. Use format: +966 5X XXX XXXX or 05X XXX XXXX`,
    }
  }

  // Saudi mobile numbers start with 966 5x and are 12 digits total
  // Allow international numbers too (≥ 10 digits after CC)
  if (normalized.length < 10 || normalized.length > 15) {
    return {
      ok: false,
      normalized: null,
      error: `${label} must be 10–15 digits including country code`,
    }
  }

  return { ok: true, normalized, error: null }
}

/**
 * Format a stored E.164 string for display.
 * 966551234567 → +966 55 123 4567
 */
export function formatPhoneDisplay(stored: string | null | undefined): string {
  if (!stored) return '—'
  const d = digitsOnly(stored)
  if (d.startsWith('966') && d.length === 12) {
    // +966 5X XXX XXXX
    return `+966 ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]} ${d[8]}${d[9]}${d[10]}${d[11]}`
  }
  return '+' + d
}
