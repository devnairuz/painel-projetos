import { BarChart3, ClipboardCopy, ShieldCheck, Star, Timer, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProjects } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types'

export function RelatoriosPage() {
  const { data: projects, loading } = useProjects()
  const { notify } = useToast()
  const list = projects ?? []
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
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
