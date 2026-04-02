'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { renderAgreementHtml } from '@/lib/agreement-renderer'
import { revalidatePath } from 'next/cache'

// ── Template CRUD ────────────────────────────────────────────

export async function createTemplate(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const title    = (formData.get('title') as string)?.trim()
  const content  = (formData.get('content') as string)?.trim()
  const logo_url = (formData.get('logo_url') as string)?.trim() || null

  if (!title || !content) return { error: 'Title and content are required' }

  const { error } = await supabase.from('agreement_templates').insert({
    title, content, logo_url, created_by: admin.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/agreements/templates')
  return { success: true }
}

export async function updateTemplate(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const id       = formData.get('id') as string
  const title    = (formData.get('title') as string)?.trim()
  const content  = (formData.get('content') as string)?.trim()
  const logo_url = (formData.get('logo_url') as string)?.trim() || null

  if (!id || !title || !content) return { error: 'All fields required' }

  // Increment version to preserve old agreements
  const { data: existing } = await supabase
    .from('agreement_templates').select('version').eq('id', id).single()

  const { error } = await supabase.from('agreement_templates').update({
    title, content, logo_url,
    version: (existing?.version ?? 1) + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/agreements/templates')
  return { success: true }
}

export async function deleteTemplate(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const id = formData.get('id') as string
  await supabase.from('agreement_templates').update({ is_active: false }).eq('id', id)
  revalidatePath('/admin/agreements/templates')
}

// ── Logo Upload ─────────────────────────────────────────────

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const admin = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const file = formData.get('logo') as File
  const name = (formData.get('name') as string)?.trim() || 'Logo'

  if (!file || file.size === 0) return { error: 'No file selected' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Max 2 MB' }
  if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))
    return { error: 'PNG, JPG, WebP or SVG only' }

  const ext  = file.name.split('.').pop()
  const path = `logos/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('agreement-logos').upload(path, file, { upsert: false, contentType: file.type })
  if (upErr) return { error: upErr.message }

  const { data } = supabase.storage.from('agreement-logos').getPublicUrl(path)

  await supabase.from('agreement_logos').insert({
    name, file_url: data.publicUrl, uploaded_by: admin.id,
  })

  revalidatePath('/admin/agreements/templates')
  return { url: data.publicUrl }
}

export async function deleteLogo(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const id = formData.get('id') as string
  await supabase.from('agreement_logos').delete().eq('id', id)
  revalidatePath('/admin/agreements/templates')
}

// ── Generate Agreement ───────────────────────────────────────

export async function generateAgreement(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const template_id = formData.get('template_id') as string
  const nurse_id    = (formData.get('nurse_id') as string)?.trim() || null
  const hospital_id = (formData.get('hospital_id') as string)?.trim() || null

  if (!template_id) return { error: 'Template is required' }

  // Fetch template
  const { data: tpl } = await supabase
    .from('agreement_templates').select('*').eq('id', template_id).single()
  if (!tpl) return { error: 'Template not found' }

  // Fetch nurse (optional)
  let nurse: any = null
  if (nurse_id) {
    const { data } = await supabase
      .from('nurses').select('*, users(email, full_name, phone, city)')
      .eq('id', nurse_id).single()
    nurse = data
  }

  // Fetch hospital (optional)
  let hospital: any = null
  if (hospital_id) {
    const adminClient = createSupabaseServiceRoleClient()
    const { data } = await adminClient
      .from('users').select('*').eq('id', hospital_id).single()
    hospital = data
  }

  const nurseUser = (nurse as any)?.users as any
  const now = new Date().toISOString()
  const agreementDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  // Fetch admin's own profile for display
  const serviceClient = createSupabaseServiceRoleClient()
  const { data: adminProfile } = await serviceClient
    .from('users').select('full_name, email').eq('id', admin.id).single()

  const sharedData = {
    templateContent:     tpl.content,
    title:               tpl.title,
    logoUrl:             tpl.logo_url,
    nurseName:           nurse?.full_name ?? nurseUser?.full_name ?? null,
    nurseEmail:          nurse?.email ?? nurseUser?.email ?? null,
    nursePhone:          nurse?.phone ?? nurseUser?.phone ?? null,
    nurseCity:           nurse?.city ?? nurseUser?.city ?? null,
    nurseSpecialization: nurse?.specialization ?? null,
    adminName:           adminProfile?.full_name ?? adminProfile?.email ?? 'NurseCare+ Admin',
    adminEmail:          adminProfile?.email ?? null,
    hospitalName:        hospital?.full_name ?? hospital?.email ?? null,
    hospitalEmail:       hospital?.email ?? null,
    agreementDate,
    // Admin auto-approved at generation time
    adminApprovedAt:     now,
  }

  // Pre-render with PENDING id
  const rendered_html = renderAgreementHtml({ ...sharedData, agreementId: 'PENDING', status: 'admin_approved' })

  const { data: created, error } = await supabase.from('agreements').insert({
    template_id,
    template_version:  tpl.version,
    nurse_id,
    hospital_id,
    title:             tpl.title,
    template_content:  tpl.content,
    rendered_html,
    logo_url:          tpl.logo_url,
    generated_by:      admin.id,
    generated_at:      now,
    status:            'admin_approved',
    admin_approved_at: now,
    admin_approved_by: admin.id,
  }).select('id').single()

  if (error) return { error: error.message }

  // Re-render with real ID
  const finalHtml = renderAgreementHtml({ ...sharedData, agreementId: created.id, status: 'admin_approved' })
  await supabase.from('agreements').update({ rendered_html: finalHtml }).eq('id', created.id)

  revalidatePath('/admin/agreements')
  return { success: true, id: created.id }
}

export async function deleteAgreement(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const id = formData.get('id') as string
  await supabase.from('agreements').delete().eq('id', id)
  revalidatePath('/admin/agreements')
}
