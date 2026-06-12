import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldAlert,
  Check,
  Clock,
  CircleDot,
  Circle,
  CheckCircle2,
  Flag,
  Star,
} from 'lucide-react'
import { useProject } from '@/hooks/useProjects'
import { useClientAuth } from '@/hooks/useClientAuth'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { NpsGate } from '@/components/cliente/NpsGate'
import { FinalizationUpsell } from '@/components/cliente/FinalizationUpsell'
import { HoursBreakdown } from '@/components/cliente/HoursBreakdown'
import { CommentThread } from '@/components/ui/CommentThread'
import { PLATFORM_META, STATUS_META } from '@/constants'
import type { Phase } from '@/types'
import { approvePhase, addChecklistComment } from '@/services/projectsService'
import { phaseProgress } from '@/utils/projects'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { cn } from '@/utils/cn'
import { History, ClipboardList, Check as CheckIcon } from 'lucide-react'

/** Visível ao cliente (default true). */
function isVisible(phase: Phase): boolean {
  return phase.clientVisible !== false
}

/**
 * Uma etapa precisa do cliente quando é visível, exige aprovação e ainda não
 * foi aprovada (estando concluída ou aguardando retorno).
 */
function needsClient(phase: Phase): boolean {
  if (!isVisible(phase) || !phase.requiresApproval || phase.clientApproved) return false
  return phase.status === 'aguardando_cliente' || phase.status === 'concluida'
}

export function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useClientAuth()
  const { data: project, loading, reload } = useProject(id)
  const { notify } = useToast()

  const pending = useMemo(
    () => (project ? [...project.phases].sort((a, b) => a.order - b.order).filter(needsClient) : []),
    [project],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  // Autorização: o e-mail do cliente precisa estar liberado neste projeto.
  const authorized =
    !!project &&
    !!user &&
    project.clientEmails.some((e) => e.trim().toLowerCase() === user.email.trim().toLowerCase())
  if (!project || !authorized) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Projeto indisponível"
          description="Este projeto não está disponível para a sua conta."
          action={
            <Link to="/cliente" className="text-sm font-medium text-brand-600 hover:underline">
              ← Voltar para seus projetos
            </Link>
          }
        />
      </Card>
    )
  }

  async function handleApprove(phaseId: string) {
    await approvePhase(project!.id, phaseId)
    notify('Obrigado! Sua aprovação foi registrada.')
    reload()
  }

  async function handleAddClientComment(phaseId: string, itemId: string, body: string) {
    await addChecklistComment(project!.id, phaseId, itemId, {
      authorType: 'cliente',
      authorName: user?.name ?? 'Cliente',
      body,
    })
    reload()
  }

  // Cliente só vê etapas marcadas como visíveis.
  const orderedPhases = [...project.phases]
    .filter(isVisible)
    .sort((a, b) => a.order - b.order)
  const isClosed = project.status === 'encerrado'
  const earnedPoints = project.phases
    .filter((ph) => isVisible(ph) && ph.status === 'concluida')
    .reduce((sum, ph) => sum + (ph.points ?? 0), 0)

  // Subtarefas que são responsabilidade do cliente (em etapas visíveis).
  const clientTasks = orderedPhases.flatMap((ph) =>
    ph.checklist
      .filter((item) => item.clientResponsibility)
      .map((item) => ({ phaseId: ph.id, phaseName: ph.name, item })),
  )

  return (
    <>
      <Link
        to="/cliente"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft className="size-4" /> Seus projetos
      </Link>

      {/* Carteira de horas (pontos → horas), só no projeto encerrado */}
      {isClosed && (
        <div className="mb-5">
          <HoursBreakdown project={project} earnedPoints={earnedPoints} />
        </div>
      )}

      {/* Finalização: NPS obrigatório → depois a tela de upsell */}
      {isClosed && !project.nps && (
        <div className="mb-5">
          <NpsGate
            projectId={project.id}
            hoursAfter={project.supportHours.depois}
            onAnswered={reload}
          />
        </div>
      )}
      {isClosed && project.nps && (
        <div className="mb-5">
          <FinalizationUpsell project={project} />
        </div>
      )}

      {/* Cabeçalho */}
      <Card className="mb-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.clientName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge meta={PLATFORM_META[project.platform]} withDot />
              <Badge meta={STATUS_META[project.status]} withDot />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <Star className="size-5 text-amber-500" />
              <div>
                <div className="text-base font-bold leading-none text-amber-700">{earnedPoints}</div>
                <div className="text-[11px] font-medium text-amber-600">pontos</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Flag className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Go live previsto
                </div>
                <div className="text-sm font-semibold text-slate-800">{formatDate(project.goLiveDate)}</div>
                <div className="text-xs text-slate-400">{relativeDeadlineLabel(project.goLiveDate)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Andamento do projeto</span>
            <span className="font-semibold text-slate-900">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>

        {project.nextAction && (
          <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <div className="text-xs font-semibold tracking-wide text-sky-700 uppercase">Próximo passo</div>
            <p className="mt-0.5 text-sm text-sky-900">{project.nextAction}</p>
          </div>
        )}
      </Card>

      {/* Suas tarefas (responsabilidade do cliente, com comentários) */}
      {clientTasks.length > 0 && (
        <Card className="mb-5 overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ClipboardList className="size-5 text-brand-600" />
              Suas tarefas
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Itens sob sua responsabilidade. Responda por aqui — a Nairuz acompanha em tempo real.
            </p>
          </div>
          <ul className="divide-y divide-slate-50">
            {clientTasks.map(({ phaseId, phaseName, item }) => (
              <li key={item.id} className="p-5">
                <div className="mb-2 flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                      item.done ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {item.done && <CheckIcon className="size-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <div className={cn('font-medium', item.done ? 'text-slate-400 line-through' : 'text-slate-800')}>
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-400">{phaseName}</div>
                  </div>
                </div>
                <div className="pl-7">
                  <CommentThread
                    comments={item.comments ?? []}
                    onAdd={(body) => handleAddClientComment(phaseId, item.id, body)}
                    side="cliente"
                    placeholder="Responder / comentar…"
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Precisa de você */}
      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clock className="size-5 text-amber-500" />
            Precisa de você
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Etapas que dependem da sua resposta ou aprovação para avançar.
          </p>
        </div>

        {pending.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            Tudo certo por aqui — nada pendente com você no momento. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {pending.map((phase) => (
              <li key={phase.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{phase.name}</div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    {phase.status === 'aguardando_cliente'
                      ? 'Aguardando informações ou retorno seu.'
                      : 'Etapa concluída — aguardando sua aprovação.'}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleApprove(phase.id)}>
                  <Check className="size-4" />
                  Aprovar etapa
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Linha do tempo */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Linha do tempo</h2>
        <ol className="relative space-y-1">
          {orderedPhases.map((phase, idx) => {
            const { done, total } = phaseProgress(phase)
            const isDone = phase.status === 'concluida'
            const isCurrent = !isDone && phase.status !== 'nao_iniciada'
            return (
              <li key={phase.id} className="flex gap-3">
                {/* Marcador + linha */}
                <div className="flex flex-col items-center">
                  {isDone ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <CircleDot className="size-5 text-brand-500" />
                  ) : (
                    <Circle className="size-5 text-slate-300" />
                  )}
                  {idx < orderedPhases.length - 1 && (
                    <span className={cn('w-px flex-1', isDone ? 'bg-emerald-200' : 'bg-slate-200')} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        isDone ? 'text-slate-500' : isCurrent ? 'text-slate-900' : 'text-slate-400',
                      )}
                    >
                      {phase.name}
                    </span>
                    {isDone ? (
                      <span className="text-xs text-emerald-600">
                        Concluída {phase.finishedDate ? `· ${formatDate(phase.finishedDate)}` : ''}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-xs font-medium text-brand-600">Em andamento</span>
                    ) : (
                      <span className="text-xs text-slate-400">A iniciar</span>
                    )}
                  </div>
                  {isCurrent && total > 0 && (
                    <div className="mt-1.5 max-w-xs">
                      <ProgressBar value={Math.round((done / total) * 100)} />
                    </div>
                  )}
                  {phase.clientApproved && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="size-3" /> Aprovada por você
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </Card>

      {/* Histórico estrutural do projeto */}
      {project.history.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <History className="size-5 text-slate-500" />
            Histórico do projeto
          </h2>
          <ul className="space-y-3">
            {[...project.history]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((entry) => (
                <li key={entry.id} className="flex items-start gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-sm text-slate-700">{entry.label}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(entry.at)} · {entry.actor}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </>
  )
}
