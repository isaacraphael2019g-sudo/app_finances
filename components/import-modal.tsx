'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Upload, FileText, CheckSquare, Square } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TransactionType } from '@/lib/types'

interface PreviewRow {
  id: string
  date: string
  type: TransactionType
  amount: number
  category: string
  description: string
  selected: boolean
}

function parseAmount(raw: string): number {
  const cleaned = String(raw).replace(/[^\d,.+-]/g, '')
  if (!cleaned) return 0
  let num: number
  if (cleaned.includes('.') && cleaned.includes(',')) {
    num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  } else if (cleaned.includes(',')) {
    num = parseFloat(cleaned.replace(',', '.'))
  } else {
    num = parseFloat(cleaned)
  }
  return isNaN(num) ? 0 : Math.abs(num)
}

function normalizeDate(raw: string): string {
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/')
    return `${y}-${m}-${d}`
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-')
    return `${y}-${m}-${d}`
  }
  return s
}

function parseCSV(content: string): PreviewRow[] {
  // Skip metadata rows at the top (e.g. bank statement headers) — find the real header line
  const lines = content.split(/\r?\n/)
  let startIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const norm = lines[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if ((norm.includes('data') || norm.includes('date')) && (norm.includes('valor') || norm.includes('amount'))) {
      startIndex = i
      break
    }
  }

  const result = Papa.parse<Record<string, string>>(lines.slice(startIndex).join('\n'), {
    header: true, skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '),
  })
  const rows = result.data
  if (!rows.length) return []
  const keys = Object.keys(rows[0])

  // Search term-first so earlier terms have priority (e.g. 'descricao' beats 'lancamento')
  const findKey = (terms: string[], exclude?: string) => {
    for (const term of terms) {
      const k = keys.find(k => k !== exclude && k.includes(term))
      if (k) return k
    }
    return undefined
  }

  const dateKey = findKey(['data', 'date', 'dt', 'competencia'])
  const amountKey = findKey(['valor', 'amount', 'value', 'vlr', 'vl'])
  const descKey = findKey(['descricao', 'description', 'memo', 'historico', 'lancamento', 'title', 'estabelecimento'], dateKey)
  const typeKey = findKey(['tipo', 'type'])
  const catKey = findKey(['categoria', 'category'])

  if (!dateKey || !amountKey) return []

  return rows.map(row => {
    const rawAmt = row[amountKey] || '0'
    const isNeg = rawAmt.trim().startsWith('-')
    const amount = parseAmount(rawAmt)
    const rawType = typeKey ? row[typeKey]?.toLowerCase().trim() : null
    const type: TransactionType = rawType === 'expense' || rawType === 'despesa'
      ? 'expense'
      : rawType === 'income' || rawType === 'receita'
        ? 'income'
        : isNeg ? 'expense' : 'income'
    const category = (catKey && row[catKey]?.trim()) ? row[catKey].trim() : 'Outros'
    return {
      id: crypto.randomUUID(),
      date: normalizeDate(row[dateKey] || ''),
      type,
      amount,
      category,
      description: descKey ? (row[descKey] || '') : '',
      selected: amount > 0,
    } satisfies PreviewRow
  }).filter(r => r.date && r.amount > 0)
}

function parseOFX(content: string): PreviewRow[] {
  const rows: PreviewRow[] = []
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []
  for (const block of blocks) {
    const get = (tag: string) =>
      block.match(new RegExp(`<${tag}>([^<\r\n]+)`, 'i'))?.[1]?.trim() ?? ''
    const amountStr = get('TRNAMT')
    const dateStr = get('DTPOSTED')
    const memo = get('MEMO') || get('NAME')
    if (!amountStr || !dateStr) continue
    const amount = parseFloat(amountStr)
    const date = dateStr.length >= 8
      ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      : ''
    if (!date) continue
    rows.push({
      id: crypto.randomUUID(),
      date,
      type: amount >= 0 ? 'income' : 'expense',
      amount: Math.abs(amount),
      category: 'Outros',
      description: memo,
      selected: true,
    })
  }
  return rows
}

function parseXLSX(buffer: ArrayBuffer): PreviewRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  if (!data.length) return []

  const keys = Object.keys(data[0]).map(k => ({ original: k, lower: k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }))
  const find = (terms: string[]) => keys.find(k => terms.some(t => k.lower.includes(t)))?.original

  const dateKey = find(['data', 'date', 'dt'])
  const amountKey = find(['valor', 'amount', 'value', 'vlr'])
  const descKey = find(['descricao', 'description', 'memo', 'historico', 'lancamento'])
  const typeKey = find(['tipo', 'type'])
  const catKey = find(['categoria', 'category'])

  if (!dateKey || !amountKey) return []

  return (data as Record<string, unknown>[]).map(row => {
    const rawDate = row[dateKey]
    let date = ''
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().split('T')[0]
    } else {
      date = normalizeDate(String(rawDate))
    }

    const rawAmt = String(row[amountKey] || '0')
    const isNeg = rawAmt.trim().startsWith('-')
    const amount = parseAmount(rawAmt)
    const rawType = typeKey ? String(row[typeKey] || '').toLowerCase().trim() : null
    const type: TransactionType = rawType === 'expense' || rawType === 'despesa'
      ? 'expense'
      : rawType === 'income' || rawType === 'receita'
        ? 'income'
        : isNeg ? 'expense' : 'income'
    const category = (catKey && String(row[catKey] || '').trim()) ? String(row[catKey]).trim() : 'Outros'

    return {
      id: crypto.randomUUID(),
      date,
      type,
      amount,
      category,
      description: descKey ? String(row[descKey] || '') : '',
      selected: amount > 0,
    } satisfies PreviewRow
  }).filter(r => r.date && r.amount > 0)
}

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const ALL_CATS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
  const selectedCount = rows.filter(r => r.selected).length

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setFileName(file.name)
    setRows([])

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let parsed: PreviewRow[] = []

      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text()
        parsed = parseCSV(text)
      } else if (ext === 'ofx' || ext === 'ofc') {
        const text = await file.text()
        parsed = parseOFX(text)
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer()
        parsed = parseXLSX(buffer)
      } else {
        toast.error('Formato não suportado. Use CSV, OFX ou XLSX.')
      }

      if (parsed.length === 0) {
        toast.error('Nenhuma transação encontrada. Verifique o formato do arquivo.')
      } else {
        setRows(parsed)
        toast.success(`${parsed.length} transação(ões) encontrada(s)`)
      }
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique se está correto.')
    }

    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleRow(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll() {
    const allSelected = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  function updateRow(id: string, field: keyof PreviewRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function handleImport() {
    const toImport = rows.filter(r => r.selected)
    if (!toImport.length) return
    setImporting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada'); setImporting(false); return }

    const payload = toImport.map(r => ({
      user_id: user.id,
      type: r.type,
      amount: r.amount,
      category: r.category,
      description: r.description || null,
      date: r.date,
    }))

    const { error } = await supabase.from('transactions').insert(payload)
    if (error) {
      toast.error(`Erro ao importar: ${error.message}`)
    } else {
      toast.success(`${toImport.length} transação(ões) importada(s)!`)
      setRows([])
      setFileName('')
      onSuccess()
      onOpenChange(false)
    }
    setImporting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Transações</DialogTitle>
          <DialogDescription>
            Suportado: CSV, OFX (extrato bancário), XLSX. Colunas esperadas: Data, Valor, Descrição.
          </DialogDescription>
        </DialogHeader>

        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {fileName ? fileName : 'Clique para selecionar ou arraste o arquivo'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">CSV · OFX · XLSX · XLS</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.ofx,.ofc,.xlsx,.xls,.txt"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {loading && (
          <div className="text-center py-4 text-sm text-muted-foreground">Analisando arquivo...</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCount}</span> de {rows.length} selecionadas
              </span>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={toggleAll}>
                {rows.every(r => r.selected)
                  ? <><CheckSquare className="h-3.5 w-3.5" /> Desmarcar todas</>
                  : <><Square className="h-3.5 w-3.5" /> Selecionar todas</>
                }
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 border rounded-lg overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-6"></th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-left min-w-28">Categoria</th>
                    <th className="p-2 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-border ${!row.selected ? 'opacity-40' : ''}`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2 font-mono">{row.date}</td>
                      <td className="p-2">
                        <Select value={row.type} onValueChange={(v) => v && updateRow(row.id, 'type', v)}>
                          <SelectTrigger className="h-6 text-xs w-24 border-0 p-0 shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">
                              <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-950">Receita</Badge>
                            </SelectItem>
                            <SelectItem value="expense">
                              <Badge variant="secondary" className="text-red-600 bg-red-50 dark:bg-red-950">Despesa</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {row.type === 'income'
                          ? <span className="text-green-600">+R$ {row.amount.toFixed(2).replace('.', ',')}</span>
                          : <span className="text-red-600">-R$ {row.amount.toFixed(2).replace('.', ',')}</span>
                        }
                      </td>
                      <td className="p-2">
                        <Select value={row.category} onValueChange={(v) => v && updateRow(row.id, 'category', v)}>
                          <SelectTrigger className="h-6 text-xs w-28 border-0 p-0 shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-muted-foreground truncate max-w-40">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setRows([]); setFileName('') }}>
                Limpar
              </Button>
              <Button
                className="flex-1"
                disabled={selectedCount === 0 || importing}
                onClick={handleImport}
              >
                {importing ? 'Importando...' : `Importar ${selectedCount} transação(ões)`}
              </Button>
            </div>
          </>
        )}

        {!loading && !rows.length && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="font-medium flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Formatos aceitos:</p>
            <p>• <strong>CSV</strong> — colunas: Data, Valor, Descrição (qualquer separador)</p>
            <p>• <strong>OFX</strong> — extrato padrão Open Financial Exchange (Bradesco, Itaú, etc.)</p>
            <p>• <strong>XLSX/XLS</strong> — planilha Excel com cabeçalhos na primeira linha</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
