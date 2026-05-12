'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'

export interface SaveDeveloperSettingsInput {
  category: string
  fields:   Record<string, string>
}

export async function saveDeveloperSettings(
  input: SaveDeveloperSettingsInput
): Promise<{ error?: string }> {
  const admin   = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { category, fields } = input
  const now = new Date().toISOString()
  const errors: string[] = []

  for (const [key_name, new_value] of Object.entries(fields)) {
    // Fetch existing row
    const { data: existing } = await supabase
      .from('developer_settings')
      .select('id, key_value, is_sensitive')
      .eq('category', category)
      .eq('key_name', key_name)
      .single()

    if (!existing) {
      // Upsert new row
      const { error } = await supabase
        .from('developer_settings')
        .upsert({
          category,
          key_name,
          key_value:  new_value,
          updated_by: admin.id,
          updated_at: now,
        }, { onConflict: 'category,key_name' })
      if (error) errors.push(`${key_name}: ${error.message}`)
      continue
    }

    const old_value = existing.key_value ?? ''
    if (old_value === new_value) continue // no change — skip write + history

    const { error: updateError } = await supabase
      .from('developer_settings')
      .update({ key_value: new_value, updated_by: admin.id, updated_at: now })
      .eq('id', existing.id)

    if (updateError) {
      errors.push(`${key_name}: ${updateError.message}`)
      continue
    }

    // Write history row
    await supabase
      .from('developer_settings_history')
      .insert({
        setting_id:      existing.id,
        category,
        key_name,
        old_value:       existing.is_sensitive ? '***' : old_value,
        new_value:       existing.is_sensitive ? '***' : new_value,
        changed_by:      admin.id,
        changed_by_name: admin.full_name ?? 'Admin',
        changed_at:      now,
      })
  }

  void logActivity({
    actorId:    admin.id,
    actorName:  admin.full_name ?? 'Admin',
    actorRole:  'admin',
    action:     'developer_settings_changed',
    module:     'settings',
    entityType: 'developer_settings',
    description: `Admin updated developer settings: ${category}`,
    meta: { category, keys: Object.keys(fields) },
  })

  revalidatePath('/admin/settings')

  if (errors.length > 0) return { error: errors.join('; ') }
  return {}
}

export async function toggleDeveloperSetting(
  category: string,
  key_name: string,
  value: boolean
): Promise<{ error?: string }> {
  return saveDeveloperSettings({
    category,
    fields: { [key_name]: value ? 'true' : 'false' },
  })
}

export async function sendTestSmtpEmail(
  recipientEmail: string
): Promise<{ error?: string; success?: boolean }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data: rows } = await supabase
    .from('developer_settings')
    .select('key_name, key_value')
    .eq('category', 'smtp')

  const settings: Record<string, string> = {}
  for (const row of rows ?? []) settings[row.key_name] = row.key_value ?? ''

  const host      = settings['host']
  const port      = parseInt(settings['port'] || '587', 10)
  const username  = settings['username']
  const password  = settings['password']
  const fromName  = settings['from_name'] || 'NurseCare+'
  const fromEmail = settings['from_email']
  const useSsl    = settings['use_ssl'] === 'true'
  const encryption = settings['encryption'] || 'starttls'

  if (!host || !fromEmail) return { error: 'SMTP not fully configured. Please save settings first.' }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: encryption === 'ssl',
      requireTLS: encryption === 'starttls',
      auth: username && password ? { user: username, pass: password } : undefined,
    })

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: 'NurseCare+ SMTP Test Email',
      html: `<p>This is a test email from <strong>NurseCare+</strong> to verify your SMTP configuration.</p><p>If you received this, your SMTP settings are working correctly.</p>`,
    })

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  }
}

export async function getDeveloperSettingsHistory(
  category: string
): Promise<{ data?: { key_name: string; old_value: string; new_value: string; changed_by_name: string; changed_at: string }[]; error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data, error } = await supabase
    .from('developer_settings_history')
    .select('key_name, old_value, new_value, changed_by_name, changed_at')
    .eq('category', category)
    .order('changed_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  return { data: data ?? [] }
}
