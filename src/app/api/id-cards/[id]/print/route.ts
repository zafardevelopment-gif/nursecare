import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { renderIdCardHtml } from '@/lib/id-card-renderer'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || !['admin', 'provider'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Step 1: fetch the card row alone
  const { data: card, error: cardErr } = await supabase
    .from('nurse_id_cards')
    .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status')
    .eq('id', id)
    .single()

  if (cardErr || !card) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Step 2: if provider, verify ownership
  if (user.role === 'provider') {
    const { data: myNurse } = await supabase
      .from('nurses').select('id').eq('user_id', user.id).single()
    if (!myNurse || myNurse.id !== card.nurse_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Step 3: fetch nurse profile
  const { data: nurse } = await supabase
    .from('nurses')
    .select('full_name, specialization, city')
    .eq('id', card.nurse_id)
    .single()

  // Step 4: fetch nurse photo document
  const { data: photoDocs } = await supabase
    .from('nurse_documents')
    .select('file_url')
    .eq('nurse_id', card.nurse_id)
    .eq('doc_type', 'photo')
    .limit(1)

  const photoUrl = photoDocs?.[0]?.file_url ?? null
  const isExpired = new Date(card.expiry_date) < new Date()
  const baseUrl = req.nextUrl.origin
  const verifyUrl = `${baseUrl}/verify?id=${encodeURIComponent(card.unique_id_code)}`
  const isEmbed = req.nextUrl.searchParams.get('embed') === '1'

  const html = renderIdCardHtml({
    uniqueIdCode:        card.unique_id_code,
    nurseName:           nurse?.full_name ?? 'Nurse',
    nurseSpecialization: nurse?.specialization ?? null,
    nurseCity:           nurse?.city ?? null,
    photoUrl,
    issueDate:           new Date(card.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    expiryDate:          new Date(card.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    cardStatus:          card.status as 'active' | 'revoked',
    isExpired,
    verifyUrl,
    logoUrl:             null,
  })

  const finalHtml = isEmbed ? html : html.replace(
    '</body>',
    `<script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 600);
      };
    </script>
    </body>`
  )

  return new NextResponse(finalHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
