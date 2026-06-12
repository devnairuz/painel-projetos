import { useEffect } from 'react'
import { X, CalendarRange } from 'lucide-react'
import {
  parseISO,
  isValid,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  addDays,
  format,
  max as maxDate,
  min as minDate,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Phase, Project } from '@/types'
import { PHASE_STATUS_META } from '@/constants'
import { formatDate } from '@/utils/dates'

interface GanttModalProps {
  project: Project
  onClose: () => void
}

const LABEL_W = 220 // px da coluna de nomes

function toDate(v?: string): Date | null {
  if (!v) return null
  const d = parseISO(v)
  return isValid(d) ? d : null
}

/** Painel dedicado (overlay) com o cronograma de Gantt das etapas do projeto. */
export function GanttModal({ project, onClose }: GanttModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const phases = [...project.phases].sort((a, b) => a.order - b.order)

  // Coleta todas as datas conhecidas para definir o intervalo do cronograma.
  const allDates: Date[] = []
  for (const p of phases) {
    ;[p.startDate, p.dueDate, p.finishedDate].forEach((v) => {
      const d = toDate(v)
      if (d) allDates.push(d)
    })
  }
  const projStart = toDate(project.startDate)
  const projGoLive = toDate(project.goLiveDate)
  if (projStart) allDates.push(projStart)
  if (projGoLive) allDates.push(projGoLive)

  const hasDates = allDates.length > 0
  const domainStart = hasDates ? startOfMonth(minDate(allDates)) : startOfMonth(new Date())
  const domainEnd = hasDates ? endOfMonth(maxDate(allDates)) : endOfMonth(addDays(new Date(), 60))
  const totalDays = Math.max(1, differenceInCalendarDays(domainEnd, domainStart))
  const months = eachMonthOfInterval({ start: domainStart, end: domainEnd })
  const innerWidth = Math.max(months.length * 130, 520)

  const pct = (d: Date) => (differenceInCalendarDays(d, domainStart) / totalDays) * 100
  const today = new Date()
  const todayInRange = today >= domainStart && today <= domainEnd
  const todayPct = pct(today)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-brand-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cronograma — {project.clientName}</h2>
              <p className="text-sm text-slate-500">Linha do tempo das etapas por prazo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-auto p-5">
          {!hasDates ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Defina os prazos (Início/Prevista) nas etapas para visualizar o cronograma.
            </div>
          ) : (
            <div className="min-w-max">
              {/* Header de meses */}
              <div className="flex border-b border-slate-200">
                <div
                  className="sticky left-0 z-10 shrink-0 bg-white"
                  style={{ width: LABEL_W }}
                />
                <div className="relative shrink-0" style={{ width: innerWidth, height: 28 }}>
                  {months.map((m) => (
                    <div
                      key={m.toISOString()}
                      className="absolute top-0 flex h-full items-center border-l border-slate-100 pl-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
                      style={{ left: `${pct(m)}%` }}
                    >
                      {format(m, 'MMM/yy', { locale: ptBR })}
                    </div>
                  ))}
                  {todayInRange && (
                    <div className="absolute top-0 h-full" style={{ left: `${todayPct}%` }}>
                      <span className="absolute -translate-x-1/2 rounded bg-red-500 px-1 text-[9px] font-bold text-white">
                        hoje
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linhas das etapas */}
              {phases.map((phase) => (
                <GanttRow
                  key={phase.id}
                  phase={phase}
                  domainStart={domainStart}
                  totalDays={totalDays}
                  innerWidth={innerWidth}
                  months={months}
                  pct={pct}
                  projStart={projStart}
                  todayInRange={todayInRange}
                  todayPct={todayPct}
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
  totalDays,
  innerWidth,
  months,
  pct,
  projStart,
  todayInRange,
  todayPct,
}: {
  phase: Phase
  domainStart: Date
  totalDays: number
  innerWidth: number
  months: Date[]
  pct: (d: Date) => number
  projStart: Date | null
  todayInRange: boolean
  todayPct: number
}) {
  const hasDate = !!(phase.startDate || phase.dueDate || phase.finishedDate)
  const start =
    toDate(phase.startDate) ?? projStart ?? domainStart
  const endRaw = toDate(phase.finishedDate) ?? toDate(phase.dueDate)
  const end = endRaw ?? addDays(start, 5)
  const safeEnd = end < start ? addDays(start, 1) : end

  const leftPct = Math.max(0, Math.min(100, pct(start)))
  const rawWidth = (differenceInCalendarDays(safeEnd, start) / totalDays) * 100
  const widthPct = Math.max(rawWidth, 1.5)
  const color = PHASE_STATUS_META[phase.status].dot

  return (
    <div className="flex items-center border-b border-slate-50">
      <div
        className="sticky left-0 z-10 shrink-0 bg-white px-3 py-2.5"
        style={{ width: LABEL_W }}
      >
        <div className="truncate text-sm font-medium text-slate-700">
          {phase.order}. {phase.name}
        </div>
        <div className="text-[11px] text-slate-400">
          {hasDate ? `${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)}` : 'sem prazo'}
        </div>
      </div>

      <div className="relative shrink-0" style={{ width: innerWidth, height: 44 }}>
        {/* gridlines dos meses */}
        {months.map((m) => (
          <div
            key={m.toISOString()}
            className="absolute top-0 h-full border-l border-slate-100"
            style={{ left: `${pct(m)}%` }}
          />
        ))}
        {/* linha de hoje */}
        {todayInRange && (
          <div
            className="absolute top-0 h-full border-l-2 border-red-400/70"
            style={{ left: `${todayPct}%` }}
          />
        )}
        {/* barra */}
        {hasDate ? (
          <div
            className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-md px-2 text-[10px] font-medium text-white shadow-sm"
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
            title={`${phase.name} · ${formatDate(phase.startDate)} → ${formatDate(phase.finishedDate ?? phase.dueDate)} · ${PHASE_STATUS_META[phase.status].label}`}
          >
            <span className="truncate">{PHASE_STATUS_META[phase.status].label}</span>
          </div>
        ) : (
          <div className="absolute top-1/2 left-2 -translate-y-1/2 text-[11px] text-slate-300">
            sem prazo definido
          </div>
        )}
      </div>
    </div>
  )
}
