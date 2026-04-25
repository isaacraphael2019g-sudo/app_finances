'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Send, Bot, User, TrendingUp, TrendingDown, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  pendingTransaction?: PendingTransaction | null
  transactionSaved?: boolean
}

interface PendingTransaction {
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
}

const QUICK_ACTIONS = [
  'Qual é meu saldo do mês?',
  'Quais são meus maiores gastos?',
  'Como está minha saúde financeira?',
  'Dicas para economizar',
]

function parseTransaction(content: string): PendingTransaction | null {
  const match = content.match(/<transaction>([\s\S]*?)<\/transaction>/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as PendingTransaction
  } catch {
    return null
  }
}

function cleanContent(content: string): string {
  return content.replace(/<transaction>[\s\S]*?<\/transaction>/g, '').trim()
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente financeiro. Posso analisar seus gastos, responder perguntas sobre suas finanças e até registrar transações por aqui. Como posso ajudar?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg]
      .filter(m => !m.pendingTransaction)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao chamar o assistente')
        setMessages(prev => prev.slice(0, -1))
      } else {
        const pending = parseTransaction(data.message)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: cleanContent(data.message),
          pendingTransaction: pending,
        }])
      }
    } catch {
      toast.error('Erro de conexão com o assistente')
      setMessages(prev => prev.slice(0, -1))
    }

    setLoading(false)
  }

  async function confirmTransaction(msgIndex: number, tx: PendingTransaction) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sessão expirada'); return }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description || null,
      date: tx.date,
    })

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
    } else {
      toast.success('Transação registrada!')
      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, transactionSaved: true, pendingTransaction: null } : m
      ))
    }
  }

  function dismissTransaction(msgIndex: number) {
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, pendingTransaction: null } : m
    ))
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="bg-blue-100 dark:bg-blue-950 rounded-full p-2">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Chat Finance AI</h1>
          <p className="text-sm text-muted-foreground">Powered by Llama 3.3 (Groq) · Seus dados financeiros são o contexto</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => sendMessage(action)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {action}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-4">
        <div className="space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`rounded-full p-1.5 h-8 w-8 shrink-0 flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted'
              }`}>
                {msg.role === 'user'
                  ? <User className="h-4 w-4" />
                  : <Bot className="h-4 w-4 text-muted-foreground" />
                }
              </div>
              <div className={`max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>

                {msg.pendingTransaction && (
                  <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 w-full">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Registrar transação?</p>
                      <div className="flex items-center gap-2 text-sm">
                        {msg.pendingTransaction.type === 'income'
                          ? <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
                          : <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />
                        }
                        <span className={`font-semibold ${msg.pendingTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {formatBRL(msg.pendingTransaction.amount)}
                        </span>
                        <Badge variant="secondary" className="text-xs">{msg.pendingTransaction.category}</Badge>
                        {msg.pendingTransaction.description && (
                          <span className="text-muted-foreground truncate">{msg.pendingTransaction.description}</span>
                        )}
                        <span className="text-muted-foreground text-xs ml-auto shrink-0">{msg.pendingTransaction.date}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 gap-1.5 flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => confirmTransaction(i, msg.pendingTransaction!)}>
                          <CheckCircle className="h-3.5 w-3.5" /> Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 flex-1"
                          onClick={() => dismissTransaction(i)}>
                          <XCircle className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {msg.transactionSaved && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Transação registrada!
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="rounded-full p-1.5 h-8 w-8 shrink-0 flex items-center justify-center bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="mt-3 shrink-0">
        <div className="flex gap-2 bg-background border border-border rounded-xl p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite uma pergunta ou diga 'gastei R$50 no mercado'... (Enter para enviar)"
            className="min-h-0 h-10 resize-none border-0 shadow-none focus-visible:ring-0 py-2 text-sm"
            rows={1}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
