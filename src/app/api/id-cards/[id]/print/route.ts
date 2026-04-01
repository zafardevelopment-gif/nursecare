import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { renderIdCardHtml } from '@/lib/id-card-renderer'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Auth check using cookie-based client
    const authClient = await createSupabaseServerClient()
    const { data: { user: authUser } } = await authClient.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await authClient.from('users').select('id, role').eq('id', authUser.id).single()
    if (!profile || !['admin', 'provider'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role for data fetching
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase    = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: card, error: cardErr } = await supabase
      .from('nurse_id_cards')
      .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status')
      .eq('id', id)
      .single()

    if (cardErr || !card) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Provider can only view their own card
    if (profile.role === 'provider') {
      const { data: myNurse } = await supabase
        .from('nurses').select('id').eq('user_id', profile.id).single()
      if (!myNurse || myNurse.id !== card.nurse_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const [{ data: nurse }, { data: photoDocs }] = await Promise.all([
      supabase.from('nurses').select('full_name, specialization, city').eq('id', card.nurse_id).single(),
      supabase.from('nurse_documents').select('file_url').eq('nurse_id', card.nurse_id).eq('doc_type', 'photo').limit(1),
    ])

    const photoUrl  = photoDocs?.[0]?.file_url ?? null
    const isExpired = new Date(card.expiry_date) < new Date()
    const baseUrl   = req.nextUrl.origin
    const verifyUrl = `${baseUrl}/verify?id=${encodeURIComponent(card.unique_id_code)}`
    const isEmbed   = req.nextUrl.searchParams.get('embed') === '1'

    const html = renderIdCardHtml({
      uniqueIdCode:        card.unique_id_code,
      nurseName:           nurse?.full_name           ?? 'Nurse',
      nurseSpecialization: nurse?.specialization      ?? null,
      nurseCity:           nurse?.city                ?? null,
      photoUrl,
      issueDate:  new Date(card.issue_date).toLocaleDateString('en-GB',  { day: '2-digit', month: 'long', year: 'numeric' }),
      expiryDate: new Date(card.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      cardStatus: card.status as 'active' | 'revoked',
      isExpired,
      verifyUrl,
      logoUrl: null,
    })

    const finalHtml = isEmbed ? html : html.replace(
      '</body>',
      `<script>window.onload=function(){setTimeout(function(){window.print()},600)};</script></body>`
    )

    return new NextResponse(finalHtml, {
      headers: {
        'Content-Type':  'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[id-card/print]', err)
    return NextResponse.json({ error: 'Server error', message: err?.message ?? 'unknown' }, { status: 500 })
  }
}
