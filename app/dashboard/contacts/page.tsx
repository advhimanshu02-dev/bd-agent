import { createClient } from '@/utils/supabase/server'
import ContactsClient from './_components/contacts-client'

export default async function ContactsPage() {
  const supabase = await createClient()

  const [{ data: contacts, error: contactsError }, { data: companies }] = await Promise.all([
    supabase
      .from('contacts')
      .select('*, company:companies(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name').order('name', { ascending: true }),
  ])

  if (contactsError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        Couldn&apos;t load contacts: {contactsError.message}
      </div>
    )
  }

  return (
    <ContactsClient
      initialContacts={contacts ?? []}
      companies={companies ?? []}
    />
  )
}