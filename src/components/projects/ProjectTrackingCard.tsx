import { useState } from 'react'
import { Gauge } from 'lucide-react'
import type { DeadlineConfidence, Project, TrackingScopeStatus } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { updateProjectTracking } from '@/services/projectsService'

interface ProjectTrackingCardProps {
  project: Project
  onProjectChange: (project: Project) => void
}

const SCOPE_OPTIONS: Array<{ value: TrackingScopeStatus; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'validado', label: 'Validado' },
]

const DEADLINE_OPTIONS: Array<{ value: DeadlineConfidence; label: string }> = [
  { value: 'no_prazo', label: 'No prazo' },
  { value: 'atencao', label: 'Atenção' },
  { value: 'atrasado', label: 'Atrasado' },
]

export function ProjectTrackingCard({ project, onProjectChange }: ProjectTrackingCardProps) {
  const { notify } = useToast()
  const tracking = project.tracking ?? {
    scopeStatus: 'pendente' as TrackingScopeStatus,
    estimatedHours: 0,
    usedHours: 0,
    deadlineConfidence: 'no_prazo' as DeadlineConfidence,
  }
  const [estimatedHours, setEstimatedHours] = useState(String(tracking.estimatedHours))
  const [notes, setNotes] = useState(tracking.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function saveTracking(patch: Partial<typeof tracking>) {
    const updated = await updateProjectTracking(project.id, {
      ...tracking,
      ...patch,
      estimatedHours: Number(estimatedHours) || 0,
      notes,
    })
    onProjectChange(updated)
  }

  async function handleSave() {
    setSaving(true)
    await saveTracking({})
    setSaving(false)
    notify('Tracking atualizado.')
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Gauge className="size-5 text-brand-600" />
        Tracking
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Escopo, horas previstas e confiança de prazo.</p>

      <div className="mt-4">
        <Metric label="Horas previstas" value={`${Number(estimatedHours) || 0}h`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Status do escopo</span>
          <select
            value={tracking.scopeStatus}
            onChange={(e) => saveTracking({ scopeStatus: e.target.value as TrackingScopeStatus })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Prazo</span>
          <select
            value={tracking.deadlineConfidence}
            onChange={(e) => saveTracking({ deadlineConfidence: e.target.value as DeadlineConfidence })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          >
            {DEADLINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          min={0}
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          placeholder="Horas estimadas"
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
        />
        <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
          Salvar
        </Button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notas de prazo, escopo ou riscos..."
        className="mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
      />
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  )
}
