'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Wallet, Sparkles, Lock, PieChart } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Conta criada com sucesso! Faça login para continuar.')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — always dark */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0c111d] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Finance</span>
        </div>

        {/* Hero */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight">
              Comece hoje.<br />
              <span className="text-emerald-400">De graça.</span>
            </h1>
            <p className="text-slate-400 mt-4 text-lg leading-relaxed">
              Crie sua conta em segundos e tenha controle total das suas finanças pessoais.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Sparkles, text: 'Chat com IA para análise financeira' },
              { icon: PieChart, text: 'Relatórios visuais e categorias automáticas' },
              { icon: Lock, text: 'Privacidade total — seus dados só seus' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-slate-600 text-xs">
          &ldquo;Pequenas mudanças financeiras criam grandes resultados.&rdquo;
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">Finance</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Criar sua conta</h2>
            <p className="text-muted-foreground text-sm mt-1">Gratuito e sem cartão de crédito</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
