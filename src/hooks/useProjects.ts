import { getProject, listOrganizations, listProjects, listTeam } from '@/services/projectsService'
import { getClientProject, getClientProjects } from '@/services/clientProjectsService'
import { useAsync } from './useAsync'

/** `poll: false` busca só ao abrir a tela (sem refetch de 20s) — ideal p/ relatórios. */
export function useProjects(options?: { poll?: boolean }) {
  return useAsync(() => listProjects(), [], options)
}

/** Projetos do cliente logado (portal externo, via token de cliente). */
export function useClientProjects() {
  return useAsync(() => getClientProjects(), [])
}

/** Um projeto específico para o cliente logado. */
export function useClientProject(id: string | undefined) {
  return useAsync(() => (id ? getClientProject(id) : Promise.resolve(undefined)), [id])
}

export function useProject(id: string | undefined) {
  // Detalhe: sem poll de fundo e sem refetch a cada clique. A tela já aplica as
  // respostas das mutações (otimista) e recarrega ao focar a aba.
  return useAsync(() => (id ? getProject(id) : Promise.resolve(undefined)), [id], {
    poll: false,
    revalidateOnChange: false,
  })
}

/** Equipe é semente estática — busca uma vez (sem poll/refetch por clique). */
export function useTeam() {
  return useAsync(() => listTeam(), [], { poll: false, revalidateOnChange: false })
}

/** Organizações mudam raramente — sem poll/refetch por clique (atualiza ao focar). */
export function useOrganizations() {
  return useAsync(() => listOrganizations(), [], { poll: false, revalidateOnChange: false })
}
