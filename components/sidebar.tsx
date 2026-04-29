'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  MessageSquare, LayoutDashboard, List,
  LogOut, Menu, X, Sun, Moon, Wallet,
  ChevronLeft, ChevronRight, RefreshCw, BarChart2,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transações',   icon: List },
  { href: '/dashboard/accounts',     label: 'Contas',       icon: Wallet },
  { href: '/dashboard/recurring',    label: 'Recorrentes',  icon: RefreshCw },
  { href: '/dashboard/dre',          label: 'DRE',          icon: BarChart2 },
  { href: '/dashboard/chat',         label: 'Seu Assistente', icon: MessageSquare },
]

interface SidebarProps {
  userEmail: string
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ userEmail, collapsed, onToggle }: SidebarProps) {
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className={cn('flex items-center py-6 px-4', collapsed && 'justify-center px-0')}>
        <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 min-w-0">
            <p className="font-bold text-white text-[17px] tracking-tight leading-none">Finance</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Gestão Pessoal</p>
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <p className="px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-1">
          Menu
        </p>
      )}

      {/* Links */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              title={collapsed ? label : undefined}
              className={cn(
                'group flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center w-10 h-10 mx-auto px-0' : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
              {!collapsed && (
                <>
                  {label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-white/[0.06]" />

      {/* Footer */}
      <div className={cn('pb-4 space-y-0.5', collapsed ? 'px-0' : 'px-2')}>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={collapsed ? (theme === 'dark' ? 'Modo claro' : 'Modo escuro') : undefined}
          className={cn(
            'flex items-center w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150',
            collapsed ? 'justify-center w-10 h-10 mx-auto px-0' : 'gap-3 px-3 py-2.5'
          )}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-slate-500 shrink-0" />
            : <Moon className="h-4 w-4 text-slate-500 shrink-0" />
          }
          {!collapsed && (theme === 'dark' ? 'Modo claro' : 'Modo escuro')}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center w-full rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150',
            collapsed ? 'justify-center w-10 h-10 mx-auto px-0' : 'gap-3 px-3 py-2.5'
          )}
        >
          <LogOut className="h-4 w-4 text-slate-500 shrink-0" />
          {!collapsed && 'Sair'}
        </button>

        {/* User */}
        <div className={cn('pt-2', collapsed ? 'flex justify-center' : 'px-3')}>
          <div className={cn('flex items-center', !collapsed && 'gap-2.5')}>
            <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              {userEmail[0].toUpperCase()}
            </div>
            {!collapsed && <p className="text-xs text-slate-500 truncate">{userEmail}</p>}
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="hidden md:flex justify-center pt-1">
          <button
            onClick={onToggle}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all duration-150"
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </button>
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
          'fixed left-0 top-0 h-full bg-[#0c111d] border-r border-white/[0.06] z-40',
          'transition-all duration-300 ease-in-out',
          'w-64 md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-64',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {body}
      </aside>
    </>
  )
}
