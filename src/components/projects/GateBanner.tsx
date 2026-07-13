import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { TRAVA_META } from '@/constants'
import type { GateBlock, GateResult } from '@/utils/gate'
import { cn } from '@/utils/cn'

interface GateBannerProps {
  gate: GateResult
}

interface ListaBloqueiosProps {
  bloqueios: GateBlock[]
  cor: string
  rotulo: string
}

/**
 * Selo do gate (semáforo do Definition of Ready). Expõe separadamente os dois
 * checkpoints da regra: vermelho pendente trava a entrada na esteira; amarelo
 * pendente segura a publicação. Verde quando o respectivo checkpoint libera.
 */
export function GateBanner({ gate }: GateBannerProps) {
  const { bloqueiosInicio, bloqueiosGolive, liberadoParaEsteira, liberadoParaPublicar } = gate
  const gateLiberado = liberadoParaPublicar
  const resumo = gateLiberado
    ? 'Todos os itens obrigatórios estão resolvidos.'
    : !liberadoParaEsteira
      ? 'Há itens que precisam ser resolvidos antes de o projeto entrar na esteira.'
      : 'O projeto pode avançar na esteira, mas ainda há pendências antes da publicação.'

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
      aria-labelledby="titulo-gate-projeto"
      aria-live="polite"
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border',
            gateLiberado
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
              : !liberadoParaEsteira
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-amber-200 bg-amber-50 text-amber-600',
          )}>
            {gateLiberado
              ? <ShieldCheck className="size-5" aria-hidden="true" />
              : <ShieldAlert className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h2 id="titulo-gate-projeto" className="text-sm font-bold text-slate-800">Gate do projeto</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{resumo}</p>
          </div>
        </div>
        <span className={cn(
          'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
          gateLiberado
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : !liberadoParaEsteira
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-700',
        )}>
          <span
            className="size-2 rounded-full"
            style={{
              backgroundColor: gateLiberado
                ? '#059669'
                : !liberadoParaEsteira
                  ? TRAVA_META.trava_inicio.dot
                  : TRAVA_META.trava_golive.dot,
            }}
            aria-hidden="true"
          />
          {gateLiberado ? 'Gate liberado' : !liberadoParaEsteira ? 'Ação necessária' : 'Atenção no go-live'}
        </span>
      </header>

      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <CheckpointEntrada
          bloqueios={bloqueiosInicio}
          liberado={liberadoParaEsteira}
        />
        <CheckpointPublicacao
          bloqueios={bloqueiosGolive}
          liberado={liberadoParaPublicar}
          entradaLiberada={liberadoParaEsteira}
        />
      </div>
    </section>
  )
}

function CheckpointEntrada({ bloqueios, liberado }: { bloqueios: GateBlock[]; liberado: boolean }) {
  const meta = TRAVA_META.trava_inicio

  return (
    <article className={cn(
      'rounded-lg border p-3.5',
      liberado ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn(
            'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            liberado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
          )}>
            {liberado
              ? <CheckCircle2 className="size-4" aria-hidden="true" />
              : <ShieldAlert className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">Checkpoint 1</p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-800">Entrada na esteira</h3>
          </div>
        </div>
        <StatusCheckpoint liberado={liberado} rotuloLiberado="Liberada" rotuloBloqueado="Bloqueada" tom="vermelho" />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        {liberado
          ? 'Sem itens vermelhos pendentes. O projeto pode entrar na esteira.'
          : fraseBloqueio(bloqueios.length, 'impede', 'impedem', 'o início do trabalho')}
      </p>
      <ListaBloqueios bloqueios={bloqueios} cor={meta.dot} rotulo={meta.label} />
    </article>
  )
}

function CheckpointPublicacao({
  bloqueios,
  liberado,
  entradaLiberada,
}: {
  bloqueios: GateBlock[]
  liberado: boolean
  entradaLiberada: boolean
}) {
  const meta = TRAVA_META.trava_golive
  const possuiPendenciasGolive = bloqueios.length > 0
  const tom = possuiPendenciasGolive ? 'amarelo' : 'vermelho'

  return (
    <article className={cn(
      'rounded-lg border p-3.5',
      liberado
        ? 'border-emerald-200 bg-emerald-50/40'
        : possuiPendenciasGolive
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-red-200 bg-red-50/40',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn(
            'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            liberado
              ? 'bg-emerald-100 text-emerald-700'
              : possuiPendenciasGolive
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700',
          )}>
            {liberado
              ? <CheckCircle2 className="size-4" aria-hidden="true" />
              : <ShieldAlert className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">Checkpoint 2</p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-800">Publicação</h3>
          </div>
        </div>
        <StatusCheckpoint liberado={liberado} rotuloLiberado="Liberada" rotuloBloqueado="Retida" tom={tom} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        {liberado
          ? 'Sem itens vermelhos ou amarelos pendentes. O projeto está apto para publicação.'
          : possuiPendenciasGolive
            ? fraseBloqueio(bloqueios.length, 'precisa', 'precisam', 'ser resolvido antes da publicação', 'ser resolvidos antes da publicação')
            : 'A publicação aguarda primeiro a liberação da entrada na esteira.'}
      </p>
      <ListaBloqueios bloqueios={bloqueios} cor={meta.dot} rotulo={meta.label} />
      {!entradaLiberada && possuiPendenciasGolive && (
        <p className="mt-2 border-t border-amber-200/70 pt-2 text-[11px] leading-relaxed text-slate-600">
          A publicação também depende da liberação da entrada na esteira.
        </p>
      )}
    </article>
  )
}

function StatusCheckpoint({
  liberado,
  rotuloLiberado,
  rotuloBloqueado,
  tom,
}: {
  liberado: boolean
  rotuloLiberado: string
  rotuloBloqueado: string
  tom: 'vermelho' | 'amarelo'
}) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold',
      liberado
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : tom === 'vermelho'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
    )}>
      <span
        className="size-1.5 rounded-full"
        style={{
          backgroundColor: liberado
            ? '#059669'
            : tom === 'vermelho'
              ? TRAVA_META.trava_inicio.dot
              : TRAVA_META.trava_golive.dot,
        }}
        aria-hidden="true"
      />
      {liberado ? rotuloLiberado : rotuloBloqueado}
    </span>
  )
}

function ListaBloqueios({ bloqueios, cor, rotulo }: ListaBloqueiosProps) {
  if (bloqueios.length === 0) return null

  const visiveis = bloqueios.slice(0, 2)
  const restantes = bloqueios.length - visiveis.length

  return (
    <div className="mt-3 border-t border-current/10 pt-2.5">
      <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
        {rotulo} · {textoQuantidade(bloqueios.length)}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {visiveis.map(({ phaseName, item }) => (
          <li key={`${phaseName}-${item.id}`} className="flex min-w-0 items-start gap-2 text-xs leading-snug text-slate-700">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-semibold text-slate-800">{item.label}</span>
              <span className="text-slate-500"> · {phaseName}</span>
            </span>
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <p className="mt-2 pl-3.5 text-[11px] font-medium text-slate-500">
          + {restantes === 1 ? '1 outro item' : `${restantes} outros itens`}
        </p>
      )}
    </div>
  )
}

function textoQuantidade(quantidade: number) {
  return quantidade === 1 ? '1 item pendente' : `${quantidade} itens pendentes`
}

function fraseBloqueio(
  quantidade: number,
  verboSingular: string,
  verboPlural: string,
  complementoSingular: string,
  complementoPlural = complementoSingular,
) {
  return `${textoQuantidade(quantidade)} ${quantidade === 1 ? verboSingular : verboPlural} ${
    quantidade === 1 ? complementoSingular : complementoPlural
  }.`
}
