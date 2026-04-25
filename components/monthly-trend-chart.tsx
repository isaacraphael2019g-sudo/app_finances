'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface MonthData {
  month: string
  Receitas: number
  Despesas: number
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1 capitalize">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: R$ {p.value.toFixed(2).replace('.', ',')}
        </p>
      ))}
    </div>
  )
}

export default function MonthlyTrendChart({ data }: { data: MonthData[] }) {
  if (data.every(d => d.Receitas === 0 && d.Despesas === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={4} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground capitalize"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => <span className="text-sm text-muted-foreground">{v}</span>} />
        <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
