import type { Project, ProjectStatus } from '@/types'
import { parseISO, isValid, startOfMonth, subMonths, isSameMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Motor de relatórios mensais no estilo "Acompanhamento de Projetos": para cada
 * métrica produz uma série por mês com o valor realizado (%), a meta (Objetivo)
 * e a média móvel — exatamente os três traços dos gráficos de acompanhamento.
 *
 * As datas reais são esparsas no protótipo; com o histórico real preenchendo,
 * as curvas ganham corpo sem mudar a lógica.
 */

/** Um ponto da série de um mês. `value`/`movingAvg` podem ser nulos (sem base). */
export interface MonthPoint {
  key: string // 'jun/26'
  monthIso: string // início do mês (ISO)
  value: number | null // % realizado no mês
  target: number // meta (Objetivo), %
  movingAvg: number | null // média móvel das últimas N leituras
  /** Numerador/denominador crus, úteis para tooltip. */
  realizado: number
  previsto: number
}

export interface ReportSeries {
  id: string
  label: string
  target: number
  points: MonthPoint[]
  /** Último valor não nulo da série. */
  latest: number | null
  /** Média dos valores não nulos no período. */
  average: number | null
}

export interface MonthlyReport {
  finalizado: ReportSeries
  goLive: ReportSeries
}

export interface ReportOptions {
  /** Quantos meses no período (default 12). */
  months?: number
  /** Janela da média móvel (default 3). */
  movingWindow?: number
  /** Meta da série Finalizado, em % (default 90). */
  targetFinalizado?: number
  /** Meta da série Go-live, em % (default 50). */
  targetGoLive?: number
  /** Mês de referência final (default: mês atual). */
  reference?: Date
}

const DELIVERED: ProjectStatus[] = ['publicado', 'encerrado']

function monthStartOf(iso?: string): Date | undefined {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? startOfMonth(d) : undefined
}

/** Data em que o projeto efetivamente concluiu (última fase concluída → go live → updatedAt). */
function completionDate(project: Project): Date | undefined {
  const finished = project.phases
    .map((ph) => ph.finishedDate)
    .filter((d): d is string => !!d)
    .map((d) => parseISO(d))
    .filter(isValid)
  if (finished.length) return new Date(Math.max(...finished.map((d) => d.getTime())))
  return monthStartOf(project.goLiveDate) ?? monthStartOf(project.updatedAt)
}

/** Mês planejado (a previsão) é o mês do go live. */
function plannedDate(project: Project): Date | undefined {
  return monthStartOf(project.goLiveDate)
}

function ratio(real: number, prev: number): number | null {
  if (prev <= 0) return real > 0 ? 100 : null
  return Math.round((real / prev) * 100)
}

function buildSeries(
  id: string,
  label: string,
  months: Date[],
  target: number,
  movingWindow: number,
  countFor: (month: Date) => { realizado: number; previsto: number },
): ReportSeries {
  const raw = months.map((month) => {
    const { realizado, previsto } = countFor(month)
    return { month, realizado, previsto, value: ratio(realizado, previsto) }
  })

  const points: MonthPoint[] = raw.map((r, i) => {
    // Média móvel: média dos valores não nulos na janela que termina aqui.
    const windowValues = raw
      .slice(Math.max(0, i - movingWindow + 1), i + 1)
      .map((x) => x.value)
      .filter((v): v is number => v !== null)
    const movingAvg = windowValues.length
      ? Math.round(windowValues.reduce((s, v) => s + v, 0) / windowValues.length)
      : null
    return {
      key: format(r.month, 'MMM/yy', { locale: ptBR }),
      monthIso: r.month.toISOString(),
      value: r.value,
      target,
      movingAvg,
      realizado: r.realizado,
      previsto: r.previsto,
    }
  })

  const values = points.map((p) => p.value).filter((v): v is number => v !== null)
  return {
    id,
    label,
    target,
    points,
    latest: values.length ? values[values.length - 1] : null,
    average: values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null,
  }
}

export function buildMonthlyReport(projects: Project[], opts: ReportOptions = {}): MonthlyReport {
  const months = opts.months ?? 12
  const movingWindow = opts.movingWindow ?? 3
  const targetFinalizado = opts.targetFinalizado ?? 90
  const targetGoLive = opts.targetGoLive ?? 50
  const end = startOfMonth(opts.reference ?? new Date())

  const window = Array.from({ length: months }, (_, i) => subMonths(end, months - 1 - i))

  // Pré-computa marcos de cada projeto uma vez.
  const marks = projects.map((project) => ({
    planned: plannedDate(project),
    completed: completionDate(project),
    delivered: DELIVERED.includes(project.status),
    finalized: project.status === 'encerrado',
  }))

  const goLive = buildSeries('go-live', 'Go-live (Entregue)', window, targetGoLive, movingWindow, (month) => {
    const previsto = marks.filter((m) => m.planned && isSameMonth(m.planned, month)).length
    const realizado = marks.filter((m) => m.delivered && m.completed && isSameMonth(m.completed, month)).length
    return { realizado, previsto }
  })

  const finalizado = buildSeries('finalizado', 'Finalizado', window, targetFinalizado, movingWindow, (month) => {
    const previsto = marks.filter((m) => m.planned && isSameMonth(m.planned, month)).length
    const realizado = marks.filter((m) => m.finalized && m.completed && isSameMonth(m.completed, month)).length
    return { realizado, previsto }
  })

  return { finalizado, goLive }
}
