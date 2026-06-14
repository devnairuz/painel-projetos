import { cn } from '@/utils/cn'

interface LoaderProps {
  /** Texto ao lado dos pontos. Use string vazia para mostrar só a animação. */
  label?: string
  className?: string
}

/**
 * Loader de pontos pulsantes — mesmo elemento de carregamento do suporte-nairuz
 * (a animação `nz-pulse-dots` vive em index.css). Bom para carregamentos
 * incrementais ("carregar mais") e estados de espera leves.
 */
export function Loader({ label = 'Carregando...', className }: LoaderProps) {
  return (
    <span className={cn('nz-dots', className)} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  )
}
