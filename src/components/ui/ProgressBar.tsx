import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number // 0..100
  className?: string
  showLabel?: boolean
  label?: string
}

/** Barra de progresso com cor reativa ao avanço. */
export function ProgressBar({
  value,
  className,
  showLabel = false,
  label = 'Progresso',
}: ProgressBarProps) {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
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
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped}% concluído`}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-10 text-right text-xs font-semibold tabular-nums text-slate-700">
          {clamped}%
        </span>
      )}
    </div>
  )
}
