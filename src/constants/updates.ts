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
    id: '2026-06-22-aba-updates',
    date: '2026-06-22',
    category: 'novidade',
    title: 'Aba "Updates"',
    description:
      'Mural de novidades do painel: registra cada mudança por data e categoria, pra equipe acompanhar num lugar só o que evoluiu.',
  },
  {
    id: '2026-06-18-exportar-csv',
    date: '2026-06-18',
    category: 'teste',
    title: 'Exportar relatórios em CSV',
    description:
      'Nos Relatórios, um botão baixa a tabela de NPS e indicadores em CSV — pronta pra abrir no Excel/Sheets e fechar números fora do painel.',
  },
  {
    id: '2026-06-16-pesquisa-satisfacao',
    date: '2026-06-16',
    category: 'novidade',
    title: 'Pesquisa de satisfação (NPS)',
    description:
      'No encerramento, o cliente responde a pesquisa em etapas (formato formulário); as notas caem numa tabela nos Relatórios pra leitura do time.',
  },
  {
    id: '2026-06-14-jornada-relatorio',
    date: '2026-06-14',
    category: 'novidade',
    title: 'Jornada das etapas + Relatório de acompanhamento',
    description:
      'As etapas passam a ser agrupadas em blocos de jornada (Descoberta, Design, Dev…) e surge um relatório mensal de acompanhamento com metas editáveis por indicador.',
  },
  {
    id: '2026-06-13-portal-cliente',
    date: '2026-06-13',
    category: 'novidade',
    title: 'Portal do cliente',
    description:
      'A Nairuz libera o e-mail do cliente e ele acessa só os projetos dele (por convite/token), acompanha as etapas e registra aprovações — sem ver o resto.',
  },
  {
    id: '2026-06-13-notificacoes-mencoes',
    date: '2026-06-13',
    category: 'novidade',
    title: 'Notificações e @menções',
    description:
      'O sino avisa em eventos do projeto (comentário, NPS); com @menção e colaboradores, o aviso vai direto pra quem precisa agir.',
  },
  {
    id: '2026-06-13-modulos-operacao',
    date: '2026-06-13',
    category: 'teste',
    title: 'Pendências, Tracking, Relatórios e Minha Visão',
    description:
      'Quatro visões novas: Pendências (cobranças em aberto), Tracking (escopo e horas previstas), Relatórios e "Minha Visão" com as tarefas de cada pessoa.',
  },
  {
    id: '2026-06-13-responsaveis-tarefa',
    date: '2026-06-13',
    category: 'melhoria',
    title: 'Responsável por tarefa',
    description:
      'Cada tarefa/subtarefa passa a ter um responsável direto, que alimenta a "Minha Visão" e deixa claro de quem é cada pendência.',
  },
  {
    id: '2026-06-12-login-interno',
    date: '2026-06-12',
    category: 'novidade',
    title: 'Login interno da equipe',
    description:
      'Cada pessoa da Nairuz entra com login próprio; o primeiro cadastro vira admin e gerencia quem tem acesso na página de Usuários.',
  },
  {
    id: '2026-06-12-cronograma-gantt',
    date: '2026-06-12',
    category: 'teste',
    title: 'Cronograma (Gantt)',
    description:
      'Linha do tempo das etapas com início e prazo de cada fase, pra enxergar o andamento do projeto num olhar.',
  },
  {
    id: '2026-06-12-gamificacao-comentarios',
    date: '2026-06-12',
    category: 'teste',
    title: 'Gamificação e comentários',
    description:
      'Pontuação por entregas concluídas e comentários por subtarefa — concentram a conversa e o progresso dentro de cada item do projeto.',
  },
  {
    id: '2026-06-11-base-painel',
    date: '2026-06-11',
    category: 'novidade',
    title: 'Estrutura inicial do painel',
    description:
      'Base do painel de projetos com etapas, já com publicação automática (Vercel + Render) e um modo de contingência local pra não travar quando o banco cai.',
  },
]
