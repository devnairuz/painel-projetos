import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  placeholder?: string
}

/** Select nativo estilizado (acessível, leve). */
export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'h-10 w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white pr-9 pl-3 text-sm text-slate-800 shadow-sm shadow-slate-950/5',
          'transition-[color,background-color,border-color,box-shadow] focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none',
          'aria-invalid:border-red-400 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-100',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70',
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
      />
    </div>
  )
}
