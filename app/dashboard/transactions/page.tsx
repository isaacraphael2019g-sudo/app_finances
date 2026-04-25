'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import TransactionForm from '@/components/transaction-form'
import ImportModal from '@/components/import-modal'
import PeriodFilter, { Period } from '@/components/period-filter'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Upload, CheckSquare, Square } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ALL_CATEGORIES = ['Todas', ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES.filter(c => !INCOME_CATEGORIES.includes(c))]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState('Todas')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [dateStart, setDateStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [activePeriod, setActivePeriod] = useState<Period>('month')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    const supabase = createClient()

    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('date', { ascending: false })

    if (filterType !== 'all') query = query.eq('type', filterType)
    if (filterCategory !== 'Todas') query = query.eq('category', filterCategory)

    const { data, error } = await query
    if (error) toast.error(`Erro: ${error.message}`)
    else setTransactions(data || [])
    setLoading(false)
  }, [dateStart, dateEnd, filterCategory, filterType])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev =>
      prev.size === transactions.length
        ? new Set()
        : new Set(transactions.map(t => t.id))
    )
  }

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

  async function handleBulkDelete() {
    const supabase = createClient()
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('transactions').delete().in('id', ids)
    if (error) {
      toast.error('Erro ao excluir transações')
    } else {
      toast.success(`${ids.length} transação(ões) excluída(s)`)
      setBulkDeleteOpen(false)
      loadTransactions()
    }
  }

  function handlePeriodFilter(start: string, end: string, period: Period) {
    setDateStart(start)
    setDateEnd(end)
    setActivePeriod(period)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">{transactions.length} transação(ões) encontrada(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button onClick={() => { setSelected(null); setFormOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova transação</span>
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
              {selectedIds.size === transactions.length
                ? <CheckSquare className="h-4 w-4 text-red-600" />
                : <Square className="h-4 w-4" />}
            </button>
            <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir {selectedIds.size}
            </Button>
          </div>
        </div>
      )}

      {/* Period Filter */}
      <PeriodFilter onFilter={handlePeriodFilter} defaultPeriod={activePeriod} />

      {/* Type & Category filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v as typeof filterType)}>
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

        {!loading && transactions.length > 0 && (
          <div className="flex items-center gap-3 ml-auto text-sm">
            <span className="text-green-600 font-medium">+{brl(totalIncome)}</span>
            <span className="text-red-600 font-medium">-{brl(totalExpense)}</span>
            <span className={`font-semibold ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              = {brl(totalIncome - totalExpense)}
            </span>
          </div>
        )}
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
            <div className="rounded-full bg-muted p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
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
            <Card
              key={t.id}
              className={`hover:shadow-sm transition-shadow cursor-pointer ${selectedIds.has(t.id) ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}`}
              onClick={() => toggleSelect(t.id)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="h-4 w-4 cursor-pointer accent-red-500"
                  />
                </div>
                <div className={`rounded-full p-2 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
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
                    {t.type === 'income' ? '+' : '-'} {brl(t.amount)}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setSelected(t); setFormOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => { setSelected(t); setDeleteOpen(true) }}>
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

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={loadTransactions}
      />

      {/* Single delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selectedIds.size} transação(ões)</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setBulkDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleBulkDelete}>
              Excluir {selectedIds.size}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
