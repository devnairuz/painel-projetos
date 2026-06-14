import type { Phase } from '@/types'

/**
 * Blocos da jornada de um projeto. As etapas continuam planas no modelo; aqui
 * as agrupamos para que o painel e a linha do tempo do cliente sejam lidos como
 * uma jornada (Descoberta → Construção → Homologação → Go-live → Pós), não como
 * uma lista solta.
 */
export type JourneyStage = 'descoberta' | 'construcao' | 'homologacao' | 'golive' | 'pos'

export interface StageMeta {
  label: string
  description: string
  /** Cor de destaque (texto/realce) e fundo suave. */
  accent: string
  soft: string
}

export const STAGE_ORDER: JourneyStage[] = [
  'descoberta',
  'construcao',
  'homologacao',
  'golive',
  'pos',
]

export const STAGE_META: Record<JourneyStage, StageMeta> = {
  descoberta: {
    label: 'Descoberta',
    description: 'Acessos, escopo e alinhamento inicial',
    accent: 'text-sky-700',
    soft: 'bg-sky-50 border-sky-200',
  },
  construcao: {
    label: 'Construção',
    description: 'Design, desenvolvimento e integrações',
    accent: 'text-indigo-700',
    soft: 'bg-indigo-50 border-indigo-200',
  },
  homologacao: {
    label: 'Homologação',
    description: 'QA e validação com o cliente',
    accent: 'text-violet-700',
    soft: 'bg-violet-50 border-violet-200',
  },
  golive: {
    label: 'Go-live',
    description: 'Publicação e lançamento',
    accent: 'text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-200',
  },
  pos: {
    label: 'Pós go-live',
    description: 'Acompanhamento e encerramento',
    accent: 'text-slate-600',
    soft: 'bg-slate-50 border-slate-200',
  },
}

// A ordem importa: "Acompanhamento pós-go live" contém "go live", então o pós
// precisa ser testado antes do go-live.
const STAGE_KEYWORDS: [JourneyStage, RegExp][] = [
  ['pos', /(acompanhament|pós|pos-go|pós-go|encerrament|sustenta|suporte|manutenç)/i],
  ['golive', /(go.?live|golive|publica|lança|lancament|lançament|deploy|subida)/i],
  ['homologacao', /(qa|homolog|test|valida|aprovaç)/i],
  ['descoberta', /(kickoff|kick-off|acesso|escopo|alinhament|descobert|briefing|planejament|levantament)/i],
]

/** Deriva o bloco de jornada de uma etapa pelo nome (fallback: Construção). */
export function stageOfPhase(phase: Phase): JourneyStage {
  const name = phase.name || ''
  for (const [stage, re] of STAGE_KEYWORDS) {
    if (re.test(name)) return stage
  }
  return 'construcao'
}

export interface StageGroup {
  stage: JourneyStage
  meta: StageMeta
  phases: Phase[]
}

/**
 * Agrupa as etapas (já ordenadas) nos blocos da jornada, preservando a ordem
 * original dentro de cada bloco e descartando blocos vazios.
 */
export function groupByStage(phases: Phase[]): StageGroup[] {
  const ordered = [...phases].sort((a, b) => a.order - b.order)
  const buckets = new Map<JourneyStage, Phase[]>()
  for (const phase of ordered) {
    const stage = stageOfPhase(phase)
    const list = buckets.get(stage) ?? []
    list.push(phase)
    buckets.set(stage, list)
  }
  return STAGE_ORDER.filter((stage) => buckets.has(stage)).map((stage) => ({
    stage,
    meta: STAGE_META[stage],
    phases: buckets.get(stage) as Phase[],
  }))
}
