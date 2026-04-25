import { redirect } from 'next/navigation'

export default function IdCardsRedirect() {
  redirect('/admin/documents?tab=id-cards')
}
