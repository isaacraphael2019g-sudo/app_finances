'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']

export default function DREPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<{ date: string; type: string; amount: number; category: string }[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('transactions')
      .select('date, type, amount, category')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
    setData(data || [])
    setLoading(false)
  }, [year])

  useEffect(() => { loadData() }, [loadData])

  function getTotal(type: string, month?: string, category?: string) {
    return data.filter(t =>
      t.type === type &&
      (!month || t.date.startsWith(`${year}-${month}`)) &&
      (!category || t.category === category)
    ).reduce((a, t) => a + Number(t.amount), 0)
  }

  const activeIncome = INCOME_CATEGORIES.filter(c => data.some(t => t.type === 'income' && t.category === c))
  const activeExpense = EXPENSE_CATEGORIES.filter(c => data.some(t => t.type === 'expense' && t.category === c))
  const brl = (v: number) => v === 0 ? '—' : `R$ ${v.toFixed(2).replace('.', ',')}`
  const num = (v: number) => v.toFixed(2).replace('.', ',')

  function exportCSV() {
    const monthLabels = MONTHS.map(m => format(new Date(`${year}-${m}-01`), 'MMM', { locale: ptBR }).toUpperCase())
    const rows: string[] = [['Categoria', ...monthLabels, 'Total'].join(';')]

    rows.push(['RECEITAS', ...MONTHS.map(() => ''), ''].join(';'))
    for (const cat of activeIncome) {
      rows.push([cat, ...MONTHS.map(m => num(getTotal('income', m, cat))), num(getTotal('income', undefined, cat))].join(';'))
    }
    rows.push(['Total Receitas', ...MONTHS.map(m => num(getTotal('income', m))), num(getTotal('income'))].join(';'))

    rows.push(['DESPESAS', ...MONTHS.map(() => ''), ''].join(';'))
    for (const cat of activeExpense) {
      rows.push([cat, ...MONTHS.map(m => num(getTotal('expense', m, cat))), num(getTotal('expense', undefined, cat))].join(';'))
    }
    rows.push(['Total Despesas', ...MONTHS.map(m => num(getTotal('expense', m))), num(getTotal('expense'))].join(';'))

    rows.push(['Resultado',
      ...MONTHS.map(m => num(getTotal('income', m) - getTotal('expense', m))),
      num(getTotal('income') - getTotal('expense'))
    ].join(';'))

    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DRE_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE</h1>
          <p className="text-muted-foreground text-sm mt-1">Demonstrativo de Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV} disabled={loading || data.length === 0}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-background">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold px-3">{year}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-4 border-muted border-t-emerald-500 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 font-semibold min-w-36 sticky left-0 z-10 bg-muted/50">Categoria</th>
                  {MONTHS.map(m => (
                    <th key={m} className="text-right p-3 font-semibold min-w-20">
                      {format(new Date(`${year}-${m}-01`), 'MMM', { locale: ptBR }).toUpperCase()}
                    </th>
                  ))}
                  <th className="text-right p-3 font-semibold min-w-24 bg-muted/80">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50 dark:bg-green-950/30">
                  <td colSpan={14} className="p-2 px-3 font-bold text-green-700 dark:text-green-400 text-xs uppercase tracking-wide">
                    Receitas
                  </td>
                </tr>
                {activeIncome.map(cat => (
                  <tr key={cat} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-2 px-3 sticky left-0 z-10 bg-background">{cat}</td>
                    {MONTHS.map(m => {
                      const v = getTotal('income', m, cat)
                      return (
                        <td key={m} className="p-2 text-right text-green-600">
                          {v > 0 ? brl(v) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )
                    })}
                    <td className="p-2 text-right font-semibold text-green-600 bg-muted/30">{brl(getTotal('income', undefined, cat))}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-green-300 dark:border-green-800 bg-green-50/70 dark:bg-green-950/20">
                  <td className="p-2.5 px-3 font-bold text-green-700 dark:text-green-400 sticky left-0 z-10 bg-green-50 dark:bg-green-950/20">Total Receitas</td>
                  {MONTHS.map(m => {
                    const v = getTotal('income', m)
                    return (
                      <td key={m} className="p-2.5 text-right font-semibold text-green-600">
                        {v > 0 ? brl(v) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    )
                  })}
                  <td className="p-2.5 text-right font-bold text-green-600 bg-green-100 dark:bg-green-950/40">{brl(getTotal('income'))}</td>
                </tr>

                <tr className="bg-red-50 dark:bg-red-950/30">
                  <td colSpan={14} className="p-2 px-3 font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wide">
                    Despesas
                  </td>
                </tr>
                {activeExpense.map(cat => (
                  <tr key={cat} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-2 px-3 sticky left-0 z-10 bg-background">{cat}</td>
                    {MONTHS.map(m => {
                      const v = getTotal('expense', m, cat)
                      return (
                        <td key={m} className="p-2 text-right text-red-600">
                          {v > 0 ? brl(v) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )
                    })}
                    <td className="p-2 text-right font-semibold text-red-600 bg-muted/30">{brl(getTotal('expense', undefined, cat))}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/20">
                  <td className="p-2.5 px-3 font-bold text-red-700 dark:text-red-400 sticky left-0 z-10 bg-red-50 dark:bg-red-950/20">Total Despesas</td>
                  {MONTHS.map(m => {
                    const v = getTotal('expense', m)
                    return (
                      <td key={m} className="p-2.5 text-right font-semibold text-red-600">
                        {v > 0 ? brl(v) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    )
                  })}
                  <td className="p-2.5 text-right font-bold text-red-600 bg-red-100 dark:bg-red-950/40">{brl(getTotal('expense'))}</td>
                </tr>

                <tr className="border-t-4 border-border bg-muted/50">
                  <td className="p-3 px-3 font-bold text-sm sticky left-0 z-10 bg-muted/50">Resultado</td>
                  {MONTHS.map(m => {
                    const r = getTotal('income', m) - getTotal('expense', m)
                    return (
                      <td key={m} className={`p-3 text-right font-bold ${r > 0 ? 'text-blue-600' : r < 0 ? 'text-orange-600' : 'text-muted-foreground/40'}`}>
                        {r !== 0 ? (r < 0 ? '-' : '+') + brl(Math.abs(r)) : '—'}
                      </td>
                    )
                  })}
                  {(() => {
                    const total = getTotal('income') - getTotal('expense')
                    return (
                      <td className={`p-3 text-right font-bold text-sm bg-muted ${total >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {(total < 0 ? '-' : '+') + brl(Math.abs(total))}
                      </td>
                    )
                  })()}
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
