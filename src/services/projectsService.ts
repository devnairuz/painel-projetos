import type { ChecklistItem, Organization, Phase, Project, ProjectStatus, TeamMember } from '@/types'
import { PRODUCT_TEMPLATES } from '@/constants/templates'
import { DEFAULT_FINALIZATION, DEFAULT_SUPPORT_HOURS } from '@/constants/templates'
import { computeProgress, currentPhase, deriveRisk, syncPhaseStatus } from '@/utils/projects'
import { api } from './api'
import { ORGANIZATIONS, TEAM, seedProjects } from './mockData'
import { notifyChange } from './store'

/**
 * API de projetos — consome o backend real (Express/Mongo com fallback mock).
 * Mesma assinatura de antes; as telas/hooks não mudaram. Após cada mutação,
 * `notifyChange()` faz as telas (e outras abas) revalidarem.
 */

const p = (id: string) => `/api/projects/${encodeURIComponent(id)}`
const PROJECTS_KEY = 'nairuz-portal:fallback-projects'
const ORGS_KEY = 'nairuz-portal:fallback-organizations'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readLocal<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
    localStorage.setItem(key, JSON.stringify(seed))
  } catch {
    // Sem localStorage disponivel: usa seed em memoria para a tela nao quebrar.
  }
  return clone(seed)
}

function writeLocal<T>(key: string, value: T): T {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    localStorage.setItem('nairuz-portal:ping', Date.now().toString())
  } catch {
    // ignora ambientes sem localStorage
  }
  return value
}

function localProjects(): Project[] {
  const projects = readLocal(PROJECTS_KEY, seedProjects())
  // Cura dados antigos: garante que o status da fase reflita o checklist.
  projects.forEach((project) => project.phases.forEach(syncPhaseStatus))
  return projects
}

function saveLocalProjects(projects: Project[]): Project[] {
  return writeLocal(PROJECTS_KEY, projects)
}

function localOrganizations(): Organization[] {
  return readLocal(ORGS_KEY, ORGANIZATIONS)
}

function saveLocalOrganizations(orgs: Organization[]): Organization[] {
  return writeLocal(ORGS_KEY, orgs)
}

async function fallback<T>(apiCall: () => Promise<T>, localCall: () => T): Promise<T> {
  try {
    return await apiCall()
  } catch {
    return localCall()
  }
}

async function mutate<T>(apiCall: () => Promise<T>, localCall: () => T): Promise<T> {
  const result = await fallback(apiCall, localCall)
  notifyChange()
  return result
}

function syncProject(project: Project): Project {
  project.phases.forEach(syncPhaseStatus)
  project.progress = computeProgress(project.phases)
  project.currentPhaseId = currentPhase(project.phases)?.id
  project.risk = deriveRisk(project)
  project.updatedAt = new Date().toISOString()
  return project
}

function updateLocalProject(id: string, fn: (project: Project) => Project): Project {
  const projects = localProjects()
  const index = projects.findIndex((project) => project.id === id)
  if (index === -1) throw new Error('Projeto nao encontrado.')
  const updated = syncProject(fn(clone(projects[index])))
  projects[index] = updated
  saveLocalProjects(projects)
  return updated
}

function findLocalPhase(project: Project, phaseId: string): Phase {
  const phase = project.phases.find((item) => item.id === phaseId)
  if (!phase) throw new Error('Etapa nao encontrada.')
  return phase
}

function findLocalChecklistItem(phase: Phase, itemId: string): ChecklistItem {
  const item = phase.checklist.find((checklistItem) => checklistItem.id === itemId)
  if (!item) throw new Error('Item nao encontrado.')
  return item
}

export async function listProjects(): Promise<Project[]> {
  return fallback(() => api.get<Project[]>('/api/projects'), () => localProjects())
}

export async function getProject(id: string): Promise<Project | undefined> {
  try {
    return await fallback(
      () => api.get<Project>(p(id)),
      () => localProjects().find((project) => project.id === id),
    )
  } catch {
    return undefined
  }
}

export async function listProjectsForClient(email: string): Promise<Project[]> {
  return fallback(
    () => api.get<Project[]>(`/api/projects/client?email=${encodeURIComponent(email)}`),
    () => localProjects().filter((project) => project.clientEmails.includes(email.toLowerCase())),
  )
}

export async function listTeam(): Promise<TeamMember[]> {
  return fallback(() => api.get<TeamMember[]>('/api/team'), () => TEAM)
}

export async function listOrganizations(): Promise<Organization[]> {
  return fallback(() => api.get<Organization[]>('/api/organizations'), () => localOrganizations())
}

export async function createOrganization(input: {
  name: string
  segment?: string
}): Promise<Organization> {
  return mutate(
    () => api.post<Organization>('/api/organizations', input),
    () => {
      const orgs = localOrganizations()
      const org: Organization = {
        id: uid('org'),
        name: input.name,
        segment: input.segment,
      }
      saveLocalOrganizations([...orgs, org])
      return org
    },
  )
}

export interface CreateProjectInput {
  clientName: string
  organizationId: string
  platform: Project['platform']
  type: Project['type']
  product: NonNullable<Project['product']>
  goLiveDate?: string
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return mutate(
    () => api.post<Project>('/api/projects', input),
    () => {
      const projects = localProjects()
      const template = PRODUCT_TEMPLATES[input.product]
      const projectId = uid('prj')
      const now = new Date().toISOString()
      const maxCode = projects.reduce((max, project) => {
        const match = project.code.match(/PRJ-(\d+)/)
        return match ? Math.max(max, Number(match[1])) : max
      }, 0)
      const phases: Phase[] = template.map((phase, index) => ({
        id: uid('ph'),
        projectId,
        order: index + 1,
        name: phase.name,
        status: index === 0 ? 'em_andamento' : 'nao_iniciada',
        checklist: phase.checklist.map((label) => ({
          id: uid('chk'),
          label,
          done: false,
        })),
        clientApproved: false,
        clientVisible: true,
        requiresApproval: false,
        points: 0,
      }))
      const project: Project = syncProject({
        id: projectId,
        code: `PRJ-${String(maxCode + 1).padStart(3, '0')}`,
        clientName: input.clientName,
        organizationId: input.organizationId,
        platform: input.platform,
        type: input.type,
        status: 'em_andamento',
        startDate: now.slice(0, 10),
        goLiveDate: input.goLiveDate,
        updatedAt: now,
        owners: {},
        phases,
        progress: 0,
        risk: 'baixo',
        clientEmails: [],
        product: input.product,
        history: [{ id: uid('h'), type: 'projeto_criado', label: 'Projeto criado', at: now, actor: 'Nairuz' }],
        supportHours: { ...DEFAULT_SUPPORT_HOURS },
        finalization: clone(DEFAULT_FINALIZATION),
      })
      saveLocalProjects([project, ...projects])
      return project
    },
  )
}

export async function deleteProject(id: string): Promise<void> {
  await mutate(
    () => api.del<{ id: string }>(p(id)),
    () => {
      saveLocalProjects(localProjects().filter((project) => project.id !== id))
      return { id }
    },
  )
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/status`, { status }),
    () => updateLocalProject(id, (project) => ({ ...project, status })),
  )
}

export async function addPhase(id: string, name: string): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/phases`, { name }),
    () =>
      updateLocalProject(id, (project) => {
        const phase: Phase = {
          id: uid('ph'),
          projectId: id,
          order: project.phases.length + 1,
          name,
          status: 'nao_iniciada',
          checklist: [],
          clientApproved: false,
          clientVisible: true,
          requiresApproval: false,
          points: 0,
        }
        project.phases.push(phase)
        project.history.push({
          id: uid('h'),
          type: 'fase_adicionada',
          label: `Etapa "${name}" adicionada`,
          at: new Date().toISOString(),
          actor: 'Nairuz',
        })
        return project
      }),
  )
}

export async function renamePhase(id: string, phaseId: string, name: string): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/phases/${phaseId}`, { name }),
    () =>
      updateLocalProject(id, (project) => {
        const phase = findLocalPhase(project, phaseId)
        phase.name = name
        project.history.push({
          id: uid('h'),
          type: 'fase_renomeada',
          label: `Etapa renomeada para "${name}"`,
          at: new Date().toISOString(),
          actor: 'Nairuz',
        })
        return project
      }),
  )
}

/** Atualiza configurações da etapa: visibilidade, aprovação, pontos, responsável e datas. */
export interface PhaseSettingsPatch {
  clientVisible?: boolean
  requiresApproval?: boolean
  points?: number
  ownerId?: string
  startDate?: string
  dueDate?: string
  finishedDate?: string
}

export async function updatePhaseSettings(
  id: string,
  phaseId: string,
  patch: PhaseSettingsPatch,
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/phases/${phaseId}`, patch),
    () =>
      updateLocalProject(id, (project) => {
        Object.assign(findLocalPhase(project, phaseId), patch)
        return project
      }),
  )
}

export async function updateProjectOwners(
  id: string,
  owners: Project['owners'],
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/owners`, { owners }),
    () => updateLocalProject(id, (project) => ({ ...project, owners: { ...project.owners, ...owners } })),
  )
}

export async function removePhase(id: string, phaseId: string): Promise<Project> {
  return mutate(
    () => api.del<Project>(`${p(id)}/phases/${phaseId}`),
    () =>
      updateLocalProject(id, (project) => {
        const removed = project.phases.find((phase) => phase.id === phaseId)
        project.phases = project.phases
          .filter((phase) => phase.id !== phaseId)
          .map((phase, index) => ({ ...phase, order: index + 1 }))
        if (removed) {
          project.history.push({
            id: uid('h'),
            type: 'fase_removida',
            label: `Etapa "${removed.name}" removida`,
            at: new Date().toISOString(),
            actor: 'Nairuz',
          })
        }
        return project
      }),
  )
}

export async function toggleChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/phases/${phaseId}/toggle/${itemId}`),
    () =>
      updateLocalProject(id, (project) => {
        const phase = findLocalPhase(project, phaseId)
        const item = findLocalChecklistItem(phase, itemId)
        item.done = !item.done
        item.doneAt = item.done ? new Date().toISOString() : undefined
        const allDone = phase.checklist.length > 0 && phase.checklist.every((c) => c.done)
        if (allDone && !phase.finishedDate) phase.finishedDate = new Date().toISOString()
        if (!allDone) phase.finishedDate = undefined
        return project
      }),
  )
}

export async function addChecklistItem(id: string, phaseId: string, label: string): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/phases/${phaseId}/items`, { label }),
    () =>
      updateLocalProject(id, (project) => {
        findLocalPhase(project, phaseId).checklist.push({ id: uid('chk'), label, done: false })
        return project
      }),
  )
}

export async function renameChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
  label: string,
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}`, { label }),
    () =>
      updateLocalProject(id, (project) => {
        findLocalChecklistItem(findLocalPhase(project, phaseId), itemId).label = label
        return project
      }),
  )
}

/** Marca/desmarca a subtarefa como responsabilidade do cliente. */
export async function setChecklistResponsibility(
  id: string,
  phaseId: string,
  itemId: string,
  clientResponsibility: boolean,
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}`, { clientResponsibility }),
    () =>
      updateLocalProject(id, (project) => {
        findLocalChecklistItem(findLocalPhase(project, phaseId), itemId).clientResponsibility =
          clientResponsibility
        return project
      }),
  )
}

/** Adiciona um comentário a uma subtarefa (autor Nairuz ou cliente). */
export async function addChecklistComment(
  id: string,
  phaseId: string,
  itemId: string,
  input: { authorType: 'nairuz' | 'cliente'; authorName: string; body: string },
): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}/comments`, input),
    () =>
      updateLocalProject(id, (project) => {
        const item = findLocalChecklistItem(findLocalPhase(project, phaseId), itemId)
        if (!Array.isArray(item.comments)) item.comments = []
        item.comments.push({
          id: uid('cmt'),
          authorType: input.authorType,
          authorName: input.authorName || (input.authorType === 'cliente' ? 'Cliente' : 'Nairuz'),
          body: input.body,
          createdAt: new Date().toISOString(),
        })
        return project
      }),
  )
}

export async function removeChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
): Promise<Project> {
  return mutate(
    () => api.del<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}`),
    () =>
      updateLocalProject(id, (project) => {
        const phase = findLocalPhase(project, phaseId)
        phase.checklist = phase.checklist.filter((item) => item.id !== itemId)
        return project
      }),
  )
}

export async function approvePhase(id: string, phaseId: string): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/phases/${phaseId}/approve`),
    () =>
      updateLocalProject(id, (project) => {
        const phase = findLocalPhase(project, phaseId)
        const now = new Date().toISOString()
        phase.clientApproved = true
        phase.clientApprovedAt = now
        // Finalizada segue a data da aprovação do cliente.
        phase.finishedDate = now
        return project
      }),
  )
}

export async function grantClientAccess(id: string, email: string): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/access`, { email }),
    () =>
      updateLocalProject(id, (project) => {
        const normalized = email.trim().toLowerCase()
        if (normalized && !project.clientEmails.includes(normalized)) {
          project.clientEmails.push(normalized)
        }
        return project
      }),
  )
}

export async function revokeClientAccess(id: string, email: string): Promise<Project> {
  return mutate(
    () => api.del<Project>(`${p(id)}/access`, { email }),
    () =>
      updateLocalProject(id, (project) => {
        project.clientEmails = project.clientEmails.filter((item) => item !== email.trim().toLowerCase())
        return project
      }),
  )
}

export async function answerNps(id: string, score: number, comment?: string): Promise<Project> {
  return mutate(
    () => api.post<Project>(`${p(id)}/nps`, { score, comment }),
    () =>
      updateLocalProject(id, (project) => ({
        ...project,
        nps: { score, comment, answeredAt: new Date().toISOString() },
      })),
  )
}

export async function updateFinalization(
  id: string,
  finalization: Project['finalization'],
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/finalization`, { finalization }),
    () => updateLocalProject(id, (project) => ({ ...project, finalization })),
  )
}

export async function updateSupportHours(
  id: string,
  hours: { antes: number; depois: number },
): Promise<Project> {
  return mutate(
    () => api.patch<Project>(`${p(id)}/support-hours`, hours),
    () => updateLocalProject(id, (project) => ({ ...project, supportHours: hours })),
  )
}
