import { cn } from '@/utils/cn'

/** Bloco de carregamento (shimmer). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />
}
