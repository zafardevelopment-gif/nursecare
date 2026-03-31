'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function replaceDocument(formData: FormData) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'provider') return { error: 'Unauthorized' }

  const supabase = await createSupabaseServerClient()

  const docType = formData.get('doc_type') as string
  const file    = formData.get('file') as File | null

  if (!file || file.size === 0) return { error: 'No file selected' }
  if (!ALLOWED_TYPES.has(file.type))  return { error: 'Only PDF, JPG, PNG allowed' }
  if (file.size > MAX_SIZE)           return { error: 'File exceeds 5 MB limit' }

  // Get nurse id for this provider
  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }

  const ext         = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const storagePath = `${nurse.id}/${docType}.${ext}`

  const { error: storageErr } = await supabase.storage
    .from('nurse-documents')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (storageErr) return { error: storageErr.message }

  const { data: urlData } = supabase.storage
    .from('nurse-documents')
    .getPublicUrl(storagePath)

  // Replace DB record
  await supabase
    .from('nurse_documents')
    .delete()
    .eq('nurse_id', nurse.id)
    .eq('doc_type', docType)

  await supabase.from('nurse_documents').insert({
    nurse_id:  nurse.id,
    doc_type:  docType,
    file_url:  urlData.publicUrl,
    file_name: file.name,
  })

  revalidatePath('/provider/documents')
  return { success: true }
}

export async function deleteDocument(formData: FormData) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'provider') return { error: 'Unauthorized' }

  const supabase = await createSupabaseServerClient()

  const docType = formData.get('doc_type') as string

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }

  // Remove from storage (try all extensions)
  for (const ext of ['pdf', 'jpg', 'jpeg', 'png']) {
    await supabase.storage
      .from('nurse-documents')
      .remove([`${nurse.id}/${docType}.${ext}`])
  }

  // Remove from DB
  await supabase
    .from('nurse_documents')
    .delete()
    .eq('nurse_id', nurse.id)
    .eq('doc_type', docType)

  revalidatePath('/provider/documents')
  return { success: true }
}
