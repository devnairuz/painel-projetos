import type { EnumMeta } from '@/constants'
import { cn } from '@/utils/cn'

interface BadgeProps {
  meta: Pick<EnumMeta, 'label' | 'badge'> & { dot?: string }
  /** Mostra um ponto colorido antes do texto. */
  withDot?: boolean
  className?: string
}

/** Badge de status/categoria com paleta vinda das constantes de domínio. */
export function Badge({ meta, withDot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.badge,
        className,
      )}
    >
      {withDot && meta.dot && (
        <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      )}
      {meta.label}
    </span>
  )
}
