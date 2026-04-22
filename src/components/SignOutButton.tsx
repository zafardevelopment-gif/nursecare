'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setLoading(true)
    try {
      await fetch('/auth/signout', { method: 'POST' })
    } finally {
      // Always redirect to homepage regardless of fetch result
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button onClick={handleSignOut} disabled={loading} className="signout-btn">
      {loading ? '⏳ Signing out…' : '🚪 Sign Out'}
    </button>
  )
}
