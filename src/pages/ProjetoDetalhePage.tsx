import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FolderKanban, Flag, Pencil, Check, Trash2, CalendarRange, Settings, ChevronDown, Sparkles } from 'lucide-react'
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
import { Modal } from '@/components/ui/Modal'
import { PhaseCard } from '@/components/projects/PhaseCard'
import { PhaseManager } from '@/components/projects/PhaseManager'
import { PhaseKanban } from '@/components/projects/PhaseKanban'
import { GateBanner } from '@/components/projects/GateBanner'
import { GanttModal } from '@/components/projects/GanttModal'
import { ClientAccessCard } from '@/components/projects/ClientAccessCard'
import { OwnersCard } from '@/components/projects/OwnersCard'
import { CollaboratorsCard } from '@/components/projects/CollaboratorsCard'
import { FinalizationConfigCard } from '@/components/projects/FinalizationConfigCard'
import { ProjectTrackingCard } from '@/components/projects/ProjectTrackingCard'
import { AcessosCard } from '@/components/projects/AcessosCard'
import { PLATFORM_META, STATUS_META, TYPE_META, RISK_META } from '@/constants'
import { PRODUCT_META } from '@/constants/templates'
import type { BoardStatus, CommentAttachment, Platform, Project, ProjectStatus, ProjectType, ProjectOwners } from '@/types'
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
  setChecklistBoardStatus,
  setChecklistResponsibility,
  setChecklistOwner,
  toggleChecklistItem,
  updateCollaborators,
  updatePhaseSettings,
  updateProjectOwners,
  updateProjectStatus,
  type PhaseSettingsPatch,
} from '@/services/projectsService'
import { currentPhase, deriveBoardStatus, syncPhaseStatus, computeProgress, normalizedTasks } from '@/utils/projects'
import { evaluateGate } from '@/utils/gate'
import { deriveProjectFlow } from '@/utils/flow'
import { groupByStage } from '@/utils/journey'
import { formatDate, relativeDeadlineLabel } from '@/utils/dates'
import { cn } from '@/utils/cn'

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
  const [viewMode, setViewMode] = useState<'checklist' | 'kanban'>('checklist')
  const [operationOpen, setOperationOpen] = useState(false)
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
  const gate = evaluateGate(project.phases)
  const flow = deriveProjectFlow(project)
  const statusSuggested =
    flow.shouldSuggestStatus && flow.suggestedStatus !== project.status
      ? flow.suggestedStatus
      : undefined

  /** Aplica o toggle localmente (preserva refs das fases não alteradas). */
  function toggleLocally(p: Project, phaseId: string, itemId: string): Project {
    const phases = p.phases.map((ph) => {
      if (ph.id !== phaseId) return ph
      const checklist = ph.checklist.map((it) => {
        if (it.id !== itemId) return it
        const done = !it.done
        const next = { ...it, done, doneAt: done ? new Date().toISOString() : undefined }
        return { ...next, boardStatus: done ? 'concluido' : deriveBoardStatus(ph, next) }
      })
      const np = { ...ph, checklist }
      syncPhaseStatus(np)
      if (checklist.some((it) => it.id === itemId && !it.done)) {
        np.checklist = np.checklist.map((it) =>
          it.id === itemId ? { ...it, boardStatus: deriveBoardStatus(np, it) } : it,
        )
      }
      return np
    })
    return { ...p, phases, progress: computeProgress(phases) }
  }

  /** Move um card do Kanban localmente e espelha `done` quando entra/sai de Concluído. */
  function setBoardStatusLocally(p: Project, phaseId: string, itemId: string, boardStatus: BoardStatus): Project {
    const now = new Date().toISOString()
    const phases = p.phases.map((ph) => {
      if (ph.id !== phaseId) return ph
      const checklist = ph.checklist.map((it) => {
        if (it.id !== itemId) return it
        const done = boardStatus === 'concluido'
        const clientResponsibility =
          boardStatus === 'responsabilidade_cliente' || boardStatus === 'aguardando_cliente'
            ? true
            : boardStatus === 'concluido'
              ? it.clientResponsibility
              : false
        return { ...it, boardStatus, done, doneAt: done ? it.doneAt ?? now : undefined, clientResponsibility }
      })
      const np = { ...ph, checklist }
      const allDone = checklist.length > 0 && checklist.every((c) => c.done)
      if (allDone && !np.finishedDate) np.finishedDate = now
      if (!allDone) np.finishedDate = undefined
      syncPhaseStatus(np)
      return np
    })
    const next = { ...p, phases, progress: computeProgress(phases) }
    return { ...next, tasks: normalizedTasks(next) }
  }

  function updateChecklistOwnerLocally(p: Project, phaseId: string, itemId: string, ownerId: string): Project {
    const normalizedOwnerId = ownerId || undefined
    const phases = p.phases.map((ph) =>
      ph.id === phaseId
        ? {
            ...ph,
            checklist: ph.checklist.map((it) =>
              it.id === itemId ? { ...it, ownerId: normalizedOwnerId } : it,
            ),
          }
        : ph,
    )
    // Checklist é a fonte única: as tarefas derivam dele (sem dual-write).
    const next = { ...p, phases }
    return { ...next, tasks: normalizedTasks(next) }
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

  async function handleSetBoardStatus(phaseId: string, itemId: string, boardStatus: BoardStatus) {
    setProject((prev) => (prev ? setBoardStatusLocally(prev, phaseId, itemId, boardStatus) : prev))
    try {
      const updated = await setChecklistBoardStatus(project!.id, phaseId, itemId, boardStatus)
      setProject(updated)
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

  async function handleUpdateItemOwner(phaseId: string, itemId: string, ownerId: string) {
    setProject((prev) => (prev ? updateChecklistOwnerLocally(prev, phaseId, itemId, ownerId) : prev))
    try {
      const updated = await setChecklistOwner(project!.id, phaseId, itemId, ownerId)
      setProject(updateChecklistOwnerLocally(updated, phaseId, itemId, ownerId))
    } catch {
      reload()
    }
  }

  async function handleAddComment(
    phaseId: string,
    itemId: string,
    body: string,
    mentionedUserIds: string[],
    attachments?: CommentAttachment[],
  ) {
    setProject(
      await addChecklistComment(project!.id, phaseId, itemId, {
        authorId: companyUser?.id,
        authorType: 'nairuz',
        authorName: companyUser?.name ?? 'Equipe Nairuz',
        body,
        mentionedUserIds,
        attachments,
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
      {/* Voltar + ações rápidas */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/projetos')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="size-4" /> Projetos
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOperationOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            title="Abrir operação"
          >
            <Settings className="size-4" />
            <span className="hidden sm:inline">Operação</span>
          </button>
          <button
            onClick={() => setGanttOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <CalendarRange className="size-4 text-brand-600" />
            <span className="hidden sm:inline">Cronograma (Gantt)</span>
          </button>
        </div>
      </div>

      {ganttOpen && <GanttModal project={project} onClose={() => setGanttOpen(false)} />}

      <Modal
        open={operationOpen}
        onClose={() => setOperationOpen(false)}
        title="Operação"
        subtitle="Responsáveis, colaboradores, tracking e configurações do projeto."
        size="lg"
      >
        <div className="space-y-5">
          <OwnersCard owners={project.owners} getMember={getMember} onChange={handleUpdateOwners} />

          <CollaboratorsCard
            collaborators={project.collaborators ?? []}
            users={mentionUsers ?? []}
            onChange={handleUpdateCollaborators}
          />

          <ProjectTrackingCard project={project} onProjectChange={setProject} />

          <AcessosCard project={project} onProjectChange={setProject} />

          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Última atualização</h2>
            <p className="text-sm text-slate-500">{formatDate(project.updatedAt)}</p>
          </Card>

          <ConfigSection>
            <ClientAccessCard
              projectId={project!.id}
              emails={project.clientEmails}
              onChanged={reload}
            />

            <FinalizationConfigCard project={project} onChanged={reload} />

            <ProjectSettingsCard project={project} onDelete={handleDelete} />
          </ConfigSection>
        </div>
      </Modal>

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
              {statusSuggested && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(statusSuggested)}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  title="Aplicar o status que o estado das etapas sugere"
                >
                  <Sparkles className="size-3" />
                  Sugerido: {STATUS_META[statusSuggested].label} · aplicar
                </button>
              )}
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

      </Card>

      <div>
        {/* Fases */}
        <div className="min-w-0">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Etapas do projeto</h2>
                <span className="text-sm text-slate-400">
                  {project.phases.filter((p) => p.status === 'concluida').length}/{project.phases.length} concluídas
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex h-9 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('checklist')}
                    className={cn(
                      'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                      viewMode === 'checklist'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800',
                    )}
                  >
                    Checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPhases(false)
                      setViewMode('kanban')
                    }}
                    className={cn(
                      'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                      viewMode === 'kanban'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800',
                    )}
                  >
                    Kanban
                  </button>
                </div>
                {viewMode === 'checklist' && (
                  <button
                    onClick={() => setEditPhases((v) => !v)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {editPhases ? <Check className="size-4" /> : <Pencil className="size-4" />}
                    {editPhases ? 'Concluir edição' : 'Editar etapas'}
                  </button>
                )}
              </div>
            </div>

            <GateBanner gate={gate} />

            {viewMode === 'kanban' ? (
              <PhaseKanban
                phases={project.phases.slice().sort((a, b) => a.order - b.order)}
                onSetBoardStatus={handleSetBoardStatus}
              />
            ) : editPhases ? (
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
              <div className="space-y-5">
                {groupByStage(project.phases).map((group) => (
                  <div key={group.stage}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn('text-xs font-bold tracking-wide uppercase', group.meta.accent)}>
                        {group.meta.label}
                      </span>
                      <span className="text-xs text-slate-400">{group.meta.description}</span>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                    <div className="space-y-2.5">
                      {group.phases.map((phase) => (
                        <PhaseCard
                          key={phase.id}
                          phase={phase}
                          owner={getMember(phase.ownerId)}
                          defaultOpen={phase.id === phaseNow?.id}
                          onToggleItem={handleToggle}
                          onApprove={handleApprove}
                          onToggleResponsibility={handleToggleResponsibility}
                          onUpdateItemOwner={handleUpdateItemOwner}
                          onAddComment={handleAddComment}
                          onUpdateDates={handleUpdateDates}
                          currentUser={{ id: companyUser?.id, name: companyUser?.name }}
                          users={mentionUsers ?? []}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

/** Agrupa o setup (acesso do cliente, finalização, exclusão) recolhível. */
function ConfigSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase transition-colors hover:text-slate-600"
      >
        <span className="flex items-center gap-1.5">
          <Settings className="size-3.5" />
          Configuração
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-5">{children}</div>}
    </div>
  )
}

function ProjectSettingsCard({
  project,
  onDelete,
}: {
  project: Project
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Settings className="size-5 shrink-0 text-slate-500" />
          <span>
            <span className="block text-lg font-semibold text-slate-900">Configurações</span>
            <span className="text-sm text-slate-500">Ações administrativas do projeto</span>
          </span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          <div className="rounded-lg border border-red-100 bg-red-50/60 p-4">
            <h3 className="text-sm font-semibold text-red-900">Excluir projeto</h3>
            <p className="mt-1 text-sm text-red-700">
              Remove {project.clientName} e todo o histórico vinculado. Esta ação não pode ser desfeita.
            </p>
            <Button variant="danger" onClick={onDelete} className="mt-3 w-full">
              <Trash2 className="size-4" />
              Excluir projeto
            </Button>
          </div>
        </div>
      )}
    </Card>
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
