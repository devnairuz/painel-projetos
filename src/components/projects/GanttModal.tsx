import { useEffect, useMemo, useState } from 'react'
import { X, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  parseISO,
  isValid,
  differenceInCalendarDays,
  format,
  getQuarter,
  startOfWeek,
  endOfWeek,
  addWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  startOfYear,
  endOfYear,
  addYears,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  max as maxDate,
  min as minDate,
  addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Phase, Project } from '@/types'
import { PHASE_STATUS_META } from '@/constants'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/dates'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { notifyChange } from '@/services/store'

interface GanttModalProps {
  project: Project
  onClose: () => void
}

const LABEL_W = 220
const WEEK = { weekStartsOn: 1 as const }

type Scale = 'semana' | 'mes' | 'trimestre' | 'ano'

function toDate(v?: string): Date | null {
  if (!v) return null
  const d = parseISO(v)
  if (!isValid(d)) return null
  const y = d.getFullYear()
  return y >= 2000 && y <= 2100 ? d : null
}

/** Janela [start, end] do período escolhido, deslocada por `offset` períodos. */
function getWindow(scale: Scale, anchor: Date, offset: number): { start: Date; end: Date } {
  switch (scale) {
    case 'semana': {
      const start = startOfWeek(addWeeks(startOfWeek(anchor, WEEK), offset), WEEK)
      return { start, end: endOfWeek(start, WEEK) }
    }
    case 'mes': {
      const start = startOfMonth(addMonths(startOfMonth(anchor), offset))
      return { start, end: endOfMonth(start) }
    }
    case 'trimestre': {
      const start = startOfQuarter(addQuarters(startOfQuarter(anchor), offset))
      return { start, end: endOfQuarter(start) }
    }
    case 'ano': {
      const start = startOfYear(addYears(startOfYear(anchor), offset))
      return { start, end: endOfYear(start) }
    }
  }
}

function windowLabel(scale: Scale, start: Date, end: Date): string {
  if (scale === 'semana') return `${format(start, 'dd')} – ${format(end, 'dd MMM yyyy', { locale: ptBR })}`
  if (scale === 'mes') {
    const s = format(start, 'MMMM yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  if (scale === 'trimestre') {
    return `T${getQuarter(start)} ${format(start, 'yyyy')} · ${format(start, 'MMM', { locale: ptBR })}–${format(end, 'MMM', { locale: ptBR })}`
  }
  return format(start, 'yyyy')
}

interface Tick {
  date: Date
  label: string
}

function buildTicks(scale: Scale, start: Date, end: Date): { ticks: Tick[]; grid: Date[] } {
  if (scale === 'semana') {
    const days = eachDayOfInterval({ start, end })
    return { ticks: days.map((d) => ({ date: d, label: format(d, 'eee dd', { locale: ptBR }) })), grid: days }
  }
  if (scale === 'mes') {
    const days = eachDayOfInterval({ start, end })
    return {
      ticks: days.map((d) => ({ date: d, label: String(d.getDate()) })),
      grid: eachWeekOfInterval({ start, end }, WEEK),
    }
  }
  if (scale === 'trimestre') {
    return {
      ticks: eachMonthOfInterval({ start, end }).map((d) => ({ date: d, label: format(d, 'MMMM', { locale: ptBR }) })),
      grid: eachWeekOfInterval({ start, end }, WEEK),
    }
  }
  const months = eachMonthOfInterval({ start, end })
  return { ticks: months.map((d) => ({ date: d, label: format(d, 'MMM', { locale: ptBR }) })), grid: months }
}

export function GanttModal({ project, onClose }: GanttModalProps) {
  const [scale, setScale] = useState<Scale>('mes')
  const [offset, setOffset] = useState(0)

  // Atualiza os dados ao abrir o painel.
  useEffect(() => {
    notifyChange()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const phases = useMemo(() => [...project.phases].sort((a, b) => a.order - b.order), [project.phases])

  // Âncora: hoje se estiver dentro do projeto, senão a 1ª data conhecida.
  const anchor = useMemo(() => {
    const dates: Date[] = []
    for (const p of phases) [p.startDate, p.dueDate, p.finishedDate].forEach((v) => {
      const d = toDate(v)
      if (d) dates.push(d)
    })
    const ps = toDate(project.startDate)
    if (ps) dates.push(ps)
    if (dates.length === 0) return new Date()
    const lo = minDate(dates)
    const hi = maxDate(dates)
    const now = new Date()
    return now >= lo && now <= hi ? now : lo
  }, [phases, project.startDate])

  const { start: winStart, end: winEnd } = getWindow(scale, anchor, offset)
  const totalDays = Math.max(1, differenceInCalendarDays(winEnd, winStart) + 1)
  const { ticks, grid } = buildTicks(scale, winStart, winEnd)

  const pct = (d: Date) => (differenceInCalendarDays(d, winStart) / totalDays) * 100
  const today = new Date()
  const todayIn = today >= winStart && today <= winEnd

  function changeScale(s: Scale) {
    setScale(s)
    setOffset(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-brand-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cronograma — {project.clientName}</h2>
              <p className="text-sm text-slate-500">Linha do tempo das etapas por prazo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              {(['semana', 'mes', 'trimestre', 'ano'] as Scale[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeScale(s)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
                    scale === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {s === 'mes' ? 'Mês' : s === 'trimestre' ? 'Trimestre' : s}
                </button>
              ))}
            </div>
            <RefreshButton compact />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Navegação do período */}
        <div className="flex items-center justify-center gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-56 text-center text-sm font-semibold text-slate-800">
            {windowLabel(scale, winStart, winEnd)}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
            aria-label="Próximo período"
          >
            <ChevronRight className="size-5" />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="text-xs font-medium text-brand-600 hover:underline">
              hoje
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5">
          <div>
            {/* Header de escala */}
            <div className="flex border-b border-slate-200">
              <div className="shrink-0" style={{ width: LABEL_W }} />
              <div className="relative flex-1" style={{ height: 26 }}>
                {ticks.map((t) => (
                  <div
                    key={t.date.toISOString()}
                    className="absolute top-0 flex h-full items-center border-l border-slate-100 pl-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase"
                    style={{ left: `${pct(t.date)}%` }}
                  >
                    {t.label}
                  </div>
                ))}
                {todayIn && (
                  <div className="absolute top-0 h-full" style={{ left: `${pct(today)}%` }}>
                    <span className="absolute -translate-x-1/2 rounded bg-red-500 px-1 text-[9px] font-bold text-white">
                      hoje
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Linhas */}
            {phases.map((phase) => (
              <GanttRow
                key={phase.id}
                phase={phase}
                winStart={winStart}
                winEnd={winEnd}
                projStart={toDate(project.startDate)}
                grid={grid}
                pct={pct}
                todayIn={todayIn}
                today={today}
              />
            ))}
          </div>

          {/* Legenda */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {Object.values(PHASE_STATUS_META).map((m) => (
              <span key={m.label} className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded" style={{ backgroundColor: m.dot }} />
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GanttRow({
  phase,
  winStart,
  winEnd,
  projStart,
  grid,
  pct,
  todayIn,
  today,
}: {
  phase: Phase
  winStart: Date
  winEnd: Date
  projStart: Date | null
  grid: Date[]
  pct: (d: Date) => number
  todayIn: boolean
  today: Date
}) {
  const hasDate = !!(phase.startDate || phase.dueDate || phase.finishedDate)
  const start = toDate(phase.startDate) ?? projStart ?? winStart
  const endRaw = toDate(phase.finishedDate) ?? toDate(phase.dueDate)
  const end = endRaw ?? addDays(start, 3)
  const safeEnd = end < start ? addDays(start, 1) : end
  const color = PHASE_STATUS_META[phase.status].dot

  // Sobreposição com a janela atual.
  const before = safeEnd < winStart
  const after = start > winEnd
  const visible = hasDate && !before && !after
  const cs = start < winStart ? winStart : start
  const ce = safeEnd > winEnd ? winEnd : safeEnd
  const leftPct = Math.max(0, Math.min(100, pct(cs)))
  const rightPct = Math.max(0, Math.min(100, pct(ce) + 100 / Math.max(1, differenceInCalendarDays(winEnd, winStart) + 1)))
  const widthPct = Math.max(rightPct - leftPct, 2)

  return (
    <div className="flex items-center border-b border-slate-50">
      <div className="shrink-0 px-3 py-2.5" style={{ width: LABEL_W }}>
        <div className="truncate text-sm font-medium text-slate-700">
          {phase.order}. {phase.name}
        </div>
        <div className="text-[11px] text-slate-400">
          {hasDate ? `${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)}` : 'sem prazo'}
        </div>
      </div>

      <div className="relative flex-1" style={{ height: 42 }}>
        {/* gridlines */}
        {grid.map((g) => (
          <div key={g.toISOString()} className="absolute top-0 h-full border-l border-slate-100" style={{ left: `${pct(g)}%` }} />
        ))}
        {/* hoje */}
        {todayIn && <div className="absolute top-0 h-full border-l-2 border-red-400/70" style={{ left: `${pct(today)}%` }} />}

        {visible ? (
          <div
            className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-white shadow-sm"
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
            title={`${phase.name} · ${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)} · ${PHASE_STATUS_META[phase.status].label}`}
          >
            {widthPct > 12 && <span className="truncate">{PHASE_STATUS_META[phase.status].label}</span>}
          </div>
        ) : hasDate ? (
          <div className="absolute top-1/2 -translate-y-1/2 text-[11px] text-slate-300" style={{ [before ? 'left' : 'right']: 8 } as React.CSSProperties}>
            {before ? '◀ antes' : 'depois ▶'}
          </div>
        ) : (
          <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[11px] text-slate-300">sem prazo definido</div>
        )}
      </div>
    </div>
  )
}
