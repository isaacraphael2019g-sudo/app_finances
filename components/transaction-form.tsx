'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, Transaction, TransactionFormData } from '@/lib/types'
import { CurrencyInput } from '@/components/ui/currency-input'

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null
  onSuccess: () => void
}

export default function TransactionForm({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<TransactionFormData>({
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description || '',
        date: transaction.date,
      })
    } else {
      setForm({
        type: 'expense',
        amount: 0,
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      })
    }
  }, [transaction, open])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.category) {
      toast.error('Selecione uma categoria')
      return
    }
    if (form.amount <= 0) {
      toast.error('O valor deve ser maior que zero')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.')
      setLoading(false)
      return
    }

    const payload = {
      user_id: user.id,
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      description: form.description || null,
      date: form.date,
    }

    let error
    if (transaction) {
      ;({ error } = await supabase.from('transactions').update(payload).eq('id', transaction.id))
    } else {
      ;({ error } = await supabase.from('transactions').insert(payload))
    }

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
    } else {
      toast.success(transaction ? 'Transação atualizada!' : 'Transação criada!')
      onSuccess()
      onOpenChange(false)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'income', category: '' })}
                className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                  form.type === 'income'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'expense', category: '' })}
                className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                  form.type === 'expense'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Despesa
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <CurrencyInput
              value={form.amount}
              onChange={(value) => setForm({ ...form, amount: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) => v && setForm({ ...form, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado, Salário..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
