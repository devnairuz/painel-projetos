import { Award, Star, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface RewardsPanelProps {
  points: number
}

const LEVELS = [
  { name: 'Explorador', min: 0 },
  { name: 'Parceiro', min: 50 },
  { name: 'Acelerador', min: 150 },
  { name: 'Campeão', min: 300 },
]

export function RewardsPanel({ points }: RewardsPanelProps) {
  const current = [...LEVELS].reverse().find((level) => points >= level.min) ?? LEVELS[0]
  const next = LEVELS.find((level) => level.min > points)
  const base = current.min
  const goal = next?.min ?? Math.max(points, current.min + 100)
  const progress = goal === base ? 100 : Math.min(100, Math.round(((points - base) / (goal - base)) * 100))

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Trophy className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-500">Nível do projeto</div>
          <div className="text-xl font-bold text-slate-900">{current.name}</div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
          <Star className="size-4" />
          {points} pontos
        </div>
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">
            {next ? `Próximo nível: ${next.name}` : 'Nível máximo alcançado'}
          </span>
          <span className="text-slate-400">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Reward label="Responder aprovações" detail="+ pontos por avanço" />
          <Reward label="Concluir etapas" detail="+ horas convertidas" />
          <Reward label="Avaliar NPS" detail="libera bônus de suporte" />
        </div>
      </div>
    </Card>
  )
}

function Reward({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Award className="size-4 text-brand-600" />
        {label}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{detail}</div>
    </div>
  )
}
