import type { Phase, Project } from '@/types'

export const POINTS_PER_HOUR = 100

export type MissionStatus = 'done' | 'active' | 'locked'

export interface GameLevel {
  name: string
  subtitle: string
  minXp: number
  reward: string
}

export interface GameMission {
  id: string
  title: string
  detail: string
  xp: number
  status: MissionStatus
}

export interface GameAchievement {
  id: string
  title: string
  detail: string
  unlocked: boolean
}

export interface ClientGameState {
  xp: number
  phasePoints: number
  completedPhases: number
  visiblePhases: number
  approvedPhases: number
  requiredApprovals: number
  pendingApprovals: number
  clientTasksDone: number
  clientTasksTotal: number
  pendingClientTasks: number
  streak: number
  earnedHours: number
  currentLevel: GameLevel
  nextLevel?: GameLevel
  levelProgress: number
  missions: GameMission[]
  achievements: GameAchievement[]
}

const LEVELS: GameLevel[] = [
  { name: 'Explorador', subtitle: 'Primeiros passos alinhados', minXp: 0, reward: 'Acesso ao mapa da implantação' },
  { name: 'Parceiro', subtitle: 'Respostas em bom ritmo', minXp: 80, reward: 'Selo de parceria ativa' },
  { name: 'Acelerador', subtitle: 'Validações destravando etapas', minXp: 180, reward: 'Bônus de prioridade consultiva' },
  { name: 'Campeão', subtitle: 'Implantação com alto engajamento', minXp: 320, reward: 'Máximo potencial de horas bônus' },
]

function isVisible(phase: Phase): boolean {
  return phase.clientVisible !== false
}

function isClosed(project: Project): boolean {
  return project.status === 'encerrado' || project.status === 'publicado'
}

function needsApproval(phase: Phase): boolean {
  if (!isVisible(phase) || !phase.requiresApproval || phase.clientApproved) return false
  return phase.status === 'aguardando_cliente' || phase.status === 'concluida'
}

function consecutiveMomentum(phases: Phase[]): number {
  let count = 0
  for (const phase of phases) {
    const ok = phase.status === 'concluida' || phase.clientApproved
    if (!ok) break
    count += 1
  }
  return count
}

function levelFor(xp: number): { current: GameLevel; next?: GameLevel; progress: number } {
  const current = [...LEVELS].reverse().find((level) => xp >= level.minXp) ?? LEVELS[0]
  const next = LEVELS.find((level) => level.minXp > xp)
  const goal = next?.minXp ?? Math.max(xp, current.minXp + 120)
  const span = Math.max(1, goal - current.minXp)
  const progress = next ? Math.min(100, Math.round(((xp - current.minXp) / span) * 100)) : 100
  return { current, next, progress }
}

function mission(id: string, title: string, detail: string, xp: number, status: MissionStatus): GameMission {
  return { id, title, detail, xp, status }
}

export function buildClientGameState(project: Project): ClientGameState {
  const phases = [...project.phases].filter(isVisible).sort((a, b) => a.order - b.order)
  const completedPhases = phases.filter((phase) => phase.status === 'concluida').length
  const requiredApprovalPhases = phases.filter((phase) => phase.requiresApproval)
  const approvedPhases = phases.filter((phase) => phase.clientApproved).length
  const pendingApprovalPhases = phases.filter(needsApproval)
  const clientTasks = phases.flatMap((phase) => phase.checklist.filter((item) => item.clientResponsibility))
  const clientTasksDone = clientTasks.filter((item) => item.done).length
  const pendingClientTasks = clientTasks.length - clientTasksDone
  const phasePoints = phases
    .filter((phase) => phase.status === 'concluida')
    .reduce((sum, phase) => sum + (phase.points ?? 0), 0)
  const approvalXp = approvedPhases * 18
  const taskXp = clientTasksDone * 10
  const npsXp = project.nps ? 70 : 0
  const cleanDeskXp = pendingApprovalPhases.length === 0 && pendingClientTasks === 0 && phases.length > 0 ? 35 : 0
  const streak = consecutiveMomentum(phases)
  const streakXp = Math.min(streak * 8, 80)
  const xp = phasePoints + approvalXp + taskXp + npsXp + cleanDeskXp + streakXp
  const { current, next, progress } = levelFor(xp)

  const missions: GameMission[] = [
    mission(
      'approve',
      pendingApprovalPhases.length > 0 ? 'Validar etapa pendente' : 'Etapas validadas',
      pendingApprovalPhases.length > 0
        ? `${pendingApprovalPhases.length} etapa${pendingApprovalPhases.length > 1 ? 's' : ''} aguardando sua aprovação`
        : 'Nenhuma aprovação pendente no momento',
      18,
      pendingApprovalPhases.length > 0 ? 'active' : 'done',
    ),
    mission(
      'tasks',
      pendingClientTasks > 0 ? 'Responder tarefas do cliente' : 'Tarefas do cliente em dia',
      clientTasks.length > 0
        ? `${clientTasksDone}/${clientTasks.length} tarefas concluídas`
        : 'Quando houver tarefas do cliente, elas entram aqui',
      10,
      clientTasks.length === 0 ? 'locked' : pendingClientTasks > 0 ? 'active' : 'done',
    ),
    mission(
      'timeline',
      'Manter o ritmo da jornada',
      `${completedPhases}/${phases.length} etapas concluídas`,
      8,
      completedPhases === phases.length && phases.length > 0 ? 'done' : 'active',
    ),
    mission(
      'nps',
      project.nps ? 'Avaliação enviada' : 'Liberar bônus de avaliação',
      isClosed(project)
        ? project.nps
          ? 'NPS recebido e bônus contabilizado'
          : 'Responder o NPS libera horas extras de suporte'
        : 'Disponível no encerramento do projeto',
      70,
      project.nps ? 'done' : isClosed(project) ? 'active' : 'locked',
    ),
  ]

  const achievements: GameAchievement[] = [
    {
      id: 'primeiro-passo',
      title: 'Primeiro passo',
      detail: 'Projeto saiu do zero',
      unlocked: project.progress > 0,
    },
    {
      id: 'validador',
      title: 'Validador oficial',
      detail: 'Primeira aprovação registrada',
      unlocked: approvedPhases > 0,
    },
    {
      id: 'mesa-limpa',
      title: 'Mesa limpa',
      detail: 'Sem pendências do cliente',
      unlocked: pendingApprovalPhases.length === 0 && pendingClientTasks === 0,
    },
    {
      id: 'ritmo-forte',
      title: 'Ritmo forte',
      detail: 'Três etapas avançadas em sequência',
      unlocked: streak >= 3,
    },
    {
      id: 'go-live',
      title: 'Go live no radar',
      detail: 'Projeto publicado ou encerrado',
      unlocked: isClosed(project),
    },
    {
      id: 'voz-do-cliente',
      title: 'Voz do cliente',
      detail: 'NPS respondido',
      unlocked: !!project.nps,
    },
  ]

  return {
    xp,
    phasePoints,
    completedPhases,
    visiblePhases: phases.length,
    approvedPhases,
    requiredApprovals: requiredApprovalPhases.length,
    pendingApprovals: pendingApprovalPhases.length,
    clientTasksDone,
    clientTasksTotal: clientTasks.length,
    pendingClientTasks,
    streak,
    earnedHours: phasePoints / POINTS_PER_HOUR,
    currentLevel: current,
    nextLevel: next,
    levelProgress: progress,
    missions,
    achievements,
  }
}
