import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/account/actions'
import { DEFAULT_FOLLOWUP_DAYS } from '@/lib/constants'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: companyCount }, { count: contactCount }, { count: leadCount }] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-xl text-[#1F2430] mb-4">Settings</h2>

      <section className="mb-6">
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Account</h3>
        <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-3">
          <p><span className="text-[#6B7280]">Email:</span> {user?.email ?? '—'}</p>
          <form action={logout}>
            <button type="submit" className="rounded bg-[#A87C4F] px-4 py-2 text-sm text-white hover:bg-[#946a42]">
              Log Out
            </button>
          </form>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Data Summary</h3>
        <div className="rounded border border-black/10 bg-white p-4 text-sm grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl text-[#1F2430]">{companyCount ?? 0}</p>
            <p className="text-[#6B7280]">Companies</p>
          </div>
          <div>
            <p className="text-2xl text-[#1F2430]">{contactCount ?? 0}</p>
            <p className="text-[#6B7280]">Contacts</p>
          </div>
          <div>
            <p className="text-2xl text-[#1F2430]">{leadCount ?? 0}</p>
            <p className="text-[#6B7280]">Leads</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">Workflow Defaults</h3>
        <div className="rounded border border-black/10 bg-white p-4 text-sm space-y-1">
          <p><span className="text-[#6B7280]">Follow-up staleness threshold:</span> {DEFAULT_FOLLOWUP_DAYS} days</p>
          <p className="text-xs text-[#6B7280]">
            (A CONTACTED lead with no response is flagged for follow-up after this many days. Set in lib/constants.ts — no in-app editor by design, to avoid adding an unnecessary settings table for V1.)
          </p>
        </div>
      </section>

      <section>
        <h3 className="font-serif text-lg text-[#1F2430] mb-2">AI Usage &amp; Cost</h3>
        <div className="rounded border border-black/10 bg-white p-4 text-sm">
          <p className="text-[#6B7280]">
            Detailed AI call counts and estimated cost are tracked on the{' '}
            <Link href="/dashboard/analytics" className="text-[#A87C4F] underline">Analytics</Link> page.
          </p>
        </div>
      </section>
    </div>
  )
}