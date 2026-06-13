import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Metric icon={AlertCircle} label="Pendências abertas" value={charges.length} tone="amber" />
            <Metric icon={Clock} label="Tarefas do cliente" value={clientTasks.length} tone="blue" />
            <Metric icon={CheckCircle2} label="Respondidas" value={charges.filter((r) => r.charge.status === 'respondida').length} tone="emerald" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Cobranças formais</h2>
                <p className="mt-0.5 text-sm text-slate-500">Itens criados dentro dos projetos.</p>
              </div>
              {charges.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma cobrança aberta.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {charges.map((row) => (
                    <li key={row.charge.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/projetos/${row.project.id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                            {row.charge.title}
                          </Link>
                          <div className="mt-1 text-sm text-slate-500">{row.project.clientName}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                            <span>{row.charge.ownerSide}</span>
                            <span>prioridade {row.charge.priority}</span>
                            {row.charge.dueDate && <span>{formatDate(row.charge.dueDate)} · {relativeDeadlineLabel(row.charge.dueDate)}</span>}
                          </div>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {row.charge.status}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setChargeStatus(row, 'respondida')}>
                          <Send className="size-3.5" />
                          Respondida
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setChargeStatus(row, 'resolvida')}>
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
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Responsabilidades do cliente</h2>
                <p className="mt-0.5 text-sm text-slate-500">Tarefas marcadas no checklist como responsabilidade externa.</p>
              </div>
              {clientTasks.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma tarefa do cliente em aberto.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {clientTasks.map(({ project, task }) => (
                    <li key={task.id} className="px-5 py-3.5">
                      <Link to={`/projetos/${project.id}`} className="block">
                        <div className="font-medium text-slate-800">{task.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{project.clientName}</div>
                        {task.dueDate && <div className="mt-1 text-xs text-slate-400">{formatDate(task.dueDate)}</div>}
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
    <Card className="p-5">
      <div
        className={cn(
          'mb-3 flex size-10 items-center justify-center rounded-xl',
          tone === 'amber' && 'bg-amber-50 text-amber-600',
          tone === 'blue' && 'bg-blue-50 text-blue-600',
          tone === 'emerald' && 'bg-emerald-50 text-emerald-600',
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </Card>
  )
}
