/**
 * Modelo de domínio do Portal de Implantação.
 *
 * Estes tipos espelham o futuro schema do Supabase. A camada de serviços
 * (src/services) hoje resolve tudo com mock + localStorage; quando o banco
 * existir, só as funções de serviço mudam — a UI continua igual.
 */

// ───────────────────────── Enums de domínio ─────────────────────────

export type Platform =
  | 'vtex'
  | 'linx'
  | 'wake'
  | 'tray'
  | 'woocommerce'
  | 'shopify'
  | 'kobe'
  | 'outro'

export type ProjectType =
  | 'implantacao'
  | 'sustentacao'
  | 'evolucao'
  | 'cro'
  | 'pontual'

/** Produto/serviço sendo construído — define o template de etapas inicial. */
export type Product = 'blog_institucional' | 'ecommerce' | 'dev_proprio' | 'landing_page'

export type ProjectStatus =
  | 'nao_iniciado'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'aguardando_nairuz'
  | 'aguardando_terceiro'
  | 'homologacao'
  | 'qa'
  | 'pronto_go_live'
  | 'publicado'
  | 'pausado'
  | 'cancelado'
  | 'encerrado'

export type RiskLevel = 'baixo' | 'medio' | 'alto' | 'critico'

export type PhaseStatus =
  | 'nao_iniciada'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'bloqueada'
  | 'concluida'

export type MemberRole =
  | 'cs'
  | 'tech_lead'
  | 'designer'
  | 'dev'
  | 'pm'
  | 'cliente'

// ───────────────────────── Entidades ─────────────────────────

export interface Organization {
  id: string
  name: string
  segment?: string
}

export interface TeamMember {
  id: string
  name: string
  role: MemberRole
  /** Cor do avatar (iniciais), no espírito do painel de referência. */
  avatarColor: string
}

/**
 * Usuário cliente. O acesso real aos projetos é concedido por e-mail, projeto
 * a projeto (ver `Project.clientEmails`) — a Nairuz libera de quais projetos
 * cada e-mail participa. `organizationId` é só referência opcional.
 */
export interface ClientUser {
  id: string
  name: string
  email: string
  organizationId?: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  doneAt?: string
}

export interface Phase {
  id: string
  projectId: string
  /** Ordem na linha do tempo (1..N). */
  order: number
  name: string
  status: PhaseStatus
  ownerId?: string
  startDate?: string
  dueDate?: string
  finishedDate?: string
  checklist: ChecklistItem[]
  /** Aprovação formal do cliente para esta fase. */
  clientApproved: boolean
  clientApprovedAt?: string
  notes?: string
  /** Visível para o cliente no portal (default: true). */
  clientVisible?: boolean
  /** Exige aprovação do cliente para concluir (default: false). */
  requiresApproval?: boolean
  /** Pontos de gamificação ganhos ao concluir a etapa (default: 0). */
  points?: number
}

/** Eventos estruturais visíveis ao cliente (etapa adicionada/removida etc.). */
export type HistoryEntryType =
  | 'projeto_criado'
  | 'fase_adicionada'
  | 'fase_removida'
  | 'fase_renomeada'

export interface HistoryEntry {
  id: string
  type: HistoryEntryType
  /** Texto pronto para exibição, ex.: 'Etapa "Pagamentos" adicionada'. */
  label: string
  at: string
  /** Quem fez a alteração (sempre Nairuz nesta fase). */
  actor: string
}

export interface ProjectOwners {
  csId?: string
  techLeadId?: string
  designerId?: string
  clientContact?: string
}

export interface Project {
  id: string
  /** Código curto e legível, ex: "PRJ-014". */
  code: string
  clientName: string
  organizationId: string
  platform: Platform
  type: ProjectType
  status: ProjectStatus
  /** Id da fase atual (a primeira não concluída, normalmente). */
  currentPhaseId?: string
  startDate: string
  goLiveDate?: string
  /** 0..100 — derivado dos checklists, mantido em sync pelo serviço. */
  progress: number
  risk: RiskLevel
  nextAction?: string
  updatedAt: string
  owners: ProjectOwners
  phases: Phase[]
  /**
   * E-mails de clientes com acesso liberado a este projeto. A Nairuz controla
   * esta lista; o portal do cliente só mostra projetos cujo e-mail consta aqui.
   */
  clientEmails: string[]
  /** Produto/serviço — define o template de etapas usado na criação. */
  product?: Product
  /** Histórico estrutural visível ao cliente. */
  history: HistoryEntry[]
  /** NPS respondido pelo cliente (libera o encerramento). */
  nps?: Nps
  /** Horas de suporte antes/depois de responder o NPS. */
  supportHours: { antes: number; depois: number }
  /** Configuração de finalização/upsell (editável pela Nairuz). */
  finalization: FinalizationConfig
}

/** Resposta de NPS do cliente. */
export interface Nps {
  score: number // 0..10
  comment?: string
  answeredAt: string
}

/** CTA de finalização (Sustentação ou Evolução). */
export interface UpsellCta {
  /** Texto/apresentação curta exibida antes do WhatsApp. */
  apresentacao: string
  /** Link do WhatsApp do comercial. */
  whatsappUrl: string
}

export interface FinalizationConfig {
  mensagem: string
  sustentacao: UpsellCta
  evolucao: UpsellCta
}
