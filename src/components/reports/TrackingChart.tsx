import { useMemo } from 'react'
import type { ReportSeries, MonthPoint } from '@/utils/reports'

interface TrackingChartProps {
  series: ReportSeries
  /** Cor da linha do valor realizado. */
  accent?: string
}

const W = 560
const H = 250
const PAD = { top: 26, right: 14, bottom: 34, left: 38 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

const COLOR = {
  grid: 'rgba(255,255,255,0.10)',
  axis: 'rgba(203,213,225,0.75)',
  objetivo: '#7cc4f0',
  media: 'rgba(255,255,255,0.85)',
}

/** Arredonda o teto do eixo Y para um múltiplo "redondo" com folga. */
function niceMax(values: number[]): number {
  const max = Math.max(10, ...values)
  const padded = max * 1.12
  const step = padded > 120 ? 30 : padded > 60 ? 20 : 10
  return Math.ceil(padded / step) * step
}

/** Quebra a série em sub-trechos contínuos (pula os meses sem dado). */
function segments(points: MonthPoint[], pick: (p: MonthPoint) => number | null) {
  const out: { i: number; v: number }[][] = []
  let current: { i: number; v: number }[] = []
  points.forEach((p, i) => {
    const v = pick(p)
    if (v === null) {
      if (current.length) out.push(current)
      current = []
    } else {
      current.push({ i, v })
    }
  })
  if (current.length) out.push(current)
  return out
}

export function TrackingChart({ series, accent = '#52d09e' }: TrackingChartProps) {
  const { points, target } = series
  const n = points.length

  const top = niceMax(useMemo(
    () => [
      target,
      ...points.map((p) => p.value).filter((v): v is number => v !== null),
      ...points.map((p) => p.movingAvg).filter((v): v is number => v !== null),
    ],
    [points, target],
  ))

  const xFor = (i: number) => PAD.left + (n <= 1 ? INNER_W / 2 : (i / (n - 1)) * INNER_W)
  const yFor = (v: number) => PAD.top + (1 - v / top) * INNER_H

  const ticks = useMemo(() => {
    const stepCount = 5
    return Array.from({ length: stepCount + 1 }, (_, i) => Math.round((top / stepCount) * i))
  }, [top])

  const toPath = (pick: (p: MonthPoint) => number | null) =>
    segments(points, pick)
      .map((seg) => seg.map((pt, k) => `${k === 0 ? 'M' : 'L'} ${xFor(pt.i)} ${yFor(pt.v)}`).join(' '))
      .join(' ')

  const valuePoints = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.value !== null) as { p: MonthPoint & { value: number }; i: number }[]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.label}>
      {/* Grade + eixo Y */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke={COLOR.grid} strokeWidth={1} />
          <text x={PAD.left - 6} y={yFor(t) + 3} textAnchor="end" fontSize={9} fill={COLOR.axis}>
            {t}%
          </text>
        </g>
      ))}

      {/* Eixo X — afina os rótulos quando há muitos meses */}
      {points.map((p, i) =>
        n > 14 && i % 2 !== 0 ? null : (
          <text key={p.monthIso} x={xFor(i)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={8.5} fill={COLOR.axis}>
            {p.key}
          </text>
        ),
      )}

      {/* Linha do Objetivo (meta) */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={yFor(target)}
        y2={yFor(target)}
        stroke={COLOR.objetivo}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Média móvel (pontilhada) */}
      <path d={toPath((p) => p.movingAvg)} fill="none" stroke={COLOR.media} strokeWidth={1.5} strokeDasharray="2 4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Valor realizado */}
      <path d={toPath((p) => p.value)} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {valuePoints.map(({ p, i }) => (
        <g key={p.monthIso}>
          <circle cx={xFor(i)} cy={yFor(p.value)} r={3.2} fill={accent} stroke="#0a1f44" strokeWidth={1.2} />
          <text x={xFor(i)} y={yFor(p.value) - 7} textAnchor="middle" fontSize={9} fontWeight={700} fill="#ffffff">
            {p.value}%
          </text>
        </g>
      ))}
    </svg>
  )
}
