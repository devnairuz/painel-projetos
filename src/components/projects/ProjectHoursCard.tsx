import { useMemo, useState } from 'react'
import { Clock, Play, Square, Plus, Pencil, Trash2, Check, X, Timer } from 'lucide-react'
import type { Project, RunningTimer, TimeEntry } from '@/types'
import type { MentionableUser } from '@/services/usersService'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useToast } from '@/components/ui/Toast'
import { addTimeEntry, updateTimeEntry, removeTimeEntry } from '@/services/projectsService'
import { formatDuration, parseDuration, sumRealizado, hoursByUser } from '@/utils/hours'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'
import { TimerClock } from './TimerClock'

interface ProjectHoursCardProps {
  project: Project
  users: MentionableUser[]
  currentUserId?: string
  runningTimer: RunningTimer | null
  onStartTimer: (target: { phaseId?: string; checklistItemId?: string; label?: string }) => void
  onStopTimer: () => void
  onProjectChange: (project: Project) => void
}

const AVATAR_COLORS = ['#14b885', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0d9488']
const colorFor = (key: string) => {
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function ProjectHoursCard({
  project,
  users,
  currentUserId,
  runningTimer,
  onStartTimer,
  onStopTimer,
  onProjectChange,
}: ProjectHoursCardProps) {
  const { notify } = useToast()
  const phases = useMemo(() => [...project.phases].sort((a, b) => a.order - b.order), [project.phases])
  const entries = project.timeEntries ?? []

  // Seleção do alvo (etapa → subtarefa) para apontar.
  const [phaseId, setPhaseId] = useState('')
  const [checklistItemId, setChecklistItemId] = useState('')
  const [duration, setDuration] = useState('')
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedPhase = phases.find((ph) => ph.id === phaseId)

  const total = sumRealizado(entries)
  const estimated = project.tracking?.estimatedHours ?? 0
  const pct = estimated > 0 ? Math.min(100, (total / estimated) * 100) : 0
  const perUser = hoursByUser(entries)

  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? (id ? 'Usuário' : 'Sem responsável')

  // Rótulo do vínculo de um apontamento (subtarefa › etapa, etapa, ou nota).
  function linkLabel(entry: TimeEntry): string {
    if (entry.checklistItemId) {
      for (const ph of phases) {
        const item = ph.checklist.find((c) => c.id === entry.checklistItemId)
        if (item) return `${ph.name} › ${item.label}`
      }
    }
    if (entry.phaseId) {
      const ph = phases.find((p) => p.id === entry.phaseId)
      if (ph) return ph.name
    }
    return entry.label || 'Geral'
  }

  const isRunningHere = runningTimer?.projectId === project.id
  const runningLabel = runningTimer
    ? linkLabel({
        id: '',
        label: runningTimer.label ?? '',
        hours: 0,
        kind: 'realizado',
        phaseId: runningTimer.phaseId,
        checklistItemId: runningTimer.checklistItemId,
        loggedAt: runningTimer.startedAt,
      })
    : ''

  function handleStart() {
    onStartTimer({
      phaseId: phaseId || undefined,
      checklistItemId: checklistItemId || undefined,
      label: note.trim() || undefined,
    })
  }

  async function handleAddManual() {
    const hours = parseDuration(duration)
    if (hours === null || hours <= 0) {
      notify('Duração inválida. Use 1h30, 1:30, 1.5 ou 90m.', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await addTimeEntry(project.id, {
        hours,
        label: note.trim(),
        kind: 'realizado',
        ownerId: currentUserId,
        loggedAt: logDate ? new Date(logDate).toISOString() : undefined,
        phaseId: phaseId || undefined,
        checklistItemId: checklistItemId || undefined,
        source: 'manual',
      })
      onProjectChange(updated)
      setDuration('')
      setNote('')
      notify('Apontamento registrado.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível registrar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sortedEntries = [...entries].sort((a, b) => (b.loggedAt ?? '').localeCompare(a.loggedAt ?? ''))

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Clock className="size-5 text-brand-600" />
        Horas
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">Cronômetro e apontamento manual por etapa/subtarefa.</p>

      {/* Resumo */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Realizado</div>
            <div className="text-2xl font-bold tabular-nums text-slate-900">{formatDuration(total)}</div>
          </div>
          {estimated > 0 && (
            <div className="text-right text-xs text-slate-400">
              previsto <span className="font-semibold text-slate-600">{formatDuration(estimated)}</span>
            </div>
          )}
        </div>
        {estimated > 0 && <ProgressBar value={pct} className="mt-2" />}
      </div>

      {/* Por pessoa */}
      {perUser.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {perUser.map(({ ownerId, hours }) => (
            <div key={ownerId ?? 'none'} className="flex items-center gap-2">
              <Avatar name={userName(ownerId)} color={colorFor(ownerId ?? 'none')} size="sm" />
              <span className="flex-1 truncate text-sm text-slate-600">{userName(ownerId)}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-800">{formatDuration(hours)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cronômetro em andamento */}
      {runningTimer && (
        <div
          className={cn(
            'mt-4 flex items-center gap-3 rounded-xl border px-3 py-2.5',
            isRunningHere ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-slate-50',
          )}
        >
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand-500" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">
              {isRunningHere ? runningLabel || 'Geral' : 'Rodando em outro projeto'}
            </div>
            <TimerClock startedAt={runningTimer.startedAt} className="text-xs font-semibold tabular-nums text-brand-700" />
          </div>
          <Button size="sm" variant="secondary" onClick={onStopTimer}>
            <Square className="size-3.5" />
            Parar
          </Button>
        </div>
      )}

      {/* Apontar */}
      <div className="mt-4 space-y-2 rounded-xl border border-slate-100 p-3">
        <div className="grid grid-cols-1 gap-2">
          <select
            value={phaseId}
            onChange={(e) => {
              setPhaseId(e.target.value)
              setChecklistItemId('')
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          >
            <option value="">Etapa (opcional)</option>
            {phases.map((ph) => (
              <option key={ph.id} value={ph.id}>{ph.name}</option>
            ))}
          </select>
          {selectedPhase && selectedPhase.checklist.length > 0 && (
            <select
              value={checklistItemId}
              onChange={(e) => setChecklistItemId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="">Subtarefa (opcional)</option>
              {selectedPhase.checklist.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Cronômetro */}
        <Button onClick={handleStart} className="w-full">
          <Play className="size-4" />
          {runningTimer ? 'Trocar cronômetro para este alvo' : 'Iniciar cronômetro'}
        </Button>

        {/* Manual */}
        <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
          <span className="h-px flex-1 bg-slate-100" /> ou manual <span className="h-px flex-1 bg-slate-100" />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="1h30 / 1.5 / 90m"
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          />
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <Button variant="secondary" onClick={handleAddManual} disabled={saving} className="w-full">
          <Plus className="size-4" />
          Adicionar apontamento
        </Button>
      </div>

      {/* Histórico */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Histórico</div>
        {sortedEntries.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
            Nenhuma hora apontada ainda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sortedEntries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                label={linkLabel(entry)}
                owner={userName(entry.ownerId)}
                canEdit={!!entry.ownerId && entry.ownerId === currentUserId}
                onSaved={onProjectChange}
                onError={(m) => notify(m, 'error')}
                projectId={project.id}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function HistoryRow({
  entry,
  label,
  owner,
  canEdit,
  projectId,
  onSaved,
  onError,
}: {
  entry: TimeEntry
  label: string
  owner: string
  canEdit: boolean
  projectId: string
  onSaved: (project: Project) => void
  onError: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [duration, setDuration] = useState(formatDuration(entry.hours))
  const [note, setNote] = useState(entry.label)
  const [date, setDate] = useState((entry.loggedAt ?? '').slice(0, 10))
  const [busy, setBusy] = useState(false)

  async function save() {
    const hours = parseDuration(duration)
    if (hours === null || hours <= 0) {
      onError('Duração inválida. Use 1h30, 1:30, 1.5 ou 90m.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateTimeEntry(projectId, entry.id, {
        hours,
        label: note.trim(),
        loggedAt: date ? new Date(date).toISOString() : undefined,
      })
      onSaved(updated)
      setEditing(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Excluir este apontamento?')) return
    setBusy(true)
    try {
      onSaved(await removeTimeEntry(projectId, entry.id))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-brand-200 bg-brand-50/40 p-2.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="mb-2 h-8 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
        />
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-1.5">
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            title="Salvar"
            className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            title="Cancelar"
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-800">{label}</span>
          {entry.source === 'timer' && <Timer className="size-3 shrink-0 text-slate-300" />}
        </div>
        <div className="truncate text-xs text-slate-400">
          {owner} · {formatDate(entry.loggedAt)}
          {entry.label && entry.label !== label ? ` · ${entry.label}` : ''}
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums text-slate-700">{formatDuration(entry.hours)}</span>
      {canEdit && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            title="Editar"
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            title="Excluir"
            className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  )
}
