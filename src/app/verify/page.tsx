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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (idCode && supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: card } = await supabase
        .from('nurse_id_cards')
        .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status')
        .eq('unique_id_code', idCode)
        .single()

      if (card) {
        const isExpired = new Date(card.expiry_date) < new Date()
        const effectiveStatus =
          card.status === 'revoked' ? 'revoked'
          : isExpired              ? 'expired'
          :                          'active'

        const [{ data: nurse }, { data: photoDocs }] = await Promise.all([
          supabase.from('nurses').select('full_name, specialization, city').eq('id', card.nurse_id).single(),
          supabase.from('nurse_documents').select('file_url').eq('nurse_id', card.nurse_id).eq('doc_type', 'photo').limit(1),
        ])

        result = {
          found:        true,
          effectiveStatus,
          nurseName:    nurse?.full_name   ?? 'Unknown',
          nurseSpec:    nurse?.specialization ?? null,
          nurseCity:    nurse?.city        ?? null,
          photoUrl:     photoDocs?.[0]?.file_url ?? null,
          uniqueIdCode: card.unique_id_code,
          issueDate:    card.issue_date,
          expiryDate:   card.expiry_date,
        }
      } else {
        result = { found: false, effectiveStatus: 'invalid' }
      }
    } catch {
      result = { found: false, effectiveStatus: 'invalid' }
    }
  } else if (idCode) {
    // env vars missing — treat as not found rather than crash
    result = { found: false, effectiveStatus: 'invalid' }
  }

  return <VerifyClient initialCode={idCode} result={result} />
}

export type VerifyResult =
  | { found: true;  effectiveStatus: string; nurseName: string; nurseSpec: string | null; nurseCity: string | null; photoUrl: string | null; uniqueIdCode: string; issueDate: string; expiryDate: string }
  | { found: false; effectiveStatus: string }
