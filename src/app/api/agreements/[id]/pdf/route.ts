import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!['admin', 'provider', 'hospital'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: agreement } = await supabase
    .from('agreements')
    .select('id, title, rendered_html, nurse_id, hospital_id')
    .eq('id', id)
    .single()

  if (!agreement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Inject auto-print script so opening this URL triggers the browser print dialog
  const printHtml = agreement.rendered_html.replace(
    '</body>',
    `<script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 400);
      };
    </script>
    </body>`
  )

  return new NextResponse(printHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="agreement-${agreement.id.substring(0, 8).toUpperCase()}.html"`,
    },
  })
}
