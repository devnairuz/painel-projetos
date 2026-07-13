import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search, FolderKanban, Plus } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { NewProjectModal } from '@/components/projects/NewProjectModal'
import {
  PLATFORM_META,
  STATUS_META,
  TYPE_META,
  RISK_META,
} from '@/constants'
import type { Platform, Project, ProjectStatus, TeamMember } from '@/types'
import { currentPhase } from '@/utils/projects'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))
const PLATFORM_OPTIONS = Object.entries(PLATFORM_META).map(([value, m]) => ({ value, label: m.label }))
const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }))

export function ProjetosPage() {
  const navigate = useNavigate()
  const { data: projects, loading } = useProjects()
  const { getMember, getOrg } = useLookups()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [platform, setPlatform] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    if (!projects) return []
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      if (status && p.status !== status) return false
      if (platform && p.platform !== platform) return false
      if (type && p.type !== type) return false
      if (q) {
        const hay = `${p.code} ${p.clientName} ${p.nextAction ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [projects, search, status, platform, type])

  return (
    <>
      <PageHeader
        title="Projetos"
        subtitle="Visão consolidada de todas as implantações e evoluções ativas"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      <NewProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(project) => {
          setCreating(false)
          navigate(`/projetos/${project.id}`)
        }}
      />

      {/* Filtros */}
      <Card className="mb-5 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Encontre um projeto</h2>
            <p className="mt-0.5 text-xs text-slate-500">Busque pelo cliente ou refine a lista com os filtros.</p>
          </div>
          {!loading && (
            <p className="text-xs font-medium text-slate-500 tabular-nums" aria-live="polite">
              {filtered.length} de {projects?.length ?? 0} projetos
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, cliente ou próxima ação"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Status</span>
            <Select
              options={STATUS_OPTIONS}
              placeholder="Todos os status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Plataforma</span>
            <Select
              options={PLATFORM_OPTIONS}
              placeholder="Todas as plataformas"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Tipo</span>
            <Select
              options={TYPE_OPTIONS}
              placeholder="Todos os tipos"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </label>
        </div>
      </Card>

      {/* Lista */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 sm:p-5" aria-label="Carregando projetos">
            <div className="hidden space-y-5 lg:block">
              <div className="grid grid-cols-[1.5fr_repeat(7,1fr)] gap-4 border-b border-slate-100 pb-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_repeat(7,1fr)] items-center gap-4">
                  {Array.from({ length: 8 }).map((__, j) => <Skeleton key={j} className="h-8 w-full" />)}
                </div>
              ))}
            </div>
            <div className="space-y-3 lg:hidden">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={projects?.length ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
            description={projects?.length
              ? 'Ajuste a busca ou os filtros para ampliar os resultados.'
              : 'Crie o primeiro projeto para iniciar o acompanhamento.'}
            action={!projects?.length ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Novo projeto
              </Button>
            ) : undefined}
          />
        ) : (
          <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Lista de projetos com plataforma, status, fase, avanço, risco, go live e responsável</caption>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th scope="col" className="px-5 py-3">Projeto</th>
                  <th scope="col" className="px-3 py-3">Plataforma</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Fase atual</th>
                  <th scope="col" className="w-40 px-3 py-3">Avanço</th>
                  <th scope="col" className="px-3 py-3">Risco</th>
                  <th scope="col" className="px-3 py-3">Go live</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Responsável</span>Resp.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const phase = currentPhase(p.phases)
                  const techLead = getMember(p.owners.techLeadId)
                  const org = getOrg(p.organizationId)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projetos/${p.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/projetos/${p.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-semibold text-slate-900 hover:text-brand-700 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                          {p.clientName}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {p.code} · {org?.segment ?? '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge meta={PLATFORM_META[p.platform as Platform]} withDot />
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge meta={STATUS_META[p.status as ProjectStatus]} withDot />
                      </td>
                      <td className="px-3 py-3.5 text-slate-600">
                        {phase ? `${phase.order}. ${phase.name}` : '—'}
                      </td>
                      <td className="px-3 py-3.5">
                        <ProgressBar value={p.progress} label={`Progresso de ${p.clientName}`} showLabel />
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge meta={RISK_META[p.risk]} withDot />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-slate-700">{formatDate(p.goLiveDate)}</div>
                        <div className="text-xs text-slate-500">
                          {relativeDeadlineLabel(p.goLiveDate)}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {techLead ? (
                          <Avatar name={techLead.name} color={techLead.avatarColor} size="sm" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 lg:hidden" aria-label="Lista de projetos">
            {filtered.map((projeto) => {
              const fase = currentPhase(projeto.phases)
              const responsavel = getMember(projeto.owners.techLeadId)
              const organizacao = getOrg(projeto.organizationId)
              return (
                <li key={projeto.id}>
                  <ProjetoMobile
                    project={projeto}
                    phaseName={fase ? `${fase.order}. ${fase.name}` : 'Fase não definida'}
                    segment={organizacao?.segment ?? 'Sem segmento'}
                    techLead={responsavel}
                  />
                </li>
              )
            })}
          </ul>
          </>
        )}
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 px-1 text-xs text-slate-500">
          {filtered.length} de {projects?.length ?? 0} projetos · selecione um projeto para abrir o detalhe
        </p>
      )}
    </>
  )
}

function ProjetoMobile({
  project,
  phaseName,
  segment,
  techLead,
}: {
  project: Project
  phaseName: string
  segment: string
  techLead?: TeamMember
}) {
  return (
    <Link
      to={`/projetos/${project.id}`}
      className="group block p-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900">{project.clientName}</div>
          <div className="mt-0.5 text-xs text-slate-500">{project.code} · {segment}</div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" aria-hidden />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge meta={STATUS_META[project.status]} withDot />
        <Badge meta={PLATFORM_META[project.platform]} withDot />
        <Badge meta={RISK_META[project.risk]} withDot />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-600">{phaseName}</span>
            <span className="shrink-0 font-semibold text-slate-600 tabular-nums">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} label={`Progresso de ${project.clientName}`} />
        </div>
        {techLead && <Avatar name={techLead.name} color={techLead.avatarColor} size="sm" />}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">Go live</span>
        <span className="font-medium text-slate-700">
          {formatDate(project.goLiveDate)} · {relativeDeadlineLabel(project.goLiveDate)}
        </span>
      </div>
    </Link>
  )
}
