import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { GateResult } from '@/utils/gate'
import { cn } from '@/utils/cn'

interface GateBannerProps {
  gate: GateResult
}

/**
 * Selo do gate (semáforo do Definition of Ready). Resume, num só lugar, a regra:
 * vermelho pendente trava a entrada na esteira; amarelo pendente segura a
 * publicação. Verde quando nada bloqueia. No espírito do `ActionNeededCard`.
 */
export function GateBanner({ gate }: GateBannerProps) {
  const { bloqueiosInicio, bloqueiosGolive, liberadoParaEsteira, liberadoParaPublicar } = gate

  if (liberadoParaPublicar) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-800">
          Gate liberado — sem travas pendentes para esteira e publicação.
        </p>
      </div>
    )
  }

  // Vermelho pendente ⇒ trava a entrada (tom de alerta forte); só amarelo ⇒ atenção.
  const blocksEntry = !liberadoParaEsteira
  const tone = blocksEntry
    ? { wrap: 'border-red-200 bg-red-50/60', icon: 'text-red-600', title: 'text-red-900', text: 'text-red-700' }
    : { wrap: 'border-amber-200 bg-amber-50/60', icon: 'text-amber-600', title: 'text-amber-900', text: 'text-amber-800' }

  return (
    <div className={cn('mb-4 rounded-xl border px-4 py-3', tone.wrap)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className={cn('mt-0.5 size-5 shrink-0', tone.icon)} />
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', tone.title)}>
            {blocksEntry ? 'Gate bloqueado para a esteira' : 'Liberado para esteira — publicação retida'}
          </p>
          <ul className="mt-1.5 space-y-1">
            {bloqueiosInicio.length > 0 && (
              <li className={cn('flex items-center gap-1.5 text-sm', tone.text)}>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                {bloqueiosInicio.length} item(ns) vermelho(s) pendente(s) — bloqueiam a entrada na esteira.
              </li>
            )}
            {bloqueiosGolive.length > 0 && (
              <li className={cn('flex items-center gap-1.5 text-sm', tone.text)}>
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: '#d97706' }} />
                {bloqueiosGolive.length} item(ns) amarelo(s) pendente(s) — seguram a publicação.
              </li>
            )}
            {liberadoParaEsteira && (
              <li className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="size-3.5 shrink-0" />
                Sem vermelhos pendentes: pode entrar na esteira.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
