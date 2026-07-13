import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  label?: string
}

/** Bloco de carregamento (shimmer). */
export function Skeleton({ className, label = 'Carregando conteúdo' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('animate-pulse rounded-lg bg-slate-200/80', className)}
    />
  )
}
