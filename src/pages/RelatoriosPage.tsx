import { useMemo, useState, useEffect } from 'react'
import { BarChart3, ClipboardCopy, Download, FolderKanban, ShieldCheck, Star, Timer, Upload, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProjects } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { useToast } from '@/components/ui/Toast'
import { TrackingChart } from '@/components/reports/TrackingChart'
import { SatisfactionTable } from '@/components/reports/SatisfactionTable'
import { buildMonthlyReport, type ReportSeries } from '@/utils/reports'
import { useReportTargets, type ReportTargets } from '@/hooks/useReportTargets'
import { SATISFACTION_EXPORT_HEADERS, satisfactionExportRow } from '@/constants/satisfaction'
import { toCsv, downloadCsv } from '@/utils/csv'
import { STATUS_META } from '@/constants'
import type { DeadlineConfidence, Project, ProjectStatus } from '@/types'
import { cn } from '@/utils/cn'

const ACCENT = { finalizado: '#52d09e', goLive: '#61b6e8' }

const CONFIANCA_PRAZO_LABEL: Record<DeadlineConfidence, string> = {
  no_prazo: 'No prazo',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
}

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

  function handleExportCsv() {
    const rows: (string | number)[][] = [
      ['Relatório operacional — Portal de Projetos'],
      [`Gerado em ${new Date().toLocaleDateString('pt-BR')} · período do gráfico: últimos ${months} meses`],
      [],
      ['Indicadores'],
      ['Projetos ativos', active.length],
      ['NPS médio', avgNps || ''],
      ['Horas usadas', `${usedHours}/${estimatedHours}`],
      ['Escopos recebidos/validados', `${scopeReceived}/${list.length}`],
      ['Segurança', `${securityDone}/${securityTotal}`],
      ['Pendências abertas', openCharges.length],
      [],
      ['Média NPS - Projetos'],
      SATISFACTION_EXPORT_HEADERS,
      ...list
        .filter((project) => project.nps)
        .map((project) =>
          satisfactionExportRow(project.nps!, project.clientName, getOrg(project.organizationId)?.name ?? '—'),
        ),
    ]
    downloadCsv(`relatorio-projetos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
    notify('Relatório exportado (CSV).')
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores operacionais para acompanhamento da implantação."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={copySummary}>
              <ClipboardCopy className="size-4" />
              Copiar resumo
            </Button>
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="size-4" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-5" aria-label="Carregando relatórios">
          <Skeleton className="h-[34rem] w-full rounded-2xl lg:h-96" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="Ainda não há dados para o relatório"
            description="Os indicadores serão calculados assim que os primeiros projetos forem cadastrados."
          />
        </Card>
      ) : (
        <>
          {/* ── Acompanhamento de Projetos ── */}
          <Card className="overflow-hidden border-0 p-0">
            <div className="bg-gradient-to-b from-navy-900 to-navy-950 px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-white uppercase">
                  <TrendingUp className="size-5 text-brand-300" />
                  Acompanhamento de Projetos
                </h2>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                  <MetasEditor targets={targets} onChange={setTargets} />
                  <div className="flex items-center gap-1 self-start rounded-lg border border-white/15 bg-white/5 p-0.5" role="group" aria-label="Período do relatório">
                    {[6, 12].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonths(m)}
                        aria-pressed={months === m}
                        className={cn(
                          'min-h-8 rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:outline-none',
                          months === m ? 'bg-white/90 text-navy-900' : 'text-slate-300 hover:text-white',
                        )}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartBox series={report.finalizado} accent={ACCENT.finalizado} />
                <ChartBox series={report.goLive} accent={ACCENT.goLive} />
              </div>
            </div>
          </Card>

          {/* ── Pesquisa de Satisfação (Média NPS) ── */}
          <Card className="mt-5 overflow-hidden">
            <div className="flex items-center gap-2 bg-gradient-to-r from-navy-900 to-navy-800 px-4 py-4 text-white sm:px-6">
              <Star className="size-5 text-brand-300" />
              <h2 className="text-lg font-bold tracking-wide uppercase">Média NPS — Projetos</h2>
            </div>
            <SatisfactionTable projects={list} getOrgName={(id) => getOrg(id)?.name ?? '—'} />
          </Card>

          {/* ── Indicadores operacionais ── */}
          <section className="mt-6" aria-labelledby="titulo-indicadores-operacionais">
            <div className="mb-3">
              <h2 id="titulo-indicadores-operacionais" className="text-lg font-semibold text-slate-900">Indicadores operacionais</h2>
              <p className="mt-0.5 text-sm text-slate-500">Leitura consolidada da carteira de projetos.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric icon={BarChart3} label="Projetos ativos" value={active.length} />
              <Metric icon={Star} label="NPS médio" value={avgNps || '-'} />
              <Metric icon={Timer} label="Horas usadas" value={`${usedHours}/${estimatedHours || 0}h`} />
              <Metric icon={Upload} label="Escopos recebidos" value={`${scopeReceived}/${list.length}`} />
              <Metric icon={ShieldCheck} label="Itens de segurança" value={`${securityDone}/${securityTotal || 0}`} />
              <Metric icon={BarChart3} label="Pendências abertas" value={openCharges.length} />
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader title="Distribuição de status" subtitle="Situação atual de todos os projetos." className="border-b border-slate-100" />
              <div className="space-y-3 p-5">
                {Object.entries(groupBy(list, (project) => project.status)).map(([status, count]) => (
                  <Bar key={status} label={STATUS_META[status as ProjectStatus].label} value={count} total={list.length || 1} />
                ))}
              </div>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Confiança de prazo" subtitle="Percepção registrada no tracking dos projetos." className="border-b border-slate-100" />
              <div className="space-y-3 p-5">
                {Object.entries(groupBy(list, (project) => project.tracking?.deadlineConfidence ?? 'no_prazo')).map(([status, count]) => (
                  <Bar key={status} label={CONFIANCA_PRAZO_LABEL[status as DeadlineConfidence]} value={count} total={list.length || 1} />
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
    <div
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 sm:w-auto"
      role="group"
      aria-label="Metas do relatório"
    >
      <span className="text-[11px] font-semibold tracking-wide text-slate-300 uppercase">Metas</span>
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
    <label className="flex items-center gap-1 text-[11px] text-slate-200" title={`Meta de ${label}`}>
      {label}
      <input
        type="number"
        min={0}
        max={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`Meta de ${label} em porcentagem`}
        className="h-7 w-14 rounded-md border border-white/20 bg-white/10 px-1.5 text-center text-xs font-semibold text-white outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-300/30"
      />
      <span className="text-slate-300">%</span>
    </label>
  )
}

/** Caixa de gráfico no estilo da referência: título, indicador-resumo e legenda. */
function ChartBox({ series, accent }: { series: ReportSeries; accent: string }) {
  const onTarget = series.latest !== null && series.latest >= series.target
  return (
    <section className="rounded-xl border border-white/15 bg-white/[0.04] p-3 sm:p-4" aria-label={series.label}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
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
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-slate-300">
        <LegendItem label={`% ${series.label.split(' ')[0]}`} color={accent} />
        <LegendItem label="Objetivo" color="#7cc4f0" />
        <LegendItem label="Média Móvel" color="rgba(255,255,255,0.85)" dashed />
      </div>
    </section>
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
    <Card className="flex min-h-24 items-center gap-4 p-4 sm:p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</div>
        <div className="text-sm leading-snug text-slate-600">{label}</div>
      </div>
    </Card>
  )
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = Math.round((value / total) * 100)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-xs font-semibold text-slate-500 tabular-nums">{value} · {percentage}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
