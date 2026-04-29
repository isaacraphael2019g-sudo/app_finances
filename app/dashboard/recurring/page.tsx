'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RecurringTransaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Receipt, Play, TrendingUp, TrendingDown } from 'lucide-react'
import { format, addMonths, addWeeks, addYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const FREQ_LABELS: Record<string, string> = { monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual' }

function calcNextDate(date: string, freq: string): string {
  const d = new Date(date + 'T12:00:00')
  if (freq === 'monthly') return format(addMonths(d, 1), 'yyyy-MM-dd')
  if (freq === 'weekly')  return format(addWeeks(d, 1),  'yyyy-MM-dd')
  return format(addYears(d, 1), 'yyyy-MM-dd')
}

const emptyForm = {
  type: 'expense' as 'income' | 'expense',
  amount: 0,
  category: '',
  description: '',
  frequency: 'monthly',
  next_date: format(new Date(), 'yyyy-MM-dd'),
  is_recurring: true,
}

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<RecurringTransaction | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await createClient().from('recurring_transactions').select('*').order('next_date')
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setSelected(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(item: RecurringTransaction) {
    setSelected(item)
    setForm({
      type: item.type,
      amount: item.amount,
      category: item.category,
      description: item.description || '',
      frequency: item.frequency,
      next_date: item.next_date,
      is_recurring: item.is_recurring ?? true,
    })
    setFormOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category) { toast.error('Selecione uma categoria'); return }
    if (form.amount <= 0) { toast.error('Informe um valor'); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada'); return }

    const payload = {
      user_id: user.id,
      type: form.type,
      amount: form.amount,
      category: form.category,
      description: form.description || null,
      frequency: form.is_recurring ? form.frequency : 'monthly',
      next_date: form.next_date,
      active: true,
      is_recurring: form.is_recurring,
    }

    const { error } = selected
      ? await supabase.from('recurring_transactions').update(payload).eq('id', selected.id)
      : await supabase.from('recurring_transactions').insert(payload)

    if (error) toast.error(`Erro: ${error.message}`)
    else { toast.success(selected ? 'Atualizado!' : 'Criado!'); setFormOpen(false); load() }
  }

  async function handleLaunch(item: RecurringTransaction) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada'); return }

    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: item.type,
      amount: item.amount,
      category: item.category,
      description: item.description,
      date: item.next_date,
    })
    if (txErr) { toast.error('Erro ao lançar transação'); return }

    if (item.is_recurring) {
      const next = calcNextDate(item.next_date, item.frequency)
      await supabase.from('recurring_transactions').update({ next_date: next }).eq('id', item.id)
      toast.success(`Lançado! Próximo: ${format(new Date(next + 'T12:00:00'), 'dd/MM/yyyy')}`)
    } else {
      await supabase.from('recurring_transactions').delete().eq('id', item.id)
      toast.success('Conta lançada e removida da lista!')
    }

    load()
  }

  async function handleDelete() {
    if (!selected) return
    const { error } = await createClient().from('recurring_transactions').delete().eq('id', selected.id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluído!'); setDeleteOpen(false); load() }
  }

  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas contas fixas e recorrentes</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova conta</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Nenhuma conta cadastrada</p>
            <p className="text-muted-foreground text-sm mt-1">Cadastre contas fixas como aluguel, salário, assinaturas...</p>
            <Button className="mt-4 gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Adicionar</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`rounded-full p-2 ${item.type === 'income' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                  {item.type === 'income'
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{item.description || item.category}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{item.category}</Badge>
                    {item.is_recurring
                      ? <Badge variant="outline" className="text-xs shrink-0">{FREQ_LABELS[item.frequency]}</Badge>
                      : <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">Única vez</Badge>
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {item.is_recurring ? 'Próximo: ' : 'Vencimento: '}
                    {format(new Date(item.next_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <span className={`font-semibold text-lg shrink-0 ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.type === 'income' ? '+' : '-'}{brl(item.amount)}
                </span>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    title="Lançar agora" onClick={() => handleLaunch(item)}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => { setSelected(item); setDeleteOpen(true) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar conta' : 'Nova conta a pagar'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['income', 'expense'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t, category: '' })}
                    className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                      form.type === t
                        ? t === 'income' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-transparent dark:border-gray-700 dark:text-gray-300'
                    }`}>
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <CurrencyInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => v && setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{form.is_recurring ? 'Próximo lançamento' : 'Data de vencimento'}</Label>
              <Input type="date" value={form.next_date} onChange={e => setForm({ ...form, next_date: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Esta conta se repete?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, is_recurring: true })}
                  className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                    form.is_recurring
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-transparent dark:border-gray-700 dark:text-gray-300'
                  }`}>
                  Sim, recorrente
                </button>
                <button type="button" onClick={() => setForm({ ...form, is_recurring: false })}
                  className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                    !form.is_recurring
                      ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-transparent dark:border-gray-700 dark:text-gray-300'
                  }`}>
                  Não, única vez
                </button>
              </div>
            </div>

            {form.is_recurring && (
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={v => v && setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input placeholder="Ex: Aluguel, Netflix, Salário..." value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>Tem certeza? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
