import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { notifyChange } from '@/services/store'
import { cn } from '@/utils/cn'

interface RefreshButtonProps {
  /** Só o ícone (para cabeçalhos compactos). */
  compact?: boolean
  className?: string
}

/**
 * Puxa os dados mais recentes sob demanda. Dispara o evento do store, que faz
 * todas as telas inscritas (useAsync) revalidarem na hora.
 */
export function RefreshButton({ compact = false, className }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false)

  function handle() {
    notifyChange()
    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 700)
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={handle}
        title="Atualizar dados"
        aria-label={spinning ? 'Atualizando dados' : 'Atualizar dados'}
        aria-busy={spinning}
        className={cn('size-10 px-0 text-slate-600', className)}
      >
        <RefreshCw aria-hidden="true" className={cn('size-4', spinning && 'animate-spin')} />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handle}
      title="Atualizar dados"
      aria-busy={spinning}
      className={cn(
        className,
      )}
    >
      <RefreshCw aria-hidden="true" className={cn('size-4', spinning && 'animate-spin')} />
      Atualizar
    </Button>
  )
}
