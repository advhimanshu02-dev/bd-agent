'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Companies', href: '/dashboard/companies' },
  { label: 'Contacts', href: '/dashboard/contacts' },
  { label: 'Leads', href: '/dashboard/leads' },
  { label: 'Pipeline', href: '/dashboard/pipeline' },
  { label: 'Outreach', href: '/dashboard/outreach' },
  { label: 'Import', href: '/dashboard/import' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Activities', href: '/dashboard/activities' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-[#1B2A44] text-[#E7E4DD] flex flex-col">
      <div className="px-5 py-6">
        <span className="font-serif text-xl tracking-tight">BD Agent</span>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm transition-colors ${
                active ? 'bg-[#A87C4F] text-white' : 'text-[#C7C2B8] hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}