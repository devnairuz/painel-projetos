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
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
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
        <div className="space-y-6" aria-label="Carregando indicadores do dashboard">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-4 p-4 sm:p-5">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3.5 w-28 max-w-full" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="space-y-2 border-b border-slate-100 p-5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                </div>
                <div className="space-y-4 p-5">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Cards de métrica */}
          <section aria-label="Indicadores operacionais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FolderKanban} label="Projetos ativos" value={stats.active.length} tone="brand" />
            <StatCard icon={AlertTriangle} label="Em risco" value={stats.atRisk.length} tone="red" />
            <StatCard icon={Clock} label="Aguardando cliente" value={stats.waitingClient.length} tone="amber" />
            <StatCard icon={Building2} label="Aguardando Nairuz" value={stats.waitingNairuz.length} tone="orange" />
            <StatCard icon={Rocket} label="Go lives próximos (21d)" value={stats.upcoming.length} tone="blue" />
            <StatCard icon={CheckCircle2} label="Prontos para go live" value={stats.readyGoLive.length} tone="emerald" />
            <StatCard icon={BellRing} label="Pendências abertas" value={stats.openCharges.length} tone="amber" />
            <StatCard icon={Upload} label="Escopos pendentes" value={stats.scopePending.length} tone="blue" />
          </section>

          {/* Listas */}
          <section aria-label="Projetos que precisam de acompanhamento" className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
          </section>
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
    <Card className="flex min-h-24 items-center gap-4 p-4 sm:p-5">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONE[tone].bg, TONE[tone].text)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</div>
        <div className="text-sm leading-snug text-slate-600">{label}</div>
      </div>
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
      <CardHeader title={title} subtitle={subtitle} className="border-b border-slate-100" />
      {projects.length === 0 ? (
        <EmptyState icon={CheckCircle2} title={emptyLabel} className="py-8 sm:py-8" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projetos/${p.id}`}
                className="group flex flex-col items-stretch gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 focus-visible:bg-slate-50 focus-visible:outline-none sm:flex-row sm:items-center sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-800">{p.clientName}</div>
                  <div className="mt-1.5 flex max-w-44 items-center gap-2">
                    <ProgressBar value={p.progress} label={`Progresso de ${p.clientName}`} className="flex-1" />
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">{p.progress}%</span>
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-start">
                  {showRisk && <Badge meta={RISK_META[p.risk]} withDot />}
                  {showDeadline ? (
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">{formatDate(p.goLiveDate)}</div>
                      <div className="text-xs text-slate-500">{relativeDeadlineLabel(p.goLiveDate)}</div>
                    </div>
                  ) : (
                    <Badge meta={STATUS_META[p.status]} />
                  )}
                  <ArrowUpRight className="hidden size-4 text-slate-300 transition-colors group-hover:text-brand-600 sm:block" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
