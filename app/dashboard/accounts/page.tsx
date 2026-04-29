'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Wallet, PiggyBank, Banknote, TrendingUp } from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: Wallet },
  { value: 'savings',  label: 'Poupança',       icon: PiggyBank },
  { value: 'cash',     label: 'Dinheiro',        icon: Banknote },
  { value: 'investment', label: 'Investimentos', icon: TrendingUp },
]

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316']

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Account | null>(null)
  const [form, setForm] = useState({ name: '', type: 'checking', color: '#10b981', initial_balance: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: accs } = await supabase.from('accounts').select('*').order('created_at')

    if (accs?.length) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('account_id, type, amount')
        .in('account_id', accs.map(a => a.id))

      const bal: Record<string, number> = {}
      for (const acc of accs) {
        const linked = txs?.filter(t => t.account_id === acc.id) ?? []
        const income  = linked.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
        const expense = linked.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
        bal[acc.id] = Number(acc.initial_balance) + income - expense
      }
      setBalances(bal)
    }

    setAccounts(accs || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setSelected(null)
    setForm({ name: '', type: 'checking', color: '#10b981', initial_balance: 0 })
    setFormOpen(true)
  }

  function openEdit(acc: Account) {
    setSelected(acc)
    setForm({ name: acc.name, type: acc.type, color: acc.color, initial_balance: acc.initial_balance })
    setFormOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Informe um nome'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada'); return }

    const payload = { user_id: user.id, name: form.name.trim(), type: form.type, color: form.color, initial_balance: form.initial_balance }
    const { error } = selected
      ? await supabase.from('accounts').update(payload).eq('id', selected.id)
      : await supabase.from('accounts').insert(payload)

    if (error) toast.error(`Erro: ${error.message}`)
    else { toast.success(selected ? 'Conta atualizada!' : 'Conta criada!'); setFormOpen(false); load() }
  }

  async function handleDelete() {
    if (!selected) return
    const { error } = await createClient().from('accounts').delete().eq('id', selected.id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Conta excluída'); setDeleteOpen(false); load() }
  }

  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
  const totalBalance = accounts.reduce((a, acc) => a + (balances[acc.id] ?? Number(acc.initial_balance)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas contas bancárias</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </div>

      {accounts.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">Patrimônio total</p>
            <p className={`text-3xl font-bold mt-1 ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {brl(totalBalance)}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-card rounded-lg animate-pulse border border-border" />)}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Nenhuma conta cadastrada</p>
            <p className="text-muted-foreground text-sm mt-1">Adicione suas contas bancárias para controlar seu patrimônio</p>
            <Button className="mt-4 gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Adicionar conta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const bal = balances[acc.id] ?? Number(acc.initial_balance)
            const typeLabel = ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type
            return (
              <Card key={acc.id} className="hover:shadow-md transition-shadow" style={{ borderLeftColor: acc.color, borderLeftWidth: 4 }}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{acc.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => { setSelected(acc); setDeleteOpen(true) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold mt-4 ${bal >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                    {brl(bal)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Nubank, Inter, Carteira..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type ?? ''} onValueChange={v => v && setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Saldo inicial</Label>
              <CurrencyInput value={form.initial_balance} onChange={v => setForm({ ...form, initial_balance: v })} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
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
            <DialogDescription>Tem certeza? As transações vinculadas não serão excluídas.</DialogDescription>
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
