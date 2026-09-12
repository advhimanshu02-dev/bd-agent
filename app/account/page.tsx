import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from './actions'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Account</h1>
      <p>You are logged in.</p>
      <p>Email: {user.email}</p>
      <form action={logout}>
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>Log Out</button>
      </form>
    </div>
  )
}