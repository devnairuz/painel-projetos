import { Link } from 'react-router-dom'
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProjects } from '@/hooks/useProjects'
import { updateProjectCharge } from '@/services/projectsService'
import type { Project, ProjectCharge, ProjectTask } from '@/types'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface ChargeRow {
  project: Project
  charge: ProjectCharge
}

interface TaskRow {
  project: Project
  task: ProjectTask
}

const STATUS_COBRANCA_META: Record<ProjectCharge['status'], { label: string; badge: string; dot: string }> = {
  aberta: { label: 'Aberta', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  respondida: { label: 'Respondida', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  resolvida: { label: 'Resolvida', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669' },
  cancelada: { label: 'Cancelada', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: '#64748b' },
}

const LADO_RESPONSAVEL: Record<ProjectCharge['ownerSide'], string> = {
  cliente: 'Cliente',
  nairuz: 'Nairuz',
  terceiro: 'Terceiro',
}

export function PendenciasPage() {
  const { data: projects, loading, reload } = useProjects()
  const list = projects ?? []
  const charges: ChargeRow[] = list.flatMap((project) =>
    (project.charges ?? [])
      .filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada')
      .map((charge) => ({ project, charge })),
  )
  const clientTasks: TaskRow[] = list.flatMap((project) =>
    (project.tasks ?? [])
      .filter((task) => task.clientResponsibility && task.status !== 'concluida')
      .map((task) => ({ project, task })),
  )

  async function setChargeStatus(row: ChargeRow, status: ProjectCharge['status']) {
    await updateProjectCharge(row.project.id, row.charge.id, { status })
    reload()
  }

  return (
    <>
      <PageHeader
        title="Cobranças e pendências"
        subtitle="Fila central de tratativas formais, tarefas do cliente e pontos bloqueantes."
      />

      {loading ? (
        <div className="space-y-5" aria-label="Carregando cobranças e pendências">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-4 p-4 sm:p-5">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3.5 w-28 max-w-full" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          <section aria-label="Resumo das pendências" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric icon={AlertCircle} label="Pendências abertas" value={charges.length} tone="amber" />
            <Metric icon={Clock} label="Tarefas do cliente" value={clientTasks.length} tone="blue" />
            <Metric icon={CheckCircle2} label="Aguardando resolução" value={charges.filter((r) => r.charge.status === 'respondida').length} tone="emerald" />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Cobranças formais"
                subtitle="Itens que exigem acompanhamento e retorno dentro dos projetos."
                className="border-b border-slate-100"
              />
              {charges.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nenhuma cobrança aberta" className="py-8 sm:py-8" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {charges.map((row) => (
                    <li key={row.charge.id} className="px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/projetos/${row.project.id}`}
                            className="group inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-brand-600 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                          >
                            {row.charge.title}
                            <ArrowUpRight className="size-3.5 text-slate-300 transition-colors group-hover:text-brand-600" aria-hidden />
                          </Link>
                          <div className="mt-1 text-sm font-medium text-slate-600">{row.project.clientName}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span>Responsável: {LADO_RESPONSAVEL[row.charge.ownerSide]}</span>
                            <span aria-hidden>•</span>
                            <span>Prioridade: {row.charge.priority}</span>
                            {row.charge.dueDate && (
                              <>
                                <span aria-hidden>•</span>
                                <span>{formatDate(row.charge.dueDate)} · {relativeDeadlineLabel(row.charge.dueDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge meta={STATUS_COBRANCA_META[row.charge.status]} withDot />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setChargeStatus(row, 'respondida')}
                          aria-label={`Marcar cobrança ${row.charge.title} como respondida`}
                        >
                          <Send className="size-3.5" />
                          Respondida
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setChargeStatus(row, 'resolvida')}
                          aria-label={`Resolver cobrança ${row.charge.title}`}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Resolver
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="Responsabilidades do cliente"
                subtitle="Tarefas abertas que dependem de uma ação externa."
                className="border-b border-slate-100"
              />
              {clientTasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nenhuma tarefa do cliente em aberto" className="py-8 sm:py-8" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {clientTasks.map(({ project, task }) => (
                    <li key={task.id}>
                      <Link
                        to={`/projetos/${project.id}`}
                        className="group flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">{task.title}</div>
                          <div className="mt-1 text-sm text-slate-600">{project.clientName}</div>
                          {task.dueDate && (
                            <div className="mt-1.5 text-xs font-medium text-slate-500">
                              {formatDate(task.dueDate)} · {relativeDeadlineLabel(task.dueDate)}
                            </div>
                          )}
                        </div>
                        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlertCircle
  label: string
  value: number
  tone: 'amber' | 'blue' | 'emerald'
}) {
  return (
    <Card className="flex min-h-24 items-center gap-4 p-4 sm:p-5">
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          tone === 'amber' && 'bg-amber-50 text-amber-600',
          tone === 'blue' && 'bg-blue-50 text-blue-600',
          tone === 'emerald' && 'bg-emerald-50 text-emerald-600',
        )}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</div>
        <div className="text-sm leading-snug text-slate-600">{label}</div>
      </div>
    </Card>
  )
}
