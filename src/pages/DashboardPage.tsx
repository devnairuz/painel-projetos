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
          {/* Painel de KPIs em vidro líquido sobre fundo vivo */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-5 shadow-xl sm:p-7">
            {/* Orbes de cor (o vidro refrata isto) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -left-10 size-56 rounded-full bg-brand-500/40 blur-3xl" />
              <div className="absolute top-1/3 -right-6 size-64 rounded-full bg-sky-500/30 blur-3xl" />
              <div className="absolute -bottom-12 left-1/3 size-56 rounded-full bg-violet-500/25 blur-3xl" />
              <div className="absolute -top-6 right-1/4 size-40 rounded-full bg-rose-500/25 blur-3xl" />
            </div>
            {/* Grade fina — a refração do vidro entorta estas linhas */}
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(130% 100% at 50% 0%, #000 45%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(130% 100% at 50% 0%, #000 45%, transparent 100%)',
              }}
            />

            <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={FolderKanban} label="Projetos ativos" value={stats.active.length} tone="brand" />
              <StatCard icon={AlertTriangle} label="Em risco" value={stats.atRisk.length} tone="red" />
              <StatCard icon={Clock} label="Aguardando cliente" value={stats.waitingClient.length} tone="amber" />
              <StatCard icon={Building2} label="Aguardando Nairuz" value={stats.waitingNairuz.length} tone="orange" />
              <StatCard icon={Rocket} label="Go lives próximos (21d)" value={stats.upcoming.length} tone="blue" />
              <StatCard icon={CheckCircle2} label="Prontos para go live" value={stats.readyGoLive.length} tone="emerald" />
              <StatCard icon={BellRing} label="Pendências abertas" value={stats.openCharges.length} tone="amber" />
              <StatCard icon={Upload} label="Escopos pendentes" value={stats.scopePending.length} tone="blue" />
            </div>
          </section>

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

const TONE: Record<Tone, string> = {
  brand: 'bg-brand-400/20 text-brand-200',
  red: 'bg-red-400/20 text-red-200',
  amber: 'bg-amber-400/20 text-amber-200',
  orange: 'bg-orange-400/20 text-orange-200',
  blue: 'bg-sky-400/20 text-sky-200',
  emerald: 'bg-emerald-400/20 text-emerald-200',
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
    <div className="liquid-glass rounded-2xl p-5">
      <div className={cn('mb-3 flex size-10 items-center justify-center rounded-xl', TONE[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-0.5 text-sm text-white/65">{label}</div>
    </div>
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
