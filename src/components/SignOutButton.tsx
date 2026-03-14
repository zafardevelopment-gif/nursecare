'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className="signout-btn">
      🚪 Sign Out
    </button>
  )
}
