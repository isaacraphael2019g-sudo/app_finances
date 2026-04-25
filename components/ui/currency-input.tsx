'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d,.]/g, '')
  if (!cleaned) return 0
  // Brazilian format 1.234,56 → remove dots → replace comma
  if (cleaned.includes('.') && cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.')) || 0
  }
  return parseFloat(cleaned) || 0
}

function formatBRL(value: number): string {
  if (!value) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function CurrencyInput({ value, onChange, className, placeholder = '0,00' }: CurrencyInputProps) {
  const [display, setDisplay] = useState(value > 0 ? formatBRL(value) : '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDisplay(value > 0 ? formatBRL(value) : '')
  }, [value, focused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const filtered = e.target.value.replace(/[^\d,.]/g, '')
    setDisplay(filtered)
    onChange(parseAmount(filtered))
  }

  function handleFocus() {
    setFocused(true)
    if (value > 0) setDisplay(value.toFixed(2).replace('.', ','))
  }

  function handleBlur() {
    setFocused(false)
    const num = parseAmount(display)
    onChange(num)
    setDisplay(num > 0 ? formatBRL(num) : '')
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        className={cn('pl-10', className)}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
    </div>
  )
}
