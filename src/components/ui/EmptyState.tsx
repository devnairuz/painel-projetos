import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Estado vazio honesto e bem escrito (sem fingir que há dados). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-5 py-12 text-center sm:px-8 sm:py-16', className)}
      role="status"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
