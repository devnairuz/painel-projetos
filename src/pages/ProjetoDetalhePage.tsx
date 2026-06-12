import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FolderKanban, Flag, Pencil, Check } from 'lucide-react'
import { useProject } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { PhaseCard } from '@/components/projects/PhaseCard'
import { PhaseManager } from '@/components/projects/PhaseManager'
import { ClientAccessCard } from '@/components/projects/ClientAccessCard'
import { OwnersCard } from '@/components/projects/OwnersCard'
import { FinalizationConfigCard } from '@/components/projects/FinalizationConfigCard'
import { PLATFORM_META, STATUS_META, TYPE_META, RISK_META } from '@/constants'
import { PRODUCT_META } from '@/constants/templates'
import type { Platform, ProjectStatus, ProjectType, ProjectOwners } from '@/types'
import {
  addChecklistComment,
  addChecklistItem,
  addPhase,
  approvePhase,
  removeChecklistItem,
  removePhase,
  renameChecklistItem,
  renamePhase,
  setChecklistResponsibility,
  toggleChecklistItem,
  updatePhaseSettings,
  updateProjectOwners,
  updateProjectStatus,
  type PhaseSettingsPatch,
} from '@/services/projectsService'
import { currentPhase } from '@/utils/projects'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))

export function ProjetoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, loading, reload } = useProject(id)
  const { getMember, team } = useLookups()
  const { notify } = useToast()
  const [editPhases, setEditPhases] = useState(false)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <Card>
        <EmptyState
          icon={FolderKanban}
          title="Projeto não encontrado"
          description="O projeto que você procura não existe ou foi removido."
          action={
            <Link to="/projetos" className="text-sm font-medium text-brand-600 hover:underline">
              ← Voltar para projetos
            </Link>
          }
        />
      </Card>
    )
  }

  const phaseNow = currentPhase(project.phases)

  async function handleToggle(phaseId: string, itemId: string) {
    await toggleChecklistItem(project!.id, phaseId, itemId)
    reload()
  }

  async function handleApprove(phaseId: string) {
    await approvePhase(project!.id, phaseId)
    notify('Aprovação do cliente registrada com sucesso.')
    reload()
  }

  async function handleStatusChange(status: ProjectStatus) {
    await updateProjectStatus(project!.id, status)
    notify(`Status atualizado para "${STATUS_META[status].label}".`)
    reload()
  }

  async function handleAddPhase(name: string) {
    await addPhase(project!.id, name)
    notify('Etapa adicionada.')
    reload()
  }

  async function handleRenamePhase(phaseId: string, name: string) {
    await renamePhase(project!.id, phaseId, name)
    notify('Etapa renomeada.')
    reload()
  }

  async function handleRemovePhase(phaseId: string) {
    await removePhase(project!.id, phaseId)
    notify('Etapa removida.', 'info')
    reload()
  }

  async function handleAddItem(phaseId: string, label: string) {
    await addChecklistItem(project!.id, phaseId, label)
    reload()
  }

  async function handleRenameItem(phaseId: string, itemId: string, label: string) {
    await renameChecklistItem(project!.id, phaseId, itemId, label)
    reload()
  }

  async function handleRemoveItem(phaseId: string, itemId: string) {
    await removeChecklistItem(project!.id, phaseId, itemId)
    reload()
  }

  async function handleUpdatePhaseSettings(phaseId: string, patch: PhaseSettingsPatch) {
    await updatePhaseSettings(project!.id, phaseId, patch)
    reload()
  }

  async function handleToggleResponsibility(phaseId: string, itemId: string, value: boolean) {
    await setChecklistResponsibility(project!.id, phaseId, itemId, value)
    reload()
  }

  async function handleAddComment(phaseId: string, itemId: string, body: string) {
    await addChecklistComment(project!.id, phaseId, itemId, {
      authorType: 'nairuz',
      authorName: 'Equipe Nairuz',
      body,
    })
    reload()
  }

  async function handleUpdateDates(
    phaseId: string,
    patch: { startDate?: string; dueDate?: string; finishedDate?: string },
  ) {
    await updatePhaseSettings(project!.id, phaseId, patch)
    reload()
  }

  async function handleUpdateOwners(owners: Partial<ProjectOwners>) {
    await updateProjectOwners(project!.id, owners)
    notify('Responsáveis atualizados.')
    reload()
  }


  return (
    <>
      {/* Voltar */}
      <button
        onClick={() => navigate('/projetos')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft className="size-4" /> Projetos
      </button>

      {/* Cabeçalho do projeto */}
      <Card className="mb-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {project.clientName}
              </h1>
              <span className="text-sm font-medium text-slate-400">{project.code}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge meta={PLATFORM_META[project.platform as Platform]} withDot />
              <Badge meta={TYPE_META[project.type as ProjectType]} withDot />
              <Badge meta={RISK_META[project.risk]} withDot />
              {project.product && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {PRODUCT_META[project.product].label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div>
              <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Status
              </div>
              <Select
                className="w-52"
                options={STATUS_OPTIONS}
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              />
            </div>
            <Metric icon={Flag} label="Go live" value={formatDate(project.goLiveDate)} hint={relativeDeadlineLabel(project.goLiveDate)} />
          </div>
        </div>

        {/* Progresso */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Avanço geral</span>
            <span className="font-semibold text-slate-900">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
        </div>

        {/* Próxima ação */}
        {project.nextAction && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
              Próxima ação
            </div>
            <p className="mt-0.5 text-sm text-amber-900">{project.nextAction}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Fases */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Etapas do projeto</h2>
                <span className="text-sm text-slate-400">
                  {project.phases.filter((p) => p.status === 'concluida').length}/{project.phases.length} concluídas
                </span>
              </div>
              <button
                onClick={() => setEditPhases((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {editPhases ? <Check className="size-4" /> : <Pencil className="size-4" />}
                {editPhases ? 'Concluir edição' : 'Editar etapas'}
              </button>
            </div>

            {editPhases ? (
              <PhaseManager
                phases={project.phases.slice().sort((a, b) => a.order - b.order)}
                team={team ?? []}
                onAdd={handleAddPhase}
                onRename={handleRenamePhase}
                onRemove={handleRemovePhase}
                onUpdateSettings={handleUpdatePhaseSettings}
                onAddItem={handleAddItem}
                onRenameItem={handleRenameItem}
                onRemoveItem={handleRemoveItem}
              />
            ) : (
              <div className="space-y-2.5">
                {project.phases
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((phase) => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      owner={getMember(phase.ownerId)}
                      defaultOpen={phase.id === phaseNow?.id}
                      onToggleItem={handleToggle}
                      onApprove={handleApprove}
                      onToggleResponsibility={handleToggleResponsibility}
                      onAddComment={handleAddComment}
                      onUpdateDates={handleUpdateDates}
                    />
                  ))}
              </div>
            )}
          </Card>
        </div>

        {/* Responsáveis */}
        <div className="space-y-5">
          <OwnersCard owners={project.owners} getMember={getMember} onChange={handleUpdateOwners} />

          <ClientAccessCard
            projectId={project.id}
            emails={project.clientEmails}
            onChanged={reload}
          />

          <FinalizationConfigCard project={project} onChanged={reload} />

          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Última atualização</h2>
            <p className="text-sm text-slate-500">{formatDate(project.updatedAt)}</p>
          </Card>
        </div>
      </div>
    </>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flag
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  )
}
