import type { ReactNode } from 'react'
import { MessageSquareText } from 'lucide-react'
import type { Project } from '@/types'
import { surveyAverages, fmtScore } from '@/constants/satisfaction'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'

interface SatisfactionTableProps {
  projects: Project[]
  /** Resolve o nome da organização (Empresa) pelo id. */
  getOrgName: (organizationId: string) => string
}

/** Colunas de nota simples (cinza) e de média (destacadas). */
const SCORE_COLS: { label: string; avg?: boolean }[] = [
  { label: 'Indicação Empresa' },
  { label: 'Satisfação Projeto' },
  { label: 'UX/UI Recomendação' },
  { label: 'UX/UI Entregas' },
  { label: 'UX/UI Experiência' },
  { label: 'Média Final UX/UI', avg: true },
  { label: 'Dev Implantação' },
  { label: 'Dev Layout' },
  { label: 'Dev Estabilidade' },
  { label: 'Média Final Dev', avg: true },
  { label: 'PMO Atendimento' },
  { label: 'Média Final Tecnologia', avg: true },
]

/**
 * Tabela "Média NPS - Projetos": uma linha por projeto avaliado, com as notas
 * da pesquisa e as médias finais (UX/UI, Dev e Tecnologia).
 */
export function SatisfactionTable({ projects, getOrgName }: SatisfactionTableProps) {
  const rows = projects.filter((p) => p.nps)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nenhuma resposta de satisfação"
        description="As avaliações respondidas pelos clientes aparecerão nesta tabela."
      />
    )
  }

  return (
    <div
      className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 focus-visible:outline-none"
      role="region"
      aria-label="Resultados da pesquisa de satisfação por projeto"
      aria-describedby="orientacao-tabela-satisfacao"
      tabIndex={0}
    >
      <p id="orientacao-tabela-satisfacao" className="sr-only">Role horizontalmente para consultar todas as notas.</p>
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <caption className="sr-only">Notas e médias de satisfação dos projetos avaliados</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
            <Th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50">Cliente</Th>
            <Th>Empresa</Th>
            {SCORE_COLS.map((c) => (
              <Th key={c.label} className={cn('text-center', c.avg && 'bg-brand-50 text-brand-800')}>
                {c.label}
              </Th>
            ))}
            <Th className="min-w-[220px]">Feedback Aberto</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((project) => {
            const nps = project.nps!
            const { uxui, dev, tecnologia } = surveyAverages(nps)
            const cells: Array<{ value: number | null; avg?: boolean }> = [
              { value: nps.score },
              { value: nps.satisfacaoProjeto ?? null },
              { value: nps.uxRecomendacao ?? null },
              { value: nps.uxEntregas ?? null },
              { value: nps.uxExperiencia ?? null },
              { value: uxui, avg: true },
              { value: nps.devImplantacao ?? null },
              { value: nps.devLayout ?? null },
              { value: nps.devEstabilidade ?? null },
              { value: dev, avg: true },
              { value: nps.pmoAtendimento ?? null },
              { value: tecnologia, avg: true },
            ]
            return (
              <tr key={project.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <Td className="sticky left-0 z-10 border-r border-slate-100 bg-white font-medium text-slate-800 group-hover:bg-slate-50">
                  {project.clientName}
                </Td>
                <Td className="text-slate-600">{getOrgName(project.organizationId)}</Td>
                {cells.map((cell, i) => (
                  <Td
                    key={i}
                    className={cn(
                      'text-center tabular-nums',
                      cell.avg ? 'bg-brand-50/60 font-semibold text-brand-800' : 'text-slate-700',
                    )}
                  >
                    {fmtScore(cell.value)}
                  </Td>
                ))}
                <Td className="max-w-[280px] text-slate-600">
                  {nps.comment ? (
                    <span className="line-clamp-2" title={nps.comment}>
                      {nps.comment}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-3 text-[11px] leading-tight font-semibold tracking-wide text-slate-600 uppercase',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-3 py-3 align-top', className)}>{children}</td>
}
