import type { Phase, Project, RiskLevel } from '@/types'
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

/** Projeto "em risco" para fins de dashboard. */
export function isAtRisk(project: Project): boolean {
  return project.risk === 'alto' || project.risk === 'critico'
}
