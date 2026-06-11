import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number // 0..100
  className?: string
  showLabel?: boolean
}

/** Barra de progresso com cor reativa ao avanço. */
export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const color =
    clamped >= 100
      ? 'bg-emerald-500'
      : clamped >= 60
        ? 'bg-brand-500'
        : clamped >= 30
          ? 'bg-amber-500'
          : 'bg-slate-400'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">
          {clamped}%
        </span>
      )}
    </div>
  )
}
