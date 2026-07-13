import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

/** Cabeçalho de página: título forte + subtítulo + ação opcional. */
export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:pt-0.5">
          {action}
        </div>
      )}
    </header>
  )
}
