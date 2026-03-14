'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

export async function onboardingAction(formData: FormData) {
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
    redirect('/provider/onboarding?error=Please+enter+at+least+one+pricing+option+(hourly+or+daily)')
  }

  // Validate file types and sizes before saving anything
  for (const [fieldName] of Object.entries(DOC_FIELDS)) {
    const file = formData.get(fieldName) as File | null
    if (!file || file.size === 0) continue

    if (!ALLOWED_TYPES.has(file.type)) {
      redirect(`/provider/onboarding?error=Invalid+file+type+for+${fieldName}.+Only+PDF,+JPG,+PNG+allowed.`)
    }
    if (file.size > MAX_SIZE) {
      redirect(`/provider/onboarding?error=File+${fieldName}+exceeds+5MB+limit.`)
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
    redirect(`/provider/onboarding?error=${encodeURIComponent(nurseError?.message ?? 'Failed to save profile')}`)
  }

  // Ensure nurse upload folder exists
  const nurseDir = path.join(process.cwd(), 'public', 'uploads', 'nurses', nurse.id)
  if (!existsSync(nurseDir)) {
    await mkdir(nurseDir, { recursive: true })
  }

  // Save files to disk and record URLs in DB
  const uploadErrors: string[] = []

  for (const [fieldName, docType] of Object.entries(DOC_FIELDS)) {
    const file = formData.get(fieldName) as File | null
    if (!file || file.size === 0) continue

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const fileName = `${docType}.${ext}`
    const filePath = path.join(nurseDir, fileName)
    const publicUrl = `/uploads/nurses/${nurse.id}/${fileName}`

    try {
      // Delete old file with any extension for this doc type (replace)
      for (const oldExt of ['pdf', 'jpg', 'jpeg', 'png']) {
        const oldPath = path.join(nurseDir, `${docType}.${oldExt}`)
        if (existsSync(oldPath) && oldPath !== filePath) {
          await unlink(oldPath)
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)
    } catch {
      uploadErrors.push(docType)
      continue
    }

    // Update DB record
    await supabase
      .from('nurse_documents')
      .delete()
      .eq('nurse_id', nurse.id)
      .eq('doc_type', docType)

    await supabase.from('nurse_documents').insert({
      nurse_id:  nurse.id,
      doc_type:  docType,
      file_url:  publicUrl,
      file_name: file.name,
    })
  }

  if (uploadErrors.length > 0) {
    redirect(`/provider/onboarding?error=Profile+saved+but+some+files+failed:+${uploadErrors.join(', ')}`)
  }

  redirect('/provider/dashboard?message=Profile+submitted+for+review')
}
