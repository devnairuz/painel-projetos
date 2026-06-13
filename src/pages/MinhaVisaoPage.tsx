import { Link } from 'react-router-dom'
import { CheckCircle2, Clock3, UserRoundCheck, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { useLookups } from '@/hooks/useLookups'
import { useProjects } from '@/hooks/useProjects'
import type { Project, ProjectCharge, ProjectTask } from '@/types'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { isAtRisk } from '@/utils/projects'

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
  const list = projects ?? []
  const myProjects = list.filter((project) =>
    (project.collaborators ?? []).includes(user?.id ?? '') ||
    project.owners.csId === myTeamMember?.id ||
    project.owners.techLeadId === myTeamMember?.id ||
    project.owners.designerId === myTeamMember?.id ||
    project.phases.some((phase) => phase.ownerId === myTeamMember?.id),
  )
  const myTasks: TaskRow[] = list.flatMap((project) =>
    (project.tasks ?? [])
      .filter((task) => task.status !== 'concluida' && task.ownerId && task.ownerId === myTeamMember?.id)
      .map((task) => ({ project, task })),
  )
  const myCharges: ChargeRow[] = list.flatMap((project) =>
    (project.charges ?? [])
      .filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada' && charge.ownerId === user?.id)
      .map((charge) => ({ project, charge })),
  )

  return (
    <>
      <PageHeader
        title="Minha visão"
        subtitle="Seu foco do dia: projetos, tarefas, riscos e pendências ligados a você."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Metric icon={UserRoundCheck} label="Meus projetos" value={myProjects.length} />
            <Metric icon={Clock3} label="Minhas tarefas" value={myTasks.length} />
            <Metric icon={AlertTriangle} label="Em risco" value={myProjects.filter(isAtRisk).length} />
            <Metric icon={CheckCircle2} label="Pendências minhas" value={myCharges.length} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Tarefas atribuídas</h2>
                <p className="mt-0.5 text-sm text-slate-500">Itens de checklist normalizados por responsável.</p>
              </div>
              {myTasks.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma tarefa direta para você.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {myTasks.map(({ project, task }) => (
                    <li key={task.id}>
                      <Link to={`/projetos/${project.id}`} className="block px-5 py-4 hover:bg-slate-50">
                        <div className="font-semibold text-slate-800">{task.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{project.clientName}</div>
                        {task.dueDate && (
                          <div className="mt-1 text-xs text-slate-400">
                            {formatDate(task.dueDate)} · {relativeDeadlineLabel(task.dueDate)}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Projetos no seu radar</h2>
                <p className="mt-0.5 text-sm text-slate-500">Colaboração, ownership ou fase atribuída.</p>
              </div>
              {myProjects.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum projeto vinculado diretamente.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {myProjects.map((project) => (
                    <li key={project.id}>
                      <Link to={`/projetos/${project.id}`} className="block px-5 py-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-slate-800">{project.clientName}</div>
                          <span className="text-xs font-semibold text-slate-400">{project.progress}%</span>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={project.progress} />
                        </div>
                        {project.nextAction && <div className="mt-2 text-xs text-slate-500">{project.nextAction}</div>}
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

function Metric({ icon: Icon, label, value }: { icon: typeof UserRoundCheck; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </Card>
  )
}
