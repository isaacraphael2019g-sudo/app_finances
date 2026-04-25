'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { cn } from '@/lib/utils'

export default function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userEmail={userEmail} collapsed={collapsed} onToggle={toggle} />
      <main
        className={cn(
          'flex-1 min-w-0 transition-all duration-300',
          mounted
            ? collapsed ? 'md:ml-16' : 'md:ml-64'
            : 'md:ml-64'
        )}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
