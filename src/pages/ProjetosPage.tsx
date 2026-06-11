import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderKanban, Plus } from 'lucide-react'
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
import type { Platform, ProjectStatus } from '@/types'
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
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, cliente ou ação"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
          <Select
            options={STATUS_OPTIONS}
            placeholder="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Select
            options={PLATFORM_OPTIONS}
            placeholder="Plataforma"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
          <Select
            options={TYPE_OPTIONS}
            placeholder="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum projeto encontrado"
            description="Ajuste os filtros ou a busca para ver outros projetos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3">Projeto</th>
                  <th className="px-3 py-3">Plataforma</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Fase atual</th>
                  <th className="px-3 py-3 w-40">Avanço</th>
                  <th className="px-3 py-3">Risco</th>
                  <th className="px-3 py-3">Go live</th>
                  <th className="px-3 py-3">Resp.</th>
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
                        <div className="font-semibold text-slate-900">{p.clientName}</div>
                        <div className="text-xs text-slate-400">
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
                        <ProgressBar value={p.progress} showLabel />
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge meta={RISK_META[p.risk]} withDot />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-slate-700">{formatDate(p.goLiveDate)}</div>
                        <div className="text-xs text-slate-400">
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
        )}
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="mt-3 px-1 text-xs text-slate-400">
          {filtered.length} de {projects?.length ?? 0} projetos · clique numa linha para abrir o detalhe
        </p>
      )}
    </>
  )
}
