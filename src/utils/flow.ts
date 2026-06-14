import type { Project, ProjectStatus } from '@/types'
import { daysUntil, relativeDeadlineLabel } from './dates'
import { computeProgress, currentPhase } from './projects'

/**
 * Quem precisa agir para destravar o item. Espelha os lados de uma cobrança,
 * mas vale para qualquer bloqueio derivado do estado do projeto.
 */
export type BlockerTarget = 'nairuz' | 'cliente' | 'terceiro'
export type BlockerSeverity = 'alta' | 'media' | 'baixa'

/** Algo que está (ou pode estar) travando o avanço do projeto. */
export interface Blocker {
  id: string
  label: string
  detail?: string
  target: BlockerTarget
  severity: BlockerSeverity
  phaseId?: string
}

export interface ProjectFlow {
  /** Tudo que pede ação, já ordenado por severidade. */
  blockers: Blocker[]
  /** Próxima ação real (topo da fila de bloqueios ou próximo item em aberto). */
  nextAction?: string
  /** Status que o estado das etapas sugere. */
  suggestedStatus: ProjectStatus
  /**
   * Se vale a pena sugerir o status: só quando o status atual é um dos que o
   * sistema gerencia automaticamente (não atropela decisões humanas como
   * "publicado", "pausado", "homologação").
   */
  shouldSuggestStatus: boolean
}

const SEVERITY_RANK: Record<BlockerSeverity, number> = { alta: 0, media: 1, baixa: 2 }

/** Status que o fluxo pode sugerir/gerenciar sem atropelar o time. */
const AUTO_MANAGED: ProjectStatus[] = [
  'nao_iniciado',
  'em_andamento',
  'aguardando_cliente',
  'aguardando_nairuz',
  'aguardando_terceiro',
]

/**
 * Lê o estado das etapas, itens do cliente e cobranças e deriva: o que está
 * travado, qual a próxima ação e qual status o projeto deveria ter. É a fonte
 * única de "onde o projeto está" — em vez de depender de campos digitados à mão.
 */
export function deriveProjectFlow(project: Project): ProjectFlow {
  const phases = [...project.phases].sort((a, b) => a.order - b.order)
  const cur = currentPhase(phases)
  const blockers: Blocker[] = []

  // 1) Etapas bloqueadas — prioridade máxima, é a Nairuz que destrava.
  for (const ph of phases) {
    if (ph.status === 'bloqueada') {
      blockers.push({
        id: `block-${ph.id}`,
        label: `Etapa bloqueada: ${ph.name}`,
        detail: ph.notes || undefined,
        target: 'nairuz',
        severity: 'alta',
        phaseId: ph.id,
      })
    }
  }

  // 2) Etapa concluída que exige aprovação formal do cliente.
  for (const ph of phases) {
    if (
      ph.clientVisible !== false &&
      ph.requiresApproval &&
      !ph.clientApproved &&
      (ph.status === 'concluida' || ph.status === 'aguardando_cliente')
    ) {
      blockers.push({
        id: `appr-${ph.id}`,
        label: `Aguardando aprovação do cliente: ${ph.name}`,
        target: 'cliente',
        severity: 'media',
        phaseId: ph.id,
      })
    }
  }

  // 3) Etapa aguardando retorno do cliente (que não seja a aprovação acima).
  for (const ph of phases) {
    if (ph.status === 'aguardando_cliente' && !(ph.requiresApproval && !ph.clientApproved)) {
      blockers.push({
        id: `wait-${ph.id}`,
        label: `Aguardando retorno do cliente: ${ph.name}`,
        target: 'cliente',
        severity: 'media',
        phaseId: ph.id,
      })
    }
  }

  // 4) Itens de responsabilidade do cliente ainda não feitos.
  for (const ph of phases) {
    if (ph.clientVisible === false || ph.status === 'concluida') continue
    for (const item of ph.checklist) {
      if (item.clientResponsibility && !item.done) {
        blockers.push({
          id: `citem-${item.id}`,
          label: `Cliente precisa: ${item.label}`,
          detail: ph.name,
          target: 'cliente',
          severity: ph.id === cur?.id ? 'media' : 'baixa',
          phaseId: ph.id,
        })
      }
    }
  }

  // 5) Cobranças/pendências formais em aberto.
  for (const charge of project.charges ?? []) {
    if (charge.status === 'resolvida' || charge.status === 'cancelada') continue
    const d = daysUntil(charge.dueDate)
    const overdue = d !== undefined && d < 0
    blockers.push({
      id: `charge-${charge.id}`,
      label: `Cobrança: ${charge.title}`,
      detail: overdue
        ? `Vencida há ${Math.abs(d as number)}d`
        : charge.dueDate
          ? `vence ${relativeDeadlineLabel(charge.dueDate)}`
          : undefined,
      target: charge.ownerSide,
      severity: overdue ? 'alta' : 'media',
    })
  }

  blockers.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  // Próxima ação: o topo da fila, ou o próximo item em aberto da fase atual.
  let nextAction: string | undefined
  const terminal =
    project.status === 'cancelado' ||
    project.status === 'encerrado' ||
    project.status === 'pausado'
  if (!terminal) {
    if (blockers.length > 0) {
      nextAction = blockers[0].label
    } else if (cur) {
      const next = cur.checklist.find((i) => !i.done)
      if (next) nextAction = `${cur.name}: ${next.label}`
      else if (cur.status !== 'concluida') nextAction = `Concluir etapa: ${cur.name}`
    }
  }

  return {
    blockers,
    nextAction,
    suggestedStatus: deriveStatus(project, phases, blockers),
    shouldSuggestStatus: AUTO_MANAGED.includes(project.status),
  }
}

function deriveStatus(
  project: Project,
  phases: Project['phases'],
  blockers: Blocker[],
): ProjectStatus {
  // Estados terminais/manuais nunca são sugeridos automaticamente.
  if (!AUTO_MANAGED.includes(project.status)) return project.status

  const allDone = phases.length > 0 && phases.every((p) => p.status === 'concluida')
  if (allDone) return 'pronto_go_live'

  const top = blockers[0]
  if (top?.target === 'cliente') return 'aguardando_cliente'
  if (top?.target === 'terceiro') return 'aguardando_terceiro'

  if (computeProgress(phases) === 0) return 'nao_iniciado'
  return 'em_andamento'
}
