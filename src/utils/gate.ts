import type { ChecklistItem, Phase } from '@/types'

/**
 * Regra do gate (semáforo do Definition of Ready). Avalia, a partir dos itens
 * de checklist das fases, o que ainda trava o projeto:
 *
 *   "Nenhum card vermelho pendente libera entrada. Amarelo pendente permite
 *    execução, mas segura publicação."
 *
 * Item pendente = `!done`. O nível de trava de cada item é `item.travaLevel`,
 * com default lógico `'trava_golive'` quando ausente.
 */

export interface GateBlock {
  phaseName: string
  item: ChecklistItem
}

export interface GateResult {
  /** Itens vermelhos ainda não concluídos — bloqueiam a entrada na esteira. */
  bloqueiosInicio: GateBlock[]
  /** Itens amarelos ainda não concluídos — seguram a publicação. */
  bloqueiosGolive: GateBlock[]
  /** true quando não há vermelho pendente. */
  liberadoParaEsteira: boolean
  /** true quando não há vermelho nem amarelo pendente. */
  liberadoParaPublicar: boolean
}

export function evaluateGate(phases: Phase[]): GateResult {
  const bloqueiosInicio: GateBlock[] = []
  const bloqueiosGolive: GateBlock[] = []

  for (const phase of phases) {
    for (const item of phase.checklist) {
      if (item.done) continue
      const trava = item.travaLevel ?? 'trava_golive'
      if (trava === 'trava_inicio') bloqueiosInicio.push({ phaseName: phase.name, item })
      else if (trava === 'trava_golive') bloqueiosGolive.push({ phaseName: phase.name, item })
      // placeholder (verde) não bloqueia.
    }
  }

  return {
    bloqueiosInicio,
    bloqueiosGolive,
    liberadoParaEsteira: bloqueiosInicio.length === 0,
    liberadoParaPublicar: bloqueiosInicio.length === 0 && bloqueiosGolive.length === 0,
  }
}
