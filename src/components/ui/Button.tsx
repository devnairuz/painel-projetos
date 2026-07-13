import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-700/15 hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm shadow-slate-950/5 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400',
  danger:
    'bg-red-600 text-white shadow-sm shadow-red-800/15 hover:bg-red-700 focus-visible:ring-red-500',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl font-medium',
        'cursor-pointer transition-[color,background-color,border-color,box-shadow,transform]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'active:translate-y-px disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50',
        '[&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
