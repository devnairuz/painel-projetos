import type { Organization, Project, ProjectStatus, TeamMember } from '@/types'
import { api } from './api'
import { notifyChange } from './store'

/**
 * API de projetos — consome o backend real (Express/Mongo com fallback mock).
 * Mesma assinatura de antes; as telas/hooks não mudaram. Após cada mutação,
 * `notifyChange()` faz as telas (e outras abas) revalidarem.
 */

const p = (id: string) => `/api/projects/${encodeURIComponent(id)}`

export async function listProjects(): Promise<Project[]> {
  return api.get<Project[]>('/api/projects')
}

export async function getProject(id: string): Promise<Project | undefined> {
  try {
    return await api.get<Project>(p(id))
  } catch {
    return undefined
  }
}

export async function listProjectsForClient(email: string): Promise<Project[]> {
  return api.get<Project[]>(`/api/projects/client?email=${encodeURIComponent(email)}`)
}

export async function listTeam(): Promise<TeamMember[]> {
  return api.get<TeamMember[]>('/api/team')
}

export async function listOrganizations(): Promise<Organization[]> {
  return api.get<Organization[]>('/api/organizations')
}

export async function createOrganization(input: {
  name: string
  segment?: string
}): Promise<Organization> {
  return mutate(() => api.post<Organization>('/api/organizations', input))
}

export interface CreateProjectInput {
  clientName: string
  organizationId: string
  platform: Project['platform']
  type: Project['type']
  product: NonNullable<Project['product']>
  goLiveDate?: string
}

async function mutate<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn()
  notifyChange()
  return result
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return mutate(() => api.post<Project>('/api/projects', input))
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/status`, { status }))
}

export async function addPhase(id: string, name: string): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/phases`, { name }))
}

export async function renamePhase(id: string, phaseId: string, name: string): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/phases/${phaseId}`, { name }))
}

/** Atualiza configurações da etapa: visibilidade, aprovação, pontos, responsável. */
export interface PhaseSettingsPatch {
  clientVisible?: boolean
  requiresApproval?: boolean
  points?: number
  ownerId?: string
}

export async function updatePhaseSettings(
  id: string,
  phaseId: string,
  patch: PhaseSettingsPatch,
): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/phases/${phaseId}`, patch))
}

export async function updateProjectOwners(
  id: string,
  owners: Project['owners'],
): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/owners`, { owners }))
}

export async function removePhase(id: string, phaseId: string): Promise<Project> {
  return mutate(() => api.del<Project>(`${p(id)}/phases/${phaseId}`))
}

export async function toggleChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/phases/${phaseId}/toggle/${itemId}`))
}

export async function addChecklistItem(id: string, phaseId: string, label: string): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/phases/${phaseId}/items`, { label }))
}

export async function renameChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
  label: string,
): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}`, { label }))
}

export async function removeChecklistItem(
  id: string,
  phaseId: string,
  itemId: string,
): Promise<Project> {
  return mutate(() => api.del<Project>(`${p(id)}/phases/${phaseId}/items/${itemId}`))
}

export async function approvePhase(id: string, phaseId: string): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/phases/${phaseId}/approve`))
}

export async function grantClientAccess(id: string, email: string): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/access`, { email }))
}

export async function revokeClientAccess(id: string, email: string): Promise<Project> {
  return mutate(() => api.del<Project>(`${p(id)}/access`, { email }))
}

export async function answerNps(id: string, score: number, comment?: string): Promise<Project> {
  return mutate(() => api.post<Project>(`${p(id)}/nps`, { score, comment }))
}

export async function updateFinalization(
  id: string,
  finalization: Project['finalization'],
): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/finalization`, { finalization }))
}

export async function updateSupportHours(
  id: string,
  hours: { antes: number; depois: number },
): Promise<Project> {
  return mutate(() => api.patch<Project>(`${p(id)}/support-hours`, hours))
}
