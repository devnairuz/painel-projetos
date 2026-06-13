import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FolderKanban, Flag, Pencil, Check, Trash2, CalendarRange } from 'lucide-react'
import { useProject } from '@/hooks/useProjects'
import { useLookups } from '@/hooks/useLookups'
import { useCompanyAuth } from '@/hooks/useCompanyAuth'
import { useMentionableUsers } from '@/hooks/useMentionableUsers'
import { useToast } from '@/components/ui/Toast'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PhaseCard } from '@/components/projects/PhaseCard'
import { PhaseManager } from '@/components/projects/PhaseManager'
import { GanttModal } from '@/components/projects/GanttModal'
import { ClientAccessCard } from '@/components/projects/ClientAccessCard'
import { OwnersCard } from '@/components/projects/OwnersCard'
import { CollaboratorsCard } from '@/components/projects/CollaboratorsCard'
import { FinalizationConfigCard } from '@/components/projects/FinalizationConfigCard'
import { PLATFORM_META, STATUS_META, TYPE_META, RISK_META } from '@/constants'
import { PRODUCT_META } from '@/constants/templates'
import type { Platform, Project, ProjectStatus, ProjectType, ProjectOwners } from '@/types'
import {
  addChecklistComment,
  addChecklistItem,
  addPhase,
  approvePhase,
  deleteProject,
  removeChecklistItem,
  removePhase,
  renameChecklistItem,
  renamePhase,
  setChecklistResponsibility,
  toggleChecklistItem,
  updateCollaborators,
  updatePhaseSettings,
  updateProjectOwners,
  updateProjectStatus,
  type PhaseSettingsPatch,
} from '@/services/projectsService'
import { currentPhase, syncPhaseStatus, computeProgress } from '@/utils/projects'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))

export function ProjetoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: fetched, loading, reload } = useProject(id)
  const { getMember, team } = useLookups()
  const { user: companyUser } = useCompanyAuth()
  const { data: mentionUsers } = useMentionableUsers()
  const { notify } = useToast()
  // Cópia local: aplica updates na hora (otimista) e reconcilia com o servidor.
  const [project, setProject] = useState<Project | undefined>(undefined)
  const [editPhases, setEditPhases] = useState(false)
  const [ganttOpen, setGanttOpen] = useState(false)

  useEffect(() => {
    if (fetched) setProject(fetched)
  }, [fetched])

  if (!project) {
    if (loading || fetched) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
    }
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

  /** Aplica o toggle localmente (preserva refs das fases não alteradas). */
  function toggleLocally(p: Project, phaseId: string, itemId: string): Project {
    const phases = p.phases.map((ph) => {
      if (ph.id !== phaseId) return ph
      const checklist = ph.checklist.map((it) =>
        it.id === itemId
          ? { ...it, done: !it.done, doneAt: !it.done ? new Date().toISOString() : undefined }
          : it,
      )
      const np = { ...ph, checklist }
      syncPhaseStatus(np)
      return np
    })
    return { ...p, phases, progress: computeProgress(phases) }
  }

  async function handleToggle(phaseId: string, itemId: string) {
    setProject((prev) => (prev ? toggleLocally(prev, phaseId, itemId) : prev)) // instantâneo
    try {
      const updated = await toggleChecklistItem(project!.id, phaseId, itemId)
      setProject(updated) // reconcilia com o servidor
    } catch {
      reload()
    }
  }

  async function handleApprove(phaseId: string) {
    setProject(await approvePhase(project!.id, phaseId))
    notify('Aprovação do cliente registrada com sucesso.')
  }

  async function handleStatusChange(status: ProjectStatus) {
    setProject(await updateProjectStatus(project!.id, status))
    notify(`Status atualizado para "${STATUS_META[status].label}".`)
  }

  async function handleAddPhase(name: string) {
    setProject(await addPhase(project!.id, name))
    notify('Etapa adicionada.')
  }

  async function handleRenamePhase(phaseId: string, name: string) {
    setProject(await renamePhase(project!.id, phaseId, name))
    notify('Etapa renomeada.')
  }

  async function handleRemovePhase(phaseId: string) {
    setProject(await removePhase(project!.id, phaseId))
    notify('Etapa removida.', 'info')
  }

  async function handleAddItem(phaseId: string, label: string) {
    setProject(await addChecklistItem(project!.id, phaseId, label))
  }

  async function handleRenameItem(phaseId: string, itemId: string, label: string) {
    setProject(await renameChecklistItem(project!.id, phaseId, itemId, label))
  }

  async function handleRemoveItem(phaseId: string, itemId: string) {
    setProject(await removeChecklistItem(project!.id, phaseId, itemId))
  }

  async function handleUpdatePhaseSettings(phaseId: string, patch: PhaseSettingsPatch) {
    setProject(await updatePhaseSettings(project!.id, phaseId, patch))
  }

  async function handleToggleResponsibility(phaseId: string, itemId: string, value: boolean) {
    setProject(await setChecklistResponsibility(project!.id, phaseId, itemId, value))
  }

  async function handleAddComment(
    phaseId: string,
    itemId: string,
    body: string,
    mentionedUserIds: string[],
  ) {
    setProject(
      await addChecklistComment(project!.id, phaseId, itemId, {
        authorType: 'nairuz',
        authorName: companyUser?.name ?? 'Equipe Nairuz',
        body,
        mentionedUserIds,
      }),
    )
  }

  async function handleUpdateCollaborators(userIds: string[]) {
    setProject(await updateCollaborators(project!.id, userIds))
  }

  async function handleUpdateDates(
    phaseId: string,
    patch: { startDate?: string; dueDate?: string; finishedDate?: string },
  ) {
    setProject(await updatePhaseSettings(project!.id, phaseId, patch))
  }

  async function handleUpdateOwners(owners: Partial<ProjectOwners>) {
    setProject(await updateProjectOwners(project!.id, owners))
    notify('Responsáveis atualizados.')
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Excluir o projeto "${project!.clientName}" (${project!.code})?\n\nEsta ação não pode ser desfeita.`,
    )
    if (!confirmed) return
    await deleteProject(project!.id)
    notify('Projeto excluído.', 'info')
    navigate('/projetos')
  }


  return (
    <>
      {/* Voltar + Cronograma */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/projetos')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="size-4" /> Projetos
        </button>
        <button
          onClick={() => setGanttOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <CalendarRange className="size-4 text-brand-600" />
          Cronograma (Gantt)
        </button>
      </div>

      {ganttOpen && <GanttModal project={project} onClose={() => setGanttOpen(false)} />}

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
                      users={mentionUsers ?? []}
                    />
                  ))}
              </div>
            )}
          </Card>
        </div>

        {/* Responsáveis */}
        <div className="space-y-5">
          <OwnersCard owners={project.owners} getMember={getMember} onChange={handleUpdateOwners} />

          <CollaboratorsCard
            collaborators={project.collaborators ?? []}
            users={mentionUsers ?? []}
            onChange={handleUpdateCollaborators}
          />

          <ClientAccessCard
            projectId={project!.id}
            emails={project.clientEmails}
            onChanged={reload}
          />

          <FinalizationConfigCard project={project} onChanged={reload} />

          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Última atualização</h2>
            <p className="text-sm text-slate-500">{formatDate(project.updatedAt)}</p>
          </Card>

          {/* Zona de risco */}
          <Card className="border-red-200 p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Excluir projeto</h2>
            <p className="mb-3 text-sm text-slate-500">
              Remove o projeto e todo o seu conteúdo. Esta ação não pode ser desfeita.
            </p>
            <Button variant="danger" onClick={handleDelete} className="w-full">
              <Trash2 className="size-4" />
              Excluir projeto
            </Button>
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
