import { redirect } from 'next/navigation'

export default function AgreementsRedirect() {
  redirect('/admin/documents?tab=agreements')
}
