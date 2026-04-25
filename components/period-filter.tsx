'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  format,
  startOfMonth, endOfMonth,
  subMonths,
  startOfYear, endOfYear,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export type Period = 'day' | 'month' | '3months' | 'year' | 'custom'

interface PeriodFilterProps {
  onFilter: (start: string, end: string, period: Period) => void
  defaultPeriod?: Period
}

const LABELS: Record<Period, string> = {
  day: 'Hoje',
  month: 'Mês',
  '3months': '3 Meses',
  year: 'Anual',
  custom: 'Personalizado',
}

function getDates(period: Period, customStart: string, customEnd: string) {
  const today = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  switch (period) {
    case 'day':
      return { start: fmt(today), end: fmt(today) }
    case 'month':
      return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) }
    case '3months':
      return { start: fmt(startOfMonth(subMonths(today, 2))), end: fmt(endOfMonth(today)) }
    case 'year':
      return { start: fmt(startOfYear(today)), end: fmt(endOfYear(today)) }
    case 'custom':
      return { start: customStart || fmt(startOfMonth(today)), end: customEnd || fmt(endOfMonth(today)) }
  }
}

export default function PeriodFilter({ onFilter, defaultPeriod = 'month' }: PeriodFilterProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  function apply(p: Period, cs = customStart, ce = customEnd) {
    const { start, end } = getDates(p, cs, ce)
    onFilter(start, end, p)
  }

  function selectPeriod(p: Period) {
    setPeriod(p)
    if (p !== 'custom') apply(p)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as Period[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            className={cn('h-8 text-xs', period === p && 'shadow-sm')}
            onClick={() => selectPeriod(p)}
          >
            {LABELS[p]}
          </Button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap gap-3 items-end p-3 bg-muted/40 rounded-lg border border-border">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              className="h-8 text-sm w-40 bg-background"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              className="h-8 text-sm w-40 bg-background"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8" onClick={() => apply('custom', customStart, customEnd)}>
            Filtrar
          </Button>
        </div>
      )}
    </div>
  )
}
