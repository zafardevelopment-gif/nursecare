import { redirect } from 'next/navigation'

export default function DisputesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  redirect('/admin/issues?tab=disputes')
}
