import type { BoardStatus, ChecklistItem, Phase, Project, ProjectTask, RiskLevel } from '@/types'
import { daysUntil } from './dates'

/** Conta itens de checklist concluídos / total numa fase. */
export function phaseProgress(phase: Phase): { done: number; total: number } {
  const total = phase.checklist.length
  const done = phase.checklist.filter((c) => c.done).length
  return { done, total }
}

/**
 * Progresso geral do projeto (0..100) com base em todos os checklists.
 * Projeto sem nenhum item retorna 0.
 */
export function computeProgress(phases: Phase[]): number {
  let done = 0
  let total = 0
  for (const p of phases) {
    done += p.checklist.filter((c) => c.done).length
    total += p.checklist.length
  }
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

/** Primeira fase ainda não concluída — a "fase atual". */
export function currentPhase(phases: Phase[]): Phase | undefined {
  const ordered = [...phases].sort((a, b) => a.order - b.order)
  return ordered.find((p) => p.status !== 'concluida') ?? ordered[ordered.length - 1]
}

/**
 * Deriva o risco a partir de sinais objetivos: fase bloqueada, go live
 * estourado/próximo e estagnação. Usado como fallback quando o time não
 * setou o risco manualmente.
 */
export function deriveRisk(project: Project): RiskLevel {
  const hasBlocked = project.phases.some((p) => p.status === 'bloqueada')
  const days = daysUntil(project.goLiveDate)

  if (project.status === 'cancelado' || project.status === 'encerrado') return 'baixo'
  if (hasBlocked) return 'critico'
  if (days !== undefined && days < 0) return 'critico'
  if (days !== undefined && days <= 7) return 'alto'
  if (project.status === 'aguardando_cliente' || project.status === 'aguardando_terceiro')
    return 'medio'
  return 'baixo'
}

/**
 * Ajusta o status da fase a partir do checklist (espelha o backend).
 * Regra: tudo concluído ⇒ Concluída (vence qualquer espera). "Bloqueada" é
 * sempre preservada; "Aguardando cliente" só é preservada enquanto houver
 * itens em aberto.
 */
export function syncPhaseStatus(phase: Phase): void {
  if (phase.status === 'bloqueada') return
  const total = phase.checklist.length
  const done = phase.checklist.filter((c) => c.done).length
  if (total > 0 && done === total) {
    phase.status = 'concluida'
    return
  }
  if (phase.status === 'aguardando_cliente') return
  phase.status = done === 0 || total === 0 ? 'nao_iniciada' : 'em_andamento'
}

/** Projeto "em risco" para fins de dashboard. */
export function isAtRisk(project: Project): boolean {
  return project.risk === 'alto' || project.risk === 'critico'
}

const DEFAULT_SECURITY_LABELS = [
  'Acessos revisados',
  'Tokens e senhas fora de comentários',
  'Cliente visualiza apenas projetos liberados',
  'Dados sensíveis não expostos no portal do cliente',
]

function checklistTaskStatus(phase: Phase, done: boolean): ProjectTask['status'] {
  if (done) return 'concluida'
  if (phase.status === 'bloqueada') return 'bloqueada'
  if (phase.status === 'em_andamento') return 'em_andamento'
  return 'aberta'
}

/**
 * Deriva a coluna do board quando o item não tem `boardStatus` explícito.
 * Espelha `checklistTaskStatus`: concluído ⇒ 'concluido'; fase
 * bloqueada/em andamento ⇒ 'em_andamento'; senão 'a_fazer'.
 */
export function deriveBoardStatus(phase: Phase, item: ChecklistItem): BoardStatus {
  if (item.done) return 'concluido'
  if (item.clientResponsibility) return 'responsabilidade_cliente'
  if (phase.status === 'bloqueada' || phase.status === 'em_andamento') return 'em_andamento'
  return 'a_fazer'
}

/**
 * Coluna efetiva do item no board. Fonte única é o checklist: a regra
 * `done ⇔ 'concluido'` é garantida aqui na leitura, então o board e o checkbox
 * nunca divergem, mesmo que o `boardStatus` salvo esteja defasado.
 */
export function boardStatusOf(phase: Phase, item: ChecklistItem): BoardStatus {
  if (item.done) return 'concluido'
  if (!item.boardStatus || item.boardStatus === 'concluido') return deriveBoardStatus(phase, item)
  return item.boardStatus
}

export function normalizedTasks(project: Project): ProjectTask[] {
  const manual = (project.tasks ?? []).filter((task) => task.source !== 'checklist')
  const createdAt = project.startDate || project.updatedAt || new Date().toISOString()
  const checklistTasks = project.phases.flatMap((phase) =>
    phase.checklist.map((item) => ({
      id: `task-${item.id}`,
      projectId: project.id,
      phaseId: phase.id,
      checklistItemId: item.id,
      title: item.label,
      status: checklistTaskStatus(phase, item.done),
      source: 'checklist' as const,
      ownerId: item.ownerId || phase.ownerId,
      dueDate: phase.dueDate,
      clientResponsibility: !!item.clientResponsibility,
      createdAt,
      updatedAt: item.doneAt ?? project.updatedAt,
      completedAt: item.doneAt,
    })),
  )
  return [...checklistTasks, ...manual]
}

export function normalizeProjectCollections(project: Project): Project {
  const timeEntries = project.timeEntries ?? []
  const usedHours = timeEntries
    .filter((entry) => entry.kind === 'realizado')
    .reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0)
  return {
    ...project,
    collaborators: project.collaborators ?? [],
    tasks: normalizedTasks(project),
    charges: project.charges ?? [],
    scopeFiles: project.scopeFiles ?? [],
    timeEntries,
    attachments: project.attachments ?? [],
    tracking: {
      scopeStatus: 'pendente',
      estimatedHours: 0,
      usedHours,
      deadlineConfidence: 'no_prazo',
      ...project.tracking,
    },
    security: {
      checklist: DEFAULT_SECURITY_LABELS.map((label, index) => ({
        id: `sec-${index + 1}`,
        label,
        done: false,
      })),
      ...project.security,
    },
    accesses: project.accesses ?? [],
    linksUteis: project.linksUteis ?? [],
  }
}
