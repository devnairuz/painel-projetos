import { useState } from 'react'
import { CalendarClock, CheckCircle2, ListChecks, Plus, UserRoundCheck } from 'lucide-react'
import type { Project, ProjectTask, ProjectTaskStatus } from '@/types'
import type { MentionableUser } from '@/services/usersService'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { addProjectTask, updateProjectTask } from '@/services/projectsService'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'

interface ProjectTasksCardProps {
  project: Project
  users: MentionableUser[]
  onProjectChange: (project: Project) => void
}

const STATUS_LABEL: Record<ProjectTaskStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
}

const STATUS_OPTIONS: ProjectTaskStatus[] = ['aberta', 'em_andamento', 'bloqueada', 'concluida']

export function ProjectTasksCard({ project, users, onProjectChange }: ProjectTasksCardProps) {
  const [title, setTitle] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const manualTasks = (project.tasks ?? []).filter((task) => task.source !== 'checklist')
  const visibleTasks = [...manualTasks].sort((a, b) => {
    if (a.status === 'concluida' && b.status !== 'concluida') return 1
    if (a.status !== 'concluida' && b.status === 'concluida') return -1
    return String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? ''))
  })

  function userName(id?: string) {
    return users.find((user) => user.id === id)?.name
  }

  async function handleAdd() {
    if (!title.trim()) return
    const updated = await addProjectTask(project.id, {
      title: title.trim(),
      ownerId: ownerId || undefined,
      dueDate: dueDate || undefined,
      status: 'aberta',
      source: 'manual',
    })
    setTitle('')
    setOwnerId('')
    setDueDate('')
    onProjectChange(updated)
  }

  async function updateTask(task: ProjectTask, patch: Partial<ProjectTask>) {
    onProjectChange(await updateProjectTask(project.id, task.id, patch))
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ListChecks className="size-5 text-brand-600" />
        Tarefas gerais
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Demandas avulsas com responsável direto para a Minha visão.</p>

      <div className="mt-4 space-y-2">
        {visibleTasks.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">
            Nenhuma tarefa geral criada.
          </div>
        ) : (
          visibleTasks.slice(0, 6).map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateTask(task, { status: task.status === 'concluida' ? 'aberta' : 'concluida' })
                  }
                  title={task.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    task.status === 'concluida'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white text-transparent hover:border-brand-400',
                  )}
                >
                  <CheckCircle2 className="size-3.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'truncate text-sm font-semibold',
                      task.status === 'concluida' ? 'text-slate-400 line-through' : 'text-slate-800',
                    )}
                  >
                    {task.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <UserRoundCheck className="size-3.5" />
                    <span>{userName(task.ownerId) ?? 'Sem responsável'}</span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <CalendarClock className="size-3.5" />
                        <span>{formatDate(task.dueDate)}</span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    task.status === 'concluida'
                      ? 'bg-emerald-50 text-emerald-700'
                      : task.status === 'bloqueada'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {STATUS_LABEL[task.status]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <select
                  value={task.ownerId ?? ''}
                  onChange={(e) => updateTask(task, { ownerId: e.target.value })}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Sem responsável</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateTask(task, { status: e.target.value as ProjectTaskStatus })}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={task.dueDate?.slice(0, 10) ?? ''}
                    onChange={(e) => updateTask(task, { dueDate: e.target.value })}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova tarefa geral"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
        />
        <div className="mt-2 grid grid-cols-1 gap-2">
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          >
            <option value="">Responsável</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <Button size="sm" onClick={handleAdd} disabled={!title.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
