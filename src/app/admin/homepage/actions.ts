'use server'

import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

const supabase = () => createSupabaseServiceRoleClient()

// ── Settings (key/value store) ─────────────────────────────────
export async function saveSettings(formData: FormData) {
  const admin = await requireRole('admin')
  const db = supabase()
  const entries = Array.from(formData.entries()) as [string, string][]
  for (const [key, value] of entries) {
    await db.from('homepage_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }
  void logActivity({
    actorId: admin.id, actorName: admin.full_name ?? 'Admin', actorRole: 'admin',
    action: 'homepage_settings_changed', module: 'homepage',
    entityType: 'homepage',
    description: `Admin updated homepage settings (${entries.length} field${entries.length !== 1 ? 's' : ''})`,
    meta: { keys: entries.map(([k]) => k) },
  })
  revalidatePath('/')
  revalidatePath('/admin/homepage')
  return { ok: true }
}

// ── Sections (features / how_it_works) ────────────────────────
export async function upsertSection(data: {
  id?: string; section_key: string; icon: string; title: string; description: string; sort_order: number; enabled: boolean
}) {
  await requireRole('admin')
  const db = supabase()
  if (data.id) {
    await db.from('homepage_sections').update({ icon: data.icon, title: data.title, description: data.description, sort_order: data.sort_order, enabled: data.enabled }).eq('id', data.id)
  } else {
    await db.from('homepage_sections').insert({ section_key: data.section_key, icon: data.icon, title: data.title, description: data.description, sort_order: data.sort_order, enabled: data.enabled })
  }
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

export async function deleteSection(id: string) {
  await requireRole('admin')
  await supabase().from('homepage_sections').delete().eq('id', id)
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

// ── Services ───────────────────────────────────────────────────
export async function upsertService(data: {
  id?: string; icon: string; name: string; description: string; sort_order: number; enabled: boolean
}) {
  await requireRole('admin')
  const db = supabase()
  if (data.id) {
    await db.from('homepage_services').update({ icon: data.icon, name: data.name, description: data.description, sort_order: data.sort_order, enabled: data.enabled }).eq('id', data.id)
  } else {
    await db.from('homepage_services').insert({ icon: data.icon, name: data.name, description: data.description, sort_order: data.sort_order, enabled: data.enabled })
  }
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

export async function deleteService(id: string) {
  await requireRole('admin')
  await supabase().from('homepage_services').delete().eq('id', id)
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

// ── Testimonials ───────────────────────────────────────────────
export async function upsertTestimonial(data: {
  id?: string; stars: number; text: string; author_name: string; author_role: string; author_emoji: string; sort_order: number; enabled: boolean
}) {
  await requireRole('admin')
  const db = supabase()
  if (data.id) {
    await db.from('homepage_testimonials').update({ stars: data.stars, text: data.text, author_name: data.author_name, author_role: data.author_role, author_emoji: data.author_emoji, sort_order: data.sort_order, enabled: data.enabled }).eq('id', data.id)
  } else {
    await db.from('homepage_testimonials').insert({ stars: data.stars, text: data.text, author_name: data.author_name, author_role: data.author_role, author_emoji: data.author_emoji, sort_order: data.sort_order, enabled: data.enabled })
  }
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

export async function deleteTestimonial(id: string) {
  await requireRole('admin')
  await supabase().from('homepage_testimonials').delete().eq('id', id)
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

// ── FAQs ───────────────────────────────────────────────────────
export async function upsertFaq(data: {
  id?: string; question: string; answer: string; sort_order: number; enabled: boolean
}) {
  await requireRole('admin')
  const db = supabase()
  if (data.id) {
    await db.from('homepage_faqs').update({ question: data.question, answer: data.answer, sort_order: data.sort_order, enabled: data.enabled }).eq('id', data.id)
  } else {
    await db.from('homepage_faqs').insert({ question: data.question, answer: data.answer, sort_order: data.sort_order, enabled: data.enabled })
  }
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

export async function deleteFaq(id: string) {
  await requireRole('admin')
  await supabase().from('homepage_faqs').delete().eq('id', id)
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

// ── Featured Providers ─────────────────────────────────────────
export async function setFeaturedProvider(nurseId: string, priority: number) {
  await requireRole('admin')
  await supabase().from('homepage_featured_providers').upsert({ nurse_id: nurseId, priority, enabled: true }, { onConflict: 'nurse_id' })
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}

export async function removeFeaturedProvider(nurseId: string) {
  await requireRole('admin')
  await supabase().from('homepage_featured_providers').delete().eq('nurse_id', nurseId)
  revalidatePath('/'); revalidatePath('/admin/homepage')
  return { ok: true }
}
