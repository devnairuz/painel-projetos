import { useState } from 'react'
import { Upload, Clock3, Gauge, FileText, Plus } from 'lucide-react'
import type { DeadlineConfidence, Project, TrackingScopeStatus } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { addScopeFile, addTimeEntry, updateProjectTracking } from '@/services/projectsService'
import { formatDate } from '@/utils/dates'

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
  const [entryLabel, setEntryLabel] = useState('')
  const [entryHours, setEntryHours] = useState('')
  const [saving, setSaving] = useState(false)

  const usedHours = tracking.usedHours ?? 0
  const remaining = Math.max(0, Number(estimatedHours || tracking.estimatedHours) - usedHours)

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

  async function handleFile(file?: File) {
    if (!file) return
    const updated = await addScopeFile(project.id, {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedBy: 'Nairuz',
    })
    onProjectChange(updated)
    notify('Escopo anexado ao projeto.')
  }

  async function handleAddTime() {
    const hours = Number(entryHours)
    if (!entryLabel.trim() || !hours) return
    const updated = await addTimeEntry(project.id, {
      label: entryLabel.trim(),
      hours,
      kind: 'realizado',
    })
    setEntryLabel('')
    setEntryHours('')
    onProjectChange(updated)
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Gauge className="size-5 text-brand-600" />
        Tracking
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Escopo, horas consumidas e confiança de prazo.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Estimadas" value={`${Number(estimatedHours) || 0}h`} />
        <Metric label="Usadas" value={`${usedHours}h`} />
        <Metric label="Saldo" value={`${remaining}h`} />
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

      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-600">
        <Upload className="size-4" />
        Anexar escopo
        <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>

      {(project.scopeFiles ?? []).length > 0 && (
        <ul className="mt-3 space-y-1">
          {(project.scopeFiles ?? []).slice(0, 3).map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
              <FileText className="size-3.5 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-slate-400">{formatDate(file.uploadedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock3 className="size-4 text-slate-500" />
          Lançar horas
        </div>
        <div className="grid grid-cols-[1fr_72px_auto] gap-2">
          <input
            value={entryLabel}
            onChange={(e) => setEntryLabel(e.target.value)}
            placeholder="Atividade"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            step="0.25"
            value={entryHours}
            onChange={(e) => setEntryHours(e.target.value)}
            placeholder="h"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <Button size="sm" onClick={handleAddTime}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
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
