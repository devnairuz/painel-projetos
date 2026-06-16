import { useMemo, useState, useEffect } from 'react'
import { BarChart3, ClipboardCopy, ShieldCheck, Star, Timer, Upload, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProjects } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { useToast } from '@/components/ui/Toast'
import { TrackingChart } from '@/components/reports/TrackingChart'
import { SatisfactionTable } from '@/components/reports/SatisfactionTable'
import { buildMonthlyReport, type ReportSeries } from '@/utils/reports'
import { useReportTargets, type ReportTargets } from '@/hooks/useReportTargets'
import type { Project } from '@/types'
import { cn } from '@/utils/cn'

const ACCENT = { finalizado: '#52d09e', goLive: '#61b6e8' }

export function RelatoriosPage() {
  const { data: projects, loading } = useProjects()
  const { getOrg } = useLookups()
  const { notify } = useToast()
  const list = projects ?? []
  const [months, setMonths] = useState(12)
  const { targets, setTargets } = useReportTargets()

  const report = useMemo(
    () =>
      buildMonthlyReport(list, {
        months,
        targetFinalizado: targets.finalizado,
        targetGoLive: targets.goLive,
      }),
    [list, months, targets],
  )

  const active = list.filter((project) => !['encerrado', 'cancelado'].includes(project.status))
  const charges = list.flatMap((project) => project.charges ?? [])
  const openCharges = charges.filter((charge) => charge.status !== 'resolvida' && charge.status !== 'cancelada')
  const nps = list.map((project) => project.nps?.score).filter((score): score is number => typeof score === 'number')
  const avgNps = nps.length ? Math.round((nps.reduce((sum, score) => sum + score, 0) / nps.length) * 10) / 10 : 0
  const estimatedHours = sum(list, (project) => project.tracking?.estimatedHours ?? 0)
  const usedHours = sum(list, (project) => project.tracking?.usedHours ?? 0)
  const scopeReceived = list.filter((project) => project.tracking?.scopeStatus === 'recebido' || project.tracking?.scopeStatus === 'validado').length
  const securityDone = list.reduce((count, project) => count + (project.security?.checklist ?? []).filter((item) => item.done).length, 0)
  const securityTotal = list.reduce((count, project) => count + (project.security?.checklist ?? []).length, 0)

  async function copySummary() {
    const text = [
      'Relatório operacional do Portal de Projetos',
      `Período: últimos ${months} meses`,
      `Finalizado (último mês): ${fmtPct(report.finalizado.latest)} (meta ${report.finalizado.target}%)`,
      `Go-live (último mês): ${fmtPct(report.goLive.latest)} (meta ${report.goLive.target}%)`,
      `Projetos ativos: ${active.length}`,
      `Pendências abertas: ${openCharges.length}`,
      `NPS médio: ${avgNps || '-'}`,
      `Horas: ${usedHours}/${estimatedHours}`,
      `Escopos recebidos/validados: ${scopeReceived}/${list.length}`,
      `Segurança: ${securityDone}/${securityTotal}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    notify('Resumo copiado.')
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores operacionais para acompanhamento da implantação."
        action={
          <Button variant="secondary" onClick={copySummary}>
            <ClipboardCopy className="size-4" />
            Copiar resumo
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <>
          {/* ── Acompanhamento de Projetos ── */}
          <Card className="overflow-hidden border-0 p-0">
            <div className="bg-gradient-to-b from-navy-900 to-navy-950 px-6 py-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-white uppercase">
                  <TrendingUp className="size-5 text-brand-300" />
                  Acompanhamento de Projetos
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <MetasEditor targets={targets} onChange={setTargets} />
                  <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 p-0.5">
                    {[6, 12].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonths(m)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                          months === m ? 'bg-white/90 text-navy-900' : 'text-slate-300 hover:text-white',
                        )}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartBox series={report.finalizado} accent={ACCENT.finalizado} />
                <ChartBox series={report.goLive} accent={ACCENT.goLive} />
              </div>
            </div>
          </Card>

          {/* ── Pesquisa de Satisfação (Média NPS) ── */}
          <Card className="mt-5 overflow-hidden">
            <div className="flex items-center gap-2 bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-4 text-white">
              <Star className="size-5 text-brand-300" />
              <h2 className="text-lg font-bold tracking-wide uppercase">Média NPS — Projetos</h2>
            </div>
            <SatisfactionTable projects={list} getOrgName={(id) => getOrg(id)?.name ?? '—'} />
          </Card>

          {/* ── Indicadores operacionais ── */}
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Metric icon={BarChart3} label="Projetos ativos" value={active.length} />
            <Metric icon={Star} label="NPS médio" value={avgNps || '-'} />
            <Metric icon={Timer} label="Horas usadas" value={`${usedHours}/${estimatedHours || 0}h`} />
            <Metric icon={Upload} label="Escopos recebidos" value={`${scopeReceived}/${list.length}`} />
            <Metric icon={ShieldCheck} label="Segurança" value={`${securityDone}/${securityTotal || 0}`} />
            <Metric icon={BarChart3} label="Pendências abertas" value={openCharges.length} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-900">Distribuição de status</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(groupBy(list, (project) => project.status)).map(([status, count]) => (
                  <Bar key={status} label={status} value={count} total={list.length || 1} />
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-900">Confiança de prazo</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(groupBy(list, (project) => project.tracking?.deadlineConfidence ?? 'no_prazo')).map(([status, count]) => (
                  <Bar key={status} label={status} value={count} total={list.length || 1} />
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

/** Editor inline das metas (Objetivo) de cada série. */
function MetasEditor({ targets, onChange }: { targets: ReportTargets; onChange: (next: ReportTargets) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">
      <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Metas</span>
      <TargetInput
        label="Finalizado"
        value={targets.finalizado}
        onCommit={(v) => onChange({ ...targets, finalizado: v })}
      />
      <TargetInput
        label="Go-live"
        value={targets.goLive}
        onCommit={(v) => onChange({ ...targets, goLive: v })}
      />
    </div>
  )
}

function TargetInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value))

  // Sincroniza quando o valor muda por fora.
  useEffect(() => {
    setText(String(value))
  }, [value])

  function commit() {
    const parsed = Number(text)
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    else setText(String(value))
  }

  return (
    <label className="flex items-center gap-1 text-[11px] text-slate-300" title={`Meta de ${label}`}>
      {label}
      <input
        type="number"
        min={0}
        max={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-12 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-center text-xs font-semibold text-white outline-none focus:border-brand-300"
      />
      <span className="text-slate-400">%</span>
    </label>
  )
}

/** Caixa de gráfico no estilo da referência: título, indicador-resumo e legenda. */
function ChartBox({ series, accent }: { series: ReportSeries; accent: string }) {
  const onTarget = series.latest !== null && series.latest >= series.target
  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{series.label}</h3>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold',
            series.latest === null
              ? 'bg-white/10 text-slate-300'
              : onTarget
                ? 'bg-emerald-400/15 text-emerald-300'
                : 'bg-amber-400/15 text-amber-300',
          )}
        >
          {fmtPct(series.latest)} · meta {series.target}%
        </span>
      </div>
      <TrackingChart series={series} accent={accent} />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300">
        <LegendItem label={`% ${series.label.split(' ')[0]}`} color={accent} />
        <LegendItem label="Objetivo" color="#7cc4f0" />
        <LegendItem label="Média Móvel" color="rgba(255,255,255,0.85)" dashed />
      </div>
    </div>
  )
}

function LegendItem({ label, color, dashed }: { label: string; color: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={18} height={6} aria-hidden>
        <line x1={0} y1={3} x2={18} y2={3} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '2 3' : undefined} strokeLinecap="round" />
      </svg>
      {label}
    </span>
  )
}

function fmtPct(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function sum(projects: Project[], fn: (project: Project) => number): number {
  return projects.reduce((total, project) => total + fn(project), 0)
}

function groupBy(projects: Project[], fn: (project: Project) => string): Record<string, number> {
  return projects.reduce<Record<string, number>>((acc, project) => {
    const key = fn(project)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function Metric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="size-5" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </Card>
  )
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{label.replaceAll('_', ' ')}</span>
        <span className="text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${(value / total) * 100}%` }} />
      </div>
    </div>
  )
}
