'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setIsPending(true)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
    }
    setIsPending(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1B2A44] flex items-center justify-center p-4">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#A87C4F]/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-[#A87C4F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#A87C4F]">ORION</p>
            <h1 className="mt-1 font-serif text-3xl text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-[#C7C2B8]">Sign in to your business development workspace</p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-[#C7C2B8]">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/90 px-4 py-2.5 text-sm text-[#1F2430] placeholder:text-[#9CA3AF] focus:border-[#A87C4F] focus:outline-none focus:ring-2 focus:ring-[#A87C4F]/40"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm text-[#C7C2B8]">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/90 px-4 py-2.5 text-sm text-[#1F2430] placeholder:text-[#9CA3AF] focus:border-[#A87C4F] focus:outline-none focus:ring-2 focus:ring-[#A87C4F]/40"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-[#A87C4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#946a42] disabled:opacity-50"
            >
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#C7C2B8]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#A87C4F] hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B7280]">
          Legal recovery &amp; operational services business development
        </p>
      </div>
    </div>
  )
}