import { redirect } from 'next/navigation'

export default function HomepageRedirect() {
  redirect('/admin/analytics?tab=homepage')
}
