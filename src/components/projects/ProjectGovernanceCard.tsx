import { ShieldCheck, FileBarChart2, LayoutTemplate, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Project, SecurityCheck } from '@/types'
import { Card } from '@/components/ui/Card'
import { updateProjectSecurity } from '@/services/projectsService'
import { formatDate } from '@/utils/dates'

interface ProjectGovernanceCardProps {
  project: Project
  onProjectChange: (project: Project) => void
}

export function ProjectGovernanceCard({ project, onProjectChange }: ProjectGovernanceCardProps) {
  const checklist = project.security?.checklist ?? []
  const completed = checklist.filter((item) => item.done).length

  async function toggle(item: SecurityCheck) {
    const updatedChecklist = checklist.map((check) =>
      check.id === item.id ? { ...check, done: !check.done, updatedAt: new Date().toISOString() } : check,
    )
    onProjectChange(await updateProjectSecurity(project.id, updatedChecklist))
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ShieldCheck className="size-5 text-emerald-600" />
        Segurança e governança
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Checklist mínimo para manter o portal seguro durante o protótipo.
      </p>

      <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {completed}/{checklist.length} verificações concluídas
      </div>

      <ul className="mt-3 space-y-1.5">
        {checklist.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
                {item.done && <Check className="size-3.5 text-emerald-600" />}
              </span>
              <span className={item.done ? 'text-slate-400 line-through' : undefined}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/relatorios"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <FileBarChart2 className="size-4 text-slate-500" />
          Relatórios
        </Link>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
          <LayoutTemplate className="size-4 text-slate-500" />
          Template editável
        </div>
      </div>

      {project.security?.lastReviewAt && (
        <p className="mt-3 text-xs text-slate-400">
          Revisado em {formatDate(project.security.lastReviewAt)}
        </p>
      )}
    </Card>
  )
}
