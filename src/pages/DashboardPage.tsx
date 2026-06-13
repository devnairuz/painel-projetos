import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  AlertTriangle,
  Clock,
  Building2,
  Rocket,
  CheckCircle2,
  BellRing,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { STATUS_META, RISK_META } from '@/constants'
import type { Project, ProjectStatus } from '@/types'
import { isAtRisk } from '@/utils/projects'
import { daysUntil, formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { cn } from '@/utils/cn'

const FINISHED: ProjectStatus[] = ['encerrado', 'cancelado']

export function DashboardPage() {
  const { data: projects, loading } = useProjects()

  const stats = useMemo(() => {
    const list = projects ?? []
    const active = list.filter((p) => !FINISHED.includes(p.status))
    const upcoming = active
      .filter((p) => {
        const d = daysUntil(p.goLiveDate)
        return p.status !== 'publicado' && d !== undefined && d >= 0 && d <= 21
      })
      .sort((a, b) => (daysUntil(a.goLiveDate) ?? 0) - (daysUntil(b.goLiveDate) ?? 0))
    const atRisk = active.filter(isAtRisk)
    return {
      active,
      upcoming,
      atRisk,
      waitingClient: active.filter((p) => p.status === 'aguardando_cliente'),
      waitingNairuz: active.filter((p) => p.status === 'aguardando_nairuz'),
      readyGoLive: active.filter((p) => p.status === 'pronto_go_live'),
      openCharges: active.flatMap((p) =>
        (p.charges ?? []).filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada'),
      ),
      scopePending: active.filter((p) => (p.tracking?.scopeStatus ?? 'pendente') === 'pendente'),
    }
  }, [projects])

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Panorama operacional das implantações Nairuz"
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Cards de métrica */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={FolderKanban} label="Projetos ativos" value={stats.active.length} tone="brand" />
            <StatCard icon={AlertTriangle} label="Em risco" value={stats.atRisk.length} tone="red" />
            <StatCard icon={Clock} label="Aguardando cliente" value={stats.waitingClient.length} tone="amber" />
            <StatCard icon={Building2} label="Aguardando Nairuz" value={stats.waitingNairuz.length} tone="orange" />
            <StatCard icon={Rocket} label="Go lives próximos (21d)" value={stats.upcoming.length} tone="blue" />
            <StatCard icon={CheckCircle2} label="Prontos para go live" value={stats.readyGoLive.length} tone="emerald" />
            <StatCard icon={BellRing} label="Pendências abertas" value={stats.openCharges.length} tone="amber" />
            <StatCard icon={Upload} label="Escopos pendentes" value={stats.scopePending.length} tone="blue" />
          </div>

          {/* Listas */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ProjectList
              title="Projetos em risco"
              subtitle="Bloqueios ou prazos críticos"
              projects={stats.atRisk}
              emptyLabel="Nenhum projeto em risco no momento. 🎉"
              showRisk
            />
            <ProjectList
              title="Próximos go lives"
              subtitle="Publicações previstas para os próximos 21 dias"
              projects={stats.upcoming}
              emptyLabel="Nenhum go live agendado para as próximas semanas."
              showDeadline
            />
          </div>
        </>
      )}
    </>
  )
}

type Tone = 'brand' | 'red' | 'amber' | 'orange' | 'blue' | 'emerald'

const TONE: Record<Tone, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: Tone
}) {
  return (
    <Card className="p-5">
      <div className={cn('mb-3 flex size-10 items-center justify-center rounded-xl', TONE[tone].bg, TONE[tone].text)}>
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </Card>
  )
}

function ProjectList({
  title,
  subtitle,
  projects,
  emptyLabel,
  showRisk,
  showDeadline,
}: {
  title: string
  subtitle: string
  projects: Project[]
  emptyLabel: string
  showRisk?: boolean
  showDeadline?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      {projects.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projetos/${p.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{p.clientName}</div>
                  <div className="mt-1 w-32">
                    <ProgressBar value={p.progress} />
                  </div>
                </div>
                {showRisk && <Badge meta={RISK_META[p.risk]} withDot />}
                {showDeadline ? (
                  <div className="text-right">
                    <div className="text-sm text-slate-700">{formatDate(p.goLiveDate)}</div>
                    <div className="text-xs text-slate-400">{relativeDeadlineLabel(p.goLiveDate)}</div>
                  </div>
                ) : (
                  <Badge meta={STATUS_META[p.status]} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
