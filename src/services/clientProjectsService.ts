import type { Project } from '@/types'
import { clientApi } from './api'
import { notifyChange } from './store'

/**
 * Serviços do PORTAL DO CLIENTE — usam o token de cliente e batem em
 * /api/client/*, escopados ao e-mail do cliente logado.
 */
const cp = (id: string) => `/api/client/projects/${encodeURIComponent(id)}`

export async function getClientProjects(): Promise<Project[]> {
  return clientApi.get<Project[]>('/api/client/projects')
}

export async function getClientProject(id: string): Promise<Project | undefined> {
  try {
    return await clientApi.get<Project>(cp(id))
  } catch {
    return undefined
  }
}

export async function clientApprovePhase(id: string, phaseId: string): Promise<Project> {
  const r = await clientApi.post<Project>(`${cp(id)}/phases/${phaseId}/approve`)
  notifyChange()
  return r
}

export async function clientAnswerNps(id: string, score: number, comment?: string): Promise<Project> {
  const r = await clientApi.post<Project>(`${cp(id)}/nps`, { score, comment })
  notifyChange()
  return r
}

export async function clientAddComment(
  id: string,
  phaseId: string,
  itemId: string,
  body: string,
): Promise<Project> {
  const r = await clientApi.post<Project>(`${cp(id)}/phases/${phaseId}/items/${itemId}/comments`, { body })
  notifyChange()
  return r
}
