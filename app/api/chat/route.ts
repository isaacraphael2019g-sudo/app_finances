import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({
      error: 'Chave OPENROUTER_API_KEY não configurada. Adicione-a no arquivo .env.local e reinicie o servidor.',
    }, { status: 500 })
  }

  const { messages } = await req.json()

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')

  // Busca os últimos 3 meses
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)
  const rangeStart = format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd')
  const rangeEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', rangeStart)
    .lte('date', rangeEnd)
    .order('date', { ascending: false })
    .limit(150)

  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  // Agrupa por mês para o resumo
  const byMonth: Record<string, { income: number; expenses: number }> = {}
  transactions?.forEach(t => {
    const month = t.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0 }
    if (t.type === 'income') byMonth[month].income += Number(t.amount)
    else byMonth[month].expenses += Number(t.amount)
  })

  const monthSummary = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, { income, expenses }]) => {
      const label = format(new Date(month + '-01'), 'MMMM yyyy', { locale: ptBR })
      return `${label}: Receitas ${brl(income)} | Despesas ${brl(expenses)} | Saldo ${brl(income - expenses)}`
    }).join('\n')

  const txLines = transactions?.slice(0, 80).map(t =>
    `${t.date} | ${t.type === 'income' ? 'Receita' : 'Despesa'} | ${brl(Number(t.amount))} | ${t.category}${t.description ? ' — ' + t.description : ''}`
  ).join('\n') ?? 'Nenhuma transação encontrada.'

  const systemPrompt = `Você é um assistente financeiro do app Finance.

INSTRUÇÕES OBRIGATÓRIAS:
- Responda SOMENTE em português brasileiro
- NÃO escreva em inglês em hipótese alguma
- NÃO mostre raciocínio, planejamento ou pensamentos internos
- Seja direto e conciso — vá direto ao ponto

DATA DE HOJE: ${today}

RESUMO POR MÊS (últimos 3 meses):
${monthSummary}

TRANSAÇÕES RECENTES:
${txLines}

REGRAS:
1. Para REGISTRAR uma transação, inclua ao final:
   <transaction>{"type":"expense","amount":50.00,"category":"Alimentação","description":"Mercado","date":"${today}"}</transaction>

2. Categorias DESPESA: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Contas, Compras, Outros
   Categorias RECEITA: Salário, Freelance, Investimentos, Aluguel recebido, Presente, Outros

3. JSON: ponto decimal (15.00), datas YYYY-MM-DD, hoje = ${today}
4. Quando o usuário perguntar sobre um mês específico, use os dados do RESUMO POR MÊS acima`

  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
      'X-Title': 'Finance App',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!aiRes.ok) {
    const err = await aiRes.text()
    return NextResponse.json({ error: `Erro OpenRouter: ${err}` }, { status: aiRes.status })
  }

  const aiData = await aiRes.json()
  const raw = aiData.choices[0]?.message?.content ?? ''
  const content = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  return NextResponse.json({ message: content })
}
