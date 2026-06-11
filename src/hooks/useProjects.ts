import {
  getProject,
  listOrganizations,
  listProjects,
  listProjectsForClient,
  listTeam,
} from '@/services/projectsService'
import { useAsync } from './useAsync'

export function useProjects() {
  return useAsync(() => listProjects(), [])
}

/** Projetos liberados para o e-mail do cliente logado (portal do cliente). */
export function useClientProjects(email: string | undefined) {
  return useAsync(
    () => (email ? listProjectsForClient(email) : Promise.resolve([])),
    [email],
  )
}

export function useProject(id: string | undefined) {
  return useAsync(() => (id ? getProject(id) : Promise.resolve(undefined)), [id])
}

export function useTeam() {
  return useAsync(() => listTeam(), [])
}

export function useOrganizations() {
  return useAsync(() => listOrganizations(), [])
}
