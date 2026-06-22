import type { Project, RunningTimer } from '@/types'
import { normalizeProjectCollections } from '@/utils/projects'
import { api } from './api'
import { notifyChange } from './store'

/**
 * Cronômetro do usuário logado (1 ativo por vez). O estado vive no servidor,
 * então estas chamadas exigem o backend — sem fallback local. Em caso de erro
 * de rede, `getCurrentTimer` devolve `null` (silencioso); start/stop propagam
 * o erro para a tela tratar (toast).
 */

export interface StartTimerInput {
  projectId: string
  phaseId?: string
  checklistItemId?: string
  taskId?: string
  label?: string
}

export async function getCurrentTimer(): Promise<RunningTimer | null> {
  try {
    const { timer } = await api.get<{ timer: RunningTimer | null }>('/api/timers/current')
    return timer ?? null
  } catch {
    return null
  }
}

export async function startTimer(input: StartTimerInput): Promise<RunningTimer> {
  const { timer } = await api.post<{ timer: RunningTimer }>('/api/timers/start', input)
  notifyChange()
  return timer
}

export async function stopTimer(): Promise<Project | null> {
  const { project } = await api.post<{ timer: RunningTimer | null; project: Project | null }>(
    '/api/timers/stop',
    {},
  )
  notifyChange()
  return project ? normalizeProjectCollections(project) : null
}
