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
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date', { ascending: false })
    .limit(50)

  const income = transactions?.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0) ?? 0
  const expenses = transactions?.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) ?? 0
  const balance = income - expenses

  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
  const today = format(now, 'yyyy-MM-dd')
  const monthName = format(now, 'MMMM yyyy', { locale: ptBR })

  const txLines = transactions?.slice(0, 25).map(t =>
    `${t.date} | ${t.type === 'income' ? 'Receita' : 'Despesa'} | ${brl(Number(t.amount))} | ${t.category}${t.description ? ' — ' + t.description : ''}`
  ).join('\n') ?? 'Nenhuma transação este mês.'

  const systemPrompt = `Você é um assistente financeiro pessoal do app Finance. Responda SEMPRE em português brasileiro, de forma concisa e útil.

DATA DE HOJE: ${today}

RESUMO DO MÊS (${monthName}):
• Receitas:  ${brl(income)}
• Despesas:  ${brl(expenses)}
• Saldo:     ${brl(balance)}

TRANSAÇÕES DO MÊS:
${txLines}

━━ REGRAS IMPORTANTES ━━
1. Se o usuário quiser REGISTRAR uma transação, inclua ao final da resposta:
   <transaction>{"type":"expense","amount":50.00,"category":"Alimentação","description":"Mercado","date":"${today}"}</transaction>

2. Categorias DESPESA: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Contas, Compras, Outros
   Categorias RECEITA (type="income"): Salário, Freelance, Investimentos, Aluguel recebido, Presente, Outros

3. Valores no JSON: use ponto decimal (50.00, não 50,00). Datas: YYYY-MM-DD.
4. "hoje" = ${today}. Interprete expressões como "ontem", "semana passada" etc.
5. Responda perguntas sobre gastos analisando os dados acima.
6. Seja direto: sem enrolação, sem blocos de código desnecessários.`

  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://finance-app.local',
      'X-Title': 'Finance App',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat:free',
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
  const content = aiData.choices[0]?.message?.content ?? ''

  return NextResponse.json({ message: content })
}
