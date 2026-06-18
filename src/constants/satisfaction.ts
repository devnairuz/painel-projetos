import type { Nps } from '@/types'

/**
 * Pesquisa de satisfação do cliente (pós-projeto). Fonte única das perguntas —
 * usada tanto no formulário (portal do cliente) quanto nos rótulos do relatório.
 * As notas são 0–10. `score` (NPS Geral) e `comment` (Feedback Aberto) ficam
 * com os nomes antigos no objeto `nps` para manter compatibilidade.
 */

/** Chaves das perguntas com nota (0–10). */
export type SurveyRatingKey =
  | 'score'
  | 'satisfacaoProjeto'
  | 'uxRecomendacao'
  | 'uxEntregas'
  | 'uxExperiencia'
  | 'devImplantacao'
  | 'devLayout'
  | 'devEstabilidade'
  | 'pmoAtendimento'

export interface SurveyQuestion {
  key: SurveyRatingKey
  /** Rótulo curto (colunas do relatório). */
  short: string
  /** Pergunta completa exibida ao cliente. */
  question: string
}

export interface SurveySection {
  section: string
  questions: SurveyQuestion[]
}

/** Perguntas agrupadas por seção — texto idêntico ao definido pela Nairuz. */
export const SURVEY_SECTIONS: SurveySection[] = [
  {
    section: 'NPS Geral',
    questions: [
      {
        key: 'score',
        short: 'Indicação Empresa',
        question: 'Em uma escala de 0 a 10, o quanto você indicaria nossa empresa para um amigo?',
      },
    ],
  },
  {
    section: 'Pesquisa de Satisfação - Projetos',
    questions: [
      {
        key: 'satisfacaoProjeto',
        short: 'Satisfação Projeto',
        question: 'Em uma escala de 0 a 10, o quanto você ficou satisfeito?',
      },
    ],
  },
  {
    section: 'UX/UI Design',
    questions: [
      {
        key: 'uxRecomendacao',
        short: 'UX/UI Recomendação',
        question:
          'Em uma escala de 0 a 10, o quanto você recomendaria a equipe de UX/UI Design da Nairuz para outras empresas?',
      },
      {
        key: 'uxEntregas',
        short: 'UX/UI Entregas',
        question:
          'Como você avalia a qualidade das entregas da equipe de UX/UI Design? (Experiência do usuário, clareza visual e aderência aos objetivos do projeto.)',
      },
      {
        key: 'uxExperiencia',
        short: 'UX/UI Experiência',
        question:
          'Como você avalia sua experiência durante a etapa de UX/UI Design do projeto? (Comunicação, alinhamento e agilidade da equipe.)',
      },
    ],
  },
  {
    section: 'Desenvolvimento',
    questions: [
      {
        key: 'devImplantacao',
        short: 'Dev Implantação',
        question:
          'Como você avalia a implantação e configuração da plataforma? (Configuração inicial da plataforma, meios de pagamento, logística, integrações, suporte técnico e estrutura necessária para operação do projeto.)',
      },
      {
        key: 'devLayout',
        short: 'Dev Layout',
        question:
          'Como você avalia a qualidade da implementação do layout aprovado? (Fidelidade ao layout aprovado, responsividade, organização visual e qualidade geral da implementação em desktop e mobile.)',
      },
      {
        key: 'devEstabilidade',
        short: 'Dev Estabilidade',
        question:
          'Como você avalia a estabilidade e funcionamento da entrega final do projeto? (Funcionamento das funcionalidades, qualidade dos testes realizados, desempenho e experiência geral de navegação.)',
      },
    ],
  },
  {
    section: 'PMO / Atendimento ao Cliente',
    questions: [
      {
        key: 'pmoAtendimento',
        short: 'PMO Atendimento',
        question: 'Como você avalia o atendimento realizado durante o projeto?',
      },
    ],
  },
]

/** Pergunta aberta (texto livre). */
export const FEEDBACK_QUESTION =
  'Em poucas palavras, conte como foi sua experiência com a Nairuz e, se desejar, compartilhe pontos que podemos melhorar.'

/** Todas as perguntas com nota, em ordem (achatado). */
export const SURVEY_QUESTIONS: SurveyQuestion[] = SURVEY_SECTIONS.flatMap((s) => s.questions)

/** Média (1 casa) das notas válidas; null se não houver nenhuma. */
export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number')
  if (nums.length === 0) return null
  return Math.round((nums.reduce((sum, v) => sum + v, 0) / nums.length) * 10) / 10
}

export interface SurveyAverages {
  uxui: number | null
  dev: number | null
  tecnologia: number | null
}

/** Médias finais derivadas das notas (igual à planilha da Nairuz). */
export function surveyAverages(nps: Nps): SurveyAverages {
  const uxui = average([nps.uxRecomendacao, nps.uxEntregas, nps.uxExperiencia])
  const dev = average([nps.devImplantacao, nps.devLayout, nps.devEstabilidade])
  const tecnologia = average([uxui, dev, nps.pmoAtendimento])
  return { uxui, dev, tecnologia }
}

/** Formata nota para "8,7" (vírgula PT-BR); "—" quando ausente. */
export function fmtScore(value: number | null | undefined): string {
  if (typeof value !== 'number') return '—'
  return value.toFixed(1).replace('.', ',')
}

/** Cabeçalho da tabela de satisfação (mesma ordem da tela), para exportação. */
export const SATISFACTION_EXPORT_HEADERS = [
  'Cliente',
  'Empresa',
  'Indicação Empresa',
  'Satisfação Projeto',
  'UX/UI Recomendação',
  'UX/UI Entregas',
  'UX/UI Experiência',
  'Média Final UX/UI',
  'Dev Implantação',
  'Dev Layout',
  'Dev Estabilidade',
  'Média Final Dev',
  'PMO Atendimento',
  'Média Final Tecnologia',
  'Feedback Aberto',
]

/** Uma linha da pesquisa para o CSV. Notas em PT-BR (vírgula); vazio quando ausente. */
export function satisfactionExportRow(nps: Nps, clientName: string, orgName: string): string[] {
  const { uxui, dev, tecnologia } = surveyAverages(nps)
  const num = (v: number | null | undefined) => (typeof v === 'number' ? String(v).replace('.', ',') : '')
  return [
    clientName,
    orgName,
    num(nps.score),
    num(nps.satisfacaoProjeto),
    num(nps.uxRecomendacao),
    num(nps.uxEntregas),
    num(nps.uxExperiencia),
    num(uxui),
    num(nps.devImplantacao),
    num(nps.devLayout),
    num(nps.devEstabilidade),
    num(dev),
    num(nps.pmoAtendimento),
    num(tecnologia),
    nps.comment ?? '',
  ]
}
