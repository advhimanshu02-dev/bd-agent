'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addActivity(leadId: string, formData: FormData) {
  const activity_type = formData.get('activity_type') as string
  const description = formData.get('description') as string

  if (!activity_type || !description) {
    return { error: 'Activity type and description are required.' }
  }

  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).single()
  if (!lead) {
    return { error: 'Lead not found in your account.' }
  }

  const { error } = await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type,
    description,
  })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/leads/${leadId}`)
  return { success: true }
}