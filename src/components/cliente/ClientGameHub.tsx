import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Gift,
  Lock,
  Medal,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import type { Project } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { buildClientGameState, POINTS_PER_HOUR, type GameMission } from '@/utils/gamification'
import { cn } from '@/utils/cn'

interface ClientGameHubProps {
  project: Project
}

export function ClientGameHub({ project }: ClientGameHubProps) {
  const game = buildClientGameState(project)
  const activeMissions = game.missions.filter((mission) => mission.status === 'active')
  const unlocked = game.achievements.filter((achievement) => achievement.unlocked)
  const nextReward = game.nextLevel
    ? `${game.nextLevel.name}: ${game.nextLevel.reward}`
    : 'Todas as recompensas principais desbloqueadas'

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="bg-navy-950 px-5 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-300">
              <Sparkles className="size-4" />
              Jornada de implantação
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight">{game.currentLevel.name}</h2>
              <span className="pb-1 text-sm font-medium text-slate-300">{game.currentLevel.subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-amber-100">
            <Star className="size-4 text-amber-300" />
            <span className="text-sm font-bold">{game.xp} XP</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-200">{nextReward}</span>
            <span className="font-semibold text-brand-200">{game.levelProgress}%</span>
          </div>
          <ProgressBar value={game.levelProgress} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <HeroMetric icon={Trophy} label="Conquistas" value={`${unlocked.length}/${game.achievements.length}`} />
          <HeroMetric icon={Flame} label="Sequência" value={`${game.streak} etapas`} />
          <HeroMetric icon={Gift} label="Horas ganhas" value={`${formatHours(game.earnedHours)}h`} />
          <HeroMetric icon={Zap} label="Conversão" value={`${POINTS_PER_HOUR} pts = 1h`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="border-b border-slate-100 p-5 lg:border-r lg:border-b-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Missões ativas</h3>
              <p className="mt-0.5 text-sm text-slate-400">
                Ações que mais destravam a implantação agora.
              </p>
            </div>
            {activeMissions.length > 0 && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                {activeMissions.length} em aberto
              </span>
            )}
          </div>

          <div className="space-y-2">
            {game.missions.map((mission) => (
              <MissionRow key={mission.id} mission={mission} />
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Conquistas</h3>
              <p className="mt-0.5 text-sm text-slate-400">
                Marcadores de colaboração e avanço.
              </p>
            </div>
            <Medal className="size-5 text-amber-500" />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {game.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  'rounded-xl border px-3 py-3',
                  achievement.unlocked
                    ? 'border-emerald-100 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg',
                      achievement.unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-300',
                    )}
                  >
                    {achievement.unlocked ? <Award className="size-4" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className={cn('truncate text-sm font-semibold', achievement.unlocked ? 'text-emerald-900' : 'text-slate-500')}>
                      {achievement.title}
                    </div>
                    <div className="truncate text-xs text-slate-400">{achievement.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
        <Icon className="size-3.5 text-brand-300" />
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function MissionRow({ mission }: { mission: GameMission }) {
  const active = mission.status === 'active'
  const done = mission.status === 'done'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-3',
        active && 'border-brand-100 bg-brand-50',
        done && 'border-emerald-100 bg-emerald-50',
        mission.status === 'locked' && 'border-slate-100 bg-slate-50',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          active && 'bg-brand-100 text-brand-700',
          done && 'bg-emerald-100 text-emerald-700',
          mission.status === 'locked' && 'bg-white text-slate-300',
        )}
      >
        {done ? <CheckCircle2 className="size-5" /> : active ? <Clock3 className="size-5" /> : <Lock className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-semibold', mission.status === 'locked' ? 'text-slate-500' : 'text-slate-800')}>
          {mission.title}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{mission.detail}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
        +{mission.xp} XP
        {active && <ChevronRight className="size-3.5" />}
      </div>
    </div>
  )
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
