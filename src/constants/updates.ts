/**
 * Mural de atualizações do painel ("Updates").
 *
 * Lista estática mantida no código: cada novidade relevante é inserida aqui,
 * com as entradas mais recentes primeiro. As classes de badge espelham o
 * padrão das constantes de domínio (`bg-{cor}-50 text-{cor}-700 border-{cor}-200`).
 */

export type UpdateCategory = 'novidade' | 'melhoria' | 'correcao' | 'teste'

export interface UpdateCategoryMeta {
  label: string
  /** Classes do chip (fundo + texto + borda), no padrão dos badges do app. */
  badge: string
  /** Cor sólida do ponto, em hex. */
  dot: string
}

export const UPDATE_CATEGORY_META: Record<UpdateCategory, UpdateCategoryMeta> = {
  novidade: { label: 'Novidade', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#059669' },
  melhoria: { label: 'Melhoria', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#2563eb' },
  correcao: { label: 'Correção', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#d97706' },
  teste: { label: 'Teste', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: '#7c3aed' },
}

export interface UpdateEntry {
  id: string
  /** Data da atualização (ISO: AAAA-MM-DD). */
  date: string
  category: UpdateCategory
  title: string
  description: string
}

/** Atualizações em ordem cronológica decrescente (mais recente primeiro). */
export const UPDATES: UpdateEntry[] = [
  {
    id: '2026-06-22-apontamento-horas',
    date: '2026-06-22',
    category: 'teste',
    title: 'Apontamento de horas no painel (estilo ClickUp)',
    description:
      'Registro de horas direto no painel, no lugar do ClickUp: cronômetro ao vivo + lançamento manual, ' +
      'apontando por etapa/subtarefa e somando no projeto, tudo por usuário e com histórico editável. ' +
      'Implementado: card "Horas" na página do projeto e botão play em cada subtarefa. ' +
      'Em fase de teste (branch feat/apontamento-de-horas).',
  },
]
