import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { Blocker, BlockerTarget } from '@/utils/flow'
import { cn } from '@/utils/cn'

interface ActionNeededCardProps {
  blockers: Blocker[]
}

const TARGET_META: Record<BlockerTarget, { label: string; badge: string }> = {
  nairuz: { label: 'Nairuz', badge: 'bg-brand-50 text-brand-700 border-brand-200' },
  cliente: { label: 'Cliente', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  terceiro: { label: 'Terceiro', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const SEVERITY_BORDER = {
  alta: 'border-l-red-400',
  media: 'border-l-amber-400',
  baixa: 'border-l-slate-300',
} as const

/**
 * Equivalente interno do "Precisa de você" do cliente: mostra, num só lugar e
 * no topo do projeto, tudo que trava o avanço — etapas bloqueadas, pendências
 * com o cliente e cobranças — já ordenado por severidade.
 */
export function ActionNeededCard({ blockers }: ActionNeededCardProps) {
  if (blockers.length === 0) {
    return (
      <Card className="mb-5 flex items-center gap-3 border-emerald-200 bg-emerald-50/50 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-800">
          Nada travando o projeto agora — tudo seguindo. 🎉
        </p>
      </Card>
    )
  }

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AlertTriangle className="size-5 text-amber-500" />
          Precisa de ação
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {blockers.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-50">
        {blockers.map((b) => {
          const target = TARGET_META[b.target]
          return (
            <li
              key={b.id}
              className={cn('flex items-start justify-between gap-3 border-l-2 px-5 py-3', SEVERITY_BORDER[b.severity])}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{b.label}</p>
                {b.detail && <p className="mt-0.5 text-xs text-slate-400">{b.detail}</p>}
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                  target.badge,
                )}
              >
                {target.label}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
