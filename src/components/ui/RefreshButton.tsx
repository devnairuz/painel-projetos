import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
      <button
        onClick={handle}
        title="Atualizar"
        aria-label="Atualizar"
        className={cn('rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700', className)}
      >
        <RefreshCw className={cn('size-4', spinning && 'animate-spin')} />
      </button>
    )
  }

  return (
    <button
      onClick={handle}
      title="Atualizar"
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50',
        className,
      )}
    >
      <RefreshCw className={cn('size-4', spinning && 'animate-spin')} />
      Atualizar
    </button>
  )
}
