'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CategoryChart from '@/components/category-chart'
import MonthlyTrendChart from '@/components/monthly-trend-chart'
import TransactionForm from '@/components/transaction-form'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Wallet, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [trendData, setTrendData] = useState<{ month: string; Receitas: number; Despesas: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthKey = format(currentDate, 'yyyy-MM')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [year, month] = monthKey.split('-')
    const start = `${year}-${month}-01`
    const lastDay = getDaysInMonth(new Date(Number(year), Number(month) - 1))
    const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (error) toast.error(`Erro: ${error.message}`)
    else setTransactions(data || [])
    setLoading(false)
  }, [monthKey])

  const loadTrend = useCallback(async () => {
    const supabase = createClient()
    const now = new Date()
    const trendStart = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd')
    const trendEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transactions')
      .select('date,type,amount')
      .gte('date', trendStart)
      .lte('date', trendEnd)

    if (!data) return

    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const key = format(d, 'yyyy-MM')
      const month = format(d, 'MMM', { locale: ptBR })
      const txs = data.filter(t => t.date.startsWith(key))
      return {
        month,
        Receitas: txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0),
        Despesas: txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0),
      }
    })
    setTrendData(trend)
  }, [])

  useEffect(() => { loadTransactions() }, [loadTransactions])
  useEffect(() => { loadTrend() }, [loadTrend])

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
  const balance = totalIncome - totalExpense

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})

  const chartData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const topExpenses = chartData.slice(0, 5)
  const recentTransactions = transactions.slice(0, 5)
  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumo financeiro do mês</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 min-w-36 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova transação</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className={`text-2xl font-bold mt-1 ${loading ? 'animate-pulse text-muted' : 'text-green-600'}`}>
                  {loading ? 'R$ ---' : brl(totalIncome)}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-950 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className={`text-2xl font-bold mt-1 ${loading ? 'animate-pulse text-muted' : 'text-red-600'}`}>
                  {loading ? 'R$ ---' : brl(totalExpense)}
                </p>
              </div>
              <div className="bg-red-100 dark:bg-red-950 rounded-full p-3">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold mt-1 ${loading ? 'animate-pulse text-muted' : balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {loading ? 'R$ ---' : brl(balance)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${balance >= 0 ? 'bg-blue-100 dark:bg-blue-950' : 'bg-orange-100 dark:bg-orange-950'}`}>
                <Wallet className={`h-6 w-6 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full border-4 border-muted border-t-blue-500 animate-spin" />
              </div>
            ) : (
              <CategoryChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categorias de Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
              </div>
            ) : topExpenses.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                Sem despesas neste período
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenses.map((cat, i) => {
                  const pct = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{i + 1}. {cat.name}</span>
                        <span className="text-muted-foreground">
                          {brl(cat.value)} <span className="text-xs">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div
                          className="h-1.5 bg-red-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trendData} />
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Últimas Transações</CardTitle>
          <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma transação neste mês</p>
              <Button variant="link" className="text-blue-600 text-sm mt-1" onClick={() => setFormOpen(true)}>
                Adicionar primeira transação
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`rounded-full p-1.5 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                    {t.type === 'income'
                      ? <TrendingUp className="h-3 w-3 text-green-600" />
                      : <TrendingDown className="h-3 w-3 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                    <p className="text-xs text-muted-foreground">{t.category} · {format(new Date(t.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{brl(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} transaction={null} onSuccess={() => { loadTransactions(); loadTrend() }} />
    </div>
  )
}
