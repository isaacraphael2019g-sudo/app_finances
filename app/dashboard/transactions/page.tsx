'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import TransactionForm from '@/components/transaction-form'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { format, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ALL_CATEGORIES = ['Todas', ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES.filter(
  c => !INCOME_CATEGORIES.includes(c)
)]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [filterCategory, setFilterCategory] = useState('Todas')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [year, month] = filterMonth.split('-')
    const start = `${year}-${month}-01`
    const lastDay = getDaysInMonth(new Date(Number(year), Number(month) - 1))
    const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (filterType !== 'all') query = query.eq('type', filterType)
    if (filterCategory !== 'Todas') query = query.eq('category', filterCategory)

    const { data, error } = await query
    if (error) toast.error(`Erro: ${error.message}`)
    else setTransactions(data || [])
    setLoading(false)
  }, [filterMonth, filterCategory, filterType])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  async function handleDelete() {
    if (!selected) return
    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', selected.id)
    if (error) {
      toast.error('Erro ao excluir transação')
    } else {
      toast.success('Transação excluída')
      setDeleteOpen(false)
      setSelected(null)
      loadTransactions()
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return format(d, 'yyyy-MM')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">{transactions.length} transação(ões) encontrada(s)</p>
        </div>
        <Button onClick={() => { setSelected(null); setFormOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova transação
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterMonth} onValueChange={(v) => v && setFilterMonth(v)}>
          <SelectTrigger className="w-44 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="w-36 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={(v) => v && setFilterCategory(v)}>
          <SelectTrigger className="w-44 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-foreground font-medium">Nenhuma transação encontrada</p>
            <p className="text-muted-foreground text-sm mt-1">Ajuste os filtros ou adicione uma nova transação</p>
            <Button className="mt-4 gap-2" onClick={() => { setSelected(null); setFormOpen(true) }}>
              <Plus className="h-4 w-4" /> Adicionar transação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`rounded-full p-2 ${t.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {t.type === 'income'
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {t.description || t.category}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">{t.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(t.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`font-semibold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setSelected(t); setFormOpen(true) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { setSelected(t); setDeleteOpen(true) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={selected}
        onSuccess={loadTransactions}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
