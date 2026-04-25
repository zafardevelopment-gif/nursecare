import { redirect } from 'next/navigation'

export default function ComplaintsRedirect() {
  redirect('/admin/issues?tab=complaints')
}
