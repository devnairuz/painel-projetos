import { useEffect, useRef, useState } from 'react'
import { Clock, Star, Award, Lock, Check } from 'lucide-react'
import type { Project } from '@/types'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { POINTS_PER_HOUR } from '@/utils/gamification'

interface HoursBreakdownProps {
  project: Project
  earnedPoints: number
}

/** Anima um número de 0 até `target` (ease-out cúbico). */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])
  return value
}

function fmtHours(h: number): string {
  const r = Math.round(h * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/**
 * Carteira de horas do cliente (aparece quando o projeto é encerrado).
 * Soma: acompanhamento base + bônus do NPS + horas convertidas dos pontos.
 */
export function HoursBreakdown({ project, earnedPoints }: HoursBreakdownProps) {
  const base = project.supportHours?.antes ?? 0
  const npsBonus = Math.max(0, (project.supportHours?.depois ?? 0) - base)
  const npsActive = !!project.nps
  const pointsHours = earnedPoints / POINTS_PER_HOUR

  const total = base + (npsActive ? npsBonus : 0) + pointsHours
  const potential = base + npsBonus + pointsHours // inclui o bônus ainda bloqueado
  const animated = useCountUp(total)

  const pct = (h: number) => (potential > 0 ? (h / potential) * 100 : 0)

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-navy-900 to-navy-950 px-6 py-6 text-white">
        <div className="flex items-center gap-2 text-sm font-medium text-brand-300">
          <Clock className="size-4" />
          Suas horas de acompanhamento
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-extrabold leading-none tabular-nums">{fmtHours(animated)}</span>
          <span className="mb-1 text-lg font-semibold text-slate-300">horas</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Disponíveis para evoluir e dar manutenção no seu projeto.
        </p>

        {/* Barra segmentada */}
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <Segment width={pct(base)} className="bg-brand-400" />
          <Segment
            width={pct(npsBonus)}
            className={cn(npsActive ? 'bg-emerald-400' : 'bg-emerald-400/25')}
            striped={!npsActive}
          />
          <Segment width={pct(pointsHours)} className="bg-amber-400" />
        </div>
      </div>

      {/* Detalhamento */}
      <div className="divide-y divide-slate-50">
        <Row
          icon={Clock}
          tone="brand"
          title="Acompanhamento base"
          subtitle="Horas mensais incluídas no projeto"
          value={`${fmtHours(base)}h`}
        />
        <Row
          icon={Award}
          tone="emerald"
          title="Bônus por avaliar (NPS)"
          subtitle={
            npsActive ? 'Obrigado por responder o NPS!' : 'Responda o NPS abaixo para liberar'
          }
          value={`+${fmtHours(npsBonus)}h`}
          locked={!npsActive}
        />
        <Row
          icon={Star}
          tone="amber"
          title="Pontos convertidos"
          subtitle={`${earnedPoints} pontos · ${POINTS_PER_HOUR} pontos = 1 hora`}
          value={`+${fmtHours(pointsHours)}h`}
        />
        <div className="flex items-center justify-between bg-slate-50 px-6 py-4">
          <span className="text-sm font-semibold text-slate-700">Total disponível</span>
          <span className="text-lg font-bold text-navy-900">{fmtHours(total)}h</span>
        </div>
      </div>
    </Card>
  )
}

function Segment({ width, className, striped }: { width: number; className: string; striped?: boolean }) {
  return (
    <div
      className={cn('h-full transition-[width] duration-700 ease-out', className)}
      style={{
        width: `${width}%`,
        backgroundImage: striped
          ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 8px)'
          : undefined,
      }}
    />
  )
}

const TONE: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
}

function Row({
  icon: Icon,
  tone,
  title,
  subtitle,
  value,
  locked,
}: {
  icon: typeof Clock
  tone: keyof typeof TONE
  title: string
  subtitle: string
  value: string
  locked?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-3.5">
      <div className={cn('flex size-9 items-center justify-center rounded-xl', TONE[tone].bg, TONE[tone].text)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          {title}
          {locked ? (
            <Lock className="size-3 text-slate-300" />
          ) : (
            <Check className="size-3 text-emerald-500" />
          )}
        </div>
        <div className="text-xs text-slate-400">{subtitle}</div>
      </div>
      <span className={cn('text-sm font-bold tabular-nums', locked ? 'text-slate-300' : 'text-slate-700')}>
        {value}
      </span>
    </div>
  )
}
