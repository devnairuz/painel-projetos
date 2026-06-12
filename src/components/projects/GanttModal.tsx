import { useEffect, useMemo, useState } from 'react'
import { X, CalendarRange } from 'lucide-react'
import {
  parseISO,
  isValid,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  eachDayOfInterval,
  addDays,
  format,
  max as maxDate,
  min as minDate,
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

type Scale = 'semana' | 'mes' | 'trimestre' | 'ano'

/** Pixels por dia (zoom). "Semana" é a proporção mais ampla. */
const PX_PER_DAY: Record<Scale, number> = { semana: 34, mes: 11, trimestre: 4.5, ano: 1.8 }

function toDate(v?: string): Date | null {
  if (!v) return null
  const d = parseISO(v)
  if (!isValid(d)) return null
  const y = d.getFullYear()
  return y >= 2000 && y <= 2100 ? d : null
}

interface Tick {
  date: Date
  label: string
}

export function GanttModal({ project, onClose }: GanttModalProps) {
  const [scale, setScale] = useState<Scale>('semana')

  // Atualiza ao abrir.
  useEffect(() => {
    notifyChange()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const phases = useMemo(() => [...project.phases].sort((a, b) => a.order - b.order), [project.phases])

  const allDates: Date[] = []
  for (const p of phases) [p.startDate, p.dueDate, p.finishedDate].forEach((v) => {
    const d = toDate(v)
    if (d) allDates.push(d)
  })
  const projStart = toDate(project.startDate)
  const projGoLive = toDate(project.goLiveDate)
  if (projStart) allDates.push(projStart)
  if (projGoLive) allDates.push(projGoLive)

  const hasDates = allDates.length > 0
  const domainStart = hasDates ? startOfMonth(minDate(allDates)) : startOfMonth(new Date())
  const domainEnd = hasDates ? endOfMonth(maxDate(allDates)) : endOfMonth(addDays(new Date(), 60))
  const totalDays = Math.max(1, differenceInCalendarDays(domainEnd, domainStart))

  const pxPerDay = PX_PER_DAY[scale]
  const innerWidth = Math.max(totalDays * pxPerDay, 480)
  const xOf = (d: Date) => differenceInCalendarDays(d, domainStart) * pxPerDay

  const monthGrid = eachMonthOfInterval({ start: domainStart, end: domainEnd })
  const ticks: Tick[] =
    scale === 'semana'
      ? eachDayOfInterval({ start: domainStart, end: domainEnd }).map((d) => ({
          date: d,
          label: d.getDate() === 1 ? format(d, 'dd MMM', { locale: ptBR }) : String(d.getDate()),
        }))
      : monthGrid.map((d) => ({ date: d, label: format(d, 'MMM/yy', { locale: ptBR }) }))

  const today = new Date()
  const todayIn = today >= domainStart && today <= domainEnd
  const todayX = xOf(today)

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
              <p className="text-sm text-slate-500">Role para o lado para ver toda a linha do tempo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              {(['semana', 'mes', 'trimestre', 'ano'] as Scale[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={cn(
                    'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
                    scale === s ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {s === 'mes' ? 'Mês' : s}
                </button>
              ))}
            </div>
            <RefreshButton compact />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Corpo (scroll livre) */}
        <div className="flex-1 overflow-auto p-5">
          {!hasDates ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Defina os prazos (Início/Prevista) nas etapas para visualizar o cronograma.
            </div>
          ) : (
            <div className="min-w-max">
              {/* Header de escala */}
              <div className="flex border-b border-slate-200">
                <div className="sticky left-0 z-10 shrink-0 bg-white" style={{ width: LABEL_W }} />
                <div className="relative shrink-0" style={{ width: innerWidth, height: 26 }}>
                  {ticks.map((t) => (
                    <div
                      key={t.date.toISOString()}
                      className="absolute top-0 flex h-full items-center border-l border-slate-100 pl-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase"
                      style={{ left: `${xOf(t.date)}px` }}
                    >
                      {t.label}
                    </div>
                  ))}
                  {todayIn && (
                    <div className="absolute top-0 h-full" style={{ left: `${todayX}px` }}>
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
                  domainStart={domainStart}
                  innerWidth={innerWidth}
                  monthGrid={monthGrid}
                  xOf={xOf}
                  pxPerDay={pxPerDay}
                  projStart={projStart}
                  todayIn={todayIn}
                  todayX={todayX}
                />
              ))}
            </div>
          )}

          {/* Legenda */}
          {hasDates && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {Object.values(PHASE_STATUS_META).map((m) => (
                <span key={m.label} className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded" style={{ backgroundColor: m.dot }} />
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GanttRow({
  phase,
  domainStart,
  innerWidth,
  monthGrid,
  xOf,
  pxPerDay,
  projStart,
  todayIn,
  todayX,
}: {
  phase: Phase
  domainStart: Date
  innerWidth: number
  monthGrid: Date[]
  xOf: (d: Date) => number
  pxPerDay: number
  projStart: Date | null
  todayIn: boolean
  todayX: number
}) {
  const hasDate = !!(phase.startDate || phase.dueDate || phase.finishedDate)
  const start = toDate(phase.startDate) ?? projStart ?? domainStart
  const endRaw = toDate(phase.finishedDate) ?? toDate(phase.dueDate)
  const end = endRaw ?? addDays(start, 3)
  const safeEnd = end < start ? addDays(start, 1) : end

  const leftPx = Math.max(0, xOf(start))
  const widthPx = Math.max((differenceInCalendarDays(safeEnd, start) + 1) * pxPerDay, 8)
  const color = PHASE_STATUS_META[phase.status].dot

  return (
    <div className="flex items-center border-b border-slate-50">
      <div className="sticky left-0 z-10 shrink-0 bg-white px-3 py-2.5" style={{ width: LABEL_W }}>
        <div className="truncate text-sm font-medium text-slate-700">
          {phase.order}. {phase.name}
        </div>
        <div className="text-[11px] text-slate-400">
          {hasDate ? `${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)}` : 'sem prazo'}
        </div>
      </div>

      <div className="relative shrink-0" style={{ width: innerWidth, height: 42 }}>
        {monthGrid.map((m) => (
          <div key={m.toISOString()} className="absolute top-0 h-full border-l border-slate-100" style={{ left: `${xOf(m)}px` }} />
        ))}
        {todayIn && <div className="absolute top-0 h-full border-l-2 border-red-400/70" style={{ left: `${todayX}px` }} />}
        {hasDate ? (
          <div
            className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-white shadow-sm"
            style={{ left: `${leftPx}px`, width: `${widthPx}px`, backgroundColor: color }}
            title={`${phase.name} · ${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)} · ${PHASE_STATUS_META[phase.status].label}`}
          >
            {widthPx > 60 && <span className="truncate">{PHASE_STATUS_META[phase.status].label}</span>}
          </div>
        ) : (
          <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[11px] text-slate-300">sem prazo definido</div>
        )}
      </div>
    </div>
  )
}
