'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

const DOC_FIELDS: Record<string, string> = {
  doc_biodata:             'biodata',
  doc_national_id:         'national_id',
  doc_passport:            'passport',
  doc_photo:               'photo',
  doc_nursing_certificate: 'nursing_certificate',
  doc_nursing_license:     'nursing_license',
}

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function onboardingAction(formData: FormData): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const phone          = formData.get('phone') as string
  const gender         = formData.get('gender') as string
  const nationality    = formData.get('nationality') as string
  const city           = formData.get('city') as string
  const experience     = parseInt(formData.get('experience') as string) || 0
  const specialization = formData.get('specialization') as string
  const license_no     = formData.get('license_no') as string
  const bio            = formData.get('bio') as string
  const hourly_rate    = parseFloat(formData.get('hourly_rate') as string) || null
  const daily_rate     = parseFloat(formData.get('daily_rate') as string) || null

  if (!hourly_rate && !daily_rate) {
    return { error: 'Please enter at least one pricing option (hourly or daily)' }
  }

  // Validate file types and sizes before saving anything
  for (const [fieldName] of Object.entries(DOC_FIELDS)) {
    const file = formData.get(fieldName) as File | null
    if (!file || file.size === 0) continue
    if (!ALLOWED_TYPES.has(file.type)) {
      return { error: `Invalid file type for ${fieldName}. Only PDF, JPG, PNG allowed.` }
    }
    if (file.size > MAX_SIZE) {
      return { error: `File ${fieldName} exceeds 5MB limit.` }
    }
  }

  // Upsert nurse profile
  const { data: nurse, error: nurseError } = await supabase
    .from('nurses')
    .upsert({
      user_id:          user.id,
      full_name:        user.full_name,
      email:            user.email,
      phone,
      gender,
      nationality,
      city,
      experience_years: experience,
      specialization,
      license_no,
      bio,
      hourly_rate,
      daily_rate,
      status:           'pending',
    }, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (nurseError || !nurse) {
    return { error: nurseError?.message ?? 'Failed to save profile' }
  }

  // Upload files
  const uploadErrors: string[] = []

  for (const [fieldName, docType] of Object.entries(DOC_FIELDS)) {
    const file = formData.get(fieldName) as File | null
    if (!file || file.size === 0) continue

    const ext         = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const storagePath = `${nurse.id}/${docType}.${ext}`

    const { error: storageError } = await supabase.storage
      .from('nurse-documents')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (storageError) { uploadErrors.push(docType); continue }

    const { data: urlData } = supabase.storage
      .from('nurse-documents')
      .getPublicUrl(storagePath)

    await supabase.from('nurse_documents').delete()
      .eq('nurse_id', nurse.id).eq('doc_type', docType)

    await supabase.from('nurse_documents').insert({
      nurse_id:  nurse.id,
      doc_type:  docType,
      file_url:  urlData.publicUrl,
      file_name: file.name,
    })
  }

  if (uploadErrors.length > 0) {
    return { error: `Profile saved but some files failed: ${uploadErrors.join(', ')}` }
  }

  redirect('/provider/dashboard?message=Profile+submitted+for+review')
}
