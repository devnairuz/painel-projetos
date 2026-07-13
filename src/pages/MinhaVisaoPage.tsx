import { Link } from 'react-router-dom'
import { ArrowUpRight, BellRing, CheckCircle2, Clock3, UserRoundCheck, AlertTriangle, FolderKanban } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { useLookups } from '@/hooks/useLookups'
import { useProjects } from '@/hooks/useProjects'
import type { Project, ProjectCharge, ProjectTask } from '@/types'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { isAtRisk } from '@/utils/projects'
import { RISK_META } from '@/constants'
import { cn } from '@/utils/cn'

interface TaskRow {
  project: Project
  task: ProjectTask
}

interface ChargeRow {
  project: Project
  charge: ProjectCharge
}

export function MinhaVisaoPage() {
  const { user } = useCompanyAuth()
  const { data: projects, loading } = useProjects()
  const { team } = useLookups()
  const myTeamMember = team?.find((member) => member.name.toLowerCase() === user?.name.toLowerCase())
  const myOwnerIds = new Set(
    [user?.id, myTeamMember?.id].filter((id): id is string => Boolean(id)),
  )
  const isMine = (ownerId?: string) => !!ownerId && myOwnerIds.has(ownerId)
  const list = projects ?? []
  const myProjects = list.filter((project) =>
    (project.collaborators ?? []).some((id) => myOwnerIds.has(id)) ||
    isMine(project.owners.csId) ||
    isMine(project.owners.techLeadId) ||
    isMine(project.owners.designerId) ||
    project.phases.some((phase) => isMine(phase.ownerId) || phase.checklist.some((item) => isMine(item.ownerId))) ||
    (project.tasks ?? []).some((task) => isMine(task.ownerId)) ||
    (project.charges ?? []).some((charge) => isMine(charge.ownerId)),
  )
  const myTasks: TaskRow[] = list.flatMap((project) =>
    (project.tasks ?? [])
      .filter((task) => task.status !== 'concluida' && isMine(task.ownerId))
      .map((task) => ({ project, task })),
  )
  const myCharges: ChargeRow[] = list.flatMap((project) =>
    (project.charges ?? [])
      .filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada' && isMine(charge.ownerId))
      .map((charge) => ({ project, charge })),
  )

  return (
    <>
      <PageHeader
        title="Minha visão"
        subtitle="Seu foco do dia: projetos, tarefas, riscos e pendências ligados a você."
      />

      {loading ? (
        <div className="space-y-5" aria-label="Carregando sua visão de trabalho">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-4 p-4 sm:p-5">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          <section aria-label="Seus indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={UserRoundCheck} label="Meus projetos" value={myProjects.length} tone="brand" />
            <Metric icon={Clock3} label="Minhas tarefas" value={myTasks.length} tone="blue" />
            <Metric icon={AlertTriangle} label="Projetos em risco" value={myProjects.filter(isAtRisk).length} tone="amber" />
            <Metric icon={BellRing} label="Pendências comigo" value={myCharges.length} tone="orange" />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Tarefas atribuídas"
                subtitle="Tarefas gerais ligadas diretamente ao seu usuário."
                className="border-b border-slate-100"
              />
              {myTasks.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nenhuma tarefa direta para você" className="py-8 sm:py-8" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {myTasks.map(({ project, task }) => (
                    <li key={task.id}>
                      <Link
                        to={`/projetos/${project.id}`}
                        className="group flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">{task.title}</div>
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

            <Card className="overflow-hidden">
              <CardHeader
                title="Projetos no seu radar"
                subtitle="Colaboração, responsabilidade ou fase atribuída."
                className="border-b border-slate-100"
              />
              {myProjects.length === 0 ? (
                <EmptyState icon={FolderKanban} title="Nenhum projeto vinculado diretamente" className="py-8 sm:py-8" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {myProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        to={`/projetos/${project.id}`}
                        className="group block px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate font-semibold text-slate-800">{project.clientName}</div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge meta={RISK_META[project.risk]} withDot />
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">{project.progress}%</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={project.progress} label={`Progresso de ${project.clientName}`} />
                        </div>
                        {project.nextAction && (
                          <div className="mt-2 flex items-start justify-between gap-3 text-xs text-slate-600">
                            <span><span className="font-semibold text-slate-700">Próxima ação:</span> {project.nextAction}</span>
                            <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" aria-hidden />
                          </div>
                        )}
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

type TomMetrica = 'brand' | 'blue' | 'amber' | 'orange'

const TOM_METRICA: Record<TomMetrica, string> = {
  brand: 'bg-brand-50 text-brand-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600',
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof UserRoundCheck
  label: string
  value: number
  tone: TomMetrica
}) {
  return (
    <Card className="flex min-h-24 items-center gap-4 p-4 sm:p-5">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TOM_METRICA[tone])}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</div>
        <div className="text-sm text-slate-600">{label}</div>
      </div>
    </Card>
  )
}
