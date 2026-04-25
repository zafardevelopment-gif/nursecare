import { redirect } from 'next/navigation'

export default function ActivityRedirect() {
  redirect('/admin/analytics?tab=activity')
}
