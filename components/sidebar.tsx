'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  TrendingUp, LayoutDashboard, List, Bot,
  LogOut, Menu, X, Sun, Moon, Wallet,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações', icon: List },
  { href: '/dashboard/chat', label: 'Chat IA', icon: Bot },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Até logo!')
    router.push('/login')
    router.refresh()
  }

  const body = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-[17px] tracking-tight leading-none">Finance</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Gestão Pessoal</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <p className="px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
        Menu
      </p>

      {/* Links */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-5 my-3 border-t border-white/[0.06]" />

      {/* Footer */}
      <div className="px-3 pb-5 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-slate-500" />
            : <Moon className="h-4 w-4 text-slate-500" />
          }
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 text-slate-500" />
          Sair
        </button>

        {/* User */}
        <div className="px-3 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              {userEmail[0].toUpperCase()}
            </div>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden h-9 w-9 rounded-xl bg-[#0c111d] border border-white/10 flex items-center justify-center text-slate-300 shadow-lg"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-[#0c111d] border-r border-white/[0.06] z-40',
          'transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {body}
      </aside>
    </>
  )
}
