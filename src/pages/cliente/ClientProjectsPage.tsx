import { Link } from 'react-router-dom'
import { FolderKanban, ChevronRight, Star, PartyPopper } from 'lucide-react'
import { useClientProjects } from '@/hooks/useProjects'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PLATFORM_META, STATUS_META } from '@/constants'
import { currentPhase } from '@/utils/projects'
import { formatDate } from '@/utils/dates'

/** Lista os projetos da organização do cliente (sem dados internos). */
export function ClientProjectsPage() {
  const { data: projects, loading } = useClientProjects()

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seus projetos</h1>
        <p className="mt-1 text-slate-500">Acompanhe o andamento de cada projeto com a Nairuz.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="Nenhum projeto por aqui ainda"
            description="Assim que um projeto for iniciado, ele aparecerá nesta área."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const phase = currentPhase(p.phases)
            return (
              <Link key={p.id} to={`/cliente/projeto/${p.id}`}>
                <Card className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900">{p.clientName}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge meta={PLATFORM_META[p.platform]} withDot />
                        <Badge meta={STATUS_META[p.status]} withDot />
                      </div>
                    </div>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-slate-300" />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        {phase ? `Fase atual: ${phase.name}` : 'Aguardando início'}
                      </span>
                      <span className="font-semibold text-slate-700">{p.progress}%</span>
                    </div>
                    <ProgressBar value={p.progress} />
                  </div>

                  <div className="mt-4 text-sm text-slate-500">
                    Previsão de go live: <span className="font-medium text-slate-700">{formatDate(p.goLiveDate)}</span>
                  </div>

                  {/* Finalização: chama o cliente para ação */}
                  {p.status === 'encerrado' && !p.nps && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                      <Star className="size-4 shrink-0" />
                      Projeto concluído — falta sua <strong>avaliação (NPS)</strong> para finalizar.
                    </div>
                  )}
                  {p.status === 'encerrado' && p.nps && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                      <PartyPopper className="size-4 shrink-0" />
                      Projeto concluído. Veja os próximos passos.
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
