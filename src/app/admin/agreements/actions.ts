'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
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
  const supabase = await createSupabaseServerClient()

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
  const nurse_id    = formData.get('nurse_id') as string
  const hospital_id = formData.get('hospital_id') as string

  if (!template_id || !nurse_id || !hospital_id)
    return { error: 'Template, nurse, and hospital are required' }

  // Fetch template
  const { data: tpl } = await supabase
    .from('agreement_templates').select('*').eq('id', template_id).single()
  if (!tpl) return { error: 'Template not found' }

  // Fetch nurse
  const { data: nurse } = await supabase
    .from('nurses').select('*, users(email, full_name, phone, city)')
    .eq('id', nurse_id).single()
  if (!nurse) return { error: 'Nurse not found' }

  // Fetch hospital user
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: hospital } = await adminClient
    .from('users').select('*').eq('id', hospital_id).single()
  if (!hospital) return { error: 'Hospital not found' }

  const nurseUser = (nurse as any).users as any
  const agreementDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  // Pre-render HTML (snapshot — frozen at generation time)
  const rendered_html = renderAgreementHtml({
    templateContent:     tpl.content,
    title:               tpl.title,
    logoUrl:             tpl.logo_url,
    nurseName:           nurse.full_name ?? nurseUser?.full_name ?? 'Nurse',
    nurseEmail:          nurse.email ?? nurseUser?.email ?? '',
    nursePhone:          nurse.phone ?? nurseUser?.phone,
    nurseCity:           nurse.city ?? nurseUser?.city,
    nurseSpecialization: nurse.specialization,
    hospitalName:        hospital.full_name ?? hospital.email,
    hospitalEmail:       hospital.email,
    agreementDate,
    agreementId:         'PENDING',
    status:              'pending',
  })

  const { data: created, error } = await supabase.from('agreements').insert({
    template_id,
    template_version: tpl.version,
    nurse_id,
    hospital_id,
    title:            tpl.title,
    template_content: tpl.content,
    rendered_html,
    logo_url:         tpl.logo_url,
    generated_by:     admin.id,
    generated_at:     new Date().toISOString(),
  }).select('id').single()

  if (error) return { error: error.message }

  // Update rendered HTML with real ID
  const finalHtml = renderAgreementHtml({
    templateContent:     tpl.content,
    title:               tpl.title,
    logoUrl:             tpl.logo_url,
    nurseName:           nurse.full_name ?? nurseUser?.full_name ?? 'Nurse',
    nurseEmail:          nurse.email ?? nurseUser?.email ?? '',
    nursePhone:          nurse.phone ?? nurseUser?.phone,
    nurseCity:           nurse.city ?? nurseUser?.city,
    nurseSpecialization: nurse.specialization,
    hospitalName:        hospital.full_name ?? hospital.email,
    hospitalEmail:       hospital.email,
    agreementDate,
    agreementId:         created.id,
    status:              'pending',
  })

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
