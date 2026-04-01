import { createClient } from '@supabase/supabase-js'
import VerifyClient from './VerifyClient'

export const dynamic = 'force-dynamic'

// This is a PUBLIC page — no auth required
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  const idCode = params.id?.trim().toUpperCase() ?? ''

  let result: VerifyResult | null = null

  if (idCode) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Step 1: fetch card by unique_id_code
    const { data: card } = await supabase
      .from('nurse_id_cards')
      .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status')
      .eq('unique_id_code', idCode)
      .single()

    if (card) {
      const isExpired = new Date(card.expiry_date) < new Date()
      const effectiveStatus =
        card.status === 'revoked' ? 'revoked'
        : isExpired ? 'expired'
        : 'active'

      // Step 2: fetch nurse profile separately
      const { data: nurse } = await supabase
        .from('nurses')
        .select('full_name, specialization, city')
        .eq('id', card.nurse_id)
        .single()

      // Step 3: fetch nurse photo separately
      const { data: photoDocs } = await supabase
        .from('nurse_documents')
        .select('file_url')
        .eq('nurse_id', card.nurse_id)
        .eq('doc_type', 'photo')
        .limit(1)

      const photoUrl = photoDocs?.[0]?.file_url ?? null

      result = {
        found: true,
        effectiveStatus,
        nurseName:   nurse?.full_name ?? 'Unknown',
        nurseSpec:   nurse?.specialization ?? null,
        nurseCity:   nurse?.city ?? null,
        photoUrl,
        uniqueIdCode: card.unique_id_code,
        issueDate:    card.issue_date,
        expiryDate:   card.expiry_date,
      }
    } else {
      result = { found: false, effectiveStatus: 'invalid' }
    }
  }

  return <VerifyClient initialCode={idCode} result={result} />
}

export type VerifyResult =
  | { found: true; effectiveStatus: string; nurseName: string; nurseSpec: string | null; nurseCity: string | null; photoUrl: string | null; uniqueIdCode: string; issueDate: string; expiryDate: string }
  | { found: false; effectiveStatus: string }
