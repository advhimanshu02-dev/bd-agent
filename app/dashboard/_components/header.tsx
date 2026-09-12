import { logout } from '@/app/account/actions'

export default function Header({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b border-black/10 bg-[#F7F5F1] px-6 py-4">
      <h1 className="font-serif text-lg text-[#1F2430]">Dashboard</h1>
      <div className="flex items-center gap-4 text-sm text-[#6B7280]">
        <span>{email}</span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-black/10 px-3 py-1.5 text-[#1F2430] hover:bg-black/5"
          >
            Log Out
          </button>
        </form>
      </div>
    </header>
  )
}