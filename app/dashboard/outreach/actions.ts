'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markSent(leadId: string) {
  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).single()
  if (!lead) {
    return { error: 'Lead not found in your account.' }
  }

  const { error } = await supabase
    .from('leads')
    .update({ status: 'CONTACTED', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: error.message }

  await supabase.from('activities').insert({
    lead_id: leadId,
    activity_type: 'MARKED_SENT',
    description: 'Outreach message marked as sent.',
  })

  revalidatePath('/dashboard/outreach')
  return { success: true }
}