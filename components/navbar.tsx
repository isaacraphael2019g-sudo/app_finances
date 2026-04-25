'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrendingUp, LayoutDashboard, List, Bot, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userEmail: string
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Até logo!')
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/transactions', label: 'Transações', icon: List },
    { href: '/dashboard/chat', label: 'Chat IA', icon: Bot },
  ]

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-blue-600">
              <TrendingUp className="h-6 w-6" />
              <span className="font-bold text-foreground hidden sm:block">Finance</span>
            </Link>
            <nav className="flex items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === href
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:block">{userEmail}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
